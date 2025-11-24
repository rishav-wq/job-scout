// In src/components/JobCard.jsx
import React from 'react';

function JobCard({ job, onViewDetails }) {
  return (
    <div className="job-card">
      {/* NEW: Conditionally render the Match Score badge */}
      {job.matchScore > 0 && (
        <div className="match-score">
          ✨ {Math.round(job.matchScore)}% Match
        </div>
      )}

      <h2>{job.title}</h2>
      <h3>{job.company}</h3>
      <p className="location">{job.location}</p>
      <div className="card-buttons">
        <a href={job.url} target="_blank" rel="noopener noreferrer" className="apply-btn">
          Apply Now
        </a>
        <button onClick={() => onViewDetails(job)} className="details-btn">
          View Details
        </button>
      </div>
    </div>
  );
}

export default JobCard;