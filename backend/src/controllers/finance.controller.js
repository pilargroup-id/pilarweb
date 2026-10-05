const R = require('../utils/response.util');
const FinanceService = require('../services/finance.service');
async function index(req,res,next){try{const r=await FinanceService.listQueue(req.user,req.query);return R.paginated(res,r.data,r.meta,'Finance queue loaded');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await FinanceService.show(req.user,req.params.requestId),'Finance request loaded');}catch(e){return next(e);}}
async function review(req,res,next){try{return R.ok(res,await FinanceService.review(req.user,req.params.requestId,req.body),'Finance review saved');}catch(e){return next(e);}}
module.exports={index,show,review};
