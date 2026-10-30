import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { convertModel } from '../../core/convert';
import { isImage } from '../../model/image';

export class ToGrayscaleNode extends BaseNode {
    readonly typeId = 'images.to-grayscale';
    readonly displayName = 'To Grayscale';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Image', outputType: 'images:image' }
    ];

    readonly properties: PropertyDefinition[] = [];

    async evaluate(inputs: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'];
        if (!isImage(image)) return {};

        try {
            const gray = convertModel(image, 'gray');
            return { Image: gray };
        } catch (err) {
            console.error('ToGrayscaleNode error:', err);
            return {};
        }
    }
}
