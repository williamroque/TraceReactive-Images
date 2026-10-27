import type { ThemeSection } from '@tracereactive/types';

export const ImageThemeSections: ThemeSection[] = [
    {
        name: 'Images: Montage',
        packageId: 'com.tracereactive.images',
        variables: [
            {
                key: 'montagePadding',
                label: 'Tile padding (px)',
                type: 'number',
                defaultValue: '4',
                section: 'Images: Montage',
                packageId: 'com.tracereactive.images'
            },
            {
                key: 'montageBackground',
                label: 'Background color',
                type: 'color',
                defaultValue: '#000000',
                section: 'Images: Montage',
                packageId: 'com.tracereactive.images'
            },
            {
                key: 'montageTileWidth',
                label: 'Tile width (px)',
                type: 'number',
                defaultValue: '0',
                section: 'Images: Montage',
                packageId: 'com.tracereactive.images'
            },
            {
                key: 'montageTileHeight',
                label: 'Tile height (px)',
                type: 'number',
                defaultValue: '0',
                section: 'Images: Montage',
                packageId: 'com.tracereactive.images'
            }
        ]
    }
];
