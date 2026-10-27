import {
    allocate,
    createImage,
    type ColorModel,
    type PixelBuffer,
    type PixelDType,
    type TRImage
} from '../model/image';

export function cropImage(image: TRImage, x: number, y: number, width: number, height: number): TRImage {
    const rx = Math.max(0, Math.min(image.width - 1, Math.floor(x)));
    const ry = Math.max(0, Math.min(image.height - 1, Math.floor(y)));
    const rw = Math.max(1, Math.min(image.width - rx, Math.floor(width)));
    const rh = Math.max(1, Math.min(image.height - ry, Math.floor(height)));

    const channels = image.channels;
    const outData = allocate(image.dtype, rw * rh * channels);
    const srcRowBytes = image.width * channels;
    const dstRowBytes = rw * channels;

    for (let row = 0; row < rh; row++) {
        const srcOffset = ((ry + row) * image.width + rx) * channels;
        const dstOffset = row * dstRowBytes;
        outData.set((image.data as any).subarray(srcOffset, srcOffset + dstRowBytes), dstOffset);
    }

    let wcs = image.meta.fits?.wcs;
    if (wcs) {
        wcs = {
            ...wcs,
            crpix: [wcs.crpix[0] - rx, wcs.crpix[1] - ry]
        };
    }

    return createImage({
        width: rw,
        height: rh,
        model: image.model,
        dtype: image.dtype,
        data: outData,
        range: image.range,
        nodata: image.nodata,
        meta: {
            ...image.meta,
            fits: image.meta.fits ? { ...image.meta.fits, wcs } : undefined,
            history: [...image.meta.history, `Cropped to [${rx}, ${ry}, ${rw}, ${rh}]`]
        }
    });
}

export function flipImage(image: TRImage, direction: 'horizontal' | 'vertical'): TRImage {
    const { width, height, channels, data } = image;
    const outData = allocate(image.dtype, data.length);
    const isHorizontal = direction === 'horizontal';

    for (let y = 0; y < height; y++) {
        const targetY = isHorizontal ? y : height - 1 - y;
        for (let x = 0; x < width; x++) {
            const targetX = isHorizontal ? width - 1 - x : x;
            const srcIdx = (y * width + x) * channels;
            const dstIdx = (targetY * width + targetX) * channels;
            for (let c = 0; c < channels; c++) {
                outData[dstIdx + c] = data[srcIdx + c];
            }
        }
    }

    return createImage({
        width,
        height,
        model: image.model,
        dtype: image.dtype,
        data: outData,
        range: image.range,
        nodata: image.nodata,
        meta: {
            ...image.meta,
            history: [...image.meta.history, `Flipped ${direction}`]
        }
    });
}

export function rotate90(image: TRImage, times: 1 | 2 | 3): TRImage {
    if (times === 2) {
        const h = flipImage(image, 'horizontal');
        return flipImage(h, 'vertical');
    }

    const { width, height, channels, data } = image;
    const outW = height;
    const outH = width;
    const outData = allocate(image.dtype, data.length);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const srcIdx = (y * width + x) * channels;
            let targetX: number;
            let targetY: number;

            if (times === 1) { // 90 deg clockwise
                targetX = height - 1 - y;
                targetY = x;
            } else { // 270 deg clockwise (90 counter-clockwise)
                targetX = y;
                targetY = width - 1 - x;
            }

            const dstIdx = (targetY * outW + targetX) * channels;
            for (let c = 0; c < channels; c++) {
                outData[dstIdx + c] = data[srcIdx + c];
            }
        }
    }

    return createImage({
        width: outW,
        height: outH,
        model: image.model,
        dtype: image.dtype,
        data: outData,
        range: image.range,
        nodata: image.nodata,
        meta: {
            ...image.meta,
            history: [...image.meta.history, `Rotated ${times * 90} deg`]
        }
    });
}

export function resizeBilinear(image: TRImage, newWidth: number, newHeight: number): TRImage {
    const { width, height, channels, data } = image;
    const outData = allocate(image.dtype, newWidth * newHeight * channels);

    const xRatio = width > 1 ? (width - 1) / (newWidth - 1 || 1) : 0;
    const yRatio = height > 1 ? (height - 1) / (newHeight - 1 || 1) : 0;

    for (let y = 0; y < newHeight; y++) {
        const srcY = y * yRatio;
        const yL = Math.floor(srcY);
        const yH = Math.min(height - 1, Math.ceil(srcY));
        const yWeight = srcY - yL;

        for (let x = 0; x < newWidth; x++) {
            const srcX = x * xRatio;
            const xL = Math.floor(srcX);
            const xH = Math.min(width - 1, Math.ceil(srcX));
            const xWeight = srcX - xL;

            const dstIdx = (y * newWidth + x) * channels;

            for (let c = 0; c < channels; c++) {
                const a = data[(yL * width + xL) * channels + c];
                const b = data[(yL * width + xH) * channels + c];
                const d = data[(yH * width + xL) * channels + c];
                const e = data[(yH * width + xH) * channels + c];

                const interp = (a * (1 - xWeight) + b * xWeight) * (1 - yWeight) +
                               (d * (1 - xWeight) + e * xWeight) * yWeight;

                outData[dstIdx + c] = interp;
            }
        }
    }

    return createImage({
        width: newWidth,
        height: newHeight,
        model: image.model,
        dtype: image.dtype,
        data: outData,
        range: image.range,
        nodata: image.nodata,
        meta: {
            ...image.meta,
            history: [...image.meta.history, `Resized to ${newWidth}x${newHeight}`]
        }
    });
}
