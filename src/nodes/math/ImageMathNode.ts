import { BaseNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { ImagesCategory } from '../../categories';
import { imageArithmetic, type MathOp } from '../../core/math';
import { isImage, type TRImage } from '../../model/image';

export class ImageMathNode extends BaseNode {
    readonly typeId = 'images.math';
    readonly displayName = 'Image Math';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'A', acceptsType: 'images:image' },
        { name: 'B', acceptsType: ['images:image', 'core:number'] }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Result', outputType: 'images:image' }
    ];

    readonly properties: PropertyDefinition[] = [
        {
            name: 'operation',
            label: 'Operation',
            type: 'select',
            defaultValue: 'subtract',
            options: [
                { label: 'Add (A + B)', value: 'add' },
                { label: 'Subtract (A - B)', value: 'subtract' },
                { label: 'Multiply (A * B)', value: 'multiply' },
                { label: 'Divide (A / B)', value: 'divide' }
            ]
        },
        {
            name: 'scalarB',
            label: 'Scalar B (if B not connected)',
            type: 'number',
            defaultValue: 0
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const a = inputs['A'] as TRImage;
        if (!isImage(a)) return {};

        const bInput = inputs['B'];
        let b: TRImage | number;
        if (isImage(bInput)) {
            b = bInput;
        } else if (typeof bInput === 'number') {
            b = bInput;
        } else {
            b = Number(properties['scalarB']) || 0;
        }

        const op = String(properties['operation'] || 'subtract') as MathOp;

        try {
            const result = imageArithmetic(a, b, op);
            return { Result: result };
        } catch (err) {
            console.error('ImageMathNode error:', err);
            return {};
        }
    }
}
