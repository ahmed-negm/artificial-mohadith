import { GeminiSettings } from '../settings';

export async function callGemini(settings: GeminiSettings, prompt: string): Promise<string> {
  const { apiKey, model, temperature } = settings;
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
    },
  };

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    throw new Error(`Gemini API error: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return text || 'No response';
}

export async function testApiKey(settings: GeminiSettings): Promise<boolean> {
  try {
    const result = await callGemini(settings, 'ping');
    return !!result;
  } catch (e) {
    console.error(e);
    return false;
  }
}