// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// porthole-line: a pointer presses the send button at macro scale; the button's colour drains from the bottom up,
// leaving a white circle that springs open into a porthole; the picture rises into it from below and a light catches
// its lower rim; a giant two-line statement cuts on word by word BEHIND the porthole, the top line pushed up and the
// bottom line rising to slip under it, both kept centred while the camera creeps in; it leaves on a defocus.
// Numbers (frames at 30 fps, px at 1080): the press squeezes the button r 196 -> 151 in 6 f, the drain takes 3 f, the
// circle springs 151 -> 250 in 21 f and keeps growing to 274; the picture pops up 128 px past its seat and settles in
// 10 f; each line cuts on whole (the bottom line 12 f after the top: two chunks, read at once); cap 165 px; the
// porthole overlaps the top line's baseline by 13 % of its radius and the bottom line's caps by 21 %; a push x1.05 under
// the words, x1.13 more into the exit, where the blur racks 0 -> 6.4 px.
import React from 'react';
import { Img } from 'remotion';
import { FONT } from '../brand/tokens';
import { Cursor } from '../fx/Cursor';
import { clamp, E, zoomAt } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { baselineOf, measureTracked } from '../lib/measure';
import { decay, type Palette, paletteOf, type SceneMeta, span, tab, useClock } from './parts';

export type PortholeLineProps = {
  /** the line above the porthole and the line below it (2-3 words each read best) */
  top: string;
  bottom: string;
  /** the word of the bottom line set in the accent (default its last word) */
  accent?: string;
  /** the picture inside the porthole: a product shot, an avatar, a render (an image URL, staticFile()) */
  picture: string;
  palette?: Partial<Palette>;
  /** false: no pointer (the press comes from the scene before) */
  pointer?: boolean;
  frame?: number;
};

export const PORTHOLE = {
  dur: 78,
  press: 8, // the pointer's click
  drain: [14, 17] as const,
  rise: 22.5, // the picture starts up
  words: { top: 36, bottom: 48, every: 0 }, // every: frames between the words of a line (0: each line whole)
  cap: 165,
  exit: 72,
} as const;

// the button's squeeze, the circle's spring and growth (radius, px at 1080), the picture's pop (px), the exit blur
const BUTTON_R: [number, number][] = [[0, 193], [8, 196], [9, 195], [10, 193], [11, 190], [12, 183], [13, 173], [14, 151]];
const CIRCLE_R: [number, number][] = [[14, 151], [15, 163], [16, 174], [18, 195], [19, 201], [21, 206], [23, 217], [25, 225], [27, 232], [29, 237], [31, 242], [33, 246], [35, 250], [36, 253], [43, 262], [48, 264], [51, 266], [58, 269], [66, 272], [74, 274]];
const POP: [number, number][] = [[22.5, 300], [23, 128], [24, 0], [25, -58], [27, -30], [29, -10], [33, 0]];
const EXIT_BLUR: [number, number][] = [[72, 0], [73, 1.35], [74, 2], [75, 3.9], [76, 5.3], [77, 6.4]];

const ARROW_UP = 'M0 70 L0 -70 M-58 -12 L0 -70 L58 -12';
const MIC = 'M-22 -40 a22 22 0 0 1 44 0 v38 a22 22 0 0 1 -44 0 Z M-41 -6 a41 41 0 0 0 82 0 M0 35 v32';

export const PortholeLine: React.FC<PortholeLineProps> = ({ top, bottom, accent, picture, palette, pointer = true, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  const cx = W / 2;
  const field = mixColor(P.ground, P.accent, 0.07);
  const fieldLow = mixColor(P.ground, P.accent, 0.14);
  // ---- the button and its field (the macro view of the input's right end)
  const drift = 46 * decay(t, 0, 4); // the camera's last travel, landing on the button
  const bx = cx + drift * u;
  const by = 533 * u;
  const bR = tab(t, BUTTON_R) * u;
  const blue = clamp(1 - span(t, PORTHOLE.drain[0], PORTHOLE.drain[1] + 0.6)); // the colour left (drains from the bottom up)
  const fieldOut = 1 - E.softIn(span(t, 15, 26));
  // ---- the porthole: centre re-framed as the lines arrive (down with the top line, up with the bottom one)
  const r = (t < PORTHOLE.drain[0] ? bR / u : tab(t, CIRCLE_R)) * u;
  const cyRaw = 533 + 56 * (1 - decay(t, PORTHOLE.words.top, 3)) - 44 * (1 - decay(t, PORTHOLE.words.bottom, 4));
  const cy = cyRaw * u;
  const pcx = t < PORTHOLE.drain[0] ? bx : cx + drift * u;
  const pop = tab(t, POP) * (r / (250 * u)) * u;
  const rim = E.glideOut(span(t, 30, 37));
  // ---- the lines
  const widest = Math.max(measureTracked(top, 100, 500, -0.01), measureTracked(bottom, 100, 500, -0.01));
  const size = Math.min(227 * u, (0.62 * W * 100) / Math.max(1, widest));
  const k = size / (227 * u);
  const capH = 0.727 * size;
  const o1 = (36 + 94 * decay(t, PORTHOLE.words.top, 9)) * k * u; // the porthole's overlap of the top line's baseline
  const o2 = (57 - 84 * decay(t, PORTHOLE.words.bottom, 8)) * k * u; // ... and of the bottom line's caps
  const base = baselineOf(size, 500, 1);
  const line1Top = cy - r + o1 - base;
  const line2Top = cy + r - o2 + capH - base;
  const topWords = top.split(' ');
  const botWords = bottom.split(' ');
  const accentWord = accent ?? botWords[botWords.length - 1];
  const onAt = (line: 0 | 1, i: number) => (line === 0 ? PORTHOLE.words.top : PORTHOLE.words.bottom) + i * PORTHOLE.words.every;
  // ---- the camera: a push x1.05 under the words, accelerating into the exit; the exit defocus
  const push = zoomAt(t, PORTHOLE.words.top, 66, 1, 1.05, E.softOut) + 0.13 * E.launchIn(span(t, 64, PORTHOLE.dur));
  const blur = tab(t, EXIT_BLUR) * u;
  // ---- the pointer: lands on the button, clicks, leaves as the colour drains
  const land = E.glideOut(span(t, 0, 7));
  const leave = E.buildIn(span(t, 13, 21));
  const curX = bx + (430 * (1 - land) + 30 + 360 * leave) * u;
  const curY = by + (360 * (1 - land) + 52 + 420 * leave) * u;
  const tp = t - PORTHOLE.press;
  const press = tp <= 0 || tp >= 6 ? 0 : tp < 2 ? E.snapOut(tp / 2) : 1 - E.glideOut((tp - 2) / 4);
  const line = (words: string[], li: 0 | 1, y: number) => (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, transform: `translateY(${y.toFixed(2)}px)`, textAlign: 'center', whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1, color: P.ink }}>
      {words.map((w, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ' ' : ''}
          <span
            style={{
              opacity: t >= onAt(li, i) ? 1 : 0,
              ...(li === 1 && w === accentWord
                ? { backgroundImage: `linear-gradient(90deg, ${mixColor(P.accent, P.paper, 0.32)}, ${P.accent})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent', padding: '0.18em 0 0.32em', margin: '-0.18em 0 -0.32em' }
                : {}),
            }}
          >
            {w}
          </span>
        </React.Fragment>
      ))}
    </div>
  );
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: `linear-gradient(180deg, ${field} 0%, ${field} 62%, ${fieldLow} 100%)` }}>
      {/* the sky field's soft brighter blobs */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 34% 28% at 26% 52%, ${withAlpha(P.paper, 0.55)}, ${withAlpha(P.paper, 0)}), radial-gradient(ellipse 30% 26% at 76% 26%, ${withAlpha(P.paper, 0.5)}, ${withAlpha(P.paper, 0)})` }} />
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${H / 2}px`, transform: `scale(${push.toFixed(5)})`, filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
        {/* the input pill, the mic, the send button */}
        {fieldOut > 0.002 ? (
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: fieldOut, transform: `translate(${(bx + 321 * u - 3200 * u).toFixed(2)}px, ${(by - 290 * u).toFixed(2)}px)`, width: 3200 * u, height: 580 * u, borderRadius: 290 * u, background: mixColor(P.paper, P.ground, 0.25), boxShadow: `0 ${30 * u}px ${90 * u}px ${withAlpha(P.ink, 0.07)}, inset 0 ${2 * u}px 0 ${withAlpha(P.paper, 1)}` }} />
        ) : null}
        {fieldOut > 0.002 ? (
          <svg width={200 * u} height={200 * u} viewBox="-100 -100 200 200" style={{ position: 'absolute', left: 0, top: 0, opacity: fieldOut, transform: `translate(${(bx - 520 * u - 100 * u).toFixed(2)}px, ${(by - 100 * u).toFixed(2)}px)`, overflow: 'visible' }}>
            <path d={MIC} fill="none" stroke={mixColor(P.ink, P.paper, 0.48)} strokeWidth={5} strokeLinecap="round" transform="scale(1.45)" />
          </svg>
        ) : null}
        {/* the porthole's light: the outer glow low right, the soft shadow ring */}
        {t >= PORTHOLE.drain[0] ? (
          <>
            <div style={{ position: 'absolute', left: 0, top: 0, width: 2.36 * r, height: 2.36 * r, borderRadius: '50%', transform: `translate(${(pcx - 1.18 * r + 0.1 * r).toFixed(2)}px, ${(cy - 1.18 * r + 0.12 * r).toFixed(2)}px)`, background: `radial-gradient(closest-side, ${withAlpha(P.accent, 0.2 * rim)} 76%, ${withAlpha(P.accent, 0)} 100%)` }} />
            <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * r, height: 2 * r, borderRadius: '50%', transform: `translate(${(pcx - r).toFixed(2)}px, ${(cy - r).toFixed(2)}px)`, boxShadow: `0 0 ${80 * u}px ${withAlpha(P.ink, 0.08)}, ${-6 * u}px ${-8 * u}px ${16 * u}px ${withAlpha(P.ink, 0.06)}` }} />
          </>
        ) : null}
        {/* the lines, behind the porthole */}
        {t >= PORTHOLE.words.top ? line(topWords, 0, line1Top) : null}
        {t >= PORTHOLE.words.bottom ? line(botWords, 1, line2Top) : null}
        {/* the button (before the drain) / the porthole (after) */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 2 * r, height: 2 * r, borderRadius: '50%', overflow: 'hidden', transform: `translate(${(pcx - r).toFixed(2)}px, ${((t < PORTHOLE.drain[0] ? by : cy) - r).toFixed(2)}px)`, background: P.paper, isolation: 'isolate' }}>
          {t >= PORTHOLE.rise ? <Img src={picture} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `translateY(${pop.toFixed(2)}px)` }} /> : null}
          {blue > 0 ? (
            <div style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: `${(blue * 100).toFixed(2)}%`, overflow: 'hidden' }}>
              <div style={{ width: 2 * r, height: 2 * r, background: `linear-gradient(225deg, ${P.accent} 0%, ${mixColor(P.accent, P.paper, 0.42)} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width={r} height={r} viewBox="-100 -100 200 200">
                  <path d={ARROW_UP} fill="none" stroke={P.paper} strokeWidth={16 * (193 / Math.max(1, r / u))} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          ) : null}
          {/* the rim light inside the lower edge */}
          {rim > 0 ? <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', opacity: rim, boxShadow: `inset 0 ${-30 * u}px ${34 * u}px ${-14 * u}px ${withAlpha(P.accent, 0.95)}` }} /> : null}
        </div>
        {pointer && t < 22 ? <Cursor x={curX} y={curY} scale={3 * u} press={press} shape="arrow" shadow="cast" fill={P.ink} outline={P.paper} pressDepth={0.14} /> : null}
      </div>
    </div>
  );
};

export const portholeLineMeta: SceneMeta = {
  id: 'porthole-line',
  does: 'a pointer presses send; the button drains into a porthole holding the picture while a giant two-line statement parts around it',
  dur: PORTHOLE.dur,
  props: ['top', 'bottom', 'accent?', 'picture', 'palette?', 'pointer?'],
  handIn: { form: 'button', x: 1006 - 193, y: 340, w: 386, h: 386, r: 193 },
  handOut: { form: 'photo', x: 960 - 287, y: 545 - 287, w: 574, h: 574, r: 287 },
  klass: 'big',
  cues: [
    { f: PORTHOLE.press, kind: 'click', id: 'press', weight: 0.8 },
    { f: PORTHOLE.drain[0], kind: 'swell', id: 'open', weight: 0.6 },
    { f: 23, kind: 'pop', id: 'picture', weight: 0.7 },
    { f: PORTHOLE.words.top, kind: 'hit', id: 'line-top', weight: 0.9 },
    { f: PORTHOLE.words.bottom, kind: 'hit', id: 'line-bottom', weight: 0.8 },
    { f: PORTHOLE.exit, kind: 'whoosh', id: 'exit', weight: 0.5 },
  ],
};
