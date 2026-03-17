const { GoogleGenAI } = require('@google/genai');
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log(ai.files ? "Has files API" : "No files API");
// console.log(Object.keys(ai));
