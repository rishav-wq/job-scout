// In src/services/jobService.js
import axios from 'axios';

// CORRECTED: Pointing to port 8000 and the correct v1 path
const API_URL = 'https://job-scout-1.onrender.com/api/v1/jobs';

export const getAllJobs = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.data; // The backend sends { count, jobs }
    } catch (error) {
        console.error('Error fetching jobs:', error);
        // Return a default structure on error
        return { count: 0, jobs: [] }; 
    }
};
// NEW: Function to get full details for one job by its ID
export const getJobById = async (id) => {
    try {
        const response = await axios.get(`${API_URL}/${id}`);
        return response.data.job; // The backend sends { job: ... }
    } catch (error) {
        console.error(`Error fetching job with id ${id}:`, error);
        return null;
    }
    
};

// NEW: Function to get job statistics
export const getJobStats = async () => {
    try {
        const response = await axios.get(`${API_URL}/stats`);
        return response.data;
    } catch (error) {
        console.error('Error fetching job stats:', error);
        return { newJobsToday: 0 };
    }
};
