// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// word-build-badge: a short line builds word by word on a clean ground: the first word arrives huge, blurred and in
// the accent and settles to size as it sharpens and cools to ink; each next word cuts on at the line's end, sharp but
// in the accent, cooling to ink in a few frames, while the whole line slides to stay centred; the words part and the
// scene cuts to the lockup: the mark spins in from a quarter turn at twice its size, unrotating and shrinking into
// place as the name slides in beside it from the right, fading up; the lockup tightens, then grows slowly to the end.
// Numbers (frames at 30 fps, px at 1080; measured at 60 fps): word 1 at x2.77, blur 10.7 px, scale 1 + 1.77 e^(-t/4.5),
// sharp by 16 f; words 12.5 f apart, accent for 1.5 f then ink in 6 f; the line's re-centre halves its gap every 3 f;
// the parting 7 f (13 px/f out, the middle x0.87); the mark from x2.16 and +84 deg, upright and home in ~27 f on the
// measured tables; the name +183 px right at 22 % from 13 f, home and full by 27 f; then x1.054 linear growth.
import React, { useMemo } from 'react';
import { type Logo, LogoMark, logoParts, SAMPLE_MARK_SVG } from '../brand/Mark';
import { C, FONT } from '../brand/tokens';
import { SpinBlur } from '../fx/Defocus';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { baselineOf, measureTracked } from '../lib/measure';
import { markBox, type Palette, paletteOf, perFrame, type SceneMeta, span, tab, useClock } from './parts';

export type WordBuildBadgeProps = {
  /** the line built word by word (2-4 words; empty: the lockup alone) */
  line?: string;
  /** the product's name beside the mark */
  name: string;
  logo?: Logo;
  palette?: Partial<Palette>;
  frame?: number;
};

export const BUILD = { every: 12.5, part: 5, partDur: 7, lockup: 37, size: 80 } as const;
const BLUR1: [number, number][] = [[0, 10.7], [2, 8.1], [4, 6.1], [6, 4.5], [8, 3.2], [10, 2.4], [12, 1.9], [14, 1], [16.5, 0]];
// the mark's spin-in at 60 fps from its first frame: rotation (deg), diameter (px), centre x offset from rest (px)
const ROT = perFrame(0, [84, 72, 66, 60, 56, 52, 48, 44, 42, 38, 36, 34, 32, 30, 28, 26, 24, 24, 22, 20, 20, 18, 16, 16, 14, 14, 12, 12, 10]).concat([[40, 0]]);
const DIAM = perFrame(0, [332, 300, 284, 272, 262, 254, 247, 241, 235, 229, 224, 220, 215, 212, 208, 204, 201, 198, 195, 193, 189, 187, 185, 183, 181, 178, 177, 175, 174, 172, 171, 169, 168, 166]).concat([[54, 154]]);
const CX = perFrame(0, [939, 912, 896, 883, 872, 863, 854.5, 847.5, 840.5, 834.5, 828, 823, 817.5, 813, 808, 804, 799.5, 796, 792.5, 788.5, 785.5, 782.5, 779.5, 776.5, 773.5, 771, 768.5, 766.5, 764, 762, 759.5, 757.5, 756, 754]).concat([[54, 733]]);
const NAME_X = perFrame(26, [1024, 1011, 998, 986, 974, 963, 953, 944, 936, 928, 920, 913, 907, 900, 895, 889, 884, 879, 875, 870, 866, 863, 859, 856, 852, 849, 847, 844, 841]);

export const wordBuildBadgeDur = (line?: string) => {
  const n = line ? line.split(' ').length : 0;
  return n ? Math.ceil((n - 1) * BUILD.every + BUILD.part + BUILD.partDur) + 45 : 45;
};

export const WordBuildBadge: React.FC<WordBuildBadgeProps> = ({ line, name, logo, palette, frame }) => {
  const { t, W, H, u } = useClock(frame);
  const P = paletteOf(palette);
  // no logo given: the starter's placeholder mark painted in this palette, never in the starter's own accent
  const lg = useMemo(() => logo ?? logoParts(SAMPLE_MARK_SVG.split(C.accent).join(P.accent).split(C.ink).join(P.ink)), [logo, P.accent, P.ink]);
  const cx = W / 2;
  const cy = H / 2;
  const words = line ? line.split(' ') : [];
  const n = words.length;
  const cut = n ? (n - 1) * BUILD.every + BUILD.part + BUILD.partDur : 0;
  const ink = mixColor(P.ink, P.ground, 0.1);
  if (n && t < cut) {
    const size = BUILD.size * u;
    const space = measureTracked(' ', size, 450, -0.006);
    const ws = words.map((w) => measureTracked(w, size, 450, -0.006));
    const on = (i: number) => i * BUILD.every;
    // the line's left edge: each arrival re-targets it; the gap halves every 3 f (expo, tau 4.33 f)
    const widthTo = (k: number) => ws.slice(0, k + 1).reduce((a, b) => a + b, 0) + k * space;
    let left = cx - ws[0] / 2;
    for (let k = 1; k < n && t >= on(k); k++) {
      const target = cx - widthTo(k) / 2;
      const nextOn = k + 1 < n ? on(k + 1) : Infinity;
      const tt = Math.min(t, nextOn) - on(k);
      left = target + (left - target) * Math.exp(-tt / 4.33);
    }
    const tp = t - ((n - 1) * BUILD.every + BUILD.part); // the parting
    const base = baselineOf(size, 450, 1);
    let x = left;
    return (
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground }}>
        {words.map((w, i) => {
          const wx = x;
          x += ws[i] + space;
          if (t < on(i)) return null;
          const tw = t - on(i);
          const first = i === 0;
          const scale = first ? 1 + 1.77 * Math.exp(-tw / 4.5) : 1;
          const blur = first ? tab(tw, BLUR1) : 1 - E.snapOut(clamp(tw / 3));
          const col = first ? mixColor(P.accent, ink, E.strongInOut(span(tw, 8, 22))) : mixColor(mixColor(P.accent, P.ink, 0.25), ink, span(tw, 1.5, 7.5));
          let dx = 0;
          let s2 = 1;
          if (tp > 0) {
            if (i === 0) dx = -13.2 * tp * u;
            else if (i === n - 1) dx = 15 * tp * u;
            else s2 = 1 - 0.13 * (tp / BUILD.partDur);
          }
          const smear = tp > 0 && (i === 0 || i === n - 1) ? 2.5 * u : 0;
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${ws[i] / 2}px ${base - 0.36 * size}px`, transform: `translate(${(wx + dx).toFixed(2)}px, ${(cy + 0.36 * size - base).toFixed(2)}px) scale(${(scale * s2).toFixed(4)})`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size, fontWeight: 450, letterSpacing: '-0.006em', lineHeight: 1, color: col, filter: blur + smear > 0.05 ? `blur(${((blur * u) + smear).toFixed(2)}px)` : undefined }}>
              {w}
            </div>
          );
        })}
      </div>
    );
  }
  // ---- the lockup
  const t60 = (t - cut) * 2;
  const d = tab(t60, DIAM) * u;
  const rot = tab(t60, ROT);
  const omega = (tab(t60 + 1, ROT) - tab(t60 - 1, ROT)) / 2 * 2; // deg per 30 fps frame
  const restD = 154 * u;
  const mb0 = markBox(lg, 100);
  const sizeRest = (restD * 100) / Math.max(mb0.w, mb0.h);
  const size = (sizeRest * d) / restD;
  const mb = markBox(lg, size);
  const font = 120 * u;
  const nameW = measureTracked(name, font, 600, -0.015);
  const gap = 31 * u * (1 - 0.65 * E.stdInOut(span(t60, 54, 74))); // the lockup tightens
  const total = restD + gap + nameW;
  const grow = 1 + 0.054 * Math.max(0, t60 - 74) / 105; // lint-ok: constant ambient drift under the held lockup
  const restCx = cx - total / 2 + restD / 2;
  const bcx = restCx + (tab(t60, CX) - 733) * u;
  const nameLeft = cx - total / 2 + restD + gap + (tab(t60, NAME_X) - 841) * u;
  const nameA = t60 < 26 ? 0 : 0.22 + 0.78 * E.glideOut(span(t60, 26, 44));
  const base = baselineOf(font, 600, 1);
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: P.ground }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${cx}px ${cy}px`, transform: `scale(${grow.toFixed(5)})` }}>
        <SpinBlur omega={omega} cx={bcx} cy={cy}>
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${mb.x + mb.w / 2}px ${mb.y + mb.h / 2}px`, transform: `translate(${(bcx - mb.x - mb.w / 2).toFixed(2)}px, ${(cy - mb.y - mb.h / 2).toFixed(2)}px) rotate(${rot.toFixed(3)}deg)` }}>
            <LogoMark logo={lg} size={size} />
          </div>
        </SpinBlur>
        {nameA > 0 ? (
          <div style={{ position: 'absolute', left: 0, top: 0, opacity: nameA, transform: `translate(${nameLeft.toFixed(2)}px, ${(cy + 0.36 * font - base).toFixed(2)}px)`, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: font, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1, color: P.ink }}>
            {name}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const wordBuildBadgeMeta: SceneMeta = {
  id: 'word-build-badge',
  does: 'a line builds word by word (the first huge, blurred, in the accent), parts, and the mark spins into the lockup',
  dur: wordBuildBadgeDur('Still wondering why'),
  props: ['line?', 'name', 'logo?', 'palette?'],
  handIn: { form: 'word', x: 960 - 160, y: 471, w: 320, h: 151 },
  handOut: { form: 'mark', x: 960 - 330, y: 450, w: 660, h: 163 },
  klass: 'quiet',
  cues: [
    { f: 0, kind: 'swell', id: 'word-1', weight: 0.6 },
    { f: 12.5, kind: 'tick', id: 'word-2', weight: 0.4 },
    { f: 25, kind: 'tick', id: 'word-3', weight: 0.4 },
    { f: 37, kind: 'whoosh', id: 'spin-in', weight: 0.7 },
    { f: 50, kind: 'land', id: 'name', weight: 0.6 },
  ],
};
