// In src/services/jobService.js
import axios from 'axios';

// Use environment variable or fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1/jobs';

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