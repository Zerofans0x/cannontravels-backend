

// const asyncHandler = require('express-async-handler');
// const User = require('../models/User');
// const Booking = require('../models/Booking');
// const { Transaction } = require('../models/Transaction');
// const paymentService = require('../services/paymentService');
// const { sendEmail } = require('../services/emailService');

// // Helper for dynamic local/production client URLs
// const getClientUrl = () => {
//     return process.env.CLIENT_URL || (process.env.NODE_ENV === 'production' 
//         ? 'https://www.cannontravels.com' 
//         : 'http://localhost:3000');
// };

// // @desc    Initialize payment for a flight booking (Self-Checkout)
// // @route   POST /api/v1/payments/initialize
// // @access  Private
// const initializeBookingPayment = asyncHandler(async (req, res) => {
//     const { bookingId, gateway } = req.body;
//     const user = await User.findById(req.user.id);

//     const booking = await Booking.findOne({ _id: bookingId, passenger: user._id });
//     if (!booking) {
//         res.status(404);
//         throw new Error('Booking not found or unauthorized.');
//     }

//     if (booking.paymentStatus === 'paid') {
//         res.status(400);
//         throw new Error('This booking has already been paid for.');
//     }

//     const orderId = `FLT-TRK-${booking.bookingReference}-${Date.now().toString().slice(-4)}`;
// let frontendCallback = `${getClientUrl()}/subscription-success?orderId=${orderId}&reference=${orderId}`;

//     try {
//         const metadata = { bookingId: booking._id.toString(), flightNumber: booking.flightNumber };

//         const { invoice, providerName } = await paymentService.initializePayment(
//             user,
//             booking.amount,
//             booking.currency || 'USD',
//             orderId,
//             metadata,
//             frontendCallback,
//             gateway
//         );

//         // ✅ FIXED: Record transaction including gatewayResponse so metadata can be read on verification
//         await Transaction.create({
//             user: user._id,
//             reference: invoice.id,
//             orderId: orderId,
//             amount: booking.amount,
//             currency: booking.currency || 'USD',
//             status: 'pending',
//             type: 'subscription', 
//             planType: 'custom',
//             gateway: providerName,
//             gatewayResponse: { metadata } // Saved so verifyBookingPayment can find bookingId
//         });

//         // Dispatch checkout intent email
//         sendEmail({
//             subject: `Complete Payment for Flight ${booking.flightNumber} ✈`,
//             send_to: user.email,
//             sent_from: "CannonTravels Payments <billing@cannontravels.com>",
//             reply_to: "support@cannontravels.com",
//             templateKey: process.env.ZEPTO_TEMPLATE_CHECKOUT_INTENT,
//             extraParams: {
//                 name: user.firstName,
//                 plan_name: `Flight ${booking.origin} to ${booking.destination}`,
//                 action_url: invoice.checkoutLink
//             }
//         }).catch(err => console.error("Checkout Intent Email fail:", err));

//         res.status(200).json({
//             success: true,
//             checkoutUrl: invoice.checkoutLink,
//             invoiceId: invoice.id,
//             orderId,
//             gatewayUsed: providerName
//         });

//     } catch (error) {
//         console.error("Flight Payment Init Error:", error);
//         res.status(500);
//         throw new Error('Could not initiate flight payment gateway.');
//     }
// });

// // @desc    Verify flight booking payment status
// // @route   POST /api/v1/payments/verify
// // @access  Private
// const verifyBookingPayment = asyncHandler(async (req, res) => {
//     // Support invoiceId, reference, or orderId from frontend query params
//     const identifier = req.body.invoiceId || req.body.reference || req.body.orderId;
//     if (!identifier) {
//         res.status(400);
//         throw new Error('No invoice or order reference provided.');
//     }

//     const transaction = await Transaction.findOne({
//         $or: [{ reference: identifier }, { orderId: identifier }]
//     });

//     if (!transaction) {
//         res.status(404);
//         throw new Error('Transaction record not found.');
//     }

//     if (transaction.status === 'success') {
//         return res.status(200).json({ success: true, message: 'Already processed.' });
//     }

//     const invoiceData = await paymentService.verifyPayment(
//         transaction.reference,
//         transaction.gateway
//     );

//     if (invoiceData && (invoiceData.status === 'Settled' || invoiceData.status === 'Processing')) {
//         transaction.status = 'success';
        
//         // If Paystack returned raw metadata during verification, merge it back if missing
//         if (invoiceData.raw?.metadata && typeof invoiceData.raw.metadata === 'object') {
//             transaction.gatewayResponse = { 
//                 ...transaction.gatewayResponse, 
//                 metadata: invoiceData.raw.metadata 
//             };
//         }
        
//         await transaction.save();

//         // ✅ FIXED: Safely extract bookingId from gatewayResponse metadata
//         const metadata = transaction.gatewayResponse?.metadata || {};
//         let bookingId = metadata.bookingId;

//         // Fallback: If metadata didn't carry over, find booking via orderId/booking reference
//         if (!bookingId && transaction.orderId) {
//             const refPart = transaction.orderId.split('-')[2]; // Extracts booking reference if formatted like FLT-TRK-REF-####
//             const foundBooking = await Booking.findOne({ bookingReference: refPart });
//             if (foundBooking) bookingId = foundBooking._id;
//         }

//         if (bookingId) {
//             const booking = await Booking.findById(bookingId);
//             if (booking) {
//                 booking.paymentStatus = 'paid';
//                 await booking.save();
//             }
//         }

//         res.status(200).json({
//             success: true,
//             message: 'Payment verified and flight booking marked as confirmed!',
//             bookingId
//         });
//     } else {
//         transaction.status = invoiceData.status === 'Expired' ? 'expired' : 'pending';
//         await transaction.save();
//         res.status(400).json({
//             success: false,
//             message: `Payment status is: ${invoiceData.status}`
//         });
//     }
// });

// // @desc    Initialize payment for a delegated flight booking (Third-Party Sponsor)
// // @route   POST /api/v1/payments/initialize-delegated
// // @access  Public (No JWT Required)
// const initializeDelegatedPayment = asyncHandler(async (req, res) => {
//     const { trackingCode, gateway } = req.body;

//     const booking = await Booking.findOne({ trackingCode }).populate('passenger', 'firstName lastName email');
//     if (!booking) {
//         res.status(404);
//         throw new Error('Booking not found or invalid tracking code.');
//     }

//     if (booking.paymentStatus === 'paid') {
//         res.status(400);
//         throw new Error('This booking has already been paid for.');
//     }

//     const orderId = `DLG-TRK-${booking.bookingReference}-${Date.now().toString().slice(-4)}`;
//     let frontendCallback = `${getClientUrl()}/pay/${trackingCode}?payment=success`;

//     try {
//         const payerMockUser = {
//             email: booking.payerEmail || booking.passenger.email,
//             _id: booking.passenger._id
//         };

//         const metadata = { bookingId: booking._id.toString(), flightNumber: booking.flightNumber, type: 'delegated' };

//         const { invoice, providerName } = await paymentService.initializePayment(
//             payerMockUser,
//             booking.amount,
//             booking.currency || 'USD',
//             orderId,
//             metadata,
//             frontendCallback,
//             gateway
//         );

//         await Transaction.create({
//             user: booking.passenger._id,
//             reference: invoice.id,
//             orderId: orderId,
//             amount: booking.amount,
//             currency: booking.currency || 'USD',
//             status: 'pending',
//             type: 'subscription',
//             planType: 'custom',
//             gateway: providerName,
//             gatewayResponse: { metadata }
//         });

//         res.status(200).json({
//             success: true,
//             checkoutUrl: invoice.checkoutLink,
//             invoiceId: invoice.id,
//             orderId,
//             gatewayUsed: providerName
//         });

//     } catch (error) {
//         console.error("Delegated Payment Init Error:", error);
//         res.status(500);
//         throw new Error('Could not initiate delegated payment gateway.');
//     }
// });

// module.exports = { 
//     initializeBookingPayment, 
//     verifyBookingPayment, 
//     initializeDelegatedPayment 
// };


const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { Transaction } = require('../models/Transaction');
const paymentService = require('../services/paymentService');
const { sendEmail } = require('../services/emailService');

// Helper for dynamic local/production client URLs
const getClientUrl = () => {
    return process.env.FRONTEND_URL || (process.env.NODE_ENV === 'production' 
        ? 'https://www.cannontravels.com' 
        : 'http://localhost:3000');
};

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
    let frontendCallback = `${getClientUrl()}/subscription-success?orderId=${orderId}&reference=${orderId}`;

    try {
        const metadata = { bookingId: booking._id.toString(), flightNumber: booking.flightNumber };

        const { invoice, providerName } = await paymentService.initializePayment(
            user,
            booking.amount,
            booking.currency || 'USD',
            orderId,
            metadata,
            frontendCallback,
            gateway
        );

        // Record transaction including gatewayResponse so metadata can be read on verification
        await Transaction.create({
            user: user._id,
            reference: invoice.id,
            orderId: orderId,
            amount: booking.amount,
            currency: booking.currency || 'USD',
            status: 'pending',
            type: 'subscription', 
            planType: 'custom',
            gateway: providerName,
            gatewayResponse: { metadata }
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
    const identifier = req.body.invoiceId || req.body.reference || req.body.orderId;
    if (!identifier) {
        res.status(400);
        throw new Error('No invoice or order reference provided.');
    }

    const transaction = await Transaction.findOne({
        $or: [{ reference: identifier }, { orderId: identifier }]
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
        
        if (invoiceData.raw?.metadata && typeof invoiceData.raw.metadata === 'object') {
            transaction.gatewayResponse = { 
                ...transaction.gatewayResponse, 
                metadata: invoiceData.raw.metadata 
            };
        }
        
        await transaction.save();

        const metadata = transaction.gatewayResponse?.metadata || {};
        let bookingId = metadata.bookingId;

        if (!bookingId && transaction.orderId) {
            const refPart = transaction.orderId.split('-')[2];
            const foundBooking = await Booking.findOne({ bookingReference: refPart });
            if (foundBooking) bookingId = foundBooking._id;
        }

        if (bookingId) {
            const booking = await Booking.findById(bookingId).populate('passenger');
            if (booking) {
                booking.paymentStatus = 'paid';
                await booking.save();

                // 🟢 Dispatched Confirmation & Tracking Email to Passenger upon successful self-checkout verification
                const trackingLink = `${getClientUrl()}/dashboard/track/${booking.trackingCode}`;
                const recipientEmail = booking.passenger?.email;
                const passengerName = booking.passenger?.firstName || 'Valued Passenger';

                if (recipientEmail) {
                    sendEmail({
                        subject: `Flight Itinerary Confirmed & Boarding Pass Ready - ${booking.flightNumber} ✈`,
                        send_to: recipientEmail,
                        sent_from: "CannonTravels Confirmations <confirmations@cannontravels.com>",
                        reply_to: "support@cannontravels.com",
                        templateKey: process.env.ZEPTO_TEMPLATE_BOOKING_CONFIRMATION,
                        extraParams: {
                            name: passengerName,
                            flight_number: booking.flightNumber,
                            route: `${booking.origin} to ${booking.destination}`,
                            pnr: booking.bookingReference,
                            tracking_url: trackingLink
                        }
                    }).catch(err => console.error("Booking Confirmation Email fail:", err));
                }
            }
        }

        res.status(200).json({
            success: true,
            message: 'Payment verified and flight booking marked as confirmed!',
            bookingId
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
    let frontendCallback = `${getClientUrl()}/pay/${trackingCode}?payment=success`;

    try {
        const payerMockUser = {
            email: booking.payerEmail || booking.passenger.email,
            _id: booking.passenger._id
        };

        const metadata = { bookingId: booking._id.toString(), flightNumber: booking.flightNumber, type: 'delegated' };

        const { invoice, providerName } = await paymentService.initializePayment(
            payerMockUser,
            booking.amount,
            booking.currency || 'USD',
            orderId,
            metadata,
            frontendCallback,
            gateway
        );

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
            gatewayResponse: { metadata }
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