


// const express = require('express');
// const router = express.Router();
// const {
//     initializeBookingPayment,
//     verifyBookingPayment,
//     initializeDelegatedPayment
// } = require('../controllers/flightPaymentController');
// const { authenticate } = require('../middleware/authMiddleware');

// // Public route for third-party sponsors
// router.post('/initialize-delegated', initializeDelegatedPayment);

// // Protected routes
// router.use(authenticate);
// router.post('/initialize', initializeBookingPayment);
// router.post('/verify', verifyBookingPayment);

// module.exports = router;


const express = require('express');
const router = express.Router();
const {
    initializeBookingPayment,
    verifyBookingPayment,
    initializeDelegatedPayment
} = require('../controllers/flightPaymentController');
const { authenticate } = require('../middleware/authMiddleware');

// --- Public Routes (No Token Required) ---
router.post('/initialize-delegated', initializeDelegatedPayment);
router.post('/verify', verifyBookingPayment); 

// --- Protected Routes (Requires Token) ---
router.use(authenticate); // Everything below this line is protected
router.post('/initialize', initializeBookingPayment);

module.exports = router;