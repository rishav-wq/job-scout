// In src/services/jobService.js
import axios from 'axios';

// CORRECTED: Pointing to port 8000 and the correct v1 path
const API_URL = 'https://job-scout-backend-4zvq.onrender.com/api/v1/jobs';

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
