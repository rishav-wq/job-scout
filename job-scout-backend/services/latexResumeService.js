const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * LaTeX Resume Generator Service
 * Generates professional PDFs using LaTeX compilation
 */

// Paths
const TEMPLATE_PATH = path.join(__dirname, '../templates/resume-template.tex');
const TEMP_DIR = path.join(__dirname, '../temp');
const OUTPUT_DIR = path.join(__dirname, '../public/resumes');

/**
 * Escape special LaTeX characters
 */
function escapeLatex(text) {
    if (!text) return '';
    return text
        .replace(/\\/g, '\\textbackslash{}')
        .replace(/[&%$#_{}]/g, '\\$&')
        .replace(/~/g, '\\textasciitilde{}')
        .replace(/\^/g, '\\textasciicircum{}')
        .replace(/</g, '\\textless{}')
        .replace(/>/g, '\\textgreater{}')
        .replace(/\n/g, ' ');  // Handle newlines
}

/**
 * Parse resume text into structured JSON
 */
function parseResumeToJSON(resumeText) {
    const lines = resumeText.split('\n').map(line => line.trim()).filter(line => line);
    
    const data = {
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        github: '',
        summary: '',
        education: [],
        skills: {},
        experience: [],
        projects: [],
        positions: [],
        achievements: []
    };
    
    let currentSection = 'header';
    let headerCount = 0;
    let currentEntry = null;
    
    for (const line of lines) {
        const lowerLine = line.toLowerCase();
        
        // Parse header (first 2 lines)
        if (headerCount < 2 && currentSection === 'header') {
            if (headerCount === 0) {
                data.name = line;
            } else {
                // Parse contact info
                const parts = line.split('|');
                parts.forEach(part => {
                    const trimmed = part.trim();
                    if (trimmed.includes('@')) data.email = trimmed;
                    else if (trimmed.includes('linkedin')) data.linkedin = trimmed;
                    else if (trimmed.includes('github')) data.github = trimmed;
                    else if (trimmed.match(/\d{3}[-.]\d{3}[-.]\d{4}/)) data.phone = trimmed;
                });
            }
            headerCount++;
            continue;
        }
        
        // Detect sections
        if (lowerLine === 'professional summary' || lowerLine === 'summary') {
            currentSection = 'summary';
            currentEntry = null;
            continue;
        } else if (lowerLine === 'education') {
            currentSection = 'education';
            currentEntry = null;
            continue;
        } else if (lowerLine === 'technical skills' || lowerLine === 'skills') {
            currentSection = 'skills';
            currentEntry = null;
            continue;
        } else if (lowerLine === 'work experience' || lowerLine === 'experience') {
            currentSection = 'experience';
            currentEntry = null;
            continue;
        } else if (lowerLine === 'projects') {
            currentSection = 'projects';
            currentEntry = null;
            continue;
        } else if (lowerLine === 'positions of responsibility' || lowerLine === 'leadership') {
            currentSection = 'positions';
            currentEntry = null;
            continue;
        } else if (lowerLine === 'achievements' || lowerLine === 'awards') {
            currentSection = 'achievements';
            currentEntry = null;
            continue;
        }
        
        // Parse content based on section
        if (currentSection === 'summary') {
            data.summary += (data.summary ? ' ' : '') + line;
        } else if (currentSection === 'skills') {
            if (line.includes(':')) {
                const [category, skills] = line.split(':');
                data.skills[category.trim()] = skills.trim();
            }
        } else if (currentSection === 'education' || currentSection === 'experience' || 
                   currentSection === 'projects' || currentSection === 'positions') {
            
            // Check if this is a new entry (has date or |)
            const datePattern = /([A-Z][a-z]{2,9}\s+\d{4})\s*[-–—]\s*([A-Z][a-z]{2,9}\s+\d{4}|Present)/;
            const hasDate = datePattern.test(line);
            const hasPipe = line.includes('|');
            
            if (hasDate || hasPipe) {
                // Create new entry
                currentEntry = {
                    title: '',
                    subtitle: '',
                    date: '',
                    location: '',
                    points: []
                };
                
                if (hasPipe) {
                    // Project format
                    const parts = line.split('|');
                    currentEntry.title = parts[0].trim();
                    const rest = parts[1].trim();
                    const dateMatch = rest.match(datePattern);
                    if (dateMatch) {
                        currentEntry.date = dateMatch[0];
                        currentEntry.subtitle = rest.replace(dateMatch[0], '').trim();
                    } else {
                        currentEntry.subtitle = rest;
                    }
                } else {
                    // Job/Education format
                    const dateMatch = line.match(datePattern);
                    if (dateMatch) {
                        currentEntry.date = dateMatch[0];
                        currentEntry.title = line.replace(dateMatch[0], '').trim();
                    } else {
                        currentEntry.title = line;
                    }
                }
                
                // Add to appropriate section
                if (currentSection === 'education') data.education.push(currentEntry);
                else if (currentSection === 'experience') data.experience.push(currentEntry);
                else if (currentSection === 'projects') data.projects.push(currentEntry);
                else if (currentSection === 'positions') data.positions.push(currentEntry);
                
            } else if (line.match(/^[–\-•]/) && currentEntry) {
                // Bullet point
                currentEntry.points.push(line.replace(/^[–\-•]\s*/, ''));
            } else if (currentEntry && !currentEntry.subtitle) {
                // Probably company/institution info
                currentEntry.subtitle = line;
            }
        } else if (currentSection === 'achievements') {
            if (line.match(/^[–\-•]/)) {
                data.achievements.push(line.replace(/^[–\-•]\s*/, ''));
            } else {
                data.achievements.push(line);
            }
        }
    }
    
    return data;
}

/**
 * Generate LaTeX code from resume data
 */
function generateLatexContent(data) {
    let latex = `\\documentclass[letterpaper,10.5pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.6in}
\\addtolength{\\evensidemargin}{-0.6in}
\\addtolength{\\textwidth}{1.2in}
\\addtolength{\\topmargin}{-.6in}
\\addtolength{\\textheight}{1.2in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\titleformat{\\section}{
  \\vspace{-5pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-3pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-8pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-8pt}
}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(data.name)}} \\\\ \\vspace{1pt}
`;

    // Contact info
    const contacts = [];
    if (data.email) contacts.push(`\\href{mailto:${data.email}}{\\underline{${escapeLatex(data.email)}}}`);
    if (data.linkedin) contacts.push(`\\href{https://${data.linkedin}}{\\underline{${escapeLatex(data.linkedin)}}}`);
    if (data.github) contacts.push(`\\href{https://${data.github}}{\\underline{${escapeLatex(data.github)}}}`);
    if (data.phone) contacts.push(escapeLatex(data.phone));
    
    latex += `    ${contacts.join(' $|$ ')}\n`;
    latex += `\\end{center}\n\n`;

    // Professional Summary
    if (data.summary) {
        latex += `%-----------PROFESSIONAL SUMMARY-----------\n`;
        latex += `\\section{Professional Summary}\n`;
        latex += `${escapeLatex(data.summary)}\n\n`;
    }

    // Education
    if (data.education.length > 0) {
        latex += `%-----------EDUCATION-----------\n`;
        latex += `\\section{Education}\n`;
        latex += `  \\resumeSubHeadingListStart\n`;
        
        data.education.forEach(edu => {
            latex += `    \\resumeSubheading\n`;
            latex += `      {${escapeLatex(edu.title)}}{${escapeLatex(edu.date)}}\n`;
            latex += `      {${escapeLatex(edu.subtitle)}}{${escapeLatex(edu.location)}}\n`;
        });
        
        latex += `  \\resumeSubHeadingListEnd\n`;
        latex += `\\vspace{2pt}\n\n`;
    }

    // Technical Skills
    if (Object.keys(data.skills).length > 0) {
        latex += `%-----------TECHNICAL SKILLS-----------\n`;
        latex += `\\section{Technical Skills}\n`;
        latex += ` \\begin{itemize}[leftmargin=0.15in, label={}]\n`;
        latex += `    \\small{\\item{\n`;
        
        Object.entries(data.skills).forEach(([category, skills]) => {
            latex += `     \\textbf{${escapeLatex(category)}}{: ${escapeLatex(skills)}} \\\\\n`;
        });
        
        latex += `    }}\n \\end{itemize}\n\n`;
    }

    // Work Experience
    if (data.experience.length > 0) {
        latex += `%-----------WORK EXPERIENCE-----------\n`;
        latex += `\\section{Work Experience}\n`;
        latex += `  \\resumeSubHeadingListStart\n`;
        
        data.experience.forEach(exp => {
            latex += `    \\resumeSubheading\n`;
            latex += `      {${escapeLatex(exp.title)}}{${escapeLatex(exp.date)}}\n`;
            latex += `      {${escapeLatex(exp.subtitle)}}{${escapeLatex(exp.location)}}\n`;
            
            // Only add bullet points if they exist
            if (exp.points && exp.points.length > 0) {
                latex += `      \\resumeItemListStart\n`;
                exp.points.forEach(point => {
                    latex += `        \\resumeItem{${escapeLatex(point)}}\n`;
                });
                latex += `      \\resumeItemListEnd\n`;
            }
        });
        
        latex += `  \\resumeSubHeadingListEnd\n\n`;
    }

    // Projects
    if (data.projects.length > 0) {
        latex += `%-----------PROJECTS-----------\n`;
        latex += `\\section{Projects}\n`;
        latex += `    \\resumeSubHeadingListStart\n`;
        
        data.projects.forEach(proj => {
            latex += `      \\resumeProjectHeading\n`;
            latex += `          {\\textbf{${escapeLatex(proj.title)}} $|$ \\emph{${escapeLatex(proj.subtitle)}}}{${escapeLatex(proj.date)}}\n`;
            
            // Only add bullet points if they exist
            if (proj.points && proj.points.length > 0) {
                latex += `          \\resumeItemListStart\n`;
                proj.points.forEach(point => {
                    latex += `            \\resumeItem{${escapeLatex(point)}}\n`;
                });
                latex += `          \\resumeItemListEnd\n`;
            }
            latex += `\n`;
        });
        
        latex += `    \\resumeSubHeadingListEnd\n\n`;
    }

    // Positions of Responsibility
    if (data.positions.length > 0) {
        latex += `%-----------POSITIONS OF RESPONSIBILITY-----------\n`;
        latex += `\\section{Positions of Responsibility}\n`;
        latex += `  \\resumeSubHeadingListStart\n`;
        
        data.positions.forEach(pos => {
            latex += `    \\resumeSubheading\n`;
            latex += `      {${escapeLatex(pos.title)}}{${escapeLatex(pos.date)}}\n`;
            latex += `      {${escapeLatex(pos.subtitle)}}{${escapeLatex(pos.location)}}\n`;
            
            // Only add bullet points if they exist
            if (pos.points && pos.points.length > 0) {
                latex += `      \\resumeItemListStart\n`;
                pos.points.forEach(point => {
                    latex += `        \\resumeItem{${escapeLatex(point)}}\n`;
                });
                latex += `      \\resumeItemListEnd\n`;
            }
        });
        
        latex += `  \\resumeSubHeadingListEnd\n\n`;
    }

    // Achievements
    if (data.achievements.length > 0) {
        latex += `%-----------ACHIEVEMENTS-----------\n`;
        latex += `\\section{Achievements}\n`;
        latex += `  \\begin{itemize}[leftmargin=0.15in, label={}]\n`;
        latex += `    \\small{\\item{\n`;
        
        data.achievements.forEach((achievement, index) => {
            // Remove any leading bullets/dashes
            const cleanAchievement = achievement.replace(/^[–\-•]\s*/, '');
            latex += `     ${escapeLatex(cleanAchievement)}`;
            if (index < data.achievements.length - 1) {
                latex += ` \\\\\n`;
            } else {
                latex += `\n`;
            }
        });
        
        latex += `    }}\n`;
        latex += `  \\end{itemize}\n\n`;
    }

    latex += `\\end{document}`;
    
    return latex;
}

/**
 * Compile LaTeX to PDF
 */
async function compileLatexToPDF(texFilePath, outputDir) {
    try {
        const command = `pdflatex -interaction=nonstopmode -output-directory="${outputDir}" "${texFilePath}"`;
        
        console.log('Running pdflatex (first pass)...');
        const result1 = await execPromise(command);
        
        // Check if PDF was created
        const baseName = path.basename(texFilePath, '.tex');
        const pdfPath = path.join(outputDir, `${baseName}.pdf`);
        
        try {
            await fs.access(pdfPath);
            console.log('PDF created successfully on first pass');
        } catch (e) {
            console.error('PDF not created. LaTeX errors:', result1.stdout.substring(0, 1000));
            throw new Error('LaTeX compilation failed - no PDF generated');
        }
        
        console.log('Running pdflatex (second pass)...');
        await execPromise(command);
        
        return true;
    } catch (error) {
        // Log the actual LaTeX errors for debugging
        if (error.stdout) {
            console.error('LaTeX stdout:', error.stdout.substring(0, 1000));
        }
        throw new Error('Failed to compile LaTeX to PDF');
    }
}

/**
 * Main function to generate resume PDF
 */
async function generateResumePDF(resumeText, fileName) {
    console.log(`Generating PDF resume: ${fileName}`);
    
    try {
        // Ensure directories exist
        await fs.mkdir(TEMP_DIR, { recursive: true });
        await fs.mkdir(OUTPUT_DIR, { recursive: true });
        
        // Parse resume text to JSON
        console.log('Parsing resume text...');
        const data = parseResumeToJSON(resumeText);
        
        // Generate LaTeX content
        console.log('Generating LaTeX content...');
        const latexContent = generateLatexContent(data);
        
        // Write LaTeX file
        const baseName = fileName.replace('.pdf', '');
        const texFileName = `${baseName}.tex`;
        const texFilePath = path.join(TEMP_DIR, texFileName);
        
        console.log('Writing .tex file...');
        await fs.writeFile(texFilePath, latexContent);
        
        // Compile to PDF
        console.log('Compiling to PDF...');
        await compileLatexToPDF(texFilePath, TEMP_DIR);
        
        // Move PDF to output directory
        const pdfSourcePath = path.join(TEMP_DIR, `${baseName}.pdf`);
        const pdfDestPath = path.join(OUTPUT_DIR, fileName);
        
        await fs.copyFile(pdfSourcePath, pdfDestPath);
        
        // Clean up temp files
        console.log('Cleaning up temporary files...');
        const tempFiles = ['.tex', '.aux', '.log', '.out', '.pdf'];
        for (const ext of tempFiles) {
            try {
                await fs.unlink(path.join(TEMP_DIR, `${baseName}${ext}`));
            } catch (e) {
                // Ignore if file doesn't exist
            }
        }
        
        console.log(`✓ PDF resume created: ${fileName}`);
        return `/resumes/${fileName}`;
        
    } catch (error) {
        console.error('Error generating PDF resume:', error);
        throw new Error('Failed to generate PDF resume: ' + error.message);
    }
}

module.exports = { generateResumePDF, parseResumeToJSON, generateLatexContent };