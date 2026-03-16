import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { get, set } from 'idb-keyval';
import { isBlobRef, storeBlob, resolveBlob, trackExistingRef } from '../services/blobStore';

export type ReferenceImageKind = 'upload' | 'crop' | 'implicit-node';

export interface ReferenceImageAsset {
  id: string;
  dataUrl: string;
  sourceUri: string | null;
  sourceNodeId: string | null;
  kind: ReferenceImageKind;
}

export interface ModificationBox {
  x: number;
  y: number;
  w: number;
  h: number;
  originalWidth: number;
  originalHeight: number;
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface LayerMaskPayload {
  dataUrl: string;
  width: number;
  height: number;
  updatedAt: number;
}

export interface ImageNode {
  id: string;
  parentId: string | null;
  blobBase64: string;
  prompt: string;
  model: string;
  createdAt: number;
  sourceUri?: string | null;
  modificationBox?: ModificationBox | null;
  referenceSnapshots?: ReferenceImageAsset[];
  geminiResultBase64?: string | null;
  generatedImageSize?: ImageDimensions | null;
  finalImageSize?: ImageDimensions | null;
  layerMask?: LayerMaskPayload | null;
  finalResultBase64?: string;
  finalResultThumbnailBase64?: string | null;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  nodes: ImageNode[];
  activeNodeId: string | null;
  referenceImages: ReferenceImageAsset[];
}

type ReferenceImageInput = string | (Partial<ReferenceImageAsset> & Pick<ReferenceImageAsset, 'dataUrl'>);
type LayerMaskInput = Partial<LayerMaskPayload> & Pick<LayerMaskPayload, 'dataUrl' | 'width' | 'height'>;

export const useAppStore = defineStore('app', () => {
  const workspaces = ref<Workspace[]>([]);
  const activeWorkspaceId = ref<string | null>(null);
  const isHydrated = ref(false);

  // Settings
  const apiKey = ref(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  function setApiKey(key: string) {
    apiKey.value = key;
    localStorage.setItem('gemini_api_key', key);
  }

  // Active Workspace Computed Accessors
  const activeWorkspace = computed(() => workspaces.value.find(w => w.id === activeWorkspaceId.value) || null);
  const nodes = computed(() => activeWorkspace.value?.nodes || []);
  const activeNodeId = computed(() => activeWorkspace.value?.activeNodeId || null);
  const referenceImages = computed(() => activeWorkspace.value?.referenceImages || []);

  function createReferenceImageId() {
    return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function normalizeReferenceImage(reference: ReferenceImageInput): ReferenceImageAsset {
    if (typeof reference === 'string') {
      return {
        id: createReferenceImageId(),
        dataUrl: reference,
        sourceUri: null,
        sourceNodeId: null,
        kind: 'upload',
      };
    }

    return {
      id: reference.id || createReferenceImageId(),
      dataUrl: reference.dataUrl || '',
      sourceUri: reference.sourceUri ?? null,
      sourceNodeId: reference.sourceNodeId ?? null,
      kind: reference.kind ?? 'upload',
    };
  }

  function cloneModificationBox(box: ModificationBox | null | undefined): ModificationBox | null {
    if (!box) return null;

    return {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      originalWidth: box.originalWidth,
      originalHeight: box.originalHeight,
    };
  }

  function cloneImageDimensions(dimensions: ImageDimensions | null | undefined): ImageDimensions | null {
    if (!dimensions) return null;

    return {
      width: dimensions.width,
      height: dimensions.height,
    };
  }

  function normalizeLayerMask(mask: LayerMaskInput | LayerMaskPayload | null | undefined): LayerMaskPayload | null {
    if (!mask || !mask.dataUrl) return null;

    return {
      dataUrl: mask.dataUrl,
      width: Math.max(1, Math.round(mask.width || 1)),
      height: Math.max(1, Math.round(mask.height || 1)),
      updatedAt: mask.updatedAt ?? Date.now(),
    };
  }


  function normalizeImageNode(node: ImageNode): ImageNode {
    return {
      ...node,
      sourceUri: node.sourceUri ?? null,
      modificationBox: cloneModificationBox(node.modificationBox),
      referenceSnapshots: (node.referenceSnapshots ?? []).map(reference => normalizeReferenceImage(reference)),
      geminiResultBase64: node.geminiResultBase64 ?? null,
      generatedImageSize: cloneImageDimensions(node.generatedImageSize),
      finalImageSize: cloneImageDimensions(node.finalImageSize),
      layerMask: normalizeLayerMask(node.layerMask),
      finalResultBase64: node.finalResultBase64 ?? node.blobBase64,
      finalResultThumbnailBase64: node.finalResultThumbnailBase64 ?? null,
    };
  }

  function normalizeWorkspace(workspace: Workspace): Workspace {
    const rawReferenceImages = (workspace.referenceImages ?? []) as ReferenceImageInput[];

    return {
      ...workspace,
      activeNodeId: workspace.activeNodeId ?? null,
      nodes: (workspace.nodes ?? []).map(node => normalizeImageNode(node)),
      referenceImages: rawReferenceImages.map(reference => normalizeReferenceImage(reference)),
    };
  }

  function serializeReferenceImage(reference: ReferenceImageAsset): ReferenceImageAsset {
    return {
      id: reference.id,
      dataUrl: reference.kind === 'implicit-node' && reference.sourceNodeId ? '' : reference.dataUrl,
      sourceUri: reference.sourceUri ?? null,
      sourceNodeId: reference.sourceNodeId ?? null,
      kind: reference.kind,
    };
  }

  let _saveTimer: ReturnType<typeof setTimeout> | null = null;
  let _saveInFlight = false;
  let _savePending = false;

  async function serializeImageNodeWithBlobs(node: ImageNode): Promise<ImageNode> {
    const nodeId = node.id;
    const blobBase64 = await storeBlob(`${nodeId}:blob`, node.blobBase64);

    const geminiResultBase64 = node.geminiResultBase64
      ? await storeBlob(`${nodeId}:gemini`, node.geminiResultBase64)
      : null;

    const finalResultBase64 = node.finalResultBase64 && node.finalResultBase64 !== node.blobBase64
      ? await storeBlob(`${nodeId}:final`, node.finalResultBase64)
      : undefined;

    const fullResult = node.finalResultBase64 ?? node.blobBase64;
    const thumbnail = node.finalResultThumbnailBase64 && node.finalResultThumbnailBase64 !== fullResult
      ? node.finalResultThumbnailBase64
      : null;

    const layerMask = node.layerMask ? {
      dataUrl: node.layerMask.dataUrl && node.layerMask.dataUrl.length > 50000
        ? await storeBlob(`${nodeId}:mask`, node.layerMask.dataUrl)
        : node.layerMask.dataUrl,
      width: node.layerMask.width,
      height: node.layerMask.height,
      updatedAt: node.layerMask.updatedAt,
    } : null;

    const referenceSnapshots = await Promise.all(
      (node.referenceSnapshots ?? []).map(async (ref, i) => {
        if (ref.kind === 'implicit-node' && ref.sourceNodeId) {
          return { ...ref, dataUrl: '' };
        }
        if (ref.dataUrl && ref.dataUrl.length > 50000) {
          return { ...ref, dataUrl: await storeBlob(`${nodeId}:ref:${i}`, ref.dataUrl) };
        }
        return { ...ref };
      })
    );

    return {
      id: node.id,
      parentId: node.parentId ?? null,
      blobBase64,
      prompt: node.prompt,
      model: node.model,
      createdAt: node.createdAt,
      sourceUri: node.sourceUri ?? null,
      modificationBox: cloneModificationBox(node.modificationBox),
      referenceSnapshots,
      geminiResultBase64,
      generatedImageSize: cloneImageDimensions(node.generatedImageSize),
      finalImageSize: cloneImageDimensions(node.finalImageSize),
      layerMask,
      finalResultBase64,
      finalResultThumbnailBase64: thumbnail,
    };
  }

  async function serializeWorkspaceWithBlobs(workspace: Workspace): Promise<Workspace> {
    const slimNodes = await Promise.all(
      workspace.nodes.map(node => serializeImageNodeWithBlobs(node))
    );

    const slimRefs = await Promise.all(
      workspace.referenceImages.map(async (ref, i) => {
        const serialized = serializeReferenceImage(ref);
        if (serialized.dataUrl && serialized.dataUrl.length > 50000) {
          return { ...serialized, dataUrl: await storeBlob(`ws:${workspace.id}:ref:${i}`, serialized.dataUrl) };
        }
        return serialized;
      })
    );

    return {
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
      activeNodeId: workspace.activeNodeId ?? null,
      nodes: slimNodes,
      referenceImages: slimRefs,
    };
  }

  async function executeSave() {
    if (_saveInFlight) {
      _savePending = true;
      return;
    }
    _saveInFlight = true;
    try {
      const rawData = await Promise.all(
        workspaces.value.map(workspace => serializeWorkspaceWithBlobs(workspace))
      );
      await set('boldbrush_workspaces', rawData);
    } catch (e) {
      console.error("Failed to save workspaces to idb:", e);
    } finally {
      _saveInFlight = false;
      if (_savePending) {
        _savePending = false;
        void executeSave();
      }
    }
  }

  function saveToIdb() {
    if (_saveTimer !== null) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
      _saveTimer = null;
      void executeSave();
    }, 500);
  }

  async function flushSaveToIdb() {
    if (_saveTimer !== null) {
      clearTimeout(_saveTimer);
      _saveTimer = null;
    }
    await executeSave();
  }

  async function resolveNodeBlobs(node: ImageNode): Promise<ImageNode> {
    const resolved: ImageNode = { ...node };

    if (isBlobRef(resolved.blobBase64)) {
      trackExistingRef(`${node.id}:blob`, resolved.blobBase64);
      resolved.blobBase64 = await resolveBlob(resolved.blobBase64);
    }

    if (isBlobRef(resolved.geminiResultBase64)) {
      trackExistingRef(`${node.id}:gemini`, resolved.geminiResultBase64!);
      resolved.geminiResultBase64 = await resolveBlob(resolved.geminiResultBase64!);
    }

    if (resolved.finalResultBase64 && isBlobRef(resolved.finalResultBase64)) {
      trackExistingRef(`${node.id}:final`, resolved.finalResultBase64);
      resolved.finalResultBase64 = await resolveBlob(resolved.finalResultBase64);
    }

    if (resolved.layerMask?.dataUrl && isBlobRef(resolved.layerMask.dataUrl)) {
      trackExistingRef(`${node.id}:mask`, resolved.layerMask.dataUrl);
      resolved.layerMask = {
        ...resolved.layerMask,
        dataUrl: await resolveBlob(resolved.layerMask.dataUrl),
      };
    }

    if (resolved.referenceSnapshots?.length) {
      resolved.referenceSnapshots = await Promise.all(
        resolved.referenceSnapshots.map(async (ref, i) => {
          if (isBlobRef(ref.dataUrl)) {
            trackExistingRef(`${node.id}:ref:${i}`, ref.dataUrl);
            return { ...ref, dataUrl: await resolveBlob(ref.dataUrl) };
          }
          return ref;
        })
      );
    }

    return resolved;
  }

  async function resolveWorkspaceBlobs(workspace: Workspace): Promise<Workspace> {
    const resolvedNodes = await Promise.all(
      workspace.nodes.map(node => resolveNodeBlobs(node))
    );

    const resolvedRefs = await Promise.all(
      workspace.referenceImages.map(async (ref, i) => {
        if (isBlobRef(ref.dataUrl)) {
          trackExistingRef(`ws:${workspace.id}:ref:${i}`, ref.dataUrl);
          return { ...ref, dataUrl: await resolveBlob(ref.dataUrl) };
        }
        return ref;
      })
    );

    return {
      ...workspace,
      nodes: resolvedNodes,
      referenceImages: resolvedRefs,
    };
  }

  // Hydration & Migration Logic
  async function hydrate() {
    try {
      // 1. Try to load workspace data
      let savedWorkspaces = await get<Workspace[]>('boldbrush_workspaces');

      if (savedWorkspaces && savedWorkspaces.length > 0) {
        // Resolve any blob refs to data URLs for runtime use
        const resolved = await Promise.all(
          savedWorkspaces.map(ws => resolveWorkspaceBlobs(ws))
        );
        workspaces.value = resolved.map(workspace => normalizeWorkspace(workspace));
        activeWorkspaceId.value = workspaces.value[0].id;
      } else {
        // 2. Migration Layer: Check if legacy flat array exists
        const legacyNodes = await get<ImageNode[]>('boldbrush_history');
        if (legacyNodes && legacyNodes.length > 0) {
           const migratedWorkspace: Workspace = {
             id: 'legacy-' + Date.now().toString(),
             name: 'Legacy Project',
             createdAt: Date.now(),
             nodes: legacyNodes.map(node => normalizeImageNode(node)),
             activeNodeId: legacyNodes[legacyNodes.length - 1].id,
             referenceImages: []
            };
            workspaces.value = [migratedWorkspace];
            activeWorkspaceId.value = migratedWorkspace.id;
           await flushSaveToIdb();
        } else {
           // 3. Complete new install: Create default empty workspace
           createWorkspace('Session 001');
        }
      }
    } catch(e) {
      console.error('Hydration failed:', e);
    } finally {
      isHydrated.value = true;
    }
  }

  // Initialize
  hydrate();

  // Workspace Actions
  function createWorkspace(name: string) {
    const ws: Workspace = {
      id: Date.now().toString(),
      name: name,
      createdAt: Date.now(),
      nodes: [],
      activeNodeId: null,
      referenceImages: []
    };
    workspaces.value.unshift(ws); // put new at top
    activeWorkspaceId.value = ws.id;
    saveToIdb();
  }

  function setActiveWorkspace(id: string) {
    if (workspaces.value.some(w => w.id === id)) {
      activeWorkspaceId.value = id;
    }
  }

  function deleteWorkspace(id: string) {
    workspaces.value = workspaces.value.filter(w => w.id !== id);
    if (workspaces.value.length === 0) {
      createWorkspace('Session 002');
    } else if (activeWorkspaceId.value === id) {
      activeWorkspaceId.value = workspaces.value[0].id;
    }
    saveToIdb();
  }

  function renameWorkspace(id: string, newName: string) {
    const ws = workspaces.value.find(w => w.id === id);
    if (ws) {
       ws.name = newName;
       saveToIdb();
    }
  }

  // Node Actions
  function addNode(node: ImageNode, targetWorkspaceId?: string) {
    let ws = activeWorkspace.value;
    if (targetWorkspaceId) {
       ws = workspaces.value.find(w => w.id === targetWorkspaceId) || null;
    }
    if (!ws) return;
    
    ws.nodes.push(normalizeImageNode(node));
    ws.activeNodeId = node.id;
    saveToIdb();
  }

  function setActiveNode(id: string) {
    if (!activeWorkspace.value) return;
    activeWorkspace.value.activeNodeId = id;
    saveToIdb();
  }

  function setNodeLayerMask(nodeId: string, mask: LayerMaskInput | null) {
    if (!activeWorkspace.value) return;
    const node = activeWorkspace.value.nodes.find(entry => entry.id === nodeId);
    if (!node) return;

    node.layerMask = normalizeLayerMask(mask);
    saveToIdb();
  }
  
  function deleteNodeAndChildren(nodeId: string) {
    if (!activeWorkspace.value) return;
    
    const nodesToDelete = new Set<string>();
    const queue = [nodeId];
    
    while(queue.length > 0) {
      const current = queue.shift()!;
      nodesToDelete.add(current);
      const children = activeWorkspace.value.nodes.filter(n => n.parentId === current);
      queue.push(...children.map(c => c.id));
    }
    
    activeWorkspace.value.nodes = activeWorkspace.value.nodes.filter(n => !nodesToDelete.has(n.id));
    
    // Reset active node if it got swept up in the deletion
    if (activeWorkspace.value.activeNodeId && nodesToDelete.has(activeWorkspace.value.activeNodeId)) {
        // Fallback to the latest remaining node, if any
        if (activeWorkspace.value.nodes.length > 0) {
           activeWorkspace.value.activeNodeId = activeWorkspace.value.nodes[activeWorkspace.value.nodes.length - 1].id;
        } else {
           activeWorkspace.value.activeNodeId = null;
        }
    }
    
    saveToIdb();
  }

  function addReferenceImage(reference: ReferenceImageInput) {
    if (!activeWorkspace.value) return;
    if (activeWorkspace.value.referenceImages.length < 14) {
      activeWorkspace.value.referenceImages.push(normalizeReferenceImage(reference));
      saveToIdb();
    }
  }

  function prependReferenceImage(reference: ReferenceImageInput) {
    if (!activeWorkspace.value) return;
    activeWorkspace.value.referenceImages.unshift(normalizeReferenceImage(reference));
    if (activeWorkspace.value.referenceImages.length > 14) {
      activeWorkspace.value.referenceImages.splice(14);
    }
    saveToIdb();
  }

  function setPrimaryReferenceImage(reference: ReferenceImageInput) {
    if (!activeWorkspace.value) return;

    const normalizedReference = normalizeReferenceImage(reference);
    if (activeWorkspace.value.referenceImages.length === 0) {
      activeWorkspace.value.referenceImages.unshift(normalizedReference);
    } else {
      activeWorkspace.value.referenceImages[0] = normalizedReference;
    }

    saveToIdb();
  }

  function removeReferenceImage(index: number) {
    if (!activeWorkspace.value) return;
    activeWorkspace.value.referenceImages.splice(index, 1);
    saveToIdb();
  }

  function clearReferenceImages() {
    if (!activeWorkspace.value) return;
    activeWorkspace.value.referenceImages = [];
    saveToIdb();
  }

  return { 
    workspaces, 
    activeWorkspaceId, 
    activeWorkspace,
    nodes, 
    activeNodeId, 
    referenceImages, 
    apiKey, 
    isHydrated, 
    setApiKey,
    createWorkspace,
    setActiveWorkspace,
    deleteWorkspace,
    renameWorkspace,
    addNode, 
    setActiveNode, 
    setNodeLayerMask,
    deleteNodeAndChildren,
    addReferenceImage,
    prependReferenceImage,
    setPrimaryReferenceImage,
    removeReferenceImage,
    clearReferenceImages 
  };
});
