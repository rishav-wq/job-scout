const Job = require('../models/Job');
const Profile = require('../models/Profile');

/**
 * Comprehensive list of tech keywords and skills
 */
const TECH_KEYWORDS = [
    // Programming Languages
    'javascript', 'python', 'java', 'c\\+\\+', 'c#', 'ruby', 'php', 'swift', 'kotlin', 'go', 'rust', 'typescript', 'scala', 'perl', 'r',
    
    // Frontend
    'react', 'angular', 'vue', 'html', 'css', 'sass', 'less', 'webpack', 'redux', 'nextjs', 'gatsby', 'svelte', 'jquery',
    
    // Backend
    'node', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'fastapi', 'nestjs', 'asp.net',
    
    // Databases
    'mongodb', 'mysql', 'postgresql', 'redis', 'cassandra', 'dynamodb', 'oracle', 'sql server', 'sqlite', 'mariadb', 'couchdb',
    
    // Cloud & DevOps
    'aws', 'azure', 'gcp', 'google cloud', 'docker', 'kubernetes', 'k8s', 'jenkins', 'terraform', 'ansible', 'gitlab', 'github', 'bitbucket', 'circleci', 'travis ci',
    
    // Tools & Platforms
    'git', 'jira', 'confluence', 'salesforce', 'sap', 'tableau', 'power bi', 'powerbi', 'elasticsearch', 'splunk', 'datadog', 'grafana',
    
    // Methodologies & Practices
    'agile', 'scrum', 'kanban', 'devops', 'ci/cd', 'microservices', 'rest api', 'restful', 'graphql', 'tdd', 'test driven', 'pair programming',
    
    // Data & Analytics
    'machine learning', 'ml', 'data science', 'ai', 'artificial intelligence', 'deep learning', 'neural network', 'nlp', 'computer vision', 'tensorflow', 'pytorch', 'pandas', 'numpy', 'spark', 'hadoop', 'etl',
    
    // Mobile
    'ios', 'android', 'react native', 'flutter', 'xamarin', 'mobile development',
    
    // Other Important
    'blockchain', 'iot', 'internet of things', 'cybersecurity', 'security', 'api', 'linux', 'unix', 'windows', 'mac os'
];

/**
 * Extract keywords from text
 */
function extractKeywords(text) {
    if (!text) return [];
    
    const lowerText = text.toLowerCase();
    const foundKeywords = new Set();

    TECH_KEYWORDS.forEach(keyword => {
        // Create regex that matches whole words (with word boundaries)
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (regex.test(lowerText)) {
            // Normalize the keyword (remove escapes)
            foundKeywords.add(keyword.replace(/\\\+/g, '+').replace(/\\\./g, '.'));
        }
    });

    return Array.from(foundKeywords);
}

/**
 * Calculate match score between resume and job
 */
function calculateKeywordMatch(resumeKeywords, jobKeywords) {
    if (jobKeywords.length === 0) return { score: 0, matchingKeywords: [], missingKeywords: [] };

    const matchingKeywords = resumeKeywords.filter(keyword => 
        jobKeywords.includes(keyword)
    );
    
    const missingKeywords = jobKeywords.filter(keyword =>
        !resumeKeywords.includes(keyword)
    );

    // Base score: percentage of job keywords found in resume
    const baseScore = (matchingKeywords.length / jobKeywords.length) * 100;
    
    // Bonus: if resume has more skills than required
    const bonusSkills = resumeKeywords.length - matchingKeywords.length;
    const bonusScore = Math.min(bonusSkills * 2, 10); // Max 10% bonus
    
    const finalScore = Math.min(Math.round(baseScore + bonusScore), 100);
    
    return {
        score: finalScore,
        matchingKeywords,
        missingKeywords,
        totalJobKeywords: jobKeywords.length,
        totalResumeKeywords: resumeKeywords.length
    };
}

/**
 * Main function to calculate match scores for all jobs
 */
async function calculateMatchScores() {
    console.log('Starting keyword-based match score calculation...');
    const userId = 'default-user';

    // Get user profile
    const profile = await Profile.findOne({ userId });
    if (!profile || !profile.resumeText) {
        console.log('No resume found for the user. Aborting match calculation.');
        return;
    }

    console.log('Extracting keywords from user resume...');
    const resumeKeywords = extractKeywords(profile.resumeText);
    console.log(`✓ Found ${resumeKeywords.length} skills in resume: ${resumeKeywords.slice(0, 10).join(', ')}${resumeKeywords.length > 10 ? '...' : ''}`);

    // Get unscored jobs
    const unscoredJobs = await Job.find({ 
        matchScore: -1, 
        description: { $exists: true, $ne: 'Error fetching description.', $ne: '' }
    });

    if (unscoredJobs.length === 0) {
        console.log('No new jobs to score.');
        return;
    }

    console.log(`\nFound ${unscoredJobs.length} jobs to score.\n`);

    let processedCount = 0;
    for (const job of unscoredJobs) {
        processedCount++;
        
        // Extract keywords from job description
        const jobKeywords = extractKeywords(job.description);
        
        // Calculate match
        const matchResult = calculateKeywordMatch(resumeKeywords, jobKeywords);
        
        // Save score
        job.matchScore = matchResult.score;
        await job.save();
        
        console.log(`[${processedCount}/${unscoredJobs.length}] ${job.title.substring(0, 50)}...`);
        console.log(`   Score: ${matchResult.score}% | Matching: ${matchResult.matchingKeywords.length}/${matchResult.totalJobKeywords} skills`);
        if (matchResult.matchingKeywords.length > 0) {
            console.log(`   Matched skills: ${matchResult.matchingKeywords.slice(0, 5).join(', ')}${matchResult.matchingKeywords.length > 5 ? '...' : ''}`);
        }
        if (matchResult.missingKeywords.length > 0 && matchResult.missingKeywords.length <= 5) {
            console.log(`   Missing skills: ${matchResult.missingKeywords.join(', ')}`);
        }
        console.log('');
    }

    console.log('✓ Finished calculating all match scores!');
    
    // Show top matches
    const topMatches = await Job.find({ matchScore: { $gte: 0 } })
        .sort({ matchScore: -1 })
        .limit(5);
    
    console.log('\n=== TOP 5 MATCHES ===');
    topMatches.forEach((job, index) => {
        console.log(`${index + 1}. [${job.matchScore}%] ${job.title} - ${job.company}`);
    });
}

module.exports = { calculateMatchScores, extractKeywords };
