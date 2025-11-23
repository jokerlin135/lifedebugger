import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Language, GeminiResponseSchema, Attachment, GeminiDetailSchema } from "../types";

const getSystemInstruction = (lang: Language) => {
  // Language Logic: Default to Vietnamese for conversation, but keep Technical Terms in English.
  const langInstruction = lang === Language.VI 
    ? "Speak predominantly in VIETNAMESE. However, for technical terms, legal terms, or industry standards, keep them in ENGLISH or use format 'Vietnamese (English Term)'."
    : "Speak in English.";

  const baseInstruction = `
    You are a "Life Debugger" AI. Your persona is a cynical, highly experienced, slightly rude, but extremely knowledgeable senior consultant/developer.
    
    LANGUAGE RULE: ${langInstruction}

    Task 1: Analyze the user's input (which could be about law, life, construction, work, etc.) AND any attached images, documents, or links.
    Task 2: Provide 10 strictly related issues/suggestions/steps related to the input.
    Task 3: Provide a "ROAST" or "CODE NOTE". This section should be humorous, critical, slang-heavy (use internet slang, dev slang), and unfiltered.
    Task 4: List the "SOURCES" or "DATA ORIGIN".
    Task 5: PROMPT ENGINEERING. Write a highly optimized "System Prompt" that the user can copy to use with another AI to get the absolute best result for this specific problem.
    Task 6: RECOMMEND AI. Suggest which AI model (e.g., Claude 3.5 Sonnet, GPT-4o, Gemini 1.5 Pro) is BEST for this specific task and WHY.

    Format requirements:
    - Use distinct Vietnamese internet slang like "vãi chưởng", "ảo ma", "hành chính hành là chính" where appropriate in the ROAST section.
    - Be open-minded. You don't need to be 100% legally accurate, just logically sound and entertaining.
  `;
  return baseInstruction;
};

const getDetailSystemInstruction = (lang: Language) => {
  const langInstruction = lang === Language.VI 
    ? "Write in VIETNAMESE. Keep technical headers or specialized terms in English."
    : "Write in English.";

  return `
    You are a specialized expert deep-diving into a SPECIFIC issue.
    Persona: Professional but sharp, practical, no-nonsense.
    Language Rule: ${langInstruction}
    
    Task: Provide a detailed breakdown of the specific issue provided.
    1. Deep Analysis: Explain WHY this is an issue and the core concepts.
    2. Actionable Steps: Concrete checklist or workflow to solve it.
    3. Risks: What happens if they ignore this? (Warn them sternly).
  `;
};

// Defined schema for structured output (Main Search)
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "description"],
      },
    },
    roast: {
      type: Type.STRING,
      description: "A humorous, critical, rude, open-minded paragraph evaluating the situation.",
    },
    sources: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of data sources, files analyzed, or laws referenced.",
    },
    promptSuggestion: {
        type: Type.STRING,
        description: "An optimized prompt string for the user to copy/paste.",
    },
    bestModel: {
        type: Type.STRING,
        description: "The name of the recommended AI model for this task (e.g., 'Claude 3.5 Sonnet for Reasoning').",
    }
  },
  required: ["suggestions", "roast", "sources", "promptSuggestion", "bestModel"],
};

// Schema for Detail View
const detailSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    analysis: { type: Type.STRING, description: "Detailed deep-dive analysis of the specific item." },
    steps: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING }, 
      description: "Step-by-step guide or workflow." 
    },
    risks: { type: Type.STRING, description: "Potential risks, penalties, or consequences." }
  },
  required: ["analysis", "steps", "risks"]
};

export const analyzeIssue = async (
  query: string,
  lang: Language,
  attachment?: Attachment | null,
  previousContext: string = ""
): Promise<GeminiResponseSchema> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not found in environment");

    const ai = new GoogleGenAI({ apiKey });

    // Build the Prompt
    let textPrompt = `
      Input Query: "${query}"
      Context/Previous Items: ${previousContext ? "This is a request for the NEXT 10 items. Previous were: " + previousContext : "This is a fresh request."}
    `;

    const parts: any[] = [];

    // Handle Attachments
    if (attachment) {
      if (attachment.type === 'link') {
        textPrompt += `\n\n[CONTEXT] Analyze this Link/URL context: ${attachment.content}`;
      } else if (attachment.type === 'file' && attachment.mimeType) {
        textPrompt += `\n\n[CONTEXT] Analyze the attached file (${attachment.name}).`;
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.content // Base64 string
          }
        });
      }
    }

    // Push the text prompt
    parts.push({ text: textPrompt });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: parts }, // Multimodal input
      config: {
        systemInstruction: getSystemInstruction(lang),
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.8, 
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from Gemini");

    return JSON.parse(text) as GeminiResponseSchema;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const analyzeSpecificItem = async (
  itemTitle: string,
  parentQuery: string,
  lang: Language
): Promise<GeminiDetailSchema> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY not found");

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `
      Original Main Issue: "${parentQuery}"
      Specific Item to Expand: "${itemTitle}"
      
      Please provide:
      1. A detailed professional analysis of "${itemTitle}" in the context of "${parentQuery}".
      2. A strictly practical step-by-step workflow (checklist).
      3. A risk assessment (what goes wrong if ignored).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: { parts: [{ text: prompt }] },
      config: {
        systemInstruction: getDetailSystemInstruction(lang),
        responseMimeType: "application/json",
        responseSchema: detailSchema,
        temperature: 0.7,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty detail response");
    
    return JSON.parse(text) as GeminiDetailSchema;
  } catch (error) {
    console.error("Gemini Detail API Error:", error);
    throw error;
  }
}