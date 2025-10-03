// In scrapers/microsoftScraper.js
const puppeteer = require('puppeteer');

function delay(time) {
    return new Promise(function(resolve) { 
        setTimeout(resolve, time);
    });
}

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function scrapeMicrosoft(url) {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Scroll to load all jobs
        await autoScroll(page);
        await delay(5000);
        await delay(3000);
        
        // Try multiple selectors
        const possibleSelectors = [
            '.ms-List-cell',
            'div[role="listitem"]',
            '[data-automation-id="listCell"]'
        ];
        
        let jobListSelector = null;
        for (const selector of possibleSelectors) {
            const exists = await page.$(selector);
            if (exists) {
                jobListSelector = selector;
                console.log(`Found ${await page.$$eval(selector, els => els.length)} jobs with selector: ${selector}`);
                break;
            }
        }
        
        if (!jobListSelector) {
            console.error('Job listings not found. Taking debug screenshot...');
            await page.screenshot({ path: 'microsoft-debug.png', fullPage: true });
            throw new Error('Job listings not found on page');
        }

        const jobs = await page.evaluate((selector) => {
            const jobElements = document.querySelectorAll(selector);
            const jobData = [];
            
            jobElements.forEach((element, index) => {
                const titleElement = element.querySelector('h2');
                
                if (!titleElement) {
                    if (index < 3) console.log(`Element ${index}: No h2 title found`);
                    return;
                }
                
                const title = titleElement.innerText.trim();
                let jobId = null;
                
                // Look for job ID in aria-label
                const divWithAriaLabel = element.querySelector('[aria-label^="Job item"]');
                if (divWithAriaLabel) {
                    const ariaLabel = divWithAriaLabel.getAttribute('aria-label');
                    const match = ariaLabel.match(/Job item (\d+)/);
                    if (match) {
                        jobId = match[1];
                    }
                }
                
                // Fallback: search other attributes
                if (!jobId) {
                    const allChildren = element.querySelectorAll('[aria-label], [data-automation-id], [id]');
                    for (const child of allChildren) {
                        const ariaLabel = child.getAttribute('aria-label') || '';
                        const dataId = child.getAttribute('data-automation-id') || '';
                        const id = child.getAttribute('id') || '';
                        
                        const match = (ariaLabel + dataId + id).match(/\d{6,}/);
                        if (match) {
                            jobId = match[0];
                            break;
                        }
                    }
                }
                
                // Extract location
                const allSpans = element.querySelectorAll('span');
                let location = 'Not specified';
                let postedDate = '';
                
                for (const span of allSpans) {
                    const text = span.innerText?.trim();
                    if (!text || text === title) continue;
                    
                    if (text.match(/today|yesterday|\d+\s+days?\s+ago/i)) {
                        postedDate = text;
                        continue;
                    }
                    
                    if (text.length > 3 && text.length < 100 && 
                        (text.match(/,/) || text.toLowerCase().includes('remote') || 
                         text.toLowerCase().includes('hybrid') || 
                         text.match(/\b[A-Z][a-z]+\b/))) {
                        location = text;
                        break;
                    }
                }

                // Build job URL
                let jobUrl = null;
                if (jobId) {
                    jobUrl = `https://jobs.careers.microsoft.com/global/en/job/${jobId}`;
                }

                if (index < 3) {
                    console.log(`Job ${index}: title="${title}", jobId="${jobId}", location="${location}"`);
                }

                if (titleElement && jobUrl) {
                    const jobInfo = {
                        title: title,
                        url: jobUrl,
                        location: location,
                    };
                    
                    if (postedDate) {
                        jobInfo.posted = postedDate;
                    }
                    
                    jobData.push(jobInfo);
                } else {
                    if (index < 3) console.log(`Skipped job ${index}: Missing ${!titleElement ? 'title' : 'jobId'}`);
                }
            });
            
            console.log(`Total jobs extracted: ${jobData.length} from ${jobElements.length} elements`);
            return jobData;
        }, jobListSelector);

        console.log(`Successfully scraped ${jobs.length} Microsoft jobs.`);
        return jobs;

    } catch (error) {
        console.error('Error scraping Microsoft:', error.message);
        return [];
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = scrapeMicrosoft;