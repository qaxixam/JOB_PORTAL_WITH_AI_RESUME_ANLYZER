import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const analyzeResume = async (resumeText, jobDescription) => {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

    const prompt = `You are an expert resume analyzer. Analyze the resume against the job description and return ONLY a valid JSON object. Do NOT include markdown formatting, explanations, or code blocks. Return raw JSON only.

Required JSON format:
{
  "matchPercentage": <number between 0-100>,
  "strengths": [<array of 3-5 strings>],
  "missingSkills": [<array of strings, empty if none>],
  "feedback": "<string with detailed analysis>",
  "improvements": [<array of strings with actionable suggestions>]
}

Resume: ${resumeText}

Job Description: ${jobDescription}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return parseAIResponse(text);
  } catch (error) {
    throw new Error(`AI Analysis failed: ${error.message}`);
  }
};

const parseAIResponse = (text) => {
  // Clean the response - remove markdown code blocks if Gemini wraps JSON in them
  let cleanText = text
    .replace(/```json\s*/gi, '')   // Remove ```json
    .replace(/```\s*/g, '')        // Remove ```
    .replace(/^\s*[\r\n]+/gm, '')  // Remove empty lines
    .trim();

  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(cleanText);

    // Validate required fields
    return {
      matchPercentage: Number(parsed.matchPercentage) || 0,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      feedback: String(parsed.feedback || ''),
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    };
  } catch (jsonError) {
    // Fallback: If JSON parsing fails, try regex extraction
    console.warn('JSON parsing failed, falling back to regex:', jsonError.message);
    return fallbackParse(cleanText);
  }
};

// Fallback parser if Gemini doesn't return valid JSON
const fallbackParse = (text) => {
  const fullText = text;

  return {
    matchPercentage: extractPercentage(fullText),
    strengths: extractList(fullText, ['strength', 'strengths']),
    missingSkills: extractList(fullText, ['missing', 'missing skills', 'missingSkills']),
    feedback: fullText,
    improvements: extractList(fullText, ['improvement', 'improvements', 'suggested']),
  };
};

const extractPercentage = (text) => {
  const patterns = [
    /"matchPercentage"\s*:\s*(\d+)/i,           // JSON format
    /match\s*(?:percentage|score)?\s*[:\-]\s*(\d+)%?/i,
    /(\d+)%\s*(?:match|score)/i,
    /(?:score|match)\s*:\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
};

const extractList = (text, keywords) => {
  const lines = text.split('\n').filter(line => line.trim());
  const list = [];
  let collecting = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Check if any keyword matches
    if (keywords.some(kw => lowerLine.includes(kw.toLowerCase()))) {
      collecting = true;
      continue;
    }

    // Stop collecting if we hit another section header
    if (collecting && /^#{1,6}\s|^\d+\.|^[a-z]+:/i.test(line)) {
      const isNewSection = keywords.some(kw => !lowerLine.includes(kw.toLowerCase()));
      if (isNewSection && /^#{1,6}\s|^\d+\./.test(line)) {
        collecting = false;
        continue;
      }
    }

    if (collecting) {
      // Clean the line
      const cleanLine = line
        .replace(/^\d+\.\s*/, '')           // Remove "1. "
        .replace(/^[-*]\s*/, '')            // Remove "- " or "* "
        .replace(/\*\*/g, '')               // Remove **
        .replace(/\*/g, '')                 // Remove *
        .trim();

      if (cleanLine && cleanLine.length > 3) {
        list.push(cleanLine);
      }
    }
  }

  return list;
};

export default { analyzeResume };