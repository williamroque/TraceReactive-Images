import {
    allocate,
    createImage,
    type TRImage
} from '../model/image';

function makeGaussianKernel(sigma: number): Float32Array {
    const radius = Math.max(1, Math.ceil(sigma * 3));
    const size = radius * 2 + 1;
    const kernel = new Float32Array(size);
    const twoSigmaSq = 2 * sigma * sigma;
    let sum = 0;

    for (let i = 0; i < size; i++) {
        const x = i - radius;
        const val = Math.exp(-(x * x) / twoSigmaSq);
        kernel[i] = val;
        sum += val;
    }

    for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
    }

    return kernel;
}

export function gaussianBlur(image: TRImage, sigma: number): TRImage {
    if (sigma <= 0) return image;

    const kernel = makeGaussianKernel(sigma);
    const radius = Math.floor(kernel.length / 2);
    const { width, height, channels, data } = image;

    const temp = new Float32Array(width * height * channels);
    const outData = allocate(image.dtype, data.length);

    // Horizontal pass
    for (let y = 0; y < height; y++) {
        const rowOffset = y * width;
        for (let x = 0; x < width; x++) {
            for (let c = 0; c < channels; c++) {
                let sum = 0;
                for (let k = -radius; k <= radius; k++) {
                    const sampleX = Math.min(width - 1, Math.max(0, x + k));
                    const val = data[(rowOffset + sampleX) * channels + c];
                    sum += val * kernel[k + radius];
                }
                temp[(rowOffset + x) * channels + c] = sum;
            }
        }
    }

    // Vertical pass
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            for (let c = 0; c < channels; c++) {
                let sum = 0;
                for (let k = -radius; k <= radius; k++) {
                    const sampleY = Math.min(height - 1, Math.max(0, y + k));
                    const val = temp[(sampleY * width + x) * channels + c];
                    sum += val * kernel[k + radius];
                }
                outData[(y * width + x) * channels + c] = sum;
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
            history: [...image.meta.history, `Gaussian blur (sigma=${sigma})`]
        }
    });
}
