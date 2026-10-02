const express = require('express');

const router = express.Router();

router.use('/auth', require('./auth.routes'));
router.use('/item', require('./item.routes'));
router.use('/master', require('./master.routes'));

module.exports = router;
