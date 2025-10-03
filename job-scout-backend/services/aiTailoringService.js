const { CohereClient } = require('cohere-ai');
const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

async function tailorResumeText(resumeText, jobDescription) {
    console.log('Sending resume and JD to Cohere Chat API for tailoring...');
    
    try {
        const prompt = `You are an expert resume writer. Based on the following RESUME_TEXT and JOB_DESCRIPTION, rewrite the "Professional Summary" and "Work Experience" sections to better highlight the skills and keywords found in the JOB_DESCRIPTION. 

IMPORTANT INSTRUCTIONS:
- Do NOT invent new experiences or add fake information
- Keep all dates, company names, and job titles exactly as they appear in the original
- Only rewrite the bullet points and summary to emphasize relevant skills from the job description
- Maintain the EXACT same format as the original resume
- Keep all other sections (Education, Skills, Projects, Achievements, etc.) EXACTLY as they are
- Preserve the exact structure with section headers like "Professional Summary", "Education", "Technical Skills", "Work Experience", "Projects", etc.
- Return the COMPLETE resume with only the Summary and Experience sections modified
- Use the same bullet point format (– for bullets)

RESUME_TEXT:
---
${resumeText}
---

JOB_DESCRIPTION:
---
${jobDescription}
---

Return the COMPLETE tailored resume maintaining the exact format and structure of the original. Include ALL sections from the original resume.`;

        const modelIds = [
            'command-r-08-2024',
            'command-r-plus-08-2024',
            'c4ai-command-r7b-12-2024',
            'command-r7b-12-2024',
        ];

        let lastError = null;
        
        for (const modelId of modelIds) {
            try {
                console.log(`Trying model: ${modelId}...`);
                
                const response = await cohere.chat({
                    model: modelId,
                    message: prompt,
                    temperature: 0.3,
                });

                const tailoredText = response.text.trim();
                
                // Validate that we got a complete resume back
                if (!tailoredText.includes('Professional Summary') || 
                    !tailoredText.includes('Work Experience')) {
                    throw new Error('Response missing required sections');
                }
                
                console.log(`✓ Successfully used model: ${modelId}`);
                console.log('✓ Received complete tailored resume from Cohere.');
                return tailoredText;
                
            } catch (error) {
                console.log(`✗ Model ${modelId} failed: ${error.message}`);
                lastError = error;
                continue;
            }
        }

        console.log('All models failed. Attempting to list available models...');
        try {
            const models = await cohere.models.list();
            console.log('Available models:', JSON.stringify(models, null, 2));
        } catch (listError) {
            console.log('Could not list models:', listError.message);
        }
        
        throw lastError || new Error('All model attempts failed');

    } catch (error) {
        console.error('Error with Cohere Chat API:', error);
        throw new Error('Failed to generate tailored resume text: ' + error.message);
    }
}

// Remove or comment out the mergeResumeWithTailoredSections function
// We don't need it anymore since Cohere returns the complete resume

module.exports = { tailorResumeText };