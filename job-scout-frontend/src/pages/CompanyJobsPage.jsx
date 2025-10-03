import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAllJobs } from '../services/jobService';
import JobList from '../components/JobList';
import FilterBar from '../components/FilterBar';
import '../App.css';

function CompanyJobsPage() {
    const [allJobs, setAllJobs] = useState([]); // Holds the original, unfiltered list
    const [loading, setLoading] = useState(true);
    const { companyName } = useParams();

    // Create state to hold the current filter values
    const [filters, setFilters] = useState({
        title: '',
        location: '',
    });

    useEffect(() => {
        const getJobs = async () => {
            setLoading(true);
            const data = await getAllJobs();
            const filteredJobs = data.jobs.filter(job => job.company === companyName);
            setAllJobs(filteredJobs); // Store the full list for this company
            setLoading(false);
        };
        getJobs();
    }, [companyName]);

    // Create a memoized list of jobs to display
    const filteredJobs = useMemo(() => {
        return allJobs.filter(job => {
            const titleMatch = job.title.toLowerCase().includes(filters.title.toLowerCase());
            const locationMatch = job.location.toLowerCase().includes(filters.location.toLowerCase());
            return titleMatch && locationMatch;
        });
    }, [allJobs, filters]);


    const sortJobsByMatch = () => {
        const sortedJobs = [...allJobs].sort((a, b) => b.matchScore - a.matchScore);
        setAllJobs(sortedJobs); // Sort the original list
    };

    return (
        <div>
            <Link to="/" className="back-link">← Back to Companies</Link>
            <h2 className="company-heading">{companyName} Jobs</h2>
            
            <div className="controls-container">
                <FilterBar filters={filters} setFilters={setFilters} />
                <div className="sort-container">
                    <button onClick={sortJobsByMatch} className="sort-btn">
                        Sort by Best Match ✨
                    </button>
                </div>
            </div>

            {loading ? <p>Loading jobs...</p> : (
                <>
                    <p className="results-count">{filteredJobs.length} jobs found</p>
                    <JobList jobs={filteredJobs} />
                </>
            )}
        </div>
    );
}

export default CompanyJobsPage;