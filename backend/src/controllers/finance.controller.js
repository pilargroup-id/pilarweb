const R=require('../utils/response.util');
const FinanceService=require('../services/finance.service');
const InvoiceService=require('../services/invoice.service');
async function index(req,res,next){try{const r=await FinanceService.listQueue(req.user,req.query);return R.paginated(res,r.data,r.meta,'Finance queue loaded');}catch(e){return next(e);}}
async function history(req,res,next){try{const r=await FinanceService.listHistory(req.user,req.query);return R.paginated(res,r.data,r.meta,'Finance history loaded');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await FinanceService.show(req.user,req.params.requestId),'Finance request loaded');}catch(e){return next(e);}}
async function review(req,res,next){try{return R.ok(res,await FinanceService.review(req.user,req.params.requestId,req.body),'Finance review saved');}catch(e){return next(e);}}
async function rejectRequest(req,res,next){try{return R.ok(res,await FinanceService.rejectRequest(req.user,req.params.requestId,req.body),'PB rejected by Finance');}catch(e){return next(e);}}
async function invoiceEligible(req,res,next){try{const r=await InvoiceService.listEligible(req.user,req.query);return R.paginated(res,r.data,r.meta,'Invoice-eligible PB loaded');}catch(e){return next(e);}}
async function invoiceGroups(req,res,next){try{const r=await InvoiceService.listGroups(req.user,req.query);return R.paginated(res,r.data,r.meta,'Invoice groups loaded');}catch(e){return next(e);}}
async function invoiceGroupShow(req,res,next){try{return R.ok(res,await InvoiceService.getGroup(req.user,req.params.id),'Invoice group loaded');}catch(e){return next(e);}}
async function invoiceGroupCreate(req,res,next){try{return R.created(res,await InvoiceService.createGroup(req.user,req.body),'Invoice group created');}catch(e){return next(e);}}
async function invoiceGroupAddRequests(req,res,next){try{return R.ok(res,await InvoiceService.addRequests(req.user,req.params.id,req.body),'PB added to invoice group');}catch(e){return next(e);}}
async function invoiceGroupRemoveRequest(req,res,next){try{return R.ok(res,await InvoiceService.removeRequest(req.user,req.params.id,req.params.requestId,req.body),'PB removed from invoice group');}catch(e){return next(e);}}
async function exportRequests(req,res,next){try{const r=await FinanceService.exportRequests(req.user,req.query);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename="${r.filename}"`);res.setHeader('X-Report-Row-Count',String(r.row_count));return res.status(200).send(r.buffer);}catch(e){return next(e);}}
module.exports={index,history,show,review,rejectRequest,invoiceEligible,invoiceGroups,invoiceGroupShow,invoiceGroupCreate,invoiceGroupAddRequests,invoiceGroupRemoveRequest,exportRequests};
