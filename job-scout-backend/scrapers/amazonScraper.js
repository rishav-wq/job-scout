const puppeteer = require('puppeteer');

async function scrapeAmazon(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Amazon...');
        browser = await puppeteer.launch({ 
            headless: true, 
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navigating to Amazon careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

        // Handle cookie consent
        try {
            const cookieSelectors = ['button[id*="accept"]', '#sp-cc-accept'];
            for (const selector of cookieSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 3000 });
                    await page.click(selector);
                    console.log(`Clicked cookie consent: ${selector}`);
                    await page.waitFor(3000);
                    break;
                } catch (e) {
                    continue;
                }
            }
        } catch (error) {
            console.log('No cookie consent found');
        }

        // Wait for the search results based on the screenshots
        const jobListSelector = 'div[class*="job-card-module"], h3 a[href*="jobs"]';
        await page.waitForSelector(jobListSelector, { timeout: 15000 });
        
        console.log('Scraping Amazon job search results...');
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            // Based on screenshots: Look for job title links
            // The DOM shows: <a aria-label="Software Dev Engineer I, Amazon University Talent Acquisition">
            const jobTitleLinks = Array.from(document.querySelectorAll('a[aria-label]')).filter(link => {
                const ariaLabel = link.getAttribute('aria-label');
                return ariaLabel && ariaLabel.match(/(engineer|analyst|manager|developer|scientist|intern|associate|specialist)/i);
            });
            
            console.log(`Found ${jobTitleLinks.length} job title links`);
            
            // Alternative: Look for h3 elements containing job titles
            if (jobTitleLinks.length === 0) {
                const h3Elements = Array.from(document.querySelectorAll('h3')).filter(h3 => {
                    const text = h3.innerText;
                    return text && text.match(/(engineer|analyst|manager|developer|scientist|intern|associate)/i);
                });
                
                h3Elements.forEach(h3 => {
                    const link = h3.querySelector('a') || h3.closest('a');
                    if (link) jobTitleLinks.push(link);
                });
                
                console.log(`Alternative search found ${jobTitleLinks.length} job links in h3 elements`);
            }
            
            // Extract job information
            jobTitleLinks.forEach((link, index) => {
                try {
                    // Get job title from aria-label or text content
                    const title = link.getAttribute('aria-label') || 
                                 link.innerText.trim() ||
                                 link.querySelector('h3')?.innerText?.trim();
                    
                    if (!title || title.length < 10) return;
                    
                    // Get job URL
                    const jobUrl = link.href;
                    
                    // Find location information
                    let location = 'India';
                    
                    // Look for location in the parent job container
                    const jobContainer = link.closest('div[class*="job"], article, section') || 
                                        link.closest('div').closest('div');
                    
                    if (jobContainer) {
                        const containerText = jobContainer.innerText;
                        
                        // Look for location patterns
                        const locationPatterns = [
                            /(Bengaluru|Bangalore),?\s*(KA|Karnataka),?\s*IND/i,
                            /(Chennai),?\s*(TN|Tamil Nadu),?\s*IND/i,
                            /(Delhi),?\s*(UP|Delhi),?\s*IND/i,
                            /(Mumbai|Hyderabad|Pune|Gurgaon|Noida),?\s*[A-Z]*,?\s*IND/i,
                            /(Bengaluru|Bangalore|Chennai|Delhi|Mumbai|Hyderabad|Pune|Gurgaon|Noida)/i
                        ];
                        
                        for (const pattern of locationPatterns) {
                            const match = containerText.match(pattern);
                            if (match) {
                                location = match[0].replace(/IND$/, 'India').trim();
                                break;
                            }
                        }
                        
                        // Look for "+N other locations" text
                        const otherLocationsMatch = containerText.match(/\+(\d+)\s*other\s*locations/i);
                        if (otherLocationsMatch) {
                            location += ` (+${otherLocationsMatch[1]} other locations)`;
                        }
                    }
                    
                    // Extract job metadata
                    let updatedDate = '';
                    const dateMatch = jobContainer?.innerText.match(/Updated:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
                    if (dateMatch) {
                        updatedDate = dateMatch[1];
                    }
                    
                    jobs.push({
                        title: title.trim(),
                        url: jobUrl,
                        location: location,
                        updatedDate: updatedDate,
                        company: 'Amazon'
                    });
                    
                } catch (e) {
                    console.log(`Error extracting job ${index}:`, e.message);
                }
            });
            
            console.log(`Extracted ${jobs.length} Amazon jobs`);
            return jobs;
        });

        console.log(`Found ${jobsList.length} jobs from Amazon`);
        
        // Display sample jobs
        if (jobsList.length > 0) {
            console.log('Sample Amazon jobs:');
            jobsList.slice(0, 3).forEach((job, index) => {
                console.log(`  ${index + 1}. "${job.title}"`);
                console.log(`     Location: ${job.location}`);
                console.log(`     Updated: ${job.updatedDate}`);
            });
        }

        // Fetch descriptions for a few jobs
        const jobsWithDescriptions = [];
        const maxJobs = Math.min(jobsList.length, 8);

        for (let i = 0; i < maxJobs; i++) {
            const job = jobsList[i];
            try {
                console.log(`[${i + 1}/${maxJobs}] Fetching description for: ${job.title.substring(0, 50)}...`);
                
                await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 20000 });

                // Wait for job description to load
                await page.waitForSelector('div[class*="description"], .job-description, section', { timeout: 8000 });

                const jobDetails = await page.evaluate(() => {
                    // Extract job description
                    let description = '';
                    const descSelectors = [
                        'div[class*="description"]',
                        '.job-description',
                        'section[class*="description"]',
                        'main section'
                    ];
                    
                    for (const selector of descSelectors) {
                        const descEl = document.querySelector(selector);
                        if (descEl && descEl.innerText.trim().length > 100) {
                            description = descEl.innerText.trim();
                            break;
                        }
                    }
                    
                    // Extract basic qualifications
                    let basicQualifications = '';
                    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, strong'));
                    
                    for (const heading of headings) {
                        const headingText = heading.innerText.toLowerCase();
                        if (headingText.includes('basic qualifications') || 
                            headingText.includes('minimum qualifications')) {
                            
                            let nextEl = heading.nextElementSibling;
                            while (nextEl && basicQualifications.length < 800) {
                                if (nextEl.tagName === 'UL' || nextEl.tagName === 'P') {
                                    basicQualifications += nextEl.innerText + '\n';
                                }
                                nextEl = nextEl.nextElementSibling;
                                if (!nextEl || nextEl.tagName.match(/H[1-6]/)) break;
                            }
                            break;
                        }
                    }
                    
                    return {
                        description: description || 'Description not found',
                        basicQualifications: basicQualifications.trim() || 'Basic qualifications not specified'
                    };
                });

                jobsWithDescriptions.push({
                    ...job,
                    ...jobDetails
                });

                // Delay between requests
                await new Promise(resolve => setTimeout(resolve, 1200));

            } catch (err) {
                console.log(`Error fetching details for ${job.title}: ${err.message}`);
                jobsWithDescriptions.push({
                    ...job,
                    description: 'Error fetching job details',
                    basicQualifications: ''
                });
            }
        }

        console.log(`Successfully scraped ${jobsWithDescriptions.length} Amazon jobs with descriptions`);
        return jobsWithDescriptions;

    } catch (error) {
        console.error('Error scraping Amazon:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing Amazon browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeAmazon;
