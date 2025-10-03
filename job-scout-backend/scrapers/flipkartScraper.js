const puppeteer = require('puppeteer');

async function scrapeFlipkart(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Flipkart...');
        browser = await puppeteer.launch({ 
        headless: true, // Changed from false to true
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
      });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`Navigating to Flipkart careers at ${url}...`);
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });

        // Wait for initial content to load
        console.log('Waiting for initial job listings to load...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // SHOW MORE FUNCTIONALITY - Load all available jobs
        console.log('Loading all jobs by clicking "Show More"...');
        let showMoreClicked = 0;
        const maxShowMoreAttempts = 30; // Safety limit
        
        while (showMoreClicked < maxShowMoreAttempts) {
            try {
                // Look for "Show More" button with various selectors
                const showMoreFound = await page.evaluate(() => {
                    // Based on screenshot DOM: button with "Show More" text
                    const showMoreSelectors = [
                        'button:contains("Show More")',
                        '.mdc-button:contains("Show More")',
                        'button[class*="mdc-button"]:contains("Show More")',
                        '.mat-mdc-unelevated-button:contains("Show More")',
                        'button.mat-mdc-unelevated-button'
                    ];
                    
                    // Find the Show More button
                    let showMoreButton = null;
                    
                    // Method 1: Look for button with "Show More" text
                    const allButtons = Array.from(document.querySelectorAll('button'));
                    showMoreButton = allButtons.find(btn => 
                        btn.innerText.trim().toLowerCase().includes('show more')
                    );
                    
                    if (showMoreButton) {
                        console.log('Found Show More button via text search');
                        
                        // Check if button is visible and clickable
                        const style = getComputedStyle(showMoreButton);
                        const isVisible = style.display !== 'none' && 
                                         style.visibility !== 'hidden' && 
                                         showMoreButton.offsetParent !== null;
                        
                        if (isVisible && !showMoreButton.disabled) {
                            // Scroll to button
                            showMoreButton.scrollIntoView({ 
                                behavior: 'smooth', 
                                block: 'center' 
                            });
                            
                            // Small delay then click
                            setTimeout(() => {
                                showMoreButton.click();
                                console.log('Clicked Show More button');
                            }, 1000);
                            
                            return true;
                        } else {
                            console.log('Show More button found but not clickable');
                            return false;
                        }
                    }
                    
                    console.log('Show More button not found');
                    return false;
                });
                
                if (!showMoreFound) {
                    console.log('No more "Show More" button available. All jobs loaded.');
                    break;
                }
                
                showMoreClicked++;
                console.log(`Clicked "Show More" button ${showMoreClicked} times`);
                
                // Wait for new content to load
                console.log('Waiting for new jobs to load...');
                await new Promise(resolve => setTimeout(resolve, 4000));
                
                // Check if more jobs were actually loaded
                const jobCountAfter = await page.evaluate(() => {
                    const jobCards = document.querySelectorAll('.mat-card, .mat-mdc-card, [class*="mat-card"]');
                    return jobCards.length;
                });
                
                console.log(`Current job count: ${jobCountAfter}`);
                
                // If no new jobs loaded after clicking, we're done
                if (showMoreClicked > 1) {
                    const previousJobCount = await page.evaluate(() => {
                        return window.previousJobCount || 0;
                    });
                    
                    if (jobCountAfter <= previousJobCount) {
                        console.log('No new jobs loaded, stopping...');
                        break;
                    }
                }
                
                // Store current job count for next iteration
                await page.evaluate((count) => {
                    window.previousJobCount = count;
                }, jobCountAfter);
                
            } catch (error) {
                console.log(`Error with Show More attempt ${showMoreClicked + 1}:`, error.message);
                break;
            }
        }
        
        console.log(`Completed loading jobs. Clicked "Show More" ${showMoreClicked} times.`);
        
        // Final scroll to ensure all content is rendered
        await page.evaluate(() => {
            window.scrollTo(0, document.body.scrollHeight);
        });
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take screenshot after loading all jobs
        await page.screenshot({ path: 'flipkart-all-jobs.png', fullPage: true });
        console.log('Screenshot saved after loading all jobs');

        console.log('Extracting all loaded jobs...');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            // Based on screenshot: job cards with mat-card class
            const jobCards = Array.from(document.querySelectorAll('.mat-card, .mat-mdc-card, [class*="mat-card"]'));
            console.log(`Found ${jobCards.length} total job cards after loading all`);
            
            jobCards.forEach((card, index) => {
                try {
                    // Extract job title
                    const titleEl = card.querySelector('.mat-card-title, .mat-mdc-card-title, [class*="mat-card-title"]') ||
                                   card.querySelector('h2, h3, h4, .title');
                    
                    if (!titleEl) return;
                    
                    const title = titleEl.innerText.trim();
                    if (!title || title.length < 5) return;
                    
                    // Enhanced location extraction
                    let location = 'Location not specified';
                    
                    // Method 1: Look in mat-card-content
                    const contentEl = card.querySelector('.mat-card-content, .mat-mdc-card-content, [class*="mat-card-content"]');
                    if (contentEl) {
                        const contentText = contentEl.innerText;
                        
                        // Look for "Location:" prefix
                        const locationPrefixMatch = contentText.match(/Location[:\s]*([^\n,]+(?:,[^\n,]+)?)/i);
                        if (locationPrefixMatch) {
                            location = locationPrefixMatch[1].trim();
                        } else {
                            // Pattern matching for Indian cities
                            const locationPatterns = [
                                /Bangalore,?\s*Karnataka/i,
                                /Mumbai,?\s*Maharashtra/i,
                                /Delhi,?\s*NCR/i,
                                /Chennai,?\s*Tamil Nadu/i,
                                /Hyderabad,?\s*Telangana/i,
                                /Pune,?\s*Maharashtra/i,
                                /Gurgaon,?\s*Haryana/i,
                                /Noida,?\s*UP/i,
                                /\b(Bangalore|Mumbai|Delhi|Chennai|Hyderabad|Pune|Gurgaon|Noida)\b/i
                            ];
                            
                            for (const pattern of locationPatterns) {
                                const match = contentText.match(pattern);
                                if (match) {
                                    location = match[0].trim();
                                    break;
                                }
                            }
                        }
                    }
                    
                    // Method 2: Look in all text elements within the card
                    if (location === 'Location not specified') {
                        const allTextElements = card.querySelectorAll('span, div, p, small');
                        for (const el of allTextElements) {
                            const text = el.innerText.trim();
                            if (text.match(/\b(Bangalore|Mumbai|Delhi|Chennai|Hyderabad|Pune|Gurgaon|Noida)\b/i) && 
                                text.length < 50 && !text.toLowerCase().includes('show more')) {
                                location = text;
                                break;
                            }
                        }
                    }
                    
                    // Extract job URL
                    let jobUrl = '';
                    const linkEl = card.querySelector('a[href]') || card.closest('a');
                    if (linkEl) {
                        jobUrl = linkEl.href;
                    }
                    
                    // Extract department based on job title
                    let department = '';
                    const titleLower = title.toLowerCase();
                    if (titleLower.includes('manager') && titleLower.includes('business')) department = 'Business';
                    else if (titleLower.includes('product')) department = 'Product';
                    else if (titleLower.includes('engineering') || titleLower.includes('backend') || titleLower.includes('frontend') || titleLower.includes('architect')) department = 'Engineering';
                    else if (titleLower.includes('data') || titleLower.includes('analytics')) department = 'Data & Analytics';
                    else if (titleLower.includes('design') || titleLower.includes('ux') || titleLower.includes('ui')) department = 'Design';
                    else if (titleLower.includes('marketing')) department = 'Marketing';
                    else if (titleLower.includes('hr') || titleLower.includes('transformation')) department = 'HR';
                    else if (titleLower.includes('security')) department = 'Security';
                    else if (titleLower.includes('manager')) department = 'Management';
                    
                    jobs.push({
                        title: title,
                        url: jobUrl || `https://flipkart.com/jobs/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Generate unique URL if none found
                        location: location,
                        department: department,
                        company: 'Flipkart'
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
        console.log(`Total Flipkart jobs scraped: ${jobsList.length}`);
        
        if (jobsList.length > 0) {
            console.log('\nSample jobs:');
            jobsList.slice(0, 10).forEach((job, index) => {
                console.log(`${index + 1}. "${job.title}"`);
                console.log(`   Location: ${job.location}`);
                console.log(`   Department: ${job.department}\n`);
            });
        }

        return jobsList.map(job => ({
            ...job,
            description: 'All jobs loaded successfully via Show More - descriptions can be fetched later',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping Flipkart:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeFlipkart;
