const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const ValidationService = require('./validation.service');
const SequenceUtil = require('../utils/sequence.util');
const UserUtil = require('../utils/user.util');
const { createError, nonNegativeNumber, optionalText, parsePositiveInt } = require('../utils/business.util');

async function refreshDiscrepancyStatuses(connection = null) {
  const db=connection||requireDatabase();
  await db.query(`
    UPDATE delivery_discrepancies
    SET status=CASE
      WHEN NOW()>=supervisor_lock_at THEN 'SUPERVISOR_REQUIRED'
      WHEN NOW()>=escalation_due_at THEN 'ESCALATED'
      WHEN NOW()>=resolution_due_at THEN 'OVERDUE'
      ELSE 'OPEN' END
    WHERE status<>'RESOLVED'
  `);
  await db.query(`
    INSERT INTO warehouse_sla_violations (
      violation_type,warehouse_department_id,warehouse_department_name,fulfillment_id,discrepancy_id,due_at,breached_at,status
    )
    SELECT 'DELIVERY_DISCREPANCY_OVERDUE',wf.warehouse_department_id,wf.warehouse_department_name,dd.fulfillment_id,dd.id,dd.resolution_due_at,dd.resolution_due_at,'OPEN'
    FROM delivery_discrepancies dd
    INNER JOIN warehouse_fulfillments wf ON wf.id=dd.fulfillment_id
    WHERE dd.status IN ('OVERDUE','ESCALATED','SUPERVISOR_REQUIRED')
    ON DUPLICATE KEY UPDATE warehouse_department_id=VALUES(warehouse_department_id),warehouse_department_name=VALUES(warehouse_department_name)
  `);
}

async function createReturnObligation(connection,request,receivedRows){
  const total=receivedRows.reduce((s,r)=>s+Number(r.received_qty||0),0);if(total<=0){await connection.query("UPDATE requests SET status='COMPLETED',completed_at=NOW() WHERE id=?",[request.id]);return null;}
  const number=await SequenceUtil.nextNumber(connection,'RB',SequenceUtil.yearMonthPeriod(),'RB',5,'');
  const[result]=await connection.query(`INSERT INTO returns (return_number,request_id,status,due_at,expected_total_qty) VALUES (?,?,'PENDING_REQUESTER',DATE_ADD(NOW(),INTERVAL ? DAY),?)`,[number,request.id,Number(request.return_due_days_snapshot||14),total]);
  for(const row of receivedRows){const qty=Number(row.received_qty||0);if(qty<=0)continue;await connection.query(`INSERT INTO return_items (return_id,request_item_id,item_code,item_name,expected_qty) VALUES (?,?,?,?,?)`,[result.insertId,row.request_item_id,row.item_code,row.item_name,qty]);}
  await connection.query(`UPDATE requests SET status='RETURN_PENDING',final_received_at=COALESCE(final_received_at,NOW()),return_due_at=DATE_ADD(NOW(),INTERVAL ? DAY) WHERE id=?`,[Number(request.return_due_days_snapshot||14),request.id]);
  return result.insertId;
}

async function finalizeRequestReceipt(connection,requestId,actor={user_id:null,name:'SYSTEM'}){
  const[reqRows]=await connection.query('SELECT * FROM requests WHERE id=? LIMIT 1 FOR UPDATE',[requestId]);const request=reqRows[0];if(!request)return false;
  const[openDisc]=await connection.query("SELECT id FROM delivery_discrepancies WHERE request_id=? AND status<>'RESOLVED' LIMIT 1",[requestId]);if(openDisc[0])return false;
  const[pendingShipments]=await connection.query(`
    SELECT wf.id FROM warehouse_fulfillments wf
    LEFT JOIN delivery_receipts dr ON dr.fulfillment_id=wf.id
    WHERE wf.request_id=? AND wf.fulfillment_mode='PHYSICAL'
      AND (wf.status<>'DISPATCHED' OR dr.id IS NULL OR dr.status<>'RECEIVED')
    LIMIT 1
  `,[requestId]);if(pendingShipments[0])return false;
  if(request.final_received_at)return true;
  const[receivedRows]=await connection.query(`
    SELECT dri.request_item_id,ri.item_code,ri.item_name,SUM(COALESCE(dri.received_qty,0)) AS received_qty
    FROM delivery_receipt_items dri
    INNER JOIN delivery_receipts dr ON dr.id=dri.delivery_receipt_id AND dr.status='RECEIVED'
    INNER JOIN request_items ri ON ri.id=dri.request_item_id
    WHERE dr.request_id=?
    GROUP BY dri.request_item_id,ri.item_code,ri.item_name
    ORDER BY dri.request_item_id
  `,[requestId]);
  await connection.query('UPDATE requests SET final_received_at=NOW() WHERE id=?',[requestId]);
  let returnId=null;
  if(request.purpose_return_type==='RETURNABLE')returnId=await createReturnObligation(connection,request,receivedRows);else await connection.query("UPDATE requests SET status='COMPLETED',completed_at=NOW() WHERE id=?",[requestId]);
  await ActivityService.log(connection,{request_id:requestId,entity_type:'REQUEST',entity_id:requestId,action_code:'DELIVERY_FULLY_RESOLVED',actor_user_id:actor.user_id||null,actor_name:actor.name||'SYSTEM',after:{purpose_return_type:request.purpose_return_type,return_id:returnId,total_received_qty:receivedRows.reduce((s,r)=>s+Number(r.received_qty||0),0)}});
  return true;
}

async function listMine(user,query={}){const db=requireDatabase();await processDueReceipts();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[String(user.id)];let where='WHERE r.requester_user_id=?';if(query.status){where+=' AND dr.status=?';params.push(String(query.status).toUpperCase());}const[count]=await db.query(`SELECT COUNT(*) AS total FROM delivery_receipts dr INNER JOIN requests r ON r.id=dr.request_id ${where}`,params);const[rows]=await db.query(`SELECT dr.*,r.request_number,r.request_purpose_name,r.purpose_return_type,wf.fulfillment_number,wf.fulfillment_type,wf.dispatched_at FROM delivery_receipts dr INNER JOIN requests r ON r.id=dr.request_id INNER JOIN warehouse_fulfillments wf ON wf.id=dr.fulfillment_id ${where} ORDER BY dr.created_at DESC LIMIT ? OFFSET ?`,[...params,limit,offset]);const total=Number(count[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}

async function getById(user,id){const db=requireDatabase();await processDueReceipts();const[rows]=await db.query(`SELECT dr.*,r.request_number,r.requester_user_id,r.requester_name,r.status AS request_status,wf.fulfillment_number,wf.fulfillment_type,wf.source_warehouse_name,wf.inventory_transfer_number,wf.dispatched_at FROM delivery_receipts dr INNER JOIN requests r ON r.id=dr.request_id INNER JOIN warehouse_fulfillments wf ON wf.id=dr.fulfillment_id WHERE dr.id=? LIMIT 1`,[Number(id)]);const receipt=rows[0];if(!receipt)throw createError('Delivery receipt not found',404,'DELIVERY_RECEIPT_NOT_FOUND');if(String(receipt.requester_user_id)!==String(user.id)&&!(await AccessService.hasModuleAccess(user,'WAREHOUSE'))&&!(await AccessService.hasModuleAccess(user,'ADMIN')))throw createError('Delivery receipt is not accessible',403,'DELIVERY_RECEIPT_ACCESS_FORBIDDEN');const[items]=await db.query(`SELECT dri.*,ri.item_code,ri.item_name,ri.uom_code FROM delivery_receipt_items dri INNER JOIN request_items ri ON ri.id=dri.request_item_id WHERE dri.delivery_receipt_id=? ORDER BY dri.id`,[receipt.id]);return{...receipt,items};}

async function autoAcceptLocked(c,receipt){const[reqRows]=await c.query('SELECT * FROM requests WHERE id=? LIMIT 1 FOR UPDATE',[receipt.request_id]);const request=reqRows[0];await c.query('UPDATE delivery_receipt_items SET received_qty=dispatched_qty,discrepancy_qty=0 WHERE delivery_receipt_id=?',[receipt.id]);await c.query("UPDATE delivery_receipts SET status='RECEIVED',confirmation_method='AUTO',confirmed_at=NOW(),confirmed_by_user_id=NULL,confirmed_by_name='SYSTEM' WHERE id=?",[receipt.id]);await ValidationService.recordAutoReceiptViolation(c,request);await ActivityService.log(c,{request_id:receipt.request_id,entity_type:'DELIVERY_RECEIPT',entity_id:receipt.id,action_code:'DELIVERY_AUTO_RECEIVED',actor_name:'SYSTEM',after:{confirmation_deadline_at:receipt.confirmation_deadline_at}});await finalizeRequestReceipt(c,receipt.request_id,{user_id:null,name:'SYSTEM'});}

async function processDueReceipts(){const db=requireDatabase();const[rows]=await db.query("SELECT id FROM delivery_receipts WHERE status='PENDING' AND confirmation_deadline_at<=NOW() ORDER BY id LIMIT 200");for(const row of rows){const c=await db.getConnection();try{await c.beginTransaction();const[locked]=await c.query("SELECT * FROM delivery_receipts WHERE id=? AND status='PENDING' LIMIT 1 FOR UPDATE",[row.id]);if(locked[0]&&new Date(locked[0].confirmation_deadline_at).getTime()<=Date.now())await autoAcceptLocked(c,locked[0]);await c.commit();}catch(e){await c.rollback();throw e;}finally{c.release();}}return rows.length;}

async function confirm(user,id,payload={}){const db=requireDatabase();const c=await db.getConnection();let committed=false;try{await c.beginTransaction();const[rows]=await c.query(`SELECT dr.*,r.requester_user_id,r.requester_name,r.department_id,r.department_name,r.discrepancy_resolution_days_snapshot,r.discrepancy_escalation_days_snapshot,r.discrepancy_supervisor_lock_days_snapshot FROM delivery_receipts dr INNER JOIN requests r ON r.id=dr.request_id WHERE dr.id=? LIMIT 1 FOR UPDATE`,[Number(id)]);const receipt=rows[0];if(!receipt)throw createError('Delivery receipt not found',404,'DELIVERY_RECEIPT_NOT_FOUND');if(String(receipt.requester_user_id)!==String(user.id))throw createError('Only the requester can confirm physical receipt',403,'REQUEST_OWNER_REQUIRED');if(receipt.status!=='PENDING')throw createError('Delivery receipt has already been confirmed',409,'DELIVERY_RECEIPT_ALREADY_CONFIRMED');
    const[nowRows]=await c.query('SELECT NOW() AS now_value');if(new Date(receipt.confirmation_deadline_at).getTime()<=new Date(nowRows[0].now_value).getTime()){await autoAcceptLocked(c,receipt);await c.commit();committed=true;throw createError('Receipt deadline passed and the shipment was automatically accepted. Manual confirmation is no longer available.',409,'DELIVERY_AUTO_ACCEPTED');}
    const inputs=Array.isArray(payload.items)?payload.items:[];const map=new Map(inputs.map(x=>[Number(x.delivery_receipt_item_id),x]));const[itemRows]=await c.query('SELECT * FROM delivery_receipt_items WHERE delivery_receipt_id=? ORDER BY id FOR UPDATE',[receipt.id]);if(!itemRows.length)throw createError('Delivery receipt has no items',409,'DELIVERY_RECEIPT_ITEMS_MISSING');let hasDifference=false;for(const item of itemRows){const input=map.get(Number(item.id));if(!input)throw createError(`received_qty is required for delivery receipt item ${item.id}`,422,'RECEIVED_QTY_REQUIRED');const qty=nonNegativeNumber(input.received_qty,'received_qty');const dispatched=Number(item.dispatched_qty||0);if(qty>dispatched+0.000001)throw createError('received_qty cannot exceed dispatched_qty',422,'RECEIVED_QTY_EXCEEDS_DISPATCHED');const diff=Math.max(0,dispatched-qty);hasDifference=hasDifference||diff>0;await c.query('UPDATE delivery_receipt_items SET received_qty=?,discrepancy_qty=? WHERE id=?',[qty,diff,item.id]);if(diff>0){await c.query(`INSERT INTO delivery_discrepancies (request_id,fulfillment_id,request_item_id,delivery_receipt_item_id,expected_qty,received_qty,difference_qty,status,resolution_days_snapshot,escalation_days_snapshot,supervisor_lock_days_snapshot,resolution_due_at,escalation_due_at,supervisor_lock_at) VALUES (?,?,?,?,?,?,?,'OPEN',?,?,?,DATE_ADD(NOW(),INTERVAL ? DAY),DATE_ADD(NOW(),INTERVAL ? DAY),DATE_ADD(NOW(),INTERVAL ? DAY))`,[receipt.request_id,receipt.fulfillment_id,item.request_item_id,item.id,dispatched,qty,diff,receipt.discrepancy_resolution_days_snapshot,receipt.discrepancy_escalation_days_snapshot,receipt.discrepancy_supervisor_lock_days_snapshot,receipt.discrepancy_resolution_days_snapshot,receipt.discrepancy_escalation_days_snapshot,receipt.discrepancy_supervisor_lock_days_snapshot]);}}
    await c.query(`UPDATE delivery_receipts SET status=?,confirmation_method='MANUAL',confirmed_at=NOW(),confirmed_by_user_id=?,confirmed_by_name=? WHERE id=?`,[hasDifference?'PARTIAL':'RECEIVED',user.id,user.name||null,receipt.id]);await c.query('UPDATE requests SET status=? WHERE id=?',[hasDifference?'PARTIALLY_RECEIVED':'RECEIVED',receipt.request_id]);await ActivityService.log(c,{request_id:receipt.request_id,entity_type:'DELIVERY_RECEIPT',entity_id:receipt.id,action_code:hasDifference?'DELIVERY_PARTIALLY_RECEIVED':'DELIVERY_RECEIVED',actor_user_id:user.id,actor_name:user.name,after:{has_discrepancy:hasDifference}});if(!hasDifference)await finalizeRequestReceipt(c,receipt.request_id,{user_id:user.id,name:user.name});await c.commit();committed=true;return getById(user,receipt.id);
  }catch(e){if(!committed)await c.rollback();throw e;}finally{c.release();}}

async function listDiscrepancies(user,query={}){await AccessService.requireModuleAccess(user,'WAREHOUSE');const db=requireDatabase();await refreshDiscrepancyStatuses(db);const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[];let where='WHERE 1=1';if(query.status){where+=' AND dd.status=?';params.push(String(query.status).toUpperCase());}if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (r.request_number LIKE ? OR ri.item_code LIKE ? OR r.requester_name LIKE ?)';params.push(s,s,s);}const[count]=await db.query(`SELECT COUNT(*) AS total FROM delivery_discrepancies dd INNER JOIN requests r ON r.id=dd.request_id INNER JOIN request_items ri ON ri.id=dd.request_item_id ${where}`,params);const[rows]=await db.query(`SELECT dd.*,r.request_number,r.requester_name,r.department_name,ri.item_code,ri.item_name,wf.fulfillment_number,wf.warehouse_department_id,wf.warehouse_department_name,wf.source_warehouse_name,wsv.status AS sla_status,wsv.breached_at,wsv.overdue_minutes FROM delivery_discrepancies dd INNER JOIN requests r ON r.id=dd.request_id INNER JOIN request_items ri ON ri.id=dd.request_item_id INNER JOIN warehouse_fulfillments wf ON wf.id=dd.fulfillment_id LEFT JOIN warehouse_sla_violations wsv ON wsv.discrepancy_id=dd.id AND wsv.violation_type='DELIVERY_DISCREPANCY_OVERDUE' ${where} ORDER BY FIELD(dd.status,'SUPERVISOR_REQUIRED','ESCALATED','OVERDUE','OPEN','RESOLVED'),dd.resolution_due_at ASC LIMIT ? OFFSET ?`,[...params,limit,offset]);const total=Number(count[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}

async function listDiscrepancyForms(user,query={}){
  await AccessService.requireModuleAccess(user,'WAREHOUSE');
  const db=requireDatabase();
  await refreshDiscrepancyStatuses(db);
  const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;
  const params=[];let where="WHERE dd.status<>'RESOLVED'";
  if(query.status){where+=' AND dd.status=?';params.push(String(query.status).toUpperCase());}
  if(query.search){const search=`%${String(query.search).trim()}%`;where+=' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.department_name LIKE ?)';params.push(search,search,search);}
  const[countRows]=await db.query(`SELECT COUNT(DISTINCT dd.request_id) AS total FROM delivery_discrepancies dd INNER JOIN requests r ON r.id=dd.request_id ${where}`,params);
  const[rows]=await db.query(`
    SELECT
      dd.request_id,
      r.request_number,
      r.requester_name,
      r.department_id,
      r.department_name,
      r.target_department_id,
      r.target_department_name,
      COUNT(*) AS discrepancy_item_count,
      SUM(dd.difference_qty) AS total_difference_qty,
      MIN(dd.resolution_due_at) AS nearest_resolution_due_at,
      MAX(CASE dd.status WHEN 'SUPERVISOR_REQUIRED' THEN 4 WHEN 'ESCALATED' THEN 3 WHEN 'OVERDUE' THEN 2 ELSE 1 END) AS severity_rank,
      CASE MAX(CASE dd.status WHEN 'SUPERVISOR_REQUIRED' THEN 4 WHEN 'ESCALATED' THEN 3 WHEN 'OVERDUE' THEN 2 ELSE 1 END)
        WHEN 4 THEN 'SUPERVISOR_REQUIRED'
        WHEN 3 THEN 'ESCALATED'
        WHEN 2 THEN 'OVERDUE'
        ELSE 'OPEN'
      END AS form_status,
      MIN(wf.warehouse_department_id) AS warehouse_department_id,
      MIN(wf.warehouse_department_name) AS warehouse_department_name
    FROM delivery_discrepancies dd
    INNER JOIN requests r ON r.id=dd.request_id
    INNER JOIN warehouse_fulfillments wf ON wf.id=dd.fulfillment_id
    ${where}
    GROUP BY dd.request_id,r.request_number,r.requester_name,r.department_id,r.department_name,r.target_department_id,r.target_department_name
    ORDER BY severity_rank DESC,nearest_resolution_due_at ASC,r.request_number ASC
    LIMIT ? OFFSET ?
  `,[...params,limit,offset]);
  const total=Number(countRows[0]?.total||0);
  return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function getDiscrepancyForm(user,requestId){
  await AccessService.requireModuleAccess(user,'WAREHOUSE');
  const db=requireDatabase();
  await refreshDiscrepancyStatuses(db);
  const[requestRows]=await db.query(`SELECT id,request_number,requester_user_id,requester_name,department_id,department_name,target_department_id,target_department_name,status FROM requests WHERE id=? LIMIT 1`,[String(requestId)]);
  const request=requestRows[0];if(!request)throw createError('PB not found',404,'REQUEST_NOT_FOUND');
  const[items]=await db.query(`
    SELECT dd.*,ri.item_code,ri.item_name,ri.uom_code,wf.fulfillment_number,wf.warehouse_department_id,wf.warehouse_department_name,wf.source_warehouse_name,wsv.status AS sla_status,wsv.breached_at,wsv.overdue_minutes
    FROM delivery_discrepancies dd
    INNER JOIN request_items ri ON ri.id=dd.request_item_id
    INNER JOIN warehouse_fulfillments wf ON wf.id=dd.fulfillment_id
    LEFT JOIN warehouse_sla_violations wsv ON wsv.discrepancy_id=dd.id AND wsv.violation_type='DELIVERY_DISCREPANCY_OVERDUE'
    WHERE dd.request_id=? AND dd.status<>'RESOLVED'
    ORDER BY FIELD(dd.status,'SUPERVISOR_REQUIRED','ESCALATED','OVERDUE','OPEN'),dd.id
  `,[String(requestId)]);
  if(!items.length)throw createError('No unresolved delivery discrepancy exists for this PB',404,'DISCREPANCY_FORM_NOT_FOUND');
  return{...request,items,resolution_type_options:['RESEND','CLOSE_WITH_REASON']};
}

async function resolveDiscrepancyForm(user,requestId,payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();
    await AccessService.requireModuleAccess(user,'WAREHOUSE',c);
    await refreshDiscrepancyStatuses(c);
    const inputs=Array.isArray(payload.items)?payload.items:[];
    if(!inputs.length)throw createError('items is required',422,'DISCREPANCY_ITEMS_REQUIRED');

    const ids=inputs.map(row=>Number(row.discrepancy_id));
    if(ids.some(id=>!Number.isInteger(id)||id<=0)||new Set(ids).size!==ids.length)throw createError('Each discrepancy_id must be unique and valid',422,'INVALID_DISCREPANCY_ID');
    const placeholders=ids.map(()=>'?').join(',');
    const[rows]=await c.query(`
      SELECT dd.*,wf.warehouse_department_id,wf.warehouse_department_name,wf.fulfillment_number
      FROM delivery_discrepancies dd
      INNER JOIN warehouse_fulfillments wf ON wf.id=dd.fulfillment_id
      WHERE dd.request_id=? AND dd.id IN (${placeholders})
      ORDER BY dd.id
      FOR UPDATE
    `,[String(requestId),...ids]);
    if(rows.length!==ids.length)throw createError('One or more discrepancy items do not belong to this PB',422,'DISCREPANCY_FORM_MISMATCH');
    if(rows.some(row=>row.status==='RESOLVED'))throw createError('One or more discrepancy items are already resolved',409,'DELIVERY_DISCREPANCY_RESOLVED');

    const[openRows]=await c.query("SELECT id FROM delivery_discrepancies WHERE request_id=? AND status<>'RESOLVED' ORDER BY id FOR UPDATE",[String(requestId)]);
    const openIds=openRows.map(row=>Number(row.id));
    if(openIds.length!==ids.length||openIds.some(id=>!ids.includes(id)))throw createError('Submit a resolution for every unresolved item in this PB form',422,'DISCREPANCY_FORM_INCOMPLETE');

    const actor=UserUtil.snapshot(user);
    const isAdmin=await AccessService.hasModuleAccess(user,'ADMIN',c);
    const needsSupervisor=rows.some(row=>row.status==='SUPERVISOR_REQUIRED');
    const hasSupervisor=needsSupervisor?await AccessService.hasModuleAccess(user,'WAREHOUSE_DISCREPANCY_SUPERVISOR',c):false;
    for(const row of rows){
      if(row.warehouse_department_id&&Number(actor.department_id)!==Number(row.warehouse_department_id)&&!isAdmin)throw createError('Discrepancy form belongs to another Warehouse department',403,'WAREHOUSE_DEPARTMENT_MISMATCH');
    }
    if(needsSupervisor&&!hasSupervisor)throw createError('This overdue discrepancy form requires Warehouse supervisor access',403,'WAREHOUSE_SUPERVISOR_REQUIRED');

    const inputMap=new Map(inputs.map(row=>[Number(row.discrepancy_id),row]));
    const[nowRows]=await c.query('SELECT NOW() AS now_value');const nowValue=new Date(nowRows[0].now_value).getTime();
    const normalized=[];
    for(const row of rows){
      const input=inputMap.get(Number(row.id));
      const type=String(input.resolution_type||'').trim().toUpperCase();
      if(!['RESEND','CLOSE_WITH_REASON'].includes(type))throw createError(`resolution_type for discrepancy ${row.id} must be RESEND or CLOSE_WITH_REASON`,422,'VALIDATION_ERROR');
      const note=optionalText(input.resolution_note??input.reason,5000);
      if(type==='CLOSE_WITH_REASON'&&!note)throw createError(`resolution_note is required for CLOSE_WITH_REASON on discrepancy ${row.id}`,422,'RESOLUTION_NOTE_REQUIRED');
      const late=nowValue>new Date(row.resolution_due_at).getTime();
      const lateReason=optionalText(input.late_resolution_reason??payload.late_resolution_reason,5000);
      if(late&&!lateReason)throw createError(`late_resolution_reason is required for overdue discrepancy ${row.id}`,422,'LATE_RESOLUTION_REASON_REQUIRED');
      normalized.push({row,type,note,late,lateReason});
    }

    const resendRows=normalized.filter(x=>x.type==='RESEND').map(x=>x.row);
    let resendId=null;
    if(resendRows.length){const WarehouseService=require('./warehouse.service');resendId=await WarehouseService.createResendBatch(c,resendRows,actor);}

    const affectedReceiptIds=new Set();
    for(const item of normalized){
      const row=item.row;const assignedResendId=item.type==='RESEND'?resendId:null;
      await c.query(`UPDATE delivery_discrepancies SET status='RESOLVED',resolution_type=?,resolved_at=NOW(),resolved_by_user_id=?,resolved_by_name=?,resolution_note=?,late_resolution_reason=?,resend_fulfillment_id=? WHERE id=?`,[item.type,actor.user_id,actor.name,item.note,item.lateReason,assignedResendId,row.id]);
      await c.query(`UPDATE warehouse_sla_violations SET status='RESOLVED',resolved_at=NOW(),overdue_minutes=GREATEST(TIMESTAMPDIFF(MINUTE,due_at,NOW()),0),late_reason=? WHERE discrepancy_id=? AND violation_type='DELIVERY_DISCREPANCY_OVERDUE'`,[item.lateReason,row.id]);
      const[receiptRows]=await c.query('SELECT delivery_receipt_id FROM delivery_receipt_items WHERE id=? LIMIT 1',[row.delivery_receipt_item_id]);if(receiptRows[0])affectedReceiptIds.add(Number(receiptRows[0].delivery_receipt_id));
      await ActivityService.log(c,{request_id:row.request_id,entity_type:'DELIVERY_DISCREPANCY',entity_id:row.id,action_code:'DELIVERY_DISCREPANCY_RESOLVED',actor_user_id:actor.user_id,actor_name:actor.name,after:{resolution_type:item.type,resend_fulfillment_id:assignedResendId,late:item.late,late_resolution_reason:item.lateReason}});
    }

    for(const receiptId of affectedReceiptIds){
      const[remain]=await c.query("SELECT dd.id FROM delivery_discrepancies dd INNER JOIN delivery_receipt_items dri ON dri.id=dd.delivery_receipt_item_id WHERE dri.delivery_receipt_id=? AND dd.status<>'RESOLVED' LIMIT 1",[receiptId]);
      if(!remain[0])await c.query("UPDATE delivery_receipts SET status='RECEIVED' WHERE id=?",[receiptId]);
    }

    await ActivityService.log(c,{request_id:String(requestId),entity_type:'REQUEST',entity_id:String(requestId),action_code:'DELIVERY_DISCREPANCY_FORM_RESOLVED',actor_user_id:actor.user_id,actor_name:actor.name,after:{resolved_count:normalized.length,resend_item_count:resendRows.length,resend_fulfillment_id:resendId}});
    await finalizeRequestReceipt(c,String(requestId),actor);
    await c.commit();
    return{request_id:String(requestId),resend_fulfillment_id:resendId,resolved_items:normalized.map(item=>({discrepancy_id:item.row.id,resolution_type:item.type,resend_fulfillment_id:item.type==='RESEND'?resendId:null}))};
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function processDueActions(){const autoReceived=await processDueReceipts();const db=requireDatabase();await refreshDiscrepancyStatuses(db);await ValidationService.refreshReturnViolations(db);return{auto_received_count:autoReceived};}

module.exports={listMine,getById,confirm,processDueReceipts,refreshDiscrepancyStatuses,listDiscrepancies,listDiscrepancyForms,getDiscrepancyForm,resolveDiscrepancyForm,finalizeRequestReceipt,processDueActions};
