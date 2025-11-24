const puppeteer = require('puppeteer');

async function scrapeGroww(url) {
    let browser;
    let page;
    try {
        console.log('🚀 Launching browser for Groww...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('🌐 Starting to scrape Groww careers...\n');
        
        const growwUrl = 'https://job-boards.eu.greenhouse.io/groww';
        
        console.log(`Navigating to: ${growwUrl}`);
        await page.goto(growwUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('📄 Extracting job list from Groww...\n');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            // Greenhouse structure: job links are in anchor tags with href containing /groww/jobs/
            const jobCards = Array.from(document.querySelectorAll('a[href*="/groww/jobs/"]'));
            
            jobCards.forEach((card) => {
                try {
                    const jobUrl = card.href;
                    if (!jobUrl || !jobUrl.includes('/groww/jobs/')) return;
                    
                    // Get job title from the anchor text or nested elements
                    let title = card.innerText.trim();
                    
                    // Sometimes title is in a div inside the anchor
                    const titleDiv = card.querySelector('div');
                    if (titleDiv && titleDiv.innerText.trim()) {
                        title = titleDiv.innerText.trim();
                    }
                    
                    if (!title || title.length < 3) return;
                    
                    // Get location - typically in a span with class containing "location" or in body metadata
                    let location = 'Bengaluru, India';
                    const locationSpans = card.querySelectorAll('span');
                    locationSpans.forEach(span => {
                        const text = span.innerText.trim();
                        if (text.match(/bengaluru|bangalore|mumbai|delhi|india|hyderabad/i)) {
                            location = text;
                        }
                    });
                    
                    // Department can be inferred from the section headers
                    let department = '';
                    
                    jobs.push({
                        title,
                        url: jobUrl,
                        location,
                        department,
                        company: 'Groww'
                    });
                    
                } catch (e) {
                    // Skip invalid entries
                }
            });
            
            return jobs;
        });

        console.log(`✅ Found ${jobsList.length} jobs from Groww.`);

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
                    let location = '';
                    let department = '';
                    
                    // Greenhouse job pages have consistent structure
                    // Location is typically in .location class or body metadata
                    const locationEl = document.querySelector('.location');
                    if (locationEl) {
                        location = locationEl.innerText.trim();
                    }
                    
                    // Department/category
                    const deptEl = document.querySelector('[class*="department"]');
                    if (deptEl) {
                        department = deptEl.innerText.trim();
                    }
                    
                    // Main job content - usually in #content or .content div
                    const contentDiv = document.querySelector('#content, .content, [class*="job-post"]');
                    if (contentDiv) {
                        description = contentDiv.innerText.trim();
                    }
                    
                    // Look for specific sections
                    const allText = document.body.innerText;
                    
                    // Extract "Our Values" section
                    const valuesMatch = allText.match(/Our Values[\s\S]{0,800}/i);
                    if (valuesMatch) {
                        requirements += valuesMatch[0] + '\n\n';
                    }
                    
                    // Extract "Responsibilities" or "Skills" sections
                    const responsibilitiesMatch = allText.match(/Responsibilities[\s\S]{0,1000}/i);
                    if (responsibilitiesMatch) {
                        requirements += responsibilitiesMatch[0];
                    }
                    
                    const skillsMatch = allText.match(/Skills[\s\S]{0,800}/i);
                    if (skillsMatch && !requirements.includes('Skills')) {
                        requirements += '\n' + skillsMatch[0];
                    }
                    
                    return {
                        description: description || 'Description not available',
                        requirements: requirements.trim() || '',
                        location: location || 'Bengaluru, India',
                        department: department || ''
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

        console.log(`\n🎉 === GROWW SCRAPING COMPLETE ===`);
        console.log(`📈 Total jobs scraped: ${jobsWithDescriptions.length}`);
        
        if (jobsWithDescriptions.length > 0) {
            console.log('\n📋 Sample Groww jobs:');
            jobsWithDescriptions.slice(0, 5).forEach((job, i) => {
                console.log(`  ${i + 1}. ${job.title}`);
                console.log(`     📍 ${job.location}`);
                console.log(`     🏢 ${job.department || 'N/A'}`);
            });
        }

        return jobsWithDescriptions.map(job => ({
            title: job.title,
            url: job.url,
            location: job.location,
            company: 'Groww',
            description: job.description,
            requirements: job.requirements,
            department: job.department
        }));

    } catch (error) {
        console.error('❌ Error scraping Groww:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('\n🔒 Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeGroww;
