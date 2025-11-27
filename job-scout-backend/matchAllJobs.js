// Script to process ALL jobs and calculate match scores
require('dotenv').config();
const mongoose = require('mongoose');
const { calculateMatchScores } = require('./services/matchingService');
const Job = require('./models/Job');
const Profile = require('./models/Profile');

async function processAllJobs() {
    try {
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected\n');

        // Check if resume exists
        const profile = await Profile.findOne({ userId: 'default-user' });
        if (!profile || !profile.resumeText) {
            console.log('❌ No resume found! Please upload your resume first.');
            console.log('   Go to the Profile page and upload your resume.\n');
            process.exit(1);
        }

        console.log(`✅ Resume found: ${profile.resumeText.length} characters\n`);

        // Get total job counts
        const totalJobs = await Job.countDocuments({});
        const scoredJobs = await Job.countDocuments({ matchScore: { $gte: 0 } });
        const unscoredJobs = totalJobs - scoredJobs;

        console.log('📊 JOB STATISTICS:');
        console.log('═'.repeat(60));
        console.log(`  Total jobs: ${totalJobs}`);
        console.log(`  Already scored: ${scoredJobs}`);
        console.log(`  Remaining to score: ${unscoredJobs}`);
        console.log('═'.repeat(60));

        if (unscoredJobs === 0) {
            console.log('✅ All jobs already scored!\n');
            
            // Show match distribution
            const excellent = await Job.countDocuments({ matchScore: { $gte: 80 } });
            const good = await Job.countDocuments({ matchScore: { $gte: 60, $lt: 80 } });
            const fair = await Job.countDocuments({ matchScore: { $gte: 40, $lt: 60 } });
            const poor = await Job.countDocuments({ matchScore: { $gte: 1, $lt: 40 } });
            const noMatch = await Job.countDocuments({ matchScore: 0 });

            console.log('📈 MATCH SCORE DISTRIBUTION:');
            console.log('─'.repeat(60));
            console.log(`  🟢 Excellent (80-100%): ${excellent} jobs`);
            console.log(`  🟡 Good (60-79%):       ${good} jobs`);
            console.log(`  🟠 Fair (40-59%):       ${fair} jobs`);
            console.log(`  🔴 Poor (1-39%):        ${poor} jobs`);
            console.log(`  ⚫ No Match (0%):       ${noMatch} jobs`);
            console.log('─'.repeat(60));
            
            process.exit(0);
        }

        console.log('🚀 Starting to process ALL unscored jobs...\n');
        console.log('⏳ This may take a while depending on the number of jobs.');
        console.log('   Processing in batches of 20 with rate limiting...\n');

        let totalProcessed = 0;
        let batchCount = 0;
        const maxBatches = Math.ceil(unscoredJobs / 20);

        // Keep processing until all jobs are scored
        while (true) {
            batchCount++;
            console.log(`\n${'═'.repeat(60)}`);
            console.log(`  BATCH ${batchCount}/${maxBatches}`);
            console.log('═'.repeat(60));

            const result = await calculateMatchScores(20);
            
            if (!result.success) {
                console.error('❌ Batch processing failed:', result.message);
                break;
            }

            totalProcessed += result.processed;
            console.log(`✅ Batch ${batchCount} complete: ${result.processed} jobs processed\n`);

            // Check if there are more jobs to process or no jobs were processed
            if (result.remaining === 0 || result.processed === 0) {
                console.log('🎉 All jobs have been processed!\n');
                break;
            }

            console.log(`📊 Progress: ${totalProcessed} processed, ${result.remaining} remaining`);
            console.log('⏳ Waiting 2 seconds before next batch...\n');
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Final statistics
        console.log('\n' + '═'.repeat(60));
        console.log('  FINAL RESULTS');
        console.log('═'.repeat(60));
        
        const finalScored = await Job.countDocuments({ matchScore: { $gte: 0 } });
        const excellent = await Job.countDocuments({ matchScore: { $gte: 80 } });
        const good = await Job.countDocuments({ matchScore: { $gte: 60, $lt: 80 } });
        const fair = await Job.countDocuments({ matchScore: { $gte: 40, $lt: 60 } });
        const poor = await Job.countDocuments({ matchScore: { $gte: 1, $lt: 40 } });
        const noMatch = await Job.countDocuments({ matchScore: 0 });

        console.log(`✅ Total jobs scored: ${finalScored}/${totalJobs}`);
        console.log(`✨ Jobs processed in this run: ${totalProcessed}\n`);

        console.log('📈 MATCH SCORE DISTRIBUTION:');
        console.log('─'.repeat(60));
        console.log(`  🟢 Excellent (80-100%): ${excellent} jobs - APPLY NOW!`);
        console.log(`  🟡 Good (60-79%):       ${good} jobs - Strong matches`);
        console.log(`  🟠 Fair (40-59%):       ${fair} jobs - Consider`);
        console.log(`  🔴 Poor (1-39%):        ${poor} jobs - Not recommended`);
        console.log(`  ⚫ No Match (0%):       ${noMatch} jobs - No description/Poor match`);
        console.log('─'.repeat(60));

        if (excellent > 0) {
            console.log(`🎯 You have ${excellent} excellent matches! Check them out in the app.\n`);
        }

        console.log('✅ Job matching complete! All jobs are now scored based on your resume.\n');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

processAllJobs();
