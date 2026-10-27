import { BaseNode } from '@tracereactive/types';
import type { InputDefinition, OutputDefinition, PropertyDefinition } from '@tracereactive/types';
import { ImagesCategory } from '../../categories';
import { finiteMinMax } from '../../core/pixels';
import { recordToTable } from '../../interop/dataframe';
import { describeImage, isImage } from '../../model/image';

export class ImageInfoNode extends BaseNode {
    readonly typeId = 'images.info';
    readonly displayName = 'Image Info';
    readonly category = ImagesCategory;
    readonly visible = true;

    readonly inputs: InputDefinition[] = [
        { name: 'Image', acceptsType: 'images:image' }
    ];

    readonly outputs: OutputDefinition[] = [
        { name: 'Info', outputType: 'core:dataframe' },
        { name: 'Width', outputType: 'core:number' },
        { name: 'Height', outputType: 'core:number' },
        { name: 'Channels', outputType: 'core:number' }
    ];

    readonly properties: PropertyDefinition[] = [];

    async evaluate(inputs: Record<string, any>): Promise<Record<string, any>> {
        const image = inputs['Image'];
        if (!isImage(image)) return {};

        const info = describeImage(image);
        const mm = finiteMinMax(image);
        if (mm) {
            info.min = mm[0];
            info.max = mm[1];
        }
        image.meta.history.forEach((note, i) => { info[`history ${i + 1}`] = note; });

        return {
            Info: recordToTable(info),
            Width: image.width,
            Height: image.height,
            Channels: image.channels
        };
    }
}
