// In services/scrapingService.js

const { TARGET_COMPANIES } = require('../config');
const Job = require('../models/Job');
const { calculateMatchScores } = require('./matchingService');

// Import all your scrapers
const scrapeAtlassian = require('../scrapers/atlassianScraper');
const scrapeMicrosoft = require('../scrapers/microsoftScraper');
const scrapeGoogle = require('../scrapers/googleScraper');
const scrapeMeta = require('../scrapers/metaScraper');
const scrapeUber = require('../scrapers/uberScraper');
const scrapeApple = require('../scrapers/appleScraper');
const scrapeAdobe = require('../scrapers/adobeScraper');
const scrapePaytm = require('../scrapers/paytmScraper');
const amazonScraper = require('../scrapers/amazonScraper');
const scrapeMakeMyTrip = require('../scrapers/makemytripScraper');
const scrapeStandardChartered = require('../scrapers/standardcharteredScraper');
const scrapeFlipkart = require('../scrapers/flipkartScraper');
const scrapeCashfree = require('../scrapers/cashfreeScraper');
const scrapeIntuit = require('../scrapers/intuitScraper');
const PhonePeScraper = require('../scrapers/phonepeScraper');
const serviceNowScraper = require('../scrapers/servicenowScraper');
const scrapeZoominfo = require('../scrapers/zoominfoScraper');
const hitachiScraper = require('../scrapers/hitachiScraper');
const boeingScraper = require('../scrapers/boeingScraper');
const qualcommScraper = require('../scrapers/qualcommScraper');
const practoScraper = require('../scrapers/practoScraper');
const growwScraper = require('../scrapers/growwScraper');
// Create a map to easily access the correct scraper function by company name
const scrapers = {
    'Atlassian': scrapeAtlassian,
    'Microsoft': scrapeMicrosoft,
    'Google': scrapeGoogle,
    'Meta': scrapeMeta,
    'Uber': scrapeUber,
    'Apple': scrapeApple,
    'Adobe': scrapeAdobe,
    'Paytm': scrapePaytm,
    'Amazon': amazonScraper,
    'MakeMyTrip': scrapeMakeMyTrip,
    'Standard Chartered': scrapeStandardChartered,
    'Flipkart': scrapeFlipkart,
    'Cashfree Payments': scrapeCashfree,
    'Intuit': scrapeIntuit, 
    'PhonePe': PhonePeScraper,
    'ServiceNow': serviceNowScraper,
    'Zoominfo': scrapeZoominfo,
    'Hitachi': hitachiScraper,
    'Boeing': boeingScraper,
    'Qualcomm': qualcommScraper,
     'Practo': practoScraper,
    'Groww': growwScraper,
};

async function runScrapers() {
    console.log('Starting the scraping service for all target companies...');

    // Loop through each company defined in our config
    for (const company of TARGET_COMPANIES) {
        try {
            console.log(`--- Running scraper for ${company.name} ---`);
            const scraperFunction = scrapers[company.name];

            if (!scraperFunction) {
                console.warn(`No scraper function found for ${company.name}`);
                continue; // Skip to the next company
            }

            const jobs = await scraperFunction(company.url);

            if (jobs && jobs.length > 0) {
                console.log(`Found ${jobs.length} jobs at ${company.name}. Preparing to save...`);

                let newJobsSaved = 0;
                for (const job of jobs) {
                    const result = await Job.findOneAndUpdate(
                        { url: job.url },
                        { ...job, company: company.name }, // Ensure company name is set
                        { new: true, upsert: true }
                    );
                    if (result.upserted) {
                        newJobsSaved++;
                    }
                }
                console.log(`Database operation for ${company.name} complete. ${newJobsSaved} new jobs were saved.`);
            } else {
                console.log(`No jobs found for ${company.name}.`);
            }

        } catch (error) {
            console.error(`An error occurred during the scrape for ${company.name}:`, error);
        }
    }

    console.log('All scrapers have finished their runs.');
    await calculateMatchScores();
}

module.exports = { runScrapers };
