// In src/pages/HomePage.jsx
import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllJobs } from '../services/jobService';
import '../App.css';

// --- NEW: Import all the logos ---
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
// ------------------------------------

// --- NEW: Create a map to link names to logos ---
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
    'ServiceNow': serviceNowLogo
};
// ------------------------------------------------

function HomePage() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getCompanies = async () => {
            const data = await getAllJobs();
            const companyNames = [...new Set(data.jobs.map(job => job.company))];
            setCompanies(companyNames);
            setLoading(false);
        };
        getCompanies();
    }, []);

    return (
        <div className="company-list-container">
            <h2 className="company-heading">Select a Company</h2>
            {loading ? <p>Loading companies...</p> : (
                <div className="company-list">
                    {companies.map(company => (
                        // We use the company name to look up the correct logo in our map
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