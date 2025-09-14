import { GeminiSettings } from "../settings";
import { GoogleGenAI } from "@google/genai";

/**
 * Interface for API status callbacks
 */
export interface ApiStatusCallbacks {
  onStart?: () => void;
  onPartialResponse?: (text: string) => void;
  onComplete?: () => void;
  onError?: (error: any) => void;
}

/**
 * Call Gemini API with enhanced status callbacks for better UI feedback
 */
export async function callGemini(
  settings: GeminiSettings,
  prompt: string,
  callbacks?: ApiStatusCallbacks
): Promise<string> {
  const { apiKey, model, temperature, enableStreaming } = settings;
  const { onStart, onPartialResponse, onComplete, onError } = callbacks || {};

  // Signal that we're starting the API call
  onStart?.();

  const ai = new GoogleGenAI({ apiKey });

  // Standard request parameters
  const requestParams = {
    model,
    contents: [{ text: prompt }],
    generationConfig: {
      temperature: temperature
    }
  };

  // If streaming is disabled or no callback is provided, use regular call
  if (!enableStreaming || !onPartialResponse) {
    try {
      const response = await ai.models.generateContent(requestParams);
      const result = response.text || "No response";
      onComplete?.();
      return result;
    } catch (error) {
      console.error("API error:", error);
      onError?.(error);
      return "Error generating response. Please try again.";
    }
  }

  // Use streaming API
  let fullResponse = "";
  
  try {
    // Note: This assumes the Gemini API version supports streaming
    // We'll implement a fallback mechanism if it fails
    const streamingResponse = await ai.models.generateContentStream(requestParams);

    // Process the streaming response
    for await (const chunk of streamingResponse) {
      const chunkText = chunk.text || "";
      fullResponse += chunkText;
      onPartialResponse(fullResponse);
    }

    onComplete?.();
    return fullResponse;
  } catch (error) {
    console.error("Streaming error:", error);
    onError?.(error);
    
    // Fallback to non-streaming API if streaming fails
    try {
      const response = await ai.models.generateContent(requestParams);
      const result = response.text || "No response";
      onComplete?.();
      return result;
    } catch (fallbackError) {
      console.error("Fallback error:", fallbackError);
      onError?.(fallbackError);
      return "Error generating response. Please try again.";
    }
  }
}

export async function callGeminiWithContext(
  settings: GeminiSettings,
  prompt: string,
  contextText: string,
  callbacks?: ApiStatusCallbacks
): Promise<string> {
  const combinedPrompt = `Context information:\n${contextText}\n\nUser question: ${prompt}\n\nPlease answer based on the context provided.`;
  return callGemini(settings, combinedPrompt, callbacks);
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
