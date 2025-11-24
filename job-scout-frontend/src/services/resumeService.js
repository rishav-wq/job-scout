import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/resume';

/**
 * Starts the resume tailoring process for a given job.
 * @param {string} jobId The ID of the job to tailor the resume for.
 * @returns {Promise<{msg: string, taskId: string}>}
 */
const startTailoring = async (jobId) => {
    try {
        const response = await axios.post(`${API_URL}/tailor`, { jobId });
        return response.data;
    } catch (error) {
        console.error('Error starting resume tailoring:', error.response?.data);
        throw error.response?.data || { msg: 'An unknown error occurred' };
    }
};

/**
 * Fetches the status of a specific tailoring task.
 * @param {string} taskId The ID of the task to check.
 * @returns {Promise<{status: string, downloadUrl?: string}>}
 */
const getTaskStatus = async (taskId) => {
    try {
        const response = await axios.get(`${API_URL}/status/${taskId}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching task status:', error.response?.data);
        throw error.response?.data || { msg: 'An unknown error occurred' };
    }
};

export { startTailoring, getTaskStatus };
