const R = require('../utils/response.util');
const WarehouseService = require('../services/warehouse.service');

async function fulfillments(req,res,next){try{const r=await WarehouseService.listFulfillments(req.user,req.query);return R.paginated(res,r.data,r.meta,'Fulfillments loaded');}catch(e){return next(e);}}
async function showFulfillment(req,res,next){try{return R.ok(res,await WarehouseService.showFulfillment(req.user,req.params.fulfillmentId),'Fulfillment loaded');}catch(e){return next(e);}}
async function printPicking(req,res,next){try{return R.ok(res,await WarehouseService.recordPickingPrint(req.user,req.params.fulfillmentId),'Picking form print recorded');}catch(e){return next(e);}}
async function saveProgress(req,res,next){try{return R.ok(res,await WarehouseService.saveProgress(req.user,req.params.fulfillmentId,req.body),'Picking progress saved');}catch(e){return next(e);}}
async function completePicking(req,res,next){try{return R.ok(res,await WarehouseService.completePicking(req.user,req.params.fulfillmentId,req.body),'Picking completed');}catch(e){return next(e);}}
async function printDo(req,res,next){try{return R.ok(res,await WarehouseService.printDeliveryOrder(req.user,req.params.fulfillmentId,req.body),'Delivery Order print recorded');}catch(e){return next(e);}}
async function handovers(req,res,next){try{const r=await WarehouseService.listHandovers(req.user,req.query);return R.paginated(res,r.data,r.meta,'Handovers loaded');}catch(e){return next(e);}}

module.exports = { fulfillments, showFulfillment, printPicking, saveProgress, completePicking, printDo, handovers };
