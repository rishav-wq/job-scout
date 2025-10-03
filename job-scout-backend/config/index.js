const TARGET_COMPANIES = [
    {
        name: 'Atlassian',
        url: 'https://www.atlassian.com/company/careers/all-jobs?team=&location=India&search=',
        // We will add more properties here later, like the specific selectors
    },
    {
        name: 'Microsoft',
        url: 'https://jobs.careers.microsoft.com/global/en/search?lc=India&l=en_us',
    },
       {
        name: 'Meta',
        url: 'https://www.metacareers.com/jobs/?location[0]=India',
    },
    // --- ADD THIS NEW OBJECT ---
    {
        name: 'Uber',
        url: 'https://www.uber.com/in/en/careers/list/?locations=India',
    },
    {
        name: 'Apple',
        url: 'https://jobs.apple.com/en-in/search?location=india-IND',
    },
    {
        name: 'MakeMyTrip',
        url: 'https://careers.makemytrip.com/prod/jobs',
    },
     {
        name: 'Standard Chartered',
        url: 'https://jobs.standardchartered.com/content/Search-Result-Page/?keyword=&region=Asia&market=&area_of_interest=&job_type=&employment_type=early_careers&work_type=&date_posted=',
    },
    {
        name: 'Google',
        url: 'https://www.google.com/about/careers/applications/jobs/results/?location=India',
    },
    {
        name: 'Adobe', // Replaced Atlassian
        url: 'https://careers.adobe.com/us/en/c/engineering-and-product-jobs',
    },
    {
        name: 'Amazon',
        url: 'https://www.amazon.jobs/content/en/career-programs/university?country%5B%5D=IN#search'
    },

    {
        name: 'Paytm',
        url: 'https://jobs.lever.co/paytm',
    },
  
     {
        name: 'Flipkart',
        url: 'https://www.flipkartcareers.com/flipkart/jobslist',
    },
    {
    name: 'Cashfree Payments',
    url: 'https://www.cashfree.com/careers'
    },
    {
    name: 'Intuit',
    url: 'https://jobs.intuit.com/search-jobs'
    },
     {
        name: 'PhonePe',
        url: 'https://www.phonepe.com/careers/job-openings/',
    },
    {
        name: 'ServiceNow',
        url: 'https://careers.servicenow.com/jobs?search=&country=India&pagesize=20#results',
    },

];

module.exports = { TARGET_COMPANIES };
