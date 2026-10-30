import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { cropImage } from '../../core/geometry';
import { isImage, type TRImage } from '../../model/image';

export class CropNode extends BaseNode {
    readonly typeId = 'images.crop';
    readonly displayName = 'Crop';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Image', outputType: 'images:image' }
    ];

    readonly properties: PropertyDefinition[] = [
        { name: 'x', label: 'X (left)', type: 'number', defaultValue: 0, min: 0 },
        { name: 'y', label: 'Y (top)', type: 'number', defaultValue: 0, min: 0 },
        { name: 'width', label: 'Width', type: 'number', defaultValue: 512, min: 1 },
        { name: 'height', label: 'Height', type: 'number', defaultValue: 512, min: 1 }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const x = Number(properties['x']) || 0;
        const y = Number(properties['y']) || 0;
        const width = Number(properties['width']) || image.width;
        const height = Number(properties['height']) || image.height;

        try {
            const cropped = cropImage(image, x, y, width, height);
            return { Image: cropped };
        } catch (err) {
            console.error('CropNode error:', err);
            return {};
        }
    }
}
