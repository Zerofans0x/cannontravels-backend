
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    // --- IDENTITY ---
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: false, select: false },
    authMethod: { type: String, enum: ['local', 'google'], default: 'local' },
    
    firstName: { type: String, required: true },
    lastName: { type: String, required: false, default: '' },
    phoneNumber: { type: String, trim: true }, // Added: Crucial for flight updates/SMS
    avatarUrl: { type: String },

    // --- SECURITY & ROLES ---
    role: { type: String, enum: ['passenger', 'admin', 'superadmin'], default: 'passenger' },
    loginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    
    // --- SOCIAL IDS ---
    googleId: { type: String, unique: true, sparse: true },

    // --- REFERRALS (Optional: For 'Invite a friend, get a discount' promos) ---
    referredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralCode: { type: String, unique: true, sparse: true }, 

    // --- STATUS ---
    isEmailVerified: { type: Boolean, default: false },
    isOnboarded: { type: Boolean, default: false }, // e.g., Finished completing profile/passport details
    lastLogin: { type: Date },
    status: { type: String, enum: ['active', 'inactive', 'suspended'], default: 'active' },
    deletionReason: { type: String },

    // models/User.js (Add this inside your UserSchema)

    // --- TRAVEL PREFERENCES (From Onboarding) ---
    travelProfile: {
        experienceLevel: { type: String }, // e.g., "Leisure Explorer"
        cabinPreferences: [{ type: String }], // e.g., ["economy", "business"]
        primaryGoal: { type: String }, // e.g., "savings", "convenience"
        riskTolerance: { type: String }, // e.g., "Best Price & Deals"
        planTier: { type: String, default: 'standard-traveler' }
    },

    // --- FRONTEND HELPERS ---
    postAuthPath: { type: String }, 

    // --- OTP TOKENS (Standardized) ---
    emailVerificationToken: { type: String, select: false }, // Hashed OTP
    emailVerificationTokenExpires: { type: Date, select: false },
    resetPasswordToken: { type: String, select: false }, // Hashed OTP
    resetPasswordExpires: { type: Date, select: false },

}, { timestamps: true });

// --- METHODS ---
UserSchema.methods.matchPassword = async function(enteredPassword) {
    if (!this.passwordHash) return false;
    return await bcrypt.compare(enteredPassword, this.passwordHash);
};

UserSchema.methods.isLocked = function() {
    return !!(this.lockUntil && this.lockUntil > Date.now());
};

const User = mongoose.model('User', UserSchema);
module.exports = User;