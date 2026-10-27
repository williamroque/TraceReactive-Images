import { ExecuteNode } from '@tracereactive/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@tracereactive/types';
import { ImagesCategory } from '../../categories';
import { decodeFile } from '../../codecs/registry';
import { errorTable, recordToTable } from '../../interop/dataframe';
import { readBytes } from '../../io/files';
import { describeImage } from '../../model/image';

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'avif', 'fits', 'fit', 'fts', 'gz'];

export class ReadImageNode extends ExecuteNode {
    readonly typeId = 'images.read';
    readonly displayName = 'Read Image';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Path', acceptsType: 'core:path' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Image', outputType: 'images:image' },
        { name: 'Frames', outputType: 'images:image-array' },
        { name: 'Info', outputType: 'core:dataframe' }
    ];

    readonly properties: PropertyDefinition[] = [
        {
            name: 'filePath',
            label: 'File path',
            type: 'filepath',
            defaultValue: '',
            filters: [{ name: 'Images', extensions: IMAGE_EXTENSIONS }]
        },
        {
            name: 'frame',
            label: 'Frame',
            type: 'number',
            defaultValue: 0,
            min: 0,
            step: 1
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const path = (inputs['Path'] as string) || (properties['filePath'] as string);
        if (!path) return {};

        try {
            const bytes = await readBytes(path);
            const decoded = await decodeFile(bytes, { path });
            const requested = Math.floor(Number(properties['frame']) || 0);
            const index = Math.min(Math.max(requested, 0), decoded.images.length - 1);
            const image = decoded.images[index];
            image.meta.source = { ...image.meta.source, format: image.meta.source?.format ?? 'unknown', path, frame: index };

            return {
                Image: image,
                Frames: decoded.images,
                Info: recordToTable({ ...decoded.info, frames: decoded.images.length, ...describeImage(image) })
            };
        } catch (err) {
            console.error('Failed to read image:', err);
            return { Info: errorTable(err) };
        }
    }
}
