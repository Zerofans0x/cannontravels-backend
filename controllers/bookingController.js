const asyncHandler = require('express-async-handler');
const Booking = require('../models/Booking');
const { sendEmail } = require('../services/emailService');

// @desc    Create a new flight booking
// @route   POST /api/v1/bookings
// @access  Private (Passenger)
const createBooking = asyncHandler(async (req, res) => {
    const { 
        flightNumber, 
        origin, 
        destination, 
        departureTime, 
        amount, 
        paymentMethod, 
        payerEmail 
    } = req.body;

    // 1. Validate delegated payment requirements
    if (paymentMethod === 'delegated' && !payerEmail) {
        res.status(400);
        throw new Error('Payer email is required for delegated payments.');
    }

    // 2. Create the Booking
    const booking = await Booking.create({
        passenger: req.user.id,
        flightNumber,
        origin,
        destination,
        departureTime,
        amount,
        paymentMethod,
        payerEmail: paymentMethod === 'delegated' ? payerEmail : undefined
    });

    // 3. Handle Delegated Payment Flow (Third-Party)
    if (booking.paymentMethod === 'delegated') {
        const frontendUrl = process.env.FRONTEND_URL || 'https://cannontravels.com';
        const paymentLink = `${frontendUrl}/pay/${booking.trackingCode}`;

        // Send email to the third party requesting payment
        await sendEmail({
            subject: `${req.user.firstName} requested you to pay for a flight`,
            send_to: booking.payerEmail,
            sent_from: "CannonTravels Payments <billing@cannontravels.com>",
            reply_to: "support@cannontravels.com",
            templateKey: process.env.ZEPTO_TEMPLATE_DELEGATED_PAYMENT,
            extraParams: { 
                passenger_name: `${req.user.firstName} ${req.user.lastName}`,
                flight_number: booking.flightNumber,
                amount: booking.amount,
                action_url: paymentLink 
            }
        }).catch(err => console.error("Delegated Payment Email fail:", err));
    }

    res.status(201).json({
        success: true,
        message: booking.paymentMethod === 'delegated' 
            ? 'Booking created. Payment request sent to third party.'
            : 'Booking created. Proceed to checkout.',
        data: booking
    });
});

// @desc    Get delegated booking details (For Third-Party Payer)
// @route   GET /api/v1/bookings/delegated/:trackingCode
// @access  Public (No JWT Required)
const getDelegatedBooking = asyncHandler(async (req, res) => {
    const { trackingCode } = req.params;

    // Populate only safe, necessary passenger details (Privacy First)
    const booking = await Booking.findOne({ trackingCode })
        .populate('passenger', 'firstName lastName avatarUrl');

    if (!booking) {
        res.status(404);
        throw new Error('Booking not found or tracking code is invalid.');
    }

    // Optional: Prevent viewing if already paid
    if (booking.paymentStatus === 'paid') {
        res.status(400);
        throw new Error('This booking has already been paid for.');
    }

    res.status(200).json({
        success: true,
        data: {
            flightNumber: booking.flightNumber,
            origin: booking.origin,
            destination: booking.destination,
            departureTime: booking.departureTime,
            amount: booking.amount,
            currency: booking.currency,
            trackingCode: booking.trackingCode,
            passenger: {
                // Masking the last name for standard privacy compliance
                name: `${booking.passenger.firstName} ${booking.passenger.lastName.charAt(0)}.`,
                avatarUrl: booking.passenger.avatarUrl
            }
        }
    });
});

// @desc    Get all bookings for the logged-in user
// @route   GET /api/v1/bookings/my-bookings
// @access  Private
const getUserBookings = asyncHandler(async (req, res) => {
    const bookings = await Booking.find({ passenger: req.user.id })
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings
    });
});

// @desc    Get all delegated payment requests for the logged-in user's email
// @route   GET /api/v1/bookings/delegated-requests
// @access  Private
const getDelegatedRequests = asyncHandler(async (req, res) => {
    const userEmail = req.user.email;
    const bookings = await Booking.find({ payerEmail: userEmail })
        .populate('passenger', 'firstName lastName avatarUrl')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings
    });
});

module.exports = {
    createBooking,
    getDelegatedBooking,
    getUserBookings,
    getDelegatedRequests
};
