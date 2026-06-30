import { GoogleGenAI } from '@google/genai';

const genAI = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GEMINI_API_KEY,
});

export const geminiModel = 'gemini-2.5-flash';

export default genAI;
