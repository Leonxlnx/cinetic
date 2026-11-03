// Derived, never written: the script is src/spine.ts. This view of it (each scene a pair, its line on the scene that
// draws it) keeps the older readers working (grid-check's type rules, deck.py's sheet). Keep it free of React imports.
import { IDENTITY } from './brand/identity';
import { LINES, SCENES } from './timeline';
import { CLOSE } from './spine';

export type Pair = { line?: string; scene: string; beat?: 'alone' | 'with' | 'over'; seconds?: number; ui?: string[] };
export type Launch = { name: string; pairs: Pair[]; close: string };

export const LAUNCH: Launch = {
  name: IDENTITY.name,
  pairs: SCENES.map((s) => {
    const l = LINES.find((x) => x.scene === s.i);
    return { scene: s.name, ...(l ? { line: l.raw, beat: l.place === 'alone' ? ('alone' as const) : ('with' as const) } : {}) };
  }),
  close: CLOSE,
};
