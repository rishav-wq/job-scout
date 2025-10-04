import React, { useState, useEffect, useRef } from 'react';
import JobCard from './JobCard';
import Modal from 'react-modal';
import { startTailoring, getTaskStatus } from '../services/resumeService';
import { getJobById } from '../services/jobService'; // Import the service to fetch single job details

const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '800px',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    backgroundColor: '#fff',
    border: 'none',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  }
};

Modal.setAppElement('#root');

function JobList({ jobs }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false); // State for job details loading

  // State for resume tailoring
  const [tailoringTask, setTailoringTask] = useState(null); // { taskId, jobId, status, downloadUrl }
  const pollingInterval = useRef(null);

  // Function to open the job details modal and fetch full description
  const openModal = async (job) => {
    setIsLoadingDetails(true); // Start loading for job details
    setModalIsOpen(true);
    // Fetch the full job details including the description
    const fullJobDetails = await getJobById(job._id);
    setSelectedJob(fullJobDetails);
    setIsLoadingDetails(false); // End loading for job details
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setTimeout(() => setSelectedJob(null), 300); // Clear selected job after modal closes
  };

  // Function to start the tailoring process
  const handleTailorResume = async (job) => {
    if (tailoringTask?.status === 'processing') return; // Don't start a new one if one is running

    try {
      const { taskId } = await startTailoring(job._id);
      setTailoringTask({ taskId, jobId: job._id, status: 'processing' });
    } catch (error) {
      alert('Failed to start resume tailoring process.');
      console.error('Tailoring error:', error);
    }
  };

  // useEffect to handle the polling for tailoring status
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
          console.error('Polling error:', error);
        }
      }, 5000); // Poll every 5 seconds
    }

    // Cleanup interval on component unmount or when tailoringTask changes
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [tailoringTask]);

  return (
    <>
      <div className="job-list">
        {jobs.map((job) => (
          <JobCard
            key={job._id || job.url}
            job={job}
            onViewDetails={openModal}
            onTailorResume={handleTailorResume} // Pass to JobCard
          />
        ))}
      </div>

      {/* Modal for Job Details */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={customModalStyles}
        contentLabel="Job Details Modal"
      >
        {isLoadingDetails ? (
          <div className="loader"></div> // Loading spinner for job details
        ) : selectedJob ? (
          <>
            <h2>{selectedJob.title}</h2>
            <h3>{selectedJob.company}</h3>
            <p className="location">{selectedJob.location}</p>
            <hr />
            {/* The description will now be present from the getJobById call */}
            <p style={{ whiteSpace: 'pre-wrap' }}>{selectedJob.description}</p>
            <button onClick={closeModal} className="details-btn" style={{ marginTop: '1rem' }}>Close</button>
          </>
        ) : null}
      </Modal>

      {/* Modal to show the tailoring status (appears when tailoringTask is active) */}
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
              {/* Ensure this URL correctly points to your backend for download */}
              <a href={`https://job-scout-1.onrender.com${tailoringTask.downloadUrl}`} download className="apply-btn">
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
