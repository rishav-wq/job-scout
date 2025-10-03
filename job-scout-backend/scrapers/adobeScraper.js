const puppeteer = require('puppeteer');

async function scrapeAdobe(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Adobe...');
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        const engineeringJobsUrl = 'https://careers.adobe.com/us/en/c/engineering-and-product-jobs';
        console.log(`Navigating to Adobe careers at ${engineeringJobsUrl}...`);
        await page.goto(engineeringJobsUrl, { waitUntil: 'networkidle0', timeout: 60000 });

        // Handle cookie consent
        try {
            await page.waitForSelector('button[id*="accept"]', { timeout: 3000 });
            await page.click('button[id*="accept"]');
            await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
            console.log('No cookie banner');
        }

        // Wait for jobs to load
        console.log('Waiting for jobs to load...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        const allJobs = [];
        let currentPage = 1;
        const maxPages = 10;

        while (currentPage <= maxPages) {
            console.log(`\n--- Scraping page ${currentPage} ---`);
            
            // Extract jobs from current page using the exact structure from your screenshot
            const pageJobs = await page.evaluate(() => {
                const jobs = [];
                
                // From screenshot: <span data-ps="afb79741-span-24" class="au-target" au-target-id="153">Software Development Engineer</span>
                const titleSpans = Array.from(document.querySelectorAll('span[data-ps*="span"][class*="au-target"]'));
                
                console.log(`Found ${titleSpans.length} potential job title spans`);
                
                titleSpans.forEach((span) => {
                    const title = span.innerText.trim();
                    
                    // Only process if it looks like a job title
                    if (title && title.length > 10 && title.length < 150 && 
                        title.match(/(Engineer|Manager|Developer|Analyst|Architect|Designer|Lead|Staff|Senior|Product|Principal)/i)) {
                        
                        // Find the parent link
                        const link = span.closest('a');
                        const jobUrl = link ? link.href : '';
                        
                        // Find location - from screenshot: <span class="job-location au-target">
                        let location = 'Location not specified';
                        const container = span.closest('div');
                        if (container) {
                            const locationSpan = container.querySelector('span.job-location.au-target, span[data-ps*="span"][class*="job-location"]');
                            if (locationSpan) {
                                location = locationSpan.innerText.trim();
                            }
                        }
                        
                        jobs.push({
                            title: title,
                            url: jobUrl || window.location.href,
                            location: location,
                            category: 'Engineering & Product',
                            jobType: 'Full-time',
                            company: 'Adobe'
                        });
                    }
                });
                
                return jobs;
            });

            console.log(`Extracted ${pageJobs.length} jobs from page ${currentPage}`);
            allJobs.push(...pageJobs);

            if (currentPage >= maxPages) {
                console.log('Reached max pages');
                break;
            }

            // Try to click next page - from screenshot: pagination links
            const hasNextPage = await page.evaluate(() => {
                try {
                    // Look for pagination - from screenshot structure
                    const paginationLinks = Array.from(document.querySelectorAll('a[data-ph-at-id*="pagination"], a[ph-tevent="pagination_click"]'));
                    
                    // Find current active page
                    const activeLi = document.querySelector('li.au-target.active');
                    if (activeLi && activeLi.nextElementSibling) {
                        const nextLink = activeLi.nextElementSibling.querySelector('a');
                        if (nextLink) {
                            console.log('Clicking next page number');
                            nextLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            nextLink.click();
                            return true;
                        }
                    }
                    
                    return false;
                } catch (e) {
                    return false;
                }
            });

            if (!hasNextPage) {
                console.log('No more pages');
                break;
            }

            console.log('Waiting for next page...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            currentPage++;
        }

        // Remove duplicates
        const uniqueJobs = [];
        const seenKeys = new Set();
        
        allJobs.forEach(job => {
            const key = `${job.title.toLowerCase()}-${job.location.toLowerCase()}`;
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                uniqueJobs.push(job);
            }
        });

        console.log(`\n=== ADOBE SCRAPING COMPLETE ===`);
        console.log(`Total pages scraped: ${currentPage}`);
        console.log(`Total unique jobs found: ${uniqueJobs.length}`);
        
        if (uniqueJobs.length > 0) {
            console.log('\nSample Adobe jobs:');
            uniqueJobs.slice(0, 10).forEach((job, index) => {
                console.log(`  ${index + 1}. "${job.title}"`);
                console.log(`     Location: ${job.location}`);
            });
        }

        return uniqueJobs.map(job => ({
            ...job,
            description: 'Adobe engineering and product job',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping Adobe:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing Adobe browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeAdobe;
