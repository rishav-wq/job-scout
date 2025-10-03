// In routes/jobRoutes.js
const express = require('express');
const router = express.Router();

// We will import our controller functions here
const { getAllJobs } = require('../controllers/jobController');

// Define the route. A GET request to '/' (which will be '/api/v1/jobs/')
// will be handled by the getAllJobs controller function.
router.get('/', getAllJobs);

module.exports = router;