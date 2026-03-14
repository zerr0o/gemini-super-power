import { GoogleGenAI } from '@google/genai';

export type AspectRatio = '1:1' | '1:4' | '1:8' | '2:3' | '3:2' | '3:4' | '4:1' | '4:3' | '4:5' | '5:4' | '8:1' | '9:16' | '16:9' | '21:9';
export type Resolution = '512' | '1K' | '2K' | '4K';
export type ThinkingLevel = 'Minimal' | 'High';

export interface GenerationParams {
  apiKey: string;
  prompt: string;
  model: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview';
  aspectRatio: AspectRatio;
  resolution: Resolution;
  referenceImages?: string[]; // base64 arrays
  useSearchGrounding?: boolean;
  thinkingLevel?: ThinkingLevel;
}

export async function generateImage(params: GenerationParams): Promise<string> {
  if (!params.apiKey) {
    throw new Error("API Key is missing. Please configure it in Settings.");
  }
  const ai = new GoogleGenAI({ apiKey: params.apiKey });
  
  const tools = params.useSearchGrounding ? [{ googleSearch: {} }] : undefined;
  
  const contents = [];
  contents.push({ text: params.prompt });

  if (params.referenceImages && params.referenceImages.length > 0) {
    for (const imgBase64 of params.referenceImages) {
      contents.push({
        inlineData: {
          mimeType: 'image/png', // assuming png for simplicity, should extract properly
          data: imgBase64.replace(/^data:image\/[a-z]+;base64,/, ''),
        }
      });
    }
  }

  const response = await ai.models.generateContent({
    model: params.model,
    contents,
    config: {
      responseModalities: ['IMAGE'],
      imageConfig: {
        aspectRatio: params.aspectRatio,
        imageSize: params.resolution,
      },
      thinkingConfig: params.model === 'gemini-3.1-flash-image-preview' ? {
        thinkingLevel: params.thinkingLevel || 'Minimal',
        includeThoughts: false
      } : undefined,
      tools: tools as any // satisfying strict types depending on SDK version
    }
  });

  const part = response.candidates?.[0]?.content?.parts?.[0];
  if (part?.inlineData) {
    const b64Data = part.inlineData.data;
    return `data:${part.inlineData.mimeType};base64,${b64Data}`;
  }

  throw new Error("No image generated or returned from Nano Banana");
}
