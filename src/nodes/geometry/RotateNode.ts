import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { rotate90 } from '../../core/geometry';
import { isImage, type TRImage } from '../../model/image';

export class RotateNode extends BaseNode {
    readonly typeId = 'images.rotate';
    readonly displayName = 'Rotate';
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
            name: 'angle',
            label: 'Angle',
            type: 'select',
            defaultValue: '90',
            options: [
                { label: '90° Clockwise', value: '90' },
                { label: '180°', value: '180' },
                { label: '270° Clockwise (90° Counter-Clockwise)', value: '270' }
            ]
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const angle = String(properties['angle'] || '90');
        const times: 1 | 2 | 3 = angle === '180' ? 2 : angle === '270' ? 3 : 1;

        try {
            const rotated = rotate90(image, times);
            return { Image: rotated };
        } catch (err) {
            console.error('RotateNode error:', err);
            return {};
        }
    }
}
