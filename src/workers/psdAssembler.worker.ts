import { assemblePsd, toBase64 } from '../services/psdBinaryHelpers';
import type { PsdWorkerInput } from '../services/psdBinaryHelpers';

self.onmessage = (event: MessageEvent<PsdWorkerInput>) => {
  try {
    const psdBytes = assemblePsd(event.data);
    const base64 = toBase64(psdBytes);
    (self as unknown as Worker).postMessage({ base64, byteLength: psdBytes.byteLength });
  } catch (error) {
    (self as unknown as Worker).postMessage({ error: error instanceof Error ? error.message : 'PSD assembly failed' });
  }
};
