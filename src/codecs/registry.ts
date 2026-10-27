import { gunzipSync } from 'fflate';
import { assertValid, type ColorModel, type PixelDType, type TRImage } from '../model/image';
import { assertPixelLimit } from '../runtime';

export interface CodecCapabilities {
    dtypes: PixelDType[];
    models: ColorModel[];
    multiFrame: boolean;
    lossless: boolean;
}

export interface DecodeOptions {
    path?: string;
}

export interface EncodeOptions {
    quality?: number;
    [key: string]: unknown;
}

export interface DecodedFile {
    images: TRImage[];
    labels: string[];
    info: Record<string, unknown>;
}

export interface ImageCodec {
    id: string;
    label: string;
    extensions: string[];
    mimeTypes: string[];
    capabilities: CodecCapabilities;
    sniff(head: Uint8Array): boolean;
    decode(bytes: Uint8Array, options: DecodeOptions): Promise<DecodedFile>;
    encode?(images: TRImage[], options: EncodeOptions): Promise<Uint8Array>;
}

const codecs: ImageCodec[] = [];

export function registerCodec(codec: ImageCodec): void {
    const index = codecs.findIndex((c) => c.id === codec.id);
    if (index >= 0) codecs[index] = codec;
    else codecs.push(codec);
}

export const listCodecs = (): ImageCodec[] => [...codecs];

export const getCodec = (id: string): ImageCodec | undefined => codecs.find((c) => c.id === id);

export function extensionOf(path: string): string {
    const match = /\.([a-z0-9]+)$/i.exec(path);
    return match ? match[1].toLowerCase() : '';
}

export function codecForExtension(path: string): ImageCodec | undefined {
    const ext = extensionOf(path);
    return ext ? codecs.find((c) => c.extensions.includes(ext)) : undefined;
}

export function detectCodec(bytes: Uint8Array, path?: string): ImageCodec | undefined {
    const head = bytes.subarray(0, 32);
    return codecs.find((c) => c.sniff(head)) ?? (path ? codecForExtension(path) : undefined);
}

const isGzip = (bytes: Uint8Array): boolean => bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

export async function decodeFile(bytes: Uint8Array, options: DecodeOptions = {}): Promise<DecodedFile> {
    let data = bytes;
    let path = options.path;
    if (isGzip(data)) {
        data = gunzipSync(data);
        if (path) path = path.replace(/\.gz$/i, '');
    }

    const codec = detectCodec(data, path);
    if (!codec) throw new Error('Unrecognized image format.');

    const decoded = await codec.decode(data, { ...options, path });
    if (decoded.images.length === 0) throw new Error('The file contains no images.');
    for (const image of decoded.images) {
        assertPixelLimit(image.width, image.height);
        assertValid(image);
    }
    decoded.info = { codec: codec.id, ...decoded.info };
    return decoded;
}
