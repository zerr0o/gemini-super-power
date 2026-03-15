import type { ImageNode } from '../stores/appStore';
import { buildNodeLineage } from './layerExport';
import { getImageDimensionsFromDataUrl, resolveNodeFinalImageSize, resolveNodeGeneratedImageSize } from './imageDimensions';

export interface PixelDensitySummary {
  documentWidth: number;
  documentHeight: number;
  minDensity: number;
  maxDensity: number;
  overlayDataUrl: string;
}

interface DensityLayer {
  left: number;
  top: number;
  width: number;
  height: number;
  density: number;
}

const DEFAULT_MAX_OVERLAY_SIDE = 240;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function isPatchNode(node: ImageNode) {
  return !!node.modificationBox && !!node.geminiResultBase64;
}

function getDensityColor(density: number) {
  const safeDensity = Number.isFinite(density) && density > 0 ? density : 0;
  const clampedDensity = clamp(safeDensity, 0, 2);
  const hue = clampedDensity < 1
    ? 0 + (clampedDensity * 52)
    : 52 + ((clampedDensity - 1) * 68);
  const saturation = clampedDensity < 1 ? 90 : 84;
  const lightness = clampedDensity < 1
    ? 52 - ((1 - clampedDensity) * 6)
    : 47 + Math.min(1, clampedDensity - 1) * 7;

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export async function buildPixelDensitySummary(
  nodes: ImageNode[],
  activeNodeId: string | null,
  maxOverlaySide = DEFAULT_MAX_OVERLAY_SIDE,
): Promise<PixelDensitySummary | null> {
  if (!activeNodeId) {
    return null;
  }

  const lineage = buildNodeLineage(nodes, activeNodeId);
  if (lineage.length === 0) return null;

  let documentWidth = 0;
  let documentHeight = 0;
  let layers: DensityLayer[] = [];

  for (const node of lineage) {
    const finalSize = await resolveNodeFinalImageSize(node);
    if (!finalSize || finalSize.width < 1 || finalSize.height < 1) {
      continue;
    }

    if (!node.parentId) {
      documentWidth = finalSize.width;
      documentHeight = finalSize.height;
      layers = [{
        left: 0,
        top: 0,
        width: documentWidth,
        height: documentHeight,
        density: 1,
      }];
      continue;
    }

    const generatedSize = await resolveNodeGeneratedImageSize(node);
    if (!generatedSize || generatedSize.width < 1 || generatedSize.height < 1) continue;

    if (!isPatchNode(node) || !node.modificationBox) {
      const baseWidth = Math.max(1, documentWidth || finalSize.width);
      const baseHeight = Math.max(1, documentHeight || finalSize.height);
      const density = Math.min(
        generatedSize.width / baseWidth,
        generatedSize.height / baseHeight,
      );

      documentWidth = finalSize.width;
      documentHeight = finalSize.height;
      layers = [{
        left: 0,
        top: 0,
        width: documentWidth,
        height: documentHeight,
        density,
      }];
      continue;
    }

    if (documentWidth < 1 || documentHeight < 1) {
      documentWidth = finalSize.width;
      documentHeight = finalSize.height;
      layers = [{
        left: 0,
        top: 0,
        width: documentWidth,
        height: documentHeight,
        density: 1,
      }];
    }

    const sourceWidth = Math.max(1, node.modificationBox.originalWidth || documentWidth);
    const sourceHeight = Math.max(1, node.modificationBox.originalHeight || documentHeight);
    const scaleX = documentWidth / sourceWidth;
    const scaleY = documentHeight / sourceHeight;

    const left = clamp(Math.round(node.modificationBox.x * scaleX), 0, documentWidth);
    const top = clamp(Math.round(node.modificationBox.y * scaleY), 0, documentHeight);
    const width = clamp(Math.round(node.modificationBox.w * scaleX), 1, Math.max(1, documentWidth - left));
    const height = clamp(Math.round(node.modificationBox.h * scaleY), 1, Math.max(1, documentHeight - top));
    const density = Math.min(
      generatedSize.width / Math.max(1, node.modificationBox.w),
      generatedSize.height / Math.max(1, node.modificationBox.h),
    );

    layers.push({
      left,
      top,
      width,
      height,
      density,
    });
  }

  if (documentWidth < 1 || documentHeight < 1 || layers.length === 0) {
    const fallbackNode = lineage[lineage.length - 1];
    const fallbackSize = await getImageDimensionsFromDataUrl(fallbackNode?.finalResultBase64 || fallbackNode?.blobBase64);
    if (!fallbackSize) return null;

    documentWidth = fallbackSize.width;
    documentHeight = fallbackSize.height;
    layers = [{
      left: 0,
      top: 0,
      width: documentWidth,
      height: documentHeight,
      density: 1,
    }];
  }

  const longestSide = Math.max(documentWidth, documentHeight);
  const sampleScale = clamp(maxOverlaySide / Math.max(1, longestSide), 0.08, 1);
  const overlayWidth = Math.max(1, Math.round(documentWidth * sampleScale));
  const overlayHeight = Math.max(1, Math.round(documentHeight * sampleScale));

  const canvas = document.createElement('canvas');
  canvas.width = overlayWidth;
  canvas.height = overlayHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable for density overlay.');
  }

  ctx.clearRect(0, 0, overlayWidth, overlayHeight);

  let minDensity = Number.POSITIVE_INFINITY;
  let maxDensity = 0;

  for (let y = 0; y < overlayHeight; y += 1) {
    const docY = ((y + 0.5) / overlayHeight) * documentHeight;

    for (let x = 0; x < overlayWidth; x += 1) {
      const docX = ((x + 0.5) / overlayWidth) * documentWidth;

      let localDensity = 1;
      for (let layerIndex = layers.length - 1; layerIndex >= 0; layerIndex -= 1) {
        const layer = layers[layerIndex];
        if (
          docX >= layer.left
          && docX <= layer.left + layer.width
          && docY >= layer.top
          && docY <= layer.top + layer.height
        ) {
          localDensity = layer.density;
          break;
        }
      }

      minDensity = Math.min(minDensity, localDensity);
      maxDensity = Math.max(maxDensity, localDensity);

      ctx.fillStyle = getDensityColor(localDensity);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return {
    documentWidth,
    documentHeight,
    minDensity: Number.isFinite(minDensity) ? minDensity : 1,
    maxDensity: maxDensity > 0 ? maxDensity : 1,
    overlayDataUrl: canvas.toDataURL('image/png'),
  };
}
