import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAllJobs } from '../services/jobService';
import JobList from '../components/JobList';
import FilterBar from '../components/FilterBar';
import '../App.css';

function CompanyJobsPage() {
    const [allJobs, setAllJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { companyName } = useParams();

    const [filters, setFilters] = useState({
        title: '',
        location: '',
    });

    useEffect(() => {
        const getJobs = async () => {
            setLoading(true);
            const data = await getAllJobs();
            const filteredJobs = data.jobs.filter(job => job.company === companyName);
            setAllJobs(filteredJobs);
            setLoading(false);
        };
        getJobs();
    }, [companyName]);

    const filteredJobs = useMemo(() => {
        return allJobs.filter(job => {
            const titleMatch = job.title.toLowerCase().includes(filters.title.toLowerCase());
            const locationMatch = job.location.toLowerCase().includes(filters.location.toLowerCase());
            return titleMatch && locationMatch;
        });
    }, [allJobs, filters]);

    const sortJobsByMatch = () => {
        const sortedJobs = [...allJobs].sort((a, b) => b.matchScore - a.matchScore);
        setAllJobs(sortedJobs);
    };

    return (
        <div>
            <Link to="/" className="back-link">← Back to Companies</Link>
            <h1>{companyName} Careers</h1>
            <p style={{ color: '#757575', marginBottom: '2rem' }}>
                Explore open positions at {companyName}
            </p>
            
            <div className="controls-container">
                <FilterBar filters={filters} setFilters={setFilters} />
                <div className="sort-container">
                    <button onClick={sortJobsByMatch} className="sort-btn">
                        ✨ Best Match
                    </button>
                </div>
            </div>

            {loading ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#757575' }}>
                    Loading jobs...
                </p>
            ) : (
                <>
                    <p className="results-count">
                        <strong>{filteredJobs.length}</strong> jobs found
                    </p>
                    <JobList jobs={filteredJobs} />
                </>
            )}
        </div>
    );
}

export default CompanyJobsPage;