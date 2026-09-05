const asyncHandler = require('express-async-handler');
const Flight = require('../models/Flight');


// @desc    Get all available flights with optional filters and pagination
// @route   GET /api/v1/flights
// @access  Private (Dashboard users)
const getFlights = asyncHandler(async (req, res) => {
    const { origin, destination, date, cabin, page = 1, limit = 6 } = req.query;

    let query = { status: 'scheduled' };

    if (origin) query.origin = origin.toUpperCase();
    if (destination) query.destination = destination.toUpperCase();

    if (date) {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        query.departureTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Flight.countDocuments(query);
    const flights = await Flight.find(query)
        .sort({ departureTime: 1 })
        .skip(skip)
        .limit(limitNum);

    res.status(200).json({
        success: true,
        count: flights.length,
        total,
        totalPages: Math.ceil(total / limitNum),
        currentPage: pageNum,
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

// @desc    Seed initial inventory flights for testing
// @route   POST /api/v1/flights/seed
// @access  Private
const seedFlights = asyncHandler(async (req, res) => {
    // Clear existing flights if you want a fresh start (optional)
    await Flight.deleteMany({});

    const sampleFlights = [
        {
            flightNo: "CT-842",
            airline: "CannonAir Global",
            origin: "LOS",
            originCity: "Lagos",
            destination: "LHR",
            destinationCity: "London Heathrow",
            departureTime: new Date(Date.now() + 86400000 * 2), // 2 days from now
            arrivalTime: new Date(Date.now() + 86400000 * 2 + 24300000),
            duration: "06h 45m",
            aircraft: "Boeing 787-9 Dreamliner",
            pricing: { economy: 750, business: 1850, first: 3400 },
            totalSeats: 150,
            availableSeats: 4,
            createdBy: req.user.id
        },
        {
            flightNo: "AF-502",
            airline: "Air France",
            origin: "LOS",
            originCity: "Lagos",
            destination: "CDG",
            destinationCity: "Paris Charles de Gaulle",
            departureTime: new Date(Date.now() + 86400000 * 3),
            arrivalTime: new Date(Date.now() + 86400000 * 3 + 22800000),
            duration: "06h 20m",
            aircraft: "Airbus A350-900",
            pricing: { economy: 820, business: 1950, first: 3600 },
            totalSeats: 180,
            availableSeats: 2,
            createdBy: req.user.id
        },
        {
            flightNo: "LH-569",
            airline: "Lufthansa",
            origin: "ABV",
            originCity: "Abuja",
            destination: "FRA",
            destinationCity: "Frankfurt",
            departureTime: new Date(Date.now() + 86400000 * 4),
            arrivalTime: new Date(Date.now() + 86400000 * 4 + 24300000),
            duration: "06h 45m",
            aircraft: "Boeing 747-8",
            pricing: { economy: 790, business: 1750, first: 3200 },
            totalSeats: 200,
            availableSeats: 7,
            createdBy: req.user.id
        },
        {
            flightNo: "BA-075",
            airline: "British Airways",
            origin: "LOS",
            originCity: "Lagos",
            destination: "JFK",
            destinationCity: "New York",
            departureTime: new Date(Date.now() + 86400000 * 5),
            arrivalTime: new Date(Date.now() + 86400000 * 5 + 42300000),
            duration: "11h 45m",
            aircraft: "Airbus A380",
            pricing: { economy: 1250, business: 3100, first: 5500 },
            totalSeats: 250,
            availableSeats: 3,
            createdBy: req.user.id
        }
    ];

    const createdFlights = await Flight.insertMany(sampleFlights);

    res.status(201).json({
        success: true,
        message: `Successfully seeded ${createdFlights.length} flights into inventory.`,
        flights: createdFlights
    });
});

// @desc    Get all active flight schedules
// @route   GET /api/v1/flights/schedule
// @access  Private
const getFlightSchedules = asyncHandler(async (req, res) => {
    const flights = await Flight.find({}).sort({ departureTime: 1 });
    res.status(200).json({
        success: true,
        count: flights.length,
        flights
    });
});


module.exports = {
    getFlights,
    getFlightById,
    createFlight,
    seedFlights,
    getFlightSchedules
};