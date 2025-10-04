// In src/pages/HomePage.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
// 1. Import BOTH service functions
import { getAllJobs, getJobStats } from '../services/jobService';
import '../App.css';

// --- Import all the logos ---
import atlassianLogo from '../assets/atlassian.png';
import microsoftLogo from '../assets/microsoft.png';
import googleLogo from '../assets/google.png';
import metaLogo from '../assets/meta.png';
import uberLogo from '../assets/uber.png';
import appleLogo from '../assets/apple.png';
import paytmLogo from '../assets/paytm.png';
import adobeLogo from '../assets/adobe.png';
import amazonLogo from '../assets/amazon.png';
import mmtLogo from '../assets/mmt.jpg';
import scc from '../assets/scc.png';
import flipkartLogo from '../assets/flipkart.png';
import cashfreeLogo from '../assets/cashfree.jpg';
import intuitLogo from '../assets/intuit.jpg';
import phonepeLogo from '../assets/phonepe.jpg';
import serviceNowLogo from '../assets/servicenow.png';
import zoominfoLogo from '../assets/zoom.jpg';
import hitachiLogo from '../assets/hitachi.png';
import boeingLogo from '../assets/boeing.jpg';
import qualcommLogo from '../assets/qualcomm.jpg';

// --- Create logo map ---
const logoMap = {
    'Atlassian': atlassianLogo,
    'Microsoft': microsoftLogo,
    'Google': googleLogo,
    'Meta': metaLogo,
    'Uber': uberLogo,
    'Apple': appleLogo,
    'Paytm': paytmLogo,
    'Adobe': adobeLogo,
    'Amazon': amazonLogo,
    'MakeMyTrip': mmtLogo,
    'Standard Chartered': scc,
    'Flipkart': flipkartLogo,
    'Cashfree Payments': cashfreeLogo,
    'Intuit': intuitLogo,
    'PhonePe': phonepeLogo,
    'ServiceNow': serviceNowLogo,
    'Zoominfo': zoominfoLogo,
    'Hitachi': hitachiLogo,
    'Boeing': boeingLogo,
    'Qualcomm': qualcommLogo
};

function HomePage() {
    const [companies, setCompanies] = useState([]);
    const [stats, setStats] = useState({ newJobsToday: 0 }); 
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadHomePageData = async () => {
            setLoading(true);
            try {
                // 2. Fetch BOTH companies and stats
                const [jobsData, statsData] = await Promise.all([
                    getAllJobs(),
                    getJobStats()
                ]);
                
                const companyNames = [...new Set(jobsData.jobs.map(job => job.company))];
                setCompanies(companyNames);
                setStats(statsData); // 3. Set the stats state
            } catch (error) {
                console.error("Failed to load home page data:", error);
            } finally {
                setLoading(false);
            }
        };
        
        loadHomePageData();
    }, []);

    return (
        <div className="company-list-container">
            <h2 className="company-heading">Select a Company</h2>
            
            {/* Notification banner - now will actually show when there are new jobs */}
            {!loading && stats.newJobsToday > 0 && (
                <div className="notification-banner">
                    🎉 {stats.newJobsToday} new jobs were added today! Check them out.
                </div>
            )}
            
            {loading ? <p>Loading companies...</p> : (
                <div className="company-list">
                    {companies.map(company => (
                        <Link to={`/jobs/${company}`} key={company} className="company-card">
                            <img src={logoMap[company]} alt={`${company} logo`} className="company-logo" />
                            <span>{company}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default HomePage;