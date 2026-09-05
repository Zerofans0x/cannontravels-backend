const asyncHandler = require('express-async-handler');
const { Transaction } = require('../models/Transaction');

// @desc    Get all transactions for the logged-in user
// @route   GET /api/v1/transactions
// @access  Private
const getUserTransactions = asyncHandler(async (req, res) => {
    const transactions = await Transaction.find({ user: req.user.id })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: transactions.length,
        data: transactions
    });
});

module.exports = { getUserTransactions };