

const express = require('express');
const router = express.Router();
const {
    getFlights,
    getFlightById,
    createFlight,
    seedFlights
} = require('../controllers/flightController');
const { authenticate } = require('../middleware/authMiddleware');

router.route('/')
    .get(authenticate, getFlights)
    .post(authenticate, createFlight);

// 🟢 ADD THIS SEED ROUTE
router.post('/seed', authenticate, seedFlights);

router.route('/:id')
    .get(authenticate, getFlightById);

module.exports = router;