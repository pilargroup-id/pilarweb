const express = require('express');
const config = require('../config');
const ReportController = require('../controllers/report.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate, requireApp(config.app.slug));
router.get('/requests', ReportController.requests);

module.exports = router;
