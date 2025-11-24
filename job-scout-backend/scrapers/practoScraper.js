const puppeteer = require('puppeteer');

async function scrapePracto(url) {
    let browser;
    let page;
    try {
        console.log('🚀 Launching browser for Practo...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('🌐 Starting to scrape Practo careers...\n');
        
        const practoUrl = 'https://practo.app.param.ai/jobs/';
        
        console.log(`Navigating to: ${practoUrl}`);
        await page.goto(practoUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('📄 Extracting job list from Practo...\n');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            // From screenshot: job cards with clickable divs
            const jobCards = Array.from(document.querySelectorAll('a[href*="/jobs/"]'));
            
            jobCards.forEach((card) => {
                try {
                    const jobUrl = card.href;
                    if (!jobUrl || !jobUrl.includes('/jobs/')) return;
                    
                    // Get job title - h3 element
                    const titleEl = card.querySelector('h3');
                    if (!titleEl) return;
                    
                    const title = titleEl.innerText.trim();
                    if (!title || title.length < 3) return;
                    
                    // Get job details from the card
                    let jobType = 'Full-time';
                    let experience = '';
                    let location = 'Bengaluru';
                    
                    // Look for job type badge (Full-time, Contract, etc.)
                    const badges = card.querySelectorAll('span');
                    badges.forEach(badge => {
                        const text = badge.innerText.trim();
                        if (text.match(/full-time|contract|part-time/i)) {
                            jobType = text;
                        }
                        if (text.match(/\d+[-\s]?\d*\s*years?/i)) {
                            experience = text;
                        }
                        if (text.match(/bangalore|bengaluru|hyderabad|mumbai|delhi/i)) {
                            location = text;
                        }
                    });
                    
                    jobs.push({
                        title,
                        url: jobUrl,
                        location,
                        jobType,
                        experience,
                        company: 'Practo'
                    });
                    
                } catch (e) {
                    // Skip
                }
            });
            
            return jobs;
        });

        console.log(`✅ Found ${jobsList.length} jobs from Practo.`);

        if (jobsList.length === 0) {
            console.log('❌ No jobs found.');
            return [];
        }

        // Remove duplicates
        const uniqueJobs = [];
        const seenUrls = new Set();
        
        jobsList.forEach(job => {
            if (!seenUrls.has(job.url)) {
                seenUrls.add(job.url);
                uniqueJobs.push(job);
            }
        });

        console.log(`📊 Unique jobs: ${uniqueJobs.length}`);

        // Fetch descriptions
        const jobsWithDescriptions = [];
        const maxJobsToFetch = Math.min(uniqueJobs.length, 30);

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
                    
                    // From screenshot: "Roles and responsibilities" section
                    const mainContent = document.querySelector('body');
                    if (mainContent) {
                        description = mainContent.innerText.trim();
                        
                        // Look for "Roles and responsibilities" section
                        const strongTags = Array.from(document.querySelectorAll('strong'));
                        strongTags.forEach(strong => {
                            const text = strong.innerText || '';
                            if (text.match(/roles and responsibilities/i)) {
                                let content = '';
                                let nextEl = strong.parentElement?.nextElementSibling;
                                
                                while (nextEl && content.length < 800) {
                                    const elText = nextEl.innerText || '';
                                    if (elText.length > 5) {
                                        content += elText + '\n';
                                    }
                                    nextEl = nextEl.nextElementSibling;
                                    if (nextEl?.querySelector('strong')) break;
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

        console.log(`\n🎉 === PRACTO SCRAPING COMPLETE ===`);
        console.log(`📈 Total jobs scraped: ${jobsWithDescriptions.length}`);
        
        if (jobsWithDescriptions.length > 0) {
            console.log('\n📋 Sample Practo jobs:');
            jobsWithDescriptions.slice(0, 5).forEach((job, i) => {
                console.log(`  ${i + 1}. ${job.title}`);
                console.log(`     📍 ${job.location}`);
                console.log(`     🕐 ${job.experience}`);
            });
        }

        return jobsWithDescriptions.map(job => ({
            title: job.title,
            url: job.url,
            location: job.location,
            company: 'Practo',
            description: job.description,
            requirements: job.requirements,
            jobType: job.jobType
        }));

    } catch (error) {
        console.error('❌ Error scraping Practo:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('\n🔒 Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapePracto;
