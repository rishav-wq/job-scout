// INSTALLATION REQUIRED:
// npm install puppeteer-extra puppeteer-extra-plugin-stealth

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function scrapeHitachi(url) {
    let browser;
    let page;
    try {
        console.log('🚀 Launching browser for Hitachi with anti-detection...');
        browser = await puppeteer.launch({ 
            headless: false, // Set to true after testing if it works
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-features=IsolateOrigins,site-per-process',
                '--window-size=1920,1080'
            ],
            defaultViewport: null
        });
        
        page = await browser.newPage();
        
        // Enhanced anti-detection measures
        await page.evaluateOnNewDocument(() => {
            // Override webdriver property
            Object.defineProperty(navigator, 'webdriver', {
                get: () => false,
            });
            
            // Override plugins
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5],
            });
            
            // Override languages
            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en'],
            });
        });
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        });
        
        console.log('🌐 Starting to scrape Hitachi India careers...\n');
        
        const allJobs = [];
        let currentPageNum = 1;
        const maxPages = 3; // Reduced to 3 to avoid Cloudflare triggers

        while (currentPageNum <= maxPages) {
            const baseUrl = 'https://careers.hitachi.com/search/jobs/in/country/india';
            const pageUrl = `${baseUrl}?page=${currentPageNum}`;
            
            console.log(`\n📄 === PAGE ${currentPageNum} ===`);
            console.log(`Navigating to: ${pageUrl}`);
            
            try {
                await page.goto(pageUrl, { 
                    waitUntil: 'networkidle0', 
                    timeout: 90000 
                });
            } catch (e) {
                console.log('⚠️ Navigation timeout, continuing anyway...');
            }
            
            // Wait for initial load
            console.log('⏳ Waiting for page to fully load...');
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // Check if Cloudflare challenge is present
            const cloudflareCheck = await page.evaluate(() => {
                const bodyText = document.body.innerText.toLowerCase();
                return {
                    hasChallenge: bodyText.includes('verify you are human') || 
                                  bodyText.includes('checking your browser') ||
                                  bodyText.includes('cloudflare'),
                    pageTitle: document.title
                };
            });
            
            if (cloudflareCheck.hasChallenge) {
                console.log('🔒 Cloudflare challenge detected!');
                console.log('⏳ Waiting 25 seconds for challenge to complete...');
                console.log('💡 If browser window opens, solve CAPTCHA manually if needed.');
                await new Promise(resolve => setTimeout(resolve, 25000));
                
                // Check again after longer wait
                const stillBlocked = await page.evaluate(() => {
                    const text = document.body.innerText.toLowerCase();
                    return text.includes('verify you are human') || 
                           text.includes('checking your browser') ||
                           text.includes('just a moment');
                });
                
                if (stillBlocked) {
                    console.log('❌ Still blocked by Cloudflare after waiting.');
                    console.log('⏳ Waiting additional 20 seconds...');
                    await new Promise(resolve => setTimeout(resolve, 20000));
                    
                    // One more check
                    const finalCheck = await page.evaluate(() => {
                        return !document.body.innerText.toLowerCase().includes('verify you are human');
                    });
                    
                    if (!finalCheck) {
                        console.log('❌ Cannot bypass Cloudflare. Stopping pagination.');
                        console.log('💡 Successfully got jobs from previous pages.');
                        break;
                    }
                }
                
                console.log('✅ Challenge passed, continuing...');
                
                // Reload the page after passing challenge
                await page.goto(pageUrl, { 
                    waitUntil: 'networkidle0', 
                    timeout: 90000 
                });
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
            
            // Scroll to trigger lazy loading
            await page.evaluate(() => {
                window.scrollTo(0, document.body.scrollHeight / 2);
            });
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            await page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Debug: Check what's on the page
            const debugInfo = await page.evaluate(() => {
                const selectors = {
                    'div.jobs-section__item': document.querySelectorAll('div.jobs-section__item').length,
                    'div[class*="jobs-section"]': document.querySelectorAll('div[class*="jobs-section"]').length,
                    'a[href*="/jobs/"]': document.querySelectorAll('a[href*="/jobs/"]').length,
                    'any div': document.querySelectorAll('div').length
                };
                const titleText = document.title;
                const h1Text = document.querySelector('h1')?.innerText || 'No H1';
                return { selectors, titleText, h1Text };
            });
            
            console.log('📊 Debug Info:', {
                title: debugInfo.titleText,
                h1: debugInfo.h1Text,
                elements: debugInfo.selectors
            });

            // Extract jobs from current page
            const pageJobs = await page.evaluate(() => {
                const jobs = [];
                
                // Try multiple selector strategies
                let jobItems = Array.from(document.querySelectorAll('div.jobs-section__item'));
                
                if (jobItems.length === 0) {
                    jobItems = Array.from(document.querySelectorAll('div[class*="jobs-section__item"]'));
                }
                if (jobItems.length === 0) {
                    jobItems = Array.from(document.querySelectorAll('[class*="job-item"]'));
                }
                if (jobItems.length === 0) {
                    jobItems = Array.from(document.querySelectorAll('[class*="job-list"] > div'));
                }
                
                jobItems.forEach((item, index) => {
                    try {
                        // Find job link
                        const linkEl = item.querySelector('a[href*="/jobs/"]');
                        if (!linkEl) return;
                        
                        const href = linkEl.getAttribute('href');
                        const jobUrl = href.startsWith('http') ? href : 'https://careers.hitachi.com' + href;
                        
                        // Get title
                        let title = linkEl.innerText?.trim() || '';
                        if (!title || title.length < 3) {
                            const h3 = item.querySelector('h3, h2, [class*="title"]');
                            title = h3?.innerText?.trim() || '';
                        }
                        
                        if (!title || title.length < 3) return;
                        
                        // Get location - improved extraction
                        let location = 'Location not specified';
                        const allText = item.innerText || '';
                        const textLines = allText.split('\n').map(l => l.trim()).filter(l => l);
                        
                        // Look for location in various formats
                        for (const line of textLines) {
                            // Pattern: City, State/Country
                            if (line.match(/^[A-Z][a-z]+.*,\s*[A-Z]/)) {
                                location = line;
                                break;
                            }
                            // "Location:" label
                            if (line.toLowerCase().includes('location:')) {
                                location = line.replace(/location:/i, '').trim();
                                break;
                            }
                            // Remote pattern
                            if (line.toLowerCase() === 'remote') {
                                location = 'Remote';
                                break;
                            }
                        }
                        
                        // Fallback: check span elements
                        if (location === 'Location not specified') {
                            const locationSpan = item.querySelector('span.hide-phone, span[class*="location"]');
                            if (locationSpan && locationSpan.innerText) {
                                location = locationSpan.innerText.replace(/location:/i, '').trim();
                            }
                        }
                        
                        // Get company name - improved extraction
                        let company = 'Hitachi';
                        for (const line of textLines) {
                            // Look for company patterns
                            if (line.toLowerCase().includes('company:')) {
                                company = line.replace(/company:/i, '').trim();
                                break;
                            }
                            if (line.match(/HITACHI.*(?:PVT|LTD|LIMITED|INDIA|ENERGY|SERVICES)/i)) {
                                company = line.trim();
                                break;
                            }
                        }
                        
                        // Fallback: check span elements
                        if (company === 'Hitachi') {
                            const companySpan = item.querySelector('span.hide, span[class*="company"]');
                            if (companySpan && companySpan.innerText && companySpan.innerText.includes('HITACHI')) {
                                company = companySpan.innerText.replace(/company:/i, '').trim();
                            }
                        }
                        
                        jobs.push({
                            title: title,
                            url: jobUrl,
                            location: location,
                            company: company
                        });
                        
                    } catch (e) {
                        // Skip errors
                    }
                });
                
                return jobs;
            });

            console.log(`✅ Extracted ${pageJobs.length} jobs from page ${currentPageNum}`);
            
            if (pageJobs.length === 0) {
                console.log('⚠️  No jobs found on this page.');
                
                if (currentPageNum === 1) {
                    // Take screenshot for debugging
                    await page.screenshot({ 
                        path: `hitachi_debug_page${currentPageNum}.png`,
                        fullPage: true 
                    });
                    console.log(`📸 Debug screenshot saved: hitachi_debug_page${currentPageNum}.png`);
                }
                
                break;
            }
            
            allJobs.push(...pageJobs);
            currentPageNum++;
            
            // Random delay between pages
            const delay = 3000 + Math.random() * 2000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        console.log(`\n✅ Total jobs collected: ${allJobs.length}\n`);

        if (allJobs.length === 0) {
            console.log('❌ No jobs found across all pages.');
            console.log('💡 Possible reasons:');
            console.log('   - Cloudflare protection blocking access');
            console.log('   - Page structure changed');
            console.log('   - No jobs available for India');
            console.log('   - Try with headless: false and solve CAPTCHA manually');
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

        console.log(`📊 Unique jobs after deduplication: ${uniqueJobs.length}`);

        // Fetch descriptions for first 15 jobs
        const jobsWithDescriptions = [];
        const maxJobsToFetch = Math.min(uniqueJobs.length, 15);

        console.log(`\n📝 Fetching descriptions for ${maxJobsToFetch} jobs...\n`);

        for (let i = 0; i < maxJobsToFetch; i++) {
            const job = uniqueJobs[i];
            try {
                console.log(`[${i + 1}/${maxJobsToFetch}] ${job.title}`);
                
                // Create a new page for each job to avoid detached frame issues
                const jobPage = await browser.newPage();
                await jobPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');
                
                await jobPage.goto(job.url, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 30000 
                });
                await new Promise(resolve => setTimeout(resolve, 3000));

                const jobDetails = await jobPage.evaluate(() => {
                    let description = '';
                    let requirements = '';
                    
                    // Try multiple selectors for description
                    const descSelectors = [
                        '.job-description',
                        'div[class*="job-description"]',
                        '.page-section-2',
                        'div[class*="page-section-2"]',
                        '[class*="description"]',
                        'main section'
                    ];
                    
                    let descDiv = null;
                    for (const selector of descSelectors) {
                        descDiv = document.querySelector(selector);
                        if (descDiv && descDiv.innerText.length > 100) break;
                    }
                    
                    if (descDiv) {
                        description = descDiv.innerText.trim();
                        
                        // Extract requirements section
                        const allText = description.toLowerCase();
                        const reqKeywords = [
                            'requirements', 
                            'qualifications', 
                            'skills', 
                            'primary skills', 
                            'your background', 
                            'what you bring',
                            'required skills',
                            'must have'
                        ];
                        
                        for (const keyword of reqKeywords) {
                            const keywordIndex = allText.indexOf(keyword);
                            if (keywordIndex !== -1) {
                                const startIndex = description.toLowerCase().indexOf(keyword);
                                const endMatch = description.slice(startIndex).match(/\n\n|\n[A-Z][a-z]+:/);
                                const endIndex = endMatch ? startIndex + endMatch.index : Math.min(startIndex + 1000, description.length);
                                
                                const requirementsText = description.slice(startIndex, endIndex).trim();
                                if (requirementsText.length > 50) {
                                    requirements = requirementsText.substring(0, 1000);
                                    break;
                                }
                            }
                        }
                    }
                    
                    return {
                        description: description || 'Description not available',
                        requirements: requirements || ''
                    };
                });

                await jobPage.close(); // Close the page after extraction

                jobsWithDescriptions.push({
                    ...job,
                    ...jobDetails
                });

                // Random delay between requests
                const delay = 1500 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));

            } catch (err) {
                console.log(`   ❌ Error: ${err.message}`);
                jobsWithDescriptions.push({
                    ...job,
                    description: 'Could not fetch description',
                    requirements: ''
                });
            }
        }

        console.log(`\n🎉 === HITACHI SCRAPING COMPLETE ===`);
        console.log(`📈 Total jobs scraped: ${jobsWithDescriptions.length}`);
        
        if (jobsWithDescriptions.length > 0) {
            console.log('\n📋 Sample jobs:');
            jobsWithDescriptions.slice(0, 5).forEach((job, i) => {
                console.log(`  ${i + 1}. ${job.title}`);
                console.log(`     📍 ${job.location}`);
                console.log(`     🏢 ${job.company}`);
            });
        }

        return jobsWithDescriptions.map(job => ({
            title: job.title,
            url: job.url,
            location: job.location,
            company: job.company,
            description: job.description,
            requirements: job.requirements,
            jobType: 'Full-time'
        }));

    } catch (error) {
        console.error('❌ Error scraping Hitachi:', error.message);
        console.error('Stack:', error.stack);
        return [];
    } finally {
        if (browser) {
            console.log('\n🔒 Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeHitachi;