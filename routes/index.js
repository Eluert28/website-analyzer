const express = require('express');
const router = express.Router();
const reportSchedulesController = require('../controllers/reportSchedules');
const { checkAuth } = require('../middleware/auth');

// Zeitplan-Verwaltung (geschützt durch Auth-Middleware)
router.get('/report-schedules', checkAuth, reportSchedulesController.showReportSchedules);

module.exports = router;