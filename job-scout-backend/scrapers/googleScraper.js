const puppeteer = require('puppeteer');

async function scrapeGoogle(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Google...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled'
            ]
        });
        
        page = await browser.newPage();

        // Enhanced headers to avoid bot detection
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });

        console.log(`Navigating to Google careers at ${url}...`);
        await page.goto(url, { 
            waitUntil: 'networkidle2',
            timeout: 30000 
        });

        // Use setTimeout with Promise instead of waitFor
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Handle Google consent
        const consentHandled = await handleGoogleConsent(page);
        if (consentHandled) {
            console.log('Consent handled successfully. Waiting for page to reload...');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }

        // Based on the screenshot, wait for the specific job list structure
        const jobListSelectors = [
            'ul.spMGqe',
            'ul[class*="spMGqe"]',
            'li.lLd3Je',
            'div[jscontroller*="t1Hm"]'
        ];

        let jobListFound = false;
        for (const selector of jobListSelectors) {
            try {
                console.log(`Trying selector: ${selector}`);
                await page.waitForSelector(selector, { timeout: 10000 });
                console.log(`Job list found with selector: ${selector}`);
                jobListFound = true;
                break;
            } catch (e) {
                console.log(`Selector ${selector} not found, trying next...`);
            }
        }

        if (!jobListFound) {
            // Take screenshot for debugging
            await page.screenshot({ path: 'google-debug.png', fullPage: true });
            throw new Error('Could not find job list with any known selector');
        }

        console.log('Scraping Google job data...');

        const jobs = await page.evaluate(() => {
            const jobData = [];
            
            // Based on screenshot: jobs are in li.lLd3Je elements
            const jobElements = document.querySelectorAll('li.lLd3Je') || 
                               document.querySelectorAll('ul.spMGqe li') ||
                               document.querySelectorAll('li[class*="lLd3Je"]');
            
            console.log(`Found ${jobElements.length} job elements`);
            
            jobElements.forEach((element, index) => {
                try {
                    // Based on DOM structure, look for the job title in h3
                    const titleElement = element.querySelector('h3.QJPWVe') || 
                                        element.querySelector('h3[class*="QJPWVe"]') ||
                                        element.querySelector('h3') ||
                                        element.querySelector('[role="heading"]');
                    
                    if (!titleElement) return;
                    
                    const title = titleElement.innerText.trim();
                    if (!title || title.length < 5) return;
                    
                    // Find the job link - usually the parent or a nearby element
                    let jobUrl = '';
                    const linkElement = element.querySelector('a') || 
                                       element.closest('a') ||
                                       titleElement.closest('a');
                    
                    if (linkElement && linkElement.href) {
                        jobUrl = linkElement.href;
                    }
                    
                    // Extract location information
                    let location = 'Not specified';
                    
                    // Look for location in various span elements
                    const spans = element.querySelectorAll('span');
                    for (const span of spans) {
                        const spanText = span.innerText.trim();
                        // Check if span contains location-like information
                        if (spanText.match(/(India|Bengaluru|Bangalore|Mumbai|Delhi|Chennai|Hyderabad|Pune|Gurgaon|California|New York|Mountain View)/i)) {
                            location = spanText;
                            break;
                        }
                        // Check for city, state/country patterns
                        if (spanText.match(/^[A-Za-z\s]+,\s*[A-Za-z\s]+$/)) {
                            location = spanText;
                            break;
                        }
                    }
                    
                    // Alternative: look in the entire element text for location patterns
                    if (location === 'Not specified') {
                        const elementText = element.innerText;
                        const locationMatch = elementText.match(/(Bengaluru|Bangalore|Mumbai|Delhi|Chennai|Hyderabad|Pune|Gurgaon|India|California|New York|Mountain View)[^,]*(?:,\s*[^,]+)?/i);
                        if (locationMatch) {
                            location = locationMatch[0].trim();
                        }
                    }
                    
                    // Extract additional job metadata if available
                    let jobType = '';
                    let department = '';
                    
                    const allText = element.innerText.toLowerCase();
                    if (allText.includes('full-time') || allText.includes('full time')) {
                        jobType = 'Full-time';
                    } else if (allText.includes('part-time') || allText.includes('part time')) {
                        jobType = 'Part-time';
                    } else if (allText.includes('intern')) {
                        jobType = 'Internship';
                    }
                    
                    // Try to extract department from job title
                    if (title.match(/(software|engineer|developer)/i)) {
                        department = 'Engineering';
                    } else if (title.match(/(product|manager)/i)) {
                        department = 'Product';
                    } else if (title.match(/(design|ux|ui)/i)) {
                        department = 'Design';
                    }
                    
                    jobData.push({
                        title: title,
                        url: jobUrl || 'URL not found',
                        location: location,
                        jobType: jobType || 'Full-time',
                        department: department,
                        company: 'Google'
                    });
                    
                } catch (e) {
                    console.log(`Error extracting job ${index}:`, e.message);
                }
            });
            
            console.log(`Extracted ${jobData.length} jobs from Google`);
            return jobData;
        });

        const filteredJobs = jobs.filter(job => job.title && job.url !== 'URL not found');
        console.log(`Successfully scraped ${filteredJobs.length} valid Google jobs.`);
        
        // Display sample jobs
        if (filteredJobs.length > 0) {
            console.log('Sample Google jobs:');
            filteredJobs.slice(0, 3).forEach((job, index) => {
                console.log(`  ${index + 1}. "${job.title}" - ${job.location}`);
            });
        }
        
        if (filteredJobs.length === 0) {
            console.warn('No jobs found. Taking screenshot for debugging...');
            await page.screenshot({ path: 'google_no_jobs_screenshot.png', fullPage: true });
        }

        // Return jobs (descriptions can be added later)
        return filteredJobs.map(job => ({
            ...job,
            description: 'Google job extraction successful - descriptions can be added later',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping Google:', error.message);
        if (page) {
            try {
                await page.screenshot({ path: 'google_error_screenshot.png', fullPage: true });
                console.log('Error screenshot saved for debugging');
            } catch (e) {
                console.log('Could not save error screenshot');
            }
        }
        return [];
    } finally {
        if (browser) {
            console.log('Closing Google browser...');
            await browser.close();
        }
    }
}

/**
 * Handles Google's consent form if present
 */
async function handleGoogleConsent(page) {
    const consentSelectors = [
        'button[jsname="V67aGc"]',  // Accept all button
        'div[jsname="V67aGc"] button',
        'button[aria-label*="Accept"]',
        'button[aria-label*="agree"]'
    ];

    for (const selector of consentSelectors) {
        try {
            console.log(`Checking for consent button: ${selector}`);
            const button = await page.$(selector);
            if (button) {
                console.log('Consent button found, clicking...');
                await button.click();
                await new Promise(resolve => setTimeout(resolve, 2000));
                return true;
            }
        } catch (error) {
            continue;
        }
    }

    // Alternative: Try to find and click any visible button with consent-related text
    try {
        const consentFound = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            const consentButton = buttons.find(btn => 
                /accept|agree|continue/i.test(btn.innerText)
            );
            
            if (consentButton) {
                consentButton.click();
                return true;
            }
            return false;
        });
        
        if (consentFound) {
            await new Promise(resolve => setTimeout(resolve, 2000));
            return true;
        }
    } catch (error) {
        console.log('No consent form detected or already accepted');
    }

    return false;
}

module.exports = scrapeGoogle;
