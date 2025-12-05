import { GoogleGenAI, Type, Schema } from "@google/genai";
import { QuizQuestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Generate a quiz based on a topic
export const generateQuiz = async (topic: string, count: number = 5): Promise<QuizQuestion[]> => {
  const model = "gemini-2.5-flash";
  
  const responseSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        text: { type: Type.STRING, description: "The question text" },
        type: { type: Type.STRING, description: "Must be 'MCQ' for this generation", enum: ["MCQ"] },
        options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Array of 4 options" },
        correctAnswer: { type: Type.INTEGER, description: "Index of the correct option (0-3)" },
        explanation: { type: Type.STRING, description: "Brief explanation of the answer" }
      },
      required: ["text", "type", "options", "correctAnswer"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Create a multiple choice quiz about "${topic}" with ${count} questions suitable for university level students. Ensure 'type' is always 'MCQ'.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) return [];
    
    // Parse and cast, ensuring type safety matches QuizQuestion
    const parsed = JSON.parse(text);
    return parsed.map((q: any) => ({
      ...q,
      type: 'MCQ', // Enforce type
      id: `q_gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    })) as QuizQuestion[];
    
  } catch (error) {
    console.error("Gemini Quiz Generation Error:", error);
    return [];
  }
};

// Generate a summary of financial data
export const analyzeFinancialHealth = async (dataSummary: string): Promise<string> => {
  const model = "gemini-2.5-flash";
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Act as a financial analyst for Baobab Institute. Analyze the following transaction summary and give a brief, 1-paragraph strategic insight on financial health: ${dataSummary}`,
    });
    return response.text || "Analysis unavailable.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Unable to generate AI analysis at this time.";
  }
};
