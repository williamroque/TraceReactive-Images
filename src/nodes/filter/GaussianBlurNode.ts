import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { gaussianBlur } from '../../core/filters';
import { isImage, type TRImage } from '../../model/image';

export class GaussianBlurNode extends BaseNode {
    readonly typeId = 'images.gaussian-blur';
    readonly displayName = 'Gaussian Blur';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Image', outputType: 'images:image' }
    ];

    readonly properties: PropertyDefinition[] = [
        { name: 'sigma', label: 'Sigma (Radius)', type: 'number', defaultValue: 2, min: 0.1, step: 0.5 }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const sigma = Math.max(0, Number(properties['sigma']) || 2);

        try {
            const blurred = gaussianBlur(image, sigma);
            return { Image: blurred };
        } catch (err) {
            console.error('GaussianBlurNode error:', err);
            return {};
        }
    }
}
