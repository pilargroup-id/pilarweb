const express = require('express');
const config = require('../config');
const DirectoryController = require('../controllers/directory.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

const router = express.Router();
router.use(authenticate, requireApp(config.app.slug));

router.get('/directory/departments', DirectoryController.departments);
router.get('/directory/users', DirectoryController.users);

module.exports = router;
