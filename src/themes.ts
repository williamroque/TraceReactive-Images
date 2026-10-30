import type { ThemeSection } from '@gravitydock/types';

export const ImageThemeSections: ThemeSection[] = [
    {
        name: 'Images: Montage',
        packageId: 'com.gravitydock.images',
        variables: [
            {
                key: 'montagePadding',
                label: 'Tile padding (px)',
                type: 'number',
                defaultValue: '4',
                section: 'Images: Montage',
                packageId: 'com.gravitydock.images'
            },
            {
                key: 'montageBackground',
                label: 'Background color',
                type: 'color',
                defaultValue: '#000000',
                section: 'Images: Montage',
                packageId: 'com.gravitydock.images'
            },
            {
                key: 'montageTileWidth',
                label: 'Tile width (px)',
                type: 'number',
                defaultValue: '0',
                section: 'Images: Montage',
                packageId: 'com.gravitydock.images'
            },
            {
                key: 'montageTileHeight',
                label: 'Tile height (px)',
                type: 'number',
                defaultValue: '0',
                section: 'Images: Montage',
                packageId: 'com.gravitydock.images'
            }
        ]
    }
];
