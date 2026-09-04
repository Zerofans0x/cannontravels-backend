const express = require('express');
const router = express.Router();
const {
    createBooking,
    getDelegatedBooking,
    getUserBookings
} = require('../controllers/bookingController');

// Authentication middleware (ensure you have this from your auth setup)
const { authenticate } = require('../middleware/authMiddleware');

// --- PUBLIC ROUTES (No JWT required) ---
// Used by the third-party payer to fetch flight and cost details via email link
router.get('/delegated/:trackingCode', getDelegatedBooking);


// --- PROTECTED ROUTES (JWT required) ---
// Mount authenticate middleware for all routes below this line
router.use(authenticate);

// Create a new booking
router.post('/', createBooking);

// Fetch passenger's own bookings
router.get('/my-bookings', getUserBookings);

module.exports = router;