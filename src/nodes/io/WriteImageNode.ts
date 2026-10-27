import { ExecuteNode } from '@tracereactive/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@tracereactive/types';
import { ImagesCategory } from '../../categories';
import { codecForExtension, getCodec } from '../../codecs/registry';
import { prepareForEncode, type MismatchPolicy } from '../../core/convert';
import { errorTable, recordToTable } from '../../interop/dataframe';
import { writeBytes } from '../../io/files';
import { isImage } from '../../model/image';

export class WriteImageNode extends ExecuteNode {
    readonly typeId = 'images.write';
    readonly displayName = 'Write Image';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' },
        { name: 'Path', acceptsType: 'core:path' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Success', outputType: 'core:boolean' },
        { name: 'Info', outputType: 'core:dataframe' }
    ];

    readonly properties: PropertyDefinition[] = [
        { name: 'filePath', label: 'Output file path', type: 'filepath', defaultValue: '' },
        {
            name: 'format',
            label: 'Format',
            type: 'select',
            defaultValue: 'auto',
            options: [
                { label: 'Auto (from extension)', value: 'auto' },
                { label: 'FITS', value: 'fits' },
                { label: 'PNG', value: 'png' },
                { label: 'JPEG', value: 'jpeg' },
                { label: 'WebP', value: 'webp' }
            ]
        },
        { name: 'quality', label: 'Quality (lossy formats)', type: 'number', defaultValue: 0.92, min: 0.01, step: 0.01 },
        {
            name: 'onMismatch',
            label: 'If the format cannot hold the pixels',
            type: 'select',
            defaultValue: 'auto',
            options: [
                { label: 'Auto (scale by known range)', value: 'auto' },
                { label: 'Fail', value: 'error' },
                { label: 'Normalize (min/max)', value: 'normalize' },
                { label: 'Clamp', value: 'clamp' }
            ]
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'];
        const path = (inputs['Path'] as string) || (properties['filePath'] as string);
        if (!isImage(image) || !path) return {};

        try {
            const requested = String(properties['format'] || 'auto');
            const codec = requested === 'auto' ? codecForExtension(path) : getCodec(requested);
            if (!codec) throw new Error('Cannot infer the output format. Use a known file extension or choose a format.');
            if (!codec.encode) throw new Error(`${codec.label} export is not supported.`);

            const policy = String(properties['onMismatch'] || 'auto') as MismatchPolicy;
            const prepared = prepareForEncode(image, codec.capabilities, policy, codec.label);
            const bytes = await codec.encode([prepared.image], { quality: Number(properties['quality']) });
            await writeBytes(path, bytes);

            const record: Record<string, unknown> = {
                status: 'ok',
                path,
                format: codec.id,
                bytes: bytes.length
            };
            prepared.notes.forEach((note, i) => { record[`conversion ${i + 1}`] = note; });
            return { Success: true, Info: recordToTable(record) };
        } catch (err) {
            console.error('Failed to write image:', err);
            return { Success: false, Info: errorTable(err) };
        }
    }
}
