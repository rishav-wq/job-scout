// In routes/jobRoutes.js
const express = require('express');
const router = express.Router();

// We will import our controller functions here
const { getAllJobs, getSingleJob, getJobStats } = require('../controllers/jobController');

// Define the route. A GET request to '/' (which will be '/api/v1/jobs/')

router.get('/stats', getJobStats);
// will be handled by the getAllJobs controller function.
router.get('/', getAllJobs);
// 2. NEW: This route gets a single job by its ID (with description)
router.get('/:id', getSingleJob);

module.exports = router;