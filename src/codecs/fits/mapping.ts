import {
    allocate,
    type PixelBuffer,
    type PixelDType,
    type TRImage
} from '../../model/image';

export function flipY(data: PixelBuffer, width: number, height: number, channels: number): PixelBuffer {
    const rowLength = width * channels;
    const out = allocate(
        data instanceof Uint8Array ? 'uint8' :
        data instanceof Uint16Array ? 'uint16' :
        data instanceof Int16Array ? 'int16' :
        data instanceof Int32Array ? 'int32' :
        data instanceof Float32Array ? 'float32' : 'float64',
        data.length
    );

    for (let y = 0; y < height; y++) {
        const srcOffset = y * rowLength;
        const dstOffset = (height - 1 - y) * rowLength;
        out.set((data as any).subarray(srcOffset, srcOffset + rowLength), dstOffset);
    }

    return out;
}

export interface BitpixMapping {
    dtype: PixelDType;
    applyLinearScaling: boolean;
    bscale: number;
    bzero: number;
    nodata?: number;
}

export function resolveBitpix(header: any): BitpixMapping {
    const bitpix = Number(header?.get?.('BITPIX') ?? 8);
    const bscale = Number(header?.get?.('BSCALE') ?? 1);
    const bzero = Number(header?.get?.('BZERO') ?? 0);
    const blank = header?.get?.('BLANK');
    const nodata = blank !== null && blank !== undefined ? Number(blank) : undefined;

    const hasNonTrivialScaling = bscale !== 1 || (bzero !== 0 && !(bitpix === 16 && bzero === 32768));

    if (hasNonTrivialScaling) {
        return {
            dtype: bitpix === -64 || bitpix === 64 ? 'float64' : 'float32',
            applyLinearScaling: true,
            bscale,
            bzero,
            nodata
        };
    }

    switch (bitpix) {
        case 8:
            return { dtype: 'uint8', applyLinearScaling: false, bscale: 1, bzero: 0, nodata };
        case 16:
            return bzero === 32768 && bscale === 1
                ? { dtype: 'uint16', applyLinearScaling: false, bscale: 1, bzero: 32768, nodata }
                : { dtype: 'int16', applyLinearScaling: false, bscale: 1, bzero: 0, nodata };
        case 32:
            return { dtype: 'int32', applyLinearScaling: false, bscale: 1, bzero: 0, nodata };
        case -32:
            return { dtype: 'float32', applyLinearScaling: false, bscale: 1, bzero: 0, nodata };
        case -64:
        case 64:
            return { dtype: 'float64', applyLinearScaling: false, bscale: 1, bzero: 0, nodata };
        default:
            return { dtype: 'float32', applyLinearScaling: false, bscale: 1, bzero: 0, nodata };
    }
}

export function bitpixForDType(dtype: PixelDType): { bitpix: number; bzero: number; bscale: number } {
    switch (dtype) {
        case 'uint8':
            return { bitpix: 8, bzero: 0, bscale: 1 };
        case 'uint16':
            return { bitpix: 16, bzero: 32768, bscale: 1 };
        case 'int16':
            return { bitpix: 16, bzero: 0, bscale: 1 };
        case 'int32':
            return { bitpix: 32, bzero: 0, bscale: 1 };
        case 'float32':
            return { bitpix: -32, bzero: 0, bscale: 1 };
        case 'float64':
            return { bitpix: -64, bzero: 0, bscale: 1 };
    }
}
