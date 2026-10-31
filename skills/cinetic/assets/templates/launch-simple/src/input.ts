// The input shot: the core action as real footage, the first scene's opening (src/product.tsx INPUT reads it).
// `node tools/input.mjs` writes this file: it reads launch.ts `input` (the core action in plain words), finds the
// matching footage recipe (scripts/assets.mjs recipe; else a search in the same words), downloads its first fitting
// clip with its licence record into public/assets/input.mp4 and fills in its size, rate and source; with no clip that
// fits it writes status 'none' and the reason, and the first scene plays its code-built fallback. Until it has run,
// precheck warns and the ship gate fails (the gate below, which the written file no longer carries). Keep this file
// free of React and CSS imports.
export type InputShot = {
  status: 'unfetched' | 'fetched' | 'none';
  clip: string; // public/ path
  w: number;
  h: number;
  fps: number;
  from: number; // the source second it starts at
  words?: string; // the input as launch.ts says it
  recipe?: string; // the footage recipe it matched
  source?: string; // the clip's ref (its licence record: assets/licences.json)
  reason?: string; // status 'none': why no clip fits
};

// cinetic:placeholder - the template's stand-in input shot: run `node tools/input.mjs`, which rewrites this file.
export const INPUT_SHOT: InputShot = { status: 'unfetched', clip: 'assets/input.mp4', w: 1920, h: 1080, fps: 30, from: 0 };

// lib/continuity timingFail's contract, inline (this file is rewritten by tools/input.mjs and imports nothing)
{
  const msg = 'input: the input shot is not fetched: run `node tools/input.mjs` (launch.ts input: the core action in plain words), or `node tools/input.mjs --none "<why>"` when no footage fits';
  const g = globalThis as unknown as { process?: { env?: Record<string, string | undefined> }; __cineticGateIssues?: { rule: string; message: string }[] };
  if (g.process?.env?.CINETIC_GATE === 'ship' || g.process?.env?.REMOTION_CINETIC_GATE === 'ship') throw new Error(msg);
  const list = (g.__cineticGateIssues ??= []);
  if (!list.some((x) => x.rule === 'input-shot')) list.push({ rule: 'input-shot', message: msg });
}
