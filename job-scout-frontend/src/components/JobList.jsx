// In src/components/JobList.jsx
import React, { useState } from 'react';
import JobCard from './JobCard';
import Modal from 'react-modal'; // Import the Modal component

// Define custom styles for the modal
const customModalStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '800px',
    maxHeight: '80vh',
    padding: '2rem',
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)'
  }
};

// This line is important for accessibility
Modal.setAppElement('#root');

function JobList({ jobs }) {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  const openModal = (job) => {
    setSelectedJob(job);
    setModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setSelectedJob(null);
  };

  return (
    <>
      <div className="job-list">
        {jobs.map((job) => (
          // Pass the openModal function down to each card
          <JobCard key={job._id || job.url} job={job} onViewDetails={openModal} />
        ))}
      </div>

      {/* The Modal Component */}
      {selectedJob && (
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          style={customModalStyles}
          contentLabel="Job Details Modal"
        >
          <h2>{selectedJob.title}</h2>
          <h3>{selectedJob.company}</h3>
          <p className="location">{selectedJob.location}</p>
          <hr />
          {/* Use pre-wrap to preserve line breaks from the description */}
          <p style={{ whiteSpace: 'pre-wrap' }}>{selectedJob.description}</p>
          <button onClick={closeModal} className="details-btn" style={{marginTop: '1rem'}}>Close</button>
        </Modal>
      )}
    </>
  );
}

export default JobList;