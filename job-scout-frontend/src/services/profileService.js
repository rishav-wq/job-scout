// In src/services/profileService.js
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1/profile';

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