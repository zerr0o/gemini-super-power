import type { ImageNode, ReferenceImageAsset } from '../stores/appStore';
import { createMaskedLayerCanvas, loadCachedImage, renderLayerComposite } from './layerRendering';

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
    pngDataUrl: canvas.toDataURL('image/png'),
  };
}

function rasterizeCanvas(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable during export.');
  }

  return {
    width: canvas.width,
    height: canvas.height,
    rgba: ctx.getImageData(0, 0, canvas.width, canvas.height).data,
    pngDataUrl: canvas.toDataURL('image/png'),
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
  return canvas.toDataURL('image/png');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function fromAscii(value: string): Uint8Array {
  return Uint8Array.from(
    Array.from(value).map(char => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126 ? code : 63;
    }),
  );
}

function uint8(value: number): Uint8Array {
  return new Uint8Array([value & 0xff]);
}

function uint16be(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, false);
  return out;
}

function int16be(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setInt16(0, value, false);
  return out;
}

function uint32be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

function int32be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, value, false);
  return out;
}

function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }

  return out;
}

function pascalString(value: string, padMultiple = 4): Uint8Array {
  const bytes = fromAscii(value).subarray(0, 255);
  const rawLength = 1 + bytes.length;
  const paddedLength = Math.ceil(rawLength / padMultiple) * padMultiple;
  const out = new Uint8Array(paddedLength);
  out[0] = bytes.length;
  out.set(bytes, 1);
  return out;
}

function splitChannels(rgba: Uint8ClampedArray, pixelCount: number) {
  const red = new Uint8Array(pixelCount);
  const green = new Uint8Array(pixelCount);
  const blue = new Uint8Array(pixelCount);
  const alpha = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i += 1) {
    const offset = i * 4;
    red[i] = rgba[offset];
    green[i] = rgba[offset + 1];
    blue[i] = rgba[offset + 2];
    alpha[i] = rgba[offset + 3];
  }

  return { red, green, blue, alpha };
}

function wrapRawChannelData(channelBytes: Uint8Array): Uint8Array {
  return concatBytes(uint16be(0), channelBytes);
}

async function writePsd(stack: BranchLayerStack): Promise<Uint8Array> {
  const layerRecords: Uint8Array[] = [];
  const layerChannelPayloads: Uint8Array[] = [];

  for (const layer of stack.layers) {
    const maskedLayerCanvas = await createMaskedLayerCanvas(
      layer.sourceDataUrl,
      layer.width,
      layer.height,
      layer.layerMask ?? null,
    );
    const raster = rasterizeCanvas(maskedLayerCanvas);
    const channels = splitChannels(raster.rgba, raster.width * raster.height);
    const wrappedChannels = [
      { id: 0, bytes: wrapRawChannelData(channels.red) },
      { id: 1, bytes: wrapRawChannelData(channels.green) },
      { id: 2, bytes: wrapRawChannelData(channels.blue) },
      { id: -1, bytes: wrapRawChannelData(channels.alpha) },
    ];

    const layerName = sanitizeSegment(layer.name, `Layer ${layer.index}`);
    const extraData = concatBytes(
      uint32be(0),
      uint32be(0),
      pascalString(layerName),
    );

    const record = concatBytes(
      int32be(layer.top),
      int32be(layer.left),
      int32be(layer.top + layer.height),
      int32be(layer.left + layer.width),
      uint16be(wrappedChannels.length),
      ...wrappedChannels.flatMap(channel => [int16be(channel.id), uint32be(channel.bytes.length)]),
      fromAscii('8BIM'),
      fromAscii('norm'),
      uint8(255),
      uint8(0),
      uint8(0),
      uint8(0),
      uint32be(extraData.length),
      extraData,
    );

    layerRecords.push(record);
    layerChannelPayloads.push(...wrappedChannels.map(channel => channel.bytes));
  }

  const layerInfoData = concatBytes(
    int16be(stack.layers.length),
    ...layerRecords,
    ...layerChannelPayloads,
  );

  const layerInfoSection = concatBytes(
    uint32be(layerInfoData.length),
    layerInfoData,
  );

  const layerAndMaskSectionPayload = concatBytes(
    layerInfoSection,
    uint32be(0),
  );

  const layerAndMaskSection = concatBytes(
    uint32be(layerAndMaskSectionPayload.length),
    layerAndMaskSectionPayload,
  );

  const compositeRaster = await rasterizeDataUrl(
    stack.finalCompositeDataUrl,
    stack.documentWidth,
    stack.documentHeight,
  );
  const compositeChannels = splitChannels(
    compositeRaster.rgba,
    compositeRaster.width * compositeRaster.height,
  );

  const compositeImageData = concatBytes(
    uint16be(0),
    compositeChannels.red,
    compositeChannels.green,
    compositeChannels.blue,
    compositeChannels.alpha,
  );

  const header = concatBytes(
    fromAscii('8BPS'),
    uint16be(1),
    new Uint8Array(6),
    uint16be(4),
    uint32be(stack.documentHeight),
    uint32be(stack.documentWidth),
    uint16be(8),
    uint16be(3),
  );

  return concatBytes(
    header,
    uint32be(0),
    uint32be(0),
    layerAndMaskSection,
    compositeImageData,
  );
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
    finalCompositeDataUrl: maskedCompositeCanvas.toDataURL('image/png'),
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
        contents: layer.layerMask.dataUrl,
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
        width: layer.layerMask.width,
        height: layer.layerMask.height,
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
  const psdBytes = await writePsd(stack);

  return {
    defaultFileName: `${sanitizeSegment(`${workspaceName}-${stack.activeNodeId}`, 'layer-export')}.psd`,
    width: stack.documentWidth,
    height: stack.documentHeight,
    layerCount: stack.layers.length,
    dataBase64: toBase64(psdBytes),
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
