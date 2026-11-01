// The four moments a feature update shows, drawn from src/update.ts alone (no rewrite of this file for a normal
// product): a tap and the state it changes to, a list / grid / week that fills, a before -> after, a count that rises.
// Each is the product's own screen inside a kit/card Card (acts/World.tsx), built at film size (no string under 44 px
// at 1080p) and shown filling the frame on its beat, its state change landing on the change's hit frame and two details
// after it (res, res2), so the picture keeps acting for the 1-3.5 s it is shown. The data holds up when paused: one
// label per state (the button says it, nothing repeats it), the viewer's own tap adds the viewer (`you`), people are
// real photos or absent (never initials), a week shows its blocks. Every photo gets one treatment (PHOTO): the same
// grade, radius and frame. The hero shots (acts/heroes.tsx) set these screens on the depth stage: the press, the before
// and the after, the week a page travels.
import React from 'react';
import { Img } from 'remotion';
import { FONT, U } from '../brand/tokens';
import { CARD as KCARD, cardSize as kitCardSize } from '../kit/card';
import { Check } from '../kit/parts';
import type { KitTheme } from '../kit/theme';
import { clamp, E, hitPulse, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { phrase } from '../lib/cadence';
import { creep } from '../lib/handoff';
import { measureTracked } from '../lib/measure';
import { BEAT, type ChangeTimes, f60, FPS } from '../timeline';
import { type Change, type Row, type Slot } from '../update';
import { pic } from './look';

/** Card house numbers (px at 1080p): padding, the type sizes, row heights (the corner radius is kit/card's, by size: cardRadius). */
export const CARD = { pad: 64, title: 66, body: 48, meta: 44, row: 100, button: 104 } as const;
/** One photo treatment for the whole film: the natural grade (a touch of contrast, colour held back a little) and one radius. */
/** The product's own UI face: the type pairing's text face (FONT.ui) when the brand sets one, else the film's sans. */
export const UI_FACE: string = (FONT as { ui?: string }).ui ?? FONT.text;
export const PHOTO = { filter: 'saturate(0.9) contrast(1.04)', r: 18 } as const;

/** The screen header's height (px at 1080p): the title, its quiet line when there is one, the divider 22 px above this. */
export const headOf = (c: Change) => (c.sub ? 232 : 176);
/** The count moment's chart: bars at the right of the figure, bottom-aligned with the card's padding (px at 1080p). */
const CHART = { w: 520, h: 300, gap: 18 } as const;

/** The card's size for a change's moment (px at 1080p, before the camera's scale). */
export const cardSize = (c: Change): { w: number; h: number } => {
  const s = c.show;
  const head = headOf(c);
  if (s.kind === 'tap') return { w: 1160 * U, h: (head + 40 + Math.max(2, (s.rows ?? []).length, s.result?.length ? 2 : 0) * CARD.row + CARD.button + 2 * CARD.pad + 20) * U };
  if (s.kind === 'swap') return { w: 1160 * U, h: (head + 40 + Math.max(s.before.length, s.after.length) * CARD.row + CARD.pad + 10) * U };
  if (s.kind === 'count') return { w: 1320 * U, h: (head + 40 + CHART.h + CARD.pad) * U };
  if (s.kind !== 'fill') return { w: 1160 * U, h: 700 * U }; // a typed request or a page: drawn by the kit screens
  if (s.layout === 'week') return { w: 1460 * U, h: 820 * U };
  if (s.layout === 'grid') return { w: 1320 * U, h: (head + 40 + Math.ceil(s.items.length / (s.cols ?? 3)) * 300 + CARD.pad) * U };
  return { w: 1100 * U, h: (head + 30 + s.items.length * CARD.row + CARD.pad) * U };
};

const txt = (px: number, weight: number, color: string, track = -0.012): React.CSSProperties => ({
  fontFamily: UI_FACE,
  fontSize: px * U,
  fontWeight: weight,
  letterSpacing: `${track}em`,
  lineHeight: 1.12,
  color,
  whiteSpace: 'pre',
  fontVariantNumeric: 'tabular-nums',
});
const abs = (x: number, y: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ position: 'absolute', left: x * U, top: y * U, ...extra });
const enter = (F: number, at: number, dur = f60(16)) => prog(F, at - 1, at - 1 + dur, E.snapOut);
const rise = (t: number, px = 26): React.CSSProperties => ({ opacity: clamp(t * 1.6), transform: `translateY(${((1 - t) * px * U).toFixed(2)}px)` });

/** A person or a picture at the head of a row: the real photo (PHOTO treatment), else nothing (never initials on a disc). */
const Lead: React.FC<{ r: Row; size: number; t: KitTheme; k: number }> = ({ r, size, t }) =>
  r.photo ? (
    <div data-imagery style={{ width: size * U, height: size * U, borderRadius: (size / 2) * U, overflow: 'hidden', flex: 'none', boxShadow: `0 0 0 ${(2 * U).toFixed(2)}px ${t.surface}` }}>
      <Img src={pic(r.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: PHOTO.filter }} />
    </div>
  ) : null;

/** A row of a product screen: lead, label, the quiet detail at the right. */
const RowLine: React.FC<{ r: Row; w: number; t: KitTheme; k: number; id: string; muted?: boolean; mark?: React.ReactNode }> = ({ r, w, t, k, id, muted, mark }) => (
  <div style={{ position: 'relative', width: w * U, height: CARD.row * U, display: 'flex', alignItems: 'center', gap: 26 * U }}>
    {mark}
    <Lead r={r} size={64} t={t} k={k} />
    <span data-text={`${id}-label`} style={{ ...txt(CARD.body, r.accent ? 600 : 500, muted ? t.mute : t.text), flex: '1 1 auto', overflow: 'hidden' }}>{r.label}</span>
    {r.meta && <span data-text={`${id}-meta`} style={txt(CARD.meta, 450, t.mute)}>{r.meta}</span>}
  </div>
);

/** The screen's header: its title, its quiet line, and a badge at the right. */
const Header: React.FC<{ c: Change; t: KitTheme; w: number; badge?: React.ReactNode }> = ({ c, t, w, badge }) => (
  <>
    <div style={abs(CARD.pad, CARD.pad - 6)}>
      <span data-text={`${c.id}-title`} style={txt(CARD.title, 620, t.text, -0.018)}>{c.title}</span>
    </div>
    {c.sub && (
      <div style={abs(CARD.pad, CARD.pad + 82)}>
        <span data-text={`${c.id}-sub`} style={txt(CARD.meta, 450, t.mute)}>{c.sub}</span>
      </div>
    )}
    {badge && <div style={{ position: 'absolute', right: CARD.pad * U, top: (CARD.pad + 4) * U }}>{badge}</div>}
    <div style={{ position: 'absolute', left: CARD.pad * U, top: (headOf(c) - 22) * U, width: (w / U - 2 * CARD.pad) * U, height: Math.max(1.5, 2 * U), background: t.line }} />
  </>
);

/** A small pill: a dot and a label, quiet or in the accent. */
const Pill: React.FC<{ label: string; on: number; t: KitTheme; id: string }> = ({ label, on, t, id }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 14 * U, height: 76 * U, padding: `0 ${28 * U}px`, borderRadius: 38 * U, background: mixColor(t.well, t.accentSoft, on), boxShadow: `inset 0 0 0 ${2 * U}px ${mixColor(t.line, t.accent, on)}` }}>
    <div style={{ width: 16 * U, height: 16 * U, borderRadius: 8 * U, background: mixColor(t.mute, t.accent, on) }} />
    <span data-text={id} style={txt(CARD.meta, 600, mixColor(t.mute, t.accentText, on))}>{label}</span>
  </div>
);

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
/**
 * The result's beats after the state change (res2, then T.live), what the product does while its result is held: a
 * selection that moves on (`k` the beat it is on, -1 before the first; `p` 0..1 its eased travel from the one before:
 * it slides and lands, never jumps) and the result's glow (`glow`: eased in once at res2 and kept, never a pulse).
 */
const hops = (F: number, T: ChangeTimes) => {
  const at = [T.res2, ...T.live];
  let k = -1;
  for (let j = 0; j < at.length; j++) if (F >= at[j]) k = j;
  return { k, p: k >= 0 ? E.strongInOut(clamp((F - at[k]) / f60(16))) : 0, glow: E.softOut(clamp((F - T.res2) / f60(20))) };
};

// ------------------------------------------------------------------------------------------------------- tap
/** The tap's button on its card (card px at film scale, before the state changes): where a pointer aims. */
const labelW = (label: string) => (typeof document === 'undefined' ? label.length * CARD.body * 0.55 * U : measureTracked(label, CARD.body * U, 600, -0.01, UI_FACE)); // lint-ok: Node only (the sound and the checks plan a camera from it); every render measures
const tapWidth = (label: string, w: number, check = false) => Math.max(0.46 * (w / U - 2 * CARD.pad), labelW(label) / U + 2 * 52 + (check ? 62 : 0));
const tapButton = (s: Extract<Change['show'], { kind: 'tap' }>, w: number, h: number) => {
  const bw = tapWidth(s.action, w);
  return { x: (w / U - bw) / 2, y: h / U - CARD.pad - CARD.button, w: bw, h: CARD.button };
};
const TapMoment: React.FC<{ c: Change; s: Extract<Change['show'], { kind: 'tap' }>; T: ChangeTimes; F: number; t: KitTheme; w: number; h: number; noTip?: boolean }> = ({ c, s, T, F, t, w, h, noTip }) => {
  const rows = s.rows ?? [];
  // the result: the people or things that appear, the viewer's own entry last (the tap is what adds it)
  const result = [...(s.result ?? []), ...(s.you ? [s.you] : [])];
  const head = headOf(c);
  const inner = w / U - 2 * CARD.pad;
  const press = prog(F, T.hit - f60(5), T.hit, E.stdInOut) * (1 - prog(F, T.hit, T.hit + f60(10), E.glideOut));
  const done = prog(F, T.hit, T.hit + f60(14), E.snapOut);
  const b0 = tapButton(s, w, h);
  const bw0 = b0.w;
  const bw1 = tapWidth(s.done, w, true);
  const bw = mix(bw0, bw1, done);
  const bx = (w / U - bw) / 2;
  const by = b0.y;
  // the tap: a soft fingertip glides in from below the card and presses the action (cursor-follow draws its own pointer)
  const glide = prog(F, T.go, T.hit - f60(6), E.settleOut);
  const tx = mix(w / U * 0.62, b0.x + bw0 / 2, glide);
  const ty = mix(h / U + 140, by + CARD.button / 2, glide);
  const tipO = noTip ? 0 : prog(F, T.go, T.go + f60(10), E.glideOut) * (1 - prog(F, T.hit + f60(8), T.hit + f60(22), E.softIn));
  const ring = noTip ? 0 : prog(F, T.hit, T.hit + f60(26), E.glideOut);
  const glow = 0.5 * hitPulse(F - T.res2, 3, 14);
  const rowsOut = prog(F, T.hit, T.hit + f60(9), E.buildIn); // the rows are gone before the result lands: never two layers of words at once
  const RES_ON = phrase(Math.max(1, result.length), f60(6), { shape: 'settle', seed: `${c.id}-result` }).onsets;
  const gap = 30;
  const rw = Math.min(250, (inner - gap * (result.length - 1)) / Math.max(1, result.length));
  const av = Math.min(150, rw - 20);
  const rx0 = (w / U - (result.length * rw + Math.max(0, result.length - 1) * gap)) / 2;
  return (
    <>
      <Header c={c} t={t} w={w} />
      {rowsOut < 1 && (
        <div style={{ ...abs(CARD.pad, head + 18), opacity: 1 - rowsOut, transform: `translateY(${(-rowsOut * 30 * U).toFixed(2)}px)` }}>
          {rows.map((r, k) => <RowLine key={k} r={r} w={inner} t={t} k={k} id={`${c.id}-row${k}`} />)}
        </div>
      )}
      {/* (no ring sliding from face to face: an element with no job that crossed the faces as it moved; the viewer's
          own entry, the one the tap added, carries its ring) */}
      {result.length > 0 && done > 0 && (
        <div style={{ ...abs(rx0, head + 34), display: 'flex', gap: gap * U }}>
          {result.map((r, k) => {
            const e = enter(F, T.hit + f60(10) + RES_ON[k] + (s.you && k === result.length - 1 ? f60(8) : 0));
            const mine = !!s.you && k === result.length - 1;
            return (
              <div key={k} style={{ ...rise(e, 30), width: rw * U, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 * U }}>
                {r.photo ? (
                  <div data-imagery style={{ width: av * U, height: av * U, borderRadius: (av / 2) * U, overflow: 'hidden', boxShadow: mine ? `0 0 0 ${(5 * U).toFixed(2)}px ${t.surface}, 0 0 0 ${(9 * U).toFixed(2)}px ${t.accent}` : undefined }}>
                    <Img src={pic(r.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: PHOTO.filter }} />
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 * U, height: 84 * U, padding: `0 ${26 * U}px 0 ${16 * U}px`, borderRadius: 42 * U, background: mine ? t.accentSoft : t.well }}>
                    <Check size={40 * U} fill={t.accent} tick={t.accentInk} />
                  </div>
                )}
                <span data-text={`${c.id}-result${k}`} style={txt(CARD.meta, mine ? 620 : 500, mine ? t.accentText : t.text)}>{r.label}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ ...abs(bx, by), width: bw * U, height: CARD.button * U, borderRadius: (CARD.button / 2) * U, background: mixColor(t.accent, t.accentDeep, 0.35 * press + 0.18 * done), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 * U, transform: `scale(${(1 - 0.04 * press).toFixed(4)})`, boxShadow: `0 0 0 ${(10 * glow * U).toFixed(2)}px ${mixColor(t.surface, t.accent, 0.25)}` }}>
        {done > 0 && <div style={{ opacity: done }}><Check size={44 * U} fill={t.accentInk} tick={t.accent} /></div>}
        <span data-text={`${c.id}-action`} style={txt(CARD.body, 600, t.accentInk, -0.01)}>{done > 0.5 ? s.done : s.action}</span>
      </div>
      {tipO > 0.01 && (
        <div style={{ position: 'absolute', left: (tx - 34) * U, top: (ty - 34) * U, width: 68 * U, height: 68 * U, borderRadius: 34 * U, background: 'rgba(255, 255, 255, 0.55)', boxShadow: `0 ${4 * U}px ${14 * U}px rgba(0,0,0,0.18), inset 0 0 0 ${2 * U}px rgba(255,255,255,0.95)`, opacity: tipO, transform: `scale(${(1 - 0.18 * press).toFixed(4)})` }} />
      )}
      {ring > 0 && ring < 1 && (
        <div style={{ position: 'absolute', left: (b0.x + bw0 / 2 - 60) * U, top: (by + CARD.button / 2 - 60) * U, width: 120 * U, height: 120 * U, borderRadius: 60 * U, boxShadow: `0 0 0 ${(3 * U).toFixed(2)}px ${t.accent}`, opacity: 0.7 * (1 - ring), transform: `scale(${(0.6 + 1.6 * ring).toFixed(4)})` }} />
      )}
    </>
  );
};

// ------------------------------------------------------------------------------------------------------- fill
const FillMoment: React.FC<{ c: Change; s: Extract<Change['show'], { kind: 'fill' }>; T: ChangeTimes; F: number; t: KitTheme; w: number; h: number }> = ({ c, s, T, F, t, w, h }) => {
  const head = headOf(c);
  const inner = w / U - 2 * CARD.pad;
  const n = s.items.length;
  const accentAt = (s.items as { accent?: boolean }[]).findIndex((x) => x.accent);
  const order = s.items.map((_, k) => k).filter((k) => k !== accentAt);
  if (accentAt >= 0) order.push(accentAt);
  // the items land one by one from `go`, the accent one last, on the hit
  const step = Math.max(f60(6), Math.min(BEAT / 2, (T.hit - T.go) / Math.max(1, n - 1)));
  const landAt = (k: number) => (order.indexOf(k) === n - 1 ? T.hit : Math.round(T.hit - (n - 1 - order.indexOf(k)) * step));
  const landed = s.items.filter((_, k) => F >= landAt(k)).length;
  const glow = 0.6 * hops(F, T).glow;
  const noun = 'noun' in s && s.noun ? s.noun : null;
  // the count shows once the first item is in (never an empty "0" state), and turns to the accent as the last lands
  const badge = noun && landed > 0 ? <div style={{ opacity: enter(F, landAt(order[0]), f60(10)) }}><Pill label={`${landed} ${landed === 1 ? noun[0] : noun[1]}`} on={prog(F, T.hit, T.hit + f60(12), E.snapOut)} t={t} id={`${c.id}-count`} /></div> : undefined;
  if (s.layout === 'week') {
    const gx = CARD.pad + (s.hours?.length ? 110 : 0);
    const gy = head + 70;
    const gw = w / U - gx - CARD.pad;
    const gh = h / U - gy - CARD.pad;
    const rowsN = Math.max(s.hours?.length ?? 0, ...s.items.map((x) => x.at + x.len), 4);
    const cw = gw / s.days.length;
    const rh = gh / rowsN;
    return (
      <>
        <Header c={c} t={t} w={w} />
        {s.days.map((d, k) => (
          <div key={k} style={{ ...abs(gx + k * cw, head + 6), width: cw * U, textAlign: 'center' }}>
            <span data-text={`${c.id}-day${k}`} style={txt(CARD.meta, 600, t.mute)}>{d}</span>
          </div>
        ))}
        {(s.hours ?? []).map((hr, k) => (
          <div key={k} style={{ ...abs(CARD.pad, gy + k * rh - 4), width: 90 * U }}>
            <span data-text={`${c.id}-hour${k}`} style={txt(CARD.meta - 4, 450, t.mute)}>{hr}</span>
          </div>
        ))}
        <div data-chart style={{ ...abs(gx, gy), width: gw * U, height: gh * U }}>
          {Array.from({ length: rowsN + 1 }, (_, k) => <div key={k} style={{ position: 'absolute', left: 0, top: k * rh * U, width: gw * U, height: Math.max(1, 1.5 * U), background: mixColor(t.surface, t.line, 0.6) }} />)}
          {s.days.slice(1).map((_, k) => <div key={`v${k}`} style={{ position: 'absolute', left: (k + 1) * cw * U, top: 0, width: Math.max(1, 1.5 * U), height: gh * U, background: mixColor(t.surface, t.line, 0.45) }} />)}
          {s.items.map((x: Slot, k) => {
            const e = enter(F, landAt(k), f60(18));
            if (e <= 0) return null;
            const on = !!x.accent;
            const g = on ? glow : 0;
            return (
              <div key={k} style={{ position: 'absolute', left: (x.day * cw + 8) * U, top: (x.at * rh + 6) * U, width: (cw - 16) * U, height: (x.len * rh - 12) * U, borderRadius: 16 * U, background: on ? t.accent : mixColor(t.surface, t.text, 0.1), boxShadow: on ? `0 ${10 * U}px ${30 * U}px ${mixColor(t.surface, t.accent, 0.45)}, 0 0 0 ${(8 * g * U).toFixed(2)}px ${mixColor(t.surface, t.accent, 0.3)}` : `inset 0 0 0 ${(1.5 * U).toFixed(2)}px ${mixColor(t.surface, t.text, 0.16)}`, opacity: clamp(e * 1.5), transform: `scale(${mix(0.9, 1, e).toFixed(4)})`, transformOrigin: '50% 0%', overflow: 'hidden', padding: `${12 * U}px ${16 * U}px`, boxSizing: 'border-box' }}>
                {x.len * rh >= 64 && <span data-text={`${c.id}-slot${k}`} style={txt(CARD.meta - 4, on ? 650 : 500, on ? t.accentInk : t.text)}>{x.label}</span>}
              </div>
            );
          })}
        </div>
      </>
    );
  }
  if (s.layout === 'grid') {
    const cols = s.cols ?? 3;
    const gap = 30;
    const tw = (inner - gap * (cols - 1)) / cols;
    return (
      <>
        <Header c={c} t={t} w={w} badge={badge} />
        {s.items.map((r, k) => {
          const e = enter(F, landAt(k), f60(18));
          if (e <= 0) return null;
          const x = CARD.pad + (k % cols) * (tw + gap);
          const y = head + 30 + Math.floor(k / cols) * 300;
          const on = !!r.accent;
          return (
            <div key={k} style={{ ...abs(x, y), width: tw * U, height: 270 * U, ...rise(e, 34) }}>
              <div data-imagery={r.photo ? true : undefined} style={{ width: tw * U, height: 204 * U, borderRadius: PHOTO.r * U, overflow: 'hidden', background: mixColor(t.well, t.text, 0.05), boxShadow: on ? `0 0 0 ${((4 + 6 * glow) * U).toFixed(2)}px ${t.accent}` : undefined }}>
                {r.photo && <Img src={pic(r.photo)} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: PHOTO.filter, transform: `scale(${creep(F, landAt(k), { pctPerSec: 0.025 }, FPS).toFixed(5)})` }} />}
              </div>
              <div style={{ marginTop: 12 * U, display: 'flex', alignItems: 'center', gap: 10 * U }}>
                <span data-text={`${c.id}-tile${k}`} style={txt(CARD.meta, on ? 650 : 500, on ? t.accentText : t.text)}>{r.label}</span>
              </div>
            </div>
          );
        })}
      </>
    );
  }
  return (
    <>
      <Header c={c} t={t} w={w} badge={badge} />
      {s.items.map((r, k) => {
        const e = enter(F, landAt(k), f60(18));
        if (e <= 0) return null;
        const on = !!r.accent;
        return (
          <div key={k} style={{ ...abs(CARD.pad - 20, head + 10 + k * CARD.row), width: (inner + 40) * U, height: CARD.row * U, ...rise(e, 30) }}>
            {on && <div style={{ position: 'absolute', inset: `${6 * U}px 0`, borderRadius: 22 * U, background: t.accentSoft, boxShadow: `0 0 0 ${((2 + 6 * glow) * U).toFixed(2)}px ${mixColor(t.accentSoft, t.accent, 0.6)}` }} />}
            <div style={{ position: 'absolute', left: 20 * U, top: 0 }}>
              <RowLine r={r} w={inner} t={t} k={k} id={`${c.id}-item${k}`} />
            </div>
            {k < n - 1 && !on && <div style={{ position: 'absolute', left: 20 * U, bottom: 0, width: inner * U, height: Math.max(1, 1.5 * U), background: t.line }} />}
          </div>
        );
      })}
    </>
  );
};

// ------------------------------------------------------------------------------------------------------- swap
const SwapMoment: React.FC<{ c: Change; s: Extract<Change['show'], { kind: 'swap' }>; T: ChangeTimes; F: number; t: KitTheme; w: number; h: number }> = ({ c, s, T, F, t, w, h }) => {
  const head = headOf(c);
  const inner = w / U - 2 * CARD.pad;
  const y0 = head + 18;
  const rowsH = Math.max(s.before.length, s.after.length) * CARD.row;
  // the wipe runs down the screen from `go` to the hit: above its edge the screen as it is now, below it as it was
  const p = prog(F, T.go, T.hit, E.strongInOut);
  const edge = y0 - 10 + p * (rowsH + 20);
  const tag = prog(F, T.hit, T.hit + f60(12), E.snapOut);
  const hop = hops(F, T);
  const box = (on: boolean, k: number) => (
    <div style={{ width: 52 * U, height: 52 * U, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {on ? (
        <div style={{ transform: `scale(${mix(0.6, 1, enter(F, T.res + k * f60(4), f60(12))).toFixed(4)})` }}>
          <Check size={46 * U} fill={t.accent} tick={t.accentInk} />
        </div>
      ) : (
        <div style={{ width: 38 * U, height: 38 * U, borderRadius: 10 * U, boxShadow: `inset 0 0 0 ${2.5 * U}px ${t.line}` }} />
      )}
    </div>
  );
  return (
    <>
      <Header c={c} t={t} w={w} badge={<Pill label={tag > 0.5 ? s.tag[1] : s.tag[0]} on={tag} t={t} id={`${c.id}-tag`} />} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, clipPath: `inset(${(edge * U).toFixed(2)}px 0 0 0)` }}>
        <div style={abs(CARD.pad, y0)}>{s.before.map((r, k) => <RowLine key={k} r={r} w={inner} t={t} k={k} id={`${c.id}-before${k}`} muted mark={box(false, k)} />)}</div>
      </div>
      <div style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, clipPath: `inset(0 0 ${(h - edge * U).toFixed(2)}px 0)` }}>
        <div style={abs(CARD.pad, y0)}>
          {s.after.map((r, k) => (
            <div key={k} style={{ position: 'relative' }}>
              {r.accent && <div style={{ position: 'absolute', left: -20 * U, top: 6 * U, width: (inner + 40) * U, height: (CARD.row - 12) * U, borderRadius: 22 * U, background: t.accentSoft, opacity: 0.6 + 0.4 * hop.glow }} />}
              <RowLine r={r} w={inner} t={t} k={k} id={`${c.id}-after${k}`} mark={box(true, k)} />
            </div>
          ))}
        </div>
      </div>
      {hop.k >= 0 && (() => {
        // a selection reads down the tidied rows: one highlight that slides from row to row and lands
        const n = s.after.length;
        const k1 = hop.k % n;
        const k0 = hop.k > 0 ? (hop.k - 1) % n : k1;
        const y = y0 + mix(k0, k1, hop.p) * CARD.row + 6;
        return <div style={{ ...abs(CARD.pad - 20, y), width: (inner + 40) * U, height: (CARD.row - 12) * U, borderRadius: 22 * U, boxShadow: `inset 0 0 0 ${(2.5 * U).toFixed(2)}px ${mixColor(t.accentSoft, t.accent, 0.55)}`, opacity: hop.k > 0 ? 1 : hop.p }} />;
      })()}
      {p > 0 && p < 1 && <div style={{ ...abs(CARD.pad - 24, edge), width: (inner + 48) * U, height: 4 * U, borderRadius: 2 * U, background: t.accent, boxShadow: `0 0 ${18 * U}px ${mixColor(t.surface, t.accent, 0.6)}` }} />}
    </>
  );
};

// ------------------------------------------------------------------------------------------------------- count
/** The count's bars and where each sits in the chart (px at 1080p, chart-local). */
const barsOf = (s: Extract<Change['show'], { kind: 'count' }>) => {
  const bars = s.bars?.length ? s.bars : [0.32, 0.4, 0.37, 0.52, 0.6, 0.74, 1];
  const top = Math.max(...bars);
  const bw = (CHART.w - CHART.gap * (bars.length - 1)) / bars.length;
  return bars.map((b, k) => ({ x: k * (bw + CHART.gap), w: bw, h: (b / top) * CHART.h }));
};
const CountMoment: React.FC<{ c: Change; s: Extract<Change['show'], { kind: 'count' }>; T: ChangeTimes; F: number; t: KitTheme; w: number; h: number }> = ({ c, s, T, F, t, w, h }) => {
  const p = prog(F, T.go, T.hit, E.stdInOut);
  const v = mix(s.from, s.to, p);
  const bars = barsOf(s);
  const head = headOf(c);
  const sub = enter(F, T.res, f60(16));
  const glow = 0.6 * hops(F, T).glow;
  const unitW = s.unit ? measureTracked(s.unit, 96 * U, 560, -0.02, UI_FACE) / U : 0;
  const cx = w / U - CARD.pad - CHART.w;
  const cy = h / U - CARD.pad - CHART.h;
  return (
    <>
      <Header c={c} t={t} w={w} />
      <div style={abs(CARD.pad, head + 8)}>
        <span data-text={`${c.id}-label`} style={txt(CARD.meta, 500, t.mute)}>{s.label}</span>
      </div>
      <div style={{ ...abs(CARD.pad, head + 58), display: 'flex', alignItems: 'baseline', gap: 14 * U }}>
        <span data-text={`${c.id}-figure`} style={txt(176, 640, t.text, -0.03)}>{fmt(v)}</span>
        {s.unit && <span data-text={`${c.id}-unit`} style={{ ...txt(96, 560, t.mute, -0.02), width: unitW * U }}>{s.unit}</span>}
      </div>
      {s.sub && (
        <div style={{ ...abs(CARD.pad, head + 262), ...rise(sub, 20) }}>
          <span data-text={`${c.id}-note`} style={txt(CARD.meta, 500, t.accentText)}>{s.sub}</span>
        </div>
      )}
      <div data-chart style={{ ...abs(cx, cy), width: CHART.w * U, height: CHART.h * U }}>
        {bars.map((b, k) => {
          // every bar rises with the figure and lands by the state change; the starts lean in from left to right
          const g = prog(F, T.go + (k / bars.length) * 0.45 * (T.hit - T.go), T.hit, E.stdInOut);
          const last = k === bars.length - 1;
          return (
            <div key={k} style={{ position: 'absolute', left: b.x * U, bottom: 0, width: b.w * U, height: Math.max(8, b.h * g) * U, borderRadius: 14 * U, background: last ? t.accent : mixColor(t.well, t.text, 0.08), boxShadow: last ? `0 0 0 ${(6 * glow * U).toFixed(2)}px ${mixColor(t.surface, t.accent, 0.3)}` : undefined }} />
          );
        })}
      </div>
    </>
  );
};

/**
 * Where the change lands on its card, in the card's own px (w x h, film scale) once the state has changed: the pressed
 * button, the block, tile or row that landed in the accent, the tag that turned, the last bar (a page's travel lands on it).
 */
export const changedRect = (c: Change, w: number, h: number): { x: number; y: number; w: number; h: number; r: number } => {
  const s = c.show;
  const head = headOf(c);
  const inner = w / U - 2 * CARD.pad;
  const px = (x: number, y: number, ww: number, hh: number, r: number) => ({ x: x * U, y: y * U, w: ww * U, h: hh * U, r: r * U });
  if (s.kind === 'tap') {
    const bw = tapWidth(s.done, w, true);
    return px((w / U - bw) / 2, h / U - CARD.pad - CARD.button, bw, CARD.button, CARD.button / 2);
  }
  if (s.kind === 'swap') {
    const pw = measureTracked(s.tag[1], CARD.meta * U, 600, -0.012, UI_FACE) / U + 2 * 28 + 30;
    return px(w / U - CARD.pad - pw, CARD.pad + 4, pw, 76, 38);
  }
  if (s.kind === 'count') {
    const b = barsOf(s)[barsOf(s).length - 1];
    return px(w / U - CARD.pad - CHART.w + b.x, h / U - CARD.pad - b.h, b.w, b.h, 14);
  }
  if (s.kind !== 'fill') return px(CARD.pad, CARD.pad, w / U - 2 * CARD.pad, 120, 22); // a kit screen's (typed request, page)
  const items = s.items as { accent?: boolean }[];
  const hit = items.findIndex((x) => x.accent);
  const k = hit >= 0 ? hit : items.length - 1; // the accent item, else the last to land
  if (s.layout === 'week') {
    const gx = CARD.pad + (s.hours?.length ? 110 : 0);
    const gy = head + 70;
    const rowsN = Math.max(s.hours?.length ?? 0, ...s.items.map((x) => x.at + x.len), 4);
    const cw = (w / U - gx - CARD.pad) / s.days.length;
    const rh = (h / U - gy - CARD.pad) / rowsN;
    const x = s.items[k];
    return px(gx + x.day * cw + 8, gy + x.at * rh + 6, cw - 16, x.len * rh - 12, 16);
  }
  if (s.layout === 'grid') {
    const cols = s.cols ?? 3;
    const tw = (inner - 30 * (cols - 1)) / cols;
    return px(CARD.pad + (k % cols) * (tw + 30), head + 30 + Math.floor(k / cols) * 300, tw, 204, PHOTO.r);
  }
  return px(CARD.pad - 20, head + 10 + k * CARD.row + 6, inner + 40, CARD.row - 12, 22);
};

/** The button a pointer presses on change c's card (card px at film scale), or null when its moment has none. */
export const buttonRect = (c: Change, w: number, h: number): { x: number; y: number; w: number; h: number; r: number } | null => {
  if (c.show.kind !== 'tap') return null;
  const b = tapButton(c.show, w, h);
  return { x: b.x * U, y: b.y * U, w: b.w * U, h: b.h * U, r: (b.h / 2) * U };
};
/** A card's corner radius at its width (px, film scale): kit/card's radius by size, so a card carried down to a recap
 * tile keeps its corners in proportion. */
export const cardRadius = (w: number) => KCARD.radius[kitCardSize(w, U)] * U;

/** A change's moment inside its card (w x h px), playing on the change's frames. */
export const Moment: React.FC<{ c: Change; T: ChangeTimes; F: number; theme: KitTheme; w: number; h: number; noTip?: boolean }> = ({ c, T, F, theme, w, h, noTip }) => {
  const s = c.show;
  if (s.kind === 'tap') return <TapMoment c={c} s={s} T={T} F={F} t={theme} w={w} h={h} noTip={noTip} />;
  if (s.kind === 'fill') return <FillMoment c={c} s={s} T={T} F={F} t={theme} w={w} h={h} />;
  if (s.kind === 'swap') return <SwapMoment c={c} s={s} T={T} F={F} t={theme} w={w} h={h} />;
  if (s.kind === 'count') return <CountMoment c={c} s={s} T={T} F={F} t={theme} w={w} h={h} />;
  return null; // a typed request and a page are kit screens (acts/heroes.tsx: PromptBar, DocPage, BrowserWindow)
};
