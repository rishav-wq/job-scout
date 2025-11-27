import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const MatchesPage = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterScore, setFilterScore] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [aiProvider, setAiProvider] = useState('chatgpt');
  const navigate = useNavigate();

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await axios.get('https://job-scout-1.onrender.com/api/v1/jobs');
      
      // The API returns the array directly
      const jobsData = Array.isArray(response.data) ? response.data : response.data.jobs || [];
      
      // Filter jobs that have been scored (matchScore >= 0) and sort by score
      const scoredJobs = jobsData
        .filter(job => job.matchScore >= 0)
        .sort((a, b) => b.matchScore - a.matchScore);
      
      setJobs(scoredJobs);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e'; // Excellent - Green
    if (score >= 60) return '#eab308'; // Good - Yellow
    if (score >= 40) return '#f97316'; // Fair - Orange
    return '#ef4444'; // Poor - Red
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Good Match';
    if (score >= 40) return 'Fair Match';
    return 'Low Match';
  };

  const getScoreEmoji = (score) => {
    if (score >= 80) return '🟢';
    if (score >= 60) return '🟡';
    if (score >= 40) return '🟠';
    return '🔴';
  };

  const handleTailorResume = (job, aiProvider = 'chatgpt') => {
    // Create a detailed prompt for AI to tailor the resume
    const prompt = `I'm applying for the following job and need help tailoring my resume:

**Job Title:** ${job.title}
**Company:** ${job.company}
**Location:** ${job.location || 'Not specified'}

**Job Description:**
${job.description || 'Please analyze the job requirements from the title and company.'}

**Instructions:**
1. Analyze the job requirements and key skills needed
2. Suggest specific modifications to highlight relevant experience
3. Recommend keywords to include for ATS optimization
4. Provide a tailored professional summary
5. Suggest how to reframe experiences to match this role

Please provide actionable advice for tailoring my resume for this specific position.`;

    // URL encode the prompt
    const encodedPrompt = encodeURIComponent(prompt);
    
    // Open in selected AI provider
    if (aiProvider === 'chatgpt') {
      window.open(`https://chat.openai.com/?q=${encodedPrompt}`, '_blank');
    } else if (aiProvider === 'gemini') {
      // Gemini doesn't support pre-filled prompts in URL, so copy to clipboard
      navigator.clipboard.writeText(prompt).then(() => {
        alert('Resume tailoring prompt copied! Opening Gemini...');
        window.open('https://gemini.google.com/', '_blank');
      });
    }
  };

  const filteredJobs = jobs.filter(job => {
    const scoreMatch = job.matchScore >= filterScore;
    const companyMatch = selectedCompany === 'all' || job.company === selectedCompany;
    return scoreMatch && companyMatch;
  });

  const companies = [...new Set(jobs.map(job => job.company))].sort();

  const stats = {
    excellent: jobs.filter(j => j.matchScore >= 80).length,
    good: jobs.filter(j => j.matchScore >= 60 && j.matchScore < 80).length,
    fair: jobs.filter(j => j.matchScore >= 40 && j.matchScore < 60).length,
    poor: jobs.filter(j => j.matchScore > 0 && j.matchScore < 40).length,
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your personalized matches...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <h2>Error loading matches</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="matches-page">
      <div className="matches-header">
        <div className="header-content">
          <h1>🎯 My Job Matches</h1>
          <p className="subtitle">
            Jobs ranked by how well they match your resume
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="stats-grid">
          <div className="stat-card excellent">
            <div className="stat-icon">🟢</div>
            <div className="stat-content">
              <div className="stat-number">{stats.excellent}</div>
              <div className="stat-label">Excellent (80-100%)</div>
            </div>
          </div>
          <div className="stat-card good">
            <div className="stat-icon">🟡</div>
            <div className="stat-content">
              <div className="stat-number">{stats.good}</div>
              <div className="stat-label">Good (60-79%)</div>
            </div>
          </div>
          <div className="stat-card fair">
            <div className="stat-icon">🟠</div>
            <div className="stat-content">
              <div className="stat-number">{stats.fair}</div>
              <div className="stat-label">Fair (40-59%)</div>
            </div>
          </div>
          <div className="stat-card poor">
            <div className="stat-icon">🔴</div>
            <div className="stat-content">
              <div className="stat-number">{stats.poor}</div>
              <div className="stat-label">Poor (1-39%)</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Minimum Match Score:</label>
            <select 
              value={filterScore} 
              onChange={(e) => setFilterScore(Number(e.target.value))}
              className="filter-select"
            >
              <option value={0}>All Matches</option>
              <option value={80}>80%+ (Excellent)</option>
              <option value={60}>60%+ (Good or Better)</option>
              <option value={40}>40%+ (Fair or Better)</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Company:</label>
            <select 
              value={selectedCompany} 
              onChange={(e) => setSelectedCompany(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Companies</option>
              {companies.map(company => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>AI Resume Tailor:</label>
            <select 
              value={aiProvider} 
              onChange={(e) => setAiProvider(e.target.value)}
              className="filter-select"
            >
              <option value="chatgpt">ChatGPT</option>
              <option value="gemini">Google Gemini</option>
            </select>
          </div>

          <div className="results-count">
            Showing {filteredJobs.length} of {jobs.length} matches
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="matches-content">
        {filteredJobs.length === 0 ? (
          <div className="no-matches">
            <h3>No matches found</h3>
            <p>Try adjusting your filters</p>
          </div>
        ) : (
          <div className="jobs-grid">
            {filteredJobs.map((job) => (
              <div key={job._id} className="match-card">
                {/* Match Score Badge */}
                <div 
                  className="match-score-badge"
                  style={{ backgroundColor: getScoreColor(job.matchScore) }}
                >
                  <span className="score-emoji">{getScoreEmoji(job.matchScore)}</span>
                  <span className="score-number">{job.matchScore}%</span>
                </div>

                <div className="match-card-content">
                  <h3 className="job-title">{job.title}</h3>
                  <div className="company-name">{job.company}</div>
                  
                  <div className="match-label" style={{ color: getScoreColor(job.matchScore) }}>
                    {getScoreLabel(job.matchScore)}
                  </div>

                  {job.location && (
                    <div className="job-detail">
                      <span className="detail-icon">📍</span>
                      <span>{job.location}</span>
                    </div>
                  )}

                  {job.type && (
                    <div className="job-detail">
                      <span className="detail-icon">💼</span>
                      <span>{job.type}</span>
                    </div>
                  )}

                  {job.posted && (
                    <div className="job-detail">
                      <span className="detail-icon">📅</span>
                      <span>Posted: {new Date(job.posted).toLocaleDateString()}</span>
                    </div>
                  )}

                  {job.description && (
                    <div className="job-description">
                      <p>{job.description.substring(0, 200)}...</p>
                    </div>
                  )}

                  <div className="card-actions">
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="apply-btn"
                    >
                      Apply Now →
                    </a>
                    <button 
                      className="tailor-btn"
                      onClick={() => handleTailorResume(job, aiProvider)}
                      title="Get AI help to tailor your resume for this job"
                    >
                      ✨ Tailor Resume
                    </button>
                    <button 
                      className="view-btn"
                      onClick={() => navigate(`/jobs/${job.company}`)}
                    >
                      View All {job.company} Jobs
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchesPage;
