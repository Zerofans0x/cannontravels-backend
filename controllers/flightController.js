const asyncHandler = require('express-async-handler');
const Flight = require('../models/Flight');

// @desc    Get all available flights with optional filters (Origin, Destination, Cabin)
// @route   GET /api/v1/flights
// @access  Private (Dashboard users)
const getFlights = asyncHandler(async (req, res) => {
    const { origin, destination, date, cabin } = req.query;

    let query = { status: 'scheduled' };

    if (origin) query.origin = origin.toUpperCase();
    if (destination) query.destination = destination.toUpperCase();

    // Date filtering (if specified)
    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.departureTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const flights = await Flight.find(query).sort({ departureTime: 1 });

    res.status(200).json({
        success: true,
        count: flights.length,
        flights
    });
});

// @desc    Get a single flight by ID
// @route   GET /api/v1/flights/:id
// @access  Private
const getFlightById = asyncHandler(async (req, res) => {
    const flight = await Flight.findById(req.params.id);

    if (!flight) {
        res.status(404);
        throw new Error('Flight not found.');
    }

    res.status(200).json({
        success: true,
        flight
    });
});

// @desc    Create a new flight (Admin / Superadmin only)
// @route   POST /api/v1/flights
// @access  Private/Admin
const createFlight = asyncHandler(async (req, res) => {
    const {
        flightNo,
        airline,
        origin,
        originCity,
        destination,
        destinationCity,
        departureTime,
        arrivalTime,
        duration,
        aircraft,
        pricing,
        totalSeats
    } = req.body;

    const flight = await Flight.create({
        flightNo,
        airline,
        origin,
        originCity,
        destination,
        destinationCity,
        departureTime,
        arrivalTime,
        duration,
        aircraft,
        pricing,
        totalSeats,
        availableSeats: totalSeats || 150,
        createdBy: req.user.id
    });

    res.status(201).json({
        success: true,
        message: 'Flight successfully added to global inventory.',
        flight
    });
});

module.exports = {
    getFlights,
    getFlightById,
    createFlight
};