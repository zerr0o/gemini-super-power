import { GoogleGenAI, ThinkingLevel as GeminiThinkingLevel } from '@google/genai';

export type AspectRatio = '1:1' | '1:4' | '1:8' | '2:3' | '3:2' | '3:4' | '4:1' | '4:3' | '4:5' | '5:4' | '8:1' | '9:16' | '16:9' | '21:9';
export type Resolution = '512' | '1K' | '2K' | '4K';
export type ThinkingLevel = 'Minimal' | 'High';
export type GenerationModel = 'gemini-3.1-flash-image-preview' | 'gemini-3-pro-image-preview';

export const ASPECT_RATIO_VALUES: Record<AspectRatio, number> = {
  '1:1': 1 / 1,
  '1:4': 1 / 4,
  '1:8': 1 / 8,
  '2:3': 2 / 3,
  '3:2': 3 / 2,
  '3:4': 3 / 4,
  '4:1': 4 / 1,
  '4:3': 4 / 3,
  '4:5': 4 / 5,
  '5:4': 5 / 4,
  '8:1': 8 / 1,
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '21:9': 21 / 9,
};

const FLASH_ASPECT_RATIOS: readonly AspectRatio[] = ['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'];
const PRO_ASPECT_RATIOS: readonly AspectRatio[] = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const FLASH_RESOLUTIONS: readonly Resolution[] = ['512', '1K', '2K', '4K'];
const PRO_RESOLUTIONS: readonly Resolution[] = ['1K', '2K', '4K'];

export function getSupportedAspectRatios(model: GenerationModel): readonly AspectRatio[] {
  return model === 'gemini-3.1-flash-image-preview' ? FLASH_ASPECT_RATIOS : PRO_ASPECT_RATIOS;
}

export function getSupportedResolutions(model: GenerationModel): readonly Resolution[] {
  return model === 'gemini-3.1-flash-image-preview' ? FLASH_RESOLUTIONS : PRO_RESOLUTIONS;
}

const SDK_THINKING_LEVELS: Record<ThinkingLevel, GeminiThinkingLevel> = {
  Minimal: GeminiThinkingLevel.MINIMAL,
  High: GeminiThinkingLevel.HIGH,
};

export interface GenerationParams {
  apiKey: string;
  prompt: string;
  model: GenerationModel;
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
        thinkingLevel: SDK_THINKING_LEVELS[params.thinkingLevel || 'Minimal'],
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
