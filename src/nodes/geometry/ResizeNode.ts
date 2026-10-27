import { BaseNode } from '@tracereactive/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@tracereactive/types';
import { ImagesCategory } from '../../categories';
import { resizeBilinear } from '../../core/geometry';
import { isImage, type TRImage } from '../../model/image';

export class ResizeNode extends BaseNode {
    readonly typeId = 'images.resize';
    readonly displayName = 'Resize';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Image', outputType: 'images:image' }
    ];

    readonly properties: PropertyDefinition[] = [
        { name: 'width', label: 'Width', type: 'number', defaultValue: 512, min: 1 },
        { name: 'height', label: 'Height', type: 'number', defaultValue: 512, min: 1 }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const width = Math.max(1, Math.floor(Number(properties['width']) || image.width));
        const height = Math.max(1, Math.floor(Number(properties['height']) || image.height));

        try {
            const resized = resizeBilinear(image, width, height);
            return { Image: resized };
        } catch (err) {
            console.error('ResizeNode error:', err);
            return {};
        }
    }
}
