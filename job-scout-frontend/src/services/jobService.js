// In src/services/jobService.js
import axios from 'axios';

// Determine API URL based on environment
const getApiUrl = () => {
    // Check if we have env variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    // Check if we're in production (Vercel deployment)
    if (window.location.hostname.includes('vercel.app') || 
        window.location.hostname.includes('onrender.com')) {
        return 'https://job-scout-1.onrender.com/api/v1/jobs';
    }
    
    // Default to localhost for development
    return 'http://localhost:8000/api/v1/jobs';
};

const API_URL = getApiUrl();

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