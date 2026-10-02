const express = require('express');
const config = require('../config');
const ItemController = require('../controllers/item.controller');
const { authenticate, requireApp } = require('../middleware/auth.middleware');

const router = express.Router();

router.get(
  '/items',
  authenticate,
  requireApp(config.app.slug),
  ItemController.index
);

router.get(
  '/items/:id',
  authenticate,
  requireApp(config.app.slug),
  ItemController.show
);

module.exports = router;
