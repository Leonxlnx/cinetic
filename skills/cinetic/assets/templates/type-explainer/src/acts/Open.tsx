import React from 'react';
import { AbsoluteFill } from 'remotion';
import { TYPE, typeStyle, U } from '../brand/tokens';
import { bandFill, clipText } from '../fx/HueSweep';
import { StatementLine } from '../fx/TypeStack';
import { exitDistanceEm, settleLeft, Words } from '../fx/Words';
import { clamp, E, lmix, mix, prog } from '../lib/anim';
import { camera } from '../lib/camera';
import { creep } from '../lib/handoff';
import { fitSize, measureTracked } from '../lib/measure';
import { DEAL } from '../deal';
import { ACT, copy, CUE, f60x, FPS, H, speechStarts, W } from '../timeline';
import { ActGround, Cam, capOf, EMPH, keysFor, MarkWord, PAGE, sentenceSize, sentenceStyle, useAbs, useCrisp } from './stage';

// OPEN - two shots: the name, then what the product is. The name shot is the dealt device (src/deal.ts):
//   band   the name drops in as one giant word (whole inside the safe area: up to 500 px, a 50 px drop) while a band
//          of the accent runs through it and leaves it in ink; as the mark arrives as the next word the camera pulls
//          back to three quarters (30 f, E.glideOut: type changes size through the camera, never by a snap), then
//          the pair accelerates left into a cut at speed
//   push   the name and its mark set as one display line on the crisp entry; the camera pushes through it onto the
//          mark (E.launchIn) and the cut takes the push at speed, the next shot settling out of it
//   focus  the name cuts in at x1.35 and lands (E.glideOut, 36 f), a slight defocus riding the scale that clears
//          in 8 f, so it is solid ink almost at once; the mark slides out from behind it as the next word while the
//          name makes room; the pair accelerates left into the cut
// What it is is the voice slot's device (src/deal.ts):
//   said   word by word at the pace of speech on the crisp entry (uneven onsets, each word rising and sharpening,
//          landing a little right of its slot and settling home while the line drifts left)
//   mask   each word rises out of a mask on its baseline and stops dead, mute to ink as it rises (TypeLine mask)
//   build  built word by word on the beat (14, 10, 10 f apart, a breath before the last word), each word cut on
//          solid in a tint of the accent, walking to the accent and darkening to ink while the line re-centres
// The camera eases in once it is whole; it leaves right as one at full ink, accelerating into the cut.

/** The giant name's size: the giant role's look at up to 500 px, fitted to 78 % of the width (whole in the safe area). */
const giantSize = (text: string) => Math.min(500 * U, fitSize(text, W * 0.78, 500 * U, TYPE.giant.weight, TYPE.giant.track));
/** The band device's pull-back as the mark arrives, and its drop (px at 1080p). */
export const RESET = 0.75;
const DROP = 50;

const nameWidth = (text: string, role: 'giant' | 'display', px: number) => measureTracked(text, px, TYPE[role].weight, TYPE[role].track, undefined, { trailing: false });

/** The name shot of the band device: the giant word, the band, the camera pulling back as the mark arrives. */
const Band: React.FC<{ F: number }> = ({ F }) => {
  const name = copy('name');
  const g0 = giantSize(name.text);
  const wName = nameWidth(name.text, 'giant', g0);
  const markH = capOf(g0) * 1.3;
  const gap = capOf(g0) * 0.3;
  const nx0 = (W - wName) / 2;
  const mx = nx0 + wName + gap + markH / 2;
  const drop = -DROP * U * settleLeft(F - CUE.giant, f60x(24));
  // the band runs through the word until the mark arrives, then its tail sweeps the word back to ink
  const run = prog(F, CUE.giant, CUE.mark, E.linear);
  const fin = prog(F, CUE.mark, CUE.mark + f60x(24), E.glideOut);
  const fill = bandFill({ tail: wName * (mix(0.11, 0.53, run) + 0.62 * fin), head: wName * (mix(0.5, 1.02, run) + 0.3 * fin), edge: 120 * U, ink: PAGE.text, band: PAGE.accent });
  // the camera: on the name, then pulling back onto the pair as the mark arrives; the pair accelerates left into the cut
  const gl = prog(F, CUE.mark, CUE.mark + f60x(30), E.glideOut);
  const k = lmix(1, RESET, gl);
  const dist = exitDistanceEm('launch', E.launchIn, CUE.what - CUE.glide, g0 * RESET, U) * g0 * RESET;
  const away = -dist * prog(F, CUE.glide, CUE.what, E.launchIn);
  const ax = mix(W / 2, (nx0 + mx + markH / 2) / 2, gl);
  const pop = prog(F, CUE.mark, CUE.mark + f60x(14), E.snapOut);
  return (
    <div style={{ ...camera({ ax, ay: H / 2, sx: W / 2 + away, sy: H / 2 + drop, k }), width: W, height: H }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${nx0.toFixed(2)}px, ${(H / 2 - g0 * 0.56).toFixed(2)}px, 0)` }}>
        <span data-text="name" style={{ ...typeStyle('giant', g0), lineHeight: 1, ...clipText(fill) }}>
          {name.text}
        </span>
      </div>
      {F >= CUE.mark && <MarkWord x={mx} y={H / 2 - capOf(g0) * 0.08} size={markH} s={mix(0.6, 1, pop)} o={clamp(pop * 3)} />}
    </div>
  );
};

/** The name shot of the push device: the name and its mark as one line, the camera pushing through onto the mark. */
const Push: React.FC<{ F: number }> = ({ F }) => {
  const crisp = useCrisp();
  const name = copy('name');
  const size = TYPE.display.size * U;
  const wName = nameWidth(name.text, 'display', size);
  const markH = capOf(size) * 1.3;
  const gap = capOf(size) * 0.34;
  const x0 = (W - (wName + gap + markH)) / 2;
  const mx = x0 + wName + gap + markH / 2;
  const enter = prog(F, CUE.mark, CUE.mark + f60x(26), E.glideOut);
  // a slow creep while the name and its mark arrive (the hold never freezes), then the push: 1 -> 2.4 onto the
  // mark, accelerating into the cut; the next shot carries the push on and settles out of it
  const k = lmix(1, 1.05, prog(F, CUE.giant, CUE.glide, E.linear)) * lmix(1, 2.4, prog(F, CUE.glide - f60x(8), CUE.what, E.launchIn));
  return (
    <div style={{ ...camera({ ax: mx, ay: H / 2, sx: mx, sy: H / 2, k }), width: W, height: H }}>
      <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x0.toFixed(2)}px, ${(H / 2 - size * 0.56).toFixed(2)}px, 0)` }}>
        <Words id="name" text={name.text} frame={F} start={CUE.giant} {...crisp} size={size} style={{ ...typeStyle('display', size), lineHeight: 1 }} />
      </div>
      {F >= CUE.mark && <MarkWord x={mx} y={H / 2 - capOf(size) * 0.2 + (1 - enter) * 0.32 * size} size={markH} o={clamp(enter * 2.5)} blur={8 * U * (1 - clamp(enter / 0.6))} />}
    </div>
  );
};

/** The name shot of the focus device: oversized and defocused, settling; the mark sliding out from behind it. */
const Focus: React.FC<{ F: number }> = ({ F }) => {
  const name = copy('name');
  const size = TYPE.display.size * U * 1.3;
  const wName = nameWidth(name.text, 'display', size);
  const markH = capOf(size) * 1.3;
  const gap = capOf(size) * 0.3;
  const settle = prog(F, CUE.giant, CUE.giant + f60x(36), E.glideOut);
  const s = lmix(1.35, 1, settle);
  const blur = 6 * U * (1 - prog(F, CUE.giant, CUE.giant + f60x(8), E.snapOut)); // crisp within 8 f: the scale is the move
  // the name makes room as the mark slides out from behind it; the pair accelerates left into the cut
  const room = prog(F, CUE.mark, CUE.mark + f60x(30), E.glideOut);
  const dist = exitDistanceEm('launch', E.launchIn, CUE.what - CUE.glide, size, U) * size;
  const away = -dist * prog(F, CUE.glide, CUE.what, E.launchIn);
  const nx = (W - wName) / 2 - ((gap + markH) / 2) * room + away;
  const markX = nx + wName - markH / 2 + (gap + markH) * room;
  return (
    <>
      {F >= CUE.mark && (
        <div style={{ position: 'absolute', inset: 0, clipPath: `inset(0 0 0 ${(nx + wName).toFixed(2)}px)` }}>
          <MarkWord x={markX} y={H / 2 - capOf(size) * 0.1} size={markH} />
        </div>
      )}
      <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: `${(nx + wName / 2).toFixed(2)}px ${(H / 2).toFixed(2)}px`, transform: `translate3d(${nx.toFixed(2)}px, ${(H / 2 - size * 0.56).toFixed(2)}px, 0) scale(${s.toFixed(5)})` }}>
        {/* focus-in: the name's arrival is the device */}
        <span data-text="name" style={{ ...typeStyle('display', size), lineHeight: 1, display: 'inline-block', filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : undefined }}>
          {name.text}
        </span>
      </div>
    </>
  );
};

export const Open: React.FC = () => {
  const F = useAbs('open');
  const crisp = useCrisp();
  const what = copy('what');
  const cut = ACT.pain.from;
  const size = sentenceSize(what.text);
  const n = what.text.trim().split(/\s+/).length;
  const starts = speechStarts(what.in - 1, n); // the first word shows on the cut frame itself
  const build = starts[n - 1] - starts[0];
  // the build drifts left as it lands, then the hold keeps drifting at 30 px/s (a read never freezes)
  const drift = 55 * U * settleLeft(F - what.in, build + f60x(28)) - (0.5 * U * Math.max(0, F - what.resolved) * 60) / FPS;
  // the what shot opens out of the name shot's move: the push carried on and settling (push), or still gliding left (band, focus)
  const carry = DEAL.open === 'push' ? lmix(1, 1.08, prog(F, what.in - 1, what.in + f60x(30), E.glideOut)) : 1;
  // still gliding left out of the band and the focus (a set line, whose words rise in place, carries more of it)
  const slide = DEAL.open === 'push' ? 0 : (DEAL.voice === 'said' ? 70 : 150) * U * settleLeft(F - what.in, f60x(20));
  const k = carry * creep(F, CUE.what, { pctPerSec: 0.012 }, FPS) * (1 + 0.2 * prog(F, CUE.whatPush, CUE.exitWhat + f60x(20), E.stdInOut));
  const Name = DEAL.open === 'push' ? Push : DEAL.open === 'focus' ? Focus : Band;
  // the line leaves as one at full ink, whatever its voice: the container accelerates right into the cut (E.launchIn),
  // its fastest frame on the cut, never a fade (word by word, a said line's last words would leave the cut slow)
  const od = Math.max(f60x(16), cut - what.out);
  const dist = exitDistanceEm('launch', E.launchIn, od, size, U) * size;
  const away = dist * prog(F, cut - od, cut, E.launchIn);
  if (DEAL.voice !== 'said') {
    return (
      <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
        <ActGround F={F} act="open" />
        {F < CUE.what && <Name F={F} />}
        {F >= what.in - 1 && (
          <Cam k={k}>
            <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(drift + slide + away).toFixed(2)}px, 0, 0)` }}>
              <StatementLine spec={{ preset: DEAL.voice, text: what.text, at: what.in - 1, colors: { ink: PAGE.text, accent: PAGE.accent, mute: PAGE.mute }, id: 'what', emph: EMPH.what, keys: keysFor('what', what.text) }} frame={F} size={size} y={H / 2} />
            </div>
          </Cam>
        )}
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: PAGE.ground, overflow: 'hidden' }}>
      <ActGround F={F} act="open" />
      {F < CUE.what && <Name F={F} />}
      {F >= what.in - 1 && (
        <Cam k={k}>
          <div style={{ position: 'absolute', left: 0, top: H / 2 - (size * 1.2) / 2, width: W, display: 'flex', justifyContent: 'center', transform: `translate3d(${(drift + slide + away).toFixed(2)}px, 0, 0)` }}>
            <Words id="what" text={what.text} frame={F} start={what.in - 1} {...crisp} starts={starts} size={size} arriveX={0.3} style={sentenceStyle(size)} />
          </div>
        </Cam>
      )}
    </AbsoluteFill>
  );
};
