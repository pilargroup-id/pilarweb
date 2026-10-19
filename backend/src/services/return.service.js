const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const UserUtil = require('../utils/user.util');
const SequenceUtil = require('../utils/sequence.util');
const { createError, optionalText, positiveNumber, parsePositiveInt } = require('../utils/business.util');

async function canView(user, row, connection=null){
  if(String(row.requester_user_id)===String(user.id))return true;
  if(await AccessService.hasModuleAccess(user,'ADMIN',connection))return true;
  if(await AccessService.hasModuleAccess(user,'WAREHOUSE',connection))return true;
  if(await AccessService.hasModuleAccess(user,'FINANCE',connection))return true;
  if(await AccessService.hasValidationOverrideAccess(user,connection))return true;
  return false;
}

async function list(user, query={}){
  const db=requireDatabase();
  const privileged=(await AccessService.hasModuleAccess(user,'WAREHOUSE'))||(await AccessService.hasModuleAccess(user,'ADMIN'))||(await AccessService.hasModuleAccess(user,'FINANCE'))||(await AccessService.hasValidationOverrideAccess(user));
  const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[];let where='WHERE 1=1';
  if(!privileged){where+=' AND r.requester_user_id=?';params.push(String(user.id));}
  if(query.status){where+=' AND rt.status=?';params.push(String(query.status).trim().toUpperCase());}
  if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (rt.return_number LIKE ? OR r.request_number LIKE ? OR r.requester_name LIKE ?)';params.push(s,s,s);}
  const from=`FROM returns rt INNER JOIN requests r ON r.id=rt.request_id ${where}`;
  const [countRows]=await db.query(`SELECT COUNT(*) AS total ${from}`,params);
  const [rows]=await db.query(`
    SELECT rt.*,r.request_number,r.requester_user_id,r.requester_name,r.department_id,r.department_name,r.target_department_id,r.target_department_name,r.request_purpose_name,r.purpose_return_type,r.status AS request_status,
      (SELECT COALESCE(SUM(ri.expected_qty),0) FROM return_items ri WHERE ri.return_id=rt.id) AS expected_qty,
      (SELECT COALESCE(SUM(ri.warehouse_received_qty),0) FROM return_items ri WHERE ri.return_id=rt.id) AS warehouse_received_qty,
      (SELECT COALESCE(SUM(ri.expected_qty-ri.warehouse_received_qty),0) FROM return_items ri WHERE ri.return_id=rt.id) AS outstanding_qty
    ${from}
    ORDER BY rt.due_date ASC,rt.created_at DESC LIMIT ? OFFSET ?
  `,[...params,limit,offset]);
  const total=Number(countRows[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function getById(user, returnId){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    const [rows]=await c.query(`SELECT rt.*,r.request_number,r.requester_user_id,r.requester_name,r.department_id,r.department_name,r.target_department_id,r.target_department_name,r.request_purpose_name,r.status AS request_status FROM returns rt INNER JOIN requests r ON r.id=rt.request_id WHERE rt.id=? LIMIT 1`,[Number(returnId)]);
    const row=rows[0];if(!row)throw createError('Return not found',404,'RETURN_NOT_FOUND');
    if(!(await canView(user,row,c)))throw createError('Return is not accessible',403,'RETURN_ACCESS_FORBIDDEN');
    const [items]=await c.query('SELECT * FROM return_items WHERE return_id=? ORDER BY id ASC',[row.id]);
    const [receipts]=await c.query('SELECT * FROM return_receipts WHERE return_id=? ORDER BY received_at ASC,id ASC',[row.id]);
    for(const receipt of receipts){
      const [receiptItems]=await c.query(`SELECT rri.*,ri.request_item_id,ri.item_code,ri.item_name FROM return_receipt_items rri INNER JOIN return_items ri ON ri.id=rri.return_item_id WHERE rri.return_receipt_id=? ORDER BY rri.id ASC`,[receipt.id]);
      receipt.items=receiptItems;
    }
    return{...row,items,receipts};
  }finally{c.release();}
}

async function submit(user, returnId, payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();
    const [rows]=await c.query(`SELECT rt.*,r.requester_user_id,r.id AS request_id FROM returns rt INNER JOIN requests r ON r.id=rt.request_id WHERE rt.id=? LIMIT 1 FOR UPDATE`,[Number(returnId)]);
    const rt=rows[0];if(!rt)throw createError('Return not found',404,'RETURN_NOT_FOUND');
    if(String(rt.requester_user_id)!==String(user.id))throw createError('Only requester can submit this return',403,'RETURN_REQUESTER_REQUIRED');
    if(rt.status!=='PENDING_REQUESTER')throw createError('Return has already been submitted',409,'RETURN_NOT_PENDING_REQUESTER');
    const inputs=Array.isArray(payload.items)?payload.items:[];
    const byId=new Map(inputs.map(i=>[Number(i.return_item_id),i]));
    const [items]=await c.query('SELECT * FROM return_items WHERE return_id=? ORDER BY id ASC FOR UPDATE',[rt.id]);
    if(!items.length)throw createError('Return has no items',409,'RETURN_ITEMS_MISSING');
    for(const item of items){
      const input=byId.get(Number(item.id));
      if(!input)throw createError(`Return quantity is required for ${item.item_code}`,422,'RETURN_QTY_REQUIRED');
      const qty=positiveNumber(input.requester_return_qty,'requester_return_qty');
      if(Math.abs(qty-Number(item.expected_qty))>0.000001)throw createError(`requester_return_qty for ${item.item_code} must equal actual issued quantity ${item.expected_qty}`,422,'RETURN_QTY_MUST_MATCH_ISSUED');
      await c.query('UPDATE return_items SET requester_return_qty=?,note=? WHERE id=?',[qty,optionalText(input.note,500),item.id]);
    }
    const actor=UserUtil.snapshot(user);
    await c.query(`UPDATE returns SET status='SUBMITTED',requester_submitted_by_user_id=?,requester_submitted_by_name=?,requester_submitted_at=NOW() WHERE id=?`,[actor.user_id,actor.name,rt.id]);
    await c.query("UPDATE requests SET status='RETURN_SUBMITTED' WHERE id=?",[rt.request_id]);
    await ActivityService.log(c,{request_id:rt.request_id,entity_type:'RETURN',entity_id:rt.id,action_code:'RETURN_SUBMITTED',actor_user_id:actor.user_id,actor_name:actor.name});
    await c.commit();return getById(user,rt.id);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function receive(user, returnId, payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();
    const isAdmin=await AccessService.hasModuleAccess(user,'ADMIN',c);if(!isAdmin)await AccessService.requireModuleAccess(user,'WAREHOUSE',c);
    const [rows]=await c.query('SELECT * FROM returns WHERE id=? LIMIT 1 FOR UPDATE',[Number(returnId)]);
    const rt=rows[0];if(!rt)throw createError('Return not found',404,'RETURN_NOT_FOUND');
    if(!['SUBMITTED','PARTIALLY_RECEIVED'].includes(rt.status))throw createError('Return is not ready for Warehouse receipt',409,'RETURN_NOT_RECEIVABLE');
    const inputs=Array.isArray(payload.items)?payload.items:[];if(!inputs.length)throw createError('At least one received item is required',422,'RETURN_RECEIPT_ITEMS_REQUIRED');
    const actor=UserUtil.snapshot(user);
    const receiptNumber=await SequenceUtil.nextNumber(c,'RETURN_RECEIPT',SequenceUtil.year2Period(),'RRC',5);
    const [receiptResult]=await c.query(`INSERT INTO return_receipts (receipt_number,return_id,received_by_user_id,received_by_name,received_at,note) VALUES (?,?,?,?,NOW(),?)`,[receiptNumber,rt.id,actor.user_id,actor.name,optionalText(payload.note,500)]);
    let receivedSomething=false;
    for(const input of inputs){
      const returnItemId=Number(input.return_item_id);const qty=positiveNumber(input.received_qty,'received_qty');
      const [itemRows]=await c.query('SELECT * FROM return_items WHERE id=? AND return_id=? LIMIT 1 FOR UPDATE',[returnItemId,rt.id]);
      const item=itemRows[0];if(!item)throw createError(`Return item ${input.return_item_id} not found`,404,'RETURN_ITEM_NOT_FOUND');
      const remaining=Number(item.expected_qty)-Number(item.warehouse_received_qty||0);
      if(qty>remaining+0.000001)throw createError(`received_qty for ${item.item_code} exceeds outstanding quantity ${remaining}`,422,'RETURN_RECEIVED_QTY_EXCEEDS_OUTSTANDING');
      await c.query(`INSERT INTO return_receipt_items (return_receipt_id,return_item_id,received_qty,note) VALUES (?,?,?,?)`,[receiptResult.insertId,item.id,qty,optionalText(input.note,500)]);
      await c.query('UPDATE return_items SET warehouse_received_qty=warehouse_received_qty+? WHERE id=?',[qty,item.id]);
      receivedSomething=true;
    }
    if(!receivedSomething)throw createError('No received quantity was recorded',422,'RETURN_RECEIPT_ITEMS_REQUIRED');
    const [aggRows]=await c.query(`SELECT COALESCE(SUM(expected_qty),0) AS expected,COALESCE(SUM(warehouse_received_qty),0) AS received FROM return_items WHERE return_id=?`,[rt.id]);
    const expected=Number(aggRows[0]?.expected||0);const received=Number(aggRows[0]?.received||0);const completed=received>=expected-0.000001;
    if(completed){
      await c.query("UPDATE returns SET status='COMPLETED',completed_at=NOW() WHERE id=?",[rt.id]);
      await c.query("UPDATE requests SET status='COMPLETED',completed_at=NOW() WHERE id=?",[rt.request_id]);
    }else{
      await c.query("UPDATE returns SET status='PARTIALLY_RECEIVED' WHERE id=?",[rt.id]);
      await c.query("UPDATE requests SET status='RETURN_PARTIAL' WHERE id=?",[rt.request_id]);
    }
    await ActivityService.log(c,{request_id:rt.request_id,entity_type:'RETURN_RECEIPT',entity_id:receiptResult.insertId,action_code:completed?'RETURN_COMPLETED':'RETURN_PARTIALLY_RECEIVED',actor_user_id:actor.user_id,actor_name:actor.name,after:{receipt_number:receiptNumber,expected_qty:expected,warehouse_received_qty:received,outstanding_qty:Math.max(0,expected-received)}});
    await c.commit();return getById(user,rt.id);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

module.exports={list,getById,submit,receive};
