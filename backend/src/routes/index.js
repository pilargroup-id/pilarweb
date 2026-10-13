const express = require('express');

const router = express.Router();
router.use('/auth', require('./auth.routes'));
router.use('/item', require('./item.routes'));
router.use('/master', require('./master.routes'));
router.use('/requests', require('./request.routes'));
router.use('/approvals', require('./approval.routes'));
router.use('/finance', require('./finance.routes'));
router.use('/warehouse', require('./warehouse.routes'));
router.use('/reports', require('./report.routes'));
router.use('/financial-closing', require('./closing.routes'));

module.exports = router;
