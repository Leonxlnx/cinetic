import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { MARK, pathPolys } from '../brand/Mark';
import { C, TYPE, typeStyle, U } from '../brand/tokens';
import { keyLightState, type KeyLightProps, type Pt, type ReliefBlock, type ReliefCamera, ReliefScene } from '../fx/KeyLight';
import { E, lmix, M, mix, prog, spr, SPR, squash } from '../lib/anim';
import { carry } from '../lib/handoff';
import { baselineOf, inkBox, measureTracked } from '../lib/measure';
import { delayTo } from '../lib/sync';
import { ACT, copy, CUE, FPS, H, W } from '../timeline';
import { DROP } from './Act3';

// ACT 4 - the mark as a relief on a plinth, under one directional key (fx/KeyLight). The scene opens on the
// line's downward speed (the camera carried, decaying to a drift). The accent dot already sits on the slab;
// the dome and the block drop onto it, each landing ON its beat (the film's one spring class), their shadows
// closing in under them as they fall. Cut to the lockup on the next beat as the key climbs (the noon lift:
// every shadow shortens), and the name rises in whole beside the mark, through a slot in the slab: every letter
// shows from its first frame (a name slid out from behind the mark would show its end first). The lock lives on:
// the key keeps turning and the camera keeps a slow push, so the hold never freezes.

/**
 * The slab (floor px at 1080p): a raised platform wider than the frame, so the set bleeds off both sides; it runs
 * far back, so it sorts behind the pieces standing on it, and its front edge crosses the frame under the lockup.
 */
const SLAB = { x: -1400, y: -2600, w: W + 2800, h: 3420, height: 40 };
/** The mark's box on the slab and the relief height of its pieces. */
export const HERO = { size: 250 * U, height: 44 * U, drop: 260 * U };
const NAME = copy('wordmark');

// Landings: start each spring early by exactly the frames it needs to reach rest, so the contact frame IS the cue.
const LAND = SPR.landing;
const CONTACT = { a: CUE.pieceA, b: CUE.pieceB };
const START = { a: CONTACT.a - delayTo(LAND), b: CONTACT.b - delayTo(LAND) };

/** The key: a raking key that turns while the pieces land, rises as the mark is whole, lifts to noon on the cut, then turns slowly through the hold. */
export const KEY_PLAN: KeyLightProps = {
  elevation: 18,
  azimuth: 292,
  events: [
    { kind: 'rake', at: ACT.mark.from, dur: CUE.lockCut - ACT.mark.from, toAz: 318, ease: E.strongInOut },
    { kind: 'move', at: CUE.catch, dur: 30, elevation: 26, ease: E.stdInOut }, // the mark is whole: the key rises a little
    { kind: 'noon', at: CUE.lockCut, dur: 72, from: 26, to: 52, ease: E.strongInOut },
    { kind: 'move', at: CUE.lockCut + 72, dur: ACT.mark.from + ACT.mark.dur - CUE.lockCut - 72, azimuth: 336, ease: E.linear },
  ],
  seam: { at: CUE.lockCut, id: 'noon-lift' },
};

/** The name's rise (absolute frames): from the cut to the lockup, landing on the payoff's hit. */
export const NAME_RISE = { from: CUE.lockCut, to: CUE.lockup, ease: M.lockup };
/**
 * The name's offset in its slot at absolute frame F, as a share of its line box: x is always 0 (the whole word
 * is level with its slot on every frame, so no frame shows part of it), y falls from 1 (below the slot's near
 * edge) to 0 on CUE.lockup.
 */
export const nameOffset = (F: number) => ({ x: 0, y: 1 - prog(F, NAME_RISE.from, NAME_RISE.to, NAME_RISE.ease) });

const toFloor = (mx: number, my: number, k: number) => (q: [number, number][]): Pt[] => q.map(([u, v]) => [mx + u * k, my + v * k]);
/** A piece's footprint scaled about its centre (the squash on contact widens it). */
const around = (q: Pt[], s: number): Pt[] => {
  const cx = q.reduce((a, p) => a + p[0], 0) / q.length;
  const cy = q.reduce((a, p) => a + p[1], 0) / q.length;
  return q.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]);
};
const circle = (cx: number, cy: number, r: number, n = 40): [number, number][] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)]);

export const Act4: React.FC = () => {
  const f = useCurrentFrame();
  const F = f + ACT.mark.from;
  const disp = TYPE.display;
  const S = HERO.size;

  // The lockup's layout from the real font: the name's ascent equals the mark's size, a 0.3 gap, one baseline.
  const asc100 = inkBox(NAME.text, 100, disp.weight).ascent / 100;
  const nameSize = S / asc100;
  const nameW = measureTracked(NAME.text, nameSize, disp.weight, disp.track);
  const gap = 0.3 * S;
  const lockW = S + gap + nameW;
  const mx = W / 2 - lockW / 2;
  const my = SLAB.y + SLAB.h - 100 * U - S;
  const k = S / 100;
  const place = toFloor(mx, my, k);
  const z0 = SLAB.height;

  // The pieces: the dot sits from the first frame; the dome and the block fall onto the slab (z), landing on their cues.
  const sa = F >= CONTACT.a ? 1 : spr(F, START.a, LAND);
  const sb = F >= CONTACT.b ? 1 : spr(F, START.b, LAND);
  const qa = squash(F - CONTACT.a);
  const qb = squash(F - CONTACT.b);
  const dome = place(pathPolys(MARK.A.d)[0]);
  const block = place([[MARK.B.x, MARK.B.y], [MARK.B.x + MARK.B.w, MARK.B.y], [MARK.B.x + MARK.B.w, MARK.B.y + MARK.B.h], [MARK.B.x, MARK.B.y + MARK.B.h]]);
  const dot = place(circle(MARK.D.cx, MARK.D.cy, MARK.D.r));

  // The name printed on the slab's top face (fx/KeyLight maps the HTML onto it), beside the mark: its baseline on
  // the mark's near edge, rising in whole through a slot as wide as the word (nameOffset): never slid sideways.
  const nameH = nameSize * 1.25;
  const nameTop = my + S - baselineOf(nameSize, disp.weight, 1);
  const off = nameOffset(F);
  const win = { x: mx + S + gap / 2 - SLAB.x, y: nameTop - SLAB.y, w: nameW + gap, h: nameH };
  const nameNode =
    F >= CUE.lockCut ? (
      <div style={{ position: 'absolute', left: win.x, top: win.y, width: win.w, height: win.h, overflow: 'hidden' }}>
        <span data-text="wordmark" style={{ ...typeStyle('display', nameSize), lineHeight: 1, color: C.paper, position: 'absolute', left: gap / 2, top: 0, transform: `translate(${(off.x * nameW).toFixed(2)}px, ${(off.y * nameH).toFixed(2)}px)` }}>
          {NAME.text}
        </span>
      </div>
    ) : null;

  const blocks: ReliefBlock[] = [
    { id: 'slab', rect: { x: SLAB.x, y: SLAB.y, w: SLAB.w, h: SLAB.h }, h: SLAB.height, top: C.slateRaised, side: C.slateRaised, content: { w: SLAB.w, h: SLAB.h, node: nameNode } },
    { id: 'dot', foot: dot, h: HERO.height, z: z0, top: C.accentLift, side: C.accentLift, contact: false },
    { id: 'dome', foot: around(dome, qa.across), h: HERO.height * qa.along, z: z0 + (1 - sa) * HERO.drop, top: C.paper, side: C.paper, contact: false },
    { id: 'block', foot: around(block, qb.across), h: HERO.height * qb.along, z: z0 + (1 - sb) * HERO.drop, top: C.paper, side: C.paper, contact: false },
  ];

  // Two cameras, one cut. The build: high and close on the mark (a longer lens), the mark left of centre where the
  // lockup will hold it, carried in on the line's downward speed (0.7 of it on screen, decaying to a drift) with a
  // slow push. The lockup: wider on mark and name, a dolly.
  const pitchA = 48;
  const zoomA = 1.75;
  const carried = carry(F, ACT.mark.from, { vCut: DROP.vCut, ratio: 0.7, fps: FPS }).x; // screen px
  const distA = 2.2 * H * lmix(1, 0.93, prog(F, ACT.mark.from, CUE.lockCut, E.linear));
  const camA: ReliefCamera = {
    width: W, height: H, pitch: pitchA, dist: distA, focal: 2.2 * H * zoomA, // the focal held while the camera closes in: a real push
    target: [mx + S / 2 + (0.12 * W) / zoomA, my + S / 2 + 10 * U - (carried - 200 * U) / (zoomA * Math.sin((pitchA * Math.PI) / 180))],
  };
  const hold = prog(F, CUE.lockCut, ACT.mark.from + ACT.mark.dur, E.softOut);
  const camB: ReliefCamera = { width: W, height: H, pitch: mix(58, 62, hold), target: [mx + lockW / 2, my + S / 2 + 30 * U], dist: 2.05 * H * lmix(1, 0.95, hold), focal: 2.05 * H * 1.1, yaw: mix(-3, 2, hold) }; // a dolly in on a held focal

  return (
    <AbsoluteFill style={{ background: C.slate, overflow: 'hidden' }}>
      <ReliefScene id="plinth" blocks={blocks} camera={F >= CUE.lockCut ? camB : camA} keyLight={keyLightState(F, KEY_PLAN)} floor={C.slate} ink={C.ink} shadowAlpha={0.3} penumbra={2} />
    </AbsoluteFill>
  );
};
