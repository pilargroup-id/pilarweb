const R = require('../utils/response.util');
const DirectoryService = require('../services/directory.service');

async function jobLevels(req, res, next) {
  try {
    return R.ok(res, await DirectoryService.getJobLevels(req.accessToken), 'Job levels loaded');
  } catch (e) {
    return next(e);
  }
}

async function departments(req, res, next) {
  try {
    return R.ok(res, await DirectoryService.getDepartments(req.accessToken), 'Departments loaded');
  } catch (e) {
    return next(e);
  }
}

module.exports = { jobLevels, departments };
