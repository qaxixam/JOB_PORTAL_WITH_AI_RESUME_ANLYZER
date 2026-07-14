import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import mammoth from "mammoth";
import fs from "fs";
import path from "path";
import axios from "axios";
import 'dotenv/config';

export const extractTextFromFile = async (filePath) => {
    if (!filePath) {
        throw new Error("File path is required");
    }

    const ext = filePath.split(".").pop().toLowerCase();

    switch (ext) {
        case "pdf":
            return await extractPDF(filePath);

        case "docx":
            return await extractDOCX(filePath);

        case "txt":
            if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
                const response = await axios.get(filePath);
                return response.data;
            }
            return fs.readFileSync(filePath, "utf8");

        default:
            throw new Error("Unsupported file format");
    }
};

const extractPDF = async (filePath) => {
    try {
        let buffer;

        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            // Remote URL - try to fetch
            buffer = await fetchFromURL(filePath);
        } else if (filePath.startsWith("/uploads/") || filePath.startsWith("uploads/")) {
            // Local file path
            buffer = await extractLocalPDF(filePath);
        } else {
            // Assume local filesystem path
            buffer = fs.readFileSync(filePath);
        }

        const data = await pdfParse(buffer);
        return data.text;
    } catch (error) {
        console.error("========== PDF ERROR ==========");
        console.error(error.message);
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
};

/**
 * Extract PDF from local server storage
 * No Cloudinary, no 401 errors, instant access
 */
const extractLocalPDF = async (relativePath) => {
    try {
        console.log("Reading PDF from local storage:", relativePath);
        
        // Handle both /uploads/... and uploads/... paths
        let fullPath = relativePath.startsWith("/") 
            ? path.join(process.cwd(), relativePath)
            : path.join(process.cwd(), relativePath);

        console.log("Full path:", fullPath);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`File not found: ${fullPath}`);
        }

        const buffer = fs.readFileSync(fullPath);
        console.log(`✅ Successfully read local PDF (${buffer.length} bytes)`);
        return buffer;

    } catch (error) {
        throw new Error(`Failed to read local PDF: ${error.message}`);
    }
};

const fetchFromURL = async (url) => {
    try {
        console.log("Fetching PDF from URL:", url.substring(0, 60) + "...");
        
        const response = await axios.get(url, {
            responseType: "arraybuffer",
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.data || response.data.length === 0) {
            throw new Error("Empty response from URL");
        }

        console.log(`✅ Successfully fetched PDF from URL (${response.data.length} bytes)`);
        return Buffer.from(response.data);

    } catch (error) {
        throw new Error(`Failed to fetch from URL: ${error.message}`);
    }
};

const extractDOCX = async (filePath) => {
    try {
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            const response = await axios.get(filePath, {
                responseType: "arraybuffer",
                timeout: 30000,
                headers: {
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            
            const buffer = Buffer.from(response.data);
            const result = await mammoth.extractRawText({ buffer });
            return result.value;
        } else {
            const result = await mammoth.extractRawText({
                path: filePath,
            });
            return result.value;
        }
    } catch (error) {
        console.error("DOCX ERROR:", error.message);
        throw new Error(`Failed to extract text from DOCX: ${error.message}`);
    }
};