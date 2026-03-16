import type { ImageNode, ReferenceImageAsset } from '../stores/appStore';
import { canvasToDataUrl, createMaskCanvas, createMaskedLayerCanvas, loadCachedImage, renderLayerComposite } from './layerRendering';
import type { PsdLayerInput, PsdWorkerInput } from './psdBinaryHelpers';
import { toBase64 as psdToBase64, assemblePsd } from './psdBinaryHelpers';

export type BranchLayerKind = 'root' | 'patch' | 'full-frame';
type ExportFileEncoding = 'utf8' | 'base64' | 'data-url';

export interface BranchLayer {
  index: number;
  nodeId: string;
  parentId: string | null;
  name: string;
  kind: BranchLayerKind;
  left: number;
  top: number;
  width: number;
  height: number;
  sourceDataUrl: string;
  prompt: string;
  model: string;
  createdAt: number;
  sourceUri: string | null;
  modificationBox: ImageNode['modificationBox'];
  layerMask: ImageNode['layerMask'];
  references: ReferenceImageAsset[];
  finalResultDataUrl: string;
  geminiResultDataUrl: string | null;
}

export interface BranchLayerStack {
  workspaceName: string;
  activeNodeId: string;
  rootNodeId: string;
  documentWidth: number;
  documentHeight: number;
  finalCompositeDataUrl: string;
  rootCompositeDataUrl: string;
  layers: BranchLayer[];
}

export interface BranchLayerExportBundle {
  folderName: string;
  files: Array<{
    relativePath: string;
    contents: string;
    encoding: ExportFileEncoding;
  }>;
  manifest: Record<string, unknown>;
}

export interface BranchPsdExport {
  defaultFileName: string;
  width: number;
  height: number;
  layerCount: number;
  dataBase64: string;
}

function sanitizeSegment(value: string, fallback: string): string {
  const sanitized = value
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 64);

  return sanitized || fallback;
}

function buildLayerName(index: number, kind: BranchLayerKind): string {
  if (index === 0) return 'Root';
  if (kind === 'patch') return `Edit ${index}`;
  return `Snapshot ${index}`;
}

function resolveFinalResult(node: ImageNode): string {
  return node.finalResultBase64 || node.blobBase64;
}

function normalizeLayerBounds(
  node: ImageNode,
  docWidth: number,
  docHeight: number,
): Pick<BranchLayer, 'kind' | 'left' | 'top' | 'width' | 'height' | 'sourceDataUrl'> {
  const box = node.modificationBox;
  const hasPatch = !!box && !!node.geminiResultBase64;

  if (hasPatch && box) {
    const left = Math.max(0, Math.min(docWidth, Math.round(box.x)));
    const top = Math.max(0, Math.min(docHeight, Math.round(box.y)));
    const right = Math.max(left, Math.min(docWidth, Math.round(box.x + box.w)));
    const bottom = Math.max(top, Math.min(docHeight, Math.round(box.y + box.h)));
    const width = right - left;
    const height = bottom - top;

    if (width > 0 && height > 0) {
      return {
        kind: 'patch',
        left,
        top,
        width,
        height,
        sourceDataUrl: node.geminiResultBase64!,
      };
    }
  }

  return {
    kind: node.parentId ? 'full-frame' : 'root',
    left: 0,
    top: 0,
    width: docWidth,
    height: docHeight,
    sourceDataUrl: resolveFinalResult(node),
  };
}

export function buildNodeLineage(nodes: ImageNode[], activeNodeId: string | null): ImageNode[] {
  if (!activeNodeId) return [];

  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const lineage: ImageNode[] = [];
  const visited = new Set<string>();
  let current = nodeById.get(activeNodeId) || null;

  while (current && !visited.has(current.id)) {
    lineage.push(current);
    visited.add(current.id);
    current = current.parentId ? nodeById.get(current.parentId) || null : null;
  }

  return lineage.reverse();
}

async function rasterizeDataUrl(
  dataUrl: string,
  width?: number,
  height?: number,
): Promise<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  pngDataUrl: string;
}> {
  const img = await loadCachedImage(dataUrl);
  const targetWidth = Math.max(1, Math.round(width ?? img.naturalWidth));
  const targetHeight = Math.max(1, Math.round(height ?? img.naturalHeight));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable during export.');
  }

  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return {
    width: targetWidth,
    height: targetHeight,
    rgba: ctx.getImageData(0, 0, targetWidth, targetHeight).data,
    pngDataUrl: await canvasToDataUrl(canvas),
  };
}

async function rasterizeMask(
  layer: Pick<BranchLayer, 'width' | 'height' | 'layerMask'>,
): Promise<{
  width: number;
  height: number;
  grayscale: Uint8Array;
  pngDataUrl: string;
}> {
  const maskCanvas = await createMaskCanvas(layer.layerMask ?? null, layer.width, layer.height);
  const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas context unavailable during mask export.');
  }

  const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const pixels = imageData.data;
  const grayscale = new Uint8Array(maskCanvas.width * maskCanvas.height);

  for (let i = 0; i < grayscale.length; i += 1) {
    const offset = i * 4;
    const luminance = Math.round((pixels[offset] + pixels[offset + 1] + pixels[offset + 2]) / 3);
    const sourceAlpha = pixels[offset + 3] / 255;
    grayscale[i] = Math.round(luminance * sourceAlpha);
  }

  return {
    width: maskCanvas.width,
    height: maskCanvas.height,
    grayscale,
    pngDataUrl: await canvasToDataUrl(maskCanvas),
  };
}

async function createPositionedLayerPng(
  layer: BranchLayer,
  documentWidth: number,
  documentHeight: number,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = documentWidth;
  canvas.height = documentHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable during export.');
  }

  ctx.clearRect(0, 0, documentWidth, documentHeight);
  const maskedLayer = await createMaskedLayerCanvas(
    layer.sourceDataUrl,
    layer.width,
    layer.height,
    layer.layerMask ?? null,
  );
  ctx.drawImage(maskedLayer, layer.left, layer.top, layer.width, layer.height);
  return canvasToDataUrl(canvas);
}

let psdWorker: Worker | null = null;

function getPsdWorker(): Worker {
  if (!psdWorker) {
    psdWorker = new Worker(new URL('../workers/psdAssembler.worker.ts', import.meta.url), { type: 'module' });
  }
  return psdWorker;
}

async function preparePsdInput(stack: BranchLayerStack): Promise<PsdWorkerInput> {
  const layerInputs: PsdLayerInput[] = [];

  for (const layer of stack.layers) {
    const sourceRaster = await rasterizeDataUrl(layer.sourceDataUrl, layer.width, layer.height);
    const maskRaster = layer.layerMask ? await rasterizeMask(layer) : null;

    layerInputs.push({
      name: sanitizeSegment(layer.name, `Layer ${layer.index}`),
      left: layer.left,
      top: layer.top,
      width: sourceRaster.width,
      height: sourceRaster.height,
      rgba: sourceRaster.rgba.buffer as ArrayBuffer,
      maskGrayscale: maskRaster ? maskRaster.grayscale.buffer as ArrayBuffer : null,
    });
  }

  const compositeRaster = await rasterizeDataUrl(
    stack.finalCompositeDataUrl,
    stack.documentWidth,
    stack.documentHeight,
  );

  return {
    layers: layerInputs,
    compositeRgba: compositeRaster.rgba.buffer as ArrayBuffer,
    compositeWidth: compositeRaster.width,
    compositeHeight: compositeRaster.height,
    documentWidth: stack.documentWidth,
    documentHeight: stack.documentHeight,
  };
}

async function writePsdInWorker(stack: BranchLayerStack): Promise<string> {
  const input = await preparePsdInput(stack);

  try {
    const worker = getPsdWorker();
    const transferables = [
      input.compositeRgba,
      ...input.layers.map(l => l.rgba),
      ...input.layers.filter(l => l.maskGrayscale).map(l => l.maskGrayscale!),
    ];

    return new Promise<string>((resolve, reject) => {
      worker.onmessage = (event) => {
        if (event.data.error) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data.base64);
        }
      };
      worker.onerror = (err) => reject(err);
      worker.postMessage(input, transferables);
    });
  } catch {
    const psdBytes = assemblePsd(input);
    return psdToBase64(psdBytes);
  }
}

async function buildStack(nodes: ImageNode[], activeNodeId: string | null, workspaceName: string): Promise<BranchLayerStack> {
  const lineage = buildNodeLineage(nodes, activeNodeId);
  if (lineage.length === 0) {
    throw new Error('Select a node before exporting its layer stack.');
  }

  const rootNode = lineage[0];
  const activeNode = lineage[lineage.length - 1];
  const rootRaster = await rasterizeDataUrl(resolveFinalResult(rootNode));
  const documentWidth = rootRaster.width;
  const documentHeight = rootRaster.height;

  const layers = lineage.map((node, index) => {
    const bounds = normalizeLayerBounds(node, documentWidth, documentHeight);
    const references = (node.referenceSnapshots ?? []).map(reference => ({ ...reference }));

    return {
      index,
      nodeId: node.id,
      parentId: node.parentId,
      name: buildLayerName(index, bounds.kind),
      kind: bounds.kind,
      left: bounds.left,
      top: bounds.top,
      width: bounds.width,
      height: bounds.height,
      sourceDataUrl: bounds.sourceDataUrl,
      prompt: node.prompt,
      model: node.model,
      createdAt: node.createdAt,
      sourceUri: node.sourceUri ?? null,
      modificationBox: node.modificationBox ?? null,
      layerMask: node.layerMask ?? null,
      references,
      finalResultDataUrl: resolveFinalResult(node),
      geminiResultDataUrl: node.geminiResultBase64 ?? null,
    } satisfies BranchLayer;
  });

  const maskedCompositeCanvas = await renderLayerComposite(
    layers,
    documentWidth,
    documentHeight,
    {
      layerKey: layer => layer.nodeId,
    },
  );

  return {
    workspaceName,
    activeNodeId: activeNode.id,
    rootNodeId: rootNode.id,
    documentWidth,
    documentHeight,
    finalCompositeDataUrl: await canvasToDataUrl(maskedCompositeCanvas),
    rootCompositeDataUrl: resolveFinalResult(rootNode),
    layers,
  };
}

export async function buildBranchLayerStack(
  nodes: ImageNode[],
  activeNodeId: string | null,
  workspaceName = 'workspace',
): Promise<BranchLayerStack> {
  return buildStack(nodes, activeNodeId, workspaceName);
}

export async function buildLayerExportBundle(
  nodes: ImageNode[],
  activeNodeId: string | null,
  workspaceName = 'workspace',
): Promise<BranchLayerExportBundle> {
  const stack = await buildStack(nodes, activeNodeId, workspaceName);
  const folderStem = sanitizeSegment(`${workspaceName}-${stack.activeNodeId}`, 'layer-export');
  const files: BranchLayerExportBundle['files'] = [];

  files.push({
    relativePath: 'root/root.png',
    contents: stack.rootCompositeDataUrl,
    encoding: 'data-url',
  });
  files.push({
    relativePath: 'final/final.png',
    contents: stack.finalCompositeDataUrl,
    encoding: 'data-url',
  });

  const manifestLayers: Array<Record<string, unknown>> = [];

  for (const layer of stack.layers) {
    const layerPrefix = `${String(layer.index).padStart(3, '0')}-${sanitizeSegment(layer.name.toLowerCase(), `layer-${layer.index}`)}`;
    const positionedLayerDataUrl = await createPositionedLayerPng(
      layer,
      stack.documentWidth,
      stack.documentHeight,
    );
    const layerFile = `layers/${layerPrefix}.png`;
    const maskFile = layer.layerMask ? `masks/${layerPrefix}.png` : null;
    const finalFile = `nodes/${layerPrefix}/final.png`;
    const geminiFile = layer.geminiResultDataUrl ? `nodes/${layerPrefix}/gemini.png` : null;
    const normalizedMask = layer.layerMask ? await rasterizeMask(layer) : null;

    files.push({
      relativePath: layerFile,
      contents: positionedLayerDataUrl,
      encoding: 'data-url',
    });
    files.push({
      relativePath: finalFile,
      contents: layer.finalResultDataUrl,
      encoding: 'data-url',
    });

    if (maskFile && layer.layerMask) {
      files.push({
        relativePath: maskFile,
        contents: normalizedMask?.pngDataUrl || layer.layerMask.dataUrl,
        encoding: 'data-url',
      });
    }

    if (geminiFile && layer.geminiResultDataUrl) {
      files.push({
        relativePath: geminiFile,
        contents: layer.geminiResultDataUrl,
        encoding: 'data-url',
      });
    }

    manifestLayers.push({
      index: layer.index,
      nodeId: layer.nodeId,
      parentId: layer.parentId,
      name: layer.name,
      kind: layer.kind,
      prompt: layer.prompt,
      model: layer.model,
      createdAt: layer.createdAt,
      sourceUri: layer.sourceUri,
      position: {
        left: layer.left,
        top: layer.top,
        width: layer.width,
        height: layer.height,
      },
      modificationBox: layer.modificationBox ?? null,
      references: layer.references.map(reference => ({
        id: reference.id,
        kind: reference.kind,
        sourceNodeId: reference.sourceNodeId,
        sourceUri: reference.sourceUri,
      })),
      mask: layer.layerMask ? {
        width: normalizedMask?.width ?? layer.layerMask.width,
        height: normalizedMask?.height ?? layer.layerMask.height,
        updatedAt: layer.layerMask.updatedAt,
        file: maskFile,
      } : null,
      files: {
        layer: layerFile,
        mask: maskFile,
        final: finalFile,
        gemini: geminiFile,
      },
    });
  }

  const manifest = {
    version: 1,
    workspaceName: stack.workspaceName,
    exportedAt: new Date().toISOString(),
    activeNodeId: stack.activeNodeId,
    rootNodeId: stack.rootNodeId,
    document: {
      width: stack.documentWidth,
      height: stack.documentHeight,
      rootFile: 'root/root.png',
      finalFile: 'final/final.png',
    },
    layers: manifestLayers,
  };

  files.push({
    relativePath: 'manifest.json',
    contents: JSON.stringify(manifest, null, 2),
    encoding: 'utf8',
  });

  return {
    folderName: `${folderStem}-layers`,
    files,
    manifest,
  };
}

export async function buildBranchPsdExport(
  nodes: ImageNode[],
  activeNodeId: string | null,
  workspaceName = 'workspace',
): Promise<BranchPsdExport> {
  const stack = await buildStack(nodes, activeNodeId, workspaceName);
  const dataBase64 = await writePsdInWorker(stack);

  return {
    defaultFileName: `${sanitizeSegment(`${workspaceName}-${stack.activeNodeId}`, 'layer-export')}.psd`,
    width: stack.documentWidth,
    height: stack.documentHeight,
    layerCount: stack.layers.length,
    dataBase64,
  };
}

function triggerDownload(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function saveLayerExportBundle(bundle: BranchLayerExportBundle): Promise<string> {
  const outputPath = await window.ipcRenderer?.invoke('desktop:save-directory-files', {
    title: 'Export Layer Package',
    folderName: bundle.folderName,
    files: bundle.files,
  });

  if (!outputPath) {
    throw new Error('Layer export cancelled.');
  }

  return outputPath as string;
}

export async function saveBranchPsdExport(psd: BranchPsdExport): Promise<string> {
  const savedPath = await window.ipcRenderer?.invoke('desktop:save-file', {
    title: 'Export Layered PSD',
    defaultPath: psd.defaultFileName,
    filters: [{ name: 'Photoshop Document', extensions: ['psd'] }],
    contents: psd.dataBase64,
    encoding: 'base64',
  });

  if (savedPath) {
    return savedPath as string;
  }

  const binary = atob(psd.dataBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  triggerDownload(psd.defaultFileName, new Blob([bytes], { type: 'image/vnd.adobe.photoshop' }));
  return psd.defaultFileName;
}
