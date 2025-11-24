// In controllers/jobController.js
const Job = require('../models/Job'); // Import our Job model

// This function will handle the request to get all jobs
const getAllJobs = async (req, res) => {
    try {
        // Use the Job model to find all documents in the jobs collection
        const jobs = await Job.find({}); // The {} means find all, with no filter

        // Send a success response with the jobs data
        res.status(200).json({ count: jobs.length, jobs });
    } catch (error) {
        console.error('Error getting jobs:', error);
        res.status(500).json({ msg: 'Server Error' });
    }
};

module.exports = { getAllJobs };