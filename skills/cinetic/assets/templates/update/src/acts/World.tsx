// The update film's world: one strip the camera travels. The name and the version open it (the name over giant
// numerals cropped by the frame, the last numeral rolling to the new value); each change is a product surface on
// the strip that does the new thing on its beat while one fragment names it; the camera pulls back over
// every change (softened, a far plane) as the version swings back in front; the version recedes into the
// set and the mark and the name are set before it. Every act renders this world at its own frames, so
// the camera's speed carries across each act line by construction.
//
// Retell it in the dealt direction's world (out/DIRECTION.md): its space, light and signature replace
// this floor. The product surfaces come from src/kit until the product's own UI is rebuilt for film.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { C, TYPE, U, typeStyle } from '../brand/tokens';
import { Words } from '../fx/Words';
import { BudgetCard, ChatCard, kitTheme, ProjectPanel, StatCard } from '../kit';
import { E, clamp, hitPulse, lmix, mix, prog } from '../lib/anim';
import { camera, lc, type Shot } from '../lib/camera';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { ACT, beat, BEATS, copy, CUE, f60, H, N, ROLL, SAY_OUT, TOTAL, W } from '../timeline';
import { type Change, UPDATE } from '../update';

/** The film's kit colours: the mid slate at the accent's hue (lib/look.ts STAGE.dark). */
export const THEME = kitTheme('slateMid', C.accent);
const T = THEME;

// ---------------------------------------------------------------------------------------------- layout
/** The version numerals: giant, cropped by the frame (the set), in the hook and again from the payoff on. */
export const NUM = { size: 1500 * U, x: 150 * U, lead: 0.92, weight: TYPE.giant.weight, track: TYPE.giant.track } as const;
/** The product's name over the version in the hook: line size, top left; the numerals drop to make room for it. */
export const NAME_HOOK = { y: 80 * U, drop: 300 * U } as const;
/** Where the version lands in the payoff and where it rests behind the lockup (screen px). */
export const NUM_LAND = { size: 1180 * U, x: 560 * U, rest: 820 * U } as const;
/** The strip: change i's surface is centred at x0 + i * gap (world px), alternating above and below. */
export const STRIP = { x0: 2600 * U, gap: 2300 * U, y: 560 * U, alt: 120 * U } as const;
/** How each moment's surface is scaled from its kit size (it bleeds past the frame at this scale). */
const SURFACE: Record<Change['moment'], { k: number; w: number; h: number }> = {
  approve: { k: 1.4, w: 1160, h: 740 },
  chat: { k: 1.9, w: 640, h: 600 },
  count: { k: 1.9, w: 640, h: 560 },
  budget: { k: 1.6, w: 900, h: 440 },
};
const boxOf = (c: Change) => ({ w: SURFACE[c.moment].w * SURFACE[c.moment].k * U, h: SURFACE[c.moment].h * SURFACE[c.moment].k * U });
const centreOf = (i: number) => ({ x: STRIP.x0 + i * STRIP.gap, y: STRIP.y + (i % 2 ? STRIP.alt : -STRIP.alt) });

// ---------------------------------------------------------------------------------------------- camera
/** Change i framed off-centre: its surface bleeds past the right and one horizontal edge; the words sit lower left. */
const shotOf = (i: number): Shot => ({ ax: centreOf(i).x, ay: centreOf(i).y, sx: 1300 * U, sy: (i % 2 ? 440 : 380) * U, k: 1 });
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

/** The camera at absolute frame F: the hook's creep, a move across every act line, the pull back, a slow push to the end. */
export const shotAt = (F: number): Shot => {
  let s = creep(HOOK, F, 0, beat(BEATS.change(0)));
  for (let i = 0; i < N; i++) {
    const at = beat(BEATS.change(i));
    const next = beat(BEATS.change(i + 1));
    s = lc(s, pushIn(creep(shotOf(i), F, at, next), F, CUE[`push${i}`]), across(F, at));
  }
  s = lc(s, WIDE, prog(F, CUE.gather - f60(18), CUE.gather + f60(54), E.strongInOut));
  return { ...s, k: s.k * lmix(1, 1.05, prog(F, CUE.gather + f60(54), TOTAL, E.linear)) };
};

// ---------------------------------------------------------------------------------------------- pieces
/** The version as giant numerals; changed characters roll on a masked drum (old above, new below). */
const Numerals: React.FC<{ F: number; size: number; color: string; shade: string; rollAt: number }> = ({ F, size, color, shade, rollAt }) => {
  const p = prog(F, rollAt, rollAt + f60(ROLL), E.snapOut);
  const box = size * NUM.lead;
  const fill: React.CSSProperties = { backgroundImage: `linear-gradient(180deg, ${color} 0%, ${color} 46%, ${shade} 100%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' };
  return (
    <div data-text="version" style={{ display: 'flex', ...typeStyle('giant', size), lineHeight: NUM.lead }}>
      {[...UPDATE.version].map((ch, i) => {
        const old = UPDATE.from[i] ?? ch;
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
  );
};

/** One change's product surface, doing the new thing on its hit frame. */
const Surface: React.FC<{ c: Change; i: number; F: number }> = ({ c, i, F }) => {
  const hit = CUE[`hit${i}`];
  const { w, h } = boxOf(c);
  const { x, y } = centreOf(i);
  const k = SURFACE[c.moment].k * U;
  const at = { x: x - w / 2, y: y - h / 2 };
  if (c.moment === 'approve') return <ProjectPanel frame={F} theme={T} scale={k} x={at.x} y={at.y} doneAt={hit} />;
  if (c.moment === 'chat') return <ChatCard frame={F} theme={T} scale={k} x={at.x} y={at.y} at={[hit - f60(70), hit - f60(34), hit]} />;
  if (c.moment === 'count') return <StatCard frame={F} theme={T} scale={k} x={at.x} y={at.y} count={{ from: 18240, perSec: 140, start: hit }} drawAt={hit - f60(12)} />;
  return <BudgetCard frame={F} theme={T} scale={k} x={at.x} y={at.y} add={86} addAt={hit} />;
};

/** A pre-softened near plane: soft dark shapes crossing the bottom edge at 1.8x the camera's travel. */
const Near: React.FC<{ s: Shot }> = ({ s }) => (
  <>
    {[0, 1, 2, 3, 4, 5].map((j) => {
      const x = (j * 2600 - 400) * U - (s.ax - HOOK.ax) * 1.8 * Math.min(1, s.k);
      if (x < -1400 * U || x > W + 400 * U) return null;
      return (
        <div
          key={j}
          style={{
            position: 'absolute', left: 0, top: H - 230 * U, width: 1200 * U, height: 760 * U, borderRadius: '50%',
            transform: `translate3d(${x.toFixed(2)}px, 0, 0)`,
            background: `radial-gradient(closest-side, rgba(${T.shade.join(', ')}, 0.62), rgba(${T.shade.join(', ')}, 0.32) 55%, rgba(${T.shade.join(', ')}, 0) 100%)`,
          }}
        />
      );
    })}
  </>
);

// ---------------------------------------------------------------------------------------------- the world
export const World: React.FC<{ from: number }> = ({ from }) => {
  const F = useCurrentFrame() + from;
  const s = shotAt(F);
  const soft = prog(F, CUE.gather, CUE.gather + f60(30), E.softOut); // the strip falls out of focus in the pull back
  const key = 0.07 + 0.05 * Math.max(0, ...UPDATE.changes.map((_, i) => hitPulse(F - CUE[`hit${i}`], 2, 9)), hitPulse(F - CUE.land, 2, 12));
  // the version: in the hook it leaves left ahead of the camera; from the payoff it swings back in front and lands
  const leave = prog(F, beat(BEATS.change(0)) - MOVE / 2, beat(BEATS.change(0)) + MOVE / 2, E.strongInOut);
  const back = prog(F, CUE.gather, CUE.land, E.snapOut);
  const rest = prog(F, beat(BEATS.end) - f60(10), beat(BEATS.end) + f60(26), E.jump);
  const numSize = F < CUE.gather ? NUM.size : lmix(NUM.size * 1.2, NUM_LAND.size, back);
  const numX = F < CUE.gather ? NUM.x - leave * 2700 * U : mix(W + 200 * U, NUM_LAND.x, back) + rest * (NUM_LAND.rest - NUM_LAND.x);
  const numTone = mixColor(T.text, T.raised, prog(F, beat(BEATS.end), beat(BEATS.end) + f60(30), E.softOut)); // the version recedes into the set
  const numW = measureTracked(UPDATE.version, numSize, NUM.weight, NUM.track);
  const showNum = F < beat(BEATS.change(0)) + MOVE || F >= CUE.gather;
  // the words of the change on screen now
  const cur = UPDATE.changes.findIndex((_, i) => F >= copy(`change${i + 1}`).in - 1 && F < beat(BEATS.change(i + 1)) + 2);
  const name = copy('wordmark');
  const lock = prog(F, name.in, CUE.lockup, E.glideOut);
  return (
    <AbsoluteFill style={{ background: T.ground, overflow: 'hidden' }}>
      {/* the strip of product moments (a sharp copy, and a softened copy cross-faded in for the pull back) */}
      <div style={camera(s)}>
        {UPDATE.changes.map((c, i) => <Surface key={c.id} c={c} i={i} F={F} />)}
      </div>
      {soft > 0 && (
        <div style={{ ...camera(s), filter: 'blur(8px)', opacity: soft }}>
          <div style={{ position: 'absolute', left: -20000, top: -20000, width: 60000, height: 60000, background: T.ground }} />
          {UPDATE.changes.map((c, i) => <Surface key={c.id} c={c} i={i} F={F} />)}
        </div>
      )}
      {/* the key: raking from the upper left, brightening on each hit (one light event per act) */}
      <AbsoluteFill style={{ background: `linear-gradient(158deg, rgba(255,255,255,${key.toFixed(3)}) 0%, rgba(255,255,255,0) 42%, rgba(${T.shade.join(', ')}, 0.22) 100%)` }} />
      {showNum && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: numW + 40, transform: `translate3d(${numX.toFixed(2)}px, ${((H - numSize * NUM.lead) / 2 - 40 * U + (F < CUE.gather ? NAME_HOOK.drop : 0)).toFixed(2)}px, 0)` }}>
          <Numerals F={F} size={numSize} color={numTone} shade={mixColor(numTone, T.ground, 0.38)} rollAt={CUE.roll} />
        </div>
      )}
      {/* the name over the version: "[Name] [version]" from frame 0, leaving left with the numerals */}
      {showNum && F < CUE.gather && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${(numX + 16 * U).toFixed(2)}px, ${NAME_HOOK.y.toFixed(2)}px, 0)` }}>
          <Words id="product" text={copy('product').text} frame={F} start={copy('product').in - 1} dur={f60(2)} size={TYPE.line.size * U} style={{ ...typeStyle('line', TYPE.line.size * U), color: T.text }} />
        </div>
      )}
      {/* the end card's light event: one soft band of the key crossing the version behind the name */}
      {F >= CUE.light && F < CUE.light + f60(80) && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(112deg, rgba(255,255,255,0) ${mix(-30, 110, prog(F, CUE.light, CUE.light + f60(80), E.smooth)) - 14}%, rgba(255,255,255,0.11) ${mix(-30, 110, prog(F, CUE.light, CUE.light + f60(80), E.smooth))}%, rgba(255,255,255,0) ${mix(-30, 110, prog(F, CUE.light, CUE.light + f60(80), E.smooth)) + 14}%)`,
          }}
        />
      )}
      <Near s={s} />
      {cur >= 0 && <ChangeWords i={cur} F={F} />}
      {F >= name.in - 2 && (
        <div style={{ position: 'absolute', left: 120 * U, top: 560 * U }}>
          <LogoMark
            logo={LOGO}
            size={170 * U}
            poses={(_, j) => {
              const t = prog(F, name.in - f60(12) + j * f60(5), name.in + f60(20) + j * f60(5), E.glideOut);
              const glint = j === LOGO.parts.length - 1 ? 0.12 * hitPulse(F - CUE.glint, 2, 9) : 0; // the last part catches the key
              return { x: (1 - t) * -60, o: t, s: 1 + glint };
            }}
          />
          <div style={{ position: 'absolute', left: 0, top: 200 * U, color: T.text, transform: `translateX(${((1 - lock) * -40 * U).toFixed(2)}px)` }}>
            <Words id="wordmark" text={name.text} frame={F} start={name.in} size={TYPE.display.size * U} style={{ ...typeStyle('display', TYPE.display.size * U), color: T.text }} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/** The sentence that says change i: line size or display size by length, lower left, launching into the next move. */
const ChangeWords: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const c = copy(`change${i + 1}`);
  const role = c.text.length <= 12 ? 'display' : 'line';
  const size = TYPE[role].size * U;
  const exitAt = beat(BEATS.change(i + 1)) - 1;
  return (
    <div style={{ position: 'absolute', left: 120 * U, top: (i % 2 ? 230 : 690) * U, color: T.text }}>
      <Words id={`change${i + 1}`} text={c.text} frame={F} start={c.in} size={size} out={c.out} exit="launch" exitDir="left" exitAt={exitAt} style={{ ...typeStyle(role, size), color: T.text }} />
    </div>
  );
};

/** The surface frames of each change (for src/sync.ts and the acts): its hit and its words. */
export const CHANGE_FRAMES = UPDATE.changes.map((c, i) => ({ id: c.id, moment: c.moment, hit: CUE[`hit${i}`], resolved: copy(`change${i + 1}`).resolved, out: copy(`change${i + 1}`).out - f60(SAY_OUT) }));
export { ACT };
