import type { ImageDimensions, ImageNode } from '../stores/appStore';

const imageSizeCache = new Map<string, Promise<ImageDimensions>>();

function cloneImageSize(size: ImageDimensions | null | undefined): ImageDimensions | null {
  if (!size) return null;

  return {
    width: size.width,
    height: size.height,
  };
}

export function formatImageSize(size: ImageDimensions | null | undefined): string {
  if (!size) return 'Unknown';
  return `${size.width} x ${size.height}`;
}

export async function getImageDimensionsFromDataUrl(dataUrl: string | null | undefined): Promise<ImageDimensions | null> {
  if (!dataUrl) return null;

  if (!imageSizeCache.has(dataUrl)) {
    imageSizeCache.set(dataUrl, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      };
      img.onerror = () => reject(new Error('Unable to decode image dimensions.'));
      img.src = dataUrl;
    }));
  }

  const size = await imageSizeCache.get(dataUrl)!;
  return cloneImageSize(size);
}

export async function resolveNodeGeneratedImageSize(node: ImageNode | null | undefined): Promise<ImageDimensions | null> {
  if (!node) return null;
  if (node.generatedImageSize) return cloneImageSize(node.generatedImageSize);
  if (node.geminiResultBase64) return getImageDimensionsFromDataUrl(node.geminiResultBase64);
  return resolveNodeFinalImageSize(node);
}

export async function resolveNodeFinalImageSize(node: ImageNode | null | undefined): Promise<ImageDimensions | null> {
  if (!node) return null;
  if (node.finalImageSize) return cloneImageSize(node.finalImageSize);
  return getImageDimensionsFromDataUrl(node.finalResultBase64 || node.blobBase64);
}
