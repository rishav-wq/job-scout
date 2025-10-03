require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function checkScores() {
    console.log('\n=== Checking All Match Scores ===\n');
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected\n');

        const total = await Job.countDocuments();
        console.log(`📊 Total jobs: ${total}\n`);

        // Score distribution
        const scores = {
            unscored: await Job.countDocuments({ matchScore: -1 }),
            zero: await Job.countDocuments({ matchScore: 0 }),
            low: await Job.countDocuments({ matchScore: { $gt: 0, $lt: 40 } }),
            medium: await Job.countDocuments({ matchScore: { $gte: 40, $lt: 70 } }),
            high: await Job.countDocuments({ matchScore: { $gte: 70, $lt: 90 } }),
            excellent: await Job.countDocuments({ matchScore: { $gte: 90 } })
        };

        console.log('Match Score Distribution:');
        console.log('─'.repeat(50));
        console.log(`  🔴 Unscored (-1):       ${scores.unscored}`);
        console.log(`  ⚫ Zero (0):            ${scores.zero}`);
        console.log(`  🔴 Low (1-39):          ${scores.low}`);
        console.log(`  🟠 Medium (40-69):      ${scores.medium}`);
        console.log(`  🟡 High (70-89):        ${scores.high}`);
        console.log(`  🟢 Excellent (90-100):  ${scores.excellent}\n`);

        // Show top 10 matches
        const topJobs = await Job.find({ matchScore: { $gt: 0 } })
            .sort({ matchScore: -1 })
            .limit(10);

        if (topJobs.length > 0) {
            console.log('🏆 Top 10 Matched Jobs:');
            console.log('─'.repeat(70));
            topJobs.forEach((job, idx) => {
                const indicator = job.matchScore >= 80 ? '🟢' : job.matchScore >= 60 ? '🟡' : '🟠';
                console.log(`${idx + 1}. ${indicator} ${job.matchScore}% - ${job.title.substring(0, 45)}`);
                console.log(`   Company: ${job.company || 'N/A'}`);
            });
        }

        // Show some zero-scored jobs
        const zeroJobs = await Job.find({ matchScore: 0 }).limit(5);
        
        if (zeroJobs.length > 0) {
            console.log('\n\n⚠️  Jobs with 0% match (sample):');
            console.log('─'.repeat(70));
            zeroJobs.forEach((job, idx) => {
                const descLength = job.description ? job.description.length : 0;
                console.log(`${idx + 1}. ${job.title.substring(0, 45)}`);
                console.log(`   Description: ${descLength > 0 ? `${descLength} chars` : 'MISSING'}`);
            });
        }

        console.log('\n' + '═'.repeat(70));
        console.log('\n💡 Options:');
        console.log('   1. Reset all scores to -1 and re-run matching');
        console.log('   2. View your matched jobs in the application');
        console.log('   3. Everything looks good!\n');

        await mongoose.disconnect();
        console.log('Disconnected.\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

checkScores();