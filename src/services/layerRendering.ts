import type { LayerMaskPayload } from '../stores/appStore';

export interface RenderableLayer {
  left: number;
  top: number;
  width: number;
  height: number;
  sourceDataUrl: string;
  layerMask?: LayerMaskPayload | null;
}

const IMAGE_CACHE_MAX = 60;
const imageCache = new Map<string, Promise<HTMLImageElement>>();

export function loadCachedImage(dataUrl: string): Promise<HTMLImageElement> {
  const existing = imageCache.get(dataUrl);
  if (existing) {
    imageCache.delete(dataUrl);
    imageCache.set(dataUrl, existing);
    return existing;
  }

  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Unable to decode image payload for layer rendering.'));
    img.src = dataUrl;
  });

  imageCache.set(dataUrl, promise);

  if (imageCache.size > IMAGE_CACHE_MAX) {
    const oldest = imageCache.keys().next().value;
    if (oldest !== undefined) imageCache.delete(oldest);
  }

  return promise;
}

export function canvasToDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) { resolve(canvas.toDataURL('image/png')); return; }
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    }, 'image/png');
  });
}

export function createSolidMaskCanvas(width: number, height: number, value = 255) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const img = await loadCachedImage(mask.dataUrl);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

const LUM_TO_ALPHA_ID = '__lum2a__';
let _lumFilterReady = false;

function ensureLumToAlphaFilter() {
  if (_lumFilterReady) return;
  _lumFilterReady = true;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.style.pointerEvents = 'none';
  svg.innerHTML = `<filter id="${LUM_TO_ALPHA_ID}"><feColorMatrix type="luminanceToAlpha"/></filter>`;
  document.body.appendChild(svg);
}

export function createAlphaMaskCanvas(maskCanvas: HTMLCanvasElement) {
  ensureLumToAlphaFilter();

  const alphaCanvas = document.createElement('canvas');
  alphaCanvas.width = Math.max(1, Math.round(maskCanvas.width));
  alphaCanvas.height = Math.max(1, Math.round(maskCanvas.height));

  const ctx = alphaCanvas.getContext('2d');
  if (!ctx) return alphaCanvas;

  ctx.filter = `url(#${LUM_TO_ALPHA_ID})`;
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.filter = 'none';

  return alphaCanvas;
}

export function updateAlphaMaskRegion(
  alphaMask: HTMLCanvasElement,
  sourceCanvas: HTMLCanvasElement,
  region: { x: number; y: number; w: number; h: number },
) {
  ensureLumToAlphaFilter();

  const x = Math.max(0, Math.floor(region.x));
  const y = Math.max(0, Math.floor(region.y));
  const right = Math.min(sourceCanvas.width, Math.ceil(region.x + region.w));
  const bottom = Math.min(sourceCanvas.height, Math.ceil(region.y + region.h));
  const w = right - x;
  const h = bottom - y;
  if (w <= 0 || h <= 0) return;

  const ctx = alphaMask.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(x, y, w, h);
  ctx.filter = `url(#${LUM_TO_ALPHA_ID})`;
  ctx.drawImage(sourceCanvas, x, y, w, h, x, y, w, h);
  ctx.filter = 'none';
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

  const hasMask = mask instanceof HTMLCanvasElement
    || (mask != null && !!mask.dataUrl);
  if (!hasMask) return canvas;

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
