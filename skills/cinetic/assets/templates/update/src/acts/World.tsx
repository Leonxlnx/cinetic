// The update film's world: one strip the camera travels. The name and the version open it (the name over giant
// numerals cropped by the frame, the version arriving by the dealt hook); each change is a product surface on the
// strip, lit and tilted in the film's one light (fx/Lit), that does the new thing on its beat while one sentence names
// it on its dealt move (acts/type.tsx); the film makes one 3D camera move (the dealt turn); the payoff gathers every
// change behind the version; the end card sets the mark and the name with it. Every act renders this world at its
// own frames, so the camera's speed carries across each act line by construction. The ground is clean (fx/Grounds:
// the key gradient alone, riding the camera at the background's weight): no near plane of soft shapes, no haze.
//
// Retell it in the dealt direction's world (out/DIRECTION.md): its space, light and signature replace this floor.
// The product surfaces come from src/kit until the product's own UI is rebuilt for film.
import React from 'react';
import { AbsoluteFill, staticFile, useCurrentFrame } from 'remotion';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { C, TYPE, typeStyle, U } from '../brand/tokens';
import { DEAL, DEAL_SEED, LINES, NAME_MOVE } from '../deal';
import { LitGround } from '../fx/Grounds';
import { Lit } from '../fx/Lit';
import { RackFocus } from '../fx/RackFocus';
import { BudgetCard, ChatCard, DenseScreen, filmWorld, hasLogo, kitTheme, ProjectPanel, StatCard } from '../kit';
import type { InlineRef } from '../kit/inline';
import { clamp, E, hitPulse, lmix, mix, prog } from '../lib/anim';
import { phrase } from '../lib/cadence';
import { creep as creepK } from '../lib/handoff';
import { camera, lc, type Shot } from '../lib/camera';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { type FloatOpts, withLocks } from '../lib/drift';
import { ACT, beat, BEATS, changeOut, copy, CUE, f60, f60x, FPS, H, moveOf, N, ROLL, TOTAL, W } from '../timeline';
import { type Change, MOMENTS, spokenChange, UPDATE } from '../update';
import { HeroLine, MarkLine } from './type';

/** The mark's parts rise phrased, the last after a held beat (lib/cadence), the span of a 5 f stagger. */
const PART_ON = phrase(LOGO.parts.length, f60(5), { shape: 'settle', seed: 'mark-parts' }).onsets;

/**
 * The camera float every act sits on (Film.tsx ActStage; lib/drift, fx/Float): one continuous drift through the whole
 * film (sideways up to 31 px/s, a push of up to 3 % carrying the turns), seeded by the film, so no shot sits still
 * while one small thing moves (forensics.py motion-energy). It eases to rest once, on the name's read (withLocks:
 * where the drift runs fastest inside the read, never beside a turn). The grounds hold still under it (LitGround), the
 * content moves over them.
 */
export const FLOAT: FloatOpts = withLocks({ seed: DEAL_SEED }, [copy('product')], { fps: FPS });

/** The film's kit colours: the mid slate or the tinted paper (the dealt stage), the accent the brand's. */
export const THEME = DEAL.stage === 'paper' ? kitTheme('tintedPaper', C.accent) : kitTheme('slateMid', C.accent);
const T = THEME;

// ---------------------------------------------------------------------------------------------- layout
/** The version numerals: giant, cropped by the frame (the set), in the hook and again from the payoff on. */
export const NUM = { size: 1500 * U, x: 150 * U, lead: 0.92, weight: TYPE.giant.weight, track: TYPE.giant.track } as const;
/** The product's name over the version in the hook: line size, centred at the top over the giant numerals (the set); the numerals drop to make room for it. */
export const NAME_HOOK = { y: 80 * U, drop: 300 * U } as const;
/**
 * The version's landing in the payoff: at most `size`, never wider than `fill` of the frame, centred, so it reads whole
 * (the hook's numerals are the cropped set; the release is not). Its size on the 'set' end card is a share of `size`.
 */
export const NUM_LAND = { size: 1180 * U, fill: 0.8 } as const;
const SET_K = 0.5;
/**
 * The strip: change i's surface is centred at x0 + i * gap (world px), alternating above and below. x0 sets the move out
 * of the hook: the strip arrives at the speed the version leaves (the numerals leave 2700 px, the strip 2600 on screen).
 */
export const STRIP = { x0: 3900 * U, gap: 2300 * U, y: 560 * U, alt: 120 * U } as const;
/** How each moment's surface is scaled from its kit size: centred in the frame, it steps back behind its centred words while they are read. */
const SURFACE: Record<Change['moment'], { k: number; w: number; h: number }> = {
  approve: { k: 1.25, w: 1160, h: 740 },
  chat: { k: 1.7, w: 640, h: 600 },
  count: { k: 1.7, w: 640, h: 560 },
  budget: { k: 1.5, w: 900, h: 440 },
  table: { k: 0.95, w: 1640, h: 940 },
};
const boxOf = (c: Change) => ({ w: SURFACE[c.moment].w * SURFACE[c.moment].k * U, h: SURFACE[c.moment].h * SURFACE[c.moment].k * U });
const centreOf = (i: number) => ({ x: STRIP.x0 + i * STRIP.gap, y: STRIP.y + (i % 2 ? STRIP.alt : -STRIP.alt) });

// ---------------------------------------------------------------------------------------------- camera
/** Change i framed in the middle of the frame: its surface does the new thing, then steps back behind its words, which read centred (wordsBack). */
const shotOf = (i: number): Shot => ({ ax: centreOf(i).x, ay: centreOf(i).y, sx: W / 2, sy: H / 2, k: 1 });
/**
 * How far the strip steps back behind change i's words (0..1): from just before its sentence rises in until just after
 * it leaves, so the surface plays its new thing sharp on the hit, then softens and clears while the centred words are
 * read: each change line gets its own clean beat on the ground, never over busy UI. The strip comes back on the move
 * to the next change (or on the 'pull' payoff's carried pull), once the words have left: their exit ends 2/60 s before
 * that act line, so the strip starts back 8/60 s before it, still faint and soft under the last of the exit, and is
 * whole 14/60 s after it (coming back from the words' own exit, it showed sharp under the half-gone line for a third of
 * a second); after the last change on a 'rise' payoff it stays clear, so the version rises and the end card sets on
 * the clean ground (no fade back: nothing on screen would carry it).
 */
const wordsBack = (F: number) => {
  let b = 0;
  UPDATE.changes.forEach((_, i) => {
    const c = copy(`change${i + 1}`);
    const stays = i === N - 1 && DEAL.payoff === 'rise';
    const next = beat(BEATS.change(i + 1)); // the act line of the move to the next surface (changeOut + the exit + 2/60 s)
    b = Math.max(b, prog(F, c.in - f60(4), c.in + f60(16), E.stdInOut) * (stays ? 1 : 1 - prog(F, next - f60(8), next + f60(14), E.stdInOut)));
  });
  return b;
};
const HOOK: Shot = { ax: 0, ay: H / 2, sx: 0, sy: H / 2, k: 1 };
const WIDE: Shot = (() => {
  const a = centreOf(0).x - 1000 * U;
  const z = centreOf(N - 1).x + 1000 * U;
  return { ax: (a + z) / 2, ay: STRIP.y, sx: W * 0.62, sy: H * 0.46, k: W / ((z - a) * 0.92) };
})();
/** A move centred on an act line, so the camera is at its fastest as the act changes (a velocity seam). */
const MOVE = f60(40);
const across = (F: number, at: number, dur = MOVE) => prog(F, at - dur / 2, at + dur / 2, E.strongInOut);
/** Creep inside a hold: 4 % over the hold, plus a 24 px/s drift (a living hold). */
const creep = (s: Shot, F: number, from: number, to: number): Shot => {
  const t = clamp((F - from) / Math.max(1, to - from));
  return { ...s, ax: s.ax + ((F - from) * 24 * U) / 60, k: s.k * mix(1, 1.04, t) };
};
/** A change's second picture beat (CUE.push<i>): a 6 % push in on its surface over 36 f while its words are read. */
const PUSH = { k: 1.06, frames: 36 } as const;
const pushIn = (s: Shot, F: number, at: number): Shot => ({ ...s, k: s.k * lmix(1, PUSH.k, prog(F, at, at + f60(PUSH.frames), E.stdInOut)) });

/**
 * A carried move's progress (0..1) through the act line `at`: it accelerates for `lead` frames (60 fps) into the line,
 * is at its fastest on it, then opens at `ratio` of that speed and decays by `r` a frame (60 fps) (lib/handoff.ts
 * carriedCut's shape): the speed carries across the seam and dies away, never stopping dead. The pull back reads
 * faster on screen than the push it leaves (the zoom out widens every step), so it opens at 0.55 of the progress speed:
 * measured on screen it opens at 0.5-1.3x (60 and 30 fps; 0.4-1.4x passes).
 */
const carriedProg = (F: number, at: number, lead = 36, r60 = 0.9, ratio = 0.55): number => {
  const L = f60x(lead);
  const r = r60 ** (60 / FPS);
  const A = 1 / (1 + (3 * ratio * r) / (L * (1 - r))); // the share run before the line; the decay's sum is the rest
  const v = (3 * A) / L; // the speed on the line (progress a frame)
  if (F <= at - L) return 0;
  if (F <= at) return A * ((F - at + L) / L) ** 3;
  return Math.min(1, A + (ratio * v * r * (1 - r ** (F - at))) / (1 - r));
};

/**
 * The film's one 3D camera move (degrees), by the dealt turn: 'yaw' swings the strip 18 degrees round as the camera
 * travels into the second change and eases most of the way back over that change; 'pitch' tips the camera 20 degrees
 * down over the strip as it pulls back (a 'rise' payoff takes the pitch on its recede).
 */
export const turnAt = (F: number): { yaw: number; pitch: number } => {
  if (DEAL.turn === 'yaw') {
    const at = beat(BEATS.change(Math.min(1, N - 1)));
    return { yaw: mix(0, -18, prog(F, at - MOVE, at + MOVE / 2, E.strongInOut)) + mix(0, 12, prog(F, at + MOVE / 2, at + f60(150), E.glideOut)), pitch: 0 };
  }
  // on a 'pull' payoff the tip rides the pull's carried move (one move across the act line); on a 'rise' it eases on its own
  return { yaw: 0, pitch: 20 * (DEAL.payoff === 'pull' ? carriedProg(F, CUE.gather) : prog(F, CUE.gather - f60(12), CUE.gather + f60(66), E.strongInOut)) };
};

/** The camera at absolute frame F: the hook's creep, a move across every act line, the payoff, a slow push to the end. */
export const shotAt = (F: number): Shot => {
  let s = creep(HOOK, F, 0, beat(BEATS.change(0)));
  for (let i = 0; i < N; i++) {
    const at = beat(BEATS.change(i));
    const next = beat(BEATS.change(i + 1));
    s = lc(s, pushIn(creep(shotOf(i), F, at, next), F, CUE[`push${i}`]), across(F, at));
  }
  // 'pull': back over every change; 'rise': the camera keeps the last change's frame and recedes (a slow pull of 12 %) on the clean ground
  if (DEAL.payoff === 'pull') s = lc(s, WIDE, carriedProg(F, CUE.gather)); // a carried move: fastest on the act line, then decaying
  else s = { ...s, k: s.k * lmix(1, 0.88, prog(F, CUE.gather - f60(10), CUE.land + f60(30), E.strongInOut)) };
  const t3 = turnAt(F);
  return { ...s, k: s.k * lmix(1, 1.05, prog(F, CUE.gather + f60(36), TOTAL, E.linear)), yaw: t3.yaw, pitch: t3.pitch };
};

// ---------------------------------------------------------------------------------------------- pieces
/**
 * The version as giant numerals; changed characters roll on a masked drum (old above, new below). `rise` (0..1) lifts
 * the whole version out of a mask on its baseline (the 'mask' hook and the 'rise' payoff: near-linear, stopping dead).
 */
const Numerals: React.FC<{ F: number; size: number; color: string; shade: string; rollAt: number; rise?: number }> = ({ F, size, color, shade, rollAt, rise = 1 }) => {
  const p = prog(F, rollAt, rollAt + f60(ROLL), E.snapOut);
  const box = size * NUM.lead;
  // lint-ok: digits and points have no descenders, and the drum's box is the numeral's own height (clipText's padding would break the roll)
  const fill: React.CSSProperties = { backgroundImage: `linear-gradient(180deg, ${color} 0%, ${color} 46%, ${shade} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
  if (rise <= 0) return null;
  return (
    <div style={{ height: box, overflow: rise < 1 ? 'hidden' : 'visible' }}>
    <div data-text="version" style={{ display: 'flex', ...typeStyle('giant', size), lineHeight: NUM.lead, transform: rise < 1 ? `translate3d(0, ${((1 - rise) * box * 1.05).toFixed(2)}px, 0)` : undefined }}>
      {[...UPDATE.version].map((ch, i) => {
        const old = DEAL.hook === 'roll' ? (UPDATE.from[i] ?? ch) : ch;
        if (old === ch) return <span key={i} style={fill}>{ch}</span>;
        return (
          <span key={i} style={{ display: 'inline-block', height: box, overflow: 'hidden' }}>
            <span style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${(-p * box).toFixed(2)}px)` }}>
              <span style={{ ...fill, height: box }}>{old}</span>
              <span style={{ ...fill, height: box }}>{ch}</span>
            </span>
          </span>
        );
      })}
    </div>
    </div>
  );
};

/** The mask's rise (fx/TypePresets mask, one word): 20 f that stop dead. */
const riseAt = (F: number, at: number) => prog(F, at, at + f60(20), E.snapOut);

/** The table moment's world: the product's own rows (update.ts MOMENTS.table). */
const TABLE_WORLD = filmWorld(MOMENTS.table);

/** One change's product surface, lit and tilted in the film's light, doing the new thing on its hit frame. */
const Surface: React.FC<{ c: Change; i: number; F: number }> = ({ c, i, F }) => {
  const hit = CUE[`hit${i}`];
  const { w, h } = boxOf(c);
  const { x, y } = centreOf(i);
  const k = SURFACE[c.moment].k * U;
  const body =
    c.moment === 'approve' ? (
      <ProjectPanel frame={F} theme={T} scale={k} x={0} y={0} data={MOMENTS.review} doneAt={hit} photos={(c.photos ?? []).map((p) => staticFile(p))} />
    ) : c.moment === 'chat' ? (
      <ChatCard frame={F} theme={T} scale={k} x={0} y={0} data={MOMENTS.review.chat} people={MOMENTS.review.team} at={[hit - f60(70), hit - f60(34), hit]} />
    ) : c.moment === 'count' ? (
      <StatCard frame={F} theme={T} scale={k} x={0} y={0} label={MOMENTS.count.label} count={{ from: MOMENTS.count.from, perSec: MOMENTS.count.perSec, start: hit }} drawAt={hit - f60(12)} />
    ) : c.moment === 'table' ? (
      // the readable row glides down the table to the row the change touched, landing on the hit
      <DenseScreen frame={F} theme={T} world={TABLE_WORLD} layout="table" w={w} h={h} focus={[{ at: hit - f60(80), row: 1 }, { at: hit - f60(40), row: 3 }, { at: hit, row: 5 }]} lift={0} />
    ) : (
      <BudgetCard frame={F} theme={T} scale={k} x={0} y={0} data={MOMENTS.budget} add={MOMENTS.budget.toast.amount} addAt={hit} />
    );
  return (
    <Lit frame={F} x={x} y={y} w={w} h={h} r={28 * U} tilt={{ x: 9, y: i % 2 ? 11 : -11 }} ground={T.ground} vanish={[x, y]} id={`surface-${i}`}>
      {body}
    </Lit>
  );
};

/** The object inside a change's sentence: the product's real mark, or a chip with its name until it is fetched. */
const objectOf = (c: Change): InlineRef => (c.logo && hasLogo(c.logo) ? c.logo : { kind: 'chip', label: c.logoName ?? '' });

// ---------------------------------------------------------------------------------------------- the world
export const World: React.FC<{ from: number }> = ({ from }) => {
  const F = useCurrentFrame() + from;
  const s = shotAt(F);
  // the strip falls out of focus behind the version: on a 'pull' once the carried pull has crossed the act line (the
  // version swings in on the decay), on a 'rise' as the last change recedes
  const pull = DEAL.payoff === 'pull';
  const stepBack = wordsBack(F); // the strip steps back behind each change's centred words
  const soft = Math.max(stepBack * 0.75, pull ? prog(F, CUE.gather + f60(12), CUE.gather + f60(46), E.stdInOut) : prog(F, CUE.gather - f60(10), CUE.gather + f60(34), E.stdInOut));
  // the version: in the hook it leaves left ahead of the camera; from the payoff it swings (or rises) back in front
  const leave = prog(F, beat(BEATS.change(0)) - MOVE / 2, beat(BEATS.change(0)) + MOVE / 2, E.strongInOut);
  // 'pull': the version swings in from the right with the pull, already moving on the act line (one carried move);
  // 'rise': it rises out of its mask from CUE.swing
  const swingFrom = pull ? CUE.gather + f60(12) : CUE.swing; // 'pull': in from the right on the pull's decay, landing on CUE.land; 'rise': out of its mask from CUE.swing
  const early = F < swingFrom;
  const back = prog(F, swingFrom, CUE.land, pull ? E.glideOut : E.snapOut);
  const rest = prog(F, beat(BEATS.end) - f60(20), beat(BEATS.end) + f60(20), E.strongInOut); // the move to the end card, at its fastest on the act line
  const hookDrift = (F * 0.45 * U * 60) / FPS; // the set drifts left under the hook's read (a living hold)
  const beside = DEAL.end === 'beside';
  const name = copy('wordmark');
  const nameSize = TYPE.display.size * U;
  const nameW = measureTracked(name.text, nameSize, TYPE.display.weight, TYPE.display.track);
  // 'beside': the version settles at the name's size, after the name, as one lockup centred on the frame
  const besideSize = nameSize * 1.02;
  const markSize = 150 * U;
  const lockW = markSize + 40 * U + nameW + 0.3 * nameSize + measureTracked(UPDATE.version, besideSize, NUM.weight, NUM.track);
  const lockX = (W - lockW) / 2;
  const rise = DEAL.payoff === 'rise';
  const landW0 = measureTracked(UPDATE.version, NUM_LAND.size, NUM.weight, NUM.track);
  const landFit = NUM_LAND.size * Math.min(1, (W * NUM_LAND.fill) / landW0);
  const landX = (W - (landW0 * landFit) / NUM_LAND.size) / 2;
  const landSize = rise ? landFit : lmix(NUM.size * 1.2, landFit, back);
  // 'set': the version steps back, smaller and quieter, to the upper right, whole and readable, above the lockup
  const setSize = NUM_LAND.size * SET_K;
  const numSize = early ? NUM.size : lmix(landSize, beside ? besideSize : setSize, rest);
  const restX = beside ? lockX + lockW - measureTracked(UPDATE.version, besideSize, NUM.weight, NUM.track) : (W - measureTracked(UPDATE.version, setSize, NUM.weight, NUM.track)) / 2;
  const numX = early ? NUM.x - hookDrift - leave * 2700 * U : (rise ? landX : mix(W + 200 * U, landX, back)) + rest * (restX - landX);
  // the 'mask' hook lifts the new version out of its mask; the 'rise' payoff lifts it in front of the receding change
  const numRise = early ? (DEAL.hook === 'mask' ? riseAt(F, CUE.rise) : 1) : rise ? riseAt(F, CUE.swing) : 1;
  const numTone = beside ? T.text : mixColor(T.text, mixColor(T.text, T.ground, 0.45), prog(F, beat(BEATS.end), beat(BEATS.end) + f60(30), E.softOut)); // 'set': the version steps back to a quiet solid tone behind the lockup
  const numW = measureTracked(UPDATE.version, numSize, NUM.weight, NUM.track);
  const showNum = F < beat(BEATS.change(0)) + MOVE || !early;
  const numY = F >= beat(BEATS.end) - f60(20) ? mix((H - numSize * NUM.lead) / 2 - 40 * U, beside ? H / 2 - (numSize * NUM.lead) / 2 : 90 * U, rest) : (H - numSize * NUM.lead) / 2 - 40 * U + (early ? NAME_HOOK.drop : 0);
  // the words of the change on screen now
  const cur = UPDATE.changes.findIndex((_, i) => F >= copy(`change${i + 1}`).in - 1 && F < beat(BEATS.change(i + 1)) + 2);
  const product = copy('product');
  const lockRow = beside ? { x: lockX, y: H / 2 } : { x: (W - (markSize + 40 * U + nameW)) / 2, y: 0.66 * H }; // 'set': the lockup centred under the version
  // from the landing on, the version and then the lockup creep in, each about its own centre: the holds never freeze
  const lockK = creepK(F, CUE.land, { pctPerSec: 0.02 }, FPS);
  const strip = (
    <div style={camera(s)}>
      {UPDATE.changes.map((c, i) => <Surface key={c.id} c={c} i={i} F={F} />)}
    </div>
  );
  return (
    <AbsoluteFill style={{ background: T.ground, overflow: 'hidden' }}>
      <LitGround frame={F} spec={{ kind: 'key', base: T.ground, seed: 7, drift: 12 }} cam={{ shot: s, base: HOOK }} />
      {/* the strip of product moments, sharp until the payoff, then softening into a far plane behind the version; it
          clears under each change's words (their own clean beat on the ground) and comes back for the next surface */}
      <div style={{ position: 'absolute', inset: 0, opacity: (1 - (beside ? 0.7 : 0.6) * rest) * (1 - stepBack) }}>
        <RackFocus t={soft} blur={10 * U} render={() => strip} />
      </div>
      {showNum && (
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${(numX + numW / 2).toFixed(1)}px ${(numY + (numSize * NUM.lead) / 2).toFixed(1)}px`, transform: `scale(${lockK.toFixed(5)})` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: numW + 40, transform: `translate3d(${numX.toFixed(2)}px, ${numY.toFixed(2)}px, 0)` }}>
            <Numerals F={F} size={numSize} color={numTone} shade={mixColor(numTone, T.ground, 0.38)} rollAt={CUE.roll} rise={numRise} />
          </div>
        </div>
      )}
      {/* the name over the version: "[Name] [version]" from frame 0 (the set's subject, read while the version arrives), leaving left with the numerals */}
      {showNum && early && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: W, display: 'flex', justifyContent: 'center', transform: `translate3d(${(-hookDrift - leave * 2700 * U).toFixed(2)}px, ${NAME_HOOK.y.toFixed(2)}px, 0)` }}>
          <span data-text="product" style={{ ...typeStyle('line', TYPE.line.size * U), color: T.text, whiteSpace: 'nowrap' }}>
            {product.text}
          </span>
        </div>
      )}
      {cur >= 0 && <ChangeWords i={cur} F={F} />}
      {F >= Math.min(CUE.markIn, name.in) && ( // the mark rises first; a long name at a fast track may start just before it
        <div style={{ position: 'absolute', inset: 0, transformOrigin: beside ? '50% 50%' : `${(lockRow.x + (markSize + 40 * U + nameW) / 2).toFixed(1)}px ${lockRow.y.toFixed(1)}px`, transform: `scale(${lockK.toFixed(5)})` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${lockRow.x.toFixed(2)}px, ${(lockRow.y - markSize / 2).toFixed(2)}px, 0)` }}>
            <LogoMark
              logo={LOGO}
              size={markSize}
              fill={(part) => (T.dark && part.items.some((it) => it.fill?.toLowerCase() === C.ink.toLowerCase()) ? T.text : undefined)} // the mark's ink parts read on the slate
              poses={(_, j) => {
                const t = prog(F, CUE.markIn + PART_ON[j], CUE.markIn + f60(32) + PART_ON[j], E.glideOut); // the parts rise first (phrased: lib/cadence), the name lands after them
                const glint = j === LOGO.parts.length - 1 ? 0.08 * hitPulse(F - CUE.glint, 2, 9) : 0; // the last part catches the light
                return { y: (1 - t) * 40, o: Math.min(1, t * 2), s: 1 + glint };
              }}
            />
          </div>
          <HeroLine id="wordmark" text={name.text} at={name.in} frame={F} move={NAME_MOVE} role="display" size={nameSize} x={lockRow.x + markSize + 40 * U + nameW / 2} y={lockRow.y} color={T.text} accent={T.accent} mute={T.mute} />
        </div>
      )}
    </AbsoluteFill>
  );
};

/** The sentence that says change i: display size when short, centred in the middle of the frame over its softened surface, leaving on the film's exit before the move. */
const ChangeWords: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const ch = UPDATE.changes[i];
  const c = copy(`change${i + 1}`);
  const role = c.text.length <= 12 ? 'display' : 'line';
  const size = TYPE[role].size * U;
  const x = W / 2;
  const y = H / 2;
  const p = { id: `change${i + 1}`, at: c.in, frame: F, move: moveOf(`change${i + 1}`), out: changeOut(i), exit: LINES.exit[`change${i + 1}`], role, size, x, y, color: T.text, accent: T.accent, mute: T.mute } as const;
  return ch.words.includes('[]') ? <MarkLine {...p} text={ch.words} objects={[objectOf(ch)]} ground={T.dark ? 'dark' : 'light'} theme={T} /> : <HeroLine {...p} text={c.text} />;
};

/** The surface frames of each change (for src/sync.ts and the acts): its hit and its words. */
export const CHANGE_FRAMES = UPDATE.changes.map((c, i) => ({ id: c.id, moment: c.moment, hit: CUE[`hit${i}`], resolved: copy(`change${i + 1}`).resolved, out: changeOut(i), words: spokenChange(c) }));
export { ACT };
