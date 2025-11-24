// Script to run scrapers one by one and check job counts
require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');
const { TARGET_COMPANIES } = require('./config');

// Import all scrapers
const scrapeAtlassian = require('./scrapers/atlassianScraper');
const scrapeMicrosoft = require('./scrapers/microsoftScraper');
const scrapeGoogle = require('./scrapers/googleScraper');
const scrapeMeta = require('./scrapers/metaScraper');
const scrapeUber = require('./scrapers/uberScraper');
const scrapeApple = require('./scrapers/appleScraper');
const scrapeAdobe = require('./scrapers/adobeScraper');
const scrapeAmazon = require('./scrapers/amazonScraper');
const scrapeBoeing = require('./scrapers/boeingScraper');
const scrapeCashfree = require('./scrapers/cashfreeScraper');
const scrapeFlipkart = require('./scrapers/flipkartScraper');
const scrapeGroww = require('./scrapers/growwScraper');
const scrapeHitachi = require('./scrapers/hitachiScraper');
const scrapeIntuit = require('./scrapers/intuitScraper');
const scrapeMakemytrip = require('./scrapers/makemytripScraper');
const scrapePaytm = require('./scrapers/paytmScraper');
const scrapePhonepe = require('./scrapers/phonepeScraper');
const scrapePracto = require('./scrapers/practoScraper');
const scrapeQualcomm = require('./scrapers/qualcommScraper');
const scrapeServicenow = require('./scrapers/servicenowScraper');
const scrapeStandardchartered = require('./scrapers/standardcharteredScraper');
const scrapeZoominfo = require('./scrapers/zoominfoScraper');

const scrapers = {
    'Atlassian': scrapeAtlassian,
    'Microsoft': scrapeMicrosoft,
    'Google': scrapeGoogle,
    'Meta': scrapeMeta,
    'Uber': scrapeUber,
    'Apple': scrapeApple,
    'Adobe': scrapeAdobe,
    'Amazon': scrapeAmazon,
    'Boeing': scrapeBoeing,
    'Cashfree Payments': scrapeCashfree,
    'Flipkart': scrapeFlipkart,
    'Groww': scrapeGroww,
    'Hitachi': scrapeHitachi,
    'Intuit': scrapeIntuit,
    'MakeMyTrip': scrapeMakemytrip,
    'Paytm': scrapePaytm,
    'PhonePe': scrapePhonepe,
    'Practo': scrapePracto,
    'Qualcomm': scrapeQualcomm,
    'ServiceNow': scrapeServicenow,
    'Standard Chartered': scrapeStandardchartered,
    'Zoominfo': scrapeZoominfo,
};

async function checkJobCounts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected\n');

        // Get all unique companies from database
        const companies = await Job.distinct('company');
        
        console.log('📊 CURRENT JOB COUNTS IN DATABASE:');
        console.log('═'.repeat(60));
        
        let totalJobs = 0;
        for (const company of companies.sort()) {
            const count = await Job.countDocuments({ company });
            totalJobs += count;
            console.log(`  ${company.padEnd(30)} ${count} jobs`);
        }
        console.log('═'.repeat(60));
        console.log(`  ${'TOTAL'.padEnd(30)} ${totalJobs} jobs\n`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

async function runScrapersOneByOne() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected\n');

        console.log('🚀 RUNNING SCRAPERS ONE BY ONE...\n');
        
        for (const company of TARGET_COMPANIES) {
            const scraperFunction = scrapers[company.name];
            
            if (!scraperFunction) {
                console.log(`⚠️  ${company.name}: No scraper available`);
                continue;
            }

            // Get count before scraping
            const countBefore = await Job.countDocuments({ company: company.name });
            
            console.log(`\n${'─'.repeat(60)}`);
            console.log(`🔍 ${company.name}`);
            console.log(`   Jobs before: ${countBefore}`);
            console.log(`   Scraping...`);

            try {
                const jobs = await scraperFunction(company.url);
                
                if (jobs && jobs.length > 0) {
                    let newJobsSaved = 0;
                    let updatedJobs = 0;
                    
                    for (const job of jobs) {
                        const result = await Job.findOneAndUpdate(
                            { url: job.url },
                            { ...job, company: company.name },
                            { new: true, upsert: true, rawResult: true }
                        );
                        
                        if (result.lastErrorObject?.upserted) {
                            newJobsSaved++;
                        } else {
                            updatedJobs++;
                        }
                    }
                    
                    const countAfter = await Job.countDocuments({ company: company.name });
                    
                    console.log(`   ✅ Scraped: ${jobs.length} jobs`);
                    console.log(`   📦 New jobs added: ${newJobsSaved}`);
                    console.log(`   🔄 Updated jobs: ${updatedJobs}`);
                    console.log(`   📊 Jobs after: ${countAfter} (${countAfter > countBefore ? '+' : ''}${countAfter - countBefore})`);
                } else {
                    console.log(`   ⚠️  No jobs found`);
                }
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }

        // Final summary
        console.log(`\n${'═'.repeat(60)}`);
        console.log('📊 FINAL JOB COUNTS:');
        console.log('═'.repeat(60));
        
        const companies = await Job.distinct('company');
        let totalJobs = 0;
        
        for (const company of companies.sort()) {
            const count = await Job.countDocuments({ company });
            totalJobs += count;
            console.log(`  ${company.padEnd(30)} ${count} jobs`);
        }
        console.log('═'.repeat(60));
        console.log(`  ${'TOTAL'.padEnd(30)} ${totalJobs} jobs\n`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// Run based on command line argument
const command = process.argv[2];

if (command === 'check') {
    checkJobCounts().then(() => process.exit(0));
} else {
    runScrapersOneByOne();
}
