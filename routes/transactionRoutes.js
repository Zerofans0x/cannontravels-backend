const express = require('express');
const router = express.Router();
const { getUserTransactions } = require('../controllers/transactionController');
const { authenticate } = require('../middleware/authMiddleware');

router.use(authenticate);
router.route('/').get(getUserTransactions);

module.exports = router;