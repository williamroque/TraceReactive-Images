import { imageStore } from './model/store';
import { isImage, isImageRef } from './model/image';

const isPlainContainer = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !ArrayBuffer.isView(value) && !(value instanceof ArrayBuffer);

export function wrapOutputs(value: unknown): unknown {
    if (isImage(value)) return imageStore.put(value);
    if (Array.isArray(value)) return value.map(wrapOutputs);
    if (!isPlainContainer(value) || '__arqueroData' in value) return value;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) result[key] = wrapOutputs(value[key]);
    return result;
}

export function unwrapInputs(value: unknown): unknown {
    if (isImageRef(value)) return imageStore.get(value);
    if (Array.isArray(value)) return value.map(unwrapInputs);
    if (!isPlainContainer(value) || '__arqueroData' in value) return value;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value)) result[key] = unwrapInputs(value[key]);
    return result;
}
