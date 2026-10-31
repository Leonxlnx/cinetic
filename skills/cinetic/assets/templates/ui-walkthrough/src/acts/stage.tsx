// What every act of the walkthrough shares: the stage plan (which acts stand on paper and which on the slate, dealt
// per film), one clean lit ground per act (fx/Grounds: the flat base or a very subtle gradient keyed to the film's one
// light, no plates, no pools, no haze; never the same ground on more than two consecutive shots), the absolute frame,
// a line of the script on its dealt move (acts/type.tsx),
// the camera helpers, the whole-frame launch and carry at a velocity seam, and the still hold between moves.
// Retell it in the dealt direction's world (out/DIRECTION.md): its grounds, light and type replace this floor; the
// product's own screens replace the kit parts the acts use.
import React from 'react';
import { staticFile, useCurrentFrame } from 'remotion';
import { C, SAFE, TYPE, U } from '../brand/tokens';
import { DEAL_SEED } from '../deal';
import { type GroundKind, groundKey, type GroundSpec, LitGround, placeGrounds, seeded } from '../fx/Grounds';
import { LIT, type LitProps, litState } from '../fx/Lit';
import { panelMatrix } from '../lib/light';
import { kitTheme, type KitTheme } from '../kit';
import { clamp, E, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { type Shot } from '../lib/camera';
import { type FloatOpts } from '../lib/drift';
import { type StageSpec } from '../fx/Float';
import { ReadBack as PictureBack } from '../fx/ReadBack';
import { carry, launch } from '../lib/handoff';
import { fitSize } from '../lib/measure';
import { LINES } from '../deal';
import { ACT, ACT_ORDER, type ActName, copy, f60x, FPS, H, moveOf, TONE, W } from '../timeline';
import { HeroLine } from './type';

/** The launch out of the promise into the card: px per frame on the cut at 1080p, upward (the card act opens carried at 0.8 of it). */
export const OPEN_EXIT = { vCut: -46 * U };

/** The paper stage and the slate stage: neutral grounds, one accent. */
export const LIGHT = kitTheme('tintedPaper', C.accent);
export const DARK = kitTheme('slateMid', C.accent);

/** Where each act stands: paper or slate, by the dealt stage (timeline.ts TONE). */
export const toneOf = (a: ActName) => TONE[a];
/** The kit theme of an act's stage. */
export const themeOf = (a: ActName): KitTheme => (toneOf(a) === 'light' ? LIGHT : DARK);

/**
 * One clean ground per act, dealt from the film's seed: the flat base or the subtle key gradient (fx/Grounds CLEAN_KINDS)
 * on one of two bases of the act's stage, so the place changes across the cut and no ground (kind and base) holds more
 * than two consecutive acts. The feed and the insight share theirs: one place across the morph. No plates, no pools.
 * One act (the first of proof, pick or field on paper; on a dark stage the proof) stands on the tilted tint instead:
 * the accent's colour gathering along one edge of the page, the one colour ground of the film. Every product shot
 * stands on a place (placeGrounds): the key's lit gradient (fx/Grounds 'key') or a plate of the film's own picture
 * (PLATE_SRC); on a dark stage every act does, so no shot sits on a flat charcoal field. The claim on paper keeps its
 * clean page.
 */
/**
 * The film's own picture its product shots stand on (fx/Grounds 'plate': blurred 32 px, veiled toward the base, lit by
 * the key): a photo or a still of the film's footage under public/ (assets.mjs get + grade), as a staticFile path.
 * Unset, the product shots stand on the key's lit gradient (fx/Grounds 'key'). Never a flat grey field.
 */
export const PLATE_SRC: string | undefined = undefined;
const plateSrc = () => (PLATE_SRC ? staticFile(PLATE_SRC) : undefined);
export const GROUNDS: Record<ActName, GroundSpec> = (() => {
  const rnd = seeded((DEAL_SEED % 1e6) * 7919 + 17);
  const bases = { light: [LIGHT.ground, mixColor(LIGHT.ground, C.mist, 0.7)], dark: [DARK.ground, mixColor(DARK.ground, C.ink, 0.32)] };
  const kinds: GroundKind[] = ['wash', 'flat'];
  const out = {} as Record<ActName, GroundSpec>;
  const keys: string[] = [];
  for (const a of ACT_ORDER) {
    if (a === 'insight') {
      out[a] = out.feed;
      keys.push(groundKey(out.feed));
      continue;
    }
    const tone = toneOf(a);
    const all = kinds.flatMap((kind) => bases[tone].map((base) => ({ kind, base })));
    const run = keys.length >= 2 && keys[keys.length - 1] === keys[keys.length - 2] ? keys[keys.length - 1] : null;
    // change the place at most cuts (two in three), never let one ground run past two acts
    const pool = all.filter((g) => groundKey(g) !== run && (rnd() < 0.34 || groundKey(g) !== keys[keys.length - 1]));
    const pick = (pool.length ? pool : all)[Math.floor(rnd() * (pool.length || all.length))];
    out[a] = { ...pick, lift: tone === 'light' ? 0.04 : 0.06, seed: Math.floor(rnd() * 1e6), drift: 12 };
    keys.push(groundKey(out[a]));
  }
  // one colour ground where the structure is a page of parts: the first light act of proof, pick or field (on a dark
  // stage, the proof) takes the tilted tint (fx/Grounds 'tint': the base over a third, the accent's tint gathering
  // along one tilted edge)
  const lit = (['proof', 'pick', 'field'] as ActName[]).find((a) => toneOf(a) === 'light') ?? 'proof';
  out[lit] = { kind: 'tint', base: out[lit].base, seed: out[lit].seed, drift: 12 };
  const ui = ACT_ORDER.map((a) => toneOf(a) === 'dark' || a !== 'claim');
  const placed = placeGrounds(ACT_ORDER.map((a) => out[a]), ui, { src: plateSrc() });
  ACT_ORDER.forEach((a, i) => (out[a] = placed[i]));
  out.insight = out.feed;
  return out;
})();

/**
 * The stage every act stands on (Film.tsx ActStage; lib/drift, fx/Float): the camera is still unless an act declares a
 * move (no float, no drift). The acts' own cameras (Cam, carryIn, launchOut, the card's one turn) make the moves, each
 * from rest to rest; between them the picture holds still while the product changes.
 */
export const FLOAT: FloatOpts = {};
/** How an act stands on the stage (fx/Float StageSpec): give an act `moves` (lib/drift stageMove) only for a move with a purpose. */
export const STAGE: Partial<Record<ActName, StageSpec>> = {};

/** The absolute film frame inside an act (acts are Sequences: their own frame starts at 0). */
export const useAbs = (act: ActName) => useCurrentFrame() + ACT[act].from;

/** The frame's centre as a shot: world px = screen px at k 1. */
export const CENTRE: Shot = { ax: W / 2, ay: H / 2, sx: W / 2, sy: H / 2, k: 1 };

/**
 * The size a line of the script is set at: its role's size, smaller only when it would not fit `share` of the safe
 * width. The default share keeps a sentence line inside the layout audit's width with room for a hold's creep and a
 * push into the cut.
 */
export const LINE_SHARE = 0.64;
export const lineSize = (text: string, role: 'line' | 'display' = 'line', share = LINE_SHARE) =>
  Math.min(TYPE[role].size * U, fitSize(text, (W - 2 * SAFE.x) * share, TYPE[role].size * U, TYPE[role].weight, TYPE[role].track));

/**
 * A line of the script (a COPY entry) on one line, centred on the frame at (x, y) (default the frame's centre: the
 * middle band, never the top or the bottom), on the film's voice (src/deal.ts LINES, acts/type.tsx HeroLine): it leaves
 * at its `out` frame at speed. Over the product, wrap the product in <ReadBack> so the line reads on a calm ground.
 */
export const ScriptLine: React.FC<{ id: string; F: number; y?: number; color: string; role?: 'line' | 'display'; size?: number; x?: number; accent?: string; mute?: string }> = ({ id, F, y = H / 2, color, role = 'line', size, x = W / 2, accent, mute }) => {
  const c = copy(id);
  const px = size ?? lineSize(c.text, role);
  return <HeroLine id={id} text={c.text} at={c.in} frame={F} move={moveOf(id)} out={c.out} exit={LINES.exit[id]} x={x} y={y} role={role} size={px} color={color} accent={accent ?? C.accent} mute={mute} />;
};

/** The product under a centred line (fx/ReadBack): softened, dimmed and a step back while line `id` is read, sharp again as it leaves. */
export const ReadBack: React.FC<{ id: string; F: number; children: React.ReactNode }> = ({ id, F, children }) => (
  <PictureBack F={F} at={copy(id).in} out={copy(id).out}>
    {children}
  </PictureBack>
);

/** A layer scaled by `k` about the screen point (ox, oy) and moved by (dx, dy): an act's camera on its world. */
export const Cam: React.FC<{ k?: number; ox?: number; oy?: number; dx?: number; dy?: number; children: React.ReactNode }> = ({ k = 1, ox = W / 2, oy = H / 2, dx = 0, dy = 0, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${ox.toFixed(2)}px ${oy.toFixed(2)}px`, transform: `translate3d(${dx.toFixed(3)}px, ${dy.toFixed(3)}px, 0) scale(${k.toFixed(5)})` }}>{children}</div>
);

/** Absolutely placed content, its top-left at (x, y) px, `w` x `h`: by transform, never by left/top. */
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, ...style }}>{children}</div>
);

/**
 * A still hold: the offset every act adds between its moves. The picture rests while the product changes (no drift,
 * no float: a hold may be completely still); a creep is lib/continuity holdDrift at 0.2 px/f@60 at most, one way.
 */
export const HOLD = { x: 0, y: 0 } as const;

/**
 * The whole frame's launch into a velocity seam (the camera, the ground with it, so the cut reads as one move): up
 * (dir -1 on y) at `vCut` px per frame on the cut, the last frame of `act` the fastest. 0 before it builds.
 */
export const launchOut = (act: ActName, F: number, vCut: number) => {
  const cut = ACT[act].from + ACT[act].dur - 1;
  const o = { vCut, fps: FPS };
  return launch(F, cut, o).x - launch(cut - f60x(90), cut, o).x;
};
/** The whole frame carried in from a velocity seam: it starts offset and moving at `ratio` of the outgoing speed and settles (exponential decay) by `settle` 60 fps frames. */
export const carryIn = (act: ActName, F: number, vCut: number, settle = 40, ratio = 0.8) => {
  const o = { v0: vCut * ratio, settle, fps: FPS };
  return carry(F, ACT[act].from, o).x - carry(ACT[act].from + f60x(400), ACT[act].from, o).x;
};

/**
 * Where a point of a lit panel lands on screen: (dx, dy) px from the panel's centre, through the panel's pose at frame
 * F (fx/Lit litState: its tilt and lift) and its perspective. For a cursor or a pointer that must sit on a control of a
 * lit panel, also while it turns.
 */
export const onLit = (F: number, p: LitProps, dx: number, dy: number) => {
  const s = litState(F, p, { fps: FPS, width: W, height: H });
  const R = panelMatrix(s.tilt);
  const q = [R[0] * dx + R[1] * dy, R[3] * dx + R[4] * dy, R[6] * dx + R[7] * dy];
  const P = p.perspective ?? LIT.perspective; // fx/Lit sets it in px as given
  const z = s.lift + q[2];
  const x = s.x + q[0];
  const y = s.y + q[1];
  const k = P / Math.max(1, P - z);
  return { x: W / 2 + (x - W / 2) * k, y: H / 2 + (y - H / 2) * k };
};

/**
 * The act's lit ground (fx/Grounds), riding a camera when given one. How far it reaches past the frame on every side
 * (a share of the frame): the acts whose whole frame launches or is carried across a cut slide the ground with them, so
 * it is drawn larger and never shows its edge.
 */
const OVER: Partial<Record<ActName, number>> = { open: 0.2, card: 0.2, field: 0.25, feed: 0.3, insight: 0.3, pick: 0.3 };
export const Ground: React.FC<{ act: ActName; F: number; cam?: { shot: Shot; base: Shot }; spec?: GroundSpec }> = ({ act, F, cam, spec }) => {
  const over = OVER[act] ?? 0;
  const g = <LitGround frame={F} spec={spec ?? GROUNDS[act]} cam={cam} />;
  if (!over) return g;
  return <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '50% 50%', transform: `scale(${(1 + 2 * over).toFixed(3)})` }}>{g}</div>;
};

/** The share of a move at frame F (prog on a named curve) clamped: shorthand the acts use for secondaries. */
export const share = (F: number, from: number, frames60: number, ease = E.glideOut) => prog(F, from, from + f60x(frames60), ease);
/** 0..1 for an element present from `at`, faded over `frames60` (never a one-frame pop). */
export const fadeIn = (F: number, at: number, frames60 = 12) => clamp((F - at) / Math.max(1, f60x(frames60)));
