const puppeteer = require('puppeteer');

async function scrapePhonePe(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for PhonePe...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navigating to PhonePe careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // Wait for job listings to load
        console.log('Waiting for job listings to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('Extracting jobs from PhonePe...');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            console.log('=== PHONEPE/GREENHOUSE JOB EXTRACTION ===');
            
            // Based on screenshot: look for job cards with class="card"
            const jobCards = Array.from(document.querySelectorAll('a.card, .card'));
            console.log(`Found ${jobCards.length} job cards`);
            
            jobCards.forEach((card, index) => {
                try {
                    // Extract job title - from screenshot: div class="card_title"
                    let title = '';
                    const titleEl = card.querySelector('.card_title');
                    if (titleEl) {
                        title = titleEl.innerText.trim();
                    }
                    
                    if (!title || title.length < 3) {
                        console.log(`Skipping card ${index}: no valid title`);
                        return;
                    }
                    
                    console.log(`Processing job ${index + 1}: "${title}"`);
                    
                    // Extract location - from screenshot: div class="card_location"
                    let location = 'Location not specified';
                    const locationEl = card.querySelector('.card_location');
                    if (locationEl) {
                        location = locationEl.innerText.trim();
                        console.log(`Found location: "${location}"`);
                    }
                    
                    // Extract job URL
                    let jobUrl = '';
                    if (card.tagName === 'A' && card.href) {
                        jobUrl = card.href;
                    } else {
                        const linkEl = card.querySelector('a[href]');
                        if (linkEl) {
                            jobUrl = linkEl.href;
                        }
                    }
                    
                    // Extract department - from screenshot: div class="card_department"
                    let department = '';
                    const deptEl = card.querySelector('.card_department');
                    if (deptEl) {
                        department = deptEl.innerText.trim();
                    }
                    
                    // Extract job type - from screenshot: div class="card_type"
                    let jobType = 'Full time';
                    const typeEl = card.querySelector('.card_type');
                    if (typeEl) {
                        jobType = typeEl.innerText.trim();
                    }
                    
                    // Extract date posted - from screenshot: div class="card_date"
                    let datePosted = '';
                    const dateEl = card.querySelector('.card_date');
                    if (dateEl) {
                        datePosted = dateEl.innerText.trim();
                    }
                    
                    jobs.push({
                        title: title,
                        url: jobUrl || `https://www.phonepe.com/careers/${Date.now()}-${index}`,
                        location: location,
                        department: department,
                        jobType: jobType,
                        datePosted: datePosted,
                        company: 'PhonePe'
                    });
                    
                } catch (e) {
                    console.log(`Error processing card ${index}:`, e.message);
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

        console.log(`\n=== PHONEPE SCRAPING COMPLETE ===`);
        console.log(`Total jobs found: ${jobsList.length}`);
        
        if (jobsList.length > 0) {
            console.log('\nSample PhonePe jobs:');
            jobsList.slice(0, 10).forEach((job, index) => {
                console.log(`  ${index + 1}. "${job.title}"`);
                console.log(`     Location: ${job.location}`);
                console.log(`     Department: ${job.department}`);
                console.log(`     Type: ${job.jobType}`);
                console.log(`     Posted: ${job.datePosted}`);
            });
        }

        return jobsList.map(job => ({
            ...job,
            description: 'PhonePe job extracted successfully - descriptions can be added later',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping PhonePe:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing PhonePe browser...');
            await browser.close();
        }
    }
}

module.exports = scrapePhonePe;
