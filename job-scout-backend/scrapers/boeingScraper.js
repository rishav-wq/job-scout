const puppeteer = require('puppeteer');

async function scrapeBoeing(url) {
    let browser;
    let page;
    try {
        console.log('🚀 Launching browser for Boeing...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('🌐 Starting to scrape Boeing India careers...\n');
        
        // Boeing India search URL - starts at page 1
        const boeingUrl = 'https://jobs.boeing.com/search-jobs/software/185/1';
        
        console.log(`Navigating to: ${boeingUrl}`);
        await page.goto(boeingUrl, { waitUntil: 'networkidle2', timeout: 45000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        const allJobs = [];
        let currentPage = 1;
        const maxPages = 15; // Scrape first 10 pages (adjust as needed)

        while (currentPage <= maxPages) {
            console.log(`\n📄 === PAGE ${currentPage} ===`);
            
            // Extract jobs from current page
            const pageJobs = await page.evaluate(() => {
                const jobs = [];
                
                // From screenshot: li.no-security-clearance
                const jobItems = Array.from(document.querySelectorAll('li.no-security-clearance, li[class*="security-clearance"]'));
                
                jobItems.forEach((item) => {
                    try {
                        const linkEl = item.querySelector('a.search-results__job-link, a[href*="/job/"]');
                        if (!linkEl) return;
                        
                        const jobUrl = linkEl.href;
                        
                        const titleEl = linkEl.querySelector('span.search-results__job-title, span[class*="job-title"]');
                        if (!titleEl) return;
                        
                        const title = titleEl.innerText.trim();
                        if (!title || title.length < 3) return;
                        
                        let location = 'Location not specified';
                        const locationEl = item.querySelector('span.search-results__job-info.location, span[class*="location"]');
                        if (locationEl) {
                            location = locationEl.innerText.trim();
                        }
                        
                        let postedDate = '';
                        const dateEl = item.querySelector('span.search-results__job-info.date, span[class*="date"]');
                        if (dateEl) {
                            postedDate = dateEl.innerText.trim();
                        }
                        
                        jobs.push({
                            title,
                            url: jobUrl,
                            location,
                            postedDate,
                            company: 'Boeing'
                        });
                        
                    } catch (e) {
                        // Skip
                    }
                });
                
                return jobs;
            });

            console.log(`✅ Extracted ${pageJobs.length} jobs from page ${currentPage}`);
            allJobs.push(...pageJobs);

            // Check if there's a next page
            const hasNextPage = await page.evaluate(() => {
                // From screenshot: button with class "next" and not disabled
                const nextButton = document.querySelector('button.next, a.next');
                if (nextButton && !nextButton.hasAttribute('disabled') && !nextButton.classList.contains('disabled')) {
                    return true;
                }
                
                // Alternative: check for "Next" link with rel="nofollow"
                const nextLink = Array.from(document.querySelectorAll('a[rel="nofollow"]')).find(a => a.innerText.trim() === 'Next');
                return !!nextLink;
            });

            if (!hasNextPage || currentPage >= maxPages) {
                console.log(hasNextPage ? 'Reached max pages' : 'No more pages available');
                break;
            }

            // Click next button
            console.log('Clicking NEXT button...');
            try {
                await page.evaluate(() => {
                    const nextButton = document.querySelector('button.next, a.next');
                    if (nextButton) {
                        nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        nextButton.click();
                    } else {
                        // Alternative: find "Next" link
                        const nextLink = Array.from(document.querySelectorAll('a[rel="nofollow"]')).find(a => a.innerText.trim() === 'Next');
                        if (nextLink) {
                            nextLink.click();
                        }
                    }
                });

                // Wait for next page to load
                await new Promise(resolve => setTimeout(resolve, 4000));
                currentPage++;

            } catch (err) {
                console.log('Error clicking next:', err.message);
                break;
            }
        }

        console.log(`\n✅ Total jobs collected: ${allJobs.length}`);

        if (allJobs.length === 0) {
            console.log('❌ No jobs found.');
            return [];
        }

        // Remove duplicates
        const uniqueJobs = [];
        const seenUrls = new Set();
        
        allJobs.forEach(job => {
            if (!seenUrls.has(job.url)) {
                seenUrls.add(job.url);
                uniqueJobs.push(job);
            }
        });

        console.log(`📊 Unique jobs: ${uniqueJobs.length}`);

        // Fetch descriptions for first 20 jobs
        const jobsWithDescriptions = [];
        const maxJobsToFetch = Math.min(uniqueJobs.length, 100);

        console.log(`\n📝 Fetching descriptions for ${maxJobsToFetch} jobs...\n`);

        for (let i = 0; i < maxJobsToFetch; i++) {
            const job = uniqueJobs[i];
            try {
                console.log(`[${i + 1}/${maxJobsToFetch}] ${job.title}`);
                
                await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 2000));

                const jobDetails = await page.evaluate(() => {
                    let description = '';
                    let requirements = '';
                    
                    const descSection = document.querySelector('section.job-description, div[class*="job-description"], .ats-description');
                    
                    if (descSection) {
                        description = descSection.innerText.trim();
                        
                        const allHeadings = descSection.querySelectorAll('b, strong, h3, h4');
                        allHeadings.forEach(heading => {
                            const text = heading.innerText || '';
                            if (text.match(/requirements|qualifications|basic|preferred|skills/i)) {
                                let content = '';
                                let nextEl = heading.nextElementSibling;
                                while (nextEl && (nextEl.tagName === 'P' || nextEl.tagName === 'UL')) {
                                    content += nextEl.innerText + '\n';
                                    nextEl = nextEl.nextElementSibling;
                                    if (content.length > 800) break;
                                }
                                if (content) {
                                    requirements = content.trim();
                                }
                            }
                        });
                    }
                    
                    return {
                        description: description || 'Description not available',
                        requirements: requirements || ''
                    };
                });

                jobsWithDescriptions.push({
                    ...job,
                    ...jobDetails
                });

                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
                jobsWithDescriptions.push({
                    ...job,
                    description: 'Could not fetch description',
                    requirements: ''
                });
            }
        }

        console.log(`\n🎉 === BOEING SCRAPING COMPLETE ===`);
        console.log(`📈 Total jobs scraped: ${jobsWithDescriptions.length}`);
        
        if (jobsWithDescriptions.length > 0) {
            console.log('\n📋 Sample Boeing jobs:');
            jobsWithDescriptions.slice(0, 5).forEach((job, i) => {
                console.log(`  ${i + 1}. ${job.title}`);
                console.log(`     📍 ${job.location}`);
                console.log(`     📅 ${job.postedDate}`);
            });
        }

        return jobsWithDescriptions.map(job => ({
            title: job.title,
            url: job.url,
            location: job.location,
            company: 'Boeing',
            description: job.description,
            requirements: job.requirements,
            jobType: 'Full-time',
            postedDate: job.postedDate
        }));

    } catch (error) {
        console.error('❌ Error scraping Boeing:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('\n🔒 Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeBoeing;
