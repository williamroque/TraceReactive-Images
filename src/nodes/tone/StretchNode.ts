import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { resolveInterval, stretchFn, type IntervalKind, type StretchKind } from '../../core/scale';
import {
    allocate,
    createImage,
    isImage,
    type TRImage
} from '../../model/image';

export class StretchNode extends BaseNode {
    readonly typeId = 'images.stretch';
    readonly displayName = 'Stretch';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Image', outputType: 'images:image' }
    ];

    readonly properties: PropertyDefinition[] = [
        {
            name: 'stretch',
            label: 'Stretch Function',
            type: 'select',
            defaultValue: 'asinh',
            options: [
                { label: 'Linear', value: 'linear' },
                { label: 'Square Root', value: 'sqrt' },
                { label: 'Logarithmic', value: 'log' },
                { label: 'Inverse Hyperbolic Sine (Asinh)', value: 'asinh' },
                { label: 'Gamma', value: 'gamma' }
            ]
        },
        {
            name: 'interval',
            label: 'Interval',
            type: 'select',
            defaultValue: 'percentile',
            options: [
                { label: 'Percentile (0.5% - 99.5%)', value: 'percentile' },
                { label: 'Min / Max', value: 'minmax' },
                { label: 'Auto (Range)', value: 'auto' },
                { label: 'Manual', value: 'manual' }
            ]
        },
        { name: 'pLow', label: 'Percentile Low', type: 'number', defaultValue: 0.5, min: 0, step: 0.1 },
        { name: 'pHigh', label: 'Percentile High', type: 'number', defaultValue: 99.5, min: 0, step: 0.1 },
        { name: 'lo', label: 'Manual Low', type: 'number', defaultValue: 0 },
        { name: 'hi', label: 'Manual High', type: 'number', defaultValue: 1 },
        { name: 'gamma', label: 'Gamma', type: 'number', defaultValue: 2.2, min: 0.1, step: 0.1 },
        {
            name: 'outputType',
            label: 'Output Type',
            type: 'select',
            defaultValue: 'float32',
            options: [
                { label: 'float32 (0.0 .. 1.0)', value: 'float32' },
                { label: 'uint8 (0 .. 255)', value: 'uint8' },
                { label: 'uint16 (0 .. 65535)', value: 'uint16' }
            ]
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const kind = String(properties['stretch'] || 'asinh') as StretchKind;
        const intervalKind = String(properties['interval'] || 'percentile') as IntervalKind;
        const gamma = Number(properties['gamma']) || 2.2;
        const outType = String(properties['outputType'] || 'float32') as 'float32' | 'uint8' | 'uint16';

        const [lo, hi] = resolveInterval(image, intervalKind, {
            lo: Number(properties['lo']),
            hi: Number(properties['hi']),
            pLow: Number(properties['pLow']),
            pHigh: Number(properties['pHigh'])
        });

        const span = hi - lo || 1;
        const fn = stretchFn(kind, gamma);

        const { width, height, channels, data } = image;
        const outData = allocate(outType, data.length);
        const maxVal = outType === 'uint8' ? 255 : outType === 'uint16' ? 65535 : 1;

        for (let i = 0; i < data.length; i++) {
            const v = data[i];
            if (v !== v) {
                outData[i] = 0;
                continue;
            }
            const norm = (v - lo) / span;
            const clamped = norm < 0 ? 0 : norm > 1 ? 1 : norm;
            const stretched = fn(clamped);
            outData[i] = outType === 'float32' ? stretched : Math.round(stretched * maxVal);
        }

        const stretchedImage = createImage({
            width,
            height,
            model: image.model,
            dtype: outType,
            data: outData,
            range: [0, maxVal],
            meta: {
                ...image.meta,
                history: [...image.meta.history, `Stretched (${kind}, interval=[${lo.toFixed(2)}, ${hi.toFixed(2)}])`]
            }
        });

        return { Image: stretchedImage };
    }
}
