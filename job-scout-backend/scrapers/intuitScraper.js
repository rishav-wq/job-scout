const puppeteer = require('puppeteer');

async function scrapeIntuit(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Intuit...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navigating to Intuit careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // Wait for job listings to load
        console.log('Waiting for initial job listings...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // HANDLE "SHOW ALL" LINK
        console.log('Looking for "Show All" link to load all jobs...');
        const showAllClicked = await page.evaluate(() => {
            // Look for "Show All" link - from screenshot: <a class="pagination-show-all">Show All</a>
            const showAllSelectors = [
                'a.pagination-show-all',
                '.pagination-show-all',
                'a[href*="show-all"]',
                'a:contains("Show All")'
            ];
            
            let showAllLink = null;
            
            // Try each selector
            for (const selector of showAllSelectors) {
                if (selector.includes(':contains')) {
                    // Handle :contains selector
                    const links = Array.from(document.querySelectorAll('a'));
                    showAllLink = links.find(link => 
                        link.innerText.trim().toLowerCase() === 'show all'
                    );
                } else {
                    showAllLink = document.querySelector(selector);
                }
                
                if (showAllLink) break;
            }
            
            if (showAllLink) {
                console.log('Found Show All link, clicking...');
                showAllLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => showAllLink.click(), 1000);
                return true;
            }
            
            console.log('Show All link not found');
            return false;
        });

        if (showAllClicked) {
            console.log('Clicked Show All, waiting for all jobs to load...');
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait longer for all jobs
        }

        console.log('Extracting all jobs from Intuit...');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            console.log('=== INTUIT JOB EXTRACTION ===');
            
            // Based on screenshot DOM: look for li elements with job data
            const jobSelectors = [
                'li[data-remote]',
                'li[data-intuit-jobid]',
                '.search-list li',
                'ul > li',
                '[class*="search-result"] li'
            ];
            
            let jobElements = [];
            for (const selector of jobSelectors) {
                jobElements = Array.from(document.querySelectorAll(selector));
                if (jobElements.length > 0) {
                    console.log(`Found ${jobElements.length} job elements with: ${selector}`);
                    break;
                }
            }
            
            // Fallback: look for any element with job-like content
            if (jobElements.length === 0) {
                console.log('Trying fallback method...');
                const allElements = Array.from(document.querySelectorAll('div, article, section'));
                jobElements = allElements.filter(el => {
                    const text = el.innerText;
                    return text && 
                           text.match(/(engineer|analyst|manager|developer|staff|senior)/i) &&
                           text.match(/(bangalore|india|mumbai)/i) &&
                           text.length > 30 && text.length < 500;
                });
                console.log(`Fallback found ${jobElements.length} job elements`);
            }
            
            console.log(`Processing ${jobElements.length} job elements...`);
            
            jobElements.forEach((element, index) => {
                try {
                    const elementText = element.innerText || '';
                    
                    // Extract job title
                    let title = '';
                    
                    // Method 1: Look for h2, h3, h4 tags
                    const titleEl = element.querySelector('h2, h3, h4, .job-title');
                    if (titleEl) {
                        title = titleEl.innerText.trim();
                    }
                    
                    // Method 2: Look for link text
                    if (!title) {
                        const linkEl = element.querySelector('a');
                        if (linkEl) {
                            title = linkEl.innerText.trim().split('\n')[0]; // Take first line
                        }
                    }
                    
                    // Method 3: Extract from element text
                    if (!title) {
                        const lines = elementText.split('\n').map(l => l.trim()).filter(l => l.length > 5);
                        title = lines.find(line => 
                            line.match(/(engineer|analyst|manager|developer|staff|senior)/i) &&
                            line.length > 10 && line.length < 150
                        ) || lines[0] || '';
                    }
                    
                    // Clean title
                    title = title.replace(/\s+/g, ' ').trim();
                    
                    if (!title || title.length < 5) {
                        console.log(`Skipping element ${index}: no valid title`);
                        return;
                    }
                    
                    console.log(`Processing job ${index + 1}: "${title}"`);
                    
                    // Extract job URL
                    let jobUrl = '';
                    const linkEl = element.querySelector('a[href*="job"]') || element.querySelector('a[href]');
                    if (linkEl && linkEl.href) {
                        jobUrl = linkEl.href;
                        if (!jobUrl.startsWith('http')) {
                            jobUrl = `https://jobs.intuit.com${jobUrl}`;
                        }
                    }
                    
                    // Extract location
                    let location = 'Location not specified';
                    
                    const locationPatterns = [
                        /Bangalore,\s*India/i,
                        /Bengaluru,\s*India/i,
                        /Mumbai,\s*India/i,
                        /Delhi,\s*India/i,
                        /Chennai,\s*India/i,
                        /Hyderabad,\s*India/i,
                        /\b(Bangalore|Bengaluru|Mumbai|Delhi|Chennai|Hyderabad|Pune)\b/i,
                        /India/i
                    ];
                    
                    for (const pattern of locationPatterns) {
                        const match = elementText.match(pattern);
                        if (match) {
                            location = match[0].trim();
                            break;
                        }
                    }
                    
                    // Determine department
                    let department = 'Technology';
                    const titleLower = title.toLowerCase();
                    if (titleLower.includes('software') || titleLower.includes('engineer')) department = 'Software Engineering';
                    else if (titleLower.includes('data') || titleLower.includes('analyst')) department = 'Data & Analytics';
                    else if (titleLower.includes('product')) department = 'Product';
                    else if (titleLower.includes('design') || titleLower.includes('ux')) department = 'Design';
                    else if (titleLower.includes('manager') || titleLower.includes('director')) department = 'Management';
                    else if (titleLower.includes('financial') || titleLower.includes('finance')) department = 'Finance';
                    else if (titleLower.includes('recruiter') || titleLower.includes('hr')) department = 'HR';
                    else if (titleLower.includes('marketing')) department = 'Marketing';
                    else if (titleLower.includes('ios') || titleLower.includes('android')) department = 'Mobile Development';
                    
                    jobs.push({
                        title: title,
                        url: jobUrl || `https://jobs.intuit.com/job/${Date.now()}-${index}`,
                        location: location,
                        department: department,
                        company: 'Intuit'
                    });
                    
                } catch (e) {
                    console.log(`Error processing job ${index}:`, e.message);
                }
            });
            
            // Remove duplicates
            const uniqueJobs = [];
            const seenTitles = new Set();
            
            jobs.forEach(job => {
                const normalizedTitle = job.title.toLowerCase().trim();
                if (!seenTitles.has(normalizedTitle)) {
                    seenTitles.add(normalizedTitle);
                    uniqueJobs.push(job);
                }
            });
            
            console.log(`Final result: ${uniqueJobs.length} unique jobs`);
            return uniqueJobs;
        });

        console.log(`\n=== INTUIT SCRAPING COMPLETE ===`);
        console.log(`Total jobs found: ${jobsList.length}`);
        
        if (jobsList.length > 0) {
            console.log('\nSample Intuit jobs:');
            jobsList.slice(0, 10).forEach((job, index) => {
                console.log(`  ${index + 1}. "${job.title}"`);
                console.log(`     Location: ${job.location}`);
                console.log(`     Department: ${job.department}`);
            });
        }

        return jobsList.map(job => ({
            ...job,
            description: 'Intuit job extracted successfully - descriptions can be added later',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping Intuit:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing Intuit browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeIntuit;
