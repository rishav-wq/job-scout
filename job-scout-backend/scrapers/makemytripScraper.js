const puppeteer = require('puppeteer');

async function scrapeMakeMyTrip(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for MakeMyTrip...');
        browser = await puppeteer.launch({ 
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navigating to MakeMyTrip careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // Wait for initial content to load
        console.log('Waiting for initial content to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // LOAD MORE FUNCTIONALITY
        console.log('Loading all available jobs by clicking "Load More"...');
        let loadMoreClicked = 0;
        const maxLoadMoreAttempts = 20; // Prevent infinite loop
        
        while (loadMoreClicked < maxLoadMoreAttempts) {
            try {
                // Look for "Load More" button with various selectors
                const loadMoreSelectors = [
                    'button:contains("LOAD MORE")',
                    'button:contains("Load More")', 
                    'button:contains("Show More")',
                    '.load-more',
                    '#load-more',
                    '[data-load-more]',
                    'button[class*="load"]',
                    'a:contains("LOAD MORE")',
                    'a:contains("Load More")'
                ];
                
                let loadMoreButton = null;
                
                // Try to find the load more button
                for (const selector of loadMoreSelectors) {
                    try {
                        if (selector.includes(':contains')) {
                            // Use evaluate for :contains selectors
                            loadMoreButton = await page.evaluateHandle(() => {
                                const buttons = Array.from(document.querySelectorAll('button, a'));
                                return buttons.find(btn => 
                                    btn.innerText.match(/LOAD MORE|Load More|Show More/i)
                                );
                            });
                            
                            if (loadMoreButton && await loadMoreButton.asElement()) {
                                break;
                            }
                        } else {
                            loadMoreButton = await page.$(selector);
                            if (loadMoreButton) break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
                
                if (loadMoreButton && await loadMoreButton.asElement()) {
                    console.log(`Clicking "Load More" button (attempt ${loadMoreClicked + 1})...`);
                    
                    // Scroll to button first
                    await page.evaluate((button) => {
                        button.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, await loadMoreButton.asElement());
                    
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Get initial job count
                    const jobCountBefore = await page.evaluate(() => {
                        const jobCards = document.querySelectorAll('.bs-card, .job-card, .opening-card, a[href*="/prod/opportunity/"]');
                        return jobCards.length;
                    });
                    
                    // Click the button
                    await loadMoreButton.asElement().click();
                    loadMoreClicked++;
                    
                    // Wait for new content to load
                    console.log('Waiting for new jobs to load...');
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    
                    // Check if more jobs were loaded
                    const jobCountAfter = await page.evaluate(() => {
                        const jobCards = document.querySelectorAll('.bs-card, .job-card, .opening-card, a[href*="/prod/opportunity/"]');
                        return jobCards.length;
                    });
                    
                    console.log(`Jobs before: ${jobCountBefore}, Jobs after: ${jobCountAfter}`);
                    
                    if (jobCountAfter <= jobCountBefore) {
                        console.log('No new jobs loaded, stopping...');
                        break;
                    }
                    
                } else {
                    console.log('No "Load More" button found, all jobs may be loaded');
                    break;
                }
                
            } catch (error) {
                console.log(`Error with Load More attempt ${loadMoreClicked + 1}:`, error.message);
                break;
            }
        }
        
        console.log(`Completed loading jobs. Clicked "Load More" ${loadMoreClicked} times.`);
        
        // Final scroll to ensure all content is rendered
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take screenshot after loading all jobs
        await page.screenshot({ path: 'makemytrip-all-jobs.png', fullPage: true });
        console.log('Screenshot saved after loading all jobs');

        console.log('Extracting all loaded jobs...');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            // Based on your screenshots, look for job card containers
            const jobCards = Array.from(document.querySelectorAll('.bs-card, a[href*="/prod/opportunity/"]'));
            console.log(`Found ${jobCards.length} job cards total`);
            
            jobCards.forEach((card, index) => {
                try {
                    // Extract job title - from screenshots: h2 elements
                    const titleEl = card.querySelector('h2, .title, [class*="title"]');
                    if (!titleEl) return;
                    
                    const title = titleEl.innerText.trim();
                    if (!title || title.length < 5) return;
                    
                    // Skip generic content
                    if (title.match(/(opportunities|about us|company|load more)/i)) return;
                    
                    // Extract location - from screenshots: shows "India | Gurgaon, Bangalore"
                    let location = 'Location not specified';
                    
                    // Look for location patterns in the card
                    const cardText = card.innerText;
                    
                    // Pattern 1: "India | City, City"
                    const locationMatch1 = cardText.match(/India\s*\|\s*([^|]+)/);
                    if (locationMatch1) {
                        location = `India | ${locationMatch1[1].trim()}`;
                    } else {
                        // Pattern 2: Just city names
                        const locationMatch2 = cardText.match(/\b(Gurgaon|Gurugram|Bangalore|Bengaluru|Mumbai|Delhi|Chennai|Hyderabad|Pune|Noida|Remote)\b/i);
                        if (locationMatch2) {
                            location = locationMatch2[0];
                        }
                    }
                    
                    // Extract department/category - from screenshots: "TECHNOLOGY", "HOLIDAYS", "CORPORATE" badges
                    let department = '';
                    const badges = card.querySelectorAll('.badge, [class*="typ-"], span');
                    for (const badge of badges) {
                        const badgeText = badge.innerText.trim().toUpperCase();
                        if (badgeText.match(/^(TECHNOLOGY|HOLIDAYS|CORPORATE|BUSINESS|MARKETING|HR|FINANCE)$/)) {
                            department = badgeText;
                            break;
                        }
                    }
                    
                    // Extract posted time - from screenshots: "Updated X hours/minutes ago"
                    let postedTime = '';
                    const timeMatch = cardText.match(/Updated\s+\d+\s+(hours?|minutes?|days?)\s+ago/i);
                    if (timeMatch) {
                        postedTime = timeMatch[0];
                    }
                    
                    // Extract job URL
                    let jobUrl = '';
                    if (card.tagName === 'A') {
                        jobUrl = card.href;
                    } else {
                        const linkEl = card.querySelector('a[href]');
                        if (linkEl) jobUrl = linkEl.href;
                    }
                    
                    jobs.push({
                        title: title,
                        url: jobUrl || 'URL not available',
                        location: location,
                        department: department,
                        postedTime: postedTime,
                        company: 'MakeMyTrip'
                    });
                    
                } catch (e) {
                    console.log(`Error processing job card ${index}:`, e.message);
                }
            });
            
            // Remove duplicates based on title
            const uniqueJobs = [];
            const seenTitles = new Set();
            
            jobs.forEach(job => {
                const normalizedTitle = job.title.toLowerCase().trim();
                if (!seenTitles.has(normalizedTitle)) {
                    seenTitles.add(normalizedTitle);
                    uniqueJobs.push(job);
                }
            });
            
            console.log(`Extracted ${uniqueJobs.length} unique jobs after deduplication`);
            return uniqueJobs;
        });

        console.log(`\n=== FINAL RESULTS ===`);
        console.log(`Total MakeMyTrip jobs scraped: ${jobsList.length}`);
        
        if (jobsList.length > 0) {
            console.log('\nSample jobs:');
            jobsList.slice(0, 10).forEach((job, index) => {
                console.log(`${index + 1}. "${job.title}"`);
                console.log(`   Location: ${job.location}`);
                console.log(`   Department: ${job.department}`);
                console.log(`   Posted: ${job.postedTime}\n`);
            });
        }

        return jobsList.map(job => ({
            ...job,
            description: 'All jobs loaded successfully - descriptions can be fetched later',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping MakeMyTrip:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeMakeMyTrip;
