const puppeteer = require('puppeteer');

async function scrapeStandardChartered(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Standard Chartered...');
        browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navigating to Standard Chartered careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // Wait for initial content to load
        console.log('Waiting for initial content to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // PAGINATION HANDLING - Navigate through all pages
        console.log('Starting pagination to load all jobs...');
        let allJobs = [];
        let currentPage = 1;
        const maxPages = 50; // Safety limit to prevent infinite loop
        
        while (currentPage <= maxPages) {
            console.log(`\n=== Processing Page ${currentPage} ===`);
            
            // Wait for jobs to load on current page
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Extract jobs from current page
            const pageJobs = await page.evaluate(() => {
                const jobs = [];
                
                // Based on screenshots, look for job item containers
                const jobSelectors = [
                    '.search_results_main__item',
                    '[class*="search_results"]',
                    '.job-item',
                    '.job-card',
                    'div[class*="search_results_main__item"]'
                ];
                
                let jobElements = [];
                for (const selector of jobSelectors) {
                    jobElements = Array.from(document.querySelectorAll(selector));
                    if (jobElements.length > 0) {
                        console.log(`Found ${jobElements.length} job elements with: ${selector}`);
                        break;
                    }
                }
                
                // Fallback: Look for any div containing job-like content
                if (jobElements.length === 0) {
                    const allDivs = Array.from(document.querySelectorAll('div, article'));
                    jobElements = allDivs.filter(div => {
                        const text = div.innerText;
                        const hasJobTitle = text && text.match(/(programme|manager|analyst|associate|officer|specialist|director|head|lead|senior|graduate)/i);
                        const hasViewJob = div.querySelector('button, a') && text.includes('View Job');
                        const reasonableLength = text && text.length > 50 && text.length < 800;
                        
                        return hasJobTitle && hasViewJob && reasonableLength;
                    });
                    console.log(`Fallback found ${jobElements.length} job containers`);
                }
                
                // Extract job information from each container
                jobElements.forEach((container, index) => {
                    try {
                        // Extract job title - from screenshots: h5 elements
                        const titleEl = container.querySelector('h5, h4, h3, .title, [class*="title"]');
                        if (!titleEl) return;
                        
                        const title = titleEl.innerText.trim();
                        if (!title || title.length < 10) return;
                        
                        // Extract location - from screenshots: spans with location data
                        let location = 'Location not specified';
                        const locationSpans = container.querySelectorAll('span[class*="search_results_main__item-detail"]');
                        
                        for (const span of locationSpans) {
                            const spanText = span.innerText.trim();
                            // Look for location patterns
                            if (spanText.match(/^[A-Za-z\s,]+$/)) { // Text only, no numbers
                                const locationPatterns = [
                                    /Hong Kong|Singapore|Mumbai|Delhi|Chennai|Bangalore|Dubai|London|New York/i,
                                    /Central|HK|IN|SG|UAE|UK|US/i,
                                    /\b(Asia|India|China|UAE|UK|USA)\b/i
                                ];
                                
                                for (const pattern of locationPatterns) {
                                    if (spanText.match(pattern)) {
                                        location = spanText;
                                        break;
                                    }
                                }
                                if (location !== 'Location not specified') break;
                            }
                        }
                        
                        // Extract department/area - from screenshots: department info
                        let department = '';
                        const deptSpans = container.querySelectorAll('span');
                        for (const span of deptSpans) {
                            const spanText = span.innerText.trim();
                            if (spanText.match(/(Financial Markets|Banking|Technology|Risk|Compliance|Operations|HR|Finance)/i)) {
                                department = spanText;
                                break;
                            }
                        }
                        
                        // Extract job type - from screenshots: work type info
                        let jobType = 'Full-time';
                        const typeSpans = container.querySelectorAll('span');
                        for (const span of typeSpans) {
                            const spanText = span.innerText.trim().toLowerCase();
                            if (spanText.match(/(full-time|part-time|contract|temporary|permanent)/)) {
                                jobType = span.innerText.trim();
                                break;
                            }
                        }
                        
                        // Extract job URL - look for "View Job" link
                        let jobUrl = '';
                        const viewJobBtn = container.querySelector('button, a');
                        if (viewJobBtn && viewJobBtn.getAttribute('href')) {
                            jobUrl = viewJobBtn.getAttribute('href');
                            if (!jobUrl.startsWith('http')) {
                                jobUrl = `https://jobs.standardchartered.com${jobUrl}`;
                            }
                        }
                        
                        // Extract employment dates - from screenshots: date ranges
                        let employmentPeriod = '';
                        const dateSpans = container.querySelectorAll('span');
                        for (const span of dateSpans) {
                            const spanText = span.innerText.trim();
                            if (spanText.match(/\d{4}.*\d{4}|Mon.*\d{4}/)) {
                                employmentPeriod = spanText;
                                break;
                            }
                        }
                        
                        jobs.push({
                            title: title,
                            url: jobUrl || 'URL not available',
                            location: location,
                            department: department,
                            jobType: jobType,
                            employmentPeriod: employmentPeriod,
                            company: 'Standard Chartered',
                            pageNumber: window.currentPageNumber || 1
                        });
                        
                    } catch (e) {
                        console.log(`Error processing job container ${index}:`, e.message);
                    }
                });
                
                console.log(`Extracted ${jobs.length} jobs from current page`);
                return jobs;
            });
            
            console.log(`Page ${currentPage}: Found ${pageJobs.length} jobs`);
            allJobs.push(...pageJobs);
            
            // Look for "Next" button and click it
            console.log('Looking for Next button...');
            const nextClicked = await page.evaluate(() => {
                // Look for Next button with various selectors
                const nextSelectors = [
                    'a[data-name="next-page"]',
                    'button[data-name="next-page"]',
                    '.search_results_main__paging-button[data-name="next-page"]',
                    'a:contains("Next")',
                    'button:contains("Next")',
                    '.next',
                    '[aria-label="Next"]'
                ];
                
                for (const selector of nextSelectors) {
                    let nextBtn = null;
                    
                    if (selector.includes(':contains')) {
                        // Handle :contains selectors
                        const buttons = Array.from(document.querySelectorAll('a, button'));
                        nextBtn = buttons.find(btn => 
                            btn.innerText.toLowerCase().includes('next') ||
                            btn.getAttribute('aria-label')?.toLowerCase().includes('next')
                        );
                    } else {
                        nextBtn = document.querySelector(selector);
                    }
                    
                    if (nextBtn && nextBtn.style.visibility !== 'hidden') {
                        console.log(`Found Next button with selector: ${selector}`);
                        console.log(`Button visibility: ${nextBtn.style.visibility}`);
                        console.log(`Button display: ${getComputedStyle(nextBtn).display}`);
                        
                        // Check if button is actually clickable
                        const isDisabled = nextBtn.disabled || 
                                         nextBtn.classList.contains('disabled') ||
                                         getComputedStyle(nextBtn).display === 'none' ||
                                         getComputedStyle(nextBtn).visibility === 'hidden';
                        
                        if (!isDisabled) {
                            nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => nextBtn.click(), 1000);
                            return true;
                        }
                    }
                }
                
                console.log('No clickable Next button found');
                return false;
            });
            
            if (!nextClicked) {
                console.log('No more pages available. Pagination complete.');
                break;
            }
            
            console.log(`Clicked Next button, moving to page ${currentPage + 1}`);
            currentPage++;
            
            // Wait for new page to load
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Check if we're actually on a new page by comparing job count
            const newPageJobCount = await page.evaluate(() => {
                const jobElements = document.querySelectorAll('.search_results_main__item, [class*="search_results"], .job-item');
                return jobElements.length;
            });
            
            if (newPageJobCount === 0) {
                console.log('No jobs found on new page, stopping pagination');
                break;
            }
        }
        
        console.log(`\n=== PAGINATION COMPLETE ===`);
        console.log(`Total pages processed: ${currentPage - 1}`);
        console.log(`Total jobs collected: ${allJobs.length}`);
        
        // Remove duplicates based on title and location
        const uniqueJobs = [];
        const seenJobs = new Set();
        
        allJobs.forEach(job => {
            const jobKey = `${job.title.toLowerCase().trim()}-${job.location.toLowerCase().trim()}`;
            if (!seenJobs.has(jobKey)) {
                seenJobs.add(jobKey);
                uniqueJobs.push(job);
            }
        });
        
        console.log(`Unique jobs after deduplication: ${uniqueJobs.length}`);
        
        // Take final screenshot
        await page.screenshot({ path: 'standardchartered-all-jobs.png', fullPage: true });
        console.log('Final screenshot saved');
        
        // Display sample jobs
        if (uniqueJobs.length > 0) {
            console.log('\n=== SAMPLE JOBS ===');
            uniqueJobs.slice(0, 10).forEach((job, index) => {
                console.log(`${index + 1}. "${job.title}"`);
                console.log(`   Location: ${job.location}`);
                console.log(`   Department: ${job.department}`);
                console.log(`   Type: ${job.jobType}`);
                console.log(`   Period: ${job.employmentPeriod}`);
                console.log(`   Page: ${job.pageNumber}\n`);
            });
        }

        return uniqueJobs.map(job => ({
            ...job,
            description: 'All pages scraped successfully - descriptions can be fetched later',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping Standard Chartered:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeStandardChartered;
