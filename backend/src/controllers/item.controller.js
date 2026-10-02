const ItembaseService = require('../services/itembase.service');

async function index(req, res, next) {
  try {
    const body = await ItembaseService.getRegularItems(req.query);

    // Preserve Itembase response contract for the frontend.
    return res.status(200).json(body);
  } catch (err) {
    return next(err);
  }
}

async function show(req, res, next) {
  try {
    const body = await ItembaseService.getItemById(req.params.id);

    // Preserve Itembase response contract for the frontend.
    return res.status(200).json(body);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  index,
  show,
};
