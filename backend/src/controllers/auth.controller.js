const R = require('../utils/response.util');
const AccessService = require('../services/access.service');

async function me(req, res) {
  return R.ok(res, req.user, 'Authenticated');
}

async function capabilities(req, res, next) {
  try {
    return R.ok(res, await AccessService.getCapabilities(req.user), 'Capabilities loaded');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  me,
  capabilities,
};
