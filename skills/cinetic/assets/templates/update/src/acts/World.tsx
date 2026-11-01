// The update film's stage: one world (fx/world, dealt, never cut) under the whole film with its key light, and in it the
// name and the version, then each change's hero shot (acts/heroes.tsx) and its line, then the end card. Every act renders
// this stage at its own frames, so the acts join by construction.
//
//   the hook    the name and the version, centred, as one pair from the first frame (roll, rise or badge, dealt); on a
//               night world their light blooms softly; they recede as the first shot arrives
//   a change    its hero shot arrives on the film's optics (rack: out of focus to sharp; whip: a fast move braking into
//               the shot; bloom: out of the world's light), plays its one camera move and its moment, and holds its
//               result. Its line, by the shape (src/deal.ts SHAPES):
//                 show   the shot goes soft and dims (a focus isolate) and the line lands centred in front of it
//                 lead   the line first, alone in the world (the shot before goes soft into the world); then the shot
//                 split  the line parted round a porthole that opens in its gap with the shot inside; the words leave
//                        and the porthole opens into the frame as the shot plays
//   the end     the brand's mark as a solid, close up and turning, out of focus as what was on screen goes soft; one
//               pull-back lands it exactly on the flat mark (fx/three Logo3D; its flat twin without hardware WebGL); the
//               name slides out of it and the version lands on the last bar line apart from the name, held to the end
//
// The camera never floats: it moves only inside a hero shot (one declared move that lands) and in the mark's pull-back;
// a hold is still. Nothing bobs or breathes, no card rests tilted. Lines are centred, never over a sharp shot.
import React from 'react';
import { AbsoluteFill, Freeze, Img, useCurrentFrame } from 'remotion';
import { type Logo, LogoMark } from '../brand/Mark';
import { LOGO } from '../brand/logo';
import { C, FONT, TYPE, TYPE_FAMILY, typeStyle, U } from '../brand/tokens';
import { DEAL, HEROES, LINES } from '../deal';
import { Bloom } from '../fx/light';
import { draws3D, type GlMode, Logo3D, logoPose } from '../fx/three';
import { World as Place } from '../fx/world';
import { FACE_SET, PAIR_IDS, PAIRS, type PairId, safeTrack, wordmarkStyle } from '../fx/TypePairs';
import { hasLogo } from '../kit';
import type { InlineRef } from '../kit/inline';
import { clamp, E, hitPulse, mix, prog } from '../lib/anim';
import { mixColor, toOklch } from '../lib/color';
import { defocusLevel } from '../lib/defocus';
import { measureTracked } from '../lib/measure';
import { ACT, ARRIVALS, ARRIVE60, CLOSE, copy, EXIT_F, f60, FPS, H, HOOK, N, ROLL, TIMES, type ChangeTimes, W } from '../timeline';
import { type Change, photosOf, spokenChange, UPDATE } from '../update';
import { heroFocus, HeroShot } from './heroes';
import { ACCENT, DARK, INK, LIGHT3D, MUTE, NIGHT, pic, PICTURE, THEME, WORLD, warnStandIn, worldDrawn } from './look';
import { gapLine, HeroLine, MarkLine } from './type';

export { THEME } from './look';

/**
 * The end card's 3D mark: 'auto' draws it in 3D on a hardware GPU and its flat twin otherwise (software GL); 'force'
 * renders the 3D on software GL too (slow: a check at half size, a few samples); 'fallback' always the flat twin.
 */
export const MARK_3D: { gl: GlMode; samples?: number } = { gl: 'auto' };

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
/** A change line's size: the line role's, smaller only when the line (with its gap) would pass 62 % of the frame width. */
const lineSize = (text: string, extra = 0, k = 1) => {
  const base = TYPE.line.size * U * k;
  const w = measureTracked(text.replace('[]', 'MM'), base, TYPE.line.weight, TYPE.line.track, FONT.text) + extra;
  return Math.min(base, (base * 0.62 * W) / Math.max(1, w));
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
/** Where a split line parts: the word boundary nearest its middle by width, never inside the change's key words. */
const splitAt = (c: Change, size: number): [string, string] => {
  const words = spokenChange(c).split(/\s+/);
  const bare = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const key = (c.key ?? '').toLowerCase().split(/\s+/).map(bare).filter(Boolean);
  const k0 = key.length ? words.findIndex((_, j) => key.every((kw, m) => bare(words[j + m] ?? '') === kw)) : -1;
  const width = (s: string) => measureTracked(s, size, TYPE.line.weight, TYPE.line.track, FONT.text);
  let best = 1;
  let score = Infinity;
  for (let j = 1; j < words.length; j++) {
    if (k0 >= 0 && j > k0 && j < k0 + key.length) continue;
    const d = Math.abs(width(words.slice(0, j).join(' ')) - width(words.slice(j).join(' ')));
    if (d < score) [best, score] = [j, d];
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
};
/** The picture a porthole holds before it opens: a shot of pictures shows its chosen one (the view itself), else none. */
const PORT_PHOTO = (i: number): string | null => (['carousel', 'photo-develop'].includes(HEROES[i]) ? photosOf(UPDATE.changes[i])[0] ?? null : null);
/** The porthole: its diameter as a share of the split line's size, and the line set a little larger round it. */
const PORT = { d: 3.3, k: 1.15 } as const;
/** A value measured from the real face: built on first use, inside a render (FontGate has loaded the fonts by then). */
const lazy = <V,>(make: () => V): (() => V) => {
  let v: V | undefined;
  return () => (v === undefined ? (v = make()) : v);
};
/** Each split change's line, laid out once: its text with the gap, its size, the gap's centre and the porthole's radius. */
const SPLIT = lazy(() =>
  TIMES.map((t) => {
    if (t.shape !== 'split') return null;
    const c = UPDATE.changes[t.i];
    const s0 = lineSize(spokenChange(c), PORT.d * TYPE.line.size * U * PORT.k, PORT.k);
    const [a, b] = splitAt(c, s0);
    const id = `change${t.i + 1}`;
    const gapW = PORT.d * s0 * 1.18;
    const g = gapLine({ id, text: `${a} [] ${b}`, at: 0, move: LINES.move[id], role: 'line', size: s0, x: W / 2, y: H / 2, color: INK, gapW });
    return { ...g, r: (PORT.d * g.size) / 2 };
  }),
);

/** Change i's sentence, centred: alone in the world, over its shot gone soft and dim, or parted round its porthole. */
const ChangeLine: React.FC<{ t: ChangeTimes; F: number }> = ({ t, F }) => {
  const ch = UPDATE.changes[t.i];
  const c = copy(`change${t.i + 1}`);
  if (F < c.in || F >= c.out + EXIT_F) return null;
  const split = SPLIT()[t.i];
  const size = split ? split.size : lineSize(ch.words);
  const id = `change${t.i + 1}`;
  const p = { id, at: c.in, frame: F, move: LINES.move[id], role: 'line' as const, size, x: W / 2, y: H / 2, color: INK, accent: ACCENT, mute: MUTE };
  const node = split ? <HeroLine {...p} text={split.text} /> : ch.words.includes('[]') ? <MarkLine {...p} text={ch.words} objects={[objectOf(ch)]} ground={DARK ? 'dark' : 'light'} theme={THEME} /> : <HeroLine {...p} text={spokenChange(ch)} />;
  const box = { x: W * 0.12, y: H / 2 - size * 1.2, w: W * 0.76, h: size * 2.4 };
  return <div style={{ position: 'absolute', inset: 0, textShadow: WORLD.typeShadow, ...exitStyle(F, c.out, size) }}>{NIGHT ? <Bloom strength={0.28} radius={16} box={box}>{node}</Bloom> : node}</div>;
};

// ---------------------------------------------------------------------------------------------- the hero shots' optics
/** When change i's shot leaves (it goes soft and fades): under the next shot's arrival, the next line's clear, or the end card's. */
const leaveOf = (i: number): [number, number] => {
  const next = TIMES[i + 1];
  if (!next) return CLOSE.clear;
  if (next.clear) return next.clear;
  if (next.iris) return [next.gap![0], next.gap![0] + f60(12)];
  return [next.h0, next.hin + f60(6)];
};
/** The smear of a whip arrival, at fixed levels (px, horizontal). */
const SMEAR = [0, 4, 8, 14, 22] as const;
const smearLevel = (s: number) => SMEAR.reduce((b, l) => (Math.abs(l - s) < Math.abs(b - s) ? l : b), 0);

/** Change i's shot with its optics: the arrival, the porthole and its opening, the isolate under its line, the leaving. */
const ShotLayer: React.FC<{ t: ChangeTimes; F: number }> = ({ t, F }) => {
  const start = t.gap ? t.gap[0] : t.h0;
  const leave = leaveOf(t.i);
  if (F < start || F >= leave[1]) return null;
  const f = Math.max(0, F - t.h0);
  let blur = 0;
  let bright = 1;
  let veil = 0;
  let glow = 0;
  let tx = 0;
  let smear = 0;
  let push = 1;
  let clip: string | undefined;
  let ring: React.ReactNode = null;
  if (!t.iris && F < t.hin) {
    const p = clamp((F - t.h0) / Math.max(1, t.hin - t.h0));
    if (ARRIVALS[t.i] === 'whip') {
      // a fast move braking into the shot: most of the travel in the first third, smeared while it is fast
      const e = E.glideOut(p);
      tx = (1 - e) * 0.42 * W;
      const de = E.glideOut(clamp(p + 0.02)) - E.glideOut(clamp(p - 0.02));
      smear = smearLevel(Math.min(22, (de / 0.04) * 0.42 * W * 0.012));
    } else if (ARRIVALS[t.i] === 'bloom') {
      // out of the world's light: a soft bloom that settles as the shot sharpens
      glow = 1 - E.softOut(p);
      blur = 6 * (1 - E.glideOut(p));
    } else {
      // rack: out of focus to sharp, half the blur gone in the first third (7.5 -> 1.4 -> 0)
      blur = 7.5 * Math.pow(1 - p, 1.8);
    }
  }
  if (t.gap && t.iris) {
    // the porthole: a circle in the line's gap with the shot inside (its opening frame), then opening into the frame
    const sp = SPLIT()[t.i];
    if (sp) {
      const o = prog(F, t.gap[0], t.gap[1], E.glideOut);
      const q = prog(F, t.iris[0], t.iris[1], E.strongInOut);
      const big = Math.hypot(W, H) / 2 + 40;
      const r = q > 0 ? mix(sp.r, big, q) : sp.r * o;
      const [fx, fy] = heroFocus(t.i);
      const cx = mix(sp.x, W / 2, q);
      const cy = H / 2;
      // the shot inside slides so its subject sits in the porthole, settling to its own framing as it opens
      tx = mix(sp.x - fx, 0, q);
      const ty = mix(cy - fy, 0, q);
      if (q < 1) {
        clip = `circle(${r.toFixed(2)}px at ${(cx - tx).toFixed(2)}px ${(cy - ty).toFixed(2)}px)`;
        ring = (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * r, height: 2 * r, transform: `translate(${(cx - r).toFixed(2)}px, ${(cy - r).toFixed(2)}px)`, borderRadius: r, pointerEvents: 'none', opacity: clamp(o * 2) * (1 - q), boxShadow: `0 0 ${(70 * U).toFixed(1)}px ${DARK ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.12)'}, inset 0 0 0 ${(1.5 * U).toFixed(2)}px rgba(255,255,255,${DARK ? 0.35 : 0.8})`, background: `radial-gradient(circle at 72% 78%, transparent ${(r * 0.8).toFixed(1)}px, ${mixColor(ACCENT, '#FFFFFF', 0.45)}55 ${(r * 0.96).toFixed(1)}px, transparent ${r.toFixed(1)}px)` }} />
        );
      }
      // a shot of pictures shows its chosen picture in the porthole, giving way to the shot as the porthole opens
      const photo = PORT_PHOTO(t.i);
      const po = photo ? 1 - prog(F, t.iris[0] + 0.45 * (t.iris[1] - t.iris[0]), t.iris[1], E.stdInOut) : 0;
      return (
        <>
          <div style={{ position: 'absolute', inset: 0, clipPath: clip, transform: `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)` }}>
            <Freeze frame={f}>
              <HeroShot t={t} f={f} />
            </Freeze>
          </div>
          {photo && po > 0 && (
            <div style={{ position: 'absolute', inset: 0, clipPath: `circle(${r.toFixed(2)}px at ${cx.toFixed(2)}px ${cy.toFixed(2)}px)`, opacity: po }}>
              <Img src={pic(photo)} style={{ position: 'absolute', left: 0, top: 0, width: 2.3 * r, height: 2.3 * r, transform: `translate(${(cx - 1.15 * r).toFixed(2)}px, ${(cy - 1.15 * r).toFixed(2)}px)`, objectFit: 'cover', filter: PICTURE.filter }} />
            </div>
          )}
          {ring}
        </>
      );
    }
  }
  if (t.iso && F >= t.iso[0]) {
    // the focus isolate: the shot goes soft (to about 6 px), the camera pushes through it a little (x1.06, landing with
    // the blur) and it dims (a dark world) or pales into the world (a light one)
    const p = prog(F, t.iso[0], t.iso[1], E.stdInOut);
    blur = Math.max(blur, mix(1.2, 12, p) * (p > 0 ? 1 : 0));
    push = mix(1, 1.06, E.strongInOut(prog(F, t.iso[0], t.iso[1] + f60(8), E.linear)));
    // a dark world: the shot sinks into the world's own deep tone (never a grey veil); a pale one pales into it
    if (DARK) {
      bright = 1 - 0.18 * p;
      veil = 0.72 * p;
    } else veil = 0.66 * p;
  }
  let opacity = 1;
  if (F >= leave[0]) {
    const q = prog(F, leave[0], leave[1], E.stdInOut);
    opacity = 1 - q;
    blur = Math.max(blur, 6 * q);
  }
  const level = blur > 0.4 ? defocusLevel(blur) : 0;
  const filter = [level > 0 ? `blur(${level}px)` : '', bright !== 1 ? `brightness(${bright.toFixed(3)})` : '', smear > 0 ? `url(#whip-${smear})` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <>
      {smear > 0 && (
        <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
          <filter id={`whip-${smear}`} x="-20%" y="-5%" width="140%" height="110%" colorInterpolationFilters="sRGB">
            <feGaussianBlur stdDeviation={`${smear} 0`} />
          </filter>
        </svg>
      )}
      <div style={{ position: 'absolute', inset: 0, filter, opacity, transform: tx || push !== 1 ? `translateX(${tx.toFixed(2)}px) scale(${push.toFixed(5)})` : undefined, transformOrigin: '50% 50%' }}>
        <Freeze frame={f}>
          <HeroShot t={t} f={f} />
        </Freeze>
      </div>
      {veil > 0 && <div style={{ position: 'absolute', inset: 0, background: DARK ? mixColor(WORLD.base, '#000000', 0.35) : WORLD.base, opacity: veil * opacity }} />}
      {glow > 0 && <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 70% 60% at 50% 45%, ${WORLD.glow} 0%, transparent 100%)`, opacity: glow * 0.9, mixBlendMode: 'screen' }} />}
    </>
  );
};

// ---------------------------------------------------------------------------------------------- the name and the version
const NAME = { size: TYPE.display.size * U, gap: 0.42 } as const;
const tab: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' };
/** A string that rolls from `from` to `to` on a drum: each changed character in its own column, whole glyphs (never squashed). */
const Drum: React.FC<{ from: string; to: string; p: number; size: number; color: string; id: string }> = ({ from, to, p, size, color, id }) => {
  const box = size * 1.18;
  const style: React.CSSProperties = { ...typeStyle('display', size), ...tab, color, lineHeight: `${box}px`, height: box, display: 'block', whiteSpace: 'pre' };
  const col = (a: string, b: string, k: number) =>
    a === b ? (
      <span key={k} style={style}>{b}</span>
    ) : (
      <span key={k} style={{ display: 'inline-block', height: box, overflow: 'hidden', verticalAlign: 'top' }}>
        <span style={{ display: 'flex', flexDirection: 'column', transform: `translateY(${(-p * box).toFixed(2)}px)` }}>
          <span style={style}>{a}</span>
          <span style={style}>{b}</span>
        </span>
      </span>
    );
  const same = from.length === to.length;
  return (
    <span data-text={id} style={{ display: 'flex', height: box }}>
      {same ? [...to].map((ch, k) => col(from[k], ch, k)) : col(from, to, 0)}
    </span>
  );
};
/** A word rising out of a mask on its baseline (p 0..1). */
const MaskUp: React.FC<{ p: number; size: number; children: React.ReactNode }> = ({ p, size, children }) => (
  <div style={{ height: size * 1.18, overflow: 'hidden' }}>
    <div style={{ transform: `translateY(${((1 - p) * size * 1.25).toFixed(2)}px)` }}>{children}</div>
  </div>
);
/** The 'badge' hook's pill: the version set smaller in the accent pill, its metrics at a name size. */
const badgeOf = (size: number) => {
  const vs = 0.5 * size;
  const h = vs * 1.62;
  const w = measureTracked(UPDATE.version, vs, 640, -0.01, FONT.text, { tabular: true }) + 1.1 * vs;
  return { vs, h, w };
};
/** The version in its pill: a dot that lands and widens into the pill on one move, the numerals rising in it. */
const Badge: React.FC<{ p: number; size: number; id: string }> = ({ p, size, id }) => {
  const b = badgeOf(size);
  const dot = E.glideOut(clamp(p / 0.3));
  const wide = E.strongInOut(clamp((p - 0.08) / 0.62));
  const txt = E.snapOut(clamp((p - 0.45) / 0.5));
  const d = 0.42 * b.h;
  const w = mix(d, b.w, wide);
  const h = mix(d, b.h, wide);
  const fill = C.accent;
  const onPill = toOklch(fill)[0] < 0.66 ? '#FFFFFF' : C.ink;
  return (
    <div style={{ position: 'relative', width: b.w, height: size * 1.18 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: h / 2, background: fill, transform: `translateY(${((size * 1.18 - h) / 2 + 0.04 * size).toFixed(2)}px) scale(${dot.toFixed(4)})`, transformOrigin: `${(d / 2).toFixed(2)}px 50%`, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: b.w, height: b.h, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: txt, transform: `translateY(${((1 - txt) * 0.5 * b.h).toFixed(2)}px)` }}>
          <span data-text={id} style={{ fontFamily: FONT.text, fontSize: b.vs, fontWeight: 640, letterSpacing: '-0.01em', lineHeight: 1, color: onPill, whiteSpace: 'pre', ...tab }}>{UPDATE.version}</span>
        </div>
      </div>
    </div>
  );
};

const Hook: React.FC<{ F: number }> = ({ F }) => {
  if (F >= HOOK.out + EXIT_F) return null;
  const size = NAME.size;
  const nameW = measureTracked(UPDATE.name, size, TYPE.display.weight, TYPE.display.track, FONT.text);
  const verW = (s: string) => measureTracked(s, size, TYPE.display.weight, TYPE.display.track, FONT.text, { tabular: true });
  const roll = DEAL.hook === 'roll';
  const badge = DEAL.hook === 'badge';
  const gap = (badge ? 0.3 : NAME.gap) * size;
  const rollP = prog(F, HOOK.roll, HOOK.roll + f60(ROLL), E.snapOut);
  const vIn = roll ? prog(F, 0, f60(22), E.snapOut) : badge ? prog(F, HOOK.version - f60(4), HOOK.version + f60(34), E.linear) : prog(F, HOOK.version, HOOK.version + f60(24), E.snapOut);
  const vw = roll ? mix(verW(UPDATE.from), verW(UPDATE.version), rollP) : badge ? badgeOf(size).w : verW(UPDATE.version);
  const groupW = nameW + gap + vw; // the pair is laid out centred from the first frame: the name never slides while it is read
  const left = (W - groupW) / 2;
  const nameIn = prog(F, 0, f60(22), E.snapOut);
  const y = H / 2 - (size * 1.18) / 2;
  const flash = roll ? hitPulse(F - (HOOK.roll + f60(ROLL)), 2, 14) : 0;
  const pair = (
    <div style={{ position: 'absolute', inset: 0, textShadow: WORLD.typeShadow, ...exitStyle(F, HOOK.out, size, 'recede') }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left.toFixed(2)}px, ${y.toFixed(2)}px)` }}>
        <MaskUp p={nameIn} size={size}>
          <span data-text="hook-name" style={{ ...typeStyle('display', size), color: INK, lineHeight: `${size * 1.18}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.name}</span>
        </MaskUp>
      </div>
      {vIn > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(left + nameW + gap).toFixed(2)}px, ${y.toFixed(2)}px)` }}>
          {badge ? (
            <Badge p={vIn} size={size} id="hook-version" />
          ) : (
            <MaskUp p={vIn} size={size}>
              <Drum from={roll ? UPDATE.from : UPDATE.version} to={UPDATE.version} p={roll ? rollP : 1} size={size} color={mixColor(ACCENT, INK, 0.15 - 0.15 * flash)} id="hook-version" />
            </MaskUp>
          )}
        </div>
      )}
    </div>
  );
  // on a night world the name is a light in the dark: its brightest strokes bloom a little
  return NIGHT ? <Bloom strength={0.32} radius={18} box={{ x: left - 40, y: y - 40, w: groupW + 80, h: size * 1.18 + 80 }}>{pair}</Bloom> : pair;
};

// ---------------------------------------------------------------------------------------------- the end card
const MARK = 150 * U;
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

const EndCard: React.FC<{ F: number }> = ({ F }) => {
  if (F < CLOSE.markIn - f60(4)) return null;
  const fe = F - CLOSE.markIn;
  const stack = DEAL.end === 'stack';
  const badge = DEAL.hook === 'badge';
  const size = NAME.size * (stack ? 0.86 : 0.9);
  const wm = wordmarkAt(size);
  const nameWeight = Number(wm.fontWeight) || TYPE.display.weight;
  const nameTrack = parseFloat(String(wm.letterSpacing)) || 0;
  const nameW = measureTracked(UPDATE.name, size, nameWeight, nameTrack, String(wm.fontFamily));
  const verWeight = Math.max(400, nameWeight - 160);
  const verW = badge ? badgeOf(size).w : measureTracked(UPDATE.version, size, verWeight, TYPE.display.track, FONT.text, { tabular: true });
  const gapMN = 0.34 * size;
  const gapNV = (badge ? 0.3 : NAME.gap) * size;
  const pB = prog(F, CLOSE.nameIn, CLOSE.named, E.strongInOut);
  const pC = badge ? prog(F, CLOSE.versionIn, CLOSE.lockup, E.linear) : prog(F, CLOSE.versionIn, CLOSE.lockup, E.settleOut);
  const pW = badge ? E.strongInOut(clamp(pC / 0.7)) : pC; // the pair re-centres as the version comes
  const box = size * 1.18;
  const pulse = hitPulse(F - CLOSE.lockup, 2, 9);
  // where the mark is: centred alone (the 3D pull-back lands there), then aside (beside) or up (stack) as the name comes
  const rowW = stack ? pB * nameW + pW * (gapNV + verW) : MARK + pB * (gapMN + nameW) + pW * (gapNV + verW);
  const x0 = (W - rowW) / 2;
  const markX = stack ? W / 2 - MARK / 2 : x0;
  const markY = stack ? H / 2 - MARK / 2 - pB * (0.5 * MARK + 0.36 * box) : H / 2 - MARK / 2;
  const nameX = stack ? x0 : x0 + MARK + gapMN;
  const nameY = stack ? H / 2 - box / 2 + pB * (0.5 * MARK + 0.3 * box) - (1 - pB) * 0.4 * size : H / 2 - box / 2;
  // the mark arriving: out of focus as what was on screen goes soft, its pull-back landing on the flat mark
  const rack = 7.5 * Math.pow(1 - clamp((F - CLOSE.markIn) / f60(ARRIVE60.rack)), 1.8);
  const level = rack > 0.4 ? defocusLevel(rack) : 0;
  const durF = ((CLOSE.markFlat - CLOSE.markIn) * 60) / FPS; // the pull-back, f@60 (its landing on the grid)
  const lockup = { x: W / 2 - MARK / 2, y: H / 2 - MARK / 2, size: MARK };
  const flat = F >= CLOSE.markFlat;
  let markNode: React.ReactNode;
  if (flat) markNode = <FlatAt x={markX} y={markY} pulse={pulse} />;
  else if (draws3D(MARK_3D.gl))
    markNode = (
      <Freeze frame={Math.max(0, fe)}>
        <Logo3D lockup={lockup} logo={MARK_LOGO} at={0} dur={durF} light={LIGHT3D} gl={MARK_3D.gl} samples={MARK_3D.samples} seed={UPDATE.name} />
      </Freeze>
    );
  else {
    // the flat twin of the pull-back (software GL): the mark pulling back on the same curve, turning to face the camera
    const st = logoPose(clamp(fe / Math.max(1, CLOSE.markFlat - CLOSE.markIn)));
    markNode = (
      <div style={{ position: 'absolute', inset: 0, transform: `rotate(${(st.roll * 0.6).toFixed(3)}deg)`, transformOrigin: '50% 50%' }}>
        <FlatAt x={lockup.x} y={lockup.y} s={Math.min(st.scale, 3.2)} />
      </div>
    );
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, filter: level > 0 ? `blur(${level}px)` : undefined }}>{markNode}</div>
      {pB > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${nameX.toFixed(2)}px, ${nameY.toFixed(2)}px)`, width: (nameW + 24 * U) * (stack ? 1 : pB), height: box, overflow: 'hidden', opacity: stack ? clamp(pB * 1.6) : 1 }}>
          <span data-text="wordmark" style={{ ...wm, color: INK, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block', transform: stack ? undefined : `translateX(${(-(1 - pB) * 0.3 * size).toFixed(2)}px)` }}>{UPDATE.name}</span>
        </div>
      )}
      {pC > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(nameX + nameW + gapNV).toFixed(2)}px, ${nameY.toFixed(2)}px)`, opacity: badge ? 1 : clamp(pC * 2) }}>
          {badge ? (
            <Badge p={pC} size={size} id="release" />
          ) : (
            <MaskUp p={pC} size={size}>
              <span data-text="release" style={{ ...typeStyle('display', size), fontWeight: verWeight, ...tab, color: ACCENT, lineHeight: `${box}px`, whiteSpace: 'pre', display: 'block' }}>{UPDATE.version}</span>
            </MaskUp>
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------------------------- the stage
export const Stage: React.FC<{ from: number }> = ({ from }) => {
  const F = useCurrentFrame() + from;
  const d = worldDrawn();
  warnStandIn();
  return (
    <AbsoluteFill style={{ background: WORLD.base, overflow: 'hidden' }}>
      <Place kind={d.kind} src={d.src} soft={d.soft} frame={F}>
        <Hook F={F} />
        {TIMES.map((t) => (
          <ShotLayer key={t.i} t={t} F={F} />
        ))}
        {TIMES.map((t) => (
          <ChangeLine key={`l${t.i}`} t={t} F={F} />
        ))}
        <EndCard F={F} />
      </Place>
    </AbsoluteFill>
  );
};

/** Each change's frames, for src/sync.ts and the acts. */
export const CHANGE_FRAMES = TIMES.map((t) => ({ id: UPDATE.changes[t.i].id, kind: UPDATE.changes[t.i].show.kind, ...t }));
export { ACT, N };
