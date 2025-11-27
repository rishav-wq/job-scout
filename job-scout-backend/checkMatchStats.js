// Quick script to check match statistics
require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');
const Profile = require('./models/Profile');

async function checkMatchStats() {
    try {
        console.log('🔄 Connecting to MongoDB...\n');
        await mongoose.connect(process.env.MONGO_URI);

        // Check resume
        const profile = await Profile.findOne({ userId: 'default-user' });
        if (!profile || !profile.resumeText) {
            console.log('❌ No resume found!\n');
            process.exit(1);
        }

        console.log(`✅ Resume found: ${profile.resumeText.length} characters\n`);

        // Get job statistics
        const totalJobs = await Job.countDocuments({});
        const scoredJobs = await Job.countDocuments({ matchScore: { $gte: 0 } });
        const unscoredJobs = await Job.countDocuments({ matchScore: -1 });
        
        const excellent = await Job.countDocuments({ matchScore: { $gte: 80 } });
        const good = await Job.countDocuments({ matchScore: { $gte: 60, $lt: 80 } });
        const fair = await Job.countDocuments({ matchScore: { $gte: 40, $lt: 60 } });
        const poor = await Job.countDocuments({ matchScore: { $gte: 1, $lt: 40 } });
        const noMatch = await Job.countDocuments({ matchScore: 0 });

        console.log('📊 JOB STATISTICS:');
        console.log('═'.repeat(60));
        console.log(`  Total jobs in database: ${totalJobs}`);
        console.log(`  Jobs with match scores: ${scoredJobs}`);
        console.log(`  Jobs not yet scored: ${unscoredJobs}`);
        console.log('═'.repeat(60));
        console.log();

        console.log('📈 MATCH SCORE DISTRIBUTION:');
        console.log('─'.repeat(60));
        console.log(`  🟢 Excellent (80-100%): ${excellent} jobs - APPLY NOW!`);
        console.log(`  🟡 Good (60-79%):       ${good} jobs - Strong matches`);
        console.log(`  🟠 Fair (40-59%):       ${fair} jobs - Consider`);
        console.log(`  🔴 Poor (1-39%):        ${poor} jobs - Not recommended`);
        console.log(`  ⚫ No description:      ${noMatch} jobs - Can't match`);
        console.log('─'.repeat(60));
        console.log();

        // Get top 10 matches
        if (scoredJobs > 0) {
            console.log('🏆 TOP 10 MATCHES:');
            console.log('─'.repeat(60));
            const topJobs = await Job.find({ matchScore: { $gt: 0 } })
                .sort({ matchScore: -1 })
                .limit(10);
            
            topJobs.forEach((job, index) => {
                const emoji = job.matchScore >= 80 ? '🟢' : job.matchScore >= 60 ? '🟡' : '🟠';
                console.log(`  ${index + 1}. ${emoji} ${job.matchScore}% - ${job.title}`);
                console.log(`     ${job.company}`);
                console.log();
            });
        }

        if (unscoredJobs > 0) {
            console.log(`💡 Run 'node matchAllJobs.js' to score the remaining ${unscoredJobs} jobs\n`);
        } else {
            console.log('✅ All jobs are scored! Visit /my-matches to see personalized recommendations\n');
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkMatchStats();
