const R = require('../utils/response.util');
const MasterService = require('../services/master.service');

async function requestPurposes(req,res,next){try{return R.ok(res,await MasterService.getRequestPurposes(),'Request purposes loaded');}catch(e){return next(e);}}
async function workflows(req,res,next){try{return R.ok(res,await MasterService.getWorkflowDefinitions(),'Workflows loaded');}catch(e){return next(e);}}
async function purposeWorkflowAssignments(req,res,next){try{return R.ok(res,await MasterService.getPurposeWorkflowAssignments(),'Purpose workflow assignments loaded');}catch(e){return next(e);}}
async function approvalRules(req,res,next){try{return R.ok(res,await MasterService.getApprovalRules(req.query.department_id),'Approval rules loaded');}catch(e){return next(e);}}
async function warehouseLocations(req,res,next){try{return R.ok(res,await MasterService.getWarehouseLocations(),'Warehouse locations loaded');}catch(e){return next(e);}}
async function financialClosing(req,res,next){try{return R.ok(res,await MasterService.getFinancialClosingSetting(),'Financial closing setting loaded');}catch(e){return next(e);}}
async function moduleAccessRules(req,res,next){try{return R.ok(res,await MasterService.getModuleAccessRules(),'Module access rules loaded');}catch(e){return next(e);}}
async function bootstrap(req,res,next){try{return R.ok(res,await MasterService.getBootstrap(),'Pilarweb master data loaded');}catch(e){return next(e);}}
async function assignPurposeWorkflow(req,res,next){try{return R.created(res,await MasterService.assignPurposeWorkflow(req.user,req.body),'Purpose workflow assigned');}catch(e){return next(e);}}
async function createApprovalRule(req,res,next){try{return R.created(res,await MasterService.saveApprovalRule(req.user,null,req.body),'Approval rule created');}catch(e){return next(e);}}
async function updateApprovalRule(req,res,next){try{return R.ok(res,await MasterService.saveApprovalRule(req.user,req.params.id,req.body),'Approval rule updated');}catch(e){return next(e);}}
async function updateFinancialClosing(req,res,next){try{return R.ok(res,await MasterService.updateFinancialClosing(req.user,req.body),'Financial closing setting updated');}catch(e){return next(e);}}
async function createModuleAccessRule(req,res,next){try{return R.created(res,await MasterService.saveModuleAccessRule(req.user,null,req.body),'Module access rule created');}catch(e){return next(e);}}
async function updateModuleAccessRule(req,res,next){try{return R.ok(res,await MasterService.saveModuleAccessRule(req.user,req.params.id,req.body),'Module access rule updated');}catch(e){return next(e);}}
async function createRequestPurpose(req,res,next){try{return R.created(res,await MasterService.saveRequestPurpose(req.user,null,req.body),'Request purpose created');}catch(e){return next(e);}}
async function updateRequestPurpose(req,res,next){try{return R.ok(res,await MasterService.saveRequestPurpose(req.user,req.params.id,req.body),'Request purpose updated');}catch(e){return next(e);}}
async function deleteRequestPurpose(req,res,next){try{return R.ok(res,await MasterService.deleteRequestPurpose(req.user,req.params.id),'Request purpose deleted');}catch(e){return next(e);}}
module.exports={requestPurposes,workflows,purposeWorkflowAssignments,approvalRules,warehouseLocations,financialClosing,moduleAccessRules,bootstrap,assignPurposeWorkflow,createApprovalRule,updateApprovalRule,updateFinancialClosing,createModuleAccessRule,updateModuleAccessRule,createRequestPurpose,updateRequestPurpose,deleteRequestPurpose};
