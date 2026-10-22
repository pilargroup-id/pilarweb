const crypto = require('crypto');
const { requireDatabase } = require('../config/database.config');
const ItembaseService = require('./itembase.service');
const ActivityService = require('./activity.service');
const AccessService = require('./access.service');
const DirectoryService = require('./directory.service');
const ValidationService = require('./validation.service');
const PolicyService = require('./policy.service');
const UserUtil = require('../utils/user.util');
const SequenceUtil = require('../utils/sequence.util');
const { createError, optionalText, positiveNumber, parsePositiveInt } = require('../utils/business.util');

const EDITABLE_STATUSES = new Set(['PENDING_DEPARTMENT_APPROVAL','REVERTED_TO_REQUESTER']);

function itemFromItembase(body){const item=body?.data&&typeof body.data==='object'?body.data:body;if(!item?.id)throw createError('Invalid Itembase item response',502,'ITEMBASE_INVALID_RESPONSE');if(String(item.item_kind||'').toLowerCase()!=='regular')throw createError('Only regular items can be requested',422,'ITEM_KIND_NOT_ALLOWED');return item;}
function itemSnapshot(item){return{itembase_item_id:String(item.id),item_code:String(item.item_code||'').trim(),item_name:String(item.item_name||'').trim(),selling_name:item.selling_name?String(item.selling_name).trim():null,parent_id:item.parent?.id?String(item.parent.id):null,parent_name:item.parent?.parent_name?String(item.parent.parent_name):null,variant_name:item.variant_summary?String(item.variant_summary):null,uom_code:item.uom?.code?String(item.uom.code):null,item_kind:'regular'};}
async function resolveItemSnapshot(id){const item=itemFromItembase(await ItembaseService.getItemById(id));const s=itemSnapshot(item);if(!s.item_code||!s.item_name)throw createError('Itembase item is missing item code or name',502,'ITEMBASE_INVALID_RESPONSE');return s;}

async function getPurpose(connection,purposeId,{allowSystem=false}={}){
  const [rows]=await connection.query(`SELECT * FROM master_request_purposes WHERE id=? AND is_active=1 LIMIT 1`,[Number(purposeId)]);
  const row=rows[0];if(!row)throw createError('Request purpose not found',422,'REQUEST_PURPOSE_NOT_FOUND');
  if(Number(row.is_system)===1&&!allowSystem)throw createError('System request purpose cannot be selected manually',422,'SYSTEM_PURPOSE_NOT_SELECTABLE');
  return row;
}

async function resolveTargetDepartment(accessToken,targetDepartmentId,requester){
  const targetId=targetDepartmentId===undefined||targetDepartmentId===null||targetDepartmentId===''?Number(requester.department_id):Number(targetDepartmentId);
  if(!Number.isInteger(targetId)||targetId<=0)throw createError('target_department_id is invalid',422,'VALIDATION_ERROR');
  if(targetId===Number(requester.department_id))return{id:targetId,name:requester.department_name};
  if(!accessToken)throw createError('Authentication token is required to resolve Target Department',401,'TOKEN_MISSING');
  const departments=await DirectoryService.getDepartments(accessToken);const found=departments.find(r=>Number(r.department_id??r.id)===targetId);
  if(!found)throw createError('Target Department not found',422,'TARGET_DEPARTMENT_NOT_FOUND');
  return{id:targetId,name:found.department_name??found.name??null};
}

async function assertRequesterCanCreate(connection,user){
  const snapshot=UserUtil.snapshot(user);if(!snapshot.user_id||!snapshot.department_id)throw createError('User department is required to create a request',422,'REQUESTER_CONTEXT_MISSING');
  const rule=await AccessService.findApprovalRuleForDepartment(snapshot.department_id,connection);if(!rule)throw createError('Approval rule is not configured for this department',422,'APPROVAL_RULE_MISSING');
  if(!AccessService.canCreateRequestWithRule(user,rule))throw createError('Current job level is not allowed to create requests',403,'REQUEST_CREATE_FORBIDDEN');
  await ValidationService.assertCanRequest(user,connection);return{snapshot,rule};
}

async function insertItem(connection,requestId,payload){
  const itemId=String(payload?.itembase_item_id||'').trim();if(!itemId)throw createError('itembase_item_id is required',422,'VALIDATION_ERROR');
  const qty=positiveNumber(payload?.requested_qty,'requested_qty');const notes=optionalText(payload?.notes,500);const s=await resolveItemSnapshot(itemId);
  const [dup]=await connection.query('SELECT id FROM request_items WHERE request_id=? AND itembase_item_id=? LIMIT 1',[requestId,s.itembase_item_id]);if(dup[0])throw createError('Item already exists in this request',409,'REQUEST_ITEM_DUPLICATE');
  const [result]=await connection.query(`INSERT INTO request_items (request_id,itembase_item_id,item_code,item_name,selling_name,parent_id,parent_name,variant_name,uom_code,item_kind,requested_qty,notes) VALUES (?,?,?,?,?,?,?,?,?,'regular',?,?)`,[requestId,s.itembase_item_id,s.item_code,s.item_name,s.selling_name,s.parent_id,s.parent_name,s.variant_name,s.uom_code,qty,notes]);
  return{id:result.insertId,...s,requested_qty:qty,notes};
}

async function create(user,accessToken,payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();const {snapshot,rule}=await assertRequesterCanCreate(c,user);const purpose=await getPurpose(c,payload.request_purpose_id);const target=await resolveTargetDepartment(accessToken,payload.target_department_id,snapshot);const policy=await PolicyService.getActive(c);
    const reason=optionalText(payload.reason,5000);if(!reason)throw createError('Reason is required',422,'REQUEST_REASON_REQUIRED');const items=Array.isArray(payload.items)?payload.items:[];if(!items.length)throw createError('At least one request item is required',422,'REQUEST_ITEMS_REQUIRED');
    const requestNumber=await SequenceUtil.nextNumber(c,'PB',SequenceUtil.yearMonthPeriod(),'PB',5,'');const id=crypto.randomUUID();
    await c.query(`INSERT INTO requests (
      id,request_number,request_origin,request_purpose_id,request_purpose_code,request_purpose_name,purpose_return_type,status,
      requester_user_id,requester_internal_id,requester_name,requester_job_level_value,requester_job_level_name,
      department_id,department_name,target_department_id,target_department_name,company_id,company_name,reason,
      receipt_confirmation_days_snapshot,discrepancy_resolution_days_snapshot,discrepancy_escalation_days_snapshot,discrepancy_supervisor_lock_days_snapshot,return_due_days_snapshot,policy_timezone_snapshot,submitted_at
    ) VALUES (?,?,'NORMAL',?,?,?,?,'PENDING_DEPARTMENT_APPROVAL',?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,[
      id,requestNumber,purpose.id,purpose.code,purpose.name,purpose.return_type,snapshot.user_id,snapshot.internal_id,snapshot.name,snapshot.job_level_value,snapshot.job_level_name,snapshot.department_id,snapshot.department_name,target.id,target.name,snapshot.company_id,snapshot.company_name,reason,
      policy.receipt_confirmation_days,policy.discrepancy_resolution_days,policy.discrepancy_escalation_days,policy.discrepancy_supervisor_lock_days,policy.return_due_days,policy.timezone
    ]);
    for(const item of items)await insertItem(c,id,item);
    await c.query(`INSERT INTO request_approvals (request_id,approval_rule_id,approval_order,department_id,department_name,required_job_level_value,required_job_level_name,allow_higher_job_level,status) VALUES (?,?,1,?,?,?,?,?,'PENDING')`,[id,rule.id,snapshot.department_id,snapshot.department_name,rule.approver_min_job_level_value,rule.approver_job_level_name,rule.allow_higher_job_level]);
    await ActivityService.log(c,{request_id:id,entity_type:'REQUEST',entity_id:id,action_code:'REQUEST_CREATED',actor_user_id:snapshot.user_id,actor_name:snapshot.name,after:{request_number:requestNumber,status:'PENDING_DEPARTMENT_APPROVAL',request_origin:'NORMAL',target_department_id:target.id,purpose_return_type:purpose.return_type}});
    await c.commit();return getById(id,user);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function update(user,accessToken,requestId,payload={}){
  const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();const r=await lockRequest(c,requestId);assertOwner(user,r);assertEditable(r);if(r.request_origin!=='NORMAL')throw createError('System-generated PB cannot be edited by requester',409,'SYSTEM_REQUEST_NOT_EDITABLE');
    const purpose=payload.request_purpose_id!==undefined?await getPurpose(c,payload.request_purpose_id):{id:r.request_purpose_id,code:r.request_purpose_code,name:r.request_purpose_name,return_type:r.purpose_return_type};const target=payload.target_department_id!==undefined?await resolveTargetDepartment(accessToken,payload.target_department_id,{department_id:r.department_id,department_name:r.department_name}):{id:r.target_department_id,name:r.target_department_name};const reason=payload.reason!==undefined?optionalText(payload.reason,5000):r.reason;if(!reason)throw createError('Reason is required',422,'REQUEST_REASON_REQUIRED');
    await c.query(`UPDATE requests SET request_purpose_id=?,request_purpose_code=?,request_purpose_name=?,purpose_return_type=?,target_department_id=?,target_department_name=?,reason=? WHERE id=?`,[purpose.id,purpose.code,purpose.name,purpose.return_type,target.id,target.name,reason,r.id]);
    await ActivityService.log(c,{request_id:r.id,entity_type:'REQUEST',entity_id:r.id,action_code:'REQUEST_UPDATED',actor_user_id:user.id,actor_name:user.name,before:{request_purpose_id:r.request_purpose_id,target_department_id:r.target_department_id,reason:r.reason},after:{request_purpose_id:purpose.id,target_department_id:target.id,reason}});await c.commit();return getById(r.id,user);
  }catch(e){await c.rollback();throw e;}finally{c.release();}}

async function addItem(user,requestId,payload={}){const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();const r=await lockRequest(c,requestId);assertOwner(user,r);assertEditable(r);if(r.request_origin!=='NORMAL')throw createError('System-generated PB items cannot be changed',409,'SYSTEM_REQUEST_NOT_EDITABLE');const item=await insertItem(c,r.id,payload);await ActivityService.log(c,{request_id:r.id,entity_type:'REQUEST_ITEM',entity_id:item.id,action_code:'REQUEST_ITEM_ADDED',actor_user_id:user.id,actor_name:user.name,after:item});await c.commit();return getById(r.id,user);}catch(e){await c.rollback();throw e;}finally{c.release();}}
async function updateItem(user,requestId,itemId,payload={}){const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();const r=await lockRequest(c,requestId);assertOwner(user,r);assertEditable(r);if(r.request_origin!=='NORMAL')throw createError('System-generated PB items cannot be changed',409,'SYSTEM_REQUEST_NOT_EDITABLE');const [rows]=await c.query('SELECT * FROM request_items WHERE id=? AND request_id=? LIMIT 1 FOR UPDATE',[Number(itemId),r.id]);const item=rows[0];if(!item)throw createError('Request item not found',404,'REQUEST_ITEM_NOT_FOUND');const qty=payload.requested_qty!==undefined?positiveNumber(payload.requested_qty,'requested_qty'):Number(item.requested_qty);const notes=payload.notes!==undefined?optionalText(payload.notes,500):item.notes;await c.query('UPDATE request_items SET requested_qty=?,notes=? WHERE id=?',[qty,notes,item.id]);await ActivityService.log(c,{request_id:r.id,entity_type:'REQUEST_ITEM',entity_id:item.id,action_code:'REQUEST_ITEM_UPDATED',actor_user_id:user.id,actor_name:user.name,before:{requested_qty:item.requested_qty,notes:item.notes},after:{requested_qty:qty,notes}});await c.commit();return getById(r.id,user);}catch(e){await c.rollback();throw e;}finally{c.release();}}
async function removeItem(user,requestId,itemId){const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();const r=await lockRequest(c,requestId);assertOwner(user,r);assertEditable(r);if(r.request_origin!=='NORMAL')throw createError('System-generated PB items cannot be changed',409,'SYSTEM_REQUEST_NOT_EDITABLE');const [rows]=await c.query('SELECT * FROM request_items WHERE id=? AND request_id=? LIMIT 1 FOR UPDATE',[Number(itemId),r.id]);const item=rows[0];if(!item)throw createError('Request item not found',404,'REQUEST_ITEM_NOT_FOUND');const [count]=await c.query('SELECT COUNT(*) AS total FROM request_items WHERE request_id=?',[r.id]);if(Number(count[0]?.total||0)<=1)throw createError('A request must keep at least one item',409,'REQUEST_ITEMS_REQUIRED');await c.query('DELETE FROM request_items WHERE id=?',[item.id]);await ActivityService.log(c,{request_id:r.id,entity_type:'REQUEST_ITEM',entity_id:item.id,action_code:'REQUEST_ITEM_REMOVED',actor_user_id:user.id,actor_name:user.name,before:item});await c.commit();return getById(r.id,user);}catch(e){await c.rollback();throw e;}finally{c.release();}}

async function submit(user,requestId){const db=requireDatabase();const c=await db.getConnection();try{await c.beginTransaction();const r=await lockRequest(c,requestId);assertOwner(user,r);if(r.request_origin!=='NORMAL'||r.status!=='REVERTED_TO_REQUESTER')throw createError('Only a reverted normal PB can be submitted again',409,'REQUEST_NOT_SUBMITTABLE');await ValidationService.assertCanRequest(user,c);const [items]=await c.query('SELECT id FROM request_items WHERE request_id=? LIMIT 1',[r.id]);if(!items[0])throw createError('At least one request item is required',422,'REQUEST_ITEMS_REQUIRED');await c.query(`UPDATE request_approvals SET status='PENDING',approver_user_id=NULL,approver_internal_id=NULL,approver_name=NULL,approver_job_level_value=NULL,approver_job_level_name=NULL,note=NULL,decided_at=NULL,reverted_at=NULL,reverted_by_user_id=NULL,reverted_by_name=NULL,revert_reason=NULL WHERE request_id=?`,[r.id]);await c.query("UPDATE requests SET status='PENDING_DEPARTMENT_APPROVAL',submitted_at=NOW() WHERE id=?",[r.id]);await ActivityService.log(c,{request_id:r.id,entity_type:'REQUEST',entity_id:r.id,action_code:'REQUEST_RESUBMITTED',actor_user_id:user.id,actor_name:user.name,before:{status:r.status},after:{status:'PENDING_DEPARTMENT_APPROVAL'}});await c.commit();return getById(r.id,user);}catch(e){await c.rollback();throw e;}finally{c.release();}}

async function listMine(user,query={}){const db=requireDatabase();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[String(user.id)];let where='WHERE requester_user_id=?';if(query.status){where+=' AND status=?';params.push(String(query.status).toUpperCase());}if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (request_number LIKE ? OR request_purpose_name LIKE ? OR reason LIKE ? OR target_department_name LIKE ?)';params.push(s,s,s,s);}const[count]=await db.query(`SELECT COUNT(*) AS total FROM requests ${where}`,params);const[rows]=await db.query(`SELECT r.*,EXISTS(SELECT 1 FROM delivery_receipts dr WHERE dr.request_id=r.id AND dr.status='PENDING') AS has_pending_delivery_receipt FROM requests r ${where} ORDER BY r.created_at DESC LIMIT ? OFFSET ?`,[...params,limit,offset]);const total=Number(count[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};}

async function canViewRequest(c,user,r){if(String(r.requester_user_id)===String(user.id))return true;if(await AccessService.hasModuleAccess(user,'ADMIN',c))return true;if(await AccessService.hasModuleAccess(user,'FINANCE',c))return true;if(await AccessService.hasModuleAccess(user,'WAREHOUSE',c))return true;if(await AccessService.hasValidationOverrideAccess(user,c))return true;const [hist]=await c.query('SELECT id FROM request_approvals WHERE request_id=? AND approver_user_id=? LIMIT 1',[r.id,user.id]);if(hist[0])return true;const [a]=await c.query("SELECT department_id,required_job_level_value,allow_higher_job_level FROM request_approvals WHERE request_id=? AND status='PENDING' ORDER BY approval_order LIMIT 1",[r.id]);return a[0]?AccessService.canApproveWithSnapshot(user,a[0]):false;}

async function getById(requestId,user){const db=requireDatabase();const c=await db.getConnection();try{const[rows]=await c.query('SELECT * FROM requests WHERE id=? LIMIT 1',[requestId]);const r=rows[0];if(!r)throw createError('Request not found',404,'REQUEST_NOT_FOUND');if(!(await canViewRequest(c,user,r)))throw createError('Request is not accessible',403,'REQUEST_ACCESS_FORBIDDEN');const[items]=await c.query('SELECT * FROM request_items WHERE request_id=? ORDER BY id',[r.id]);const[approvals]=await c.query('SELECT * FROM request_approvals WHERE request_id=? ORDER BY approval_order,id',[r.id]);const[frRows]=await c.query('SELECT * FROM finance_reviews WHERE request_id=? LIMIT 1',[r.id]);let finance=frRows[0]||null;if(finance){const[fi]=await c.query('SELECT * FROM finance_review_items WHERE finance_review_id=? ORDER BY id',[finance.id]);finance={...finance,items:fi};}
    const[fulfillments]=await c.query('SELECT * FROM warehouse_fulfillments WHERE request_id=? ORDER BY created_at,id',[r.id]);for(const f of fulfillments){const[fi]=await c.query('SELECT * FROM warehouse_fulfillment_items WHERE fulfillment_id=? ORDER BY id',[f.id]);const[dr]=await c.query('SELECT * FROM delivery_receipts WHERE fulfillment_id=? LIMIT 1',[f.id]);f.items=fi;f.delivery_receipt=dr[0]||null;if(f.delivery_receipt){const[dri]=await c.query('SELECT * FROM delivery_receipt_items WHERE delivery_receipt_id=? ORDER BY id',[f.delivery_receipt.id]);f.delivery_receipt.items=dri;}}
    const[disc]=await c.query('SELECT * FROM delivery_discrepancies WHERE request_id=? ORDER BY created_at,id',[r.id]);const[rtRows]=await c.query('SELECT rt.*,rt.due_at AS due_date,(rt.expected_total_qty-COALESCE(rt.warehouse_received_total_qty,0)) AS outstanding_qty FROM returns rt WHERE rt.request_id=? LIMIT 1',[r.id]);let ret=rtRows[0]||null;if(ret){const[ri]=await c.query('SELECT * FROM return_items WHERE return_id=? ORDER BY id',[ret.id]);ret={...ret,items:ri};}
    return{...r,items,approvals,finance_review:finance,fulfillments,delivery_discrepancies:disc,return:ret};
  }finally{c.release();}}

async function lockRequest(c,id){const[rows]=await c.query('SELECT * FROM requests WHERE id=? LIMIT 1 FOR UPDATE',[id]);if(!rows[0])throw createError('Request not found',404,'REQUEST_NOT_FOUND');return rows[0];}
function assertOwner(user,r){if(String(r.requester_user_id)!==String(user.id))throw createError('Only the requester can change this request',403,'REQUEST_OWNER_REQUIRED');}
function assertEditable(r){if(!EDITABLE_STATUSES.has(r.status))throw createError('Request can only be edited before Manager approval or after Manager revert',409,'REQUEST_NOT_EDITABLE');}

module.exports={create,update,addItem,updateItem,removeItem,submit,listMine,getById,canViewRequest,lockRequest,getPurpose};
