const mongoose = require('mongoose');
const { Order, Store, Transaction } = require('../models');
const checkout = require('../services/checkout.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { toItem } = require('../utils/orderDto');
const ACTIVE = ['pending_payment', 'confirmed', 'preparing', 'ready_for_pickup'];
const CLOSED = ['completed', 'failed'];
const storeQuery = () => Store.findOne().select('name address phone openingHours').lean();
const ttl = () => (parseInt(process.env.PAYMENT_TTL_MINUTES, 10) || 15) * 60000;
const view = (o) => ({
  ...o, items: (o.items || []).map(toItem),
  itemCount: (o.items || []).reduce((n, i) => n + i.quantity, 0),
  appliedPromotions: o.appliedPromotions || [],
  expiresAt: o.status === 'pending_payment' ? new Date(new Date(o.createdAt).getTime() + ttl()) : null,
  fulfillment: { type: 'pickup', readyAt: o.readyAt || null, pickedUpAt: o.pickedUpAt || null },
});
exports.preview = asyncHandler(async (req, res) => res.json(await checkout.previewCheckout(req.user.id, req.body)));
exports.create = asyncHandler(async (req, res) => {
  const key = req.get('Idempotency-Key') || req.body.idempotencyKey;
  if (key != null && (typeof key !== 'string' || !key.trim() || key.length > 100)) throw new ApiError(400, 'Idempotency-Key không hợp lệ');
  try {
    const result = await checkout.createOrder(req.user.id, { ...req.body, idempotencyKey: key });
    res.status(result.replayed ? 200 : 201).json(result);
  } catch (err) {
    if (err instanceof require('../services/stock.service').InsufficientStockError) throw new ApiError(409, err.message, { code: err.code, productId: err.productId, available: err.available });
    throw err;
  }
});
const date = (v) => {
  if (!v) return null;
  if (typeof v !== 'string' || Number.isNaN(Date.parse(v))) throw new ApiError(400, 'Ngày không hợp lệ');
  return new Date(v);
};
const list = (history) => asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const statuses = history ? CLOSED : req.query.active === '1' ? ACTIVE : [...ACTIVE, ...CLOSED];
  const status = req.query.status;
  if (status && !statuses.includes(status)) throw new ApiError(400, 'Trạng thái không hợp lệ');
  const from = date(req.query.from), to = date(req.query.to);
  if (from && to && from > to) throw new ApiError(400, 'Khoảng ngày không hợp lệ');
  const base = { customerId: new mongoose.Types.ObjectId(req.user.id) };
  if (from || to) base.createdAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  const filter = { ...base, status: status || { $in: statuses } };
  const [docs, total, grouped, store] = await Promise.all([
    Order.find(filter).populate('items.productId', 'images unit').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Order.countDocuments(filter),
    Order.aggregate([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 }, amount: { $sum: '$totalAmount' } } }]),
    storeQuery(),
  ]);
  const counts = Object.fromEntries([...ACTIVE, ...CLOSED].map((s) => [s, 0]));
  grouped.forEach((g) => { counts[g._id] = g.n; });
  counts.all = statuses.reduce((n, s) => n + counts[s], 0);
  res.json({ items: docs.map(view), total, page, limit, counts, store,
    summary: { completedCount: counts.completed, totalSpent: grouped.find((g) => g._id === 'completed')?.amount || 0 } });
});
exports.list = list(false);
exports.history = list(true);
exports.detail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(404, 'Không tìm thấy đơn hàng');
  await require('../services/payment.service').expireStaleOrders({ customerId: req.user.id });
  const o = await Order.findOne({ _id: req.params.id, customerId: req.user.id }).populate('items.productId', 'images unit').lean();
  if (!o) throw new ApiError(404, 'Không tìm thấy đơn hàng');
  const [store, transactions] = await Promise.all([
    storeQuery(), Transaction.find({ orderId: o._id }).select('method amount status paidAt createdAt failureReason').sort({ createdAt: -1 }).lean(),
  ]);
  res.json({ ...view(o), store, transactions, latestPayment: transactions[0] || null, serverTime: new Date() });
});
