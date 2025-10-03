// In src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { uploadResume } from '../services/profileService';
import '../App.css'; // Reusing styles

function ProfilePage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [status, setStatus] = useState(''); // 'uploading', 'success', 'error'
    const [message, setMessage] = useState('');

    const handleFileChange = (event) => {
        setSelectedFile(event.target.files[0]);
        setStatus('');
        setMessage('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!selectedFile) {
            setMessage('Please select a file first.');
            setStatus('error');
            return;
        }

        setStatus('uploading');
        setMessage('Uploading and processing...');

        try {
            const response = await uploadResume(selectedFile);
            setStatus('success');
            setMessage(response.msg);
        } catch (error) {
            setStatus('error');
            setMessage(error.msg || 'Failed to upload resume.');
        }
    };

    return (
        <div className="profile-container">
            <h2 className="company-heading">Your Profile</h2>
            <form onSubmit={handleSubmit} className="upload-form">
                <h3>Upload Your Base Resume</h3>
                <p>Upload a PDF or DOCX file. This will be used to calculate match scores for jobs.</p>
                <input type="file" accept=".pdf,.docx" onChange={handleFileChange} />
                <button type="submit" className="apply-btn" disabled={status === 'uploading'}>
                    {status === 'uploading' ? 'Uploading...' : 'Upload Resume'}
                </button>
            </form>

            {/* Display status messages to the user */}
            {message && (
                <div className={`status-message ${status}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

export default ProfilePage;