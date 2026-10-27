import type { FitsCard } from '../../model/image';

export function formatCard(key: string, value: unknown, comment?: string): string {
    const padKey = key.toUpperCase().padEnd(8, ' ');
    if (key === 'END') {
        return padKey.padEnd(80, ' ');
    }
    if (key === 'COMMENT' || key === 'HISTORY') {
        const valStr = String(value ?? '').slice(0, 70);
        return `${padKey}  ${valStr}`.padEnd(80, ' ');
    }

    let valStr = '';
    if (typeof value === 'boolean') {
        valStr = value ? 'T' : 'F';
        valStr = valStr.padStart(20, ' ');
    } else if (typeof value === 'number') {
        valStr = Number.isInteger(value) ? value.toString() : value.toExponential(10).toUpperCase();
        valStr = valStr.padStart(20, ' ');
    } else if (typeof value === 'string') {
        valStr = `'${value.replace(/'/g, "''")}'`.padEnd(20, ' ');
    } else {
        valStr = String(value ?? '').padStart(20, ' ');
    }

    let card = `${padKey}= ${valStr}`;
    if (comment) {
        card = `${card.padEnd(30, ' ')} / ${comment}`;
    }
    return card.slice(0, 80).padEnd(80, ' ');
}

export function parseHeaderCards(header: any): FitsCard[] {
    const cards: FitsCard[] = [];
    if (!header) return cards;

    const keys = typeof header.keys === 'function' ? header.keys() : [];
    for (const key of keys) {
        if (key === 'COMMENT' || key === 'HISTORY') continue;
        const value = header.get(key);
        cards.push({ key, value });
    }

    if (typeof header.getComments === 'function') {
        const comments = header.getComments();
        if (Array.isArray(comments)) {
            for (const c of comments) {
                cards.push({ key: 'COMMENT', value: c });
            }
        }
    }

    if (typeof header.getHistory === 'function') {
        const history = header.getHistory();
        if (Array.isArray(history)) {
            for (const h of history) {
                cards.push({ key: 'HISTORY', value: h });
            }
        }
    }

    return cards;
}

export function extractWcs(header: any): { crpix: number[]; crval: number[]; cd: number[][]; ctype: string[] } | undefined {
    if (!header || typeof header.get !== 'function') return undefined;

    const crpix1 = header.get('CRPIX1');
    const crpix2 = header.get('CRPIX2');
    const crval1 = header.get('CRVAL1');
    const crval2 = header.get('CRVAL2');

    if (crpix1 === null || crpix2 === null || crval1 === null || crval2 === null) {
        return undefined;
    }

    const cd11 = header.get('CD1_1') ?? header.get('CDELT1') ?? 1;
    const cd12 = header.get('CD1_2') ?? 0;
    const cd21 = header.get('CD2_1') ?? 0;
    const cd22 = header.get('CD2_2') ?? header.get('CDELT2') ?? 1;

    const ctype1 = String(header.get('CTYPE1') ?? 'RA---TAN');
    const ctype2 = String(header.get('CTYPE2') ?? 'DEC--TAN');

    return {
        crpix: [Number(crpix1), Number(crpix2)],
        crval: [Number(crval1), Number(crval2)],
        cd: [
            [Number(cd11), Number(cd12)],
            [Number(cd21), Number(cd22)]
        ],
        ctype: [ctype1, ctype2]
    };
}
