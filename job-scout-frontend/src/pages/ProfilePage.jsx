// In src/pages/ProfilePage.jsx
import React, { useState } from 'react';
import { uploadResume } from '../services/profileService';
import '../App.css';

function ProfilePage() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [status, setStatus] = useState('');
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
        setMessage('Uploading and processing your resume...');

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
            <h1>My Profile</h1>
            <p style={{ color: '#757575', marginBottom: '2rem' }}>
                Upload your resume to get personalized job matches
            </p>
            
            <form onSubmit={handleSubmit} className="upload-form">
                <h3>📄 Upload Your Resume</h3>
                <p>
                    Upload a PDF or DOCX file. We'll analyze your skills and experience to 
                    calculate match scores for all available positions.
                </p>
                
                <input 
                    type="file" 
                    accept=".pdf,.docx" 
                    onChange={handleFileChange}
                    id="resume-upload"
                />
                
                {selectedFile && (
                    <p style={{ color: '#2557a7', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                        Selected: {selectedFile.name}
                    </p>
                )}
                
                <button 
                    type="submit" 
                    className="apply-btn" 
                    disabled={status === 'uploading'}
                    style={{ marginTop: '1rem' }}
                >
                    {status === 'uploading' ? 'Uploading...' : 'Upload Resume'}
                </button>
            </form>

            {message && (
                <div className={`status-message ${status}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

export default ProfilePage;