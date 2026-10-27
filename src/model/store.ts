import type { ImageRef, TRImage } from './image';

export class StaleImageError extends Error {
    constructor() {
        super('Image data is no longer available. Re-run the node that produced it.');
        this.name = 'StaleImageError';
    }
}

interface Entry {
    image: TRImage;
    bytes: number;
}

const MB = 1048576;

class ImageStore {
    readonly epoch = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    private entries = new Map<string, Entry>();
    private ids = new WeakMap<TRImage, string>();
    private counter = 0;
    private usedBytes = 0;
    private budgetBytes = 2048 * MB;

    setBudgetMB(megabytes: number): void {
        if (!Number.isFinite(megabytes) || megabytes <= 0) return;
        this.budgetBytes = megabytes * MB;
        this.evict(undefined);
    }

    put(image: TRImage): ImageRef {
        let id = this.ids.get(image);
        if (id && this.entries.has(id)) {
            this.touch(id);
        } else {
            id = `${this.epoch}:${++this.counter}`;
            const bytes = image.data.byteLength;
            this.entries.set(id, { image, bytes });
            this.ids.set(image, id);
            this.usedBytes += bytes;
            this.evict(id);
        }
        return {
            __imageRef: 1,
            id,
            epoch: this.epoch,
            width: image.width,
            height: image.height,
            channels: image.channels,
            model: image.model,
            dtype: image.dtype
        };
    }

    get(ref: ImageRef): TRImage {
        if (ref.epoch !== this.epoch) throw new StaleImageError();
        const entry = this.entries.get(ref.id);
        if (!entry) throw new StaleImageError();
        this.touch(ref.id);
        return entry.image;
    }

    release(id: string): void {
        const entry = this.entries.get(id);
        if (!entry) return;
        this.entries.delete(id);
        this.usedBytes -= entry.bytes;
    }

    stats(): { count: number; usedMB: number; budgetMB: number } {
        return {
            count: this.entries.size,
            usedMB: Number((this.usedBytes / MB).toFixed(1)),
            budgetMB: this.budgetBytes / MB
        };
    }

    private touch(id: string): void {
        const entry = this.entries.get(id);
        if (!entry) return;
        this.entries.delete(id);
        this.entries.set(id, entry);
    }

    private evict(protectedId: string | undefined): void {
        for (const [id, entry] of this.entries) {
            if (this.usedBytes <= this.budgetBytes) return;
            if (id === protectedId) continue;
            this.entries.delete(id);
            this.usedBytes -= entry.bytes;
        }
    }
}

export const imageStore = new ImageStore();
