import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { get, set } from 'idb-keyval';

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

  function normalizeImageNode(node: ImageNode): ImageNode {
    return {
      ...node,
      sourceUri: node.sourceUri ?? null,
      modificationBox: cloneModificationBox(node.modificationBox),
      referenceSnapshots: (node.referenceSnapshots ?? []).map(reference => normalizeReferenceImage(reference)),
      geminiResultBase64: node.geminiResultBase64 ?? null,
      generatedImageSize: cloneImageDimensions(node.generatedImageSize),
      finalImageSize: cloneImageDimensions(node.finalImageSize),
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

  function serializeImageNode(node: ImageNode): ImageNode {
    const fullResult = node.finalResultBase64 ?? node.blobBase64;
    const thumbnail = node.finalResultThumbnailBase64 && node.finalResultThumbnailBase64 !== fullResult
      ? node.finalResultThumbnailBase64
      : null;

    return {
      id: node.id,
      parentId: node.parentId ?? null,
      blobBase64: node.blobBase64,
      prompt: node.prompt,
      model: node.model,
      createdAt: node.createdAt,
      sourceUri: node.sourceUri ?? null,
      modificationBox: cloneModificationBox(node.modificationBox),
      referenceSnapshots: (node.referenceSnapshots ?? []).map(reference => serializeReferenceImage(reference)),
      geminiResultBase64: node.geminiResultBase64 ?? null,
      generatedImageSize: cloneImageDimensions(node.generatedImageSize),
      finalImageSize: cloneImageDimensions(node.finalImageSize),
      finalResultBase64: node.finalResultBase64 && node.finalResultBase64 !== node.blobBase64 ? node.finalResultBase64 : undefined,
      finalResultThumbnailBase64: thumbnail,
    };
  }

  function serializeWorkspace(workspace: Workspace): Workspace {
    return {
      id: workspace.id,
      name: workspace.name,
      createdAt: workspace.createdAt,
      activeNodeId: workspace.activeNodeId ?? null,
      nodes: workspace.nodes.map(node => serializeImageNode(node)),
      referenceImages: workspace.referenceImages.map(reference => serializeReferenceImage(reference)),
    };
  }

  async function saveToIdb() {
    try {
      const rawData = workspaces.value.map(workspace => serializeWorkspace(workspace));
      await set('boldbrush_workspaces', rawData);
    } catch (e) {
      console.error("Failed to save workspaces to idb:", e);
    }
  }

  // Hydration & Migration Logic
  async function hydrate() {
    try {
      // 1. Try to load new workspace architecture
      let savedWorkspaces = await get<Workspace[]>('boldbrush_workspaces');
      
      if (savedWorkspaces && savedWorkspaces.length > 0) {
        workspaces.value = savedWorkspaces.map(workspace => normalizeWorkspace(workspace));
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
           await saveToIdb(); 
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
    deleteNodeAndChildren,
    addReferenceImage,
    prependReferenceImage,
    setPrimaryReferenceImage,
    removeReferenceImage,
    clearReferenceImages 
  };
});
