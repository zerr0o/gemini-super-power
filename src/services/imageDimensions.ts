import type { ImageDimensions, ImageNode } from '../stores/appStore';

const IMAGE_SIZE_CACHE_MAX = 80;
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

  const existing = imageSizeCache.get(dataUrl);
  if (existing) {
    imageSizeCache.delete(dataUrl);
    imageSizeCache.set(dataUrl, existing);
    const size = await existing;
    return cloneImageSize(size);
  }

  const promise = new Promise<ImageDimensions>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('Unable to decode image dimensions.'));
    img.src = dataUrl;
  });

  imageSizeCache.set(dataUrl, promise);

  if (imageSizeCache.size > IMAGE_SIZE_CACHE_MAX) {
    const oldest = imageSizeCache.keys().next().value;
    if (oldest !== undefined) imageSizeCache.delete(oldest);
  }

  const size = await promise;
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
