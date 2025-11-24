// In scrapers/googleScraper.js
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

        // Wait a moment for page to fully render
        await page.waitForTimeout(2000);

        // --- IMPROVED CONSENT HANDLING ---
        const consentHandled = await handleGoogleConsent(page);
        if (consentHandled) {
            console.log('Consent handled successfully. Waiting for page to reload...');
            await page.waitForTimeout(2000);
        }
        // ---------------------------------

        // Try multiple possible selectors for the job list
        const jobListSelectors = [
            'div[role="list"]',
            'ul[role="list"]',
            'div[jscontroller][jsaction*="IBB0"]'
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
            throw new Error('Could not find job list with any known selector');
        }

        console.log('Scraping job data...');

        const jobs = await page.evaluate(() => {
            const jobData = [];
            
            // Try to find job links - Google uses various patterns
            const linkSelectors = [
                'a[href*="/jobs/results/"]',
                'a[data-job-id]',
                'div[role="listitem"] a'
            ];

            let jobElements = [];
            for (const selector of linkSelectors) {
                jobElements = document.querySelectorAll(selector);
                if (jobElements.length > 0) break;
            }

            jobElements.forEach(element => {
                const titleElement = element.querySelector('h2, h3, [role="heading"]');
                
                if (titleElement) {
                    // Extract location from various possible elements
                    const detailSpans = element.querySelectorAll('span');
                    let location = 'Not specified';
                    
                    // Look for location indicators
                    const locationText = Array.from(detailSpans)
                        .map(span => span.innerText.trim())
                        .filter(text => text.length > 0 && !text.match(/^(Full|Part|Remote|Hybrid)/i))
                        .slice(0, 2)
                        .join(', ');
                    
                    if (locationText) {
                        location = locationText;
                    }

                    // Get the job URL
                    let jobUrl = element.href;
                    if (!jobUrl) {
                        const linkParent = element.closest('a');
                        jobUrl = linkParent ? linkParent.href : '';
                    }

                    jobData.push({
                        title: titleElement.innerText.trim(),
                        url: jobUrl || 'URL not found',
                        location: location,
                        company: 'Google'
                    });
                }
            });
            
            return jobData;
        });

        const filteredJobs = jobs.filter(job => job.title && job.url !== 'URL not found');
        console.log(`Successfully scraped ${filteredJobs.length} valid Google jobs.`);
        
        if (filteredJobs.length === 0) {
            console.warn('No jobs found. Taking screenshot for debugging...');
            await page.screenshot({ path: 'google_no_jobs_screenshot.png', fullPage: true });
        }

        return filteredJobs;

    } catch (error) {
        console.error('Error scraping Google:', error.message);
        if (page) {
            await page.screenshot({ path: 'google_error_screenshot.png', fullPage: true });
            const html = await page.content();
            require('fs').writeFileSync('google_error_page.html', html);
            console.log('Error screenshot and HTML saved for debugging');
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
 * @param {Page} page - Puppeteer page object
 * @returns {Promise<boolean>} - True if consent was handled
 */
async function handleGoogleConsent(page) {
    const consentSelectors = [
        'button[jsname="V67aGc"]',  // Accept all button
        'div[jsname="V67aGc"] button',
        'button:has-text("Accept all")',
        'button:has-text("I agree")',
        'form[action*="consent"] button[type="submit"]'
    ];

    for (const selector of consentSelectors) {
        try {
            console.log(`Checking for consent button: ${selector}`);
            const button = await page.$(selector);
            if (button) {
                console.log('Consent button found, clicking...');
                await button.click();
                await page.waitForTimeout(1500);
                return true;
            }
        } catch (error) {
            // Continue to next selector
            continue;
        }
    }

    // Alternative: Try to find and click any visible button with consent-related text
    try {
        const consentButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            return buttons.find(btn => 
                /accept|agree|continue/i.test(btn.innerText)
            );
        });
        
        if (consentButton) {
            await consentButton.click();
            await page.waitForTimeout(1500);
            return true;
        }
    } catch (error) {
        console.log('No consent form detected or already accepted');
    }

    return false;
}

module.exports = scrapeGoogle;