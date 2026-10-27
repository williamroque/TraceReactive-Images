import { modelHasAlpha, type TRImage } from '../model/image';

export const colorChannelCount = (image: TRImage): number =>
    modelHasAlpha(image.model) ? image.channels - 1 : image.channels;

export function finiteMinMax(image: TRImage): [number, number] | undefined {
    const { data, channels } = image;
    const colors = colorChannelCount(image);
    let min = Infinity;
    let max = -Infinity;
    const nodata = image.nodata;
    for (let i = 0; i < data.length; i += channels) {
        for (let c = 0; c < colors; c++) {
            const v = data[i + c];
            if (v !== v || v === Infinity || v === -Infinity || v === nodata) continue;
            if (v < min) min = v;
            if (v > max) max = v;
        }
    }
    return min <= max ? [min, max] : undefined;
}

export function sampleFinite(image: TRImage, maxSamples: number): Float32Array {
    const { data, channels } = image;
    const colors = colorChannelCount(image);
    const pixels = image.width * image.height;
    const step = Math.max(1, Math.floor(pixels / maxSamples));
    const out = new Float32Array(Math.ceil(pixels / step) * colors);
    const nodata = image.nodata;
    let n = 0;
    for (let p = 0; p < pixels; p += step) {
        const base = p * channels;
        for (let c = 0; c < colors; c++) {
            const v = data[base + c];
            if (v !== v || v === Infinity || v === -Infinity || v === nodata) continue;
            out[n++] = v;
        }
    }
    return out.subarray(0, n);
}
