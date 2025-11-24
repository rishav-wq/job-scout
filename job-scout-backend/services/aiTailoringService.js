const { GoogleGenerativeAI } = require('@google/generative-ai');

// Helper function to sleep/wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function tailorResumeText(resumeText, jobDescription) {
    console.log('Sending resume and JD to Gemini API for tailoring...');
   
    try {
        // Check if API key is present
        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        
        console.log(`API Key loaded successfully`);
        
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(apiKey.trim());
        
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

        // Only use Gemini 2.0 models (since 1.5 models return 404)
        const modelIds = [
            'gemini-2.0-flash-exp',
            'gemini-2.0-flash'
        ];

        let lastError = null;
        const maxRetries = 3;
       
        for (const modelId of modelIds) {
            // Try each model with retries
            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Trying model: ${modelId} (attempt ${attempt}/${maxRetries})...`);
                   
                    const model = genAI.getGenerativeModel({ 
                        model: modelId,
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: 8192,
                        }
                    });

                    const result = await model.generateContent(prompt);
                    const response = result.response;
                    const tailoredText = response.text().trim();
                   
                    // Validate that we got a complete resume back
                    if (!tailoredText.includes('Professional Summary') ||
                        !tailoredText.includes('Work Experience')) {
                        throw new Error('Response missing required sections');
                    }
                   
                    console.log(`✓ Successfully used model: ${modelId}`);
                    console.log('✓ Received complete tailored resume from Gemini.');
                    return tailoredText;
                   
                } catch (error) {
                    const isOverloaded = error.message.includes('503') || 
                                       error.message.includes('overloaded') ||
                                       error.message.includes('Service Unavailable');
                    
                    const is404 = error.message.includes('404') || 
                                 error.message.includes('not found');
                    
                    console.log(`✗ Model ${modelId} attempt ${attempt} failed: ${error.message}`);
                    lastError = error;
                    
                    // If it's a 404, don't retry this model
                    if (is404) {
                        console.log(`Model ${modelId} not available, skipping retries...`);
                        break;
                    }
                    
                    // If it's overloaded and we have retries left, wait and retry
                    if (isOverloaded && attempt < maxRetries) {
                        const waitTime = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
                        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                        await sleep(waitTime);
                        continue;
                    }
                    
                    // Last attempt failed, try next model
                    break;
                }
            }
        }

        console.log('All models failed or are unavailable.');
        console.log('💡 Tip: The Gemini API may be experiencing high traffic. Please try again in a few moments.');
        
        throw lastError || new Error('All model attempts failed');

    } catch (error) {
        console.error('Error with Gemini API:', error);
        throw new Error('Failed to generate tailored resume text: ' + error.message);
    }
}

module.exports = { tailorResumeText };