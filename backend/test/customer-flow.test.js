const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mongoose = require('mongoose');
const request = require('supertest');
process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
process.env.PAYMENT_MOCK = 'true';
const app = require('../src/app');
const M = require('../src/models');
const stock = require('../src/services/stock.service');
const { runAtomic } = require('../src/utils/atomic');
let memory;
const dbName = `convenience_test_${crypto.randomBytes(8).toString('hex')}`;
before(async () => {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    const { MongoMemoryReplSet } = require('mongodb-memory-server');
    memory = await MongoMemoryReplSet.create({ binary: { version: '8.0.17' }, replSet: { count: 1 } });
    uri = memory.getUri();
  }
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 10000 });
  await Promise.all(Object.values(M).map((model) => model.init()));
});
after(async () => {
  if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  if (memory) await memory.stop();
});
const client = (token) => ({
  get: (path) => request(app).get(`/api${path}`).auth(token, { type: 'bearer' }),
  post: (path, body) => request(app).post(`/api${path}`).auth(token, { type: 'bearer' }).send(body),
  put: (path, body) => request(app).put(`/api${path}`).auth(token, { type: 'bearer' }).send(body),
  patch: (path, body) => request(app).patch(`/api${path}`).auth(token, { type: 'bearer' }).send(body),
});
test('shared customer workflow, ownership and inventory integrity', async (t) => {
  let token, otherToken, customerId, product, admin, cashOrder;
  await t.test('register, reject duplicate account, login and authenticate', async () => {
    const data = { fullName: 'Khách kiểm thử', email: 'customer@example.test', password: 'Password@123' };
    const r = await request(app).post('/api/auth/register').send(data).expect(201);
    token = r.body.token; customerId = r.body.user.id;
    assert.equal(r.body.user.role, 'customer');
    await request(app).post('/api/auth/register').send(data).expect(409);
    await request(app).post('/api/auth/login').send({ email: data.email, password: 'wrong' }).expect(401);
    await request(app).post('/api/auth/login').send(data).expect(200);
    await request(app).get('/api/cart').expect(401);
    otherToken = (await request(app).post('/api/auth/register').send({ ...data, email: 'other@example.test' }).expect(201)).body.token;
    const adminAccount = await M.User.create({ fullName: 'Admin', email: 'admin@example.test', passwordHash: 'not-used', role: 'admin' });
    admin = client(require('jsonwebtoken').sign({ id: adminAccount.id, role: 'admin' }, process.env.JWT_SECRET));
    const category = await M.Category.create({ name: 'Đồ uống', slug: 'do-uong' });
    product = await M.Product.create({ name: 'Trà xanh', slug: 'tra-xanh', sku: 'TEA01', categoryId: category.id, price: 12000, stockQuantity: 30, mealType: 'beverage' });
    await M.StockBatch.create({ productId: product.id, receivedQuantity: 30, quantity: 30, expiryDate: new Date(Date.now() + 86400000) });
    await M.Store.create({ name: 'Cửa hàng thử nghiệm', address: '123 Đường thử nghiệm', phone: '0900000000' });
  });
  await t.test('list/search/detail products and hide inactive products', async () => {
    const products = await request(app).get('/api/products?q=Trà').expect(200);
    assert.equal(products.body.items.length, 1);
    await request(app).get(`/api/products/${product.id}`).expect(200);
    await M.Product.updateOne({ _id: product.id }, { status: 'inactive' });
    await request(app).get(`/api/products/${product.id}`).expect(404);
    await M.Product.updateOne({ _id: product.id }, { status: 'active' });
  });
  await t.test('cart quantity validation and removal', async () => {
    await client(token).post('/cart/items', { productId: product.id, quantity: 0 }).expect(400);
    await client(token).post('/cart/items', { productId: product.id, quantity: 31 }).expect(409);
    await client(token).post('/cart/items', { productId: product.id, quantity: 1 }).expect(201);
    await client(token).put(`/cart/items/${product.id}`, { quantity: 2 }).expect(200);
    const cart = await client(token).get('/cart').expect(200);
    assert.equal(cart.body.itemCount, 2); assert.equal(cart.body.subtotal, 24000);
  });
  await t.test('checkout preview and changed price do not alter stock', async () => {
    const preview = await client(token).post('/orders/preview', {}).expect(200);
    assert.equal(preview.body.totalAmount, 24000); assert.equal(preview.body.canCheckout, true);
    await client(token).post('/orders', { paymentMethod: 'cash', expectedTotal: 1 }).expect(409);
    assert.equal((await M.Product.findById(product.id)).stockQuantity, 30);
    assert.equal(await M.Order.countDocuments(), 0);
  });
  await t.test('cash checkout and retry use the same order without double deduction', async () => {
    const payload = { paymentMethod: 'cash', expectedTotal: 24000 };
    const r = await client(token).post('/orders', payload).set('Idempotency-Key', 'cash-order-test-01').expect(201);
    cashOrder = r.body.order._id; assert.equal(r.body.order.status, 'confirmed');
    const replay = await client(token).post('/orders', payload).set('Idempotency-Key', 'cash-order-test-01').expect(200);
    assert.equal(replay.body.order._id, cashOrder); assert.equal(replay.body.replayed, true);
    assert.equal((await M.Product.findById(product.id)).stockQuantity, 28);
    assert.equal((await client(token).get('/cart')).body.items.length, 0);
  });
  await t.test('order details/tracking/history enforce ownership and static route ordering', async () => {
    await client(otherToken).get(`/orders/my/${cashOrder}`).expect(404);
    await client(otherToken).get(`/orders/my/${cashOrder}/tracking`).expect(404);
    const own = await client(token).get(`/orders/my/${cashOrder}/tracking`).expect(200);
    assert.equal(own.body.items[0].name, 'Trà xanh');
    const history = await client(token).get('/orders/my/history').expect(200);
    assert.equal(history.body.total, 0);
    await client(token).get('/orders/my/history?from=invalid').expect(400);
    await client(token).get('/orders/my/history?from=2026-10-10&to=2026-10-01').expect(400);
    assert.equal((await client(token).get('/orders/my')).body.total, 1);
  });
  await t.test('admin completes cash order and customer history returns totals', async () => {
    await client(token).patch(`/orders/${cashOrder}/status`, { status: 'preparing' }).expect(403);
    for (const status of ['preparing', 'ready_for_pickup']) await admin.patch(`/orders/${cashOrder}/status`, { status }).expect(200);
    await admin.patch(`/orders/${cashOrder}/status`, { status: 'completed' }).expect(409);
    await admin.patch(`/orders/${cashOrder}/status`, { status: 'completed', cashCollected: true }).expect(200);
    const history = await client(token).get('/orders/my/history').expect(200);
    assert.equal(history.body.total, 1); assert.equal(history.body.summary.totalSpent, 24000);
    assert.equal((await client(token).get('/orders/my?status=completed').expect(200)).body.total, 1);
    assert.equal((await client(token).get('/orders/my?active=1').expect(200)).body.total, 0);
    assert.equal(await M.Transaction.countDocuments({ orderId: cashOrder, status: 'success', method: 'cash' }), 1);
  });
  await t.test('profile only updates permitted fields and verifies password change', async () => {
    await client(token).put('/profile', { fullName: 'Tên mới', phone: '0901234567', role: 'admin', membership: { points: 9999 } }).expect(200);
    const profile = await client(token).get('/profile').expect(200);
    assert.equal(profile.body.fullName, 'Tên mới'); assert.equal(profile.body.role, 'customer');
    assert.equal(profile.body.passwordHash, undefined);
    await client(token).put('/profile/password', { currentPassword: 'bad', newPassword: 'NewPassword@123' }).expect(400);
    await client(token).put('/profile/password', { currentPassword: 'Password@123', newPassword: 'NewPassword@123' }).expect(200);
    await request(app).post('/api/auth/login').send({ email: 'customer@example.test', password: 'NewPassword@123' }).expect(200);
  });
  await t.test('online checkout, mock gateway and duplicate callback', async () => {
    await client(token).post('/cart/items', { productId: product.id }).expect(201);
    const r = await client(token).post('/orders', { paymentMethod: 'vnpay' }).set('Idempotency-Key', 'online-test-order').expect(201);
    const id = r.body.order._id;
    const payment = await client(token).post('/payments/online', { orderId: id, method: 'vnpay' }).expect(200);
    const mock = require('../src/services/mock.service');
    await request(app).get(`/api${mock.completeUrl(payment.body.txnRef, 'success').replace('/api', '')}`).expect(302);
    await request(app).get(mock.completeUrl(payment.body.txnRef, 'success')).expect(302);
    const detail = await client(token).get(`/orders/my/${id}`).expect(200);
    assert.equal(detail.body.paymentStatus, 'paid'); assert.equal(detail.body.latestPayment.status, 'success');
    assert.equal(await M.Transaction.countDocuments({ orderId: id }), 1);
  });
  await t.test('expired payment releases inventory exactly once', async () => {
    await client(token).post('/cart/items', { productId: product.id }).expect(201);
    const r = await client(token).post('/orders', { paymentMethod: 'momo' }).expect(201);
    const id = r.body.order._id;
    const before = (await M.Product.findById(product.id)).stockQuantity;
    await M.Order.collection.updateOne({ _id: new mongoose.Types.ObjectId(id) }, { $set: { createdAt: new Date(Date.now() - 3600000) } });
    await require('../src/services/payment.service').expireStaleOrders();
    await require('../src/services/payment.service').expireStaleOrders();
    assert.equal((await M.Product.findById(product.id)).stockQuantity, before + 1);
    assert.equal((await M.Order.findById(id)).status, 'failed');
  });
  await t.test('failed atomic work restores product, batch and logs', async () => {
    const before = (await M.Product.findById(product.id)).stockQuantity;
    const batch = await M.StockBatch.findOne({ productId: product.id });
    const id = new mongoose.Types.ObjectId();
    await assert.rejects(runAtomic(async ({ session, onRollback }) => {
      await stock.deductStock([{ productId: product._id, name: product.name, quantity: 2 }], { orderId: id, userId: customerId, session });
      onRollback(() => stock.releaseStock(id));
      throw new Error('Simulated downstream failure');
    }), /Simulated downstream failure/);
    assert.equal((await M.Product.findById(product.id)).stockQuantity, before);
    assert.equal((await M.StockBatch.findById(batch.id)).quantity, batch.quantity);
    assert.equal(await M.InventoryLog.countDocuments({ orderId: id, type: 'sale' }), process.env.TEST_STANDALONE ? 1 : 0);
  });
  await t.test('simultaneous checkout requests with one key create one order', async () => {
    await client(token).post('/cart/items', { productId: product.id }).expect(201);
    const before = (await M.Product.findById(product.id)).stockQuantity;
    const responses = await Promise.all([1, 2].map(() => client(token).post('/orders', { paymentMethod: 'cash' }).set('Idempotency-Key', 'concurrent-order-key')));
    assert.ok(responses.every((r) => [200, 201].includes(r.status)), responses.map((r) => JSON.stringify(r.body)).join('\n'));
    assert.equal(responses[0].body.order._id, responses[1].body.order._id);
    assert.equal(await M.Order.countDocuments({ idempotencyKey: 'concurrent-order-key' }), 1);
    assert.equal((await M.Product.findById(product.id)).stockQuantity, before - 1);
  });
  await t.test('stock batch shortage rolls back the order without losing the cart', async () => {
    const p = await M.Product.create({ name: 'Missing batch', slug: 'missing-batch', sku: 'MISSING', categoryId: product.categoryId, price: 100, stockQuantity: 3, mealType: 'snack' });
    await client(token).post('/cart/items', { productId: p.id }).expect(201);
    const count = await M.Order.countDocuments();
    await client(token).post('/orders', { paymentMethod: 'cash' }).expect(409);
    assert.equal(await M.Order.countDocuments(), count);
    assert.equal((await M.Product.findById(p.id)).stockQuantity, 3);
    assert.ok((await client(token).get('/cart')).body.items.some((i) => i.productId === p.id));
  });
  await t.test('logout endpoint works and invalid JWT is rejected', async () => {
    await client(token).post('/auth/logout', {}).expect(200);
    await client('invalid-token').get('/auth/me').expect(401);
  });
});
