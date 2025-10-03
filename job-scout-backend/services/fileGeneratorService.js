const { Document, Packer, Paragraph, TextRun, AlignmentType, TabStopType, TabStopPosition, BorderStyle } = require('docx');
const fs = require('fs');
const path = require('path');

/**
 * Parse resume text into structured sections
 */
function parseResumeText(resumeText) {
    const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line);
    const sections = {
        header: [],
        summary: [],
        education: [],
        skills: [],
        experience: [],
        projects: [],
        positions: [],
        achievements: []
    };
    
    let currentSection = 'header';
    let headerCount = 0;
    
    for (const line of lines) {
        // Skip empty lines
        if (!line) continue;
        
        // First two non-empty lines go to header
        if (headerCount < 2 && currentSection === 'header') {
            sections.header.push(line);
            headerCount++;
            continue;
        }
        
        // Detect section headers (more flexible matching)
        const lowerLine = line.toLowerCase();
        
        if (lowerLine === 'professional summary' || lowerLine === 'summary') {
            currentSection = 'summary';
            continue;
        } else if (lowerLine === 'education') {
            currentSection = 'education';
            continue;
        } else if (lowerLine === 'technical skills' || lowerLine === 'skills') {
            currentSection = 'skills';
            continue;
        } else if (lowerLine === 'work experience' || lowerLine === 'experience') {
            currentSection = 'experience';
            continue;
        } else if (lowerLine === 'projects') {
            currentSection = 'projects';
            continue;
        } else if (lowerLine === 'positions of responsibility' || lowerLine === 'leadership') {
            currentSection = 'positions';
            continue;
        } else if (lowerLine === 'achievements' || lowerLine === 'awards') {
            currentSection = 'achievements';
            continue;
        }
        
        sections[currentSection].push(line);
    }
    
    return sections;
}

/**
 * Create header section (name and contact info)
 */
function createHeader(headerLines) {
    const paragraphs = [];
    
    if (headerLines.length > 0) {
        // Name (first line, larger and bold)
        paragraphs.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: headerLines[0],
                        bold: true,
                        size: 32, // 16pt
                    }),
                ],
                alignment: AlignmentType.CENTER,
                spacing: { after: 120 },
            })
        );
        
        // Contact info (remaining lines)
        for (let i = 1; i < headerLines.length; i++) {
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: headerLines[i],
                            size: 20, // 10pt
                        }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: i === headerLines.length - 1 ? 240 : 80 },
                })
            );
        }
    }
    
    return paragraphs;
}

/**
 * Create section header with underline
 */
function createSectionHeader(title) {
    return new Paragraph({
        children: [
            new TextRun({
                text: title.toUpperCase(),
                bold: true,
                size: 22, // 11pt
            }),
        ],
        spacing: { before: 240, after: 120 },
        border: {
            bottom: {
                color: "000000",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
            },
        },
    });
}

/**
 * Create a simple paragraph
 */
function createParagraph(text, options = {}) {
    return new Paragraph({
        children: [
            new TextRun({
                text: text,
                size: 20, // 10pt
                ...options,
            }),
        ],
        spacing: { after: 120 },
    });
}

/**
 * Create bullet point
 */
function createBulletPoint(text) {
    // Remove leading bullet characters
    const cleanText = text.replace(/^[–\-•]\s*/, '');
    
    return new Paragraph({
        children: [
            new TextRun({
                text: cleanText,
                size: 20,
            }),
        ],
        bullet: {
            level: 0,
        },
        spacing: { after: 80, before: 0 },
        indent: { left: 360, hanging: 360 },
    });
}

/**
 * Create two-column header (title left, date right)
 */
function createTwoColumnHeader(leftText, rightText, leftBold = true, leftItalic = false) {
    return new Paragraph({
        children: [
            new TextRun({
                text: leftText,
                bold: leftBold,
                italics: leftItalic,
                size: 20,
            }),
            new TextRun({
                text: '\t' + rightText,
                size: 20,
                italics: leftItalic,
            }),
        ],
        spacing: { before: 120, after: 40 },
        tabStops: [
            {
                type: TabStopType.RIGHT,
                position: TabStopPosition.MAX,
            },
        ],
    });
}

/**
 * Parse and create experience/project entries
 */
function createExperienceSection(lines) {
    const paragraphs = [];
    let i = 0;
    
    while (i < lines.length) {
        const line = lines[i];
        
        // Check if line contains a date pattern
        const datePattern = /([A-Z][a-z]{2,9}\s+\d{4})\s*[-–—]\s*([A-Z][a-z]{2,9}\s+\d{4}|Present)/;
        const dateMatch = line.match(datePattern);
        
        // Check if it's a project line (contains |)
        if (line.includes('|')) {
            const parts = line.split('|');
            const title = parts[0].trim();
            const rest = parts[1].trim();
            
            // Try to extract date from the rest
            const restDateMatch = rest.match(datePattern);
            let techStack = rest;
            let date = '';
            
            if (restDateMatch) {
                date = restDateMatch[0];
                techStack = rest.replace(date, '').trim();
            }
            
            paragraphs.push(createTwoColumnHeader(title, date, true, false));
            if (techStack) {
                paragraphs.push(createParagraph(techStack, { italics: true }));
            }
            
        } else if (dateMatch) {
            // This line has a date, so it's likely a job/education entry
            const date = dateMatch[0];
            const title = line.replace(date, '').trim();
            
            // Check next line for company/institution info
            let subtitle = '';
            let location = '';
            
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                // If next line doesn't start with bullet, it's probably company info
                if (!nextLine.match(/^[–\-•]/)) {
                    i++;
                    // Try to split by multiple spaces or find location patterns
                    const locationPattern = /^(.+?)\s{2,}(.+)$/;
                    const locMatch = nextLine.match(locationPattern);
                    
                    if (locMatch) {
                        subtitle = locMatch[1].trim();
                        location = locMatch[2].trim();
                    } else {
                        subtitle = nextLine.trim();
                    }
                }
            }
            
            // Create entry header
            paragraphs.push(createTwoColumnHeader(title, date, true, false));
            if (subtitle) {
                paragraphs.push(createTwoColumnHeader(subtitle, location, false, true));
            }
            
        } else if (line.match(/^[–\-•]/)) {
            // Bullet point
            paragraphs.push(createBulletPoint(line));
            
        } else {
            // Regular paragraph
            paragraphs.push(createParagraph(line));
        }
        
        i++;
    }
    
    return paragraphs;
}

/**
 * Create skills section with proper formatting
 */
function createSkillsSection(lines) {
    const paragraphs = [];
    
    for (const line of lines) {
        // Check if it's a category line (contains a colon)
        if (line.includes(':')) {
            const colonIndex = line.indexOf(':');
            const category = line.substring(0, colonIndex).trim();
            const skills = line.substring(colonIndex + 1).trim();
            
            paragraphs.push(
                new Paragraph({
                    children: [
                        new TextRun({
                            text: category + ': ',
                            bold: true,
                            size: 20,
                        }),
                        new TextRun({
                            text: skills,
                            size: 20,
                        }),
                    ],
                    spacing: { after: 80 },
                    indent: { left: 360 },
                })
            );
        } else {
            paragraphs.push(createParagraph(line));
        }
    }
    
    return paragraphs;
}

/**
 * Main function to create resume DOCX
 */
async function createResumeDoc(text, fileName) {
    console.log(`Generating DOCX file: ${fileName}`);
    console.log('Input text preview:', text.substring(0, 200));
    
    try {
        const sections = parseResumeText(text);
        
        // Debug: log parsed sections
        console.log('Parsed sections:', {
            header: sections.header.length,
            summary: sections.summary.length,
            education: sections.education.length,
            skills: sections.skills.length,
            experience: sections.experience.length,
            projects: sections.projects.length,
            positions: sections.positions.length,
            achievements: sections.achievements.length
        });
        
        const docParagraphs = [];
        
        // Header (Name and Contact)
        if (sections.header.length > 0) {
            docParagraphs.push(...createHeader(sections.header));
        }
        
        // Professional Summary
        if (sections.summary.length > 0) {
            docParagraphs.push(createSectionHeader('Professional Summary'));
            sections.summary.forEach(line => {
                docParagraphs.push(createParagraph(line));
            });
        }
        
        // Education
        if (sections.education.length > 0) {
            docParagraphs.push(createSectionHeader('Education'));
            docParagraphs.push(...createExperienceSection(sections.education));
        }
        
        // Technical Skills
        if (sections.skills.length > 0) {
            docParagraphs.push(createSectionHeader('Technical Skills'));
            docParagraphs.push(...createSkillsSection(sections.skills));
        }
        
        // Work Experience
        if (sections.experience.length > 0) {
            docParagraphs.push(createSectionHeader('Work Experience'));
            docParagraphs.push(...createExperienceSection(sections.experience));
        }
        
        // Projects
        if (sections.projects.length > 0) {
            docParagraphs.push(createSectionHeader('Projects'));
            docParagraphs.push(...createExperienceSection(sections.projects));
        }
        
        // Positions of Responsibility
        if (sections.positions.length > 0) {
            docParagraphs.push(createSectionHeader('Positions of Responsibility'));
            docParagraphs.push(...createExperienceSection(sections.positions));
        }
        
        // Achievements
        if (sections.achievements.length > 0) {
            docParagraphs.push(createSectionHeader('Achievements'));
            sections.achievements.forEach(line => {
                if (line.match(/^[–\-•]/)) {
                    docParagraphs.push(createBulletPoint(line));
                } else {
                    docParagraphs.push(createParagraph(line));
                }
            });
        }
        
        // Create document with proper margins
        const doc = new Document({
            sections: [{
                properties: {
                    page: {
                        margin: {
                            top: 720,
                            right: 720,
                            bottom: 720,
                            left: 720,
                        },
                    },
                },
                children: docParagraphs,
            }],
        });
        
        // Generate buffer and save
        const buffer = await Packer.toBuffer(doc);
        const filePath = path.join(__dirname, '../public/resumes', fileName);
        
        // Ensure directory exists
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, buffer);
        
        console.log(`✓ File saved to ${filePath}`);
        console.log(`✓ Generated ${docParagraphs.length} paragraphs`);
        
        // Return the public URL for downloading
        const downloadUrl = `/resumes/${fileName}`;
        return downloadUrl;
        
    } catch (error) {
        console.error('Error generating DOCX file:', error);
        console.error('Error stack:', error.stack);
        throw new Error('Failed to generate DOCX file: ' + error.message);
    }
}

module.exports = { createResumeDoc };