const puppeteer = require('puppeteer');

async function scrapeQualcomm(url) {
    let browser;
    let page;
    try {
        console.log('🚀 Launching browser for Qualcomm...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log('🌐 Starting to scrape Qualcomm India careers...\n');
        
        const qualcommUrl = 'https://careers.qualcomm.com/careers?query=Engineering&location=India';
        
        console.log(`Navigating to: ${qualcommUrl}`);
        await page.goto(qualcommUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(resolve => setTimeout(resolve, 8000));

        // Click "Show More Positions" button multiple times to load all jobs
        console.log('Loading all jobs by clicking Show More Positions...\n');
        let clickCount = 0;
        const maxClicks = 10;

        while (clickCount < maxClicks) {
            const showMoreExists = await page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('button'));
                const showMoreBtn = buttons.find(btn => {
                    const text = btn.innerText || btn.textContent || '';
                    return text.includes('Show More Positions') || 
                           btn.classList.contains('show-more-positions');
                });
                
                if (showMoreBtn && !showMoreBtn.disabled) {
                    showMoreBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    showMoreBtn.click();
                    return true;
                }
                return false;
            });

            if (!showMoreExists) {
                console.log('✓ All jobs loaded (no more "Show More Positions" button)');
                break;
            }

            clickCount++;
            console.log(`  Clicked "Show More Positions" (${clickCount}/${maxClicks})...`);
            await new Promise(resolve => setTimeout(resolve, 4000));
        }

        // Scroll to ensure all jobs are rendered
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 100;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    if (totalHeight >= document.body.scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('\n📄 Extracting job list from Qualcomm...\n');
        
        // Wait for job cards to be populated with actual data
        await page.waitForSelector('.job-card-title', { timeout: 10000 }).catch(() => {
            console.log('Warning: .job-card-title not found');
        });
        
        // Additional wait for JavaScript to populate the cards
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            // Find all job cards
            const jobCards = Array.from(document.querySelectorAll('.job-card-container, [class*="job-card"], [role="listitem"]'));
            
            jobCards.forEach((card, index) => {
                try {
                    // Get title (h3 with job-card-title class)
                    const titleEl = card.querySelector('h3.job-card-title, h3[class*="job-card-title"]');
                    if (!titleEl) return;
                    
                    const title = (titleEl.innerText || titleEl.textContent || '').trim();
                    if (!title || title.length < 3 || title.length > 150) return;
                    
                    // Get all text from the card to extract location
                    const cardText = (card.innerText || card.textContent || '').trim();
                    const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    // Location is typically the second line after title
                    let location = 'Location not specified';
                    for (const line of lines) {
                        if (line.match(/\b(India|Bangalore|Bengaluru|Hyderabad|Chennai|Noida|Delhi|Mumbai|Pune|Gurugram|Gurgaon|Telangana)\b/i)) {
                            location = line;
                            break;
                        }
                    }
                    
                    // Try to find job URL - check for onclick handlers or data attributes
                    const clickableEl = card.querySelector('[role="link"], a');
                    let jobUrl = '';
                    
                    if (clickableEl) {
                        // Check href first
                        if (clickableEl.href) {
                            jobUrl = clickableEl.href;
                        } else {
                            // Look for onclick or data attributes
                            const onclick = clickableEl.getAttribute('onclick') || '';
                            const dataUrl = clickableEl.getAttribute('data-url') || 
                                          clickableEl.getAttribute('data-href') || '';
                            
                            if (dataUrl) {
                                jobUrl = dataUrl;
                            } else if (onclick) {
                                // Extract URL from onclick
                                const urlMatch = onclick.match(/['"]([^'"]*careers[^'"]*)['"]/);
                                if (urlMatch) jobUrl = urlMatch[1];
                            }
                        }
                    }
                    
                    // If still no URL, try to extract job ID and construct URL
                    if (!jobUrl) {
                        // Look for ID in various places
                        const jobId = card.getAttribute('data-job-id') || 
                                     card.getAttribute('data-position-id') ||
                                     card.getAttribute('id')?.replace(/[^0-9]/g, '') ||
                                     card.querySelector('[data-job-id]')?.getAttribute('data-job-id');
                        
                        if (jobId) {
                            jobUrl = `https://careers.qualcomm.com/careers/job/${jobId}`;
                        } else {
                            // Last resort: look for ID in HTML
                            const htmlStr = card.outerHTML;
                            const idMatch = htmlStr.match(/position-card-(\d+)|job[/-](\d+)|ID[:-]\s*(\d+)/i);
                            if (idMatch) {
                                const id = idMatch[1] || idMatch[2] || idMatch[3];
                                jobUrl = `https://careers.qualcomm.com/careers/job/${id}`;
                            } else {
                                // Mark this card with index so we can click it later
                                jobUrl = `__NEEDS_CLICK_${index}__`;
                            }
                        }
                    }
                    
                    // Make sure URL is absolute
                    if (jobUrl && !jobUrl.startsWith('http') && !jobUrl.startsWith('__')) {
                        jobUrl = 'https://careers.qualcomm.com' + (jobUrl.startsWith('/') ? '' : '/') + jobUrl;
                    }
                    
                    jobs.push({
                        title,
                        url: jobUrl,
                        location,
                        company: 'Qualcomm',
                        cardIndex: index
                    });
                    
                } catch (e) {
                    // Skip this card
                }
            });
            
            return jobs;
        });

        console.log(`✅ Found ${jobsList.length} jobs from Qualcomm.`);

        if (jobsList.length === 0) {
            console.log('❌ No jobs found. Debugging...');
            
            const sampleHTML = await page.evaluate(() => {
                const firstCard = document.querySelector('.job-card-container, [role="listitem"]');
                if (firstCard) {
                    return {
                        outerHTML: firstCard.outerHTML.substring(0, 2000),
                        text: firstCard.innerText?.substring(0, 500) || 'No text'
                    };
                }
                return null;
            });
            
            console.log('Sample card:', JSON.stringify(sampleHTML, null, 2));
            return [];
        }

        // For jobs that need URL from clicking, we'll click them one by one
        const jobsNeedingClick = jobsList.filter(j => j.url.startsWith('__NEEDS_CLICK_'));
        
        if (jobsNeedingClick.length > 0) {
            console.log(`\n🖱️ Getting URLs for ${jobsNeedingClick.length} jobs by clicking...\n`);
            
            for (const job of jobsNeedingClick) {
                try {
                    const cardIndex = job.cardIndex;
                    
                    // Click the card and capture navigation
                    const actualUrl = await page.evaluate((idx) => {
                        const cards = Array.from(document.querySelectorAll('.job-card-container, [role="listitem"]'));
                        const card = cards[idx];
                        if (!card) return null;
                        
                        const clickable = card.querySelector('[role="link"], a, .job-card-title');
                        if (clickable) {
                            clickable.click();
                            // Wait a bit for navigation to start
                            return new Promise(resolve => {
                                setTimeout(() => {
                                    resolve(window.location.href);
                                }, 1000);
                            });
                        }
                        return null;
                    }, cardIndex);
                    
                    if (actualUrl && actualUrl.includes('careers')) {
                        job.url = actualUrl;
                        // Go back to listing page
                        await page.goBack({ waitUntil: 'networkidle2' });
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (err) {
                    console.log(`  ⚠️ Could not get URL for: ${job.title}`);
                }
            }
        }

        // Remove duplicates and filter out jobs without valid URLs
        const uniqueJobs = [];
        const seenUrls = new Set();
        
        jobsList.forEach(job => {
            if (job.url && !job.url.startsWith('__') && !seenUrls.has(job.url)) {
                seenUrls.add(job.url);
                uniqueJobs.push(job);
            }
        });

        console.log(`📊 Unique jobs with valid URLs: ${uniqueJobs.length}`);

        // Fetch descriptions
        const jobsWithDescriptions = [];
        // Set to 0 or a high number to fetch all jobs, or set a specific limit
        const maxJobsToFetch = uniqueJobs.length; // Fetch ALL jobs
        // const maxJobsToFetch = Math.min(uniqueJobs.length, 50); // Or set your own limit

        console.log(`\n📝 Fetching descriptions for ${maxJobsToFetch} jobs (this may take several minutes)...\n`);

        for (let i = 0; i < maxJobsToFetch; i++) {
            const job = uniqueJobs[i];
            try {
                console.log(`[${i + 1}/${maxJobsToFetch}] ${job.title}`);
                
                await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 2000));

                const jobDetails = await page.evaluate(() => {
                    let description = '';
                    let requirements = '';
                    
                    // Try multiple selectors for job description
                    const descDiv = document.querySelector('.position-job-description, [class*="job-description"], .job-description, #job-description');
                    
                    if (descDiv) {
                        description = (descDiv.innerText || descDiv.textContent || '').trim();
                        
                        // Extract requirements section
                        const headings = descDiv.querySelectorAll('b, strong, h2, h3, h4, h5');
                        for (const heading of headings) {
                            const text = (heading.innerText || heading.textContent || '').trim();
                            if (text.match(/minimum qualifications|qualifications|requirements|required|skills/i)) {
                                let content = '';
                                let nextEl = heading.nextElementSibling || heading.parentElement?.nextElementSibling;
                                
                                while (nextEl && content.length < 1000) {
                                    const elText = (nextEl.innerText || nextEl.textContent || '').trim();
                                    if (elText.length > 5) {
                                        content += elText + '\n';
                                    }
                                    nextEl = nextEl.nextElementSibling;
                                    if (nextEl?.tagName?.match(/H[1-6]|B|STRONG/)) break;
                                }
                                
                                if (content) {
                                    requirements = content.trim();
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

        console.log(`\n🎉 === QUALCOMM SCRAPING COMPLETE ===`);
        console.log(`📈 Total jobs scraped: ${jobsWithDescriptions.length}`);
        
        if (jobsWithDescriptions.length > 0) {
            console.log('\n📋 Sample Qualcomm jobs:');
            jobsWithDescriptions.slice(0, 5).forEach((job, i) => {
                console.log(`  ${i + 1}. ${job.title}`);
                console.log(`     📍 ${job.location}`);
                console.log(`     🔗 ${job.url.substring(0, 60)}...`);
            });
        }

        return jobsWithDescriptions.map(job => ({
            title: job.title,
            url: job.url,
            location: job.location,
            company: 'Qualcomm',
            description: job.description,
            requirements: job.requirements,
            jobType: 'Full-time'
        }));

    } catch (error) {
        console.error('❌ Error scraping Qualcomm:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('\n🔒 Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeQualcomm;