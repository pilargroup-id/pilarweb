const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const UserUtil = require('../utils/user.util');
const SequenceUtil = require('../utils/sequence.util');
const { createError, optionalText, parsePositiveInt } = require('../utils/business.util');

function parsePeriodKey(value){
  const text=String(value||'').trim();if(!/^\d{4}-\d{2}$/.test(text))throw createError('period_key must use YYYY-MM format',422,'PERIOD_KEY_INVALID');
  const [year,month]=text.split('-').map(Number);if(month<1||month>12)throw createError('period_key is invalid',422,'PERIOD_KEY_INVALID');
  const start=new Date(Date.UTC(year,month-1,1));const end=new Date(Date.UTC(year,month,0));
  const fmt=d=>d.toISOString().slice(0,10);return{periodKey:text,start:fmt(start),end:fmt(end),year,month};
}

async function getClosingSetting(connection){
  const [rows]=await connection.query(`SELECT closing_day,timezone FROM financial_closing_settings WHERE is_active=1 ORDER BY id DESC LIMIT 1`);
  return rows[0]||{closing_day:7,timezone:'Asia/Jakarta'};
}

function deriveClosingDate(year,month,closingDay){
  const nextMonth=new Date(Date.UTC(year,month,1));const maxDay=new Date(Date.UTC(nextMonth.getUTCFullYear(),nextMonth.getUTCMonth()+1,0)).getUTCDate();nextMonth.setUTCDate(Math.min(Number(closingDay)||7,maxDay));return nextMonth.toISOString().slice(0,10);
}

async function listPeriods(user,query={}){
  await AccessService.requireModuleAccess(user,'FINANCE');const db=requireDatabase();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;
  const [countRows]=await db.query('SELECT COUNT(*) AS total FROM financial_periods');const [rows]=await db.query('SELECT * FROM financial_periods ORDER BY period_start DESC LIMIT ? OFFSET ?',[limit,offset]);const total=Number(countRows[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function createPeriod(user,payload={}){
  const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const p=parsePeriodKey(payload.period_key);const setting=await getClosingSetting(c);const closingDate=deriveClosingDate(p.year,p.month,setting.closing_day);const [result]=await c.query(`INSERT INTO financial_periods (period_key,period_start,period_end,closing_date,status) VALUES (?,?,?,?,'OPEN')`,[p.periodKey,p.start,p.end,closingDate]);await c.commit();return getPeriod(user,result.insertId);}catch(e){await c.rollback();throw e;}finally{c.release();}}

async function getPeriod(user,periodId){await AccessService.requireModuleAccess(user,'FINANCE');const db=requireDatabase();const [rows]=await db.query('SELECT * FROM financial_periods WHERE id=? LIMIT 1',[Number(periodId)]);if(!rows[0])throw createError('Financial period not found',404,'FINANCIAL_PERIOD_NOT_FOUND');const [batches]=await db.query('SELECT * FROM inventory_adjustment_batches WHERE financial_period_id=? ORDER BY id DESC',[Number(periodId)]);return{...rows[0],batches};}

async function startClosing(user,periodId){const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const period=await lockPeriod(c,periodId);if(period.status!=='OPEN')throw createError('Only OPEN period can start closing',409,'PERIOD_NOT_OPEN');await c.query("UPDATE financial_periods SET status='CLOSING',closing_started_at=NOW() WHERE id=?",[period.id]);await c.commit();return getPeriod(user,period.id);}catch(e){await c.rollback();throw e;}finally{c.release();}}

async function generateBatch(user,periodId,payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const period=await lockPeriod(c,periodId);if(period.status!=='CLOSING')throw createError('Period must be CLOSING before generating batch',409,'PERIOD_NOT_CLOSING');
    const [existing]=await c.query("SELECT id FROM inventory_adjustment_batches WHERE financial_period_id=? AND status='DRAFT' ORDER BY id DESC LIMIT 1 FOR UPDATE",[period.id]);
    if(existing[0]){await c.query('DELETE FROM inventory_adjustment_batch_items WHERE batch_id=?',[existing[0].id]);await c.query('DELETE FROM inventory_adjustment_batches WHERE id=?',[existing[0].id]);}
    const batchNumber=await SequenceUtil.nextNumber(c,'IA_BATCH',period.period_key.replace('-',''),'IA',3);const actor=UserUtil.snapshot(user);
    const [batchResult]=await c.query(`INSERT INTO inventory_adjustment_batches (financial_period_id,batch_number,status,generated_by_user_id,generated_by_name,generated_at,note) VALUES (?,?,'DRAFT',?,?,NOW(),?)`,[period.id,batchNumber,actor.user_id,actor.name,optionalText(payload.note,5000)]);
    const batchId=batchResult.insertId;

    const [issues]=await c.query(`
      SELECT wh.handed_over_at AS movement_at,r.id AS request_id,r.request_number,ri.id AS request_item_id,ri.item_code,ri.item_name,
             wfi.actual_qty AS movement_qty,wf.source_warehouse_internal_id,wf.source_warehouse_code,wf.inventory_transfer_number
      FROM warehouse_handovers wh
      INNER JOIN warehouse_fulfillments wf ON wf.id=wh.fulfillment_id
      INNER JOIN requests r ON r.id=wh.request_id
      INNER JOIN warehouse_fulfillment_items wfi ON wfi.fulfillment_id=wf.id AND wfi.actual_qty>0
      INNER JOIN request_items ri ON ri.id=wfi.request_item_id
      WHERE DATE(wh.handed_over_at) BETWEEN ? AND ?
      ORDER BY wh.handed_over_at,r.request_number,ri.id
    `,[period.period_start,period.period_end]);
    for(const row of issues){await c.query(`INSERT INTO inventory_adjustment_batch_items (batch_id,movement_type,movement_at,request_id,request_number,request_item_id,item_code,item_name,movement_qty,source_warehouse_internal_id,source_warehouse_code,destination_warehouse_code,inventory_transfer_number,adjustment_qty) VALUES (?,'ISSUE',?,?,?,?,?,?,?,?,?,?,'LOAN',?,?)`,[batchId,row.movement_at,row.request_id,row.request_number,row.request_item_id,row.item_code,row.item_name,row.movement_qty,row.source_warehouse_internal_id,row.source_warehouse_code,row.inventory_transfer_number,row.movement_qty]);}

    const [returns]=await c.query(`
      SELECT rr.received_at AS movement_at,r.id AS request_id,r.request_number,ri.id AS request_item_id,ri.item_code,ri.item_name,
             rri.id AS return_receipt_item_id,rri.received_qty AS movement_qty,wf.source_warehouse_code
      FROM return_receipts rr
      INNER JOIN return_receipt_items rri ON rri.return_receipt_id=rr.id
      INNER JOIN return_items rti ON rti.id=rri.return_item_id
      INNER JOIN returns rt ON rt.id=rti.return_id
      INNER JOIN requests r ON r.id=rt.request_id
      INNER JOIN request_items ri ON ri.id=rti.request_item_id
      LEFT JOIN warehouse_fulfillments wf ON wf.request_id=r.id
      WHERE DATE(rr.received_at) BETWEEN ? AND ?
      ORDER BY rr.received_at,r.request_number,ri.id
    `,[period.period_start,period.period_end]);
    const [loanRows]=await c.query("SELECT internal_id,code FROM warehouse_locations WHERE code='LOAN' LIMIT 1");
    const loanInternalId=loanRows[0]?.internal_id??null;
    for(const row of returns){await c.query(`INSERT INTO inventory_adjustment_batch_items (batch_id,movement_type,movement_at,request_id,request_number,request_item_id,return_receipt_item_id,item_code,item_name,movement_qty,source_warehouse_internal_id,source_warehouse_code,destination_warehouse_code,adjustment_qty) VALUES (?,'RETURN',?,?,?,?,?,?,?,?,?,'LOAN',?,?)`,[batchId,row.movement_at,row.request_id,row.request_number,row.request_item_id,row.return_receipt_item_id,row.item_code,row.item_name,row.movement_qty,loanInternalId,row.source_warehouse_code,-Number(row.movement_qty)]);}

    await ActivityService.log(c,{request_id:null,entity_type:'INVENTORY_ADJUSTMENT_BATCH',entity_id:batchId,action_code:'INVENTORY_ADJUSTMENT_BATCH_GENERATED',actor_user_id:actor.user_id,actor_name:actor.name,after:{batch_number:batchNumber,period_key:period.period_key,issue_rows:issues.length,return_rows:returns.length}});
    await c.commit();return getBatch(user,batchId);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function getBatch(user,batchId){await AccessService.requireModuleAccess(user,'FINANCE');const db=requireDatabase();const [rows]=await db.query('SELECT * FROM inventory_adjustment_batches WHERE id=? LIMIT 1',[Number(batchId)]);if(!rows[0])throw createError('Inventory Adjustment batch not found',404,'BATCH_NOT_FOUND');const [items]=await db.query('SELECT * FROM inventory_adjustment_batch_items WHERE batch_id=? ORDER BY movement_at,request_number,item_code,id',[Number(batchId)]);return{...rows[0],items};}

async function postBatch(user,batchId,payload={}){const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const [rows]=await c.query('SELECT * FROM inventory_adjustment_batches WHERE id=? LIMIT 1 FOR UPDATE',[Number(batchId)]);const batch=rows[0];if(!batch)throw createError('Inventory Adjustment batch not found',404,'BATCH_NOT_FOUND');if(batch.status!=='DRAFT')throw createError('Only DRAFT batch can be posted',409,'BATCH_NOT_DRAFT');const ref=String(payload.netsuite_reference||'').trim();if(!ref)throw createError('netsuite_reference is required',422,'NETSUITE_REFERENCE_REQUIRED');await c.query("UPDATE inventory_adjustment_batches SET status='POSTED',netsuite_reference=?,posted_at=NOW() WHERE id=?",[ref,batch.id]);await c.commit();return getBatch(user,batch.id);}catch(e){await c.rollback();throw e;}finally{c.release();}}

async function closePeriod(user,periodId){const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const period=await lockPeriod(c,periodId);if(period.status!=='CLOSING')throw createError('Period must be CLOSING before it can be closed',409,'PERIOD_NOT_CLOSING');const [draftRows]=await c.query("SELECT COUNT(*) AS total FROM inventory_adjustment_batches WHERE financial_period_id=? AND status='DRAFT'",[period.id]);if(Number(draftRows[0]?.total||0)>0)throw createError('All Inventory Adjustment batches must be posted before closing the period',409,'BATCH_NOT_POSTED');const actor=UserUtil.snapshot(user);await c.query("UPDATE financial_periods SET status='CLOSED',closed_at=NOW(),closed_by_user_id=?,closed_by_name=? WHERE id=?",[actor.user_id,actor.name,period.id]);await c.commit();return getPeriod(user,period.id);}catch(e){await c.rollback();throw e;}finally{c.release();}}

async function lockPeriod(connection,periodId){const [rows]=await connection.query('SELECT * FROM financial_periods WHERE id=? LIMIT 1 FOR UPDATE',[Number(periodId)]);if(!rows[0])throw createError('Financial period not found',404,'FINANCIAL_PERIOD_NOT_FOUND');if(rows[0].status==='CLOSED')throw createError('Closed financial period is immutable',409,'PERIOD_ALREADY_CLOSED');return rows[0];}

module.exports={listPeriods,createPeriod,getPeriod,startClosing,generateBatch,getBatch,postBatch,closePeriod};
