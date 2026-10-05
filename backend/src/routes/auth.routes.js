const express = require('express');
const config = require('../config');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

router.get('/me', authenticate, AuthController.me);
router.get('/capabilities', authenticate, requireApp(config.app.slug), AuthController.capabilities);

module.exports = router;
