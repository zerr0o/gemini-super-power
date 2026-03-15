import type { LayerMaskPayload } from '../stores/appStore';

export interface RenderableLayer {
  left: number;
  top: number;
  width: number;
  height: number;
  sourceDataUrl: string;
  layerMask?: LayerMaskPayload | null;
}

const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadCachedImage(dataUrl: string): Promise<HTMLImageElement> {
  if (!imageCache.has(dataUrl)) {
    imageCache.set(dataUrl, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to decode image payload for layer rendering.'));
      img.src = dataUrl;
    }));
  }

  return imageCache.get(dataUrl)!;
}

export function createSolidMaskCanvas(width: number, height: number, value = 255) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = `rgb(${value}, ${value}, ${value})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  return canvas;
}

export async function createMaskCanvas(
  mask: LayerMaskPayload | null | undefined,
  width: number,
  height: number,
) {
  const canvas = createSolidMaskCanvas(width, height, 255);
  if (!mask?.dataUrl) return canvas;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const img = await loadCachedImage(mask.dataUrl);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export function createAlphaMaskCanvas(maskCanvas: HTMLCanvasElement) {
  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = Math.max(1, Math.round(maskCanvas.width));
  alphaCanvas.height = Math.max(1, Math.round(maskCanvas.height));

  const sourceCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const alphaCtx = alphaCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceCtx || !alphaCtx) {
    return alphaCanvas;
  }

  const imageData = sourceCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const pixels = imageData.data;

  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = Math.round((pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3);
    const sourceAlpha = pixels[i + 3] / 255;
    const alpha = Math.round(luminance * sourceAlpha);

    pixels[i] = 255;
    pixels[i + 1] = 255;
    pixels[i + 2] = 255;
    pixels[i + 3] = alpha;
  }

  alphaCtx.putImageData(imageData, 0, 0);
  return alphaCanvas;
}

export async function createMaskedLayerCanvas(
  sourceDataUrl: string,
  width: number,
  height: number,
  mask: LayerMaskPayload | HTMLCanvasElement | null | undefined,
) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable during mask rendering.');
  }

  const img = await loadCachedImage(sourceDataUrl);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const maskCanvas = mask instanceof HTMLCanvasElement
    ? mask
    : await createMaskCanvas(mask, canvas.width, canvas.height);
  const alphaMaskCanvas = createAlphaMaskCanvas(maskCanvas);

  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(alphaMaskCanvas, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';

  return canvas;
}

export async function drawRenderableLayer(
  ctx: CanvasRenderingContext2D,
  layer: RenderableLayer,
  options: {
    documentWidth: number;
    documentHeight: number;
    targetWidth?: number;
    targetHeight?: number;
    maskOverride?: LayerMaskPayload | HTMLCanvasElement | null;
  },
) {
  const targetWidth = Math.max(1, Math.round(options.targetWidth ?? options.documentWidth));
  const targetHeight = Math.max(1, Math.round(options.targetHeight ?? options.documentHeight));
  const scaleX = targetWidth / options.documentWidth;
  const scaleY = targetHeight / options.documentHeight;

  const maskedLayer = await createMaskedLayerCanvas(
    layer.sourceDataUrl,
    layer.width,
    layer.height,
    options.maskOverride ?? layer.layerMask ?? null,
  );

  ctx.drawImage(
    maskedLayer,
    Math.round(layer.left * scaleX),
    Math.round(layer.top * scaleY),
    Math.round(layer.width * scaleX),
    Math.round(layer.height * scaleY),
  );
}

export async function renderLayerComposite<TLayer extends RenderableLayer>(
  layers: TLayer[],
  documentWidth: number,
  documentHeight: number,
  options: {
    targetWidth?: number;
    targetHeight?: number;
    layerMaskOverrides?: Map<string, LayerMaskPayload | HTMLCanvasElement | null>;
    layerKey?: (layer: TLayer) => string;
  } = {},
) {
  const targetWidth = Math.max(1, Math.round(options.targetWidth ?? documentWidth));
  const targetHeight = Math.max(1, Math.round(options.targetHeight ?? documentHeight));
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable during layer compositing.');
  }

  ctx.clearRect(0, 0, targetWidth, targetHeight);

  for (const layer of layers) {
    const layerKey = options.layerKey?.(layer);
    const maskOverride = layerKey ? options.layerMaskOverrides?.get(layerKey) : null;
    await drawRenderableLayer(ctx, layer, {
      documentWidth,
      documentHeight,
      targetWidth,
      targetHeight,
      maskOverride: maskOverride ?? undefined,
    });
  }

  return canvas;
}
