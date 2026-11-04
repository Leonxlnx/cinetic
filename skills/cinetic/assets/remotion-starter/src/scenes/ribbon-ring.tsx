// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// ribbon-ring: white on white. A ring of ~110 pleated paper fins stands round the centre like a ribbon bent into a
// circle, seen from a little above, the shading (soft grey occlusion between the fins) the whole look; it fades in
// around the line while its first words cut on one by one in the clean hole, the line re-centring with a short slide
// each time. The camera rises, faster and faster; on the second phrase it whips up to a steep view where the fins read
// as a sunflower of hairline rays round the words, and the ring fades away on an exponential, leaving the line on
// white. 1.9 s. Quiet (no colour: the light is the event).
//
// Numbers (frames at 30 fps, px at 1080): fins 300 long (radial) x 160 tall, top corners rounded, standing on a circle of
// inner radius 560 (110 of them, 32 px apart at the inner edge), perspective 1500, the ring's centre 100 px in front of
// the focal plane; the eye 22 deg above the ring rising to 44 by f30 (most of it in the last third), then whipping in two
// frames to straight down, where the fins read as a sunflower of tapered rays (radius 440-720, leaning 6 deg, 4 -> 17 px
// wide) backing off 5 %; the ring reaches full strength in 4 f and fades on an exponential from f30 (time constant 7 f) to a 4 %
// trace. Lit faces the paper, shaded faces 14 % toward the ink, contact shade at the base. The line: cap 57 px,
// centred; words of the first phrase cut on over f1-19 (gaps shrinking), the second phrase at f30 and f39; each word
// re-centres the line with a 20 px slide that is gone in 4 f; the line drifts 36 px left into the whip.
import React from 'react';
import { FONT } from '../brand/tokens';
import { clamp } from '../lib/anim';
import { mixColor } from '../lib/color';
import { paletteOf, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { rgba, Stage1080 } from './stage1080';

export type RibbonRingProps = {
  /** the first phrase, typed word by word in the ring's hole (2-5 words), and the phrase the whip lands on (1-3 words) */
  first: string;
  second: string;
  /** a word of the second phrase set in the accent (default none: the scene is ink on paper) */
  accent?: string;
  /** ground: the world; paper: the fins' lit faces; ink: the line and the fins' shade */
  palette?: Partial<Palette>;
  frame?: number;
};

export const RIBBON_RING = {
  dur: 56,
  fins: 110,
  inner: 560,
  len: 300,
  height: 160,
  persp: 1500,
  depth: -100, // the ring's centre in front of the focal plane (px)
  // the eye's angle above the ring (deg) by frame: a rise that speeds up, the whip at f30
  rise: [[0, 22], [5, 25], [12.5, 28], [22.5, 33], [27.5, 40], [30, 44], [31.5, 80]] as const,
  // from straight above (after the whip) the fins read as a sunflower of tapered rays, drawn flat: inner and outer radius
  // on screen, the rays' lean, their width at each end; the ring backs off 5 % while it fades
  above: { at: 31.5, inner: 440, outer: 720, lean: 6, w0: 4, w1: 17, back: 0.05 },
  fadeIn: 4,
  fade: { at: 30, tau: 7, floor: 0.04 },
  cap: 57,
  first: { from: 1, to: 19 },
  second: { from: 30, to: 39 },
  slide: { px: 20, tau: 0.9 },
  drift: { from: 27.5, to: 30, px: 36 },
} as const;

/** The onsets of n words spread over [a, b], the gaps shrinking (a phrase that gathers pace). */
export const ribbonOnsets = (n: number, a: number, b: number) => Array.from({ length: n }, (_, i) => (n <= 1 ? a : a + (b - a) * (1 - Math.pow(1 - i / (n - 1), 1.25))));

/** The ring's strength (0..1) at frame t: in over 4 f, then the exponential fade after the whip. */
export const ribbonStrength = (t: number) => {
  const R = RIBBON_RING;
  const inn = clamp(t / R.fadeIn);
  if (t <= R.fade.at) return inn * inn * (3 - 2 * inn);
  return R.fade.floor + (1 - R.fade.floor) * Math.exp(-(t - R.fade.at) / R.fade.tau);
};

export const RibbonRing: React.FC<RibbonRingProps> = ({ first, second, accent, palette, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf(palette);
  const R = RIBBON_RING;
  const phi = tab(t, R.rise);
  const T = R.depth;
  const overhead = t >= R.above.at;
  const strength = ribbonStrength(t);
  const rad = (phi * Math.PI) / 180;
  // the eye in the ring's own frame (y up, z toward the viewer), for which face of each fin it sees
  const dist = R.persp + T;
  const eye = { y: dist * Math.sin(rad), z: dist * Math.cos(rad) };
  const light = (() => {
    const v = [-0.5, 0.8, 0.45];
    const m = Math.hypot(v[0], v[1], v[2]);
    return v.map((c) => c / m);
  })();
  const rc = R.inner + R.len / 2;
  const shade = mixColor(P.paper, P.ink, 0.14);
  const fins = Array.from({ length: R.fins }, (_, i) => {
    const d = (i / R.fins) * 360;
    const a = (d * Math.PI) / 180;
    // the fin's normal and its centre; the face the eye sees, lit by a soft key from the upper left
    const n = [-Math.sin(a), 0, Math.cos(a)];
    const c = [rc * Math.cos(a), R.height / 2, rc * Math.sin(a)];
    const toEye = [-c[0], eye.y - c[1], eye.z - c[2]];
    const s = n[0] * toEye[0] + n[2] * toEye[2] >= 0 ? 1 : -1;
    const lit = Math.max(0, s * (n[0] * light[0] + n[2] * light[2]));
    const pleat = i % 2 === 0 ? 0 : 0.18; // every other fin turned a little from the light: the fold
    const k = clamp(0.25 + 0.75 * lit - pleat, 0, 1);
    const face = mixColor(shade, P.paper, k);
    const inner = mixColor(shade, P.paper, k * 0.55);
    return (
      <div
        key={i}
        style={{
          position: 'absolute',
          left: -R.len / 2,
          top: -R.height,
          width: R.len,
          height: R.height,
          borderRadius: `${R.height * 0.42}px ${R.height * 0.42}px 0 0`,
          background: `linear-gradient(to top, ${rgba(P.ink, 0.07)} 0%, ${rgba(P.ink, 0)} 42%), linear-gradient(to right, ${inner} 0%, ${face} 55%, ${face} 100%)`,
          transform: `rotateY(${(-d).toFixed(3)}deg) translateX(${rc}px)`,
        }}
      />
    );
  });
  // the line: the first phrase word by word, the second at the whip; a short slide re-centres it on each word
  const w1 = first.trim().split(/\s+/).slice(0, 5);
  const w2 = second.trim().split(/\s+/).slice(0, 3);
  const on1 = ribbonOnsets(w1.length, R.first.from, R.first.to);
  const on2 = ribbonOnsets(w2.length, R.second.from, R.second.to);
  const inSecond = t >= R.second.from;
  const words = inSecond ? w2.filter((_, i) => t >= on2[i]) : w1.filter((_, i) => t >= on1[i]);
  const onsets = inSecond ? on2 : on1;
  const lastOn = onsets.filter((o) => t >= o).pop() ?? onsets[0];
  const slide = words.length ? R.slide.px * Math.exp(-(t - lastOn) / R.slide.tau) : 0;
  const drift = inSecond ? 0 : -R.drift.px * Math.pow(span(t, R.drift.from, R.drift.to), 2);
  const size = R.cap / 0.727;
  return (
    <Stage1080 W={W} H={H} ground={P.ground}>
      {strength > 0.002 && !overhead ? (
        <div style={{ position: 'absolute', inset: 0, perspective: `${R.persp}px`, perspectiveOrigin: '960px 540px', opacity: strength }}>
          <div
            style={{
              position: 'absolute',
              left: 960,
              top: 540,
              width: 0,
              height: 0,
              transformStyle: 'preserve-3d',
              transform: `translateZ(${(-T).toFixed(2)}px) rotateX(${(-phi).toFixed(3)}deg)`,
            }}
          >
            {fins}
          </div>
        </div>
      ) : null}
      {strength > 0.002 && overhead
        ? (() => {
            const A = R.above;
            const k = 1 - A.back * span(t, A.at, R.dur);
            const r0 = A.inner * k;
            const r1 = A.outer * k;
            const ray = (i: number) => {
              const a0 = (i / R.fins) * Math.PI * 2;
              const a1 = a0 + (A.lean * Math.PI) / 180;
              const p = (r: number, a: number, w: number) => [960 + r * Math.cos(a) - w * Math.sin(a), 540 + r * Math.sin(a) + w * Math.cos(a)];
              const q = [p(r0, a0, -A.w0 / 2), p(r1, a1, -A.w1 / 2), p(r1 + A.w1 * 0.6, a1, 0), p(r1, a1, A.w1 / 2), p(r0, a0, A.w0 / 2)];
              return `M${q.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}Z`;
            };
            const even = Array.from({ length: R.fins }, (_, i) => i).filter((i) => i % 2 === 0).map(ray).join('');
            const odd = Array.from({ length: R.fins }, (_, i) => i).filter((i) => i % 2 === 1).map(ray).join('');
            return (
              <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, opacity: strength }}>
                <path d={even} fill={mixColor(P.paper, P.ink, 0.22)} />
                <path d={odd} fill={mixColor(P.paper, P.ink, 0.15)} />
              </svg>
            );
          })()
        : null}
      {words.length ? (
        <div
          data-text="scene-line"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 1920,
            textAlign: 'center',
            whiteSpace: 'pre',
            fontFamily: FONT.text,
            fontWeight: 450,
            fontSize: size,
            letterSpacing: '-0.012em',
            lineHeight: 1.2,
            color: P.ink,
            transform: `translate(${(slide + drift).toFixed(2)}px, ${(540 - size * 0.62).toFixed(2)}px)`,
          }}
        >
          {words.map((w, i) => (
            <React.Fragment key={i}>
              {i ? ' ' : ''}
              <span style={inSecond && accent && w === accent ? { color: P.accent } : undefined}>{w}</span>
            </React.Fragment>
          ))}
        </div>
      ) : null}
    </Stage1080>
  );
};

export const ribbonRingMeta: SceneMeta = {
  id: 'ribbon-ring',
  does: 'a white pleated ribbon ring seen from above; its words cut on in the hole, the camera rises and whips up to a sunflower of rays that fades',
  dur: RIBBON_RING.dur,
  props: ['first', 'second', 'accent?', 'palette?'],
  handIn: null,
  handOut: { form: 'word', x: 683, y: 504, w: 553, h: 72 },
  klass: 'quiet',
  cues: [
    { f: 0, kind: 'swell', id: 'ring-in', weight: 0.5 },
    { f: 1, kind: 'key', id: 'word-1', weight: 0.4 },
    { f: 11, kind: 'key', id: 'word-2', weight: 0.35 },
    { f: 19, kind: 'key', id: 'word-3', weight: 0.35 },
    { f: 30, kind: 'whoosh', id: 'whip-up', weight: 0.6 },
    { f: 39, kind: 'key', id: 'word-last', weight: 0.4 },
  ],
};
