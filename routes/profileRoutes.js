const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');
const {
    getProfile,
    updateProfile,
    changePassword,
    deleteAccount
} = require('../controllers/profileController');

router.get('/', authenticate, getProfile);
router.put('/update', authenticate, updateProfile);
router.put('/password', authenticate, changePassword);
router.delete('/delete', authenticate, deleteAccount);

module.exports = router;