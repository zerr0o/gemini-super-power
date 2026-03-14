import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { get, set } from 'idb-keyval';

export interface ImageNode {
  id: string;
  parentId: string | null;
  blobBase64: string;
  prompt: string;
  model: string;
  createdAt: number;
}

export interface Workspace {
  id: string;
  name: string;
  createdAt: number;
  nodes: ImageNode[];
  activeNodeId: string | null;
  referenceImages: string[];
}

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

  async function saveToIdb() {
    try {
      const rawData = JSON.parse(JSON.stringify(workspaces.value));
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
        workspaces.value = savedWorkspaces;
        activeWorkspaceId.value = savedWorkspaces[0].id;
      } else {
        // 2. Migration Layer: Check if legacy flat array exists
        const legacyNodes = await get<ImageNode[]>('boldbrush_history');
        if (legacyNodes && legacyNodes.length > 0) {
           const migratedWorkspace: Workspace = {
             id: 'legacy-' + Date.now().toString(),
             name: 'Legacy Project',
             createdAt: Date.now(),
             nodes: legacyNodes,
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
    
    ws.nodes.push(node);
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

  function addReferenceImage(base64: string) {
    if (!activeWorkspace.value) return;
    if (activeWorkspace.value.referenceImages.length < 14) {
      activeWorkspace.value.referenceImages.push(base64);
      saveToIdb();
    }
  }

  function removeReferenceImage(index: number) {
    if (!activeWorkspace.value) return;
    activeWorkspace.value.referenceImages.splice(index, 1);
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
    removeReferenceImage 
  };
});
