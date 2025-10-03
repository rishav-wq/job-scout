const puppeteer = require('puppeteer');

async function scrapePaytm(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Paytm...');
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] 
        });
        page = await browser.newPage();
        
        // Enhanced user agent to avoid detection
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navigating to Paytm careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

        // Multiple cookie consent strategies
        await handleCookieConsent(page);

        // Wait for page content with multiple selector strategies
        await waitForJobContent(page);
        
        console.log('Scraping job list from Paytm...');
        const jobsList = await page.evaluate(() => {
            const jobElements = document.querySelectorAll('.posting');
            const jobs = [];
            
            jobElements.forEach(element => {
                // Multiple selector strategies for title and link
                let titleElement = element.querySelector('h5 a') || 
                                 element.querySelector('.posting-name a') || 
                                 element.querySelector('[data-qa="posting-name"]') ||
                                 element.querySelector('a');
                
                let locationElement = element.querySelector('.posting-categories .sort-by-location') ||
                                    element.querySelector('.posting-categories span') ||
                                    element.querySelector('.location');
                
                if (titleElement) {
                    jobs.push({
                        title: titleElement.innerText.trim(),
                        url: titleElement.href,
                        location: locationElement ? locationElement.innerText.trim() : 'Not specified',
                    });
                }
            });
            return jobs;
        });

        console.log(`Found ${jobsList.length} jobs. Now fetching descriptions...`);
        const jobsWithDescriptions = [];

        for (const [index, job] of jobsList.entries()) {
            try {
                console.log(`[${index + 1}/${jobsList.length}] Fetching: ${job.title}`);
                await page.goto(job.url, { waitUntil: 'networkidle0', timeout: 20000 });

                // Multiple description selectors
                const description = await page.evaluate(() => {
                    const selectors = [
                        'div[data-qa="job-description"]',
                        '.section-wrapper .section',
                        '.job-description',
                        '.content .section'
                    ];
                    
                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            return element.innerText.trim();
                        }
                    }
                    return 'Description not found.';
                });

                jobsWithDescriptions.push({
                    ...job,
                    description: description,
                });
                
                // Random delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));

            } catch (err) {
                console.log(`Error fetching description for ${job.title}: ${err.message}`);
                jobsWithDescriptions.push({ ...job, description: 'Error fetching description.' });
            }
        }
        
        console.log(`Successfully scraped ${jobsWithDescriptions.length} Paytm jobs.`);
        return jobsWithDescriptions;

    } catch (error) {
        console.error('Error scraping Paytm:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing Paytm browser...');
            await browser.close();
        }
    }
}

async function handleCookieConsent(page) {
    const cookieSelectors = [
        'button[id*="cookie"]',
        'button[class*="cookie"]',
        '.cc-dismiss',
        'a.cc-btn.cc-dismiss',
        '[data-testid="cookie-accept"]',
        'button:contains("Accept")',
        'button:contains("Dismiss")'
    ];
    
    for (const selector of cookieSelectors) {
        try {
            await page.waitForSelector(selector, { timeout: 3000 });
            await page.click(selector);
            console.log(`Clicked cookie consent: ${selector}`);
            await page.waitForTimeout(1000);
            break;
        } catch (error) {
            continue;
        }
    }
}

async function waitForJobContent(page) {
    const contentSelectors = [
        '.posting',
        'h5 a',
        '.posting-name a',
        '[data-qa="posting-name"]'
    ];
    
    for (const selector of contentSelectors) {
        try {
            await page.waitForSelector(selector, { timeout: 10000 });
            console.log(`Found content with selector: ${selector}`);
            return;
        } catch (error) {
            continue;
        }
    }
    
    throw new Error('No job content found with any selector');
}

module.exports = scrapePaytm;
