require('dotenv').config();
const mongoose = require('mongoose');
const Job = require('./models/Job');

async function simpleCheck() {
    console.log('\n=== Simple Database Check ===\n');
    
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected\n');

        // Get ALL unscored jobs
        const allUnscored = await Job.find({ matchScore: -1 });
        
        console.log(`Total unscored jobs (matchScore = -1): ${allUnscored.length}\n`);
        
        if (allUnscored.length > 0) {
            console.log('First 10 unscored jobs:');
            console.log('─'.repeat(70));
            
            allUnscored.slice(0, 10).forEach((job, idx) => {
                const hasDesc = !!job.description;
                const descLength = job.description ? job.description.length : 0;
                const isGood = hasDesc && 
                              job.description !== '' && 
                              job.description !== 'Error fetching description.' &&
                              descLength >= 50;
                
                const status = isGood ? '✅' : '❌';
                
                console.log(`\n${idx + 1}. ${status} ${job.title.substring(0, 50)}`);
                console.log(`   Description: ${hasDesc ? `${descLength} chars` : 'MISSING'}`);
                console.log(`   Can be scored: ${isGood ? 'YES' : 'NO'}`);
                
                if (!isGood && hasDesc) {
                    console.log(`   Reason: ${descLength < 50 ? 'Too short' : job.description === 'Error fetching description.' ? 'Error text' : 'Other'}`);
                }
            });
            
            console.log('\n' + '─'.repeat(70));
            
            // Count how many are actually good
            let goodCount = 0;
            let badCount = 0;
            
            for (const job of allUnscored) {
                const isGood = job.description && 
                              job.description !== '' && 
                              job.description !== 'Error fetching description.' &&
                              job.description.length >= 50;
                
                if (isGood) goodCount++;
                else badCount++;
            }
            
            console.log(`\n📊 Summary:`);
            console.log(`   ✅ Ready to score: ${goodCount}`);
            console.log(`   ❌ Cannot score: ${badCount}`);
            
            if (goodCount > 0) {
                console.log(`\n💡 You have ${goodCount} jobs ready! Let's test the query...\n`);
                
                // Test the actual query used in matcher
                const testQuery = await Job.find({ 
                    matchScore: -1, 
                    description: { 
                        $exists: true,
                        $ne: 'Error fetching description.',
                        $ne: ''
                    },
                    $expr: { $gte: [{ $strLenCP: "$description" }, 50] }
                }).limit(5);
                
                console.log(`Query test result: Found ${testQuery.length} jobs`);
                
                if (testQuery.length === 0) {
                    console.log('\n⚠️  PROBLEM: The MongoDB query is not working!');
                    console.log('   Let\'s try a simpler approach...\n');
                    
                    // Try without $expr
                    const simpleQuery = await Job.find({ 
                        matchScore: -1, 
                        description: { 
                            $exists: true,
                            $ne: 'Error fetching description.',
                            $ne: ''
                        }
                    }).limit(5);
                    
                    console.log(`Simple query (without length check): Found ${simpleQuery.length} jobs`);
                    
                    if (simpleQuery.length > 0) {
                        console.log('\n✅ Solution: Remove the $expr length check from the query!');
                        console.log('   We can check length in JavaScript instead.\n');
                    }
                } else {
                    console.log(`\n✅ Query works! Found ${testQuery.length} jobs to process.\n`);
                }
            }
        } else {
            console.log('No unscored jobs found. All jobs have been scored!\n');
        }

        await mongoose.disconnect();
        console.log('Disconnected.\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        await mongoose.disconnect();
    }
}

simpleCheck();