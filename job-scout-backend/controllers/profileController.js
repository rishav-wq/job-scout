// In controllers/profileController.js
const Profile = require('../models/Profile');
const mammoth = require('mammoth');
const PDFParser = require('pdf2json');

// This is a more robust helper function for pdf2json
function parsePdfBuffer(buffer) {
    return new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(this, 1);
        pdfParser.on('pdfParser_dataError', errData => reject(new Error(errData.parserError)));
        pdfParser.on('pdfParser_dataReady', () => {
            // pdfParser.getRawTextContent() joins text with line breaks.
            // We'll replace those with spaces for a cleaner text block for the AI.
            const text = pdfParser.getRawTextContent().replace(/\r\n/g, " ");
            resolve(text);
        });
        pdfParser.parseBuffer(buffer);
    });
}

const uploadResume = async (req, res) => {
    const userId = 'default-user'; 

    if (!req.file) {
        return res.status(400).json({ msg: 'No file uploaded.' });
    }

    try {
        let resumeText = '';
        
        if (req.file.mimetype === 'application/pdf') {
            console.log("Processing PDF file...");
            resumeText = await parsePdfBuffer(req.file.buffer);
        } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            console.log("Processing DOCX file...");
            const { value } = await mammoth.extractRawText({ buffer: req.file.buffer });
            resumeText = value;
        } else {
            return res.status(400).json({ msg: 'Unsupported file type. Please upload a PDF or DOCX file.' });
        }

        if (!resumeText || resumeText.trim().length === 0) {
            console.error("Text extraction resulted in an empty string.");
            return res.status(500).json({ msg: 'Failed to extract text from the resume.' });
        }

        console.log(`Successfully extracted ${resumeText.length} characters from the resume.`);

        const profile = await Profile.findOneAndUpdate(
            { userId: userId },
            { resumeText: resumeText, lastUpdated: new Date() },
            { new: true, upsert: true }
        );

        res.status(200).json({ msg: 'Resume uploaded and text extracted successfully.', profile });

    } catch (error) {
        console.error('Error processing resume:', error);
        res.status(500).json({ msg: 'Server error during file processing.' });
    }
};

module.exports = { uploadResume };