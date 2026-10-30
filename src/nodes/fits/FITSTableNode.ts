import { ExecuteNode } from '@gravitydock/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@gravitydock/types';
import { FITS } from 'fitsjs-ng';
import { ImagesCategory } from '../../categories';
import { errorTable, toTable } from '../../interop/dataframe';
import { readBytes } from '../../io/files';

export class FITSTableNode extends ExecuteNode {
    readonly typeId = 'images.fits-table';
    readonly displayName = 'FITS Table to Dataframe';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Path', acceptsType: 'core:path' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Table', outputType: 'core:dataframe' }
    ];

    readonly properties: PropertyDefinition[] = [
        {
            name: 'filePath',
            label: 'File path',
            type: 'filepath',
            defaultValue: '',
            filters: [{ name: 'FITS files', extensions: ['fits', 'fit', 'fts'] }]
        },
        {
            name: 'hduIndex',
            label: 'HDU Index',
            type: 'number',
            defaultValue: 1,
            min: 0,
            step: 1
        }
    ];

    async evaluate(inputs: Record<string, any>, properties: Record<string, any>): Promise<Record<string, any>> {
        const path = (inputs['Path'] as string) || (properties['filePath'] as string);
        if (!path) return {};

        try {
            const bytes = await readBytes(path);
            const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
            const fits = FITS.fromArrayBuffer(arrayBuffer);

            const hduIndex = Math.max(0, Math.floor(Number(properties['hduIndex']) || 1));
            if (hduIndex >= fits.hdus.length) {
                throw new Error(`HDU index ${hduIndex} out of bounds (file has ${fits.hdus.length} HDUs).`);
            }

            const hdu = fits.hdus[hduIndex];
            const dataUnit = hdu.data;

            if (!dataUnit || typeof (dataUnit as any).getRows !== 'function') {
                throw new Error(`HDU ${hduIndex} is not a tabular HDU (TABLE or BINTABLE).`);
            }

            const rowCount = (dataUnit as any).rows ?? 1000;
            const rows = await (dataUnit as any).getRows(0, rowCount);

            return { Table: toTable(rows) };
        } catch (err) {
            console.error('FITSTableNode error:', err);
            return { Table: errorTable(err) };
        }
    }
}
