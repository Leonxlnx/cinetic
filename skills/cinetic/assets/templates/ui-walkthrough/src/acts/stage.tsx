// What every act of the walkthrough shares: the stage plan (which acts stand on paper and which on the slate, dealt
// per film), one lit ground per act (fx/Grounds: a lit gradient keyed to the film's one light, its plates drifting, never
// the same ground on more than two consecutive shots), the absolute frame, a line of the script on the crisp entry,
// the camera helpers, the whole-frame launch and carry at a velocity seam, and the hold drift every shot keeps.
// Retell it in the dealt direction's world (out/DIRECTION.md): its grounds, light and type replace this floor; the
// product's own screens replace the kit parts the acts use.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { C, SAFE, TYPE, typeStyle, U } from '../brand/tokens';
import { DEAL_SEED } from '../deal';
import { crispWords } from '../fx/TypePresets';
import { type GroundKind, type GroundSpec, LitGround, seeded } from '../fx/Grounds';
import { LIT, type LitProps, litState } from '../fx/Lit';
import { panelMatrix } from '../lib/light';
import { Words, type WordsSpec } from '../fx/Words';
import { kitTheme, type KitTheme } from '../kit';
import { clamp, E, prog } from '../lib/anim';
import { type Shot } from '../lib/camera';
import { holdDrift } from '../lib/continuity';
import { carry, launch } from '../lib/handoff';
import { fitSize } from '../lib/measure';
import { ACT, ACT_ORDER, type ActName, copy, f60, f60x, FPS, H, LINE_EXIT, TONE, W } from '../timeline';

/** The paper stage and the slate stage: neutral grounds, one accent. */
export const LIGHT = kitTheme('tintedPaper', C.accent);
export const DARK = kitTheme('slateMid', C.accent);

/** Where each act stands: paper or slate, by the dealt stage (timeline.ts TONE). */
export const toneOf = (a: ActName) => TONE[a];
/** The kit theme of an act's stage. */
export const themeOf = (a: ActName): KitTheme => (toneOf(a) === 'light' ? LIGHT : DARK);

/**
 * One lit ground per act, dealt from the film's seed: the kind rotates so no ground (kind and base) holds more than two
 * consecutive acts and never the kind of the act before (the feed and the insight share theirs: one place across the
 * morph). Grounds on the slate get light pools and bars; on paper, soft shadow shapes.
 */
export const GROUNDS: Record<ActName, GroundSpec> = (() => {
  const rnd = seeded((DEAL_SEED % 1e6) * 7919 + 17);
  const kinds: GroundKind[] = ['wash', 'pools', 'bars', 'floor', 'window'];
  const out = {} as Record<ActName, GroundSpec>;
  let prev: GroundKind | null = null;
  for (const a of ACT_ORDER) {
    if (a === 'insight') {
      out[a] = out.feed;
      continue;
    }
    const tone = toneOf(a);
    // paper takes the broad light (a lit wall, window beams); soft pools and bars on paper read as smudges
    const pool = kinds.filter((k) => k !== prev && (tone === 'dark' || k === 'wash' || k === 'window'));
    const kind = pool[Math.floor(rnd() * pool.length)];
    prev = kind;
    out[a] = { kind, base: tone === 'light' ? C.mist : C.slate, lift: tone === 'light' ? 0.08 : 0.12, seed: Math.floor(rnd() * 1e6), drift: 14 };
  }
  return out;
})();

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
 * A line of the script (a COPY entry) on one line, centred on the frame at `top` (px), its words rising and sharpening
 * on the crisp hero entry (fx/TypePresets crispWords), leaving at its `out` frame toward `exitDir` (a launch whose last
 * frame is `exitAt`, or a short launch-fade inside the act).
 */
export const ScriptLine: React.FC<{ id: string; F: number; top: number; color: string; role?: 'line' | 'display'; exitDir?: WordsSpec['exitDir']; exitAt?: number; size?: number; spec?: Partial<WordsSpec> }> = ({ id, F, top, color, role = 'line', exitDir = 'up', exitAt, size, spec }) => {
  const c = copy(id);
  const px = size ?? lineSize(c.text, role);
  if (F < c.in - 1) return null;
  const film = { fps: FPS, width: W, height: H };
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, display: 'flex', justifyContent: 'center', transform: `translate3d(0, ${top.toFixed(2)}px, 0)` }}>
      <Words
        id={id}
        text={c.text}
        frame={F}
        start={c.in}
        size={px}
        {...crispWords(film)}
        out={c.out}
        outDur={f60(LINE_EXIT)}
        exit={exitAt === undefined ? 'launchFade' : 'launch'}
        exitDir={exitDir}
        exitAt={exitAt}
        {...spec}
        style={{ ...typeStyle(role, px), color }}
      />
    </div>
  );
};

/** A layer scaled by `k` about the screen point (ox, oy) and moved by (dx, dy): an act's camera on its world. */
export const Cam: React.FC<{ k?: number; ox?: number; oy?: number; dx?: number; dy?: number; children: React.ReactNode }> = ({ k = 1, ox = W / 2, oy = H / 2, dx = 0, dy = 0, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: `${ox.toFixed(2)}px ${oy.toFixed(2)}px`, transform: `translate3d(${dx.toFixed(3)}px, ${dy.toFixed(3)}px, 0) scale(${k.toFixed(5)})` }}>{children}</div>
);

/** Absolutely placed content, its top-left at (x, y) px, `w` x `h`: by transform, never by left/top. */
export const At: React.FC<{ x: number; y: number; w?: number; h?: number; style?: React.CSSProperties; children: React.ReactNode }> = ({ x, y, w, h, style, children }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, ...style }}>{children}</div>
);

/**
 * The drift under every hold (lib/continuity holdDrift): 0.5 px/f@60 along `angle` from the act's first frame, so no
 * frame of the act is ever still between its moves.
 */
export const drift = (act: ActName, F: number, angle = 200, px = 0.5) => holdDrift(F, ACT[act].from, { px, angle }, { fps: FPS, width: W, height: H });

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
 * F (fx/Lit litState: its tilt, sway and lift) and its perspective. For a cursor or a pointer that must sit on a control
 * of a tilted panel.
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
