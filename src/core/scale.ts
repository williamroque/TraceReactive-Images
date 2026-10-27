import { rangeOf, type TRImage } from '../model/image';
import { finiteMinMax, sampleFinite } from './pixels';

export type StretchKind = 'linear' | 'sqrt' | 'log' | 'asinh' | 'gamma';
export type IntervalKind = 'auto' | 'minmax' | 'percentile' | 'manual';

export interface IntervalOptions {
    lo?: number;
    hi?: number;
    pLow?: number;
    pHigh?: number;
}

export function stretchFn(kind: StretchKind, gamma = 2.2): (t: number) => number {
    switch (kind) {
        case 'sqrt': return (t) => Math.sqrt(t);
        case 'log': return (t) => Math.log1p(1000 * t) / Math.log1p(1000);
        case 'asinh': return (t) => Math.asinh(10 * t) / Math.asinh(10);
        case 'gamma': return (t) => Math.pow(t, 1 / gamma);
        default: return (t) => t;
    }
}

function percentileInterval(image: TRImage, pLow: number, pHigh: number): [number, number] | undefined {
    const sample = sampleFinite(image, 262144);
    if (sample.length === 0) return undefined;
    const sorted = Float32Array.from(sample).sort();
    const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p / 100 * (sorted.length - 1))))];
    return [at(pLow), at(pHigh)];
}

export function resolveInterval(image: TRImage, kind: IntervalKind, options: IntervalOptions = {}): [number, number] {
    let result: [number, number] | undefined;
    if (kind === 'manual') {
        result = [options.lo ?? 0, options.hi ?? 1];
    } else if (kind === 'minmax') {
        result = finiteMinMax(image);
    } else if (kind === 'percentile') {
        result = percentileInterval(image, options.pLow ?? 0.5, options.pHigh ?? 99.5);
    } else {
        const nominal = image.dtype === 'uint8' ? [0, 255] as [number, number] : image.range ?? undefined;
        result = nominal ?? percentileInterval(image, 0.5, 99.5) ?? rangeOf(image);
    }
    if (!result) return [0, 1];
    if (result[1] <= result[0]) return [result[0], result[0] + 1];
    return result;
}
