// The product's scenes: one entry per scene name in src/spine.ts. A scene with a house scene (its `bank`, or the one the
// deal gave it: src/bank.ts) is drawn by acts/bank.tsx, filled with the content its script gives (`props`: the case's
// own words, the brief's own pictures) or, without it, from the case, its `ui`, its act's line and src/content.ts
// (node scripts/content.mjs --brief BRIEF.md --fetch --force writes it from the brief: read it and keep only what is
// true of the product). A line (a word scene) is the template's own: built word by word on clean ground, its key word
// gathering into the element. A picture the bank does not draw: write a SceneDef of your own here (Draw; el: the
// element's box on screen; Content: the element alone for the handover), built from src/kit/screens, and name it in
// the spine.
//
// Rules every scene keeps (the checks read them): the element is the brightest, sharpest thing in its frame; text sits
// on clean ground (a solid, the scene's own designed surface), never over a blurred picture; a press is a real pointer;
// every string is the product's real words (src/spine.ts `ui` lists them); a real company in a picture shows its
// official mark (node scripts/logos.mjs get <id>), never a drawn look-alike; photographs only of the brief's own subject.
import { bankScene } from './acts/bank';
import { type SceneDef, wordScene } from './acts/scenes';
import { CAST, SCENES } from './timeline';

/** Scenes of your own, by name (they win over the bank for that name). */
const OWN: Record<string, SceneDef> = {};

export const SCENE_DRAW: Record<string, SceneDef> = {
  ...Object.fromEntries(SCENES.map((s, i) => [s.name, CAST[i].bank ? bankScene(i) : wordScene()])),
  ...OWN,
};
