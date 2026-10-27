import { BaseNode } from '@tracereactive/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@tracereactive/types';
import { ImagesCategory } from '../../categories';
import { applyColormap, type ColormapName } from '../../core/colormap';
import type { IntervalKind, StretchKind } from '../../core/scale';
import { isImage, type TRImage } from '../../model/image';

export class ColormapNode extends BaseNode {
    readonly typeId = 'images.colormap';
    readonly displayName = 'Colormap';
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
            name: 'colormap',
            label: 'Colormap',
            type: 'select',
            defaultValue: 'viridis',
            options: [
                { label: 'Viridis (Matplotlib Default)', value: 'viridis' },
                { label: 'Plasma', value: 'plasma' },
                { label: 'Inferno', value: 'inferno' },
                { label: 'Magma', value: 'magma' },
                { label: 'Turbo (Google AI)', value: 'turbo' },
                { label: 'Cubehelix (Astronomy Standard)', value: 'cubehelix' },
                { label: 'Coolwarm (Diverging)', value: 'coolwarm' },
                { label: 'Heat / Thermal', value: 'heat' },
                { label: 'Jet / Rainbow', value: 'jet' },
                { label: 'Cool (Cyan-Magenta)', value: 'cool' },
                { label: 'Bone', value: 'bone' },
                { label: 'Copper', value: 'copper' },
                { label: 'Cividis (Colorblind Safe)', value: 'cividis' },
                { label: 'Greys', value: 'greys' }
            ]
        },
        {
            name: 'invert',
            label: 'Invert Colormap',
            type: 'boolean',
            defaultValue: false
        },
        {
            name: 'stretch',
            label: 'Pre-Stretch Function',
            type: 'select',
            defaultValue: 'linear',
            options: [
                { label: 'Linear', value: 'linear' },
                { label: 'Inverse Hyperbolic Sine (Asinh)', value: 'asinh' },
                { label: 'Square Root', value: 'sqrt' },
                { label: 'Logarithmic', value: 'log' },
                { label: 'Gamma', value: 'gamma' }
            ]
        },
        {
            name: 'interval',
            label: 'Interval Scaling',
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
            name: 'nanColor',
            label: 'NaN / Nodata Color',
            type: 'select',
            defaultValue: 'black',
            options: [
                { label: 'Black', value: 'black' },
                { label: 'White', value: 'white' },
                { label: 'Transparent', value: 'transparent' }
            ]
        },
        {
            name: 'outputModel',
            label: 'Color Channels',
            type: 'select',
            defaultValue: 'rgb',
            options: [
                { label: 'RGB (3 channels)', value: 'rgb' },
                { label: 'RGBA (4 channels)', value: 'rgba' }
            ]
        },
        {
            name: 'outputType',
            label: 'Output Type',
            type: 'select',
            defaultValue: 'uint8',
            options: [
                { label: 'uint8 (0 .. 255)', value: 'uint8' },
                { label: 'float32 (0.0 .. 1.0)', value: 'float32' }
            ]
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const colormap = String(properties['colormap'] || 'viridis') as ColormapName;
        const invert = Boolean(properties['invert']);
        const stretch = String(properties['stretch'] || 'linear') as StretchKind;
        const interval = String(properties['interval'] || 'percentile') as IntervalKind;
        const gamma = Number(properties['gamma']) || 2.2;
        const nanColor = String(properties['nanColor'] || 'black') as 'black' | 'white' | 'transparent';
        const outputModel = (nanColor === 'transparent' ? 'rgba' : String(properties['outputModel'] || 'rgb')) as 'rgb' | 'rgba';
        const outputType = String(properties['outputType'] || 'uint8') as 'uint8' | 'float32';

        const result = applyColormap(image, {
            colormap,
            invert,
            stretch,
            interval,
            intervalOptions: {
                lo: Number(properties['lo']),
                hi: Number(properties['hi']),
                pLow: Number(properties['pLow']),
                pHigh: Number(properties['pHigh'])
            },
            gamma,
            nanColor,
            outputModel,
            outputType
        });

        return { Image: result };
    }
}
