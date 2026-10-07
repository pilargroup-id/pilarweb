const express = require('express');
const config = require('../config');
const RequestController = require('../controllers/request.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate, requireApp(config.app.slug));

router.get('/', RequestController.mine);
router.get('/my', RequestController.mine);
router.get('/activity/recent', RequestController.recentActivity);
router.post('/', RequestController.create);
router.get('/:id', RequestController.show);
router.put('/:id', RequestController.update);
router.post('/:id/submit', RequestController.submit);
router.post('/:id/items', RequestController.addItem);
router.put('/:id/items/:itemId', RequestController.updateItem);
router.delete('/:id/items/:itemId', RequestController.removeItem);
router.post('/:id/items/:itemId/cancel', RequestController.cancelItem);
router.get('/:id/activity', RequestController.activities);
router.get('/:id/comments', RequestController.comments);
router.post('/:id/comments', RequestController.addComment);

module.exports = router;
