export type PixelDType = 'uint8' | 'uint16' | 'int16' | 'int32' | 'float32' | 'float64';
export type PixelBuffer =
    | Uint8Array
    | Uint16Array
    | Int16Array
    | Int32Array
    | Float32Array
    | Float64Array;
export type ColorModel = 'gray' | 'graya' | 'rgb' | 'rgba';

export interface FitsCard {
    key: string;
    value: unknown;
    comment?: string;
}

export interface FitsMeta {
    cards: FitsCard[];
    extname?: string;
    flippedY: boolean;
    cubeIndex?: number;
    wcs?: { crpix: number[]; crval: number[]; cd: number[][]; ctype: string[] };
}

export interface ImageMeta {
    source?: { format: string; path?: string; frame?: number; hdu?: number };
    fits?: FitsMeta;
    exif?: Record<string, unknown>;
    history: string[];
}

export interface TRImage {
    __image: 1;
    width: number;
    height: number;
    channels: 1 | 2 | 3 | 4;
    model: ColorModel;
    dtype: PixelDType;
    data: PixelBuffer;
    range?: [number, number];
    nodata?: number;
    meta: ImageMeta;
}

export interface ImageRef {
    __imageRef: 1;
    id: string;
    epoch: string;
    width: number;
    height: number;
    channels: number;
    model: ColorModel;
    dtype: PixelDType;
}

export const MODEL_CHANNELS: Record<ColorModel, 1 | 2 | 3 | 4> = {
    gray: 1,
    graya: 2,
    rgb: 3,
    rgba: 4
};

const CHANNEL_MODELS: ColorModel[] = ['gray', 'graya', 'rgb', 'rgba'];

export function modelForChannels(channels: number): ColorModel {
    const model = CHANNEL_MODELS[channels - 1];
    if (!model) throw new Error(`Unsupported channel count: ${channels}`);
    return model;
}

export const modelHasAlpha = (model: ColorModel): boolean => model === 'graya' || model === 'rgba';
export const modelIsColor = (model: ColorModel): boolean => model === 'rgb' || model === 'rgba';

export function allocate(dtype: PixelDType, length: number): PixelBuffer {
    switch (dtype) {
        case 'uint8': return new Uint8Array(length);
        case 'uint16': return new Uint16Array(length);
        case 'int16': return new Int16Array(length);
        case 'int32': return new Int32Array(length);
        case 'float32': return new Float32Array(length);
        case 'float64': return new Float64Array(length);
    }
}

export function dtypeOf(buffer: PixelBuffer): PixelDType {
    if (buffer instanceof Uint8Array) return 'uint8';
    if (buffer instanceof Uint16Array) return 'uint16';
    if (buffer instanceof Int16Array) return 'int16';
    if (buffer instanceof Int32Array) return 'int32';
    if (buffer instanceof Float32Array) return 'float32';
    return 'float64';
}

export function bytesPerSample(dtype: PixelDType): number {
    switch (dtype) {
        case 'uint8': return 1;
        case 'uint16':
        case 'int16': return 2;
        case 'int32':
        case 'float32': return 4;
        case 'float64': return 8;
    }
}

export const isFloatDType = (dtype: PixelDType): boolean => dtype === 'float32' || dtype === 'float64';

export function typeRange(dtype: PixelDType): [number, number] | undefined {
    switch (dtype) {
        case 'uint8': return [0, 255];
        case 'uint16': return [0, 65535];
        case 'int16': return [-32768, 32767];
        case 'int32': return [-2147483648, 2147483647];
        default: return undefined;
    }
}

export function rangeOf(image: TRImage): [number, number] | undefined {
    if (image.range) return image.range;
    if (image.dtype === 'uint8' || image.dtype === 'uint16') return typeRange(image.dtype);
    return undefined;
}

export function isImage(value: unknown): value is TRImage {
    return !!value && typeof value === 'object' && (value as TRImage).__image === 1;
}

export function isImageRef(value: unknown): value is ImageRef {
    return !!value && typeof value === 'object' && (value as ImageRef).__imageRef === 1;
}

export interface CreateImageOptions {
    width: number;
    height: number;
    model: ColorModel;
    dtype: PixelDType;
    data?: PixelBuffer;
    range?: [number, number];
    nodata?: number;
    meta?: Partial<ImageMeta>;
}

export function createImage(options: CreateImageOptions): TRImage {
    const channels = MODEL_CHANNELS[options.model];
    const length = options.width * options.height * channels;
    const data = options.data ?? allocate(options.dtype, length);
    const image: TRImage = {
        __image: 1,
        width: options.width,
        height: options.height,
        channels,
        model: options.model,
        dtype: options.dtype,
        data,
        range: options.range,
        nodata: options.nodata,
        meta: { history: [], ...options.meta }
    };
    assertValid(image);
    return image;
}

export function assertValid(image: TRImage): void {
    if (!ArrayBuffer.isView(image.data)) {
        throw new Error('Image pixel data is missing or was serialized. Re-run the upstream node.');
    }
    const expected = image.width * image.height * image.channels;
    if (image.data.length !== expected) {
        throw new Error(`Image data length ${image.data.length} does not match ${image.width}x${image.height}x${image.channels}`);
    }
}

export function withHistory(image: TRImage, note: string, patch: Partial<TRImage> = {}): TRImage {
    return {
        ...image,
        ...patch,
        meta: { ...image.meta, history: [...image.meta.history, note] }
    };
}

export function describeImage(image: TRImage): Record<string, unknown> {
    const info: Record<string, unknown> = {
        width: image.width,
        height: image.height,
        channels: image.channels,
        model: image.model,
        dtype: image.dtype,
        sizeMB: Number(((image.data.byteLength) / 1048576).toFixed(2))
    };
    if (image.range) info.range = `${image.range[0]} .. ${image.range[1]}`;
    if (image.nodata !== undefined) info.nodata = image.nodata;
    if (image.meta.source) {
        info.format = image.meta.source.format;
        if (image.meta.source.hdu !== undefined) info.hdu = image.meta.source.hdu;
        if (image.meta.source.frame !== undefined) info.frame = image.meta.source.frame;
    }
    return info;
}
