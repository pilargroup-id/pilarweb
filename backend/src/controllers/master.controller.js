const R = require('../utils/response.util');
const MasterService = require('../services/master.service');

async function requestPurposes(req, res, next) {
  try {
    return R.ok(res, await MasterService.getRequestPurposes(), 'Request purposes loaded');
  } catch (err) {
    return next(err);
  }
}

async function workflows(req, res, next) {
  try {
    return R.ok(res, await MasterService.getWorkflowDefinitions(), 'Workflows loaded');
  } catch (err) {
    return next(err);
  }
}

async function purposeWorkflowAssignments(req, res, next) {
  try {
    return R.ok(
      res,
      await MasterService.getPurposeWorkflowAssignments(),
      'Purpose workflow assignments loaded'
    );
  } catch (err) {
    return next(err);
  }
}

async function approvalRules(req, res, next) {
  try {
    return R.ok(
      res,
      await MasterService.getApprovalRules(req.query.department_id),
      'Approval rules loaded'
    );
  } catch (err) {
    return next(err);
  }
}

async function warehouseLocations(req, res, next) {
  try {
    return R.ok(res, await MasterService.getWarehouseLocations(), 'Warehouse locations loaded');
  } catch (err) {
    return next(err);
  }
}

async function financialClosing(req, res, next) {
  try {
    return R.ok(res, await MasterService.getFinancialClosingSetting(), 'Financial closing setting loaded');
  } catch (err) {
    return next(err);
  }
}

async function bootstrap(req, res, next) {
  try {
    return R.ok(res, await MasterService.getBootstrap(), 'Pilarweb master data loaded');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  requestPurposes,
  workflows,
  purposeWorkflowAssignments,
  approvalRules,
  warehouseLocations,
  financialClosing,
  bootstrap,
};
