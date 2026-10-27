import {
    MODEL_CHANNELS,
    allocate,
    isFloatDType,
    modelHasAlpha,
    modelIsColor,
    rangeOf,
    typeRange,
    withHistory,
    type ColorModel,
    type PixelDType,
    type TRImage
} from '../model/image';
import { finiteMinMax } from './pixels';

export type ScaleMode = 'range' | 'normalize' | 'clamp';
export type MismatchPolicy = 'auto' | 'error' | 'normalize' | 'clamp';

export interface FormatCapabilities {
    dtypes: PixelDType[];
    models: ColorModel[];
}

export function convertDType(image: TRImage, target: PixelDType, mode: ScaleMode): TRImage {
    if (image.dtype === target && mode !== 'normalize') return image;

    const { data, channels } = image;
    const hasAlpha = modelHasAlpha(image.model);
    const colors = hasAlpha ? channels - 1 : channels;
    const out = allocate(target, data.length);
    const targetRange = typeRange(target);
    const sourceRange = rangeOf(image);

    if (!targetRange) {
        if (mode === 'normalize') {
            const mm = finiteMinMax(image);
            if (!mm) throw new Error('Cannot normalize an image with no finite pixel values.');
            const span = mm[1] - mm[0] || 1;
            let ch = 0;
            for (let i = 0; i < data.length; i++) {
                out[i] = hasAlpha && ch === colors ? data[i] : (data[i] - mm[0]) / span;
                if (++ch === channels) ch = 0;
            }
            return withHistory(image, `Normalized to [0, 1] as ${target}`, { dtype: target, data: out, range: [0, 1], nodata: undefined });
        }
        for (let i = 0; i < data.length; i++) out[i] = data[i];
        return withHistory(image, `Converted ${image.dtype} to ${target}`, { dtype: target, data: out });
    }

    let smin: number;
    let smax: number;
    if (mode === 'range') {
        if (!sourceRange) {
            throw new Error(`Image has no known value range, so ${image.dtype} cannot be scaled to ${target} automatically.`);
        }
        [smin, smax] = sourceRange;
    } else if (mode === 'normalize') {
        const mm = finiteMinMax(image);
        if (!mm) throw new Error('Cannot normalize an image with no finite pixel values.');
        [smin, smax] = mm;
    } else {
        [smin, smax] = targetRange;
    }

    const [tmin, tmax] = targetRange;
    const colorScale = smax > smin ? (tmax - tmin) / (smax - smin) : 0;
    const alphaRange = sourceRange ?? [0, 1];
    const alphaScale = alphaRange[1] > alphaRange[0] ? (tmax - tmin) / (alphaRange[1] - alphaRange[0]) : 0;

    let ch = 0;
    for (let i = 0; i < data.length; i++) {
        const v = data[i];
        const isAlpha = hasAlpha && ch === colors;
        if (v !== v) {
            out[i] = isAlpha ? tmax : tmin;
        } else {
            const x = isAlpha ? (v - alphaRange[0]) * alphaScale + tmin : (v - smin) * colorScale + tmin;
            out[i] = x < tmin ? tmin : x > tmax ? tmax : Math.round(x);
        }
        if (++ch === channels) ch = 0;
    }

    return withHistory(image, `Converted ${image.dtype} to ${target} (${mode})`, {
        dtype: target,
        data: out,
        range: [tmin, tmax],
        nodata: undefined
    });
}

export function convertModel(image: TRImage, target: ColorModel): TRImage {
    if (image.model === target) return image;

    const n = image.width * image.height;
    const sc = image.channels;
    const tc = MODEL_CHANNELS[target];
    const out = allocate(image.dtype, n * tc);
    const maxv = rangeOf(image)?.[1] ?? 1;
    const round = !isFloatDType(image.dtype);
    const srcColor = modelIsColor(image.model);
    const srcAlpha = modelHasAlpha(image.model);
    const dstColor = modelIsColor(target);
    const dstAlpha = modelHasAlpha(target);
    const d = image.data;

    for (let p = 0; p < n; p++) {
        const s = p * sc;
        let r: number;
        let g: number;
        let b: number;
        let a: number;
        if (srcColor) {
            r = d[s]; g = d[s + 1]; b = d[s + 2];
            a = srcAlpha ? d[s + 3] : maxv;
        } else {
            r = g = b = d[s];
            a = srcAlpha ? d[s + 1] : maxv;
        }
        if (srcAlpha && !dstAlpha) {
            const t = a / maxv;
            r = r * t + maxv * (1 - t);
            g = g * t + maxv * (1 - t);
            b = b * t + maxv * (1 - t);
        }
        const o = p * tc;
        if (dstColor) {
            out[o] = round ? Math.round(r) : r;
            out[o + 1] = round ? Math.round(g) : g;
            out[o + 2] = round ? Math.round(b) : b;
            if (dstAlpha) out[o + 3] = a;
        } else {
            const luma = srcColor ? 0.2126 * r + 0.7152 * g + 0.0722 * b : r;
            out[o] = round ? Math.round(luma) : luma;
            if (dstAlpha) out[o + 1] = a;
        }
    }

    const note = srcAlpha && !dstAlpha
        ? `Converted ${image.model} to ${target} (alpha flattened onto white)`
        : `Converted ${image.model} to ${target}`;
    return withHistory(image, note, { model: target, channels: tc, data: out });
}

function pickModel(image: TRImage, models: ColorModel[]): ColorModel {
    const color = modelIsColor(image.model);
    const alpha = modelHasAlpha(image.model);
    let best = models[0];
    let bestCost = Infinity;
    for (const m of models) {
        let cost = 0;
        if (color && !modelIsColor(m)) cost += 2;
        if (alpha && !modelHasAlpha(m)) cost += 1;
        if (!color && modelIsColor(m)) cost += 0.1;
        if (!alpha && modelHasAlpha(m)) cost += 0.2;
        if (cost < bestCost) {
            best = m;
            bestCost = cost;
        }
    }
    return best;
}

function pickDType(source: PixelDType, dtypes: PixelDType[]): PixelDType {
    const widest = [...dtypes].sort((a, b) => (typeRange(a)?.[1] ?? Infinity) - (typeRange(b)?.[1] ?? Infinity));
    return widest[widest.length - 1] ?? source;
}

export interface PreparedImage {
    image: TRImage;
    notes: string[];
}

export function prepareForEncode(
    image: TRImage,
    caps: FormatCapabilities,
    policy: MismatchPolicy,
    formatName: string
): PreparedImage {
    const notes: string[] = [];
    let out = image;

    if (!caps.models.includes(out.model)) {
        if (policy === 'error') {
            throw new Error(`${formatName} cannot store a '${out.model}' image. Convert it first or set the mismatch policy to 'auto'.`);
        }
        const target = pickModel(out, caps.models);
        out = convertModel(out, target);
        notes.push(`Color model ${image.model} converted to ${target}`);
    }

    if (!caps.dtypes.includes(out.dtype)) {
        if (policy === 'error') {
            throw new Error(`${formatName} cannot store ${out.dtype} pixels. Convert the image first or set the mismatch policy to 'auto'.`);
        }
        const target = pickDType(out.dtype, caps.dtypes);
        if (policy === 'auto' && !rangeOf(out)) {
            throw new Error(
                `${formatName} cannot store ${out.dtype} pixels, and this image has no known value range to scale from. ` +
                `Stretch or convert it first, or set the mismatch policy to 'normalize' (min/max) or 'clamp'.`
            );
        }
        const mode: ScaleMode = policy === 'auto' ? 'range' : policy;
        out = convertDType(out, target, mode);
        notes.push(`Pixel type ${image.dtype} converted to ${target} (${mode})`);
    }

    return { image: out, notes };
}
