import React from 'react';

// The card now accepts an `onTailorResume` function
function JobCard({ job, onViewDetails, onTailorResume }) {
  const isTopMatch = job.matchScore >= 70;

  return (
    <div className="job-card">
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

      {/* NEW: Conditionally render the AI Tailor button for top matches */}
      {isTopMatch && (
        <div className="tailor-section">
          <button onClick={() => onTailorResume(job)} className="tailor-btn">
            🤖 AI Tailor Resume for this Job
          </button>
        </div>
      )}
    </div>
  );
}

export default JobCard;

