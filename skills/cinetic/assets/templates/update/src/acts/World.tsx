// The update film's stage: one world (fx/world WorldSteps: dealt, never cut, one step per act on the spine's act cuts)
// under the whole film, and in it the film's ONE element handed on from act to act (src/timeline.ts SPINE, HANDS):
//
//   the hook    the name and the version's pill, centred (roll, rise or badge, dealt): the pill is the element. The name
//               leaves as the pill lifts and is handed into the first change
//   a change    its hero shot (acts/heroes.tsx) draws the element in the act's form. It arrives INSIDE the element: the
//               handover (fx/Handover) carries the element's box, corner and content from the last shot's camera into
//               this shot's camera (it grows, flies, swells, shrinks or converges through a spark) while the shot before
//               falls back soft and this one racks in behind the landing element. The shot plays its one camera move and
//               its moment; its held result keeps creeping on the tail of that move (never a still frame). Its line
//               meets the element (src/deal.ts PLACES):
//                 part   the line builds round a gap; the element lands in it as a porthole holding the shot; the words
//                        leave and the porthole opens into the frame
//                 head   the line arrives as the element lands and rides over it in the shot's own space (centred above
//                        or under it), leaving as the element hands on
//   the end     the last form converges into a spark from which the brand's mark grows as a solid (fx/three Logo3D;
//               its CSS-3D twin without hardware WebGL); one pull-back lands it exactly on the flat mark; the name slides
//               out of it and the version lands on the last bar line apart from the name, held to the end
//
// The camera never floats: it moves inside a hero shot (one declared move that lands), on the world's step per act and
// in the handovers. Nothing bobs or breathes, no card rests tilted. Lines are centred, never over a sharp shot.
import React from 'react';
import { AbsoluteFill, Freeze, useCurrentFrame } from 'remotion';
import { type Logo, LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { C, FONT, TYPE, TYPE_FAMILY, typeStyle, U } from '../brand/tokens';
import { DEAL, LINES } from '../deal';
import { Handover } from '../fx/Handover';
import { type GlMode, Logo3D } from '../fx/three';
import { stepsFromPlan, WorldSteps } from '../fx/world';
import { type CameraPath } from '../fx/depth/index';
import { underStage } from '../fx/Handover';
import { FACE_SET, PAIR_IDS, PAIRS, type PairId, safeTrack, wordmarkStyle } from '../fx/TypePairs';
import { hasLogo } from '../kit';
import type { InlineRef } from '../kit/inline';
import { clamp, E, hitPulse, mix, prog } from '../lib/anim';
import { mixColor, toOklch } from '../lib/color';
import { defocusLevel } from '../lib/defocus';
import { type HandSide, type HBox, scaleAbout } from '../lib/handover';
import { measureTracked } from '../lib/measure';
import type { Form } from '../lib/spine';
import { ACT, CLOSE, copy, EXIT_F, f60, FPS, H, type Hand, HANDS, handIn, handOut, HOOK, N, ROLL, SPINE_PLAN, TIMES, type ChangeTimes, W } from '../timeline';
import { type Change, spokenChange, UPDATE } from '../update';
import { heroCamera, heroElement, heroFocus, HeroShot } from './heroes';
import { ACCENT, DARK, INK, LIGHT3D, MUTE, PLATE, THEME, WORLD, warnStandIn, worldDrawn } from './look';
import { gapLine, HeroLine, MarkLine } from './type';

export { THEME } from './look';

/**
 * The end card's 3D mark: 'auto' draws it in 3D on a hardware GPU and its CSS-3D twin otherwise (software GL); 'force'
 * renders the 3D on software GL too (slow: a check at half size, a few samples); 'fallback' always the flat twin.
 */
export const MARK_3D: { gl: GlMode; samples?: number } = { gl: 'auto' };
const FILM = { fps: FPS, width: W, height: H };

/** Text width: the loaded face in the browser; 0.55 em a letter in Node (src/sync.ts builds the handovers' tracks there). */
const mt: typeof measureTracked = (text, size, weight, track, family, o) => (typeof document === 'undefined' ? text.length * size * (0.55 + track) : measureTracked(text, size, weight, track, family, o));

// ---------------------------------------------------------------------------------------------- the type pairing
/** The film's pairing (fx/TypePairs), read from the voice and text faces scripts/type-deal.ts wrote; null for a brand face. */
const PAIR: PairId | null = (() => {
  const has = (stack: string | undefined, face: keyof typeof FACE_SET) => !!stack && stack.includes(`"${FACE_SET[face].family}"`);
  const voice = PAIR_IDS.filter((id) => has(FONT.text, PAIRS[id].voice));
  return voice.find((id) => has((FONT as { ui?: string }).ui ?? FONT.text, PAIRS[id].text)) ?? voice[0] ?? null;
})();
/** The name as a wordmark (the pairing's wordmark weight, tracked for its size), never two letters touching. */
const wordmarkAt = (size: number): React.CSSProperties => {
  const base = PAIR ? wordmarkStyle(PAIR, size, TYPE_FAMILY) : { ...typeStyle('display', size), lineHeight: 1 };
  const track = parseFloat(String(base.letterSpacing)) || 0;
  const fam = String(base.fontFamily);
  return { ...base, letterSpacing: `${safeTrack(UPDATE.name, `${base.fontWeight} ${fam}`, size, track)}em` };
};

// ---------------------------------------------------------------------------------------------- the lines
/**
 * Two size bands across the lines (a hierarchy, never every line the same white line at one size): the parted line is
 * the film's statement (large, the porthole in it), a line riding over its element is set smaller, as the shot's heading.
 */
export const LINE_SCALE = { part: 1.25, head: 0.86 } as const;
/** The line's ground on a photograph: a soft pool of the place's deep tone behind the words. */
const POOL = { a: 0.42, w: 1.6, h: 3.0 } as const;
const LinePool: React.FC<{ w: number; size: number; a: number; y?: number }> = ({ w, size, a, y = H / 2 }) => {
  if (!PLATE || DARK === false || a <= 0.004) return null;
  const deep = mixColor(WORLD.base, '#000000', 0.4);
  const pw = w * POOL.w + size * 2;
  const ph = size * 1.2 * POOL.h;
  return <div data-pool="" style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(W / 2 - pw / 2).toFixed(2)}px, ${(y - ph / 2).toFixed(2)}px)`, width: pw, height: ph, borderRadius: '50%', background: `radial-gradient(closest-side, ${deep} 0%, ${deep} 38%, transparent 100%)`, opacity: POOL.a * a }} />;
};
const lineSize = (text: string, extra = 0, k = 1, share = 0.66) => {
  const base = TYPE.line.size * U * k;
  const w = mt(text.replace('[]', 'MM'), base, TYPE.line.weight, TYPE.line.track, FONT.text) + extra;
  // the words take what the measure leaves after the object in the line (a gap does not scale with the type)
  return extra > 0 ? Math.min(base, (base * Math.max(0.2 * W, share * W - extra)) / Math.max(1, w - extra)) : Math.min(base, (base * share * W) / Math.max(1, w));
};
/** A line leaving on the film's one whole-line exit (lift: up into a blur; recede: back out of focus), gone before its travel ends. */
const exitStyle = (F: number, out: number, size: number, voice: string = LINES.exitVoice): React.CSSProperties => {
  const raw = clamp((F - out) / Math.max(1, EXIT_F));
  const q = E.buildIn(raw);
  if (q <= 0) return {};
  const lift = voice === 'lift';
  const move = lift ? `translateY(${(-0.3 * size * q).toFixed(2)}px)` : `scale(${(1 - 0.06 * q).toFixed(4)})`;
  return { opacity: 1 - E.softOut(clamp(raw / 0.8)), transform: move, transformOrigin: '50% 50%', filter: `blur(${((lift ? 0.1 : 0.12) * size * q).toFixed(2)}px)` };
};
/** Another product's mark inside a line: its official mark set in the line's own ink. */
const objectOf = (c: Change): InlineRef => (c.logo && hasLogo(c.logo) ? { kind: 'logo', logo: c.logo, mono: true } : { kind: 'chip', label: c.logoName ?? '' });
/** Where a parted line parts: the word boundary nearest its middle by width, never inside the change's key words. */
const splitAt = (c: Change, size: number): [string, string] => {
  const words = spokenChange(c).split(/\s+/);
  const bare = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const key = (c.key ?? '').toLowerCase().split(/\s+/).map(bare).filter(Boolean);
  const k0 = key.length ? words.findIndex((_, j) => key.every((kw, m) => bare(words[j + m] ?? '') === kw)) : -1;
  const width = (s: string) => mt(s, size, TYPE.line.weight, TYPE.line.track, FONT.text);
  let best = 1;
  let score = Infinity;
  for (let j = 1; j < words.length; j++) {
    if (k0 >= 0 && j > k0 && j < k0 + key.length) continue;
    const d = Math.abs(width(words.slice(0, j).join(' ')) - width(words.slice(j).join(' ')));
    if (d < score) [best, score] = [j, d];
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};
/** The porthole: its side as a share of the frame height (the picture in the sentence is the frame's subject). */
const PORT = { h: 0.52 } as const;
/** A value measured from the real face: built on first use, inside a render (FontGate has loaded the fonts by then). */
const lazy = <V,>(make: () => V): (() => V) => {
  let v: V | undefined;
  return () => (v === undefined ? (v = make()) : v);
};
/** Each parted change's line, laid out once: its text with the gap, its size, the gap's centre and the porthole's radius. */
const SPLIT = lazy(() =>
  TIMES.map((t) => {
    if (t.place !== 'part') return null;
    const c = UPDATE.changes[t.i];
    const k = LINE_SCALE.part;
    const side = PORT.h * H; // the window: about half the frame high, whatever the line's size
    const s0 = lineSize(spokenChange(c), side * 1.18, k, 0.84); // title-safe: 8 % of the width clear on each side
    const [a, b] = splitAt(c, s0);
    const id = `change${t.i + 1}`;
    const gapW = side * 1.18;
    if (typeof document === 'undefined') {
      // Node (the tracks src/sync.ts declares): the gap's centre from estimated widths
      const wa = mt(a, s0, TYPE.line.weight, TYPE.line.track, FONT.text);
      const wb = mt(b, s0, TYPE.line.weight, TYPE.line.track, FONT.text);
      return { text: `${a} [] ${b}`, size: s0, x: W / 2 + (wa - wb) / 2, w: gapW, y: H / 2, r: side / 2 };
    }
    const g = gapLine({ id, text: `${a} [] ${b}`, at: 0, move: LINES.move[id], role: 'line', size: s0, x: W / 2, y: H / 2, color: INK, gapW });
    return { ...g, y: H / 2, r: side / 2 };
  }),
);

// ---------------------------------------------------------------------------------------------- the shots and their element
/**
 * The shot's creep from the element's landing, about the element, never a sinusoid: the tail of the move that brought it
 * in. It leaves at about 0.3 % a 30 fps frame and decays (`start` share over `tau` 60 fps frames) onto a steady `rate`
 * per 60 fps frame, so it never stops and never grows a long shot's element past the frame (about 8 % over 3 s).
 */
const CREEP_TAIL = { start: 0.04, tau: 40, rate: 0.00025 } as const;
/** The same creep's opening rate per 60 fps frame (the porthole's wait and the hook use it). */
const CREEP = CREEP_TAIL.start / CREEP_TAIL.tau + CREEP_TAIL.rate;
const tailOf = (t60: number) => CREEP_TAIL.start * (1 - Math.exp(-t60 / CREEP_TAIL.tau)) + CREEP_TAIL.rate * t60;
/** How a shot falls back as the element leaves it, and how it racks in behind the landing element. */
const LEAVE = { blur: 22, scale: 0.05, dim: 0.5, arrive: 16 } as const;

/** Change i's shot camera (local frames from h0), cached. */
const CAMS: (CameraPath | null)[] = TIMES.map((t) => heroCamera(t.i));
/** The creep's scale at film frame F and its origin (the element's out box centre when the creep starts). */
const creepOf = (i: number, F: number): { s: number; ox: number; oy: number } => {
  const t = TIMES[i];
  const s = 1 + tailOf(Math.max(0, Math.min(F, t.heroEnd) - t.creep) * (60 / FPS));
  const o = rawBox(i, 'out', t.creep);
  return { s, ox: o.x + o.w / 2, oy: o.y + o.h / 2 };
};
/** Change i's element on screen at film frame F under its shot's camera (before the creep). */
const rawBox = (i: number, side: 'in' | 'out', F: number): HBox => {
  const t = TIMES[i];
  const el = heroElement(i, side);
  const cam = CAMS[i];
  if (!el || !cam) return { x: W * 0.28, y: H * 0.22, w: W * 0.44, h: H * 0.56 };
  return underStage(el.box, (f) => cam(Math.max(0, f - t.h0)), FILM, el.z)(F);
};
/** Change i's element on screen at film frame F, with the held result's creep. */
const elBox = (i: number, side: 'in' | 'out', F: number): HBox => {
  const b = rawBox(i, side, F);
  const c = creepOf(i, F);
  return c.s === 1 ? b : scaleAbout(b, c.s, c.ox, c.oy);
};

/** Change i's shot at film frame F, with its creep (no optics): what a handover's window and the porthole show. */
const ShotPlain: React.FC<{ i: number; F: number }> = ({ i, F }) => {
  const t = TIMES[i];
  const f = Math.max(0, F - t.h0);
  const c = creepOf(i, F);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: c.s !== 1 ? `scale(${c.s.toFixed(5)})` : undefined, transformOrigin: `${c.ox.toFixed(1)}px ${c.oy.toFixed(1)}px` }}>
      <Freeze frame={f}>
        <HeroShot t={t} f={f} />
      </Freeze>
    </div>
  );
};
/** A window onto a full-frame layer: its region `box` laid out at the box's size (a handover's content rides the box). */
const Window: React.FC<{ box: HBox; dx?: number; dy?: number; children: React.ReactNode }> = ({ box, dx = 0, dy = 0, children }) => (
  <div style={{ position: 'absolute', left: -box.x + dx, top: -box.y + dy, width: W, height: H }}>{children}</div>
);

/** Change i's shot as a scene: racking in behind the landing element, playing, falling back as the element hands on. */
const ShotLayer: React.FC<{ t: ChangeTimes; F: number }> = ({ t, F }) => {
  const hi = handIn(t.i);
  const ho = handOut(t.i);
  const start = t.iris ? t.iris[1] : hi.at;
  if (F < start || F >= ho.t1) return null;
  let o = 1;
  let blur = 0;
  let bright = 1;
  let s = 1;
  // the scenes never cross-dissolve: the one before has gone by the cut, this one racks in from it behind the element
  if (!t.iris && F < hi.t1) {
    const p = prog(F, hi.at, hi.t1, E.stdInOut);
    o = 0.15 + 0.85 * p;
    blur = LEAVE.arrive * (1 - p);
  }
  if (F >= ho.t0) {
    // it falls back as the element lifts off it, soft, dim and smaller, and has gone by the cut (the next one only racks
    // in from the cut: two pictures never share a frame sharp)
    const q = prog(F, ho.t0, ho.at, E.stdInOut);
    o *= 1 - E.softIn(clamp((q - 0.25) / 0.75));
    blur = Math.max(blur, LEAVE.blur * q);
    s = 1 - LEAVE.scale * q;
    if (DARK) bright = 1 - LEAVE.dim * q;
  }
  if (o <= 0.003) return null;
  const level = blur > 0.4 ? defocusLevel(blur) : 0;
  const filter = [level > 0 ? `blur(${level}px)` : '', bright !== 1 ? `brightness(${bright.toFixed(3)})` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, filter, transform: s !== 1 ? `scale(${s.toFixed(5)})` : undefined, transformOrigin: '50% 50%' }}>
      <ShotPlain i={t.i} F={F} />
    </div>
  );
};

/**
 * A parted change's porthole: the element landed in the line's gap as a rounded window holding its shot (or its
 * chosen picture), then opening into the frame: its box grows to cover the frame and its corners square off.
 */
const PORT_R = 0.62; // the window's corner radius as a share of its half side
const portOf = (t: ChangeTimes, F: number) => {
  const sp = SPLIT()[t.i];
  if (!sp || !t.iris) return null;
  const q = prog(F, t.iris[0], t.iris[1], E.strongInOut);
  const cx = mix(sp.x, W / 2, q);
  const cy = H / 2;
  const w = Math.exp(mix(Math.log(2 * sp.r), Math.log(W + 80), q));
  const h = Math.exp(mix(Math.log(2 * sp.r), Math.log(H + 80), q));
  const rad = mix(PORT_R * sp.r, 0, q);
  const [fx, fy] = heroFocus(t.i);
  // the shot inside slides so its subject sits in the window, settling to its own framing as it opens
  const tx = mix(sp.x - fx, 0, q);
  const ty = mix(cy - fy, 0, q);
  return { sp, q, box: { x: cx - w / 2, y: cy - h / 2, w, h } as HBox, rad, cx, cy, tx, ty };
};
/** The porthole's box on every frame from the element's landing in the gap until it covers the frame (src/sync.ts declares it as the element's track). */
export const portTrack = (i: number): [number, number, number, number, number][] => {
  const t = TIMES[i];
  if (!t.iris || !t.gap) return [];
  const out: [number, number, number, number, number][] = [];
  const r1 = (v: number) => Math.round(v * 10) / 10;
  for (let f = t.gap[1]; f <= t.iris[1]; f++) {
    const P = portOf(t, f);
    if (!P) break;
    const x0 = Math.max(0, P.box.x);
    const y0 = Math.max(0, P.box.y);
    const x1 = Math.min(W, P.box.x + P.box.w);
    const y1 = Math.min(H, P.box.y + P.box.h);
    out.push([f, r1(x0), r1(y0), r1(x1 - x0), r1(y1 - y0)]);
  }
  return out;
};
/**
 * The porthole holds the shot itself from the landing to the opening (its subject slid into the window), so the window
 * opening into the frame is ONE picture growing: never a second crop of the same picture blended over it (two offset
 * silhouettes read as a ghost).
 */
const PortholeLayer: React.FC<{ t: ChangeTimes; F: number }> = ({ t, F }) => {
  if (!t.iris || !t.gap || F < t.gap[1] || F >= t.iris[1]) return null;
  const P = portOf(t, F);
  if (!P) return null;
  const { box, rad, tx, ty, q } = P;
  // while it waits in the gap the window's picture creeps toward the lens (the hold creep), handing that back as it opens
  const wait = 1 + CREEP * Math.max(0, Math.min(F, t.iris[0]) - t.gap[1]) * (60 / FPS);
  const k = mix(wait, 1, q);
  const clip = `inset(${box.y.toFixed(2)}px ${(W - box.x - box.w).toFixed(2)}px ${(H - box.y - box.h).toFixed(2)}px ${box.x.toFixed(2)}px round ${rad.toFixed(2)}px)`;
  return (
    <>
      <div style={{ position: 'absolute', inset: 0, clipPath: clip }}>
        <div style={{ position: 'absolute', inset: 0, transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px) scale(${k.toFixed(5)})`, transformOrigin: `${(box.x + box.w / 2 - tx).toFixed(1)}px ${(box.y + box.h / 2 - ty).toFixed(1)}px` }}>
          <ShotPlain i={t.i} F={F} />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, transform: `translate(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px)`, borderRadius: rad, pointerEvents: 'none', opacity: 1 - q, boxShadow: `0 ${(18 * U).toFixed(1)}px ${(70 * U).toFixed(1)}px ${DARK ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.14)'}, inset 0 0 0 ${(1.5 * U).toFixed(2)}px rgba(255,255,255,${DARK ? 0.38 : 0.85})` }} />
    </>
  );
};

/** Change i's sentence: parted round its porthole (part), or riding over its element in the shot (head). */
const ChangeLine: React.FC<{ t: ChangeTimes; F: number }> = ({ t, F }) => {
  const ch = UPDATE.changes[t.i];
  const c = copy(`change${t.i + 1}`);
  if (F < c.in || F >= c.out + EXIT_F) return null;
  const id = `change${t.i + 1}`;
  const split = SPLIT()[t.i];
  if (split) {
    const p = { id, at: c.in, frame: F, move: LINES.move[id], role: 'line' as const, size: split.size, x: W / 2, y: H / 2, color: INK, accent: ACCENT, mute: MUTE };
    const textW = measureTracked(spokenChange(ch), split.size, TYPE.line.weight, TYPE.line.track, FONT.text);
    const node = <HeroLine {...p} text={split.text} />;
    return (
      <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, c.out, split.size) }}>
        <LinePool w={textW} size={split.size} a={E.softOut(clamp((F - c.in) / f60(10)))} />
        {node}
      </div>
    );
  }
  // head: centred above the element (or under it when it fills the top), riding it as the shot's camera moves
  const size = lineSize(ch.words, 0, LINE_SCALE.head);
  const gap = size * 0.95;
  const b0 = elBox(t.i, 'in', t.hin);
  const above = b0.y - gap - size * 0.6 >= H * 0.12;
  const below = b0.y + b0.h + gap + size * 0.6 <= H * 0.9;
  const b = elBox(t.i, 'in', Math.min(Math.max(F, t.hin), c.out)); // it rides the element until it leaves, then leaves from there
  const yRaw = above || !below ? b.y - gap - size * 0.1 : b.y + b.h + gap + size * 0.5;
  const y = clamp(yRaw, H * 0.1, H * 0.9);
  const p = { id, at: c.in, frame: F, move: LINES.move[id], role: 'line' as const, size, x: W / 2, y, color: INK, accent: ACCENT, mute: MUTE };
  const node = ch.words.includes('[]') ? <MarkLine {...p} text={ch.words} objects={[objectOf(ch)]} ground={DARK ? 'dark' : 'light'} theme={THEME} /> : <HeroLine {...p} text={spokenChange(ch)} />;
  const textW = measureTracked(spokenChange(ch), size, TYPE.line.weight, TYPE.line.track, FONT.text);
  return (
    <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, c.out, size) }}>
      <LinePool w={textW} size={size} a={E.softOut(clamp((F - c.in) / f60(10)))} y={y} />
      {node}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the name and the version
const NAME = { size: TYPE.display.size * U, gap: 0.3 } as const;
const tab: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };
/** The version's pill at a name size: the numerals set smaller in the accent pill. */
const pillOf = (size: number) => {
  const vs = 0.5 * size;
  const h = vs * 1.62;
  const w = mt(UPDATE.version, vs, 640, -0.01, FONT.text, { tabular: true }) + 1.1 * vs;
  return { vs, h, w };
};
/**
 * The pill is a solid face in the brand's accent, lit from above (a brighter top, a bright top edge, a soft shadow in its
 * own hue), the numerals in whichever of white or the ink reads on it: never an outlined badge.
 */
const PILL = { rim: 1.5 } as const;
const PILL_FILL = C.accent;
const PILL_FACE = `linear-gradient(180deg, ${mixColor(C.accent, '#FFFFFF', 0.14)} 0%, ${C.accent} 62%, ${mixColor(C.accent, '#000000', 0.06)} 100%)`;
const PILL_LIGHT = (k = 0) => `inset 0 ${(PILL.rim * U).toFixed(2)}px 0 rgba(255, 255, 255, ${(0.42 + 0.3 * k).toFixed(2)}), 0 ${(8 * U).toFixed(1)}px ${(22 * U).toFixed(1)}px -${(8 * U).toFixed(1)}px ${mixColor(C.accent, '#000000', 0.45)}`;
const ON_PILL = toOklch(C.accent)[0] < 0.64 ? '#FFFFFF' : C.ink;
/** The numerals in the pill: rolling on a drum from the version before (roll), else standing. */
const Numerals: React.FC<{ size: number; roll: number; id: string }> = ({ size, roll, id }) => {
  const box = size * 1.1;
  const style: React.CSSProperties = { fontFamily: FONT.text, fontSize: size, fontWeight: 640, letterSpacing: '-0.01em', lineHeight: `${box}px`, height: box, color: ON_PILL, whiteSpace: 'pre', display: 'block', ...tab };
  const from = UPDATE.from;
  const to = UPDATE.version;
  if (roll >= 1 || from.length !== to.length) return <span data-text={id} style={style}>{to}</span>;
  return (
    <span data-text={id} style={{ display: 'flex', height: box }}>
      {[...to].map((ch, k) =>
        from[k] === ch ? (
          <span key={k} style={style}>{ch}</span>
        ) : (
          <span key={k} style={{ display: 'inline-block', height: box, overflow: 'hidden', verticalAlign: 'top' }}>
            <span style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${(-roll * box).toFixed(2)}px)` }}>
              <span style={style}>{from[k]}</span>
              <span style={style}>{ch}</span>
            </span>
          </span>
        ),
      )}
    </span>
  );
};
/** The pill at full size (what the handover carries): the accent face, the numerals centred. */
const PillFace: React.FC<{ size: number; roll?: number; id?: string }> = ({ size, roll = 1, id = 'hook-version' }) => {
  const b = pillOf(size);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, borderRadius: b.h / 2, background: PILL_FACE, boxShadow: PILL_LIGHT(), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <Numerals size={b.vs} roll={roll} id={id} />
    </div>
  );
};
/** The hook's layout: the name and the pill centred as one pair from the first frame; the pill's box on screen. */
const HOOK_LAYOUT = lazy(() => {
  const size = NAME.size;
  const hw = wordmarkAt(size);
  const nameW = mt(UPDATE.name, size, Number(hw.fontWeight) || TYPE.display.weight, parseFloat(String(hw.letterSpacing)) || 0, String(hw.fontFamily));
  const pill = pillOf(size);
  const gap = NAME.gap * size;
  const groupW = nameW + gap + pill.w;
  const left = (W - groupW) / 2;
  const y = H / 2 - (size * 1.18) / 2;
  const pillBox: HBox = { x: left + nameW + gap, y: H / 2 - pill.h / 2 + 0.04 * size, w: pill.w, h: pill.h };
  return { size, nameW, groupW, left, y, pill, pillBox };
});
/** A word rising out of a mask on its baseline (p 0..1). */
const MaskUp: React.FC<{ p: number; size: number; children: React.ReactNode }> = ({ p, size, children }) => (
  <div style={{ height: size * 1.18, overflow: 'hidden' }}>
    <div style={{ transform: `translateY(${((1 - p) * size * 1.25).toFixed(2)}px)` }}>{children}</div>
  </div>
);

/** The hook's hold creep (per 60 fps frame, about the frame's centre) from the name's landing: half the shots' rate. */
const HOOK_CREEP = CREEP / 2;
const hookCreep = (F: number) => 1 + HOOK_CREEP * Math.max(0, F - f60(22)) * (60 / FPS);
const Hook: React.FC<{ F: number }> = ({ F }) => {
  const L = HOOK_LAYOUT();
  const hand = HOOK.hand;
  if (F >= Math.max(HOOK.out + EXIT_F, hand.t0)) return null;
  const { size, left, y, pillBox } = L;
  const nameIn = prog(F, 0, f60(22), E.snapOut);
  const mode = DEAL.hook;
  // the pill: a dot that lands and widens into the pill (badge), the pill rising out of its mask (rise), or standing
  // from the first frame with its changed numerals rolling (roll); it hides as the handover lifts it
  const pv = mode === 'badge' ? prog(F, HOOK.version - f60(4), HOOK.version + f60(34), E.linear) : mode === 'rise' ? prog(F, HOOK.version, HOOK.version + f60(24), E.snapOut) : prog(F, 0, f60(22), E.snapOut);
  const roll = mode === 'roll' ? prog(F, HOOK.roll, HOOK.roll + f60(ROLL), E.snapOut) : 1;
  const dot = mode === 'badge' ? E.glideOut(clamp(pv / 0.3)) : 1;
  const wide = mode === 'badge' ? E.strongInOut(clamp((pv - 0.08) / 0.62)) : 1;
  const txt = mode === 'badge' ? E.snapOut(clamp((pv - 0.45) / 0.5)) : 1;
  const d = 0.42 * pillBox.h;
  const pw = mix(d, pillBox.w, wide);
  const ph = mix(d, pillBox.h, wide);
  const rise = mode === 'rise' ? (1 - pv) * size * 0.9 : 0;
  const flash = mode === 'roll' ? hitPulse(F - (HOOK.roll + f60(ROLL)), 2, 14) : 0;
  const pill = F < hand.t0 && pv > 0 ? (
    <div style={{ position: 'absolute', left: 0, top: 0, width: pw, height: ph, transform: `translate(${pillBox.x.toFixed(2)}px, ${(pillBox.y + (pillBox.h - ph) / 2 + rise).toFixed(2)}px) scale(${dot.toFixed(4)})`, transformOrigin: `${(d / 2).toFixed(2)}px 50%`, borderRadius: ph / 2, background: PILL_FACE, boxShadow: PILL_LIGHT(flash), overflow: 'hidden', opacity: mode === 'rise' ? clamp(pv * 2) : 1 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: pillBox.w, height: pillBox.h, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: txt, transform: `translateY(${((1 - txt) * 0.5 * pillBox.h).toFixed(2)}px)` }}>
        <Numerals size={L.pill.vs} roll={roll} id="hook-version" />
      </div>
    </div>
  ) : null;
  const pair = (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, ...exitStyle(F, HOOK.out, size, 'recede') }}>
        <LinePool w={L.groupW} size={size} a={nameIn} />
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left.toFixed(2)}px, ${y.toFixed(2)}px)` }}>
          <MaskUp p={nameIn} size={size}>
            <span data-text="hook-name" style={{ ...wordmarkAt(size), color: INK, lineHeight: `${size * 1.18}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.name}</span>
          </MaskUp>
        </div>
      </div>
      {pill}
    </div>
  );
  // the name sits on the world by its value: no glow, no halo round the type
  const k = hookCreep(Math.min(F, hand.t0));
  return <div style={{ position: 'absolute', inset: 0, transform: `scale(${k.toFixed(5)})`, transformOrigin: '50% 50%' }}>{pair}</div>;
};

// ---------------------------------------------------------------------------------------------- the end card
const MARK = 210 * U;
/** The solid's close-up the converge grows it to (x the lockup), turned, its centre on the frame's centre. */
const SOLID = { scale: 2.8, yaw: -48, pitch: 14, roll: -6 } as const;
/** The mark for this world: on a dark world its near-black parts take the world's ink, so it never sinks into the dark. */
const MARK_LOGO: Logo = (() => {
  if (!DARK) return LOGO;
  const rc = (fill: string) => (fill && fill !== 'none' && /^#|^rgb/i.test(fill) && toOklch(fill)[0] < 0.36 ? INK : fill);
  return { ...LOGO, parts: LOGO.parts.map((p) => ({ ...p, fill: rc(p.fill), items: p.items.map((it) => ({ ...it, fill: rc(it.fill) })) })) };
})();
/** The flat mark at its 100-unit box's top-left (x, y), `s` its scale about its centre. */
const FlatAt: React.FC<{ x: number; y: number; s?: number; pulse?: number }> = ({ x, y, s = 1, pulse = 0 }) => {
  const c = { x: (MARK_LOGO.box.x + MARK_LOGO.box.w / 2) * (MARK / 100), y: (MARK_LOGO.box.y + MARK_LOGO.box.h / 2) * (MARK / 100) };
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: MARK, height: MARK, transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${(s * (1 + 0.05 * pulse)).toFixed(4)})`, transformOrigin: `${c.x}px ${c.y}px` }}>
      <LogoMark logo={MARK_LOGO} size={MARK} />
    </div>
  );
};
const LOCKUP = { x: W / 2 - MARK / 2, y: H / 2 - MARK / 2, size: MARK };
/** The solid's box on screen as the converge lands it (its close-up's bounds). */
const SOLID_BOX: HBox = (() => {
  const s = MARK * SOLID.scale;
  return { x: W / 2 - s / 2, y: H / 2 - s / 2, w: s, h: s };
})();
/** The mark's solid at film frame F: its close-up held until the converge lands it, then the pull-back onto the flat mark. */
const Solid: React.FC<{ F: number }> = ({ F }) => {
  const durF = ((CLOSE.markFlat - CLOSE.solid) * 60) / FPS;
  const fe = Math.max(0, F - CLOSE.solid);
  return (
    <Freeze frame={fe}>
      <Logo3D lockup={LOCKUP} logo={MARK_LOGO} at={0} dur={durF} from={{ ...SOLID, focus: [0, 0] }} light={LIGHT3D} gl={MARK_3D.gl} samples={MARK_3D.samples} seed={UPDATE.name} />
    </Freeze>
  );
};

/** The end card's creep: a front-loaded start (share, its time constant in 30 fps frames) and the steady rate after it (% a 30 fps frame). */
const LIVE = { start: 0.03, tau30: 14, pct: 0.1 } as const;
const EndCard: React.FC<{ F: number }> = ({ F }) => {
  if (F < CLOSE.solid) return null;
  const stack = DEAL.end === 'stack';
  const size = NAME.size * (stack ? 0.86 : 0.9);
  const wm = wordmarkAt(size);
  const nameWeight = Number(wm.fontWeight) || TYPE.display.weight;
  const nameTrack = parseFloat(String(wm.letterSpacing)) || 0;
  const nameW = measureTracked(UPDATE.name, size, nameWeight, nameTrack, String(wm.fontFamily));
  const verWeight = Math.max(400, nameWeight - 160);
  const verW = measureTracked(UPDATE.version, size, verWeight, TYPE.display.track, FONT.text, { tabular: true });
  const gapMN = 0.34 * size;
  const gapNV = 0.42 * size;
  const pB = prog(F, CLOSE.nameIn, CLOSE.named, E.strongInOut);
  const pC = prog(F, CLOSE.versionIn, CLOSE.lockup, E.settleOut);
  const box = size * 1.18;
  const pulse = hitPulse(F - CLOSE.lockup, 2, 9);
  // the lockup keeps living: from the flat mark's landing it creeps toward the lens to the very last frame at the
  // house hold rate (0.1 % a 30 fps frame, never still) after a front-loaded 3 % start
  const lt = (Math.max(0, F - CLOSE.markFlat) * 30) / FPS;
  const live = 1 + LIVE.start * (1 - Math.exp(-lt / LIVE.tau30)) + (LIVE.pct / 100) * lt;
  const lift = stack ? prog(F, CLOSE.nameIn, CLOSE.named, E.liftOut) : 0;
  const rowW = stack ? pB * nameW + pC * (gapNV + verW) : MARK + pB * (gapMN + nameW) + pC * (gapNV + verW);
  const x0 = (W - rowW) / 2;
  const markX = stack ? W / 2 - MARK / 2 : x0;
  const markY = stack ? H / 2 - MARK / 2 - lift * (0.5 * MARK + 0.36 * box) : H / 2 - MARK / 2;
  const nameX = stack ? x0 : x0 + MARK + gapMN;
  // stack: the name's own slot under the lifted mark; it rises into that slot through its baseline mask
  const nameY = stack ? H / 2 - box / 2 + (0.5 * MARK + 0.3 * box) : H / 2 - box / 2;
  const flat = F >= CLOSE.markFlat;
  return (
    <div style={{ position: 'absolute', inset: 0, transform: live !== 1 ? `scale(${live.toFixed(5)})` : undefined, transformOrigin: '50% 50%' }}>
      {flat ? <FlatAt x={markX} y={markY} pulse={pulse} /> : <Solid F={F} />}
      {pB > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${nameX.toFixed(2)}px, ${nameY.toFixed(2)}px)`, width: (nameW + 24 * U) * (stack ? 1 : pB), height: box, overflow: 'hidden', opacity: stack ? clamp(pB * 1.6) : 1 }}>
          <span data-text="wordmark" style={{ ...wm, color: INK, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block', transform: stack ? `translateY(${((1 - pB) * box * 0.95).toFixed(2)}px)` : `translateX(${(-(1 - pB) * 0.3 * size).toFixed(2)}px)` }}>{UPDATE.name}</span>
        </div>
      )}
      {pC > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(nameX + nameW + gapNV).toFixed(2)}px, ${nameY.toFixed(2)}px)`, opacity: clamp(pC * 2) }}>
          <MaskUp p={pC} size={size}>
            <span data-text="release" style={{ ...typeStyle('display', size), fontWeight: verWeight, ...tab, color: ACCENT, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.version}</span>
          </MaskUp>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the handovers
/** The element's look in a handover: a thin light rim and a soft shadow under it (its face is the shot's own pixels). */
const RIM = { color: '#FFFFFF', a: DARK ? 0.5 : 0.7, w: 2 } as const;
const SHADOW = { y: 18, blur: 52, a: DARK ? 0.5 : 0.2 } as const;
/** A side of handover h on screen and its content: the hook's pill, a shot's element (a window onto the shot), a porthole, the mark's solid. */
const sideOf = (h: Hand, which: 'from' | 'to'): { side: HandSide; node: React.ReactNode; fix: HBox } => {
  const s = h[which];
  const at = which === 'from' ? h.t0 : h.t1;
  const form: Form = s.form;
  if (s.side === 'hook') {
    const L = HOOK_LAYOUT();
    const k = hookCreep(h.t0);
    const box = scaleAbout(L.pillBox, k, W / 2, H / 2);
    return { side: { form, box, r: box.h / 2, fill: PILL_FILL, rim: { color: '#FFFFFF', a: 0.42, w: PILL.rim }, shadow: { a: 0 } }, node: <div style={{ transform: `scale(${k.toFixed(5)})`, transformOrigin: '0 0' }}><PillFace size={L.size} /></div>, fix: box };
  }
  if (s.side === 'mark') {
    return { side: { form, box: SOLID_BOX, r: SOLID_BOX.w / 2, rim: { a: 0 }, shadow: { a: 0 } }, node: <Window box={SOLID_BOX}><Solid F={at} /></Window>, fix: SOLID_BOX };
  }
  const i = s.side;
  const t = TIMES[i];
  if (which === 'to' && t.place === 'part') {
    const sp = SPLIT()[i];
    const P = portOf(t, at);
    if (sp && P) {
      const box: HBox = { x: sp.x - sp.r, y: sp.y - sp.r, w: 2 * sp.r, h: 2 * sp.r };
      const node = <Window box={box} dx={P.tx} dy={P.ty}><ShotPlainAt i={i} /></Window>;
      return { side: { form, box, r: PORT_R * sp.r, rim: RIM, shadow: SHADOW }, node, fix: box };
    }
  }
  const box = elBox(i, which === 'from' ? 'out' : 'in', at);
  return { side: { form, box, rim: RIM, shadow: SHADOW }, node: <Window box={box}><ShotPlainAt i={i} /></Window>, fix: box };
};
/** A shot drawn at the handover's current frame (inside its window). */
const FrameCtx = React.createContext(0);
const ShotPlainAt: React.FC<{ i: number }> = ({ i }) => <ShotPlain i={i} F={React.useContext(FrameCtx)} />;
/** Each drawn handover's spec, built once (its sides sampled where the scenes hand the element over). */
const SPECS = lazy(() =>
  HANDS.filter((h) => h.drawn).map((h) => {
    const A = sideOf(h, 'from');
    const B = sideOf(h, 'to');
    return { h, from: { ...A.side, at: h.t0 }, to: { ...B.side, at: h.t1 }, a: A.node, b: B.node };
  }),
);
const Hands: React.FC<{ F: number }> = ({ F }) => (
  <FrameCtx.Provider value={F}>
    {SPECS().map(({ h, from, to, a, b }) =>
      F >= h.t0 && F < h.t1 ? <Handover key={h.k} kind={h.kind} at={h.at} element="version" id={`${h.from.form}>${h.to.form}`} from={from} to={to} a={a} b={b} frame={F} /> : null,
    )}
  </FrameCtx.Provider>
);

/**
 * A two-form shot's second form on every frame from its same-surface change (the camera riding the screen to it) until
 * the element hands on: its button under the shot's camera (src/sync.ts declares it as the element's track).
 */
export const surfaceTrack = (i: number): { at: number; track: [number, number, number, number, number][] } | null => {
  const h = HANDS.find((x) => x.kind === 'same-surface' && x.from.side === i);
  if (!h) return null;
  const ho = handOut(i);
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const track: [number, number, number, number, number][] = [];
  for (let f = h.at; f <= ho.t0; f++) {
    const b = elBox(i, 'out', f);
    track.push([f, r1(b.x), r1(b.y), r1(b.w), r1(b.h)]);
  }
  return { at: h.at, track };
};

/** The drawn handovers as plain specs (src/sync.ts declares their box tracks for the render checks). Browser (it measures the faces). */
export const handSpecs = () => SPECS().map(({ h, from, to }) => ({ kind: h.kind, at: h.at, element: 'version', id: `${h.from.form}>${h.to.form}`, from, to }));

// ---------------------------------------------------------------------------------------------- the stage
/** The world's steps: one per act on the spine's act cuts (enter, closer, light, pull-back). */
const STEPS = stepsFromPlan(SPINE_PLAN);
export const Stage: React.FC<{ from: number }> = ({ from }) => {
  const F = useCurrentFrame() + from;
  const d = worldDrawn();
  warnStandIn();
  return (
    <AbsoluteFill style={{ background: WORLD.base, overflow: 'hidden' }}>
      <WorldSteps kind={d.kind} src={d.src} soft={d.soft} frame={F} steps={STEPS}>
        {TIMES.map((t) => (
          <ShotLayer key={t.i} t={t} F={F} />
        ))}
        {TIMES.map((t) => (
          <PortholeLayer key={`p${t.i}`} t={t} F={F} />
        ))}
        <Hook F={F} />
        <EndCard F={F} />
        <Hands F={F} />
        {TIMES.map((t) => (
          <ChangeLine key={`l${t.i}`} t={t} F={F} />
        ))}
      </WorldSteps>
    </AbsoluteFill>
  );
};

/** Each change's frames, for src/sync.ts and the acts. */
export const CHANGE_FRAMES = TIMES.map((t) => ({ id: UPDATE.changes[t.i].id, kind: UPDATE.changes[t.i].show.kind, ...t }));
export { ACT, N };
