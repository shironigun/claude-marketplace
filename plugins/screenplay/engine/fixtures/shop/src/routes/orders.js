const express = require('express');

const router = express.Router();

function listOrders(req, res) {
  res.json(req.app.locals.orders);
}

function getOrder(req, res) {
  res.json(req.app.locals.orders.find((o) => o.id === req.params.id));
}

function approveOrder(req, res) {
  res.json({ ...req.app.locals.orders.find((o) => o.id === req.params.id), status: 'approved' });
}

router.get('/orders', listOrders);
router.post('/orders/:id/approve', approveOrder);
router.get('/orders/:id', getOrder);

module.exports = router;
