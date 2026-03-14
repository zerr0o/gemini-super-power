import { GoogleGenAI } from '@google/genai';

export interface GenerationParams {
  apiKey: string;
  prompt: string;
  model: 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview';
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  resolution: '1K' | '2K' | '4K';
  referenceImages?: string[]; // base64 arrays
  useSearchGrounding?: boolean;
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
