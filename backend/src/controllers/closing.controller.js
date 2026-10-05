const R=require('../utils/response.util');
const ClosingService=require('../services/closing.service');
async function periods(req,res,next){try{const r=await ClosingService.listPeriods(req.user,req.query);return R.paginated(res,r.data,r.meta,'Financial periods loaded');}catch(e){return next(e);}}
async function createPeriod(req,res,next){try{return R.created(res,await ClosingService.createPeriod(req.user,req.body),'Financial period created');}catch(e){return next(e);}}
async function showPeriod(req,res,next){try{return R.ok(res,await ClosingService.getPeriod(req.user,req.params.id),'Financial period loaded');}catch(e){return next(e);}}
async function startClosing(req,res,next){try{return R.ok(res,await ClosingService.startClosing(req.user,req.params.id),'Financial closing started');}catch(e){return next(e);}}
async function generateBatch(req,res,next){try{return R.created(res,await ClosingService.generateBatch(req.user,req.params.id,req.body),'Inventory Adjustment batch generated');}catch(e){return next(e);}}
async function closePeriod(req,res,next){try{return R.ok(res,await ClosingService.closePeriod(req.user,req.params.id),'Financial period closed');}catch(e){return next(e);}}
async function showBatch(req,res,next){try{return R.ok(res,await ClosingService.getBatch(req.user,req.params.id),'Inventory Adjustment batch loaded');}catch(e){return next(e);}}
async function postBatch(req,res,next){try{return R.ok(res,await ClosingService.postBatch(req.user,req.params.id,req.body),'Inventory Adjustment batch posted');}catch(e){return next(e);}}
module.exports={periods,createPeriod,showPeriod,startClosing,generateBatch,closePeriod,showBatch,postBatch};
