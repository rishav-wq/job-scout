// In src/services/profileService.js
import axios from 'axios';

// Determine API URL based on environment
const getApiBaseUrl = () => {
    // Check if we have env variable
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    
    // Check if we're in production (Vercel deployment)
    if (window.location.hostname.includes('vercel.app') || 
        window.location.hostname.includes('onrender.com')) {
        return 'https://job-scout-1.onrender.com/api/v1';
    }
    
    // Default to localhost for development
    return 'http://localhost:8000/api/v1';
};

const API_BASE_URL = getApiBaseUrl();
const API_URL = `${API_BASE_URL}/profile`;

/**
 * Uploads a resume file to the backend.
 * @param {File} file The resume file to upload.
 */
const uploadResume = async (file) => {
    // We need to use FormData to send files to the server
    const formData = new FormData();
    formData.append('resume', file); // 'resume' must match the field name in profileRoutes.js

    try {
        const response = await axios.post(`${API_URL}/resume`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        // Axios wraps the actual error response in error.response
        console.error('Error uploading resume:', error.response?.data || error.message);
        throw error.response?.data || { msg: 'An unknown error occurred' };
    }
};

export { uploadResume };
