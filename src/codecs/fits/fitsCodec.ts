import { FITS } from 'fitsjs-ng';
import { createImage, type TRImage } from '../../model/image';
import { assertPixelLimit } from '../../runtime';
import type { DecodeOptions, DecodedFile, EncodeOptions, ImageCodec } from '../registry';
import { extractWcs, parseHeaderCards } from './header';
import { flipY, resolveBitpix } from './mapping';
import { encodeFitsImage } from './writer';

const FITS_MAGIC = 'SIMPLE  =';

export const fitsCodec: ImageCodec = {
    id: 'fits',
    label: 'FITS',
    extensions: ['fits', 'fit', 'fts'],
    mimeTypes: ['image/fits', 'application/fits'],
    capabilities: {
        dtypes: ['uint8', 'uint16', 'int16', 'int32', 'float32', 'float64'],
        models: ['gray'],
        multiFrame: true,
        lossless: true
    },
    sniff: (head) => {
        if (head.length < 9) return false;
        for (let i = 0; i < FITS_MAGIC.length; i++) {
            if (head[i] !== FITS_MAGIC.charCodeAt(i)) return false;
        }
        return true;
    },
    decode: async (bytes: Uint8Array, options: DecodeOptions): Promise<DecodedFile> => {
        const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
        const fits = FITS.fromArrayBuffer(arrayBuffer);

        const images: TRImage[] = [];
        const labels: string[] = [];
        const info: Record<string, unknown> = {
            format: 'fits',
            hduCount: fits.hdus.length
        };

        for (let hduIndex = 0; hduIndex < fits.hdus.length; hduIndex++) {
            const hdu = fits.hdus[hduIndex];
            const header = hdu.header;
            const dataUnit = hdu.data;

            if (!dataUnit) continue;

            const naxis = Number(header?.get?.('NAXIS') ?? 0);
            if (naxis < 2) continue;

            const width = Number(header?.get?.('NAXIS1') ?? 0);
            const height = Number(header?.get?.('NAXIS2') ?? 0);
            const depth = naxis >= 3 ? Math.max(1, Number(header?.get?.('NAXIS3') ?? 1)) : 1;

            if (width <= 0 || height <= 0) continue;
            assertPixelLimit(width, height);

            const cards = parseHeaderCards(header);
            const wcs = extractWcs(header);
            const extname = String(header?.get?.('EXTNAME') ?? `HDU_${hduIndex}`);
            const mapping = resolveBitpix(header);

            for (let frameIndex = 0; frameIndex < depth; frameIndex++) {
                let rawFrame: any;
                if (typeof (dataUnit as any).getFrame === 'function') {
                    rawFrame = await (dataUnit as any).getFrame(frameIndex);
                } else if (typeof (dataUnit as any).getFrameAsNumber === 'function') {
                    rawFrame = await (dataUnit as any).getFrameAsNumber(frameIndex);
                }

                if (!rawFrame) continue;

                let pixelData = rawFrame;
                if (mapping.applyLinearScaling) {
                    const scaled = new Float32Array(rawFrame.length);
                    const bscale = mapping.bscale;
                    const bzero = mapping.bzero;
                    for (let i = 0; i < rawFrame.length; i++) {
                        scaled[i] = rawFrame[i] * bscale + bzero;
                    }
                    pixelData = scaled;
                }

                const flipped = flipY(pixelData, width, height, 1);

                const image = createImage({
                    width,
                    height,
                    model: 'gray',
                    dtype: mapping.dtype,
                    data: flipped,
                    nodata: mapping.nodata,
                    meta: {
                        source: {
                            format: 'fits',
                            path: options.path,
                            hdu: hduIndex,
                            frame: frameIndex
                        },
                        fits: {
                            cards,
                            extname,
                            flippedY: true,
                            cubeIndex: depth > 1 ? frameIndex : undefined,
                            wcs
                        },
                        history: []
                    }
                });

                images.push(image);
                labels.push(depth > 1 ? `${extname} (Frame ${frameIndex + 1})` : extname);
            }
        }

        if (images.length === 0) {
            throw new Error('FITS file does not contain any readable 2D image HDUs.');
        }

        return { images, labels, info };
    },
    encode: async (images: TRImage[], _options: EncodeOptions): Promise<Uint8Array> => {
        if (images.length === 0) {
            throw new Error('No images provided for FITS export.');
        }
        return encodeFitsImage(images[0]);
    }
};
