const express = require('express');
const router = express.Router();
const { startResumeTailoring, getTaskStatus } = require('../controllers/resumeController');

// Route to start the tailoring process
router.post('/tailor', startResumeTailoring);

// Route for the frontend to poll for status
router.get('/status/:taskId', getTaskStatus);

module.exports = router;
