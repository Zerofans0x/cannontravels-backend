const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/authMiddleware');

const {
    completeOnboarding
} = require('../controllers/cannonController');

//const { getTerminalData } = require('../controllers/dashboardController');

router.post('/onboarding', authenticate, completeOnboarding); 


// Dashboard endpoints
//router.get('/terminal', authenticate, getTerminalData);

module.exports = router;