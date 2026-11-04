// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// orbit-chips: the line at the centre of hairline orbits; accent pills fly in and land as the partners' logo chips, small
// chips pop in, everything turns slowly clockwise, then the ground dips to dark, the chips go out one by one and a card opens at the centre.
//
// A pale ground with concentric hairline circles round the centre, slowly widening; small accent dots on white discs ride
// two of the rings. The line scales down into place (1.29 -> 1, most of it in three frames). Four solid accent pills fly
// in from just outside the frame on a slight arc, each landing on its slot and turning, in one frame, into a pale tint
// with the partner's mark and name already in place, then into a white chip; six small chips pop in after them; every
// chip orbits clockwise with the rings. The exit dips the ground to the ink in thirteen frames while the chips shrink to
// nothing one after another and the rings round into stadiums; a disc grows at the centre (the card the next scene
// opens). 2.0 s. Quiet (its colour is in the pills).
//
// Numbers (1080p px, measured at 24 fps and played in seconds): rings r 210 348 489 628 768 907, x0.89 -> 1 -> 1.017;
// dots ride ring 348 at 0.58 deg/f@24 and ring 489 at 1.0; line 114 px, 1.29 -> 1.00 exponential (63 % by its third
// frame); big chips 348-408 x 138, a 84 px mark disc, name 45 px; small chips 84 tall, mark 36, name 30; pills 2 f in
// flight, 1 f tint, then white, 1 f apart; small chips 0.6 -> 1 over 3 f; orbit 0.28 deg/f@24.
import React from 'react';
import { FONT } from '../brand/tokens';
import { BrandLogo, type LogoRef, logoName } from '../kit/logos';
import { E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { bezier, expo, rgba, Stage1080 } from './stage1080';

export type OrbitChip = { logo: LogoRef; label?: string };

export const ORBIT = {
  dur: 60,
  rings: [210, 348, 489, 628, 768, 907] as const,
  // ring zoom keyed on 24 fps frames from the scene start (the hold is trimmed)
  zoom: [[0, 0.89], [2, 0.89], [32, 1.0], [47, 1.017]] as const,
  dots: [
    { ring: 1, speed: 0.58, phases: [12, 130, 250] },
    { ring: 2, speed: 1.0, phases: [60, 170, 300, 340] },
  ],
  line: { size: 114, from: 1.29, k: 0.33 }, // exponential: 1 - e^(-k f) per 24 fps frame (63 % by f3)
  big: [
    { at: 7, from: [1050, -60], slot: [1320, 177] },
    { at: 8, from: [1980, 760], slot: [1373, 956] },
    { at: 9, from: [600, 1160], slot: [482, 900] },
    { at: 10, from: [-120, 260], slot: [444, 158] },
  ] as const,
  small: [
    { at: 17, slot: [1581, 446] },
    { at: 18, slot: [275, 647] },
    { at: 19, slot: [1566, 720] },
    { at: 19, slot: [870, 1016] },
    { at: 21, slot: [933, 68] },
    { at: 22, slot: [297, 384] },
  ] as const,
  orbit: 0.28, // deg per 24 fps frame, clockwise
  dip: { from: 34, to: 47, out: [2, 4, 4, 3, 4, 5, 6, 7, 3, 5] as const }, // chips' shrink order (frames after the dip starts), big then small
  // the ground's fall to the ink per 24 fps frame from the dip's start (measured: slow, then most of it in three frames)
  fall: [[0, 0], [3, 0.04], [6, 0.21], [7, 0.38], [8, 0.67], [9, 0.85], [10, 0.94], [11, 0.98], [13, 1]] as const,
  bigChip: { h: 138, disc: 84, name: 45 },
  smallChip: { h: 84, mark: 36, name: 30 },
  card: { w: 800, h: 680, r: 64 }, // the card the dip opens (the form it hands on)
} as const;

export type OrbitChipsProps = {
  /** the line at the centre */
  line: string;
  /** the partners: the first four fly in as pills and land as big chips, up to six more pop in small (official marks) */
  chips: OrbitChip[];
  palette?: Partial<Palette>;
  /** 'dip': the ground dips to the ink at the end and a disc opens the next card; 'hold': the orbit keeps turning */
  exit?: 'dip' | 'hold';
  frame?: number;
};

export const orbitChipsMeta: SceneMeta = {
  id: 'orbit-chips',
  does: 'the line sits on hairline orbits; accent pills fly in and land as partner logo chips that orbit, then the ground dips to dark',
  dur: ORBIT.dur,
  props: ['line', 'chips'],
  handIn: { form: 'word', x: 960 - 444, y: 540 - 43, w: 888, h: 86 },
  handOut: { form: 'card', x: 960 - 400, y: 540 - 340, w: 800, h: 680, r: 64 },
  klass: 'quiet',
  cues: [
    { f: 9, kind: 'whoosh', id: 'chips-fly', weight: 0.7 },
    { f: 11, kind: 'pop', id: 'chips-land-1', weight: 0.7 },
    { f: 22, kind: 'tick', id: 'chips-small', weight: 0.5 },
    { f: 43, kind: 'suck', id: 'chips-dip', weight: 0.6 },
  ],
};

/** 24 fps frames from the scene start (the measured tables' clock). */
const u24 = (t: number) => (t * 24) / 30;

/** The orbit state at scene frame t: ring zoom, orbit angle (deg), the line's scale, the dip 0..1. */
export const orbitState = (t: number, exit: 'dip' | 'hold' = 'dip') => {
  const u = u24(t);
  const zoom = tab(u, ORBIT.zoom.map((k) => [k[0], k[1]] as const));
  const lineS = 1 + (ORBIT.line.from - 1) * Math.exp(-ORBIT.line.k * Math.max(0, u));
  const dip = exit === 'dip' ? E.stdInOut(span(u, ORBIT.dip.from, ORBIT.dip.to)) : 0;
  return { u, zoom, angle: ORBIT.orbit * u, lineS, dip };
};

/** A big chip's phase at 24 fps frame u: 'none' | 'pill' (in flight, progress) | 'tint' | 'white'. */
export const bigChipPhase = (u: number, at: number) => {
  if (u < at) return { phase: 'none' as const, p: 0 };
  if (u < at + 2) return { phase: 'pill' as const, p: (u - at) / 2 };
  if (u < at + 3) return { phase: 'tint' as const, p: 1 };
  return { phase: 'white' as const, p: 1 };
};

const rot = (x: number, y: number, deg: number, k: number) => {
  const a = (deg * Math.PI) / 180;
  const dx = x - 960;
  const dy = y - 540;
  return { x: 960 + (dx * Math.cos(a) - dy * Math.sin(a)) * k, y: 540 + (dx * Math.sin(a) + dy * Math.cos(a)) * k };
};

export const OrbitChips: React.FC<OrbitChipsProps> = ({ line, chips, palette, exit = 'dip', frame }) => {
  const { t, W, H } = useClock(frame);
  const pal = paletteOf({ ground: '#F9F9F9', ink: '#111111', ...palette });
  const O = ORBIT;
  const st = orbitState(t, exit);
  const { u } = st;
  const ground = mixColor(pal.ground, mixColor(pal.ink, '#000000', 0.7), exit === 'dip' ? tab(u - O.dip.from, O.fall.map((k) => [k[0], k[1]] as const)) : 0);
  const ringC = rgba(mixColor(ground, pal.ink, 0.09), 1 - span(u, O.dip.from + 8, O.dip.to));
  const tint = mixColor(pal.accent, pal.ground, 0.45);
  const big = chips.slice(0, 4);
  const small = chips.slice(4, 10);
  const shrinkAt = (i: number) => {
    const k = O.dip.from + O.dip.out[Math.min(O.dip.out.length - 1, i)] + (i >= 4 ? 1 : 0);
    return exit === 'dip' ? 1 - span(u, k, k + 2.5) : 1;
  };
  const stadium = exit === 'dip' ? E.stdInOut(span(u, O.dip.from + 7, O.dip.from + 10)) : 0;
  // the next card: a disc at the centre that grows and opens into a rounded card
  const disc = exit === 'dip' ? E.stdInOut(span(u, O.dip.from + 7, O.dip.from + 8.5)) : 0;
  const card = exit === 'dip' ? bezier(0.3, 0, 0.2, 1)(span(u, O.dip.from + 8.5, O.dip.from + 12)) : 0;
  const lineO = 1 - span(u, O.dip.from + 5, O.dip.from + 8);
  return (
    <Stage1080 W={W} H={H} ground={ground}>
      {O.rings.map((r, i) => {
        const R = r * st.zoom;
        const w = R * 2 * (1 + 1.3 * stadium);
        return <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${960 - w / 2}px, ${540 - R}px)`, width: w, height: R * 2, borderRadius: R, border: `1.5px solid ${ringC}` }} />;
      })}
      {O.dots.flatMap((d, j) =>
        d.phases.map((ph, k) => {
          const R = O.rings[d.ring] * st.zoom;
          const a = ((ph + d.speed * u) * Math.PI) / 180;
          const x = 960 + R * Math.cos(a);
          const y = 540 + R * Math.sin(a);
          const o = 1 - E.buildIn(span(u, O.dip.from, O.dip.from + 6));
          return (
            <div key={`${j}-${k}`} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${x - 19.5}px, ${y - 19.5}px)`, width: 39, height: 39, borderRadius: 20, background: '#FFFFFF', boxShadow: '0 3px 9px rgba(0,0,0,0.06)', opacity: o }}>
              <div style={{ position: 'absolute', left: 16, top: 16, width: 7.5, height: 7.5, borderRadius: 4, background: pal.accent }} />
            </div>
          );
        }),
      )}
      <div
        data-text="scene-line"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 540 - O.line.size * 0.62,
          textAlign: 'center',
          fontFamily: FONT.text,
          fontWeight: 500,
          fontSize: O.line.size,
          letterSpacing: '-0.03em',
          lineHeight: 1.24,
          color: mixColor(pal.ink, ground, 1 - lineO),
          transform: `scale(${st.lineS})`,
          whiteSpace: 'nowrap',
        }}
      >
        {line}
      </div>
      {big.map((c, i) => {
        const B = O.big[i];
        const ph = bigChipPhase(u, B.at);
        if (ph.phase === 'none') return null;
        const k = shrinkAt(i);
        if (k <= 0) return null;
        const slot = rot(B.slot[0], B.slot[1], st.angle - O.orbit * 32, st.zoom);
        // the flight: a slight arc from outside the frame onto the slot
        const p = ph.phase === 'pill' ? ph.p : 1;
        const e = expo(p, 6);
        const bow = Math.sin(Math.PI * p) * 40;
        const x = B.from[0] + (slot.x - B.from[0]) * e + bow;
        const y = B.from[1] + (slot.y - B.from[1]) * e - bow * 0.5;
        const name = c.label ?? logoName(c.logo);
        const wChip = Math.max(348, Math.min(470, 84 + 36 + name.length * 24 + 40));
        const bg = ph.phase === 'pill' ? pal.accent : ph.phase === 'tint' ? tint : rgba('#FFFFFF', 0.96);
        return (
          <div
            key={`b${i}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: wChip,
              height: O.bigChip.h,
              borderRadius: O.bigChip.h / 2,
              background: bg,
              border: ph.phase === 'white' ? '1.5px solid #EFEFEF' : 'none',
              boxShadow: ph.phase === 'white' ? '0 12px 36px rgba(0,0,0,0.05)' : 'none',
              transform: `translate(${x - wChip / 2}px, ${y - O.bigChip.h / 2}px) scale(${k})`,
              display: 'flex',
              alignItems: 'center',
              gap: 22,
              paddingLeft: 27,
              boxSizing: 'border-box',
            }}
          >
            {ph.phase !== 'pill' && (
              <>
                <div style={{ width: O.bigChip.disc, height: O.bigChip.disc, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none', boxShadow: '0 0 0 1.5px #F0F0F0' }}>
                  <BrandLogo logo={c.logo} box={50} />
                </div>
                <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: O.bigChip.name, color: pal.ink, whiteSpace: 'nowrap' }}>{name}</div>
              </>
            )}
          </div>
        );
      })}
      {small.map((c, i) => {
        const S = O.small[i];
        const p = E.snapOut(span(u, S.at, S.at + 3));
        if (p <= 0) return null;
        const k = shrinkAt(4 + i) * (0.6 + 0.4 * p);
        if (k <= 0) return null;
        const pos = rot(S.slot[0], S.slot[1], st.angle - O.orbit * 32, st.zoom);
        const name = c.label ?? logoName(c.logo);
        return (
          <div
            key={`s${i}`}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) scale(${k})`,
              opacity: p,
              height: O.smallChip.h,
              borderRadius: O.smallChip.h / 2,
              background: rgba('#FFFFFF', 0.96),
              border: '1.5px solid #EFEFEF',
              boxShadow: '0 8px 24px rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 30px 0 24px',
              whiteSpace: 'nowrap',
            }}
          >
            <BrandLogo logo={c.logo} box={O.smallChip.mark} />
            <div style={{ fontFamily: FONT.text, fontWeight: 500, fontSize: O.smallChip.name, color: pal.ink }}>{name}</div>
          </div>
        );
      })}
      {disc > 0 && (() => {
        const w = 252 * disc + (O.card.w - 252) * card;
        const h = 252 * disc + (O.card.h - 252) * card;
        const r = Math.min(w, h) / 2 - (Math.min(w, h) / 2 - O.card.r) * card;
        return <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${960 - w / 2}px, ${540 - h / 2}px)`, width: w, height: h, borderRadius: r, background: mixColor(pal.ground, pal.ink, 0.45 - 0.25 * card) }} />;
      })()}
    </Stage1080>
  );
};
