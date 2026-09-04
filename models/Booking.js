const mongoose = require('mongoose');
const crypto = require('crypto');

const BookingSchema = new mongoose.Schema({
    passenger: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    
    // --- FLIGHT DETAILS ---
    flightNumber: { type: String, required: true, trim: true, uppercase: true },
    origin: { type: String, required: true, trim: true, uppercase: true },
    destination: { type: String, required: true, trim: true, uppercase: true },
    departureTime: { type: Date, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD', uppercase: true },

    // --- IDENTIFIERS ---
    bookingReference: { type: String, unique: true }, // Standard airline PNR (e.g., X7B9Q2)
    trackingCode: { type: String, unique: true }, // Internal telemetry & delegated payment code
    
    // --- PAYMENT & DELEGATION STATE ---
    paymentStatus: { 
        type: String, 
        enum: ['pending', 'paid', 'failed', 'refunded'], 
        default: 'pending' 
    },
    paymentMethod: { 
        type: String, 
        enum: ['self', 'delegated'], 
        default: 'self' 
    },
    payerEmail: { 
        type: String, 
        lowercase: true, 
        trim: true 
    },

    // --- TRACKING STATE ---
    isTrackingActive: { type: Boolean, default: false }

}, { timestamps: true });

// --- PRE-SAVE HOOK: Generate Unique Identifiers ---
BookingSchema.pre('save', async function (next) {
    if (this.isNew) {
        // Generate a 6-character alphanumeric PNR
        if (!this.bookingReference) {
            this.bookingReference = crypto.randomBytes(3).toString('hex').toUpperCase();
        }
        
        // Generate an 8-character secure tracking code for WebSockets & Third-Party access
        if (!this.trackingCode) {
            this.trackingCode = crypto.randomBytes(4).toString('hex').toUpperCase();
        }
    }
    next();
});

module.exports = mongoose.model('Booking', BookingSchema);