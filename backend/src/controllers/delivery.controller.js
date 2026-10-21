const R=require('../utils/response.util');
const DeliveryService=require('../services/delivery.service');
async function mine(req,res,next){try{const r=await DeliveryService.listMine(req.user,req.query);return R.paginated(res,r.data,r.meta,'Delivery receipts loaded');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await DeliveryService.getById(req.user,req.params.id),'Delivery receipt loaded');}catch(e){return next(e);}}
async function confirm(req,res,next){try{return R.ok(res,await DeliveryService.confirm(req.user,req.params.id,req.body),'Physical receipt confirmed');}catch(e){return next(e);}}
module.exports={mine,show,confirm};
