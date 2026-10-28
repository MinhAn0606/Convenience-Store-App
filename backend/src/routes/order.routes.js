const router = require('express').Router();
const c = require('../controllers/order.controller');
const customer = require('../controllers/customerOrder.controller');
const admin = require('../controllers/adminOrder.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

// UC-09.1 Create Order
router.post('/preview', authenticate, authorize('customer'), customer.preview);
router.post('/', authenticate, authorize('customer'), customer.create);
// UC-10.1, 10.4 View Orders / Order History
router.get('/my', authenticate, authorize('customer'), customer.list);
router.get('/my/history', authenticate, authorize('customer'), customer.history);
router.get('/my/:id/tracking', authenticate, authorize('customer'), customer.detail);
// UC-10.2, 10.3 View Order Details / Track Order Status
router.get('/my/:id', authenticate, authorize('customer'), customer.detail);
// UC-21 Create Store Order (báo giá/kiểm tra từng dòng, rồi tạo đơn)
router.post('/store/quote', authenticate, authorize('staff'), c.quoteStoreOrder);
router.post('/store', authenticate, authorize('staff'), c.createStoreOrder);
// UC-35.1, 35.2 View / Search Orders
router.get('/', authenticate, authorize('admin'), admin.listOrders);
// UC-35.3 View Order Details
router.get('/:id', authenticate, authorize('admin'), admin.getOrder);
// Chuyển trạng thái đơn: preparing, ready_for_pickup, completed
router.patch('/:id/status', authenticate, authorize('admin'), admin.updateOrderStatus);
// UC-35.4 Handle Order Issue
router.post('/:id/issues', authenticate, authorize('admin'), admin.handleOrderIssue);

router.patch('/:id/issues/:issueId', authenticate, authorize('admin'), admin.resolveOrderIssue);

module.exports = router;
