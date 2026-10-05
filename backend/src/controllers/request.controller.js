const R = require('../utils/response.util');
const RequestService = require('../services/request.service');

async function create(req, res, next) {
  try {
    const data = await RequestService.createRequest(req.user, req.body);
    return R.created(res, data, 'Request created');
  } catch (err) {
    return next(err);
  }
}

async function index(req, res, next) {
  try {
    const { rows, meta } = await RequestService.listMyRequests(req.user, req.query);
    return R.paginated(res, rows, meta, 'Requests loaded');
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const data = await RequestService.getRequestById(req.params.id, req.user);
    if (!data) return R.notFound(res, 'Request not found');
    return R.ok(res, data, 'Request loaded');
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  create,
  index,
  show,
};
