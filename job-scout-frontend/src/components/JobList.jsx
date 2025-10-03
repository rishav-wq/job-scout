import React, { useState, useEffect, useRef } from 'react';
import JobCard from './JobCard';
import Modal from 'react-modal';
import { startTailoring, getTaskStatus } from '../services/resumeService';

const customModalStyles = { /* ... (keep the existing modal styles) ... */ };

Modal.setAppElement('#root');

function JobList({ jobs }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // --- NEW STATE FOR TAILORING ---
  const [tailoringTask, setTailoringTask] = useState(null); // { taskId, jobId, status, downloadUrl }
  const pollingInterval = useRef(null);
  // --------------------------------

  const openModal = (job) => {
    setSelectedJob(job);
    setModalIsOpen(true);
  };
  const closeModal = () => setModalIsOpen(false);

  // --- NEW: Function to start the tailoring process ---
  const handleTailorResume = async (job) => {
    if (tailoringTask?.status === 'processing') return; // Don't start a new one if one is running

    try {
      const { taskId } = await startTailoring(job._id);
      setTailoringTask({ taskId, jobId: job._id, status: 'processing' });
    } catch (error) {
      alert('Failed to start resume tailoring process.');
    }
  };

  // --- NEW: useEffect to handle the polling ---
  useEffect(() => {
    if (tailoringTask?.status === 'processing' && tailoringTask.taskId) {
      pollingInterval.current = setInterval(async () => {
        try {
          const { status, downloadUrl } = await getTaskStatus(tailoringTask.taskId);
          if (status === 'completed' || status === 'failed') {
            clearInterval(pollingInterval.current);
            setTailoringTask(prev => ({ ...prev, status, downloadUrl }));
          }
        } catch (error) {
          clearInterval(pollingInterval.current);
          setTailoringTask(prev => ({ ...prev, status: 'failed' }));
        }
      }, 5000); // Poll every 5 seconds
    }

    // Cleanup interval on component unmount
    return () => clearInterval(pollingInterval.current);
  }, [tailoringTask]);

  return (
    <>
      <div className="job-list">
        {jobs.map((job) => (
          <JobCard
            key={job._id || job.url}
            job={job}
            onViewDetails={openModal}
            onTailorResume={handleTailorResume}
          />
        ))}
      </div>

      {selectedJob && (
        <Modal isOpen={modalIsOpen} onRequestClose={closeModal} style={customModalStyles}>
          {/* ... (keep existing modal content) ... */}
        </Modal>
      )}

      {/* NEW: Modal to show the tailoring status */}
      {tailoringTask && (
        <Modal isOpen={true} style={customModalStyles} contentLabel="Resume Tailoring Status">
          <h2>AI Resume Tailoring</h2>
          <hr />
          {tailoringTask.status === 'processing' && (
            <div>
              <p>Your resume is being tailored... This may take up to a minute.</p>
              <div className="loader"></div>
            </div>
          )}
          {tailoringTask.status === 'completed' && (
            <div>
              <p>✅ Your tailored resume is ready!</p>
              <a href={`http://localhost:8000${tailoringTask.downloadUrl}`} download className="apply-btn">
                Download Now
              </a>
              <button onClick={() => setTailoringTask(null)} className="details-btn" style={{ marginLeft: '1rem' }}>
                Close
              </button>
            </div>
          )}
          {tailoringTask.status === 'failed' && (
            <div>
              <p>❌ Something went wrong. Please try again.</p>
              <button onClick={() => setTailoringTask(null)} className="details-btn">Close</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export default JobList;
