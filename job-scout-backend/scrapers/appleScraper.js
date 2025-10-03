// In scrapers/appleScraper.js
const puppeteer = require('puppeteer');

async function scrapeApple(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Apple...');
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        
        page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');
        
        console.log(`Navigating to Apple careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // --- NEW: HANDLE APPLE COOKIE BANNER ---
        const cookieSelector = '#ac-gn-cookie-accept-button';
        try {
            console.log('Waiting for Apple cookie banner...');
            await page.waitForSelector(cookieSelector, { timeout: 5000 });
            await page.click(cookieSelector);
            console.log('Clicked Apple cookie button.');
            // Wait a moment for the page to react after clicking
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.log('Apple cookie banner not found or already accepted.');
        }
        // ------------------------------------

        // UPDATED: The main job list container has a class of .searchResults
        const jobListSelector = '.searchResults';
        console.log(`Waiting for Apple job list "${jobListSelector}" to appear...`);
        await page.waitForSelector(jobListSelector, { timeout: 15000 });

        console.log('Apple job list found. Scraping data...');

        const jobs = await page.evaluate(() => {
            // Each job is a div with role="row"
            const jobElements = document.querySelectorAll('div[role="row"]');
            const jobData = [];

            jobElements.forEach(element => {
                const titleElement = element.querySelector('a[id*="td-job-title-"]');
                const detailElements = element.querySelectorAll('span.table-cell-text');
                
                if (titleElement) {
                    const title = titleElement.innerText.trim();
                    // The second detail element is the location
                    const location = detailElements.length > 1 ? detailElements[1].innerText.trim() : 'Not specified';
                    
                    jobData.push({
                        title: title,
                        url: titleElement.href,
                        location: location,
                    });
                }
            });
            return jobData;
        });

        console.log(`Successfully scraped ${jobs.length} Apple jobs.`);
        return jobs;

    } catch (error) {
        console.error('Error scraping Apple:', error.message);
        if (page) {
            await page.screenshot({ path: 'apple_error_screenshot.png', fullPage: true });
            console.log('Error screenshot saved to apple_error_screenshot.png');
        }
        return [];
    } finally {
        if (browser) {
            console.log('Closing Apple browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeApple;