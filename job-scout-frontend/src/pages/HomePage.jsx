// In src/pages/HomePage.jsx
import React from 'react';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllJobs } from '../services/jobService';
import '../App.css';

// Import all company logos
import adobeLogo from '../assets/adobe.png';
import amazonLogo from '../assets/amazon.png';
import appleLogo from '../assets/apple.png';
import atlassianLogo from '../assets/atlassian.png';
import boeingLogo from '../assets/boeing.jpg';
import cashfreeLogo from '../assets/cashfree.jpg';
import flipkartLogo from '../assets/flipkart.png';
import googleLogo from '../assets/google.png';
import growwLogo from '../assets/groww.png';
import hitachiLogo from '../assets/hitachi.png';
import intuitLogo from '../assets/intuit.jpg';
import mmtLogo from '../assets/mmt.jpg';
import metaLogo from '../assets/meta.png';
import microsoftLogo from '../assets/microsoft.png';
import paytmLogo from '../assets/paytm.png';
import phonepeLogo from '../assets/phonepe.jpg';
import practoLogo from '../assets/practo.png';
import qualcommLogo from '../assets/qualcomm.jpg';
import sccLogo from '../assets/scc.png';
import servicenowLogo from '../assets/servicenow.png';
import uberLogo from '../assets/uber.png';
import zoomLogo from '../assets/zoom.jpg';

// Map company names to their logos
const logoMap = {
    'Adobe': adobeLogo,
    'Amazon': amazonLogo,
    'Apple': appleLogo,
    'Atlassian': atlassianLogo,
    'Boeing': boeingLogo,
    'Cashfree Payments': cashfreeLogo,
    'Flipkart': flipkartLogo,
    'Google': googleLogo,
    'Groww': growwLogo,
    'Hitachi': hitachiLogo,
    'Intuit': intuitLogo,
    'MakeMyTrip': mmtLogo,
    'Meta': metaLogo,
    'Microsoft': microsoftLogo,
    'Paytm': paytmLogo,
    'PhonePe': phonepeLogo,
    'Practo': practoLogo,
    'Qualcomm': qualcommLogo,
    'Standard Chartered': sccLogo,
    'ServiceNow': servicenowLogo,
    'Uber': uberLogo,
    'Zoominfo': zoomLogo,
};

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
            <h1>Discover Your Next Opportunity</h1>
            <p style={{ color: '#757575', marginBottom: '2rem', fontSize: '1.05rem' }}>
                Browse jobs from top tech companies tailored to your skills and experience
            </p>
            
            <h2 className="company-heading">Featured Companies</h2>
            {loading ? (
                <p style={{ textAlign: 'center', padding: '2rem', color: '#757575' }}>
                    Loading companies...
                </p>
            ) : (
                <div className="company-list">
                    {companies.map(company => (
                        <Link to={`/jobs/${company}`} key={company} className="company-card">
                            {logoMap[company] ? (
                                <img src={logoMap[company]} alt={`${company} logo`} className="company-logo" />
                            ) : (
                                <div style={{ 
                                    height: '60px', 
                                    display: 'flex', 
                                    alignItems: 'center',
                                    fontSize: '1.5rem',
                                    color: '#2557a7'
                                }}>
                                    🏢
                                </div>
                            )}
                            <span>{company}</span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default HomePage;