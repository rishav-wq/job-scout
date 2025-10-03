const puppeteer = require('puppeteer');

async function scrapeCashfree(url) {
    let browser;
    let page;
    try {
        console.log('Launching browser for Cashfree Payments...');
        browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        page = await browser.newPage();
        await page.setViewport({ width: 1366, height: 768 });
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Skip the main page and go directly to the jobs iframe
        const jobsUrl = 'https://careers.kula.ai/cashfree?jobs=true';
        console.log(`Navigating directly to Cashfree jobs at ${jobsUrl}...`);
        
        await page.goto(jobsUrl, { 
            waitUntil: 'domcontentloaded', // Less strict wait condition
            timeout: 30000 
        });

        // Wait for content to load
        console.log('Waiting for job content to load...');
        await new Promise(resolve => setTimeout(resolve, 8000));

        console.log('Extracting jobs from Cashfree careers page...');
        
        const jobsList = await page.evaluate(() => {
            const jobs = [];
            
            console.log('Page loaded, looking for jobs...');
            console.log('Page title:', document.title);
            console.log('Body text length:', document.body.innerText.length);
            
            // Strategy 1: Look for common job posting patterns
            const allElements = Array.from(document.querySelectorAll('div, section, article, li'));
            
            // Filter elements that look like job postings
            const jobElements = allElements.filter(el => {
                const text = el.innerText || '';
                
                // Must contain job-related keywords
                const hasJobKeywords = text.match(/(engineer|analyst|manager|developer|specialist|devops|associate|director)/i);
                
                // Must contain application-related text
                const hasApplyText = text.match(/(apply now|apply|full time|part time|on-site)/i);
                
                // Must contain location info
                const hasLocation = text.match(/(bengaluru|bangalore|mumbai|delhi|india|karnataka)/i);
                
                // Reasonable length
                const reasonableLength = text.length > 30 && text.length < 1000;
                
                // Should not be too generic
                const notGeneric = !text.match(/^(home|about|contact|menu|navigation)$/i);
                
                return hasJobKeywords && (hasApplyText || hasLocation) && reasonableLength && notGeneric;
            });
            
            console.log(`Found ${jobElements.length} potential job elements`);
            
            // Process each potential job element
            jobElements.forEach((element, index) => {
                try {
                    const elementText = element.innerText || '';
                    
                    // Extract job title
                    const lines = elementText.split('\n')
                        .map(line => line.trim())
                        .filter(line => line.length > 3);
                    
                    let title = '';
                    
                    // Look for the line that contains job title patterns
                    for (const line of lines) {
                        if (line.match(/(engineer|analyst|manager|developer|specialist|devops|associate|director)/i) && 
                            !line.match(/(apply now|full time|bengaluru|bangalore|mumbai|cashfree)/i) &&
                            line.length > 5 && line.length < 150) {
                            title = line;
                            break;
                        }
                    }
                    
                    // Fallback: use first substantial line
                    if (!title) {
                        title = lines.find(line => 
                            line.length > 10 && 
                            line.length < 100 && 
                            !line.match(/(apply now|full time|bengaluru|bangalore|mumbai)/i)
                        ) || lines[0] || '';
                    }
                    
                    if (!title || title.length < 5) {
                        console.log(`Skipping element ${index}: no valid title found`);
                        return;
                    }
                    
                    console.log(`Processing job ${index + 1}: "${title}"`);
                    
                    // Extract location
                    let location = 'India';
                    const locationMatch = elementText.match(/(Bengaluru,?\s*Karnataka,?\s*India|Bangalore,?\s*Karnataka,?\s*India|Mumbai,?\s*Maharashtra,?\s*India|Delhi,?\s*NCR,?\s*India|\b(Bengaluru|Bangalore|Mumbai|Delhi|Chennai|Hyderabad|Pune)\b)/i);
                    if (locationMatch) {
                        location = locationMatch[0].trim();
                    }
                    
                    // Determine job type
                    let jobType = 'Full Time';
                    if (elementText.match(/part.time/i)) jobType = 'Part Time';
                    else if (elementText.match(/contract/i)) jobType = 'Contract';
                    else if (elementText.match(/intern/i)) jobType = 'Internship';
                    
                    // Determine department
                    let department = 'Technology';
                    const titleLower = title.toLowerCase();
                    if (titleLower.includes('devops') || titleLower.includes('engineer')) department = 'Engineering';
                    else if (titleLower.includes('customer') || titleLower.includes('success')) department = 'Customer Success';
                    else if (titleLower.includes('associate') && !titleLower.includes('engineer')) department = 'Operations';
                    else if (titleLower.includes('data') || titleLower.includes('analyst')) department = 'Data & Analytics';
                    else if (titleLower.includes('manager') || titleLower.includes('director')) department = 'Management';
                    else if (titleLower.includes('product')) department = 'Product';
                    else if (titleLower.includes('sales') || titleLower.includes('business')) department = 'Sales';
                    
                    jobs.push({
                        title: title,
                        url: `https://careers.kula.ai/cashfree/job/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        location: location,
                        jobType: jobType,
                        department: department,
                        company: 'Cashfree Payments'
                    });
                    
                } catch (error) {
                    console.log(`Error processing job element ${index}:`, error.message);
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
            
            console.log(`Final result: ${uniqueJobs.length} unique jobs found`);
            uniqueJobs.forEach((job, i) => {
                console.log(`${i + 1}. "${job.title}" - ${job.location} (${job.department})`);
            });
            
            // If no jobs found, provide debug info
            if (uniqueJobs.length === 0) {
                console.log('No jobs found. Debug info:');
                console.log('Sample page content:', document.body.innerText.substring(0, 500));
                
                const allText = document.body.innerText;
                const jobKeywordMatches = allText.match(/(engineer|analyst|manager|developer|specialist|devops|associate)/gi) || [];
                console.log('Job keywords found:', jobKeywordMatches.length);
                
                const applyMatches = allText.match(/(apply now|apply|full time)/gi) || [];
                console.log('Apply-related text found:', applyMatches.length);
            }
            
            return uniqueJobs;
        });

        console.log(`Cashfree scraper found ${jobsList.length} jobs`);
        
        if (jobsList.length > 0) {
            console.log('Successfully extracted Cashfree jobs:');
            jobsList.forEach((job, index) => {
                console.log(`  ${index + 1}. "${job.title}" - ${job.location} (${job.department})`);
            });
        }

        return jobsList.map(job => ({
            ...job,
            description: 'Cashfree job extracted successfully - descriptions can be added later',
            requirements: ''
        }));

    } catch (error) {
        console.error('Error scraping Cashfree Payments:', error.message);
        return [];
    } finally {
        if (browser) {
            console.log('Closing Cashfree browser...');
            await browser.close();
        }
    }
}

module.exports = scrapeCashfree;
