export interface DataframeValue {
    __arqueroData: Record<string, unknown>[];
}

export function toTable(rows: Record<string, unknown>[]): DataframeValue {
    return { __arqueroData: rows };
}

export function recordToTable(record: Record<string, unknown>): DataframeValue {
    return toTable(Object.entries(record).map(([property, value]) => ({
        property,
        value: value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
    })));
}

export function errorTable(err: unknown): DataframeValue {
    const message = err instanceof Error ? err.message : String(err);
    return recordToTable({ status: 'error', message });
}
