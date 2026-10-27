import type { TraceReactiveAPI } from '@tracereactive/types';
import { imageStore } from './model/store';

declare const traceReactive: TraceReactiveAPI;

export const limits = { maxPixels: 268435456 };

export async function initRuntime(): Promise<void> {
    const settings = (traceReactive as any).settings;
    if (!settings || typeof settings.get !== 'function') return;
    try {
        const maxPixels = Number(await settings.get('maxPixels'));
        if (Number.isFinite(maxPixels) && maxPixels > 0) limits.maxPixels = maxPixels;
        const budget = Number(await settings.get('memoryBudgetMB'));
        if (Number.isFinite(budget) && budget > 0) imageStore.setBudgetMB(budget);
    } catch (err) {
        console.error('Failed to load Images settings:', err);
    }
}

export function assertPixelLimit(width: number, height: number): void {
    if (width * height > limits.maxPixels) {
        throw new Error(
            `Image is ${width}x${height} (${(width * height / 1e6).toFixed(1)} MP), ` +
            `which exceeds the limit of ${(limits.maxPixels / 1e6).toFixed(1)} MP. Raise 'Max pixels per image' in the package settings.`
        );
    }
}
