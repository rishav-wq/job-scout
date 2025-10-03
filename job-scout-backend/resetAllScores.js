require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function resetAllScores() {
    console.log('\n=== Resetting All Match Scores ===\n');
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Database Connected\n');

        const total = await Job.countDocuments();
        console.log(`📊 Total jobs in database: ${total}\n`);

        // Show current distribution
        const current = {
            scored: await Job.countDocuments({ matchScore: { $gte: 0 } }),
            unscored: await Job.countDocuments({ matchScore: -1 })
        };

        console.log('Current state:');
        console.log(`  Already scored: ${current.scored}`);
        console.log(`  Unscored: ${current.unscored}\n`);

        // Option 1: Reset ALL to -1
        console.log('🔄 Resetting ALL match scores to -1...\n');
        
        const result = await Job.updateMany(
            {},  // Empty filter = all documents
            { $set: { matchScore: -1 } }
        );

        console.log('✅ Reset Complete!\n');
        console.log(`   Documents matched: ${result.matchedCount}`);
        console.log(`   Documents modified: ${result.modifiedCount}\n`);

        // Verify
        const verify = await Job.countDocuments({ matchScore: -1 });
        console.log(`📊 Verification: ${verify} jobs now have matchScore = -1\n`);

        // Check descriptions
        const withGoodDesc = await Job.countDocuments({
            matchScore: -1,
            description: { 
                $exists: true,
                $ne: '',
                $ne: 'Error fetching description.'
            },
            $expr: { $gte: [{ $strLenCP: "$description" }, 50] }
        });

        const withBadDesc = verify - withGoodDesc;

        console.log('Description analysis:');
        console.log(`  ✅ Jobs ready for AI matching: ${withGoodDesc}`);
        console.log(`  ⚠️  Jobs with insufficient descriptions: ${withBadDesc}\n`);

        console.log('═'.repeat(60));
        console.log('\n🎯 Next steps:');
        console.log('   1. Run: node testMatcher.js');
        console.log('   2. This will use Cohere AI to score your jobs');
        console.log(`   3. Process ${withGoodDesc} jobs with good descriptions\n`);

        await mongoose.disconnect();
        console.log('Database Disconnected.\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

resetAllScores();