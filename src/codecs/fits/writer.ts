import type { TRImage } from '../../model/image';
import { formatCard } from './header';
import { bitpixForDType, flipY } from './mapping';

const FITS_BLOCK = 2880;

const STRUCTURAL_KEYWORDS = new Set([
    'SIMPLE',
    'BITPIX',
    'NAXIS',
    'NAXIS1',
    'NAXIS2',
    'NAXIS3',
    'EXTEND',
    'BZERO',
    'BSCALE',
    'END'
]);

export function encodeFitsImage(image: TRImage): Uint8Array {
    const { width, height, dtype } = image;
    const { bitpix, bzero, bscale } = bitpixForDType(dtype);

    const cards: string[] = [];
    cards.push(formatCard('SIMPLE', true, 'Conforms to FITS standard'));
    cards.push(formatCard('BITPIX', bitpix, 'Number of bits per pixel'));
    cards.push(formatCard('NAXIS', 2, '2D image'));
    cards.push(formatCard('NAXIS1', width, 'Width'));
    cards.push(formatCard('NAXIS2', height, 'Height'));
    cards.push(formatCard('EXTEND', true, 'File may contain extensions'));

    if (bscale !== 1) cards.push(formatCard('BSCALE', bscale, 'Linear factor'));
    if (bzero !== 0) cards.push(formatCard('BZERO', bzero, 'Zero offset'));

    if (image.meta.fits?.cards) {
        for (const card of image.meta.fits.cards) {
            if (STRUCTURAL_KEYWORDS.has(card.key.toUpperCase())) continue;
            cards.push(formatCard(card.key, card.value, card.comment));
        }
    }

    if (image.meta.history) {
        for (const h of image.meta.history) {
            cards.push(formatCard('HISTORY', h));
        }
    }

    cards.push(formatCard('END', null));

    let headerStr = '';
    for (const card of cards) {
        headerStr += card;
    }

    const headerRemainder = headerStr.length % FITS_BLOCK;
    if (headerRemainder !== 0) {
        headerStr = headerStr.padEnd(headerStr.length + (FITS_BLOCK - headerRemainder), ' ');
    }

    const headerBytes = new Uint8Array(headerStr.length);
    for (let i = 0; i < headerStr.length; i++) {
        headerBytes[i] = headerStr.charCodeAt(i) & 0xff;
    }

    const flippedData = flipY(image.data, width, height, image.channels);
    const pixelCount = width * height;
    const bytesPerPix = Math.abs(bitpix) / 8;
    const dataByteLength = pixelCount * bytesPerPix;
    const dataRemainder = dataByteLength % FITS_BLOCK;
    const dataPaddedLength = dataRemainder === 0 ? dataByteLength : dataByteLength + (FITS_BLOCK - dataRemainder);

    const dataBuffer = new ArrayBuffer(dataPaddedLength);
    const view = new DataView(dataBuffer);

    if (bitpix === 8) {
        const u8 = new Uint8Array(dataBuffer);
        u8.set(flippedData as Uint8Array);
    } else if (bitpix === 16) {
        const isUnsigned = bzero === 32768;
        for (let i = 0; i < pixelCount; i++) {
            const rawVal = flippedData[i];
            const val = isUnsigned ? (rawVal - 32768) : rawVal;
            view.setInt16(i * 2, val, false);
        }
    } else if (bitpix === 32) {
        for (let i = 0; i < pixelCount; i++) {
            view.setInt32(i * 4, flippedData[i], false);
        }
    } else if (bitpix === -32) {
        for (let i = 0; i < pixelCount; i++) {
            view.setFloat32(i * 4, flippedData[i], false);
        }
    } else if (bitpix === -64) {
        for (let i = 0; i < pixelCount; i++) {
            view.setFloat64(i * 8, flippedData[i], false);
        }
    }

    const totalBytes = new Uint8Array(headerBytes.length + dataPaddedLength);
    totalBytes.set(headerBytes, 0);
    totalBytes.set(new Uint8Array(dataBuffer), headerBytes.length);

    return totalBytes;
}
