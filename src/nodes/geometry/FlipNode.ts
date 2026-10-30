import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { flipImage } from '../../core/geometry';
import { isImage, type TRImage } from '../../model/image';

export class FlipNode extends BaseNode {
    readonly typeId = 'images.flip';
    readonly displayName = 'Flip';
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
            name: 'direction',
            label: 'Direction',
            type: 'select',
            defaultValue: 'horizontal',
            options: [
                { label: 'Horizontal (left / right)', value: 'horizontal' },
                { label: 'Vertical (top / bottom)', value: 'vertical' }
            ]
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const direction = (properties['direction'] === 'vertical' ? 'vertical' : 'horizontal') as 'horizontal' | 'vertical';

        try {
            const flipped = flipImage(image, direction);
            return { Image: flipped };
        } catch (err) {
            console.error('FlipNode error:', err);
            return {};
        }
    }
}
