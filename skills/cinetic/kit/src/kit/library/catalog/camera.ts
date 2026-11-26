// The catalogue's camera moves (pushes, pans, dives, parallax, focus pulls).
// One entry a piece, in the order its reel plays them; only this category's builder edits this file. The array is
// plain data, no code (scripts/library-catalog.mjs reads it without TypeScript).
import type { LibraryEntry } from './types';

export const CAMERA: LibraryEntry[] = [];
