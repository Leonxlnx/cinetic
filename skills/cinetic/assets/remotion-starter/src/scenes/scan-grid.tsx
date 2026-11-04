// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// scan-grid: a link is typed into a dark input bar on a black stage whose horizon glows at the bottom; the camera
// pushes in on the bar, a pointer rises from below onto the action button and clicks it; the button flashes and the
// camera tilts up off the input as the button turns into a busy pill and a grid of real pictures rises in from below,
// first as a blueprint (the art in the accent on white) and then in full colour tile by tile in reading order; the
// camera pulls back to show a progress bar and a counter under the grid.
// Numbers (frames at 30 fps, px at 1080): push x0.71 -> 1 on an expo-out with the first frames clearing a 6 px blur;
// the bar 1392 x 156 (radius 78), the button 120 tall (radius 60); the pointer rises in 3 f and clicks 5 f later
// (cursor 0.92, button 98 % and darker); the tilt-up accelerates x1.6 a frame; the grid rises 186 px on an expo-out in
// 17 f with a vertical blur 30 -> 0 px over 10 f; each tile turns from blueprint to colour in 3 f, 2-3 f apart; the
// pull-back to x0.62 takes 20 f (ease in-out) and the counter steps up to its total as the bar fills.
import React from 'react';
import { C, FONT } from '../brand/tokens';
import { Cursor, pressAt } from '../fx/Cursor';
import { type LogoRef } from '../kit/logos';
import { Icon, Mark, Picture, skinOf } from '../kit/screens/base';
import { type Thumb, ThumbTitle } from '../kit/screens/ThumbGrid';
import { typedAt } from '../kit/screens/typing';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { withAlpha } from '../lib/handover';
import { measureTracked } from '../lib/measure';
import { paletteOf, type Palette, perFrame, type SceneMeta, span, tab, useClock } from './parts';
import { Stage1080 } from './stage1080';

export type ScanGridProps = {
  /** the link: the grey part, then the part that is typed ("github.com/" + "acme/app") */
  prefix?: string;
  url: string;
  /** the platform's mark in the bar (an official logo fetched with scripts/logos.mjs), else a globe */
  logo?: LogoRef;
  /** the button: what it does, and what it says while it works ("Scan repo" / "Reading") */
  action: string;
  busy: string;
  /** six pictures read best (3 x 2): real thumbnails with a title and a meta line */
  items: Thumb[];
  /** the counter under the grid: "Reading {n} files" counts up to `to` */
  counter?: { text: string; to: number };
  /** dark stage: ground black, accent the horizon, the busy pill and the blueprint */
  palette?: Partial<Palette>;
  pointer?: boolean;
  frame?: number;
};

export const SCAN = {
  dur: 66,
  type: [1, 12] as const,
  click: 16,
  tilt: [17, 22] as const,
  rise: [22, 39] as const,
  colour: [26, 28, 30, 33, 35, 38] as const,
  pull: [39, 59] as const,
} as const;

// the push on the bar (scale against its rest size) and the bar's centre y as the camera tilts up
const PUSH = perFrame(0, [0.71, 0.7929, 0.8443, 0.8823, 0.9107, 0.9339, 0.9504, 0.9633, 0.975, 0.9828, 0.9898, 0.9936, 0.9962, 0.9979, 0.9988, 0.9994, 0.9996, 0.9999, 1]);
const TILT = perFrame(SCAN.tilt[0], [539, 533, 522, 505, 477, 441]);
// the grid view: the scale (against the end view at 1.4376) and the screen y of the grid's anchor
const RISE_Y = perFrame(SCAN.rise[0], [540, 520.7, 504.2, 490, 477.2, 466.3, 456.4, 447.5, 439.4, 432.5, 418.5, 406.3, 394.8, 384.8, 375.5, 368.5, 360.9, 353.8]);
const PULL_S = [1, 0.9836, 0.9567, 0.9041, 0.8411, 0.7634, 0.7117, 0.6821, 0.6616, 0.6474, 0.6371, 0.6281, 0.6229, 0.6193, 0.6169] as const;
const PULL_Y = [353.8, 343.8, 334, 329.5, 328.9, 329.3, 329.2, 328.1, 326.2, 322.3, 316.5, 309.2, 297.9, 290, 285] as const;
const BLUR_IN = perFrame(SCAN.rise[0] - 2, [30, 21, 12, 8, 5, 2, 0]);

// the end view's layout (px): the bar, the grid (3 x 2), the progress bar and the counter
const L = {
  bar: { x: 478, y: 155, w: 965, h: 111 },
  anchor: { x: 958, y: 328.7 },
  cols: [468, 808, 1148] as const,
  rows: [300, 604] as const,
  tw: 304,
  th: 171,
  prog: { x: 470, y: 912, w: 982 },
  counter: 943,
} as const;
const K07 = 1 / 0.6935;
/** Type in the end view (px): the camera reads the input at x1.44 and the grid at x0.89. */
const TYPE_PX = { button: 28, counter: 30, title: 21, meta: 17 } as const; // the input's rest scale against the end view

export const ScanGrid: React.FC<ScanGridProps> = ({ prefix = '', url, logo, action, busy, items, counter, palette, pointer = true, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf({ ground: C.ink, ink: C.white, ...palette });
  const bar = mixColor(P.ground, P.ink, 0.06);
  const skin = skinOf('dark', bar, P.accent);
  // ---- the camera: the push on the input, the tilt up, then the grid view rising and pulling back
  const tPush = clamp(t / SCAN.click) * 18;
  let k: number; // scale against the end view
  let ax: number; // where the end view's anchor sits on screen
  let ay: number;
  const barC = { x: L.bar.x + L.bar.w / 2, y: L.bar.y + L.bar.h / 2 };
  if (t < SCAN.tilt[1]) {
    k = K07 * tab(tPush, PUSH);
    const by = t < SCAN.tilt[0] ? 539 : tab(t, TILT);
    ax = 960 - (barC.x - L.anchor.x) * k;
    ay = by - (barC.y - L.anchor.y) * k;
  } else if (t < SCAN.rise[0]) {
    const q = span(t, SCAN.tilt[1], SCAN.rise[0]);
    k = K07 + (1.4376 - K07) * q;
    const by = 441 + (370 - 441) * q;
    ax = 960 - (barC.x - L.anchor.x) * k;
    ay = by - (barC.y - L.anchor.y) * k;
  } else {
    const qp = span(t, SCAN.pull[0], SCAN.pull[1]) * (PULL_S.length - 1);
    const i = Math.min(PULL_S.length - 2, Math.floor(qp));
    const f = qp - i;
    k = 1.4376 * (t < SCAN.pull[0] ? 1 : PULL_S[i] + (PULL_S[i + 1] - PULL_S[i]) * f);
    ax = 960 - 2 * span(t, SCAN.rise[0], SCAN.pull[1]);
    ay = t < SCAN.pull[0] ? tab(t, RISE_Y) : PULL_Y[i] + (PULL_Y[i + 1] - PULL_Y[i]) * f;
  }
  const cam = `translate(${ax.toFixed(2)}px, ${ay.toFixed(2)}px) scale(${k.toFixed(5)}) translate(${-L.anchor.x}px, ${-L.anchor.y}px)`;
  const blurIn = t < 4 ? [6, 5, 3, 1.5, 0][Math.floor(t)] : 0;
  // ---- the input: typed link, the button pressed, then busy
  const typed = typedAt(url, t * 2, { at: SCAN.type[0] * 2, cps: 26, fps: 60, seed: url });
  const caretOn = t < SCAN.click && (typed.since < 6 || Math.floor(t / 8) % 2 === 0);
  const press = pointer ? pressAt(t, SCAN.click, 30) : 0;
  const flash = E.snapOut(span(t, SCAN.click + 2, SCAN.click + 3)) * (1 - E.glideOut(span(t, SCAN.click + 4, SCAN.click + 9)));
  const isBusy = t >= SCAN.click + 4;
  const fsz = 30; // the bar's type in the end view (x1.44 on the input's own shot)
  const actW = measureTracked(action, 28, 500, -0.005, FONT.ui) + 64 + 30;
  const busyText = `${busy}..`;
  const busyN = Math.floor(clamp((t - (SCAN.click + 7)) * 2, 0, busyText.length));
  const busyW = measureTracked(busyText, 28, 500, -0.005, FONT.ui) + 64;
  const btnW = isBusy ? actW + (busyW - actW) * E.glideOut(span(t, SCAN.click + 4, SCAN.click + 10)) : actW;
  const btnH = 83;
  const btnR = L.bar.x + L.bar.w - 10;
  const btnFill = isBusy ? `linear-gradient(180deg, ${mixColor(P.accent, C.white, 0.18)} 0%, ${P.accent} 100%)` : mixColor(C.white, P.accent, 0.12 * press);
  // ---- the pointer: rises from below onto the button, hovers, clicks
  const hit = { x: btnR - btnW * 0.42, y: L.bar.y + L.bar.h * 0.62 };
  const ptrIn = span(t, 8, 11);
  const ptrY = hit.y + (1 - E.glideOut(ptrIn)) * 520 - 3 * E.stdInOut(span(t, 11, SCAN.click));
  const ptrOn = pointer && t >= 8 && t < SCAN.tilt[1] + 2;
  // ---- the horizon glow (sinks and dims with the push) and the deep glow under the grid
  const horizon = 1 - 0.8 * E.stdInOut(span(t, 0, SCAN.tilt[1]));
  const deep = E.snapOut(span(t, SCAN.rise[0] - 2, SCAN.rise[0] + 6));
  // lint-ok: the world's planet horizon (a lit edge the stage has), not an end card
  const ellipse = `radial-gradient(closest-side, ${mixColor(P.ground, P.accent, 0.3)} 0%, ${mixColor(P.ground, P.accent, 0.45)} 60%, ${mixColor(P.accent, C.white, 0.25)} 82%, ${mixColor(P.accent, C.white, 0.8)} 95%, ${mixColor(P.accent, C.white, 0.92)} 98.5%, ${withAlpha(P.accent, 0)} 100%)`;
  const sky = `linear-gradient(0deg, ${withAlpha(P.accent, 0.6)} 0%, ${withAlpha(P.accent, 0.25)} 40%, ${withAlpha(P.accent, 0)} 100%)`;
  // ---- the grid: rising rows, blueprint then colour, the counter
  const rise = E.glideOut(span(t, SCAN.rise[0], SCAN.rise[1]));
  const gridDy = (1 - rise) * 186;
  const gridBlur = tab(t, BLUR_IN);
  const cells = items.slice(0, 6);
  const progress = span(t, SCAN.pull[0] + 2, SCAN.dur - 6);
  const n = counter ? Math.round(counter.to * (0.92 + 0.08 * progress)) : 0;
  const titleSize = TYPE_PX.title;
  const metaSize = TYPE_PX.meta;
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {horizon > 0 && (
        <>
          {/* the light above the horizon, then the planet's lit rim (the ellipse's centre far below the frame) */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 560, transform: `translate(0px, ${(520 + (1 - horizon) * 300).toFixed(2)}px)`, background: sky, opacity: horizon }} />
          <div style={{ position: 'absolute', left: 0, top: 0, width: 4400, height: 1900, transformOrigin: '2200px 950px', transform: `translate(${960 - 2200}px, ${(1905 - 950 + (1 - horizon) * 300).toFixed(2)}px) scale(${(0.75 + 0.25 * horizon).toFixed(4)})`, background: ellipse, opacity: 0.35 + 0.65 * horizon }} />
        </>
      )}
      {deep > 0 && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: `linear-gradient(0deg, ${mixColor(P.ground, P.accent, 0.42)} 0%, ${withAlpha(P.ground, 0)} 100%)`, opacity: deep }} />}
      {/* lint-ok: the cut-in focus (f0-3) and the rising grid's smear (f20-26) never overlap */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: cam, filter: blurIn ? `blur(${blurIn}px)` : undefined }}>
        {/* the input bar */}
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${L.bar.x}px, ${L.bar.y}px)`, width: L.bar.w, height: L.bar.h, borderRadius: L.bar.h / 2, background: bar, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.10), 0 0 0 1px rgba(255,255,255,0.08)` }}>
          <div style={{ position: 'absolute', left: 40, top: (L.bar.h - 46) / 2 }}>
            {logo ? <Mark skin={skin} size={46} logo={logo} glyph="globe" /> : <Icon name="globe" size={46} color={P.ink} />}
          </div>
          <div data-text="scan-url" style={{ position: 'absolute', left: 106, top: 0, height: L.bar.h, display: 'flex', alignItems: 'center', fontFamily: FONT.ui, fontSize: fsz, whiteSpace: 'pre', color: P.ink }}>
            <span style={{ color: withAlpha(P.ink, 0.5) }}>{prefix}</span>
            <span>{typed.shown}</span>
            {caretOn && <span style={{ display: 'inline-block', width: 2, height: fsz * 1.05, marginLeft: 2, background: P.ink }} />}
          </div>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: (L.bar.h - btnH) / 2,
              width: btnW,
              height: btnH,
              borderRadius: btnH / 2,
              background: btnFill,
              transform: `translate(${(btnR - L.bar.x - btnW).toFixed(2)}px, 0px) scale(${(1 - 0.02 * press).toFixed(4)})`,
              boxShadow: flash > 0 ? `0 0 0 ${(3 * flash).toFixed(2)}px rgba(255,255,255,${(0.6 * flash).toFixed(3)})` : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              fontFamily: FONT.ui,
              fontSize: TYPE_PX.button,
              fontWeight: 500,
              whiteSpace: 'pre',
              overflow: 'hidden',
            }}
          >
            {isBusy ? (
              // lint-ok: the busy word cuts on two letters a frame as the button turns
              <span data-text="scan-busy" style={{ color: skin.accentInk, filter: t < SCAN.click + 7 ? 'blur(3px)' : undefined }}>{busyText.slice(0, Math.max(2, busyN))}</span>
            ) : (
              <>
                <span data-text="scan-action" style={{ color: P.accent }}>{action}</span>
                <Icon name="arrowRight" size={28} color={P.accent} weight="bold" />
              </>
            )}
            {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: mixColor(C.white, P.accent, 0.25), opacity: flash * 0.8 }} />}
          </div>
        </div>
        {/* the grid */}
        {t >= SCAN.rise[0] - 2 && (
          <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: `translate(0px, ${gridDy.toFixed(2)}px)`, filter: gridBlur > 0.2 ? `blur(${gridBlur.toFixed(2)}px)` : undefined, opacity: E.snapOut(span(t, SCAN.rise[0] - 2, SCAN.rise[0] + 1)) }}>
            {cells.map((it, i) => {
              const x = L.cols[i % 3];
              const y = L.rows[Math.floor(i / 3)];
              const colour = E.stdInOut(span(t, SCAN.colour[i] ?? SCAN.colour[5], (SCAN.colour[i] ?? SCAN.colour[5]) + 3));
              return (
                <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, width: L.tw }}>
                  <div style={{ position: 'relative', width: L.tw, height: L.th, borderRadius: 12, overflow: 'hidden', background: mixColor(C.white, P.accent, 0.06) }}>
                    {it.src && <Picture src={it.src} w={L.tw} h={L.th} focus={it.focus} />}
                    {it.overlay && <ThumbTitle text={it.overlay} w={L.tw} h={L.th} accent={P.accent} />}
                    {/* the blueprint: the art in the accent on white, until the tile turns to colour */}
                    {colour < 1 && (
                      <div style={{ position: 'absolute', inset: 0, opacity: 1 - colour }}>
                        {it.src && <Picture src={it.src} w={L.tw} h={L.th} focus={it.focus} style={{ filter: 'grayscale(1) contrast(1.15) brightness(1.2)' }} />}
                        <div style={{ position: 'absolute', inset: 0, background: mixColor(P.accent, C.ink, 0.15), mixBlendMode: 'lighten' }} />
                      </div>
                    )}
                    {it.duration && (
                      <span style={{ position: 'absolute', right: 8, bottom: 8, padding: '2px 6px', borderRadius: 5, background: 'rgba(0,0,0,0.78)', color: C.white, fontFamily: FONT.ui, fontSize: metaSize, fontWeight: 500 }}>{it.duration}</span>
                    )}
                  </div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 10, fontFamily: FONT.ui, lineHeight: 1.3 }}>
                    <div style={{ flex: 1, fontSize: titleSize, color: P.ink, fontWeight: 450 }}>{it.title}</div>
                    <Icon name="kebab" size={titleSize} color={withAlpha(P.ink, 0.7)} />
                  </div>
                  {it.meta && <div style={{ marginTop: 4, fontFamily: FONT.ui, fontSize: metaSize, color: withAlpha(P.ink, 0.55) }}>{it.meta}</div>}
                </div>
              );
            })}
            {counter && (
              <>
                <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${L.prog.x}px, ${L.prog.y}px)`, width: L.prog.w, height: 4, borderRadius: 2, background: mixColor(P.ground, P.ink, 0.16) }}>
                  <div style={{ width: `${(100 * n) / Math.max(1, counter.to)}%`, height: 4, borderRadius: 2, background: P.ink }} />
                </div>
                <div data-text="scan-counter" style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${L.prog.x}px, ${L.counter}px)`, fontFamily: FONT.ui, fontSize: TYPE_PX.counter, color: withAlpha(P.ink, 0.6), whiteSpace: 'pre', fontVariantNumeric: 'tabular-nums' }}>
                  {counter.text.replace('{n}', String(n))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
      {ptrOn && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: cam }}>
          <Cursor x={hit.x} y={ptrY} scale={1.35 / k} shape="hand" shadow="drop" fill={C.white} outline={C.ink} press={press} />
        </div>
      )}
    </Stage1080>
  );
};

export const scanGridMeta: SceneMeta = {
  id: 'scan-grid',
  does: 'a link is typed into a dark input, a pointer clicks scan, the camera tilts up as the button turns busy and a grid of real pictures rises in from blueprint to colour, with a counter',
  dur: SCAN.dur,
  props: ['prefix?', 'url', 'logo?', 'action', 'busy', 'items', 'counter?', 'palette?', 'pointer?'],
  handIn: { form: 'pill', x: 264, y: 460, w: 1392, h: 156, r: 78 },
  handOut: { form: 'list', x: 588, y: 252, w: 744, h: 540, r: 12 },
  klass: 'quiet',
  cues: [
    { f: 2, kind: 'key', id: 'typing', weight: 0.4 },
    { f: 9, kind: 'whoosh', id: 'pointer', weight: 0.3 },
    { f: SCAN.click, kind: 'click', id: 'scan', weight: 0.8 },
    { f: SCAN.tilt[0] + 2, kind: 'whoosh', id: 'tilt', weight: 0.5 },
    { f: SCAN.colour[0], kind: 'pop', id: 'colour', weight: 0.4 },
    { f: SCAN.pull[0] + 6, kind: 'pop', id: 'pull-back', weight: 0.6 },
  ],
};
