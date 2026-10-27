import {
    allocate,
    createImage,
    isFloatDType,
    type TRImage
} from '../model/image';

export type MathOp = 'add' | 'subtract' | 'multiply' | 'divide';

export function imageArithmetic(
    a: TRImage,
    b: TRImage | number,
    op: MathOp
): TRImage {
    const isScalar = typeof b === 'number';
    const bImg = isScalar ? null : (b as TRImage);

    if (bImg && (a.width !== bImg.width || a.height !== bImg.height || a.channels !== bImg.channels)) {
        throw new Error('Images must have identical dimensions and channel counts for arithmetic operations.');
    }

    const { width, height, channels, data: dataA } = a;
    const length = dataA.length;
    const dataB = bImg ? bImg.data : null;

    const useFloat = isFloatDType(a.dtype) || (bImg && isFloatDType(bImg.dtype)) || isScalar;
    const outDType = useFloat ? (a.dtype === 'float64' || (bImg && bImg.dtype === 'float64') ? 'float64' : 'float32') : a.dtype;
    const outData = allocate(outDType, length);

    for (let i = 0; i < length; i++) {
        const valA = dataA[i];
        const valB = isScalar ? (b as number) : dataB![i];

        let res = 0;
        switch (op) {
            case 'add':
                res = valA + valB;
                break;
            case 'subtract':
                res = valA - valB;
                break;
            case 'multiply':
                res = valA * valB;
                break;
            case 'divide':
                res = valB !== 0 ? valA / valB : 0;
                break;
        }

        outData[i] = res;
    }

    return createImage({
        width,
        height,
        model: a.model,
        dtype: outDType,
        data: outData,
        nodata: a.nodata,
        meta: {
            ...a.meta,
            history: [...a.meta.history, `Arithmetic ${op} with ${isScalar ? b : 'image'}`]
        }
    });
}
