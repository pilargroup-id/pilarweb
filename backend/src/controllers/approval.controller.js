const R = require('../utils/response.util');
const ApprovalService = require('../services/approval.service');

async function index(req,res,next){try{const r=await ApprovalService.listQueue(req.user,req.query);return R.paginated(res,r.data,r.meta,'Approval queue loaded');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await ApprovalService.getById(req.user,req.params.id),'Approval loaded');}catch(e){return next(e);}}
async function approve(req,res,next){try{return R.ok(res,await ApprovalService.approve(req.user,req.params.id,req.body),'Request approved');}catch(e){return next(e);}}
async function revert(req,res,next){try{return R.ok(res,await ApprovalService.revert(req.user,req.params.id,req.body),'Request reverted to requester');}catch(e){return next(e);}}
async function cancel(req,res,next){try{return R.ok(res,await ApprovalService.cancel(req.user,req.params.id,req.body),'Request canceled');}catch(e){return next(e);}}

module.exports = { index, show, approve, revert, cancel };
