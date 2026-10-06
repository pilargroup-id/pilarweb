const R = require('../utils/response.util');
const WarehouseService = require('../services/warehouse.service');
async function index(req,res,next){try{const r=await WarehouseService.listQueue(req.user,req.query);return R.paginated(res,r.data,r.meta,'Warehouse queue loaded');}catch(e){return next(e);}}
async function show(req,res,next){try{return R.ok(res,await WarehouseService.show(req.user,req.params.requestId),'Warehouse request loaded');}catch(e){return next(e);}}
async function accept(req,res,next){try{return R.created(res,await WarehouseService.accept(req.user,req.params.requestId),'Warehouse fulfillment created');}catch(e){return next(e);}}
async function print(req,res,next){try{return R.ok(res,await WarehouseService.recordPrint(req.user,req.params.fulfillmentId),'Print event recorded');}catch(e){return next(e);}}
async function updateItem(req,res,next){try{return R.ok(res,await WarehouseService.updateItem(req.user,req.params.fulfillmentId,req.params.fulfillmentItemId,req.body),'Actual quantity updated');}catch(e){return next(e);}}
async function confirmPicking(req,res,next){try{return R.ok(res,await WarehouseService.confirmPicking(req.user,req.params.fulfillmentId),'Picking confirmed');}catch(e){return next(e);}}
async function addTransfer(req,res,next){try{return R.created(res,await WarehouseService.addInventoryTransfer(req.user,req.params.fulfillmentId,req.body),'Inventory Transfer recorded');}catch(e){return next(e);}}
async function updateTransfer(req,res,next){try{return R.ok(res,await WarehouseService.updateInventoryTransfer(req.user,req.params.transferId,req.body),'Inventory Transfer updated');}catch(e){return next(e);}}
async function deleteTransfer(req,res,next){try{return R.ok(res,await WarehouseService.deleteInventoryTransfer(req.user,req.params.transferId),'Inventory Transfer deleted');}catch(e){return next(e);}}
async function handover(req,res,next){try{return R.created(res,await WarehouseService.handover(req.user,req.params.fulfillmentId,req.body),'Goods handed over');}catch(e){return next(e);}}
async function receive(req,res,next){try{return R.ok(res,await WarehouseService.receiveHandover(req.user,req.params.handoverId,req.body),'Goods receipt confirmed');}catch(e){return next(e);}}
module.exports={index,show,accept,print,updateItem,confirmPicking,addTransfer,updateTransfer,deleteTransfer,handover,receive};
