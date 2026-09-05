const express = require('express');
const router = express.Router();
const {
    getFlights,
    getFlightById,
    createFlight,
    seedFlights,
    getFlightSchedules,
} = require('../controllers/flightController');

const { getFlightTelemetry } = require('../controllers/flightTelemetryController');
const { authenticate } = require('../middleware/authMiddleware');

router.route('/')
    .get(authenticate, getFlights)
    .post(authenticate, createFlight);

router.route('/schedule')
    .get(authenticate, getFlightSchedules);

// 🟢 Public Telemetry Route for both passengers and third-party sponsors (No auth required)
router.get('/telemetry/:trackingCode', getFlightTelemetry);

// 🟢 SEED ROUTE
router.post('/seed', authenticate, seedFlights);

router.route('/:id')
    .get(authenticate, getFlightById);

module.exports = router;