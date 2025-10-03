const GeneratedResume = require('../models/GeneratedResume');
const Profile = require('../models/Profile');
const Job = require('../models/Job');
const { tailorResumeText } = require('../services/aiTailoringService');
const { generateResumePDF } = require('../services/latexResumeService'); // Import LaTeX service

// This function starts the process but does NOT wait for it to finish
const startResumeTailoring = async (req, res) => {
    const { jobId } = req.body;
    const userId = req.user?.id || 'default-user';

    if (!jobId) {
        return res.status(400).json({ msg: 'Job ID is required.' });
    }

    try {
        const profile = await Profile.findOne({ userId });
        const jobListing = await Job.findById(jobId);

        if (!profile) {
            return res.status(404).json({ msg: 'User profile not found. Please upload a resume first.' });
        }
        if (!jobListing) {
            return res.status(404).json({ msg: 'Job listing not found.' });
        }
        if (!profile.resumeText) {
            return res.status(400).json({ msg: 'No resume text found in profile. Please upload a resume.' });
        }

        const task = await GeneratedResume.create({ 
            jobId, 
            userId,
            status: 'processing',
            createdAt: new Date()
        });
        
        console.log(`📝 Starting resume tailoring task ${task._id} for job ${jobId}`);
        
        res.status(202).json({ 
            msg: 'Resume tailoring process started.', 
            taskId: task._id,
            estimatedTime: '30-60 seconds'
        });

        // Background processing with LaTeX PDF generation
        processInBackground(task._id, jobId, userId, profile.resumeText, jobListing.description);

    } catch (error) {
        console.error('Error starting resume tailoring:', error);
        res.status(500).json({ 
            msg: 'Server error', 
            error: process.env.NODE_ENV === 'development' ? error.message : undefined 
        });
    }
};

// Updated background process for LaTeX PDF generation
async function processInBackground(taskId, jobId, userId, resumeText, jobDescription) {
    try {
        console.log(`⚙️ Processing task ${taskId}...`);

        // Step 1: Get complete tailored resume from AI
        console.log(`📄 Tailoring resume with AI...`);
        const fullTailoredResume = await tailorResumeText(resumeText, jobDescription);
        
        // Step 2: Generate PDF using LaTeX
        console.log(`📋 Generating PDF with LaTeX...`);
        const fileName = `resume_${userId}_${jobId}_${Date.now()}.pdf`;
        const downloadUrl = await generateResumePDF(fullTailoredResume, fileName);

        // Step 3: Update task status
        await GeneratedResume.findByIdAndUpdate(taskId, {
            status: 'completed',
            downloadUrl: downloadUrl,
            completedAt: new Date(),
        });
        
        console.log(`✅ Task ${taskId} completed successfully. File: ${fileName}`);
        console.log(`🔗 Download URL: ${downloadUrl}`);

    } catch (error) {
        console.error(`❌ Task ${taskId} failed:`, error);
        
        await GeneratedResume.findByIdAndUpdate(taskId, { 
            status: 'failed',
            error: error.message,
            failedAt: new Date(),
        });
    }
}

// Keep the rest of your controller functions unchanged
const getTaskStatus = async (req, res) => {
    const { taskId } = req.params;
    
    try {
        const task = await GeneratedResume.findById(taskId)
            .populate('jobId', 'title company')
            .lean();
            
        if (!task) {
            return res.status(404).json({ msg: 'Task not found.' });
        }

        const response = {
            taskId: task._id,
            status: task.status,
            downloadUrl: task.downloadUrl,
            createdAt: task.createdAt,
        };

        if (task.status === 'completed') {
            response.completedAt = task.completedAt;
            response.jobTitle = task.jobId?.title;
            response.company = task.jobId?.company;
        } else if (task.status === 'failed') {
            response.error = task.error;
            response.failedAt = task.failedAt;
        } else if (task.status === 'processing') {
            const elapsed = Date.now() - new Date(task.createdAt).getTime();
            response.elapsedSeconds = Math.floor(elapsed / 1000);
        }

        res.status(200).json(response);
        
    } catch (error) {
        console.error('Error fetching task status:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

const getUserTasks = async (req, res) => {
    const userId = req.user?.id || 'default-user';
    
    try {
        const tasks = await GeneratedResume.find({ userId })
            .populate('jobId', 'title company')
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.status(200).json({ tasks });
        
    } catch (error) {
        console.error('Error fetching user tasks:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

const deleteTask = async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user?.id || 'default-user';
    
    try {
        const task = await GeneratedResume.findOne({ _id: taskId, userId });
        
        if (!task) {
            return res.status(404).json({ msg: 'Task not found or unauthorized.' });
        }

        await GeneratedResume.findByIdAndDelete(taskId);
        
        res.status(200).json({ msg: 'Task deleted successfully.' });
        
    } catch (error) {
        console.error('Error deleting task:', error);
        res.status(500).json({ msg: 'Server error' });
    }
};

module.exports = { 
    startResumeTailoring, 
    getTaskStatus, 
    getUserTasks,
    deleteTask 
};