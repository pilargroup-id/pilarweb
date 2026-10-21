const R=require('../utils/response.util');
const WarehouseService=require('../services/warehouse.service');
const DeliveryService=require('../services/delivery.service');
async function fulfillments(req,res,next){try{const r=await WarehouseService.listFulfillments(req.user,req.query);return R.paginated(res,r.data,r.meta,'Fulfillments loaded');}catch(e){return next(e);}}
async function showFulfillment(req,res,next){try{return R.ok(res,await WarehouseService.showFulfillment(req.user,req.params.fulfillmentId),'Fulfillment loaded');}catch(e){return next(e);}}
async function printPicking(req,res,next){try{return R.ok(res,await WarehouseService.printPicking(req.user,req.params.fulfillmentId),'Picking form print recorded');}catch(e){return next(e);}}
async function saveProgress(req,res,next){try{return R.ok(res,await WarehouseService.saveProgress(req.user,req.params.fulfillmentId,req.body),'Fulfillment progress saved');}catch(e){return next(e);}}
async function complete(req,res,next){try{return R.ok(res,await WarehouseService.complete(req.user,req.params.fulfillmentId,req.body),'Fulfillment completed');}catch(e){return next(e);}}
async function printDo(req,res,next){try{return R.ok(res,await WarehouseService.printDo(req.user,req.params.fulfillmentId,req.body),'DO printed and shipment dispatched');}catch(e){return next(e);}}
async function discrepancies(req,res,next){try{const r=await DeliveryService.listDiscrepancies(req.user,req.query);return R.paginated(res,r.data,r.meta,'Delivery discrepancies loaded');}catch(e){return next(e);}}
async function resolveDiscrepancy(req,res,next){try{return R.ok(res,await DeliveryService.resolveDiscrepancy(req.user,req.params.id,req.body),'Delivery discrepancy resolved');}catch(e){return next(e);}}
module.exports={fulfillments,showFulfillment,printPicking,saveProgress,complete,printDo,discrepancies,resolveDiscrepancy};
