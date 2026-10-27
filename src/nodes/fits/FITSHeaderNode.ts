import { BaseNode } from '@tracereactive/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@tracereactive/types';
import { ImagesCategory } from '../../categories';
import { toTable } from '../../interop/dataframe';
import { isImage, type TRImage } from '../../model/image';

export class FITSHeaderNode extends BaseNode {
    readonly typeId = 'images.fits-header';
    readonly displayName = 'FITS Header';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Header', outputType: 'core:dataframe' }
    ];

    readonly properties: PropertyDefinition[] = [];

    async evaluate(inputs: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'] as TRImage;
        if (!isImage(image)) return {};

        const cards = image.meta.fits?.cards;
        if (!cards || cards.length === 0) {
            return {
                Header: toTable([{ keyword: 'STATUS', value: 'No FITS metadata available' }])
            };
        }

        const rows = cards.map(c => ({
            keyword: c.key,
            value: c.value === null || c.value === undefined ? '' : String(c.value),
            comment: c.comment ?? ''
        }));

        return { Header: toTable(rows) };
    }
}
