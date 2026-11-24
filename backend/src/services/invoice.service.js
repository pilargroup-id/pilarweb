const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, parsePositiveInt } = require('../utils/business.util');

const COMPANY_NAMES = Object.freeze({
  KATO: 'PT Kato Piagam Indonesia',
  PNM: 'PT Pilar Niaga Makmur',
});

function normalizeCompanyCode(value,{required=false}={}){
  const raw=String(value||'').trim().toUpperCase();
  if(!raw){if(required)throw createError('company_code is required',422,'INVOICE_COMPANY_REQUIRED');return null;}
  const code=raw==='KPI'?'KATO':raw;
  if(!COMPANY_NAMES[code])throw createError('company_code must be KATO or PNM',422,'INVOICE_COMPANY_INVALID');
  return code;
}

function uniqueRequestIds(value){
  if(!Array.isArray(value)||!value.length)throw createError('request_ids must contain at least one PB',422,'INVOICE_REQUESTS_REQUIRED');
  const ids=[...new Set(value.map(v=>String(v||'').trim()).filter(Boolean))];
  if(!ids.length)throw createError('request_ids must contain at least one PB',422,'INVOICE_REQUESTS_REQUIRED');
  return ids;
}

async function listEligible(user,query={}){
  await AccessService.requireModuleAccess(user,'FINANCE');
  const db=requireDatabase();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[];
  let where="WHERE r.request_origin='NORMAL' AND r.status='COMPLETED' AND r.invoice_status='READY_TO_INVOICE' AND r.item_company_code IS NOT NULL";
  const companyCode=normalizeCompanyCode(query.company_code);
  if(companyCode){where+=' AND r.item_company_code=?';params.push(companyCode);}
  if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.request_purpose_name LIKE ? OR r.target_department_name LIKE ?)';params.push(s,s,s,s);}
  const[count]=await db.query(`SELECT COUNT(*) AS total FROM requests r ${where}`,params);
  const[rows]=await db.query(`SELECT r.id AS request_id,r.request_number,r.item_company_code,r.item_company_name,r.invoice_status,r.requester_name,r.department_name,r.target_department_name,r.request_purpose_name,r.completed_at FROM requests r ${where} ORDER BY r.completed_at ASC,r.request_number ASC LIMIT ? OFFSET ?`,[...params,limit,offset]);
  const total=Number(count[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function listGroups(user,query={}){
  await AccessService.requireModuleAccess(user,'FINANCE');
  const db=requireDatabase();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[];let where='WHERE 1=1';
  const companyCode=normalizeCompanyCode(query.company_code);
  if(companyCode){where+=' AND fig.item_company_code=?';params.push(companyCode);}
  if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND fig.invoice_number LIKE ?';params.push(s);}
  const[count]=await db.query(`SELECT COUNT(*) AS total FROM finance_invoice_groups fig ${where}`,params);
  const[rows]=await db.query(`SELECT fig.*,(SELECT COUNT(*) FROM finance_invoice_group_requests figr WHERE figr.invoice_group_id=fig.id AND figr.removed_at IS NULL) AS active_request_count FROM finance_invoice_groups fig ${where} ORDER BY fig.created_at DESC,fig.id DESC LIMIT ? OFFSET ?`,[...params,limit,offset]);
  const total=Number(count[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function getGroup(user,id){
  await AccessService.requireModuleAccess(user,'FINANCE');const db=requireDatabase();const[groups]=await db.query('SELECT * FROM finance_invoice_groups WHERE id=? LIMIT 1',[Number(id)]);const group=groups[0];if(!group)throw createError('Invoice group not found',404,'INVOICE_GROUP_NOT_FOUND');
  const[active]=await db.query(`SELECT figr.id AS membership_id,figr.assigned_at,figr.assigned_by_user_id,figr.assigned_by_name,r.id AS request_id,r.request_number,r.item_company_code,r.item_company_name,r.invoice_status,r.requester_name,r.department_name,r.target_department_name,r.request_purpose_name,r.completed_at FROM finance_invoice_group_requests figr INNER JOIN requests r ON r.id=figr.request_id WHERE figr.invoice_group_id=? AND figr.removed_at IS NULL ORDER BY figr.assigned_at,figr.id`,[group.id]);
  const[removed]=await db.query(`SELECT figr.id AS membership_id,figr.assigned_at,figr.assigned_by_name,figr.removed_at,figr.removed_by_user_id,figr.removed_by_name,figr.removal_reason,r.id AS request_id,r.request_number FROM finance_invoice_group_requests figr INNER JOIN requests r ON r.id=figr.request_id WHERE figr.invoice_group_id=? AND figr.removed_at IS NOT NULL ORDER BY figr.removed_at DESC,figr.id DESC`,[group.id]);
  return{...group,requests:active,removed_requests:removed};
}

async function lockEligibleRequests(c,ids){
  const placeholders=ids.map(()=>'?').join(',');
  const[rows]=await c.query(`SELECT * FROM requests WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,ids);
  if(rows.length!==ids.length){const found=new Set(rows.map(r=>String(r.id)));const missing=ids.filter(id=>!found.has(String(id)));throw createError(`PB not found: ${missing.join(', ')}`,404,'INVOICE_REQUEST_NOT_FOUND');}
  for(const r of rows){
    if(r.request_origin!=='NORMAL'||r.status!=='COMPLETED'||r.invoice_status!=='READY_TO_INVOICE')throw createError(`PB ${r.request_number} is not ready to invoice`,409,'PB_NOT_READY_TO_INVOICE');
    if(!r.item_company_code||!r.item_company_name)throw createError(`PB ${r.request_number} does not have item company snapshot`,409,'PB_ITEM_COMPANY_MISSING');
    const[active]=await c.query('SELECT id,invoice_group_id FROM finance_invoice_group_requests WHERE request_id=? AND removed_at IS NULL LIMIT 1 FOR UPDATE',[r.id]);
    if(active[0])throw createError(`PB ${r.request_number} is already assigned to an invoice`,409,'PB_ALREADY_INVOICED');
  }
  return rows;
}

async function assignRows(c,group,rows,actor){
  for(const r of rows){
    if(r.item_company_code!==group.item_company_code)throw createError(`PB ${r.request_number} belongs to ${r.item_company_name}; invoice group belongs to ${group.item_company_name}`,409,'INVOICE_COMPANY_MISMATCH');
    const[result]=await c.query(`INSERT INTO finance_invoice_group_requests (invoice_group_id,request_id,assigned_by_user_id,assigned_by_name,assigned_at) VALUES (?,?,?,?,NOW())`,[group.id,r.id,actor.user_id,actor.name]);
    await c.query("UPDATE requests SET invoice_status='INVOICED' WHERE id=?",[r.id]);
    await ActivityService.log(c,{request_id:r.id,entity_type:'FINANCE_INVOICE_GROUP',entity_id:group.id,action_code:'PB_ASSIGNED_TO_INVOICE',actor_user_id:actor.user_id,actor_name:actor.name,after:{membership_id:result.insertId,invoice_number:group.invoice_number,item_company_code:group.item_company_code}});
  }
}

async function createGroup(user,payload={}){
  const invoiceNumber=String(payload.invoice_number||'').trim();if(!invoiceNumber)throw createError('invoice_number is required',422,'INVOICE_NUMBER_REQUIRED');if(invoiceNumber.length>120)throw createError('invoice_number is too long',422,'VALIDATION_ERROR');const ids=uniqueRequestIds(payload.request_ids);const note=optionalText(payload.note,5000);
  const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const[duplicate]=await c.query('SELECT id FROM finance_invoice_groups WHERE invoice_number=? LIMIT 1 FOR UPDATE',[invoiceNumber]);if(duplicate[0])throw createError('invoice_number already exists',409,'INVOICE_NUMBER_DUPLICATE');const rows=await lockEligibleRequests(c,ids);const companyCode=rows[0].item_company_code;if(rows.some(r=>r.item_company_code!==companyCode))throw createError('All PBs in one invoice must belong to the same company',409,'INVOICE_COMPANY_MISMATCH');const actor=UserUtil.snapshot(user);const[result]=await c.query(`INSERT INTO finance_invoice_groups (invoice_number,item_company_code,item_company_name,note,created_by_user_id,created_by_name) VALUES (?,?,?,?,?,?)`,[invoiceNumber,companyCode,rows[0].item_company_name,note,actor.user_id,actor.name]);const group={id:result.insertId,invoice_number:invoiceNumber,item_company_code:companyCode,item_company_name:rows[0].item_company_name};await assignRows(c,group,rows,actor);await c.commit();return getGroup(user,group.id);}catch(e){await c.rollback();if(e?.code==='ER_DUP_ENTRY')throw createError('invoice_number already exists',409,'INVOICE_NUMBER_DUPLICATE');throw e;}finally{c.release();}
}

async function addRequests(user,id,payload={}){
  const ids=uniqueRequestIds(payload.request_ids);const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const[groups]=await c.query('SELECT * FROM finance_invoice_groups WHERE id=? LIMIT 1 FOR UPDATE',[Number(id)]);const group=groups[0];if(!group)throw createError('Invoice group not found',404,'INVOICE_GROUP_NOT_FOUND');const rows=await lockEligibleRequests(c,ids);const actor=UserUtil.snapshot(user);await assignRows(c,group,rows,actor);await c.commit();return getGroup(user,group.id);}catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function removeRequest(user,id,requestId,payload={}){
  const reason=optionalText(payload.reason,5000);if(!reason)throw createError('reason is required to remove a PB from an invoice',422,'INVOICE_REMOVE_REASON_REQUIRED');const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);const[groups]=await c.query('SELECT * FROM finance_invoice_groups WHERE id=? LIMIT 1 FOR UPDATE',[Number(id)]);const group=groups[0];if(!group)throw createError('Invoice group not found',404,'INVOICE_GROUP_NOT_FOUND');const[requests]=await c.query('SELECT * FROM requests WHERE id=? LIMIT 1 FOR UPDATE',[String(requestId)]);const r=requests[0];if(!r)throw createError('PB not found',404,'REQUEST_NOT_FOUND');const[memberships]=await c.query('SELECT * FROM finance_invoice_group_requests WHERE invoice_group_id=? AND request_id=? AND removed_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE',[group.id,r.id]);const membership=memberships[0];if(!membership)throw createError('PB is not actively assigned to this invoice',409,'PB_NOT_IN_INVOICE_GROUP');const actor=UserUtil.snapshot(user);await c.query(`UPDATE finance_invoice_group_requests SET removed_at=NOW(),removed_by_user_id=?,removed_by_name=?,removal_reason=? WHERE id=?`,[actor.user_id,actor.name,reason,membership.id]);await c.query("UPDATE requests SET invoice_status='READY_TO_INVOICE' WHERE id=?",[r.id]);await ActivityService.log(c,{request_id:r.id,entity_type:'FINANCE_INVOICE_GROUP',entity_id:group.id,action_code:'PB_REMOVED_FROM_INVOICE',actor_user_id:actor.user_id,actor_name:actor.name,before:{invoice_number:group.invoice_number,invoice_status:r.invoice_status},after:{invoice_status:'READY_TO_INVOICE',reason}});await c.commit();return getGroup(user,group.id);}catch(e){await c.rollback();throw e;}finally{c.release();}
}

module.exports={listEligible,listGroups,getGroup,createGroup,addRequests,removeRequest};
