const puppeteer = require('puppeteer');
const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid detection
puppeteerExtra.use(StealthPlugin());

async function scrapeZoominfo(url) {
    let browser;
    let page;
    
    try {
        console.log('🚀 Launching browser with stealth mode...');
        
        browser = await puppeteerExtra.launch({ 
            headless: false,  // Keep visible to manually solve CAPTCHA
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--start-maximized',
                '--disable-web-security'
            ],
            defaultViewport: null
        });
        
        page = await browser.newPage();
        
        // Additional stealth measures
        await page.evaluateOnNewDocument(() => {
            // Remove webdriver flag
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
            });
            
            // Mock chrome object
            window.chrome = {
                runtime: {},
            };
            
            // Mock permissions
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => (
                parameters.name === 'notifications' ?
                    Promise.resolve({ state: Notification.permission }) :
                    originalQuery(parameters)
            );
        });
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');
        
        console.log('🌐 Navigating to Zoominfo careers page...');
        await page.goto('https://www.zoominfo.com/careers#jobs', { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });

        // Wait a bit for CAPTCHA to appear
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Check if CAPTCHA is present
        const hasCaptcha = await page.evaluate(() => {
            const captchaText = document.body.innerText;
            return captchaText.includes('Press & Hold') || 
                   captchaText.includes('human') || 
                   captchaText.includes('not a bot');
        });

        if (hasCaptcha) {
            console.log('⚠️  CAPTCHA DETECTED!');
            console.log('');
            console.log('┌──────────────────────────────────────────────┐');
            console.log('│  🤖 MANUAL INTERVENTION REQUIRED              │');
            console.log('│                                              │');
            console.log('│  Please solve the CAPTCHA in the browser    │');
            console.log('│  that just opened.                           │');
            console.log('│                                              │');
            console.log('│  The script will wait for 60 seconds...      │');
            console.log('└──────────────────────────────────────────────┘');
            console.log('');
            
            // Wait for user to solve CAPTCHA (60 seconds)
            console.log('⏳ Waiting 60 seconds for CAPTCHA to be solved...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            
            // Check if we're past the CAPTCHA
            const stillBlocked = await page.evaluate(() => {
                return document.body.innerText.includes('Press & Hold');
            });
            
            if (stillBlocked) {
                console.log('❌ CAPTCHA still present. Exiting...');
                return [];
            }
            
            console.log('✅ CAPTCHA appears to be solved! Continuing...');
        }

        // Now proceed with scraping
        console.log('⏳ Waiting for jobs to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Try to navigate to jobs section
        try {
            await page.evaluate(() => {
                const jobsSection = document.querySelector('[data-cy="job-openings-section"]') || 
                                   document.querySelector('#jobs');
                if (jobsSection) {
                    jobsSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
            await new Promise(resolve => setTimeout(resolve, 3000));
        } catch (e) {
            console.log('Could not scroll to jobs section');
        }

        // Scroll to load all jobs
        console.log('🔽 Scrolling to load all jobs...');
        for (let i = 0; i < 5; i++) {
            await page.evaluate(() => window.scrollBy(0, 500));
            await new Promise(resolve => setTimeout(resolve, 1500));
        }

        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take screenshot
        await page.screenshot({ path: 'zoominfo-loaded.png', fullPage: true });
        console.log('📸 Screenshot saved: zoominfo-loaded.png');

        // Extract jobs
        console.log('\n📝 Extracting jobs...\n');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            // Try multiple selectors
            let jobElements = Array.from(document.querySelectorAll('a.grid-3-items-list.pointer'));
            
            if (jobElements.length === 0) {
                jobElements = Array.from(document.querySelectorAll('a[href*="/careers/"]'))
                    .filter(a => {
                        const href = a.href || '';
                        return href.match(/\/careers\/[a-zA-Z0-9]/) && 
                               !href.endsWith('/careers') &&
                               !href.includes('#');
                    });
            }
            
            console.log(`Found ${jobElements.length} job elements`);
            
            jobElements.forEach((el, idx) => {
                try {
                    const url = el.href;
                    if (!url) return;
                    
                    const h4s = el.querySelectorAll('h4.h5, h4');
                    let title = '';
                    let location = 'Remote/Hybrid';
                    
                    if (h4s.length > 0) {
                        title = h4s[0].innerText.trim();
                        if (h4s.length > 1) {
                            location = h4s[1].innerText.trim();
                        }
                    }
                    
                    if (title && title.length > 3 && title.length < 200) {
                        console.log(`✓ ${idx + 1}. ${title} - ${location}`);
                        jobs.push({ title, url, location, company: 'Zoominfo' });
                    }
                } catch (e) {
                    console.log(`Error on ${idx}: ${e.message}`);
                }
            });
            
            return jobs;
        });

        console.log(`\n✅ Found ${jobsList.length} jobs\n`);

        if (jobsList.length === 0) {
            console.log('❌ No jobs found after CAPTCHA. The page might need more time to load.');
            console.log('Check zoominfo-loaded.png to see what the page looks like.');
            return [];
        }

        // Fetch job details
        console.log('📄 Fetching job details...\n');
        const jobsWithDetails = [];
        const limit = Math.min(jobsList.length, 15);

        for (let i = 0; i < limit; i++) {
            const job = jobsList[i];
            
            try {
                console.log(`  [${i + 1}/${limit}] ${job.title}`);
                
                await page.goto(job.url, { 
                    waitUntil: 'domcontentloaded', 
                    timeout: 30000 
                });
                
                await new Promise(resolve => setTimeout(resolve, 2000));

                const details = await page.evaluate(() => {
                    const content = document.querySelector('[data-cy="content"]') || 
                                   document.querySelector('main') ||
                                   document.body;
                    
                    const text = content.innerText;
                    
                    let requirements = '';
                    const patterns = ['educational qualification', 'what you bring', 'requirements', 'qualifications'];
                    
                    for (const pattern of patterns) {
                        const idx = text.toLowerCase().indexOf(pattern);
                        if (idx !== -1) {
                            requirements = text.substring(idx, idx + 1000);
                            break;
                        }
                    }
                    
                    return {
                        description: text.substring(0, 3000),
                        requirements: requirements || 'Not specified'
                    };
                });

                jobsWithDetails.push({ ...job, ...details });

            } catch (err) {
                console.log(`  ✗ Error: ${err.message}`);
                jobsWithDetails.push({
                    ...job,
                    description: 'Could not fetch',
                    requirements: ''
                });
            }
        }

        console.log(`\n✅ Successfully scraped ${jobsWithDetails.length} jobs!\n`);

        return jobsWithDetails.map(job => ({
            title: job.title,
            url: job.url,
            location: job.location,
            company: 'Zoominfo',
            description: job.description,
            requirements: job.requirements,
            jobType: 'Full-time'
        }));

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        return [];
        
    } finally {
        if (browser) {
            console.log('Closing browser...');
            // Give time to see results
            await new Promise(resolve => setTimeout(resolve, 2000));
            await browser.close();
        }
    }
}

module.exports = scrapeZoominfo;