import { createStore, get, set, del, keys } from 'idb-keyval';

const blobIdb = createStore('boldbrush-blobs', 'blobs');
const BLOB_PREFIX = '$blob:';

const storedRefs = new Map<string, string>();

export function isBlobRef(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(BLOB_PREFIX);
}

export async function storeBlob(trackKey: string, dataUrl: string): Promise<string> {
  const existing = storedRefs.get(trackKey);
  if (existing) return existing;

  const id = crypto.randomUUID();
  const resp = await fetch(dataUrl);
  const blob = await resp.blob();
  await set(id, blob, blobIdb);

  const ref = `${BLOB_PREFIX}${id}`;
  storedRefs.set(trackKey, ref);
  return ref;
}

export async function resolveBlob(value: string): Promise<string> {
  if (!isBlobRef(value)) return value;
  const id = value.slice(BLOB_PREFIX.length);
  const blob = await get<Blob>(id, blobIdb);
  if (!blob) throw new Error(`Blob not found: ${id}`);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function resolveBlobSafe(value: string | null | undefined): Promise<string> {
  if (!value) return '';
  if (!isBlobRef(value)) return value;
  try {
    return await resolveBlob(value);
  } catch {
    return '';
  }
}

export function trackExistingRef(trackKey: string, ref: string) {
  if (isBlobRef(ref)) {
    storedRefs.set(trackKey, ref);
  }
}

export async function deleteBlobRefs(refs: string[]): Promise<void> {
  const ids = refs.filter(r => isBlobRef(r)).map(r => r.slice(BLOB_PREFIX.length));
  await Promise.all(ids.map(id => del(id, blobIdb)));
  for (const [key, val] of storedRefs) {
    if (refs.includes(val)) storedRefs.delete(key);
  }
}

export async function cleanupOrphanBlobs(validRefs: Set<string>): Promise<void> {
  const allKeys = await keys(blobIdb) as string[];
  const orphans = allKeys.filter(key => !validRefs.has(`${BLOB_PREFIX}${key}`));
  await Promise.all(orphans.map(key => del(key, blobIdb)));
}
