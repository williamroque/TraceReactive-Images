import { browserCodecs } from './browser';
import { pngCodec } from './png';
import { fitsCodec } from './fits/fitsCodec';
import { registerCodec } from './registry';

export function registerBuiltinCodecs(): void {
    registerCodec(fitsCodec);
    registerCodec(pngCodec);
    for (const codec of browserCodecs) registerCodec(codec);
}
