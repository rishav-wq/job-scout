// In scrapers/atlassianScraper.js
const puppeteer = require('puppeteer');

async function scrapeAtlassian(url) {
    let browser;
    try {
        console.log('Launching browser...');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        
        const page = await browser.newPage();
        console.log(`Navigating to ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        const cookieSelector = '#onetrust-accept-btn-handler';
        try {
            await page.waitForSelector(cookieSelector, { timeout: 5000 });
            await page.click(cookieSelector);
            console.log('Clicked cookie consent button.');
        } catch (error) {
            console.log('Cookie consent banner not found or already accepted.');
        }

        // --- NEW RESILIENT LOGIC ---
        const divSelector = 'div[data-testid="job-listing"]';
        const tableSelector = 'table'; // A simple selector for the table

        console.log('Waiting for either DIV layout or TABLE layout to appear...');
        // Promise.race waits for the first promise to resolve or reject.
        await Promise.race([
            page.waitForSelector(divSelector, { timeout: 15000 }),
            page.waitForSelector(tableSelector, { timeout: 15000 })
        ]);
        console.log('A job layout has appeared. Scraping data...');
        // --- END OF NEW LOGIC ---

        // STEP 1: Get all job listings (title, URL, location)
        const jobListings = await page.evaluate((divSel, tableSel) => {
            const jobData = [];
            
            // First, try to scrape the DIV layout
            let jobElements = document.querySelectorAll(divSel);
            if (jobElements.length > 0) {
                jobElements.forEach(element => {
                    const titleElement = element.querySelector('h5 a');
                    const locationElement = element.querySelector('span');
                    if (titleElement && locationElement) {
                        jobData.push({
                            title: titleElement.innerText.trim(),
                            url: titleElement.href,
                            location: locationElement.innerText.trim(), 
                        });
                    }
                });
            } 
            // If the DIV layout wasn't found, scrape the TABLE layout
            else {
                // Each 'tr' in the 'tbody' is a job row
                jobElements = document.querySelectorAll(`${tableSel} tbody tr`);
                jobElements.forEach(row => {
                    const titleElement = row.querySelector('td:first-child a');
                    const locationElement = row.querySelector('td:nth-child(2)'); // Location is the second cell
                    if (titleElement && locationElement) {
                        jobData.push({
                            title: titleElement.innerText.trim(),
                            url: titleElement.href,
                            location: locationElement.innerText.trim(),
                        });
                    }
                });
            }
            return jobData;
        }, divSelector, tableSelector); // Pass our selectors into the function

        console.log(`Found ${jobListings.length} job listings. Now extracting descriptions...`);

        // STEP 2: Visit each job page and extract the description
        const jobs = [];
        for (let i = 0; i < jobListings.length; i++) {
            const job = jobListings[i];
            try {
                console.log(`Scraping job ${i + 1}/${jobListings.length}: ${job.title}`);
                await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 30000 });
                
                // Wait a bit longer for dynamic content to load
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const description = await page.evaluate(() => {
                    // Try multiple selectors to find the description
                    let descElement = document.querySelector('section.wpl_job-posting-detail');
                    
                    if (!descElement) {
                        descElement = document.querySelector('[class*="job-posting-detail"]');
                    }
                    
                    if (!descElement) {
                        descElement = document.querySelector('main');
                    }

                    // Also try getting the entire body if nothing else works
                    if (!descElement || !descElement.innerText.trim()) {
                        descElement = document.body;
                    }
                    
                    if (descElement) {
                        // Get all text content, preserving basic structure
                        const text = descElement.innerText.trim();
                        console.log(`Description length: ${text.length} characters`);
                        return text;
                    }
                    return 'No description available.';
                });
                
                console.log(`  ✓ Extracted description: ${description.length} characters`);
                
                jobs.push({
                    ...job,
                    description: description
                });
                
                // Small delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`Error scraping description for ${job.title}:`, error.message);
                jobs.push({
                    ...job,
                    description: 'Description could not be extracted.'
                });
            }
        }

        console.log(`Successfully scraped ${jobs.length} Atlassian jobs with descriptions.`);
        return jobs;

    } catch (error) {
        console.error('Error scraping Atlassian:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeAtlassian;