const R = require('../utils/response.util');
const RequestService = require('../services/request.service');
const { requireDatabase } = require('../config/database.config');
const ActivityService = require('../services/activity.service');
const { optionalText, createError } = require('../utils/business.util');

async function create(req, res, next) {
  try {
    return R.created(res, await RequestService.create(req.user, req.body), 'Request created');
  } catch (err) { return next(err); }
}

async function mine(req, res, next) {
  try {
    const result = await RequestService.listMine(req.user, req.query);
    return R.paginated(res, result.data, result.meta, 'My requests loaded');
  } catch (err) { return next(err); }
}

async function show(req, res, next) {
  try {
    return R.ok(res, await RequestService.getById(req.params.id, req.user), 'Request loaded');
  } catch (err) { return next(err); }
}

async function update(req, res, next) {
  try {
    return R.ok(res, await RequestService.update(req.user, req.params.id, req.body), 'Request updated');
  } catch (err) { return next(err); }
}

async function addItem(req, res, next) {
  try {
    return R.created(res, await RequestService.addItem(req.user, req.params.id, req.body), 'Request item added');
  } catch (err) { return next(err); }
}

async function updateItem(req, res, next) {
  try {
    return R.ok(res, await RequestService.updateItem(req.user, req.params.id, req.params.itemId, req.body), 'Request item updated');
  } catch (err) { return next(err); }
}

async function removeItem(req, res, next) {
  try {
    return R.ok(res, await RequestService.removeItem(req.user, req.params.id, req.params.itemId), 'Request item removed');
  } catch (err) { return next(err); }
}

async function cancelItem(req, res, next) {
  try {
    return R.ok(
      res,
      await RequestService.cancelItem(req.user, req.params.id, req.params.itemId, req.body),
      'Request item canceled'
    );
  } catch (err) { return next(err); }
}

async function submit(req, res, next) {
  try {
    return R.ok(res, await RequestService.submit(req.user, req.params.id), 'Request submitted');
  } catch (err) { return next(err); }
}

async function cancel(req, res, next) {
  try {
    return R.ok(res, await RequestService.cancel(req.user, req.params.id), 'Request canceled');
  } catch (err) { return next(err); }
}

async function recentActivity(req, res, next) {
  try {
    const result = await ActivityService.listRecent(req.user, req.query);
    return R.paginated(res, result.data, result.meta, 'Recent activity loaded');
  } catch (err) { return next(err); }
}

async function activities(req, res, next) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    const [rows] = await connection.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [req.params.id]);
    if (!rows[0]) throw createError('Request not found', 404, 'REQUEST_NOT_FOUND');
    if (!(await RequestService.canViewRequest(connection, req.user, rows[0]))) {
      throw createError('Request is not accessible', 403, 'REQUEST_ACCESS_FORBIDDEN');
    }
    return R.ok(res, await ActivityService.listByRequest(connection, req.params.id), 'Request activity loaded');
  } catch (err) { return next(err); }
  finally { connection.release(); }
}

async function comments(req, res, next) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    const [requests] = await connection.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [req.params.id]);
    if (!requests[0]) throw createError('Request not found', 404, 'REQUEST_NOT_FOUND');
    if (!(await RequestService.canViewRequest(connection, req.user, requests[0]))) {
      throw createError('Request is not accessible', 403, 'REQUEST_ACCESS_FORBIDDEN');
    }
    const [rows] = await connection.query(
      'SELECT * FROM request_comments WHERE request_id = ? ORDER BY created_at ASC, id ASC',
      [req.params.id]
    );
    return R.ok(res, rows, 'Request comments loaded');
  } catch (err) { return next(err); }
  finally { connection.release(); }
}

async function addComment(req, res, next) {
  const db = requireDatabase();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [requests] = await connection.query('SELECT * FROM requests WHERE id = ? LIMIT 1', [req.params.id]);
    if (!requests[0]) throw createError('Request not found', 404, 'REQUEST_NOT_FOUND');
    if (!(await RequestService.canViewRequest(connection, req.user, requests[0]))) {
      throw createError('Request is not accessible', 403, 'REQUEST_ACCESS_FORBIDDEN');
    }
    const commentText = optionalText(req.body?.comment_text, 10000);
    if (!commentText) throw createError('comment_text is required', 422, 'VALIDATION_ERROR');
    const [result] = await connection.query(`
      INSERT INTO request_comments (request_id, comment_text, created_by_user_id, created_by_name)
      VALUES (?, ?, ?, ?)
    `, [req.params.id, commentText, req.user.id, req.user.name]);
    await ActivityService.log(connection, {
      request_id: req.params.id,
      entity_type: 'COMMENT',
      entity_id: result.insertId,
      action_code: 'COMMENT_ADDED',
      actor_user_id: req.user.id,
      actor_name: req.user.name,
    });
    await connection.commit();
    return R.created(res, { id: result.insertId, comment_text: commentText }, 'Comment added');
  } catch (err) {
    await connection.rollback();
    return next(err);
  } finally { connection.release(); }
}

module.exports = {
  create,
  mine,
  show,
  update,
  addItem,
  updateItem,
  removeItem,
  cancelItem,
  submit,
  cancel,
  recentActivity,
  activities,
  comments,
  addComment,
};
