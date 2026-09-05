const express = require('express');
const router = express.Router();
const {
    getFlights,
    getFlightById,
    createFlight
} = require('../controllers/flightController');
const { authenticate } = require('../middleware/authMiddleware');

router.route('/')
    .get(authenticate, getFlights)
    .post(authenticate, createFlight); // Admin creates flights here

router.route('/:id')
    .get(authenticate, getFlightById);

module.exports = router;