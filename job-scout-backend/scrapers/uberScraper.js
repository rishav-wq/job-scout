// scrapers/uberScraper.js
const puppeteer = require('puppeteer');

function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

async function autoScroll(page, scrolls = 10) {
    try {
        for (let i = 0; i < scrolls; i++) {
            await page.evaluate(() => {
                window.scrollBy(0, window.innerHeight);
            });
            await delay(500);
        }
        await page.evaluate(() => window.scrollTo(0, 0));
        await delay(1000);
    } catch (error) {
        console.log('Scroll error (non-critical):', error.message);
    }
}

async function scrapeUber(url) {
    let browser;
    try {
        console.log('Launching browser for Uber...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        console.log(`Navigating to Uber careers at ${url}...`);
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });

        console.log('Waiting for page to load...');
        await delay(5000);

        // Take screenshot for debugging
        try {
            await page.screenshot({ path: 'uber_debug.png', fullPage: false });
            console.log('Screenshot saved as uber_debug.png');
        } catch (e) {
            console.log('Could not save screenshot');
        }

        console.log('Scrolling page to load jobs...');
        await autoScroll(page, 15);

        // Wait for job listings - based on the screenshot
        let jobSelector = 'a.css-fYOjwv';
        try {
            await page.waitForSelector(jobSelector, { timeout: 15000 });
            console.log('Job listings found with primary selector!');
        } catch (e) {
            console.log('Primary selector not found, trying alternate...');
            jobSelector = 'a[href*="/careers/list/"]';
            await page.waitForSelector(jobSelector, { timeout: 10000 });
            console.log('Found jobs with alternate selector!');
        }

        console.log('Extracting Uber job data...');
        const jobs = await page.evaluate(() => {
            const jobData = [];
            
            // Strategy 1: Find job cards by the link class
            let jobLinks = Array.from(document.querySelectorAll('a[class*="css-fYOjwv"]'));
            
            // Strategy 2: Fallback to href pattern
            if (jobLinks.length === 0) {
                jobLinks = Array.from(document.querySelectorAll('a[href*="/careers/list/"]'));
            }
            
            console.log(`Found ${jobLinks.length} potential job links`);
            
            jobLinks.forEach((link, index) => {
                try {
                    const href = link.getAttribute('href');
                    
                    // Skip invalid links
                    if (!href || !href.includes('/careers/list/')) {
                        return;
                    }
                    
                    // Make full URL
                    const fullUrl = href.startsWith('http') ? href : `https://www.uber.com${href}`;
                    
                    // Extract job title - it's in a span inside the link
                    let title = '';
                    const titleSpan = link.querySelector('span');
                    if (titleSpan) {
                        title = titleSpan.innerText?.trim();
                    }
                    
                    // Fallback: get from aria-label
                    if (!title && link.hasAttribute('aria-label')) {
                        title = link.getAttribute('aria-label');
                    }
                    
                    // Skip if no title or invalid title
                    if (!title || title.length < 5 || title.toLowerCase() === 'all teams') {
                        return;
                    }
                    
                    // Extract location - look in parent containers
                    let location = 'Location not specified';
                    
                    // The job card structure: link is inside nested divs
                    // Location is typically in a sibling div
                    let container = link.parentElement;
                    
                    // Go up a few levels to find the row container
                    for (let i = 0; i < 4 && container; i++) {
                        // Look for location indicators in this container
                        const allDivs = container.querySelectorAll('div');
                        
                        for (let div of allDivs) {
                            const text = div.innerText?.trim();
                            
                            // Location patterns
                            if (text && 
                                text !== title && 
                                text.length < 150 &&
                                (text.includes(',') || 
                                 text.toLowerCase().includes('india') ||
                                 text.toLowerCase().includes('bangalore') ||
                                 text.toLowerCase().includes('hyderabad') ||
                                 text.toLowerCase().includes('san francisco') ||
                                 text.toLowerCase().includes('california') ||
                                 text.toLowerCase().includes('washington') ||
                                 text.toLowerCase().includes('remote') ||
                                 text.toLowerCase().includes('hybrid'))) {
                                location = text;
                                break;
                            }
                        }
                        
                        if (location !== 'Location not specified') break;
                        container = container.parentElement;
                    }
                    
                    // Extract team/sub-team
                    let team = 'Not specified';
                    const parentDiv = link.closest('div[class*="css-"]');
                    if (parentDiv) {
                        const allText = parentDiv.innerText;
                        const lines = allText.split('\n').map(l => l.trim()).filter(l => l);
                        
                        // Team is usually listed as "Sub-Team" or similar
                        for (let line of lines) {
                            if (line !== title && 
                                line !== location && 
                                line.length < 100 &&
                                (line.toLowerCase().includes('backend') ||
                                 line.toLowerCase().includes('frontend') ||
                                 line.toLowerCase().includes('engineering') ||
                                 line.toLowerCase().includes('product') ||
                                 line.toLowerCase().includes('design') ||
                                 line.toLowerCase().includes('data'))) {
                                team = line;
                                break;
                            }
                        }
                    }

                    jobData.push({
                        title: title,
                        url: fullUrl,
                        location: location,
                        team: team
                    });
                    
                } catch (error) {
                    console.log(`Error parsing job ${index}:`, error.message);
                }
            });

            // Remove duplicates
            const uniqueJobs = [];
            const seenUrls = new Set();
            
            jobData.forEach(job => {
                if (!seenUrls.has(job.url)) {
                    seenUrls.add(job.url);
                    uniqueJobs.push(job);
                }
            });

            return uniqueJobs;
        });

        console.log(`Successfully scraped ${jobs.length} Uber jobs.`);
        
        // Log sample jobs
        if (jobs.length > 0) {
            console.log('Sample jobs:');
            jobs.slice(0, 3).forEach((job, idx) => {
                console.log(`${idx + 1}. ${job.title} - ${job.location}`);
            });
        }

        return jobs;

    } catch (error) {
        console.error('Error scraping Uber:', error.message);
        console.error('Stack trace:', error.stack);
        return [];
    } finally {
        if (browser) {
            console.log('Closing Uber browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeUber;