// The line: one sentence, centred in the middle band, in the film's one voice (deal.ts voice), the key word in the
// accent ink. Its text sits on its own composited layer while it is sharp (layer.tsx usePromote), so the camera float
// and the line's slow creep move it sub-pixel; the blur voice's soft start goes through layer.tsx Soft (fixed levels).
import React from 'react';
import { FONT, TYPE, U } from '../brand/tokens';
import type { FamilyInks } from '../fx/Grounds';
import { arrive, clamp, E, mix } from '../lib/anim';
import { mixColor } from '../lib/color';
import { fitSize, measureTracked } from '../lib/measure';
import { DEAL } from '../deal';
import { copy, FPS, H, keyWords, VOICE, W } from '../timeline';
import { Soft, usePromote } from './layer';

/** A statement's size (px): a cap of about 7 % of the frame height, one line at most 58.5 % of the width (84 % for a long one; the read's creep
 * grows it a few percent, under the 61 % line), never a cap under 5 %. */
export const LINE_TYPE = { weight: TYPE.display.weight, track: TYPE.display.track, cap: 0.727 } as const;
export const lineSize = (text: string) => {
  const max = (0.07 * H) / LINE_TYPE.cap;
  const min = (0.052 * H) / LINE_TYPE.cap;
  const fit = fitSize(text, W * 0.585, max, LINE_TYPE.weight, LINE_TYPE.track);
  if (fit >= min) return fit;
  return Math.min(min, fitSize(text, W * 0.84, max, LINE_TYPE.weight, LINE_TYPE.track));
};

/** The life of a line while it is read: a slow push (scale per second about its centre) and a sideways drift (px at
 * 1080p per second, centred on the read so the line stays centred; odd lines drift right, even ones left). */
export const LINE_CREEP = 0.015;
export const LINE_DRIFT = 18;

/** Text set on its own composited layer while its layer is sharp (sub-pixel moves, no whole-pixel ticks). */
export const Text: React.FC<{ id?: string; x: number; y: number; style: React.CSSProperties; children: React.ReactNode; width?: number }> = ({ id, x, y, style, children, width }) => {
  const promote = usePromote();
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, whiteSpace: 'pre', transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined, ...style }}>
      <span data-text={id} style={{ display: 'inline-block' }}>
        {children}
      </span>
    </div>
  );
};

/** One line in the film's one voice, centred on (W/2, cy). The key word (stars in launch.ts) takes the accent ink. */
export const Line: React.FC<{ id: string; raw: string; F: number; inks: FamilyInks; cy?: number }> = ({ id, raw, F, inks, cy = H / 2 }) => {
  const c = copy(id);
  const words = keyWords(raw);
  const text = words.map((w) => w.word).join(' ');
  const size = lineSize(text);
  const m = (s: string) => measureTracked(s, size, LINE_TYPE.weight, LINE_TYPE.track, FONT.text, { trailing: false });
  // the words' widths drive only the re-centre; the line itself is laid out by the browser, centred, in one flow
  const ends = words.map((_, i) => m(words.slice(0, i + 1).map((w) => w.word).join(' ')));
  const t = F - c.in;
  const k = FPS / 60;
  const voice = DEAL.voice;
  let offset = 0;
  if (voice === 'build') {
    // re-centre: each new word pushes the line half its width left, settling on a glide (24 f)
    for (let i = 1; i < words.length; i++) offset += ((ends[i] - ends[i - 1]) / 2) * (1 - E.glideOut(clamp((t - i * VOICE.build.stagger * k) / (VOICE.build.recentre * k))));
  }
  // the blur voice: the whole line out of a 12 px blur, gone by 60 % of its settle (still moving), settling from 104 %
  // the blur voice settles on a glide (its blur gone early, while it still moves)
  const whole = voice === 'blur' ? E.glideOut(clamp(t / (VOICE.blur.dur * k))) : 1;
  const sigma = voice === 'blur' ? VOICE.blur.blur * clamp(1 - whole / 0.6) : 0;
  const push = (voice === 'blur' ? mix(VOICE.blur.from, 1, whole) : 1) * (1 + LINE_CREEP * Math.max(0, t) / FPS);
  const top = cy - size * 0.56;
  const odd = Number(id.replace(/\D/g, '')) % 2 === 1;
  const drift = (odd ? 1 : -1) * LINE_DRIFT * U * ((F - (c.in + c.out) / 2) / FPS);
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: voice === 'blur' ? clamp(whole / 0.35) : 1, transformOrigin: `${W / 2}px ${cy}px`, transform: `scale(${push.toFixed(5)})` }}>
      <Soft sigma={sigma}>
        <Text id={id} x={offset + drift} y={top} width={W} style={{ textAlign: 'center', fontFamily: FONT.text, fontSize: size, fontWeight: LINE_TYPE.weight, letterSpacing: `${LINE_TYPE.track}em`, lineHeight: 1.12 }}>
          {words.map((w, i) => {
            const s = i * (voice === 'build' ? VOICE.build.stagger : VOICE.ink.stagger) * k;
            const p = clamp((t - s) / ((voice === 'build' ? VOICE.build.fade : VOICE.ink.fade) * k));
            const a = voice === 'blur' ? 1 : E.snapOut(p);
            const inked = voice === 'ink' ? E.softOut(clamp((t - s) / (VOICE.ink.ink * k))) : 1;
            const col = w.key ? inks.accent : inks.type;
            const color = voice === 'ink' ? mixColor(mixColor(inks.type, inks.ground, 0.72), col, inked) : col;
            // the build's rise (and the ink voice's small one) ends while the word still travels (arrive): no settling tail
            const rise = voice === 'build' ? (1 - arrive(E.glideOut(p))) * 0.12 * size : voice === 'ink' ? (1 - arrive(E.glideOut(clamp((t - s) / (26 * k))))) * 0.06 * size : 0;
            return (
              <React.Fragment key={i}>
                {i > 0 ? ' ' : ''}
                <span style={{ display: 'inline-block', color, opacity: a, transform: `translate3d(0px, ${rise.toFixed(3)}px, 0)` }}>{w.word}</span>
              </React.Fragment>
            );
          })}
        </Text>
      </Soft>
    </div>
  );
};
