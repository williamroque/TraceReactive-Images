import { decode, encode } from 'fast-png';
import { createImage, modelForChannels, type PixelBuffer, type TRImage } from '../model/image';
import { assertPixelLimit } from '../runtime';
import { decodeWithBrowser } from './browser';
import type { DecodedFile, EncodeOptions, ImageCodec } from './registry';

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function expandPalette(png: any): { data: Uint8Array; channels: number } {
    const palette: number[][] = png.palette;
    const hasAlpha = palette.some((entry) => entry.length > 3);
    const channels = hasAlpha ? 4 : 3;
    const indices: ArrayLike<number> = png.data;
    const data = new Uint8Array(indices.length * channels);
    for (let i = 0; i < indices.length; i++) {
        const entry = palette[indices[i]] ?? [0, 0, 0];
        const o = i * channels;
        data[o] = entry[0];
        data[o + 1] = entry[1];
        data[o + 2] = entry[2];
        if (hasAlpha) data[o + 3] = entry.length > 3 ? entry[3] : 255;
    }
    return { data, channels };
}

function decodePng(bytes: Uint8Array): DecodedFile {
    const png: any = decode(bytes);
    assertPixelLimit(png.width, png.height);

    let data: PixelBuffer = png.data;
    let channels: number = png.channels;
    const depth: number = png.depth;

    if (png.palette) {
        ({ data, channels } = expandPalette(png));
    } else if (depth < 8) {
        const max = (1 << depth) - 1;
        const scaled = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) scaled[i] = Math.round((data[i] * 255) / max);
        data = scaled;
    }

    const sixteen = !png.palette && depth === 16;
    const image = createImage({
        width: png.width,
        height: png.height,
        model: modelForChannels(channels),
        dtype: sixteen ? 'uint16' : 'uint8',
        data,
        range: sixteen ? [0, 65535] : [0, 255],
        meta: { source: { format: 'png' }, history: [] }
    });
    return { images: [image], labels: ['Image'], info: { format: 'png', bitDepth: sixteen ? 16 : 8 } };
}

export function encodeRawPng(width: number, height: number, channels: number, data: Uint8Array | Uint16Array): Uint8Array {
    return encode({
        width,
        height,
        data,
        depth: data instanceof Uint16Array ? 16 : 8,
        channels
    } as any);
}

export const pngCodec: ImageCodec = {
    id: 'png',
    label: 'PNG',
    extensions: ['png'],
    mimeTypes: ['image/png'],
    capabilities: {
        dtypes: ['uint8', 'uint16'],
        models: ['gray', 'graya', 'rgb', 'rgba'],
        multiFrame: false,
        lossless: true
    },
    sniff: (head) => PNG_MAGIC.every((b, i) => head[i] === b),
    decode: async (bytes) => {
        try {
            return decodePng(bytes);
        } catch (err) {
            console.warn('PNG decoder failed, falling back to the browser decoder:', err);
            return decodeWithBrowser(bytes, 'image/png', 'png');
        }
    },
    encode: async (images: TRImage[], _options: EncodeOptions) => {
        if (images.length !== 1) throw new Error('PNG stores a single image.');
        const image = images[0];
        return encodeRawPng(image.width, image.height, image.channels, image.data as Uint8Array | Uint16Array);
    }
};
