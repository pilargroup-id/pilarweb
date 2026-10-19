const R=require('../utils/response.util');
const FinanceService=require('../services/finance.service');
async function index(req,res,next){try{const r=await FinanceService.listQueue(req.user,req.query);return R.paginated(res,r.data,r.meta,'Finance queue loaded');}catch(e){return next(e);}}
async function history(req,res,next){try{const r=await FinanceService.listHistory(req.user,req.query);return R.paginated(res,r.data,r.meta,'Finance history loaded');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await FinanceService.show(req.user,req.params.requestId),'Finance request loaded');}catch(e){return next(e);}}
async function review(req,res,next){try{return R.ok(res,await FinanceService.review(req.user,req.params.requestId,req.body),'Finance review saved');}catch(e){return next(e);}}
async function exportRequests(req,res,next){try{const r=await FinanceService.exportRequests(req.user,req.query);res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');res.setHeader('Content-Disposition',`attachment; filename="${r.filename}"`);res.setHeader('X-Report-Row-Count',String(r.row_count));return res.status(200).send(r.buffer);}catch(e){return next(e);}}
module.exports={index,history,show,review,exportRequests};
