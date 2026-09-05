const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');

// @desc    Get dashboard metrics and active bookings for logged-in user
// @route   GET /api/v1/dashboard/overview
// @access  Private
const getDashboardOverview = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    // Fetch all bookings for the user
    const bookings = await Booking.find({ passenger: userId }).sort({ createdAt: -1 });

    let upcomingFlights = 0;
    let completedTrips = 0;
    let pendingPayments = 0;

    bookings.forEach(b => {
        if (b.paymentStatus === 'paid') {
            const isPast = new Date(b.departureTime) < new Date();
            if (isPast) {
                completedTrips++;
            } else {
                upcomingFlights++;
            }
        } else {
            pendingPayments++;
        }
    });

    res.status(200).json({
        success: true,
        stats: {
            upcomingFlights,
            completedTrips,
            pendingPayments
        },
        bookings
    });
});

module.exports = { getDashboardOverview };