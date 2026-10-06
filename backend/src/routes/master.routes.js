const express = require('express');
const config = require('../config');
const MasterController = require('../controllers/master.controller');
const AccessService = require('../services/access.service');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate, requireApp(config.app.slug));

router.get('/bootstrap', MasterController.bootstrap);
router.get('/request-purposes', MasterController.requestPurposes);
router.get('/workflows', MasterController.workflows);
router.get('/purpose-workflows', MasterController.purposeWorkflowAssignments);
router.get('/approval-rules', MasterController.approvalRules);
router.get('/warehouse-locations', MasterController.warehouseLocations);
router.get('/financial-closing', MasterController.financialClosing);

async function requireAdmin(req,res,next){
  try{await AccessService.requireModuleAccess(req.user,'ADMIN');return next();}
  catch(err){return next(err);}
}

router.get('/module-access-rules', requireAdmin, MasterController.moduleAccessRules);
router.post('/purpose-workflows', requireAdmin, MasterController.assignPurposeWorkflow);
router.post('/approval-rules', requireAdmin, MasterController.createApprovalRule);
router.put('/approval-rules/:id', requireAdmin, MasterController.updateApprovalRule);
router.put('/financial-closing', requireAdmin, MasterController.updateFinancialClosing);
router.post('/module-access-rules', requireAdmin, MasterController.createModuleAccessRule);
router.put('/module-access-rules/:id', requireAdmin, MasterController.updateModuleAccessRule);
router.post('/request-purposes', requireAdmin, MasterController.createRequestPurpose);
router.put('/request-purposes/:id', requireAdmin, MasterController.updateRequestPurpose);
router.delete('/request-purposes/:id', requireAdmin, MasterController.deleteRequestPurpose);

module.exports = router;
