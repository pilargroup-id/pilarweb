const R = require('../utils/response.util');
const ApprovalService = require('../services/approval.service');

async function index(req, res, next) {
  try {
    const result = await ApprovalService.listQueue(req.user, req.query);
    return R.paginated(res, result.data, result.meta, 'Approval queue loaded');
  } catch (err) { return next(err); }
}
async function show(req, res, next) {
  try { return R.ok(res, await ApprovalService.getById(req.user, req.params.id), 'Approval loaded'); }
  catch (err) { return next(err); }
}
async function approve(req, res, next) {
  try { return R.ok(res, await ApprovalService.decide(req.user, req.params.id, 'APPROVED', req.body), 'Request approved'); }
  catch (err) { return next(err); }
}
async function reject(req, res, next) {
  try { return R.ok(res, await ApprovalService.decide(req.user, req.params.id, 'REJECTED', req.body), 'Request rejected'); }
  catch (err) { return next(err); }
}
module.exports = { index, show, approve, reject };
