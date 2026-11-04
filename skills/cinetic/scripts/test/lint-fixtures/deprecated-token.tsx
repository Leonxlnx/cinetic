// Fixture for scripts/test/lint-film.test.mjs. expect: deprecated-token:warn=3
// The 1.1 names keep working but warn with their 1.2 replacement (E.out, SPR.calm, the secondary role);
// 1.2 names and the kept E.expo do not.
import { E, prog, spr, SPR } from './anim';
import { typeStyle } from './tokens';

export const a = (f: number) => prog(f, 0, 30, E.out) + prog(f, 0, 30, E.snapOut) + prog(f, 0, 30, E.expo);
export const b = (f: number) => spr(f, 0, SPR.calm) + spr(f, 0, SPR.critical);
export const c = typeStyle('secondary');
