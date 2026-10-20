const { requireDatabase } = require('../config/database.config');
const AccessService = require('./access.service');
const ActivityService = require('./activity.service');
const RequestService = require('./request.service');
const WarehouseService = require('./warehouse.service');
const ReportService = require('./report.service');
const UserUtil = require('../utils/user.util');
const { createError, optionalText, nonNegativeNumber, parsePositiveInt, normalizeDate } = require('../utils/business.util');

async function listQueue(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  const db = requireDatabase();
  const page = parsePositiveInt(query.page, 1, 100000); const limit = parsePositiveInt(query.limit, 20, 100); const offset = (page - 1) * limit;
  const params=[]; let where="WHERE fr.status='PENDING' AND r.status='PENDING_FINANCE_REVIEW'";
  if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.request_purpose_name LIKE ? OR r.target_department_name LIKE ?)';params.push(s,s,s,s);}
  const [countRows]=await db.query(`SELECT COUNT(*) AS total FROM finance_reviews fr INNER JOIN requests r ON r.id=fr.request_id ${where}`,params);
  const [rows]=await db.query(`
    SELECT fr.id AS finance_review_id,fr.status AS finance_review_status,
           r.id AS request_id,r.request_number,r.request_purpose_name,r.purpose_return_type,r.return_due_date,
           r.requester_name,r.department_name,r.target_department_name,r.reason,r.submitted_at,r.status AS request_status
    FROM finance_reviews fr INNER JOIN requests r ON r.id=fr.request_id
    ${where}
    ORDER BY r.submitted_at ASC LIMIT ? OFFSET ?
  `,[...params,limit,offset]);
  const total=Number(countRows[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function listHistory(user, query = {}) {
  await AccessService.requireModuleAccess(user, 'FINANCE');
  const db=requireDatabase();const page=parsePositiveInt(query.page,1,100000);const limit=parsePositiveInt(query.limit,20,100);const offset=(page-1)*limit;const params=[];let where="WHERE fr.status IN ('APPROVED','REJECTED')";
  const status=String(query.status||'').trim().toUpperCase();if(['APPROVED','REJECTED'].includes(status)){where+=' AND fr.status=?';params.push(status);}
  if(query.department_id){where+=' AND r.department_id=?';params.push(Number(query.department_id));}
  if(query.purpose_id){where+=' AND r.request_purpose_id=?';params.push(Number(query.purpose_id));}
  if(query.return_type){where+=' AND r.purpose_return_type=?';params.push(String(query.return_type).trim().toUpperCase());}
  if(query.date_from){where+=' AND DATE(fr.reviewed_at)>=?';params.push(normalizeDate(query.date_from,'date_from',true));}
  if(query.date_to){where+=' AND DATE(fr.reviewed_at)<=?';params.push(normalizeDate(query.date_to,'date_to',true));}
  if(query.search){const s=`%${String(query.search).trim()}%`;where+=' AND (r.request_number LIKE ? OR r.requester_name LIKE ? OR r.request_purpose_name LIKE ? OR r.target_department_name LIKE ?)';params.push(s,s,s,s);}
  const sortOrder=String(query.sort_order||'').trim().toUpperCase()==='ASC'?'ASC':'DESC';
  const [countRows]=await db.query(`SELECT COUNT(*) AS total FROM finance_reviews fr INNER JOIN requests r ON r.id=fr.request_id ${where}`,params);
  const [rows]=await db.query(`
    SELECT fr.id AS finance_review_id,fr.status AS finance_review_status,fr.reviewer_name,fr.reviewed_at,fr.note AS review_note,
           r.id AS request_id,r.request_number,r.request_purpose_name,r.purpose_return_type,r.requester_name,r.department_name,r.target_department_name,r.reason,r.submitted_at,r.status AS request_status,
           (SELECT COALESCE(SUM(fri.approved_qty),0) FROM finance_review_items fri WHERE fri.finance_review_id=fr.id) AS total_approved_qty,
           (SELECT COALESCE(SUM(fri.rejected_qty),0) FROM finance_review_items fri WHERE fri.finance_review_id=fr.id) AS total_rejected_qty
    FROM finance_reviews fr INNER JOIN requests r ON r.id=fr.request_id
    ${where}
    ORDER BY fr.reviewed_at ${sortOrder} LIMIT ? OFFSET ?
  `,[...params,limit,offset]);
  const total=Number(countRows[0]?.total||0);return{data:rows,meta:{page,limit,total,totalPages:Math.max(1,Math.ceil(total/limit))}};
}

async function show(user, requestId){await AccessService.requireModuleAccess(user,'FINANCE');return RequestService.getById(requestId,user);}

async function review(user, requestId, payload={}){
  const db=requireDatabase();const c=await db.getConnection();
  try{
    await c.beginTransaction();await AccessService.requireModuleAccess(user,'FINANCE',c);
    const [reviewRows]=await c.query(`SELECT fr.*,r.status AS request_status FROM finance_reviews fr INNER JOIN requests r ON r.id=fr.request_id WHERE fr.request_id=? LIMIT 1 FOR UPDATE`,[requestId]);
    const reviewRow=reviewRows[0];if(!reviewRow)throw createError('Finance review not found',404,'FINANCE_REVIEW_NOT_FOUND');
    if(reviewRow.status!=='PENDING'||reviewRow.request_status!=='PENDING_FINANCE_REVIEW')throw createError('Finance review is not pending',409,'FINANCE_REVIEW_NOT_PENDING');
    const decisions=Array.isArray(payload.items)?payload.items:[];
    const [itemRows]=await c.query(`SELECT fri.id AS finance_review_item_id,fri.request_item_id,fri.requested_qty_snapshot FROM finance_review_items fri WHERE fri.finance_review_id=? ORDER BY fri.id ASC`,[reviewRow.id]);
    if(!itemRows.length)throw createError('Finance review has no items',409,'FINANCE_REVIEW_ITEMS_MISSING');
    const byRequestItemId=new Map(decisions.map(row=>[Number(row.request_item_id),row]));let totalApproved=0;let totalRejected=0;
    for(const row of itemRows){
      const input=byRequestItemId.get(Number(row.request_item_id));if(!input)throw createError(`Decision is required for request item ${row.request_item_id}`,422,'FINANCE_DECISION_REQUIRED');
      const decision=String(input.decision||'').trim().toUpperCase();if(!['APPROVED','REJECTED'].includes(decision))throw createError('Finance item decision must be APPROVED or REJECTED',422,'FINANCE_DECISION_INVALID');
      const requestedQty=Number(row.requested_qty_snapshot||0);let approvedQty=0;let rejectedQty=requestedQty;const note=optionalText(input.note??input.reason,500);
      if(decision==='APPROVED'){
        approvedQty=nonNegativeNumber(input.approved_qty,'approved_qty');
        if(approvedQty<=0||approvedQty>requestedQty)throw createError('approved_qty must be greater than 0 and not exceed requested_qty',422,'FINANCE_APPROVED_QTY_INVALID');
        rejectedQty=Math.max(0,requestedQty-approvedQty);
      }
      totalApproved+=approvedQty;totalRejected+=rejectedQty;
      await c.query('UPDATE finance_review_items SET decision=?,approved_qty=?,rejected_qty=?,note=? WHERE id=?',[decision,approvedQty,rejectedQty,note,row.finance_review_item_id]);
    }
    const overall=totalApproved>0?'APPROVED':'REJECTED';const actor=UserUtil.snapshot(user);const note=optionalText(payload.note,5000);
    await c.query(`UPDATE finance_reviews SET status=?,reviewer_user_id=?,reviewer_internal_id=?,reviewer_name=?,note=?,reviewed_at=NOW() WHERE id=?`,[overall,actor.user_id,actor.internal_id,actor.name,note,reviewRow.id]);
    let fulfillmentId=null;
    if(overall==='APPROVED')fulfillmentId=await WarehouseService.createFromFinance(c,requestId,actor);
    else await c.query("UPDATE requests SET status='REJECTED',completed_at=NOW() WHERE id=?",[requestId]);
    await ActivityService.log(c,{request_id:requestId,entity_type:'FINANCE_REVIEW',entity_id:reviewRow.id,action_code:overall==='APPROVED'?'FINANCE_REVIEW_APPROVED':'FINANCE_REVIEW_REJECTED',actor_user_id:actor.user_id,actor_name:actor.name,before:{status:'PENDING_FINANCE_REVIEW'},after:{finance_status:overall,request_status:overall==='APPROVED'?'PICKING':'REJECTED',total_approved_qty:totalApproved,total_rejected_qty:totalRejected,fulfillment_id:fulfillmentId}});
    await c.commit();return RequestService.getById(requestId,user);
  }catch(e){await c.rollback();throw e;}finally{c.release();}
}

async function exportRequests(user,query={}){return ReportService.exportFinanceRequests(user,query);}

module.exports={listQueue,listHistory,show,review,exportRequests};
