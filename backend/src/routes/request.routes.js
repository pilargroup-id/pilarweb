const express = require('express');
const config = require('../config');
const RequestController = require('../controllers/request.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate, requireApp(config.app.slug));

router.get('/', RequestController.index);
router.get('/:id', RequestController.show);
router.post('/', RequestController.create);

module.exports = router;
