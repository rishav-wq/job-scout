// In src/services/jobService.js
import axios from 'axios';

// Hardcoded production URL for immediate fix
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