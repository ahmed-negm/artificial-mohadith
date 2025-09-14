import { GeminiSettings } from "../settings";
import { GoogleGenAI } from "@google/genai";

export async function callGemini(
  settings: GeminiSettings,
  prompt: string
): Promise<string> {
  const { apiKey, model } = settings;

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        text: prompt,
      },
    ],
  });

  return response.text || "No response";
}

export async function testApiKey(settings: GeminiSettings): Promise<boolean> {
  try {
    const result = await callGemini(settings, "ping");
    return !!result;
  } catch (e) {
    console.error(e);
    return false;
  }
}
