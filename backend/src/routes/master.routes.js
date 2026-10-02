const express = require('express');
const config = require('../config');
const MasterController = require('../controllers/master.controller');
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

module.exports = router;
