const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const UserUtil = require('../utils/user.util');
const SequenceUtil = require('../utils/sequence.util');
const { createError, optionalText, nonNegativeNumber, parsePositiveInt, normalizeDate } = require('../utils/business.util');

async function createFromFinance(connection, requestId, actor) {
  const [existingRows] = await connection.query('SELECT id FROM warehouse_fulfillments WHERE request_id=? LIMIT 1', [requestId]);
  if (existingRows[0]) throw createError('Fulfillment already exists for this request', 409, 'FULFILLMENT_ALREADY_EXISTS');

  const [items] = await connection.query(`
    SELECT ri.id AS request_item_id, ri.item_code, ri.item_name, ri.requested_qty,
           fri.approved_qty, fri.rejected_qty
    FROM finance_reviews fr
    INNER JOIN finance_review_items fri ON fri.finance_review_id=fr.id
    INNER JOIN request_items ri ON ri.id=fri.request_item_id
    WHERE fr.request_id=? AND fr.status='APPROVED'
      AND fri.decision='APPROVED' AND fri.approved_qty>0
    ORDER BY ri.id ASC
  `, [requestId]);
  if (!items.length) throw createError('No Finance-approved quantity is available for fulfillment', 409, 'FULFILLMENT_ITEMS_MISSING');

  const number = await SequenceUtil.nextNumber(connection, 'FULFILLMENT', SequenceUtil.year2Period(), 'FUL', 5);
  const [result] = await connection.query(`
    INSERT INTO warehouse_fulfillments (
      request_id, fulfillment_number, status, created_by_user_id, created_by_name
    ) VALUES (?, ?, 'PICKING', ?, ?)
  `, [requestId, number, actor.user_id, actor.name]);

  for (const item of items) {
    await connection.query(`
      INSERT INTO warehouse_fulfillment_items (
        fulfillment_id, request_item_id, item_code, item_name,
        requested_qty_snapshot, finance_approved_qty_snapshot, finance_rejected_qty_snapshot
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [result.insertId, item.request_item_id, item.item_code, item.item_name,
      item.requested_qty, item.approved_qty, item.rejected_qty]);
  }
  await connection.query("UPDATE requests SET status='PICKING' WHERE id=?", [requestId]);
  return result.insertId;
}

async function listFulfillments(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'WAREHOUSE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000); const limit = parsePositiveInt(query.limit, 20, 100); const offset=(page-1)*limit;
  const params=[]; let where='WHERE 1=1';
  if(query.status){
    const statuses=String(query.status).split(',').map(s=>s.trim().toUpperCase()).filter(Boolean);
    if(statuses.length){where+=` AND wf.status IN (${statuses.map(()=>'?').join(',')})`;params.push(...statuses);}
  }
  if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (wf.fulfillment_number LIKE ? OR r.request_number LIKE ? OR r.requester_name LIKE ? OR wf.inventory_transfer_number LIKE ?)';params.push(s,s,s,s);}
  const from=`FROM warehouse_fulfillments wf INNER JOIN requests r ON r.id=wf.request_id ${where}`;
  const [countRows]=await db.query(`SELECT COUNT(*) AS total ${from}`,params);
  const [rows]=await db.query(`
    SELECT wf.*, r.request_number, r.requester_name, r.department_name, r.target_department_name,
           r.request_purpose_name, r.purpose_return_type, r.return_due_date, r.status AS request_status,
           r.submitted_at,
           (SELECT COUNT(*) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id=wf.id) AS item_count,
           (SELECT COALESCE(SUM(wfi.actual_qty),0) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id=wf.id) AS total_actual_qty,
           (SELECT COALESCE(SUM(wfi.finance_approved_qty_snapshot),0) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id=wf.id) AS total_approved_qty,
           (SELECT COALESCE(SUM(wfi.finance_rejected_qty_snapshot),0) FROM warehouse_fulfillment_items wfi WHERE wfi.fulfillment_id=wf.id) AS total_rejected_qty
    ${from}
    ORDER BY wf.updated_at DESC LIMIT ? OFFSET ?
  `,[...params,limit,offset]);
  const total=Number(countRows[0]?.total||0);
  return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function requireWarehouseAccess(user, connection=null){
  const admin=await AccessService.hasModuleAccess(user,'ADMIN',connection);
  if(admin)return;
  await AccessService.requireModuleAccess(user,'WAREHOUSE',connection);
}

async function loadFulfillment(connection, fulfillmentId, forUpdate=false) {
  const suffix=forUpdate?' FOR UPDATE':'';
  const [rows]=await connection.query(`
    SELECT wf.*, r.request_number, r.status AS request_status, r.requester_user_id, r.requester_name,
           r.department_id, r.department_name, r.target_department_id, r.target_department_name,
           r.request_purpose_name, r.purpose_return_type, r.return_due_date
    FROM warehouse_fulfillments wf
    INNER JOIN requests r ON r.id=wf.request_id
    WHERE wf.id=? LIMIT 1${suffix}
  `,[Number(fulfillmentId)]);
  if(!rows[0])throw createError('Fulfillment not found',404,'FULFILLMENT_NOT_FOUND');
  return rows[0];
}

async function showFulfillment(user, fulfillmentId){
  await requireWarehouseAccess(user);
  const db=requireDatabase(); const c=await db.getConnection();
  try{
    const fulfillment=await loadFulfillment(c,fulfillmentId,false);
    const [items]=await c.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id=? ORDER BY id ASC',[fulfillment.id]);
    const [handover]=await c.query('SELECT * FROM warehouse_handovers WHERE fulfillment_id=? LIMIT 1',[fulfillment.id]);
    return{...fulfillment,items,handover:handover[0]||null};
  }finally{c.release();}
}

async function printPicking(user, fulfillmentId){
  const db=requireDatabase(); const c=await db.getConnection();
  try{
    await c.beginTransaction(); await requireWarehouseAccess(user,c);
    const fulfillment=await loadFulfillment(c,fulfillmentId,true);
    if(!['PICKING','READY_FOR_DELIVERY','HANDED_OVER'].includes(fulfillment.status)) throw createError('Picking form cannot be printed for this fulfillment status',409,'FULFILLMENT_STATUS_INVALID');
    const actor=UserUtil.snapshot(user);
    await c.query(`UPDATE warehouse_fulfillments SET picking_print_count=picking_print_count+1,last_picking_printed_by_user_id=?,last_picking_printed_by_name=?,last_picking_printed_at=NOW() WHERE id=?`,[actor.user_id,actor.name,fulfillment.id]);
    await ActivityService.log(c,{request_id:fulfillment.request_id,entity_type:'FULFILLMENT',entity_id:fulfillment.id,action_code:'PICKING_FORM_PRINTED',actor_user_id:actor.user_id,actor_name:actor.name});
    await c.commit(); return showFulfillment(user,fulfillment.id);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function resolveWarehouse(connection, warehouseId){
  const id=Number(warehouseId);
  if(!Number.isInteger(id)||id<=0)throw createError('source_warehouse_id is invalid',422,'WAREHOUSE_LOCATION_INVALID');
  const [rows]=await connection.query('SELECT id,internal_id,code,name FROM warehouse_locations WHERE id=? AND is_active=1 LIMIT 1',[id]);
  if(!rows[0])throw createError('Source warehouse not found or inactive',422,'WAREHOUSE_LOCATION_NOT_FOUND');
  return rows[0];
}

async function applyProgress(connection, fulfillment, payload, actor){
  const updates=[]; const values=[];
  if(payload.source_warehouse_id!==undefined){
    if(payload.source_warehouse_id===null||payload.source_warehouse_id===''){
      updates.push('source_warehouse_id=NULL','source_warehouse_internal_id=NULL','source_warehouse_code=NULL','source_warehouse_name=NULL');
    }else{
      const wh=await resolveWarehouse(connection,payload.source_warehouse_id);
      updates.push('source_warehouse_id=?','source_warehouse_internal_id=?','source_warehouse_code=?','source_warehouse_name=?');
      values.push(wh.id,wh.internal_id,wh.code,wh.name);
    }
  }
  if(payload.inventory_transfer_number!==undefined){
    const iwt=optionalText(payload.inventory_transfer_number,100);
    if(!iwt){
      updates.push('inventory_transfer_number=NULL','inventory_transfer_recorded_at=NULL');
    }else{
      const normalized=iwt.toUpperCase();
      updates.push('inventory_transfer_number=?'); values.push(normalized);
      if(String(fulfillment.inventory_transfer_number||'')!==normalized) updates.push('inventory_transfer_recorded_at=NOW()');
      else if(!fulfillment.inventory_transfer_recorded_at) updates.push('inventory_transfer_recorded_at=NOW()');
    }
  }
  const items=Array.isArray(payload.items)?payload.items:[];
  for(const input of items){
    const itemId=Number(input.fulfillment_item_id);
    const [rows]=await connection.query('SELECT * FROM warehouse_fulfillment_items WHERE id=? AND fulfillment_id=? LIMIT 1 FOR UPDATE',[itemId,fulfillment.id]);
    const row=rows[0]; if(!row)throw createError(`Fulfillment item ${input.fulfillment_item_id} not found`,404,'FULFILLMENT_ITEM_NOT_FOUND');
    let actual=row.actual_qty;
    if(input.actual_qty!==undefined){
      if(input.actual_qty===null||input.actual_qty==='')actual=null;
      else{
        actual=nonNegativeNumber(input.actual_qty,'actual_qty');
        if(actual>Number(row.finance_approved_qty_snapshot))throw createError('actual_qty cannot exceed Finance approved quantity',422,'ACTUAL_QTY_EXCEEDS_APPROVED');
      }
    }
    const note=input.note!==undefined?optionalText(input.note,500):row.note;
    await connection.query('UPDATE warehouse_fulfillment_items SET actual_qty=?,note=? WHERE id=?',[actual,note,row.id]);
  }
  updates.push('progress_saved_by_user_id=?','progress_saved_by_name=?','progress_saved_at=NOW()'); values.push(actor.user_id,actor.name);
  if(updates.length)await connection.query(`UPDATE warehouse_fulfillments SET ${updates.join(', ')} WHERE id=?`,[...values,fulfillment.id]);
}

async function saveProgress(user, fulfillmentId, payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();await requireWarehouseAccess(user,c);const fulfillment=await loadFulfillment(c,fulfillmentId,true);
    if(fulfillment.status!=='PICKING')throw createError('Save Progress is only allowed while fulfillment is PICKING',409,'FULFILLMENT_NOT_PICKING');
    const actor=UserUtil.snapshot(user);await applyProgress(c,fulfillment,payload,actor);
    await ActivityService.log(c,{request_id:fulfillment.request_id,entity_type:'FULFILLMENT',entity_id:fulfillment.id,action_code:'PICKING_PROGRESS_SAVED',actor_user_id:actor.user_id,actor_name:actor.name});
    await c.commit();return showFulfillment(user,fulfillment.id);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function completePicking(user, fulfillmentId, payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();await requireWarehouseAccess(user,c);let fulfillment=await loadFulfillment(c,fulfillmentId,true);
    if(fulfillment.status!=='PICKING')throw createError('Only PICKING fulfillment can be completed',409,'FULFILLMENT_NOT_PICKING');
    const actor=UserUtil.snapshot(user);await applyProgress(c,fulfillment,payload,actor);fulfillment=await loadFulfillment(c,fulfillmentId,true);
    if(!fulfillment.source_warehouse_id)throw createError('source_warehouse_id is required before completing picking',422,'SOURCE_WAREHOUSE_REQUIRED');
    if(!fulfillment.inventory_transfer_number)throw createError('inventory_transfer_number is required before completing picking',422,'INVENTORY_TRANSFER_REQUIRED');
    const [items]=await c.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id=? ORDER BY id ASC FOR UPDATE',[fulfillment.id]);
    if(!items.length)throw createError('Fulfillment has no items',409,'FULFILLMENT_ITEMS_MISSING');
    let anyActual=false;
    for(const item of items){
      if(item.actual_qty===null||item.actual_qty===undefined)throw createError(`actual_qty is required for ${item.item_code}`,422,'ACTUAL_QTY_REQUIRED');
      if(Number(item.actual_qty)>Number(item.finance_approved_qty_snapshot))throw createError('actual_qty cannot exceed Finance approved quantity',422,'ACTUAL_QTY_EXCEEDS_APPROVED');
      if(Number(item.actual_qty)>0)anyActual=true;
    }
    if(!anyActual)throw createError('At least one item must have actual_qty greater than 0',422,'ACTUAL_QTY_REQUIRED');
    await c.query(`UPDATE warehouse_fulfillments SET status='READY_FOR_DELIVERY',picking_completed_by_user_id=?,picking_completed_by_name=?,picking_completed_at=NOW() WHERE id=?`,[actor.user_id,actor.name,fulfillment.id]);
    await c.query("UPDATE requests SET status='READY_FOR_DELIVERY' WHERE id=?",[fulfillment.request_id]);
    await ActivityService.log(c,{request_id:fulfillment.request_id,entity_type:'FULFILLMENT',entity_id:fulfillment.id,action_code:'PICKING_COMPLETED',actor_user_id:actor.user_id,actor_name:actor.name,after:{status:'READY_FOR_DELIVERY'}});
    await c.commit();return showFulfillment(user,fulfillment.id);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function createReturnObligation(connection, fulfillment, actor){
  if(String(fulfillment.purpose_return_type)!=='RETURNABLE')return null;
  if(!fulfillment.return_due_date)throw createError('Returnable request has no return_due_date',409,'RETURN_DUE_DATE_MISSING');
  const [existing]=await connection.query('SELECT id FROM returns WHERE request_id=? LIMIT 1',[fulfillment.request_id]);
  if(existing[0])return existing[0].id;
  const returnNumber=await SequenceUtil.nextNumber(connection,'RETURN',SequenceUtil.year2Period(),'RET',5);
  const [result]=await connection.query(`INSERT INTO returns (return_number,request_id,status,due_date) VALUES (?,?,'PENDING_REQUESTER',?)`,[returnNumber,fulfillment.request_id,fulfillment.return_due_date]);
  const [items]=await connection.query(`
    SELECT wfi.request_item_id,wfi.item_code,wfi.item_name,wfi.actual_qty
    FROM warehouse_fulfillment_items wfi
    WHERE wfi.fulfillment_id=? AND wfi.actual_qty>0
    ORDER BY wfi.id ASC
  `,[fulfillment.id]);
  for(const item of items){
    await connection.query(`INSERT INTO return_items (return_id,request_item_id,item_code,item_name,expected_qty,warehouse_received_qty) VALUES (?,?,?,?,?,0)`,[result.insertId,item.request_item_id,item.item_code,item.item_name,item.actual_qty]);
  }
  await ActivityService.log(connection,{request_id:fulfillment.request_id,entity_type:'RETURN',entity_id:result.insertId,action_code:'RETURN_OBLIGATION_CREATED',actor_user_id:actor.user_id,actor_name:actor.name,after:{return_number:returnNumber,due_date:fulfillment.return_due_date}});
  return result.insertId;
}

async function printDo(user, fulfillmentId, payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();await requireWarehouseAccess(user,c);const fulfillment=await loadFulfillment(c,fulfillmentId,true);const actor=UserUtil.snapshot(user);const note=optionalText(payload.note,500);
    if(!['READY_FOR_DELIVERY','HANDED_OVER'].includes(fulfillment.status))throw createError('DO can only be printed after picking is completed',409,'FULFILLMENT_NOT_READY_FOR_DELIVERY');
    await c.query(`UPDATE warehouse_fulfillments SET do_print_count=do_print_count+1,last_do_printed_by_user_id=?,last_do_printed_by_name=?,last_do_printed_at=NOW() WHERE id=?`,[actor.user_id,actor.name,fulfillment.id]);
    if(fulfillment.status==='READY_FOR_DELIVERY'){
      await c.query(`INSERT INTO warehouse_handovers (request_id,fulfillment_id,status,handed_over_by_user_id,handed_over_by_name,handed_over_at,note) VALUES (?,?,'HANDED_OVER',?,?,NOW(),?)`,[fulfillment.request_id,fulfillment.id,actor.user_id,actor.name,note]);
      await c.query("UPDATE warehouse_fulfillments SET status='HANDED_OVER',completed_at=NOW() WHERE id=?",[fulfillment.id]);
      if(String(fulfillment.purpose_return_type)==='RETURNABLE'){
        await createReturnObligation(c,fulfillment,actor);
        await c.query("UPDATE requests SET status='RETURN_PENDING' WHERE id=?",[fulfillment.request_id]);
      }else{
        await c.query("UPDATE requests SET status='HANDED_OVER',completed_at=NOW() WHERE id=?",[fulfillment.request_id]);
      }
      await ActivityService.log(c,{request_id:fulfillment.request_id,entity_type:'FULFILLMENT',entity_id:fulfillment.id,action_code:'DO_PRINTED_AND_HANDED_OVER',actor_user_id:actor.user_id,actor_name:actor.name,after:{request_status:String(fulfillment.purpose_return_type)==='RETURNABLE'?'RETURN_PENDING':'HANDED_OVER'}});
    }else{
      await ActivityService.log(c,{request_id:fulfillment.request_id,entity_type:'FULFILLMENT',entity_id:fulfillment.id,action_code:'DO_REPRINTED',actor_user_id:actor.user_id,actor_name:actor.name});
    }
    await c.commit();return showFulfillment(user,fulfillment.id);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function handovers(user, query={}){
  await requireWarehouseAccess(user);const db=requireDatabase();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[];let where='WHERE 1=1';
  const status=String(query.status||'').trim().toUpperCase();if(['HANDED_OVER','RETURN_PENDING','RETURN_SUBMITTED','RETURN_PARTIAL','COMPLETED'].includes(status)){where+=' AND r.status=?';params.push(status);}
  if(query.department_id){where+=' AND r.department_id=?';params.push(Number(query.department_id));}
  if(query.purpose_id){where+=' AND r.request_purpose_id=?';params.push(Number(query.purpose_id));}
  if(query.return_type){where+=' AND r.purpose_return_type=?';params.push(String(query.return_type).trim().toUpperCase());}
  if(query.date_from){where+=' AND DATE(wh.handed_over_at)>=?';params.push(normalizeDate(query.date_from,'date_from',true));}
  if(query.date_to){where+=' AND DATE(wh.handed_over_at)<=?';params.push(normalizeDate(query.date_to,'date_to',true));}
  if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR wf.fulfillment_number LIKE ? OR wf.inventory_transfer_number LIKE ?)';params.push(s,s,s,s);}
  const sortOrder=String(query.sort_order||'').trim().toUpperCase()==='ASC'?'ASC':'DESC';
  const from=`FROM warehouse_handovers wh INNER JOIN warehouse_fulfillments wf ON wf.id=wh.fulfillment_id INNER JOIN requests r ON r.id=wh.request_id ${where}`;
  const [countRows]=await db.query(`SELECT COUNT(*) AS total ${from}`,params);
  const [rows]=await db.query(`SELECT wh.*,wf.fulfillment_number,wf.source_warehouse_internal_id,wf.source_warehouse_code,wf.source_warehouse_name,wf.inventory_transfer_number,wf.inventory_transfer_recorded_at,r.request_number,r.requester_name,r.department_name,r.target_department_name,r.request_purpose_name,r.purpose_return_type,r.return_due_date,r.status AS request_status ${from} ORDER BY wh.handed_over_at ${sortOrder} LIMIT ? OFFSET ?`,[...params,limit,offset]);
  const total=Number(countRows[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

module.exports={createFromFinance,listFulfillments,showFulfillment,printPicking,saveProgress,completePicking,printDo,handovers};
