// scrapers/metaScraper.js
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
        // Scroll back to top to ensure all elements are in view
        await page.evaluate(() => window.scrollTo(0, 0));
        await delay(1000);
    } catch (error) {
        console.log('Scroll error (non-critical):', error.message);
    }
}

async function scrapeMeta(url) {
    let browser;
    try {
        console.log('Launching browser for Meta...');
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();
        
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });

        console.log('Navigating to Meta careers page...');
        await page.goto(url, { 
            waitUntil: 'domcontentloaded',
            timeout: 60000 
        });

        console.log('Waiting for page to load...');
        await delay(5000);

        // Take a screenshot for debugging
        try {
            await page.screenshot({ path: 'meta_debug.png', fullPage: false });
            console.log('Screenshot saved as meta_debug.png');
        } catch (e) {
            console.log('Could not save screenshot');
        }

        // Check if we're being blocked or redirected
        const currentUrl = page.url();
        console.log('Current URL:', currentUrl);
        
        const pageTitle = await page.title();
        console.log('Page title:', pageTitle);

        // Wait for job listings to appear - try multiple selectors
        let jobSelector = 'a.x1ydpohk.x1lkulvp';
        try {
            await page.waitForSelector(jobSelector, { timeout: 15000 });
            console.log('Job listings found with primary selector!');
        } catch (e) {
            console.log('Primary selector not found, trying alternate selectors...');
            try {
                jobSelector = 'a[href*="/jobs/"][class*="x1ydpohk"]';
                await page.waitForSelector(jobSelector, { timeout: 10000 });
                console.log('Found jobs with alternate selector!');
            } catch (e2) {
                console.log('Checking page content...');
                const content = await page.content();
                console.log('Page has', content.length, 'characters');
                
                // Try to find any job links
                jobSelector = 'a[href*="/jobs/"]';
                await page.waitForSelector(jobSelector, { timeout: 10000 });
            }
        }

        // Scroll to load more jobs
        console.log('Scrolling to load more jobs...');
        await autoScroll(page, 15);

        console.log('Extracting job data...');
        const jobs = await page.evaluate(() => {
            const jobData = [];
            
            // Find all job links - use multiple strategies
            let jobLinks = Array.from(document.querySelectorAll('a[class*="x1ydpohk"][class*="x1lkulvp"]'));
            
            if (jobLinks.length === 0) {
                console.log('Trying alternate selector...');
                jobLinks = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
            }
            
            console.log(`Found ${jobLinks.length} potential job links`);
            
            jobLinks.forEach((link, index) => {
                try {
                    const href = link.getAttribute('href');
                    
                    // Skip if not a valid job link or if it's a duplicate
                    if (!href || !href.includes('/jobs/')) {
                        return;
                    }
                    
                    // Make sure it's a full URL
                    const fullUrl = href.startsWith('http') ? href : `https://www.metacareers.com${href}`;
                    
                    // Find the job title
                    let title = '';
                    
                    // Strategy 1: Look for div with aria-hidden
                    const ariaDiv = link.querySelector('div[aria-hidden="true"]');
                    if (ariaDiv && ariaDiv.innerText) {
                        title = ariaDiv.innerText.trim();
                    }
                    
                    // Strategy 2: Look for any div with text inside the link
                    if (!title) {
                        const divs = link.querySelectorAll('div');
                        for (let div of divs) {
                            const text = div.innerText?.trim();
                            if (text && text.length > 10 && text.length < 200) {
                                title = text;
                                break;
                            }
                        }
                    }
                    
                    // Strategy 3: Use link text content
                    if (!title) {
                        title = link.textContent?.trim() || 'Unknown Position';
                    }
                    
                    if (!title || title.length < 5) {
                        return;
                    }
                    
                    // Extract location information
                    let location = 'Location not specified';
                    
                    // Look in parent container
                    let container = link.parentElement;
                    for (let i = 0; i < 3 && container; i++) {
                        const allText = container.innerText;
                        const lines = allText.split('\n');
                        
                        for (let line of lines) {
                            line = line.trim();
                            if (line && 
                                line !== title && 
                                line.length < 150 &&
                                (line.includes(',') || 
                                 line.toLowerCase().includes('india') ||
                                 line.toLowerCase().includes('remote') ||
                                 line.toLowerCase().includes('hybrid') ||
                                 line.toLowerCase().includes('on-site') ||
                                 line.toLowerCase().includes(' ca ') ||
                                 line.toLowerCase().includes('sunnyvale') ||
                                 line.toLowerCase().includes('angeles') ||
                                 line.toLowerCase().includes('location'))) {
                                location = line;
                                break;
                            }
                        }
                        
                        if (location !== 'Location not specified') break;
                        container = container.parentElement;
                    }
                    
                    // Extract category/team
                    let category = 'Not specified';
                    const parentDiv = link.closest('div');
                    if (parentDiv) {
                        const allText = parentDiv.innerText;
                        const lines = allText.split('\n');
                        
                        for (let line of lines) {
                            line = line.trim();
                            if (line &&
                                line !== title &&
                                line !== location &&
                                line.length < 100 &&
                                (line.toLowerCase().includes('engineering') ||
                                 line.toLowerCase().includes('software') ||
                                 line.toLowerCase().includes('connectivity') ||
                                 line.toLowerCase().includes('product') ||
                                 line.toLowerCase().includes('infrastructure'))) {
                                category = line;
                                break;
                            }
                        }
                    }

                    jobData.push({
                        title: title,
                        url: fullUrl,
                        location: location,
                        category: category
                    });
                    
                } catch (error) {
                    console.log(`Error parsing job ${index}:`, error.message);
                }
            });

            // Remove duplicates based on URL
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

        console.log(`Successfully scraped ${jobs.length} Meta jobs.`);
        
        // Log first few jobs for verification
        if (jobs.length > 0) {
            console.log('Sample jobs:');
            jobs.slice(0, 3).forEach((job, idx) => {
                console.log(`${idx + 1}. ${job.title} - ${job.location}`);
            });
        }

        return jobs;

    } catch (error) {
        console.error('Error scraping Meta:', error.message);
        console.error('Stack trace:', error.stack);
        return [];
    } finally {
        if (browser) {
            await browser.close();
            console.log('Browser closed.');
        }
    }
}

module.exports = scrapeMeta;