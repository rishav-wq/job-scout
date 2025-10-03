const { CohereClient } = require('cohere-ai');
const cosineSimilarity = require('cosine-similarity');
const Profile = require('../models/Profile');
const Job = require('../models/Job');
require('dotenv').config();

// Initialize Cohere
const cohere = new CohereClient({
    token: process.env.COHERE_API_KEY,
});

const RATE_LIMIT_DELAY = 700;
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function createEmbedding(text, retries = MAX_RETRIES) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await cohere.embed({
                texts: [text.replace(/\n/g, ' ').substring(0, 5000)],
                model: 'embed-english-v3.0',
                inputType: 'search_document',
                truncate: 'END'
            });
            return response.embeddings[0];
        } catch (error) {
            console.error(`Error creating Cohere embedding (attempt ${attempt}/${retries}):`, error.message);
            
            if (error.statusCode === 429 && attempt < retries) {
                console.log(`Rate limited. Waiting ${RETRY_DELAY/1000}s before retry...`);
                await sleep(RETRY_DELAY);
            } else if (error.statusCode === 401) {
                console.error('\n❌ Invalid Cohere API Key!');
                console.log('Get your free key at: https://dashboard.cohere.com/api-keys');
                console.log('Add it to .env: COHERE_API_KEY=your-key-here\n');
                throw error;
            } else if (attempt === retries) {
                return null;
            }
        }
    }
    return null;
}

/**
 * Calculates match scores using Cohere embeddings
 * Now skips jobs with insufficient descriptions and moves to the next batch
 */
async function calculateMatchScores(batchSize = 20) {
    console.log('\n=== Starting Job Matching with Cohere ===\n');
    const userId = 'default-user';

    // 1. Fetch user profile
    const profile = await Profile.findOne({ userId });
    if (!profile || !profile.resumeText) {
        console.log('❌ No resume found for the user. Please upload a resume first.');
        return { success: false, message: 'No resume found' };
    }

    console.log(`📄 Resume found: ${profile.resumeText.length} characters`);

    // 2. Create resume embedding
    console.log('🔄 Creating resume embedding...');
    let resumeVector;
    try {
        resumeVector = await createEmbedding(profile.resumeText);
    } catch (error) {
        return { 
            success: false, 
            message: 'Failed to create resume embedding. Check your Cohere API key.' 
        };
    }
    
    if (!resumeVector) {
        console.log('❌ Failed to create resume embedding.');
        return { success: false, message: 'Failed to create resume embedding' };
    }

    console.log(`✅ Resume embedding created (${resumeVector.length} dimensions)\n`);

    // 3. Fetch unscored jobs WITH good descriptions (>= 50 chars)
    const unscoredJobs = await Job.find({ 
        matchScore: -1, 
        description: { 
            $exists: true,
            $ne: 'Error fetching description.',
            $ne: '',
            $ne: null,
            $type: 'string'  // Ensure it's a string
        },
        $expr: { $gte: [{ $strLenCP: "$description" }, 50] }
    }).limit(batchSize);

    if (unscoredJobs.length === 0) {
        console.log('✅ No jobs with good descriptions to score.');
        
        // Mark jobs with bad descriptions as 0
        const badDescJobs = await Job.find({ 
            matchScore: -1,
            $or: [
                { description: { $exists: false } },
                { description: '' },
                { description: 'Error fetching description.' },
                { $expr: { $lt: [{ $strLenCP: "$description" }, 50] } }
            ]
        });
        
        if (badDescJobs.length > 0) {
            console.log(`\n⚠️  Found ${badDescJobs.length} jobs with insufficient descriptions.`);
            console.log('Setting their match scores to 0...');
            
            await Job.updateMany(
                { 
                    _id: { $in: badDescJobs.map(j => j._id) }
                },
                { $set: { matchScore: 0 } }
            );
            
            console.log(`✅ Marked ${badDescJobs.length} jobs with score 0\n`);
        }
        
        return { success: true, processed: 0, message: 'No jobs to score' };
    }

    console.log(`📊 Found ${unscoredJobs.length} jobs with good descriptions to process\n`);
    console.log('─'.repeat(60));

    let successCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    // 4. Process each job
    for (let i = 0; i < unscoredJobs.length; i++) {
        const job = unscoredJobs[i];
        const jobNum = `[${i + 1}/${unscoredJobs.length}]`;
        
        console.log(`${jobNum} ${job.title.substring(0, 45)}...`);

        try {
            const jobVector = await createEmbedding(job.description);
            
            if (jobVector) {
                const score = cosineSimilarity(resumeVector, jobVector);
                const percentageScore = Math.round(((score + 1) / 2) * 100);
                
                let indicator = '🔴';
                if (percentageScore >= 80) indicator = '🟢';
                else if (percentageScore >= 60) indicator = '🟡';
                else if (percentageScore >= 40) indicator = '🟠';
                
                console.log(`             ${indicator} Match: ${percentageScore}% ${getScoreBar(percentageScore)}`);
                
                job.matchScore = percentageScore;
                await job.save();
                successCount++;
            } else {
                job.matchScore = 0;
                await job.save();
                errorCount++;
                console.log(`             ❌ Failed to create embedding`);
            }
            
            console.log('');
            
            if (i < unscoredJobs.length - 1) {
                await sleep(RATE_LIMIT_DELAY);
            }
        } catch (error) {
            console.error(`             ❌ Error: ${error.message}\n`);
            job.matchScore = 0;
            await job.save();
            errorCount++;
        }
    }

    const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const remainingGoodJobs = await Job.countDocuments({ 
        matchScore: -1,
        description: { 
            $exists: true,
            $ne: 'Error fetching description.',
            $ne: '',
            $ne: null,
            $type: 'string'
        },
        $expr: { $gte: [{ $strLenCP: "$description" }, 50] }
    });
    
    console.log('─'.repeat(60));
    console.log('\n=== Matching Complete ===\n');
    console.log(`✅ Successfully scored: ${successCount} jobs`);
    console.log(`❌ Errors/Skipped: ${errorCount} jobs`);
    console.log(`⏱️  Time elapsed: ${elapsedTime}s`);
    console.log(`📊 Remaining unscored (good descriptions): ${remainingGoodJobs} jobs\n`);

    if (remainingGoodJobs > 0) {
        console.log(`💡 Run again to process the remaining ${remainingGoodJobs} jobs\n`);
    }

    return { 
        success: true, 
        processed: successCount, 
        errors: errorCount,
        remaining: remainingGoodJobs,
        timeElapsed: elapsedTime,
        message: 'Batch completed successfully'
    };
}

function getScoreBar(score) {
    const filled = Math.round(score / 10);
    const empty = 10 - filled;
    return '█'.repeat(filled) + '░'.repeat(empty);
}

async function testCohereConnection() {
    console.log('\n=== Testing Cohere Connection ===\n');
    
    if (!process.env.COHERE_API_KEY) {
        console.error('❌ COHERE_API_KEY not found in .env file!\n');
        console.log('📝 Setup instructions:');
        console.log('   1. Visit: https://dashboard.cohere.com/api-keys');
        console.log('   2. Sign up (free)');
        console.log('   3. Copy your API key');
        console.log('   4. Add to .env: COHERE_API_KEY=your-key-here\n');
        return false;
    }

    console.log('✅ API key found in environment');
    console.log(`   Key prefix: ${process.env.COHERE_API_KEY.substring(0, 10)}...\n`);

    try {
        console.log('🔄 Testing API connection...');
        const response = await cohere.embed({
            texts: ['test connection'],
            model: 'embed-english-v3.0',
            inputType: 'search_document'
        });
        
        console.log('✅ Cohere API is working perfectly!');
        console.log(`   Embedding dimensions: ${response.embeddings[0].length}`);
        console.log(`   Model: embed-english-v3.0\n`);
        console.log('🎉 You\'re ready to start matching jobs!\n');
        return true;
    } catch (error) {
        console.error('❌ Cohere API error:', error.message);
        
        if (error.statusCode === 401) {
            console.log('\n🔑 Invalid API key. Please check:');
            console.log('   1. Your API key is correct');
            console.log('   2. You copied the entire key');
            console.log('   3. Get a new key at: https://dashboard.cohere.com/api-keys\n');
        }
        return false;
    }
}

module.exports = { 
    calculateMatchScores,
    testCohereConnection,
    createEmbedding
};