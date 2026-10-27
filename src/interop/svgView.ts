import { modelHasAlpha, modelIsColor, rangeOf, type TRImage } from '../model/image';
import { colorChannelCount } from '../core/pixels';
import { resolveInterval, stretchFn, type IntervalKind, type IntervalOptions, type StretchKind } from '../core/scale';
import { encodeRawPng } from '../codecs/png';
import { toBase64 } from './base64';

export interface DisplayOptions {
    maxDim: number;
    stretch: StretchKind;
    interval: IntervalKind;
    intervalOptions: IntervalOptions;
    gamma?: number;
}

interface Downsampled {
    data: ArrayLike<number>;
    width: number;
    height: number;
}

function downsample(image: TRImage, maxDim: number): Downsampled {
    const { width, height, channels, data } = image;
    const factor = Math.ceil(Math.max(width, height) / maxDim);
    if (factor <= 1) return { data, width, height };

    const dw = Math.ceil(width / factor);
    const dh = Math.ceil(height / factor);
    const sums = new Float64Array(dw * dh * channels);
    const counts = new Uint32Array(dw * dh * channels);
    for (let y = 0; y < height; y++) {
        const rowBase = Math.floor(y / factor) * dw;
        for (let x = 0; x < width; x++) {
            const o = (rowBase + Math.floor(x / factor)) * channels;
            const s = (y * width + x) * channels;
            for (let c = 0; c < channels; c++) {
                const v = data[s + c];
                if (v !== v) continue;
                sums[o + c] += v;
                counts[o + c]++;
            }
        }
    }
    const out = new Float32Array(sums.length);
    for (let i = 0; i < out.length; i++) out[i] = counts[i] ? sums[i] / counts[i] : NaN;
    return { data: out, width: dw, height: dh };
}

export function renderImagePng(image: TRImage, options: DisplayOptions): { png: Uint8Array; width: number; height: number } {
    const [lo, hi] = resolveInterval(image, options.interval, options.intervalOptions);
    const span = hi - lo;
    const fn = stretchFn(options.stretch, options.gamma);
    const src = downsample(image, Math.max(16, options.maxDim));

    const { channels, model } = image;
    const color = modelIsColor(model);
    const alpha = modelHasAlpha(model);
    const colors = colorChannelCount(image);
    const outChannels = alpha ? 4 : 3;
    const pixels = src.width * src.height;
    const out = new Uint8Array(pixels * outChannels);
    const alphaMax = rangeOf(image)?.[1] ?? 1;

    const map = (v: number): number => {
        if (v !== v) return 0;
        const t = (v - lo) / span;
        const clamped = t < 0 ? 0 : t > 1 ? 1 : t;
        return Math.round(fn(clamped) * 255);
    };

    for (let p = 0; p < pixels; p++) {
        const s = p * channels;
        const o = p * outChannels;
        if (color) {
            out[o] = map(src.data[s]);
            out[o + 1] = map(src.data[s + 1]);
            out[o + 2] = map(src.data[s + 2]);
        } else {
            const g = map(src.data[s]);
            out[o] = g;
            out[o + 1] = g;
            out[o + 2] = g;
        }
        if (alpha) {
            const a = src.data[s + colors];
            out[o + 3] = a !== a ? 0 : Math.max(0, Math.min(255, Math.round((a / alphaMax) * 255)));
        }
    }

    return { png: encodeRawPng(src.width, src.height, outChannels, out), width: src.width, height: src.height };
}

export function renderImageSvg(image: TRImage, options: DisplayOptions): string {
    const { png, width, height } = renderImagePng(image, options);
    const href = `data:image/png;base64,${toBase64(png)}`;
    return (
        `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
        `width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
        `<image href="${href}" x="0" y="0" width="${width}" height="${height}" style="image-rendering:pixelated"/>` +
        `</svg>`
    );
}
