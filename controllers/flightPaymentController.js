const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { Transaction } = require('../models/Transaction');
const paymentService = require('../services/paymentService');
const { sendEmail } = require('../services/emailService');

// @desc    Initialize payment for a flight booking (Self-Checkout)
// @route   POST /api/v1/payments/initialize
// @access  Private
const initializeBookingPayment = asyncHandler(async (req, res) => {
    const { bookingId, gateway } = req.body;
    const user = await User.findById(req.user.id);

    const booking = await Booking.findOne({ _id: bookingId, passenger: user._id });
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found or unauthorized.');
    }

    if (booking.paymentStatus === 'paid') {
        res.status(400);
        throw new Error('This booking has already been paid for.');
    }

    const orderId = `FLT-TRK-${booking.bookingReference}-${Date.now().toString().slice(-4)}`;
    let frontendCallback = `${process.env.FRONTEND_URL || 'https://cannontravels.com'}/dashboard/bookings?payment=success&orderId=${orderId}`;

    try {
        const { invoice, providerName } = await paymentService.initializePayment(
            user,
            booking.amount,
            booking.currency || 'USD',
            orderId,
            { bookingId: booking._id.toString(), flightNumber: booking.flightNumber },
            frontendCallback,
            gateway
        );

        // Record transaction
        await Transaction.create({
            user: user._id,
            reference: invoice.id,
            orderId: orderId,
            amount: booking.amount,
            currency: booking.currency || 'USD',
            status: 'pending',
            type: 'subscription', // Using standard transaction schema type
            planType: 'custom',
            gateway: providerName,
        });

        // Dispatch checkout intent email
        sendEmail({
            subject: `Complete Payment for Flight ${booking.flightNumber} ✈`,
            send_to: user.email,
            sent_from: "CannonTravels Payments <billing@cannontravels.com>",
            reply_to: "support@cannontravels.com",
            templateKey: process.env.ZEPTO_TEMPLATE_CHECKOUT_INTENT,
            extraParams: {
                name: user.firstName,
                plan_name: `Flight ${booking.origin} to ${booking.destination}`,
                action_url: invoice.checkoutLink
            }
        }).catch(err => console.error("Checkout Intent Email fail:", err));

        res.status(200).json({
            success: true,
            checkoutUrl: invoice.checkoutLink,
            invoiceId: invoice.id,
            orderId,
            gatewayUsed: providerName
        });

    } catch (error) {
        console.error("Flight Payment Init Error:", error);
        res.status(500);
        throw new Error('Could not initiate flight payment gateway.');
    }
});

// @desc    Verify flight booking payment status
// @route   POST /api/v1/payments/verify
// @access  Private
const verifyBookingPayment = asyncHandler(async (req, res) => {
    const { invoiceId } = req.body;
    if (!invoiceId) {
        res.status(400);
        throw new Error('No invoice or order reference provided.');
    }

    const transaction = await Transaction.findOne({
        $or: [{ reference: invoiceId }, { orderId: invoiceId }]
    });

    if (!transaction) {
        res.status(404);
        throw new Error('Transaction record not found.');
    }

    if (transaction.status === 'success') {
        return res.status(200).json({ success: true, message: 'Already processed.' });
    }

    const invoiceData = await paymentService.verifyPayment(
        transaction.reference,
        transaction.gateway
    );

    if (invoiceData && (invoiceData.status === 'Settled' || invoiceData.status === 'Processing')) {
        transaction.status = 'success';
        await transaction.save();

        // Extract booking reference from gateway response metadata or transaction
        const metadata = transaction.gatewayResponse?.metadata || {};
        const bookingId = metadata.bookingId;

        if (bookingId) {
            const booking = await Booking.findById(bookingId);
            if (booking) {
                booking.paymentStatus = 'paid';
                await booking.save();
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified and flight booking marked as confirmed!'
        });
    } else {
        transaction.status = invoiceData.status === 'Expired' ? 'expired' : 'pending';
        await transaction.save();
        res.status(400).json({
            success: false,
            message: `Payment status is: ${invoiceData.status}`
        });
    }
});


// @desc    Initialize payment for a delegated flight booking (Third-Party Sponsor)
// @route   POST /api/v1/payments/initialize-delegated
// @access  Public (No JWT Required)
const initializeDelegatedPayment = asyncHandler(async (req, res) => {
    const { trackingCode, gateway } = req.body;

    const booking = await Booking.findOne({ trackingCode }).populate('passenger', 'firstName lastName email');
    if (!booking) {
        res.status(404);
        throw new Error('Booking not found or invalid tracking code.');
    }

    if (booking.paymentStatus === 'paid') {
        res.status(400);
        throw new Error('This booking has already been paid for.');
    }

    const orderId = `DLG-TRK-${booking.bookingReference}-${Date.now().toString().slice(-4)}`;
    let frontendCallback = `${process.env.FRONTEND_URL || 'https://cannontravels.com'}/pay/${trackingCode}?payment=success`;

    try {
        // Use passenger user object or fallback representation for gateway metadata
        const payerMockUser = {
            email: booking.payerEmail,
            _id: booking.passenger._id
        };

        const { invoice, providerName } = await paymentService.initializePayment(
            payerMockUser,
            booking.amount,
            booking.currency || 'USD',
            orderId,
            { bookingId: booking._id.toString(), flightNumber: booking.flightNumber, type: 'delegated' },
            frontendCallback,
            gateway
        );

        // Record transaction
        await Transaction.create({
            user: booking.passenger._id,
            reference: invoice.id,
            orderId: orderId,
            amount: booking.amount,
            currency: booking.currency || 'USD',
            status: 'pending',
            type: 'subscription',
            planType: 'custom',
            gateway: providerName,
        });

        res.status(200).json({
            success: true,
            checkoutUrl: invoice.checkoutLink,
            invoiceId: invoice.id,
            orderId,
            gatewayUsed: providerName
        });

    } catch (error) {
        console.error("Delegated Payment Init Error:", error);
        res.status(500);
        throw new Error('Could not initiate delegated payment gateway.');
    }
});

module.exports = { 
    initializeBookingPayment, 
    verifyBookingPayment, 
    initializeDelegatedPayment 
};