const Job = require('../models/Job');

/**
 * Gets ALL jobs but EXCLUDES the long description for a fast initial page load.
 */
const getAllJobs = async (req, res) => {
    try {
        // .select('-description') tells Mongoose to exclude the description field from the result.
        const jobs = await Job.find({}).select('-description');
        res.status(200).json({ count: jobs.length, jobs });
    } catch (error) {
        console.error('Error getting all jobs:', error);
        res.status(500).json({ msg: 'Server Error' });
    }
};

/**
 * Gets the full details for a SINGLE job, including the description.
 */
const getSingleJob = async (req, res) => {
    try {
        const { id: jobId } = req.params;
        const job = await Job.findById(jobId);

        if (!job) {
            return res.status(404).json({ msg: `No job with id: ${jobId}` });
        }
        res.status(200).json({ job });
    } catch (error) {
        console.error('Error getting single job:', error);
        res.status(500).json({ msg: 'Server Error' });
    }
};


// NEW: This function calculates statistics about the jobs
const getJobStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Set to the beginning of today

        // Count documents where the 'dateScraped' is greater than or equal to the start of today
        const newJobsToday = await Job.countDocuments({
            dateScraped: { $gte: today }
        });

        res.status(200).json({ newJobsToday });
    } catch (error) {
        console.error('Error getting job stats:', error);
        res.status(500).json({ msg: 'Server Error' });
    }
};

module.exports = {
    getAllJobs,
    getSingleJob,
    getJobStats,
};