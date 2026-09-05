const express = require('express');
const router = express.Router();
const { getDashboardOverview } = require('../controllers/dashboardController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/overview', authenticate, getDashboardOverview);

module.exports = router;