import { allocate, createImage, type PixelDType, type TRImage } from '../model/image';
import { resolveInterval, stretchFn, type IntervalKind, type IntervalOptions, type StretchKind } from './scale';

export type ColormapName =
    | 'viridis'
    | 'plasma'
    | 'inferno'
    | 'magma'
    | 'turbo'
    | 'cubehelix'
    | 'coolwarm'
    | 'heat'
    | 'jet'
    | 'cool'
    | 'bone'
    | 'copper'
    | 'cividis'
    | 'greys';

export interface ColormapOptions {
    colormap: ColormapName;
    invert?: boolean;
    stretch?: StretchKind;
    interval?: IntervalKind;
    intervalOptions?: IntervalOptions;
    outputModel?: 'rgb' | 'rgba';
    outputType?: 'uint8' | 'float32';
    nanColor?: 'black' | 'white' | 'transparent';
    gamma?: number;
}

type ColorStop = [number, [number, number, number]];

const COLORMAP_STOPS: Record<Exclude<ColormapName, 'cubehelix'>, ColorStop[]> = {
    viridis: [
        [0.0, [68, 1, 84]],
        [0.13, [71, 45, 123]],
        [0.25, [59, 82, 139]],
        [0.38, [44, 114, 142]],
        [0.5, [33, 145, 140]],
        [0.63, [40, 174, 128]],
        [0.75, [94, 201, 98]],
        [0.88, [170, 220, 50]],
        [1.0, [253, 231, 37]]
    ],
    plasma: [
        [0.0, [13, 8, 135]],
        [0.13, [75, 3, 161]],
        [0.25, [126, 3, 168]],
        [0.38, [168, 34, 150]],
        [0.5, [203, 70, 121]],
        [0.63, [229, 107, 93]],
        [0.75, [248, 149, 64]],
        [0.88, [253, 195, 40]],
        [1.0, [240, 249, 33]]
    ],
    inferno: [
        [0.0, [0, 0, 4]],
        [0.13, [40, 11, 84]],
        [0.25, [101, 21, 110]],
        [0.38, [159, 42, 99]],
        [0.5, [212, 72, 66]],
        [0.63, [245, 125, 21]],
        [0.75, [250, 180, 25]],
        [0.88, [242, 229, 93]],
        [1.0, [252, 255, 164]]
    ],
    magma: [
        [0.0, [0, 0, 4]],
        [0.13, [35, 17, 81]],
        [0.25, [81, 18, 124]],
        [0.38, [130, 37, 129]],
        [0.5, [182, 54, 121]],
        [0.63, [230, 81, 100]],
        [0.75, [251, 136, 97]],
        [0.88, [254, 195, 139]],
        [1.0, [252, 253, 191]]
    ],
    turbo: [
        [0.0, [48, 18, 59]],
        [0.1, [68, 81, 191]],
        [0.2, [56, 138, 243]],
        [0.3, [34, 186, 214]],
        [0.4, [39, 224, 150]],
        [0.5, [108, 243, 76]],
        [0.6, [183, 241, 46]],
        [0.7, [243, 208, 55]],
        [0.8, [253, 148, 48]],
        [0.9, [236, 76, 33]],
        [1.0, [122, 4, 3]]
    ],
    coolwarm: [
        [0.0, [59, 76, 192]],
        [0.25, [136, 172, 247]],
        [0.5, [221, 221, 221]],
        [0.75, [244, 142, 114]],
        [1.0, [180, 4, 38]]
    ],
    heat: [
        [0.0, [0, 0, 0]],
        [0.25, [160, 0, 0]],
        [0.5, [255, 100, 0]],
        [0.75, [255, 220, 0]],
        [1.0, [255, 255, 255]]
    ],
    jet: [
        [0.0, [0, 0, 128]],
        [0.12, [0, 0, 255]],
        [0.37, [0, 255, 255]],
        [0.62, [255, 255, 0]],
        [0.87, [255, 0, 0]],
        [1.0, [128, 0, 0]]
    ],
    cool: [
        [0.0, [0, 255, 255]],
        [1.0, [255, 0, 255]]
    ],
    bone: [
        [0.0, [0, 0, 0]],
        [0.37, [84, 84, 116]],
        [0.75, [169, 197, 197]],
        [1.0, [255, 255, 255]]
    ],
    copper: [
        [0.0, [0, 0, 0]],
        [0.8, [255, 159, 102]],
        [1.0, [255, 199, 127]]
    ],
    cividis: [
        [0.0, [0, 32, 77]],
        [0.25, [65, 82, 103]],
        [0.5, [122, 131, 126]],
        [0.75, [192, 185, 134]],
        [1.0, [255, 234, 70]]
    ],
    greys: [
        [0.0, [0, 0, 0]],
        [1.0, [255, 255, 255]]
    ]
};

function generateCubehelixLut(invert = false): Uint8Array {
    const lut = new Uint8Array(256 * 3);
    const start = 0.5;
    const rotations = -1.5;
    const hue = 1.0;
    const gamma = 1.0;

    for (let i = 0; i < 256; i++) {
        let t = i / 255;
        if (invert) t = 1 - t;
        const tg = Math.pow(t, gamma);
        const phi = 2 * Math.PI * (start / 3 + rotations * t);
        const amp = (hue * tg * (1 - tg)) / 2;
        const cosPhi = Math.cos(phi);
        const sinPhi = Math.sin(phi);

        let r = tg + amp * (-0.14861 * cosPhi + 1.78277 * sinPhi);
        let g = tg + amp * (-0.29227 * cosPhi - 0.90649 * sinPhi);
        let b = tg + amp * (1.97294 * cosPhi);

        lut[i * 3 + 0] = Math.min(255, Math.max(0, Math.round(r * 255)));
        lut[i * 3 + 1] = Math.min(255, Math.max(0, Math.round(g * 255)));
        lut[i * 3 + 2] = Math.min(255, Math.max(0, Math.round(b * 255)));
    }
    return lut;
}

function buildLutFromStops(stops: ColorStop[], invert = false): Uint8Array {
    const lut = new Uint8Array(256 * 3);
    const sorted = [...stops].sort((a, b) => a[0] - b[0]);

    for (let i = 0; i < 256; i++) {
        let t = i / 255;
        if (invert) t = 1 - t;

        let r = 0;
        let g = 0;
        let b = 0;

        if (t <= sorted[0][0]) {
            [r, g, b] = sorted[0][1];
        } else if (t >= sorted[sorted.length - 1][0]) {
            [r, g, b] = sorted[sorted.length - 1][1];
        } else {
            for (let s = 0; s < sorted.length - 1; s++) {
                const s0 = sorted[s];
                const s1 = sorted[s + 1];
                if (t >= s0[0] && t <= s1[0]) {
                    const span = s1[0] - s0[0];
                    const frac = span > 0 ? (t - s0[0]) / span : 0;
                    r = Math.round(s0[1][0] + frac * (s1[1][0] - s0[1][0]));
                    g = Math.round(s0[1][1] + frac * (s1[1][1] - s0[1][1]));
                    b = Math.round(s0[1][2] + frac * (s1[1][2] - s0[1][2]));
                    break;
                }
            }
        }

        lut[i * 3 + 0] = Math.min(255, Math.max(0, r));
        lut[i * 3 + 1] = Math.min(255, Math.max(0, g));
        lut[i * 3 + 2] = Math.min(255, Math.max(0, b));
    }

    return lut;
}

const lutCache = new Map<string, Uint8Array>();

export function getColormapLut(name: ColormapName, invert = false): Uint8Array {
    const key = `${name}:${invert}`;
    const cached = lutCache.get(key);
    if (cached) return cached;

    const lut = name === 'cubehelix'
        ? generateCubehelixLut(invert)
        : buildLutFromStops(COLORMAP_STOPS[name] || COLORMAP_STOPS.viridis, invert);

    lutCache.set(key, lut);
    return lut;
}

export function applyColormap(image: TRImage, options: ColormapOptions): TRImage {
    const {
        colormap,
        invert = false,
        stretch = 'linear',
        interval = 'percentile',
        intervalOptions,
        outputModel = 'rgb',
        outputType = 'uint8',
        nanColor = 'black',
        gamma = 2.2
    } = options;

    const lut = getColormapLut(colormap, invert);
    const [lo, hi] = resolveInterval(image, interval, intervalOptions);
    const span = hi - lo || 1;
    const sFn = stretchFn(stretch, gamma);

    const { width, height, channels, data, nodata } = image;
    const pixelCount = width * height;
    const outChannels = outputModel === 'rgba' ? 4 : 3;
    const outData = allocate(outputType, pixelCount * outChannels);

    let nanR = 0;
    let nanG = 0;
    let nanB = 0;
    let nanA = outputModel === 'rgba' ? 255 : 0;

    if (nanColor === 'white') {
        nanR = 255;
        nanG = 255;
        nanB = 255;
    } else if (nanColor === 'transparent') {
        nanA = 0;
    }

    const isFloat = outputType === 'float32';
    const normFactor = isFloat ? 1 / 255 : 1;

    for (let p = 0; p < pixelCount; p++) {
        const srcOffset = p * channels;
        let v: number;

        if (channels === 1) {
            v = data[srcOffset];
        } else if (channels === 2) {
            v = data[srcOffset];
        } else {
            v = 0.299 * data[srcOffset] + 0.587 * data[srcOffset + 1] + 0.114 * data[srcOffset + 2];
        }

        const dstOffset = p * outChannels;

        if (v !== v || (nodata !== undefined && v === nodata)) {
            outData[dstOffset + 0] = isFloat ? nanR * normFactor : nanR;
            outData[dstOffset + 1] = isFloat ? nanG * normFactor : nanG;
            outData[dstOffset + 2] = isFloat ? nanB * normFactor : nanB;
            if (outChannels === 4) {
                outData[dstOffset + 3] = isFloat ? nanA * normFactor : nanA;
            }
            continue;
        }

        const normalized = (v - lo) / span;
        const clamped = normalized < 0 ? 0 : normalized > 1 ? 1 : normalized;
        const stretchedVal = sFn(clamped);
        const lutIdx = Math.min(255, Math.max(0, Math.round(stretchedVal * 255))) * 3;

        const r = lut[lutIdx + 0];
        const g = lut[lutIdx + 1];
        const b = lut[lutIdx + 2];

        outData[dstOffset + 0] = isFloat ? r * normFactor : r;
        outData[dstOffset + 1] = isFloat ? g * normFactor : g;
        outData[dstOffset + 2] = isFloat ? b * normFactor : b;

        if (outChannels === 4) {
            outData[dstOffset + 3] = isFloat ? 1.0 : 255;
        }
    }

    return createImage({
        width,
        height,
        model: outputModel,
        dtype: outputType,
        data: outData,
        range: isFloat ? [0, 1] : [0, 255],
        meta: {
            ...image.meta,
            history: [
                ...image.meta.history,
                `Colormap (${colormap}${invert ? ' inverted' : ''}, stretch=${stretch}, interval=[${lo.toFixed(2)}, ${hi.toFixed(2)}])`
            ]
        }
    });
}
