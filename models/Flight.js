const mongoose = require('mongoose');

const FlightSchema = new mongoose.Schema({
    flightNo: { type: String, required: true, uppercase: true, trim: true },
    airline: { type: String, required: true, trim: true },
    origin: { type: String, required: true, uppercase: true, trim: true, index: true }, // e.g., 'LOS'
    originCity: { type: String, required: true }, // e.g., 'Lagos'
    destination: { type: String, required: true, uppercase: true, trim: true, index: true }, // e.g., 'LHR'
    destinationCity: { type: String, required: true }, // e.g., 'London'
    departureTime: { type: Date, required: true },
    arrivalTime: { type: Date, required: true },
    duration: { type: String, required: true }, // e.g., '06h 45m'
    aircraft: { type: String, default: 'Boeing 787-9' },
    
    // Pricing by Cabin
    pricing: {
        economy: { type: Number, required: true },
        business: { type: Number, required: true },
        first: { type: Number, required: true }
    },

    // Inventory & Capacity
    totalSeats: { type: Number, default: 150 },
    availableSeats: { type: Number, default: 150 },
    
    status: { type: String, enum: ['scheduled', 'delayed', 'boarding', 'departed', 'cancelled'], default: 'scheduled' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const Flight = mongoose.model('Flight', FlightSchema);
module.exports = Flight;