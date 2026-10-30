import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { convertDType, type ScaleMode } from '../../core/convert';
import { isImage, type PixelDType } from '../../model/image';

export class ConvertTypeNode extends BaseNode {
    readonly typeId = 'images.convert-type';
    readonly displayName = 'Convert Type';
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
            name: 'targetType',
            label: 'Target Type',
            type: 'select',
            defaultValue: 'uint8',
            options: [
                { label: 'uint8 (0 .. 255)', value: 'uint8' },
                { label: 'uint16 (0 .. 65535)', value: 'uint16' },
                { label: 'int16 (-32768 .. 32767)', value: 'int16' },
                { label: 'int32', value: 'int32' },
                { label: 'float32', value: 'float32' },
                { label: 'float64', value: 'float64' }
            ]
        },
        {
            name: 'scaleMode',
            label: 'Scaling Mode',
            type: 'select',
            defaultValue: 'range',
            options: [
                { label: 'Scale by known range', value: 'range' },
                { label: 'Normalize (min/max)', value: 'normalize' },
                { label: 'Clamp without scaling', value: 'clamp' }
            ]
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'];
        if (!isImage(image)) return {};

        const target = String(properties['targetType'] || 'uint8') as PixelDType;
        const mode = String(properties['scaleMode'] || 'range') as ScaleMode;

        try {
            const converted = convertDType(image, target, mode);
            return { Image: converted };
        } catch (err) {
            console.error('ConvertTypeNode error:', err);
            return {};
        }
    }
}
