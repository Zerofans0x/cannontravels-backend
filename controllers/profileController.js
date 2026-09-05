const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get User Profile
// @route   GET /api/v1/profile
const getProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    res.status(200).json({ success: true, user });
});

// @desc    Update User Profile
// @route   PUT /api/v1/profile/update
const updateProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    if (req.body.fullName) {
        const full = req.body.fullName.trim();
        const parts = full.split(/\s+/);
        user.firstName = parts[0];
        user.lastName = parts.slice(1).join(' ') || '';
    }
    if (req.body.email) user.email = req.body.email;
    if (req.body.phone) user.phone = req.body.phone;

    const updatedUser = await user.save();

    res.status(200).json({
        success: true,
        user: {
            id: updatedUser._id,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            email: updatedUser.email,
            phone: updatedUser.phone
        },
        message: "Profile updated successfully"
    });
});

// @desc    Change Password
// @route   PUT /api/v1/profile/password
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        res.status(400);
        throw new Error('Incorrect current password');
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
});

// @desc    Delete Account
// @route   DELETE /api/v1/profile/delete
const deleteAccount = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id);
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    user.status = 'suspended';
    user.email = `deleted_${Date.now()}_${user.email}`;
    await user.save();

    res.status(200).json({ success: true, message: "Account deleted successfully" });
});

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount
};