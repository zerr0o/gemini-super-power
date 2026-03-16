export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

export function fromAscii(value: string): Uint8Array {
  return Uint8Array.from(
    Array.from(value).map(char => {
      const code = char.charCodeAt(0);
      return code >= 32 && code <= 126 ? code : 63;
    }),
  );
}

export function uint8(value: number): Uint8Array {
  return new Uint8Array([value & 0xff]);
}

export function uint16be(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setUint16(0, value, false);
  return out;
}

export function int16be(value: number): Uint8Array {
  const out = new Uint8Array(2);
  new DataView(out.buffer).setInt16(0, value, false);
  return out;
}

export function uint32be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, value, false);
  return out;
}

export function int32be(value: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, value, false);
  return out;
}

export function concatBytes(...chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

export function pascalString(value: string, padMultiple = 4): Uint8Array {
  const bytes = fromAscii(value).subarray(0, 255);
  const rawLength = 1 + bytes.length;
  const paddedLength = Math.ceil(rawLength / padMultiple) * padMultiple;
  const out = new Uint8Array(paddedLength);
  out[0] = bytes.length;
  out.set(bytes, 1);
  return out;
}

export function splitChannels(rgba: Uint8ClampedArray, pixelCount: number) {
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

export function wrapRawChannelData(channelBytes: Uint8Array): Uint8Array {
  return concatBytes(uint16be(0), channelBytes);
}

export function buildLayerMaskExtraData(
  layer: { left: number; top: number; width: number; height: number },
  hasMask: boolean,
): Uint8Array {
  if (!hasMask) {
    return uint32be(0);
  }
  const maskData = concatBytes(
    int32be(layer.top),
    int32be(layer.left),
    int32be(layer.top + layer.height),
    int32be(layer.left + layer.width),
    uint8(255),
    uint8(0),
    uint16be(0),
  );
  return concatBytes(
    uint32be(maskData.length),
    maskData,
  );
}

export interface PsdLayerInput {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  rgba: ArrayBuffer;
  maskGrayscale: ArrayBuffer | null;
}

export interface PsdWorkerInput {
  layers: PsdLayerInput[];
  compositeRgba: ArrayBuffer;
  compositeWidth: number;
  compositeHeight: number;
  documentWidth: number;
  documentHeight: number;
}

export function assemblePsd(input: PsdWorkerInput): Uint8Array {
  const { layers, compositeRgba, compositeWidth, compositeHeight, documentWidth, documentHeight } = input;

  const layerRecords: Uint8Array[] = [];
  const layerChannelPayloads: Uint8Array[] = [];

  for (const layer of layers) {
    const rgba = new Uint8ClampedArray(layer.rgba);
    const pixelCount = layer.width * layer.height;
    const channels = splitChannels(rgba, pixelCount);

    const wrappedChannels: Array<{ id: number; bytes: Uint8Array }> = [
      { id: 0, bytes: wrapRawChannelData(channels.red) },
      { id: 1, bytes: wrapRawChannelData(channels.green) },
      { id: 2, bytes: wrapRawChannelData(channels.blue) },
      { id: -1, bytes: wrapRawChannelData(channels.alpha) },
    ];

    if (layer.maskGrayscale) {
      wrappedChannels.push({
        id: -2,
        bytes: wrapRawChannelData(new Uint8Array(layer.maskGrayscale)),
      });
    }

    const extraData = concatBytes(
      buildLayerMaskExtraData(layer, !!layer.maskGrayscale),
      uint32be(0),
      pascalString(layer.name),
    );

    const record = concatBytes(
      int32be(layer.top),
      int32be(layer.left),
      int32be(layer.top + layer.height),
      int32be(layer.left + layer.width),
      uint16be(wrappedChannels.length),
      ...wrappedChannels.flatMap(ch => [int16be(ch.id), uint32be(ch.bytes.length)]),
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
    layerChannelPayloads.push(...wrappedChannels.map(ch => ch.bytes));
  }

  const layerInfoData = concatBytes(
    int16be(layers.length),
    ...layerRecords,
    ...layerChannelPayloads,
  );

  const layerInfoSection = concatBytes(uint32be(layerInfoData.length), layerInfoData);
  const layerAndMaskSectionPayload = concatBytes(layerInfoSection, uint32be(0));
  const layerAndMaskSection = concatBytes(uint32be(layerAndMaskSectionPayload.length), layerAndMaskSectionPayload);

  const compositePixelCount = compositeWidth * compositeHeight;
  const compositeChannels = splitChannels(new Uint8ClampedArray(compositeRgba), compositePixelCount);
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
    uint32be(documentHeight),
    uint32be(documentWidth),
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
