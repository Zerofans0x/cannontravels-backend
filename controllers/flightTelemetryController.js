const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');

// Store in-memory cache for fast real-time coordinate streaming if DB writes are too heavy
const activeTelemetryCache = new Map();

// @desc    Get latest flight telemetry and route info by tracking code
// @route   GET /api/v1/flights/telemetry/:trackingCode
// @access  Public (or Protected)
const getFlightTelemetry = asyncHandler(async (req, res) => {
    const { trackingCode } = req.params;

    const booking = await Booking.findOne({ trackingCode }).populate('passenger', 'firstName lastName email');
    if (!booking) {
        res.status(404);
        throw new Error('Invalid tracking code or flight segment not found.');
    }

    // Check memory cache for most recent live ping
    const liveCoords = activeTelemetryCache.get(trackingCode) || {
        lat: 6.5244, // Default Lagos / Starting reference
        lng: 3.3792,
        speed: 480,  // knots
        heading: 90,
        timestamp: new Date().toISOString()
    };

    res.status(200).json({
        success: true,
        data: {
            bookingReference: booking.bookingReference,
            flightNumber: booking.flightNumber,
            origin: booking.origin,
            destination: booking.destination,
            departureTime: booking.departureTime,
            status: booking.paymentStatus,
            passenger: booking.passenger,
            liveLocation: liveCoords
        }
    });
});

// Helper for sockets to record telemetry
const storeTelemetryPing = (trackingCode, data) => {
    activeTelemetryCache.set(trackingCode, {
        ...data,
        timestamp: new Date().toISOString()
    });
};

module.exports = { getFlightTelemetry, storeTelemetryPing };