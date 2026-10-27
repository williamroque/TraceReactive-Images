import { createImage, type TRImage } from '../model/image';
import { assertPixelLimit } from '../runtime';
import type { CodecCapabilities, DecodeOptions, DecodedFile, EncodeOptions, ImageCodec } from './registry';

const startsWith = (head: Uint8Array, bytes: number[], offset = 0): boolean =>
    bytes.every((b, i) => head[offset + i] === b);

const ascii = (head: Uint8Array, text: string, offset: number): boolean =>
    [...text].every((ch, i) => head[offset + i] === ch.charCodeAt(0));

async function decodeWithBrowser(bytes: Uint8Array, mime: string, format: string): Promise<DecodedFile> {
    const blob = new Blob([bytes as BlobPart], { type: mime });
    const bitmap = await createImageBitmap(blob, {
        premultiplyAlpha: 'none',
        colorSpaceConversion: 'none',
        imageOrientation: 'from-image'
    });
    try {
        const { width, height } = bitmap;
        assertPixelLimit(width, height);
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) throw new Error('Canvas 2D context is unavailable.');
        ctx.drawImage(bitmap, 0, 0);
        const rgba = ctx.getImageData(0, 0, width, height).data;

        let opaque = true;
        for (let i = 3; i < rgba.length; i += 4) {
            if (rgba[i] !== 255) {
                opaque = false;
                break;
            }
        }

        const pixels = width * height;
        const channels = opaque ? 3 : 4;
        const data = new Uint8Array(pixels * channels);
        if (opaque) {
            for (let p = 0, s = 0, d = 0; p < pixels; p++, s += 4, d += 3) {
                data[d] = rgba[s];
                data[d + 1] = rgba[s + 1];
                data[d + 2] = rgba[s + 2];
            }
        } else {
            data.set(rgba);
        }

        const image = createImage({
            width,
            height,
            model: opaque ? 'rgb' : 'rgba',
            dtype: 'uint8',
            data,
            range: [0, 255],
            meta: { source: { format }, history: [] }
        });
        return { images: [image], labels: ['Image'], info: { format } };
    } finally {
        bitmap.close();
    }
}

async function encodeWithCanvas(image: TRImage, mime: string, quality: number | undefined): Promise<Uint8Array> {
    const { width, height, data, channels } = image;
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context is unavailable.');
    const imageData = ctx.createImageData(width, height);
    const out = imageData.data;
    const pixels = width * height;
    for (let p = 0, s = 0, d = 0; p < pixels; p++, s += channels, d += 4) {
        out[d] = data[s];
        out[d + 1] = data[s + 1];
        out[d + 2] = data[s + 2];
        out[d + 3] = channels === 4 ? data[s + 3] : 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const blob = await canvas.convertToBlob({ type: mime, quality });
    return new Uint8Array(await blob.arrayBuffer());
}

interface BrowserCodecSpec {
    id: string;
    label: string;
    extensions: string[];
    mime: string;
    sniff: (head: Uint8Array) => boolean;
    lossless: boolean;
    canEncode: boolean;
    multiFrame?: boolean;
    models?: CodecCapabilities['models'];
}

function createBrowserCodec(spec: BrowserCodecSpec): ImageCodec {
    const codec: ImageCodec = {
        id: spec.id,
        label: spec.label,
        extensions: spec.extensions,
        mimeTypes: [spec.mime],
        capabilities: {
            dtypes: ['uint8'],
            models: spec.models ?? ['rgb', 'rgba'],
            multiFrame: !!spec.multiFrame,
            lossless: spec.lossless
        },
        sniff: spec.sniff,
        decode: (bytes: Uint8Array, _options: DecodeOptions) => decodeWithBrowser(bytes, spec.mime, spec.id)
    };
    if (spec.canEncode) {
        codec.encode = async (images: TRImage[], options: EncodeOptions) => {
            if (images.length !== 1) throw new Error(`${spec.label} stores a single image.`);
            const quality = typeof options.quality === 'number' ? Math.min(1, Math.max(0.01, options.quality)) : undefined;
            return encodeWithCanvas(images[0], spec.mime, quality);
        };
    }
    return codec;
}

export const browserCodecs: ImageCodec[] = [
    createBrowserCodec({
        id: 'jpeg',
        label: 'JPEG',
        extensions: ['jpg', 'jpeg', 'jpe', 'jfif'],
        mime: 'image/jpeg',
        sniff: (h) => startsWith(h, [0xff, 0xd8, 0xff]),
        lossless: false,
        canEncode: true,
        models: ['rgb']
    }),
    createBrowserCodec({
        id: 'webp',
        label: 'WebP',
        extensions: ['webp'],
        mime: 'image/webp',
        sniff: (h) => ascii(h, 'RIFF', 0) && ascii(h, 'WEBP', 8),
        lossless: false,
        canEncode: true
    }),
    createBrowserCodec({
        id: 'gif',
        label: 'GIF',
        extensions: ['gif'],
        mime: 'image/gif',
        sniff: (h) => ascii(h, 'GIF8', 0),
        lossless: true,
        canEncode: false
    }),
    createBrowserCodec({
        id: 'bmp',
        label: 'BMP',
        extensions: ['bmp'],
        mime: 'image/bmp',
        sniff: (h) => ascii(h, 'BM', 0),
        lossless: true,
        canEncode: false
    }),
    createBrowserCodec({
        id: 'avif',
        label: 'AVIF',
        extensions: ['avif'],
        mime: 'image/avif',
        sniff: (h) => ascii(h, 'ftypavif', 4) || ascii(h, 'ftypavis', 4),
        lossless: false,
        canEncode: false
    })
];

export { decodeWithBrowser };
