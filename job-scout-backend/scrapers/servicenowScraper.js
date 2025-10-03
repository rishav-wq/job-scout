const puppeteer = require('puppeteer');

async function scrapeServiceNow(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for ServiceNow...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Remove hash from URL and use domcontentloaded
        const cleanUrl = url.split('#')[0];
        console.log(`Navigating to ServiceNow careers at ${cleanUrl}...`);
        await page.goto(cleanUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for job listings to load with longer timeout
        console.log('Waiting for job listings to load...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        const allJobs = [];
        let currentPage = 1;
        const maxPages = 9; // Based on screenshot showing 9 pages

        while (currentPage <= maxPages) {
            console.log(`\n--- Scraping page ${currentPage} ---`);
            
            try {
                // Extract jobs from current page
                const pageJobs = await page.evaluate(() => {
                    const jobs = [];
                    
                    // Look for job cards/items
                    const jobElements = Array.from(document.querySelectorAll('.card, [class*="card-job"], li.page-item, div[class*="job"]'));
                    const jobCards = jobElements.filter(el => {
                        const text = el.innerText || '';
                        return text && 
                               text.match(/(staff|senior|manager|developer|architect|engineer|solution|analyst)/i) &&
                               text.length > 30 && text.length < 500 &&
                               (text.match(/hyderabad|bangalore|bengaluru|mumbai|india/i) || text.length > 40);
                    });
                    
                    jobCards.forEach((card) => {
                        try {
                            const cardText = card.innerText || '';
                            const lines = cardText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
                            
                            // Extract title
                            let title = '';
                            for (const line of lines) {
                                if (line.match(/(staff|senior|manager|developer|architect|engineer|solution|analyst)/i) &&
                                    line.length > 10 && line.length < 150 &&
                                    !line.match(/(hyderabad|bangalore|bengaluru|page|apply)/i)) {
                                    title = line;
                                    break;
                                }
                            }
                            
                            if (!title) {
                                const titleEl = card.querySelector('h2, h3, h4, .card-title, strong, a');
                                if (titleEl) title = titleEl.innerText.trim();
                            }
                            
                            if (!title || title.length < 5) return;
                            
                            // Extract location
                            let location = 'India';
                            for (const line of lines) {
                                if (line.match(/^(Hyderabad|Bangalore|Bengaluru|Mumbai|Delhi|Chennai|Pune)$/i)) {
                                    location = line;
                                    break;
                                }
                            }
                            
                            // Extract URL
                            let jobUrl = '';
                            const linkEl = card.querySelector('a[href*="job"]');
                            if (linkEl && linkEl.href) {
                                jobUrl = linkEl.href;
                            }
                            
                            // Determine department
                            let department = 'Technology';
                            const titleLower = title.toLowerCase();
                            if (titleLower.includes('program') && titleLower.includes('manager')) department = 'Program Management';
                            else if (titleLower.includes('machine learning') || titleLower.includes('ml')) department = 'Data & ML';
                            else if (titleLower.includes('solution') && titleLower.includes('architect')) department = 'Solutions Architecture';
                            else if (titleLower.includes('quality')) department = 'Quality Engineering';
                            else if (titleLower.includes('developer') || titleLower.includes('engineer')) department = 'Engineering';
                            else if (titleLower.includes('architect')) department = 'Architecture';
                            else if (titleLower.includes('sales')) department = 'Sales';
                            
                            jobs.push({
                                title: title,
                                url: jobUrl || `https://careers.servicenow.com/jobs`,
                                location: location,
                                department: department,
                                company: 'ServiceNow'
                            });
                            
                        } catch (e) {
                            // Silent
                        }
                    });
                    
                    return jobs;
                });

                console.log(`Extracted ${pageJobs.length} jobs from page ${currentPage}`);
                allJobs.push(...pageJobs);

                if (currentPage >= maxPages) {
                    console.log('Reached maximum pages');
                    break;
                }

                // Try to click next page button
                const nextPageClicked = await page.evaluate(() => {
                    try {
                        // Look for next page button
                        const nextButtons = Array.from(document.querySelectorAll('.page-link, a[aria-label*="Page"], button'));
                        const nextButton = nextButtons.find(btn => {
                            const text = (btn.innerText || '').trim();
                            return text === '›' || text === 'Next' || text === '>';
                        });
                        
                        if (nextButton) {
                            nextButton.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            setTimeout(() => nextButton.click(), 500);
                            return true;
                        }
                        
                        // Alternative: click next page number
                        const currentActive = document.querySelector('.page-item.active');
                        if (currentActive && currentActive.nextElementSibling) {
                            const link = currentActive.nextElementSibling.querySelector('a, button');
                            if (link) {
                                link.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setTimeout(() => link.click(), 500);
                                return true;
                            }
                        }
                        
                        return false;
                    } catch (e) {
                        return false;
                    }
                });

                if (!nextPageClicked) {
                    console.log('Could not find next page button');
                    break;
                }

                console.log('Waiting for next page to load...');
                await new Promise(resolve => setTimeout(resolve, 5000));
                currentPage++;
                
            } catch (pageError) {
                console.log(`Error on page ${currentPage}: ${pageError.message}`);
                break;
            }
        }

        // Remove duplicates
        const uniqueJobs = [];
        const seenTitles = new Set();
        
        allJobs.forEach(job => {
            const normalizedTitle = job.title.toLowerCase().trim();
            if (!seenTitles.has(normalizedTitle) && job.title.length > 5) {
                seenTitles.add(normalizedTitle);
                uniqueJobs.push(job);
            }
        });

        console.log(`\n=== SERVICENOW SCRAPING COMPLETE ===`);
        console.log(`Total pages scraped: ${currentPage}`);
        console.log(`Total unique jobs found: ${uniqueJobs.length}`);
        
        if (uniqueJobs.length > 0) {
            console.log('\nSample ServiceNow jobs:');
            uniqueJobs.slice(0, 10).forEach((job, index) => {
                console.log(`  ${index + 1}. "${job.title}"`);
                console.log(`     Location: ${job.location}`);
                console.log(`     Department: ${job.department}`);
            });
        }

        return uniqueJobs.map(job => ({
            ...job,
            description: 'ServiceNow job extracted successfully',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping ServiceNow:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing ServiceNow browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeServiceNow;
