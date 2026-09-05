const asyncHandler = require('express-async-handler');
const User = require('../models/User');

// @desc    Complete user onboarding profile
// @route   POST /api/v1/cannon/onboarding
// @access  Private
const completeOnboarding = asyncHandler(async (req, res) => {
    // These match the payload exactly as sent from your OnboardingPage.tsx
    const { experienceLevel, marketsOfInterest, primaryGoal, riskTolerance, planTier } = req.body;

    // The user ID is attached to req.user by your authentication middleware
    const user = await User.findById(req.user.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found.');
    }

    if (user.isOnboarded) {
        res.status(400);
        throw new Error('User is already onboarded.');
    }

    // Update the user's travel profile
    user.travelProfile = {
        experienceLevel: experienceLevel,
        cabinPreferences: marketsOfInterest, // You named it marketsOfInterest in frontend payload
        primaryGoal: primaryGoal,
        riskTolerance: riskTolerance,
        planTier: planTier || 'standard-traveler'
    };

    // Mark onboarding as complete
    user.isOnboarded = true;
    
    await user.save();

    // Send back success and the updated user state
    res.status(200).json({
        success: true,
        message: 'Travel profile configured successfully.',
        isOnboarded: user.isOnboarded,
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            isOnboarded: user.isOnboarded,
            travelProfile: user.travelProfile
        }
    });
});

module.exports = {
    completeOnboarding
};