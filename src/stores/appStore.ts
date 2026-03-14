import { defineStore } from 'pinia';
import { ref } from 'vue';
import { get, set } from 'idb-keyval';

export interface ImageNode {
  id: string;
  parentId: string | null;
  blobBase64: string;
  prompt: string;
  model: string;
  createdAt: number;
}

export const useAppStore = defineStore('app', () => {
  const nodes = ref<ImageNode[]>([]);
  const activeNodeId = ref<string | null>(null);
  const referenceImages = ref<string[]>([]); // Base64 references for generation
  const isHydrated = ref(false);

  // Hydrate from IndexedDB on startup
  get<ImageNode[]>('boldbrush_history').then((saved) => {
    if (saved && saved.length > 0) {
      nodes.value = saved;
      // Re-activate the last created node
      activeNodeId.value = saved[saved.length - 1].id;
    }
    isHydrated.value = true;
  });

  async function saveToIdb() {
    try {
      // Strip Vue proxies by deep serializing to JSON first
      const rawNodes = JSON.parse(JSON.stringify(nodes.value));
      await set('boldbrush_history', rawNodes);
    } catch (e) {
      console.error("Failed to save to idb:", e);
    }
  }

  function addNode(node: ImageNode) {
    nodes.value.push(node);
    activeNodeId.value = node.id;
    saveToIdb();
  }

  function setActiveNode(id: string) {
    activeNodeId.value = id;
  }

  function addReferenceImage(base64: string) {
    if (referenceImages.value.length < 14) {
      referenceImages.value.push(base64);
    }
  }

  function removeReferenceImage(index: number) {
    referenceImages.value.splice(index, 1);
  }

  // Settings
  const apiKey = ref(localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || '');
  function setApiKey(key: string) {
    apiKey.value = key;
    localStorage.setItem('gemini_api_key', key);
  }

  return { nodes, activeNodeId, referenceImages, apiKey, isHydrated, addNode, setActiveNode, addReferenceImage, removeReferenceImage, setApiKey };
});
