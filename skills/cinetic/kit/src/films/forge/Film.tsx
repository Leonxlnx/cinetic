// "Forge": run any model, one command. 16.1 s (484 f) at 30 fps. An invented product (deploy any AI model with one command).
// Concept: one task, start to finish (the worked examples all show this one concept: read this film for moves, never for
// the concept or the look).
// World: a clean, bright block world. One light warm-grey field as the ground; orderly isometric grids of identical matte
// blocks (bevelled, lit from above, soft contact shadows, one light from the top left); statements set flat and centred
// on clean ground between the block beats, in ink, one colour a line; one sun-yellow accent that means "live" (the lit
// model, the caret, the endpoint, the mark). Geist is the one voice. Grounds: the grey field (the world), white paper
// (inside the model's top face: the terminal), sun (inside its lit face: the load, the one ground cut in the accent).
//
// DEVICES (the claim: one command instead of thirty things, and the endpoint it gives carries any load and idles at zero)
// - signature: the block (the model), 5 uses: it drops in (the hook), its top face is the terminal (the dive in and the
//   snap back out), its lit face carries the load (the second dive: the proof), it unfolds into the F of the wordmark
// - opening: drop-in, the model's block falls into frame and lands with weight on the bed's first beat
// - text arrivals: an append that re-centres (Build), in ink; letters cut on one by one for the wordmark
// - type treatment: statements alone and flat on clean ground (one line on the model's white top face before the dive);
//   the load set on the block's lit face
// - seams: 2-3 the line lifts away as the camera pulls back over the grid | 3-4 the grid sinks outside in under the swing
//   to the top face | 4-5 dive into the top face (signature; ground cut 1, paper) | 6-7 the giant command drops into the
//   log's first line | 7-8 snap back out of the face as the block rises and lights | 8-9 the load spills into the first
//   replica | 9-10 dive into the lit face (signature; ground cut 2, sun) | 10-11 tiles: the face's cells switch off one
//   by one as the count steps to zero (sun to white) | 11-12 the block splits into eight and unfolds into the F
// - spectacle: cascade, 24 replicas rising one after another in an orderly 5 x 5 grid behind the model, nearest first,
//   the gaps compressing (5, 4, 3, then 2 f), the camera pulling back to the widest frame, "25 replicas" counting flat
//   under it, 2.2 s
// - output-big: the load it carries, "12,480" requests a second at about 330 px on the block's lit face, then the steps to 0
// - integrations: none (the film hinges on the command and the load, not on partners)
// - lockup: the mark built from the film's object: the idle block splits into eight cubes that unfold into an F, each
//   lighting sun as it lands; the F is the first letter of the wordmark, "orge" cut on beside it; forge.dev under it
// - budget: no flood, no relay, no tour; one quantity grid in each act (the thirty chores, the replicas); one count
//   (the load, up and back to zero); one spectacle
// Beats, compositions and seams: BEATS.md in this folder.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  accel,
  At,
  at,
  beats,
  Box,
  Brand,
  Build,
  Camera,
  camAt,
  camSmear,
  clamp,
  creep,
  Cues,
  ease,
  fonts,
  Ground,
  landBlur,
  logScale,
  Marker,
  mix,
  Music,
  onTwos,
  shake,
  Spinner,
  toScreen,
  typingTimes,
  type Cam,
  type CamKey,
} from '../../kit';
import { sfx } from '../../sfx';

// ---------------------------------------------------------------- world tokens
const GROUND = '#EEEDEA'; // ground 1: the world, a light warm grey
const PAPER = '#FFFFFF'; // ground 2: block tops, the terminal
const SUN = '#FFC531'; // ground 3 and the one accent: live
const SUN_TOP = '#FFD256';
const SUN_SIDE = '#F2B524';
const INK = '#141416';
const GRAPHITE = '#5E5B55'; // secondary UI text on paper (6.4:1)
const BLOCK = { color: '#F7F6F3', top: '#FFFFFF', front: '#ECEAE5', side: '#DCD9D2' };
const LIT = { color: SUN, top: SUN_TOP, front: SUN, side: SUN_SIDE };
const BEVEL = 7;
const FLAT_PAPER = `linear-gradient(${PAPER}, ${PAPER})`; // a face given as a gradient is used as it is: the terminal's own white
const mono: React.CSSProperties = { fontFamily: fonts.mono, fontWeight: 500, letterSpacing: '0' };
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 520, letterSpacing: '-0.025em', color: INK };

// ---------------------------------------------------------------- the timeline, on the music's beat grid (122 BPM)
const B = beats(122.2, 8);
const T = {
  land: B.at(0), // 8: the model's block lands, the bed enters (the main hit)
  one: [14, B.at(1)],
  city: 32, // the thirty chores rise round it
  thirty: [B.half(45), B.at(3), 56, B.half(60), B.at(4)],
  swing: 84, // the camera swings to top-down over the model
  sink: 76, // the chores sink, outside in
  or: [B.at(6), B.half(103), B.at(7)],
  dive: 118,
  term: B.at(9), // 141: inside the face
  typed: 145, // two words typed, the model name lands in one burst
  enter: B.at(11), // 170
  outs: [177, 185, 193, 201],
  url: 211,
  // ---- the back half
  out: B.at(14.5), // 222: snap back out of the face; the block rises
  live: B.at(16), // 244: full height, it lights: live; requests start to arrive
  casc: B.at(18), // 273: the load spills into the first replica (the spectacle)
  dive2: B.at(23), // 347: from the widest frame, dive into the lit face
  macro: B.at(24), // 362: "12,480" requests a second, giant
  drain: B.at(24.5), // 369: the load leaves: the count steps to 0, the face's cells switch off
  back: B.at(25.5) + 5, // 389: pull back; the replicas sink
  zero: [B.at(26), B.half(398), B.at(27)], // 391: "Zero when idle." (on 45 f, its reading time)
  lock: B.at(28.5), // 428: the block splits and unfolds into the F
  end: 484,
} as const;

// ---------------------------------------------------------------- the camera's lens and an aiming helper
const PERSP = 2600;
type Pose = { rx: number; rz: number; zoom: number };
/** The pan that puts world point w on screen point s under this pose (a few Newton steps on toScreen). */
const aim = (c: Pose, w: [number, number, number], s: [number, number]): Required<Omit<Cam, 'ry'>> => {
  let x = 0;
  let y = 0;
  const scr = (px: number, py: number) => toScreen({ ...c, ry: 0, x: px, y: py }, w[0], w[1], w[2], { perspective: PERSP });
  for (let k = 0; k < 5; k++) {
    const p = scr(x, y);
    const ax = scr(x + 1, y);
    const ay = scr(x, y + 1);
    const a = ax.x - p.x;
    const b = ay.x - p.x;
    const cc = ax.y - p.y;
    const d = ay.y - p.y;
    const ex = s[0] - p.x;
    const ey = s[1] - p.y;
    const det = a * d - b * cc || 1;
    x += (d * ex - b * ey) / det;
    y += (-cc * ex + a * ey) / det;
  }
  return { ...c, x, y };
};

// ---------------------------------------------------------------- act 1: the model and the thirty chores round it
const HERO = 280; // the model's footprint (and its full height in act 3)
const SLAB = 70; // its height in act 1
const CH = { pitch: 220, size: 150, h: 46 };
const CHORES = (() => {
  const cells: Array<{ x: number; y: number; dist: number; ang: number }> = [];
  for (let gx = -3; gx <= 3; gx++)
    for (let gy = -2; gy <= 2; gy++) {
      if (Math.abs(gx) + Math.abs(gy) <= 1) continue; // the model's place
      cells.push({ x: 960 + gx * CH.pitch, y: 540 + gy * CH.pitch, dist: Math.hypot(gx, gy), ang: Math.atan2(gy, gx) });
    }
  cells.sort((a, b) => a.dist - b.dist || a.ang - b.ang);
  const n = cells.length; // 30
  return cells.map((c, i) => ({ ...c, f: T.city + Math.round(i * 1.1), sinkAt: T.sink + Math.round(((n - 1 - i) / (n - 1)) * 8) }));
})();

// ---------------------------------------------------------------- act 3: 24 replicas in a 5 x 5 grid behind the model
const REP_PITCH = 380;
const STAGE_Z = -(HERO - SLAB) * 0.6; // the stage sinks as the block rises, so its top face stays near the lens
const REP_GAPS = [5, 4, 4, 4, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2];
const REPS = (() => {
  const cells: Array<{ x: number; y: number; dist: number; ang: number }> = [];
  for (let gx = -2; gx <= 2; gx++)
    for (let gy = -4; gy <= 0; gy++) {
      if (gx === 0 && gy === 0) continue;
      cells.push({ x: 960 + gx * REP_PITCH, y: 540 + gy * REP_PITCH, dist: Math.hypot(gx, gy), ang: Math.atan2(gy, gx) });
    }
  cells.sort((a, b) => a.dist - b.dist || a.ang - b.ang);
  const last = cells.length - 1;
  return cells.map((c, i) => ({
    ...c,
    f: T.casc + REP_GAPS.slice(0, i).reduce((a, g) => a + g, 0),
    // they sink outside in as the load leaves (behind the full-frame face, so the pull-back finds the model alone)
    sinkAt: T.drain + 2 + Math.round(((last - i) / last) * 8),
  }));
})();
const CHAIN_END = REPS[REPS.length - 1].f;
/** How many replicas serve at frame f (the model counts as one). */
const landed = (f: number) => 1 + REPS.filter((r) => f >= r.f + 7).length;

// ---------------------------------------------------------------- the command: "forge deploy " typed, the model name lands in one burst
const CMD = 'forge deploy llama-3.1-70b';
const CPS = 24;
const KEYS = typingTimes(CMD, T.typed, 30, CPS, 3, 2);
const shownAt = (f: number) => KEYS.filter((k) => f >= k).length;

// ---------------------------------------------------------------- the terminal layout (shared by the top face and the full-frame shot)
const CW = 0.6; // Geist Mono advance in em
const FS = 84; // the command while it is typed: the whole line fits with 13 % to spare each side
const CMD_LEFT = (1920 - (CMD.length + 2) * CW * FS) / 2;
const OUT_FS = 52;
const OUT_LH = 98;
const LABEL_W = 9 * CW * OUT_FS;
const LOG_W = OUT_FS + 26 + LABEL_W + 60 + 20 + 22 * CW * OUT_FS;
const LOG_X = (1920 - LOG_W) / 2;
const LOG_TOP = 540 - (5 * OUT_LH) / 2;
const OUTS = [
  { label: 'weights', brand: 'huggingface', detail: 'meta-llama · 140 GB' },
  { label: 'image', brand: 'docker', detail: 'vllm/vllm-openai:0.6.3' },
  { label: 'gpus', brand: 'nvidia', detail: '8 × H100 · us-east-1' },
  { label: 'endpoint', brand: '', detail: 'api.forge.dev/v1/llama' },
];

/** The terminal at frame f, laid out at 1920 x 1080: no chrome, no corner text, the one line and its log. */
const TermLayout: React.FC<{ f: number }> = ({ f }) => {
  const n = shownAt(f);
  const typing = f < T.enter;
  const caretOn = typing && (n < CMD.length || Math.floor((f - KEYS[KEYS.length - 1]) / 8) % 2 === 0);
  const jump = at(f, T.enter, 9, ease.out);
  const k = OUT_FS / FS;
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {/* the command: large while it is typed, then it jumps up to be the first line of the log */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          fontFamily: fonts.mono,
          fontWeight: 500,
          fontSize: FS,
          lineHeight: 1.2,
          color: INK,
          whiteSpace: 'pre',
          transformOrigin: '0 0',
          transform: `translate(${mix(jump, CMD_LEFT, LOG_X)}px, ${mix(jump, 540 - FS * 0.6, LOG_TOP + (OUT_LH - OUT_FS * 1.2) / 2)}px) scale(${mix(jump, 1, k)})`,
        }}
      >
        <span style={{ color: '#9A968C' }}>❯ </span>
        {CMD.slice(0, n)}
        <span style={{ display: 'inline-block', width: `${CW}em`, height: '1.02em', transform: 'translateY(0.16em)', background: SUN, opacity: caretOn ? 1 : 0 }} />
      </div>
      {/* the log */}
      {OUTS.map((o, i) => {
        const s0 = T.outs[i];
        if (f < s0) return null;
        const p = at(f, s0, 7, ease.out);
        const done = f >= s0 + 10;
        const y = LOG_TOP + (i + 1) * OUT_LH;
        return (
          <div
            key={i}
            style={{ position: 'absolute', left: LOG_X, top: y, height: OUT_LH, display: 'flex', alignItems: 'center', fontFamily: fonts.mono, fontSize: OUT_FS, color: INK, whiteSpace: 'pre', transform: `translateY(${mix(p, 22, 0)}px)`, opacity: clamp(p * 3) }}
          >
            <Spinner start={s0} doneAt={s0 + 10} size={OUT_FS} color={GRAPHITE} done={INK} stroke={4} />
            <span style={{ marginLeft: 26, width: LABEL_W, fontWeight: done ? 600 : 400, color: done ? INK : GRAPHITE }}>{o.label}</span>
            <span style={{ width: 60, display: 'flex', alignItems: 'center' }}>{o.brand && <Brand name={o.brand} size={48} color={o.brand === 'nvidia' ? '#76B900' : 'brand'} />}</span>
            <span style={{ marginLeft: 20, color: done ? INK : GRAPHITE }}>
              {i === 3 ? (
                <Marker start={T.url} dur={8} color={SUN} radius={10} inset="-0.02em -0.2em">
                  {o.detail}
                </Marker>
              ) : (
                o.detail
              )}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

/** The full-frame terminal's camera: the dive's carry, back to rest on enter, a creep over the log. */
const termCam = (f: number) => {
  const carry = logScale(1, 1.06, at(f, T.term, 18, ease.out));
  const back = at(f, T.enter, 9, ease.out);
  const s = mix(back, carry, 1) * (1 + 0.04 * creep(f, T.enter + 4, 60));
  return { s, blur: back > 0 && back < 0.6 ? 5 * (1 - back) : 0 };
};

const Term: React.FC = () => {
  const f = useCurrentFrame();
  const c = termCam(f);
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `scale(${c.s})`, filter: c.blur ? `blur(${c.blur}px)` : `blur(${landBlur(f, T.term, 3, 3)}px)` }}>
        <TermLayout f={f} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The terminal, printed on the top face: the full-frame shot at frame `at` (with its camera), scaled to the face. */
const TermFace: React.FC<{ at: number }> = ({ at: f }) => {
  const c = f > T.term ? termCam(f) : { s: 1 };
  return (
    <div style={{ width: 1920, height: 1080, flexShrink: 0, position: 'relative', overflow: 'hidden', transform: `scale(${HERO / 1920})` }}>
      <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `scale(${c.s})` }}>
        <TermLayout f={f} />
      </AbsoluteFill>
    </div>
  );
};

// ---------------------------------------------------------------- the lit face: the load, stepped (a digital clock)
const TCELLS = 6;
const TILE = HERO / TCELLS;
/** When each cell switches off: a sweep from the top-left corner with a little scatter, over about 16 frames. */
const tileAt = (c: number, r: number) => T.drain + 1 + Math.round(((c / (TCELLS - 1)) * 0.45 + (r / (TCELLS - 1)) * 0.55) * 13 + (((c * 7 + r * 13) % 5) / 5) * 4);
const loadAt = (f: number) => {
  const g = onTwos(f);
  if (f < T.casc) return mix(at(g, T.live + 4, 26, ease.out), 0, 3184);
  if (f < T.drain) return mix(at(g, T.casc + 2, 58, ease.out), 3184, 12480);
  return mix(at(g, T.drain, 16, ease.inOut), 12480, 0);
};
const LoadFace: React.FC<{ lit: number; zoom: number; on: number }> = ({ lit, zoom, on }) => {
  const f = useCurrentFrame();
  let path = '';
  if (f > T.drain) {
    for (let r = 0; r < TCELLS; r++)
      for (let c = 0; c < TCELLS; c++) {
        const p = at(f, tileAt(c, r), 3, ease.out);
        if (p <= 0) continue;
        const w = (TILE + 1) * p;
        const cx = (c + 0.5) * TILE;
        const cy = (r + 0.5) * TILE;
        path += `M${(cx - w / 2).toFixed(2)} ${(cy - w / 2).toFixed(2)}h${w.toFixed(2)}v${w.toFixed(2)}h${(-w).toFixed(2)}Z`;
      }
  }
  // the number reads from a third of the frame's height down; the unit only where it is 34 px or more on screen
  const numA = clamp((zoom - 0.75) / 0.3);
  const unitA = clamp((zoom - 3.3) / 0.6);
  const v = Math.round(loadAt(f));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, #FFE7A3 0%, ${SUN} 30%, #F6B820 100%)`, opacity: lit }} />
      {path && <div style={{ position: 'absolute', inset: 0, clipPath: `path('${path}')`, background: 'linear-gradient(180deg, #FFFFFF 0%, #ECEAE5 100%)' }} />}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 98, textAlign: 'center', color: INK, opacity: numA * on }}>
        <div style={{ ...display, fontWeight: 560, fontSize: 58, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{v.toLocaleString('en-US')}</div>
        <div style={{ ...display, fontWeight: 480, letterSpacing: '-0.01em', fontSize: 11, marginTop: 8, opacity: unitA }}>requests a second</div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- the mark: the block's eight cubes unfold into an F
const CUBE = HERO / 2;
const F_PITCH = CUBE + 12;
const F_CELLS: Array<[number, number]> = [
  [0, 2], [1, 2], [0, 3], [0, 4], // from the bottom layer
  [0, 1], [1, 0], [0, 0], [2, 0], // from the top layer: they hop over
];
const SUBS: Array<[number, number, number]> = [
  [-1, -1, 0], [1, -1, 0], [-1, 1, 0], [1, 1, 0],
  [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1],
];
const fCell = (c: number, r: number): [number, number] => [960 + (c - 1) * F_PITCH, 540 + (r - 2) * F_PITCH];
const SPLIT_AT = [0, 1, 2, 3, 3, 5, 6, 8].map((d) => T.lock + 2 + d);
const SPLIT_DUR = 13;

// ---------------------------------------------------------------- the camera
const ISO: Pose = { rx: 55, rz: -42, zoom: 1 };
const HERO_C1: [number, number, number] = [960, 540, SLAB / 2];
const ACT1: CamKey[] = [
  { f: 0, ...aim({ ...ISO, zoom: 1.95 }, HERO_C1, [960, 400]) },
  { f: 18, ...aim({ ...ISO, zoom: 1.6 }, HERO_C1, [960, 400]), curve: ease.out },
  { f: 34, ...aim({ ...ISO, zoom: 1.54 }, HERO_C1, [960, 405]), curve: ease.glide },
  // the chores rise round it: pull back to the whole grid, under the line
  { f: 70, ...aim({ rx: 54, rz: -45, zoom: 0.64 }, [960, 540, 0], [960, 625]), curve: ease.inOut },
  { f: T.swing, ...aim({ rx: 54, rz: -46, zoom: 0.62 }, [960, 540, 0], [960, 628]), curve: ease.glide },
  // swing to top-down over the model: its white top face is the plate for the line
  { f: 106, rx: 0, rz: 0, zoom: 2.85, x: 0, y: 0, curve: ease.inOut },
  { f: T.dive, rx: 0, rz: 0, zoom: 2.95, x: 0, y: 0, curve: ease.glide },
  // the dive: fall into the face, accelerating, landing where the face is the frame
  { f: T.term, rx: 0, rz: 0, zoom: (5.46 * 300) / HERO, x: 0, y: 0, curve: (t: number) => t * t },
];
/** The zoom at which the top face (at height 70) is as wide as the full-frame terminal at frame f: the snap-out's first frame. */
const outZoom = (0.945 * 1920 * termCam(T.out).s) / (HERO * (PERSP / (PERSP - SLAB)));

const HERO_C3: [number, number, number] = [960, 540, HERO / 2 + STAGE_Z];
const GRID_C: [number, number, number] = [960, 540 - 2 * REP_PITCH, STAGE_Z];
const FACE_C: [number, number, number] = [960, 540 + HERO / 2, HERO / 2 + STAGE_Z];
const F_C: [number, number, number] = [960, 540, CUBE / 2 + STAGE_Z];
const FACE_ZOOM = 7.0;
const F_ZOOM = 0.4;
const F_POSE: Pose = { rx: 24, rz: 0, zoom: F_ZOOM };
const F_AIM: [number, number] = [588, 500];
const ACT3: CamKey[] = [
  // the dive's return: out of the top face fast (front-loaded), swinging back to the iso view as the block rises
  { f: T.out, rx: 0, rz: 0, zoom: outZoom, x: 0, y: 0 },
  { f: T.out + 12, ...aim({ rx: 24, rz: -12, zoom: 2.2 }, [960, 540, HERO + STAGE_Z], [960, 520]), curve: ease.out },
  { f: T.live, ...aim({ rx: 56, rz: -40, zoom: 1.55 }, HERO_C3, [960, 520]), curve: ease.inOut },
  { f: T.casc, ...aim({ rx: 57, rz: -41, zoom: 1.25 }, HERO_C3, [960, 560]), curve: ease.inOut },
  // the cascade: pull back ahead of the grid as it fills, nearest first, to the widest frame
  { f: T.casc + 30, ...aim({ rx: 59, rz: -45, zoom: 0.6 }, [960, 540 - REP_PITCH, STAGE_Z], [960, 450]), curve: ease.inOut },
  { f: CHAIN_END + 6, ...aim({ rx: 60, rz: -48, zoom: 0.47 }, GRID_C, [960, 430]), curve: ease.inOut },
  { f: T.dive2, ...aim({ rx: 60, rz: -49, zoom: 0.46 }, GRID_C, [960, 430]), curve: ease.glide },
  // the second dive: into the lit face, accelerating, landing square on the count
  { f: T.macro, ...aim({ rx: 88, rz: 0, zoom: FACE_ZOOM }, FACE_C, [960, 540]), curves: { zoom: (t: number) => t * (0.3 + 0.7 * t), rot: ease.inOut, pan: ease.inOut } },
  { f: T.back, ...aim({ rx: 88, rz: 0, zoom: FACE_ZOOM * 1.04 }, FACE_C, [960, 540]), curve: ease.glide },
  // pull back as the replicas sink: the idle block alone over the line
  { f: T.back + 16, ...aim({ rx: 56, rz: -40, zoom: 1.5 }, HERO_C3, [960, 420]), curve: ease.out },
  { f: T.lock, ...aim({ rx: 56, rz: -41, zoom: 1.44 }, HERO_C3, [960, 420]), curve: ease.glide },
  // the unfold: up to a near-front view of the F, beside its wordmark
  { f: T.lock + 12, ...aim({ rx: 42, rz: -20, zoom: 0.9 }, F_C, [960, 560]), curve: ease.out },
  { f: T.lock + 26, ...aim(F_POSE, F_C, F_AIM), curve: ease.inOut },
  { f: T.end, ...aim({ ...F_POSE, zoom: F_ZOOM * 1.03 }, F_C, F_AIM), curve: ease.glide },
];
const cam3 = (f: number): Required<Cam> => ({ ...camAt(f, ACT3), ry: 0 });
const smearOf = (f: number, max = 7) => {
  const a = cam3(f);
  const b = cam3(f - 1);
  const v = Math.hypot(a.x - b.x, a.y - b.y) * a.zoom + Math.abs(Math.log(a.zoom / b.zoom)) * 900 + (Math.abs(a.rx - b.rx) + Math.abs(a.rz - b.rz)) * 8;
  return Math.min(max, Math.max(0, v - 8) * 0.05);
};

// ---------------------------------------------------------------- statements: flat, centred, on clean ground
const Line: React.FC<{ words: string[]; times: readonly number[]; y: number; size: number; out?: number; scale?: number }> = ({ words, times, y, size, out = 0, scale = 1 }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, top: y - size * 0.6, opacity: 1 - out, transform: `translateY(${-out * 70}px) scale(${scale})`, transformOrigin: `960px ${size * 0.6}px` }}>
    <Build words={words} times={[...times]} style={{ ...display, fontSize: size, lineHeight: 1.2 }} />
  </div>
);

const World: React.FC = () => {
  const f = useCurrentFrame();
  const act3 = f >= T.out;
  const c3 = cam3(f);

  // act 1: the model falls (already in the air on frame 0) and lands on the beat
  const fall = clamp((f + 10) / (T.land + 10));
  const heroZ = act3 ? 0 : 150 * (1 - fall * fall);
  // act 3: the block rises out of the floor as the camera snaps out of its face; on the beat it lights
  const rise = act3 ? at(f, T.out + 3, 17, ease.out) : 0;
  const heroH = act3 ? mix(rise, SLAB, HERO) : SLAB;
  const stageZ = act3 ? STAGE_Z * rise : 0;
  const lit = act3 ? at(f, T.live, 3, ease.out) : 0;
  const idle = f >= tileAt(TCELLS - 1, TCELLS - 1) + 3;
  const heroLit = lit > 0.5 && !idle;
  const heroTone = heroLit ? LIT : BLOCK;

  const camShake = f < 30 ? shake(f, T.land, 10, 6) : act3 && f < T.live + 12 ? shake(f, T.live, 8, 4) : 'translate(0px, 0px)';
  // motion blur from the camera's speed, on the seams only
  const smear = !act3 ? (f > T.swing ? camSmear(f, ACT1, 0.5, 7) : 0) : f < T.lock && !(f > T.macro && f < T.back) ? smearOf(f, f > T.casc && f < T.dive2 ? 2 : 7) : 0;

  return (
    <AbsoluteFill style={{ transform: camShake, filter: smear > 0.3 ? `blur(${smear.toFixed(2)}px)` : undefined }}>
      <Camera keys={act3 ? undefined : ACT1} cam={act3 ? c3 : undefined} perspective={PERSP}>
        <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: act3 ? `translateZ(${stageZ}px)` : undefined }}>
          {/* act 1: the thirty chores, an orderly grid round the model */}
          {!act3 &&
            CHORES.map((b, i) => {
              if (f < b.f || f > b.sinkAt + 12) return null;
              const up = at(f, b.f, 10, ease.out);
              const sink = accel(f, b.sinkAt, 12, 1.5);
              const h = Math.max(1, CH.h * up * (1 - sink));
              return (
                <At key={i} x={b.x} y={b.y}>
                  <Box w={CH.size} d={CH.size} h={h} {...BLOCK} bevel={5} material="matte" ground={GROUND} shadow={0.32 * up * (1 - sink)} />
                </At>
              );
            })}

          {/* act 3: the replicas */}
          {act3 &&
            REPS.map((r, i) => {
              if (f < r.f || f > r.sinkAt + 12) return null;
              const p = at(f, r.f, 7, ease.in);
              const settle = f >= r.f + 7 ? 0.04 * Math.exp(-(f - r.f - 7) / 1.6) * Math.cos((f - r.f - 7) * 1.4) : 0;
              const sink = accel(f, r.sinkAt, 12, 1.5);
              if (sink > 0.94) return null;
              const h = Math.max(1, HERO * (p + settle) * (1 - sink));
              return (
                <At key={i} x={r.x} y={r.y}>
                  <Box w={HERO} d={HERO} h={h} {...BLOCK} bevel={BEVEL} material="matte" ground={GROUND} shadow={0.4 * Math.min(1, p * 1.2) * (1 - sink)} />
                </At>
              );
            })}

          {/* the model: its top face is the terminal, its lit front face carries the load */}
          {(!act3 || f < T.lock + 2) && (
            <At x={960} y={540} z={heroZ}>
              <Box
                w={HERO}
                d={HERO}
                h={heroH}
                {...heroTone}
                top={(act3 && f < T.live) || !act3 ? FLAT_PAPER : heroTone.top}
                bevel={BEVEL}
                material="matte"
                ground={GROUND}
                shadow={0.42}
                topContent={act3 ? (f < T.out + 8 ? <TermFace at={T.out} /> : undefined) : f >= T.dive + 9 ? <TermFace at={T.term} /> : undefined}
                frontContent={act3 ? <LoadFace lit={idle ? 0 : lit} on={lit} zoom={c3.zoom} /> : undefined}
              />
            </At>
          )}
          {/* the lockup: the block splits into eight cubes that unfold into an F, each lighting as it lands */}
          {act3 &&
            f >= T.lock + 2 &&
            SUBS.map(([sx, sy, sz], i) => {
              const p = at(f, SPLIT_AT[i], SPLIT_DUR, ease.inOut);
              const [tx, ty] = fCell(...F_CELLS[i]);
              const x0 = 960 + sx * (CUBE / 2) * mix(at(f, T.lock + 2, 3, ease.out), 1, 1.04);
              const y0 = 540 + sy * (CUBE / 2) * mix(at(f, T.lock + 2, 3, ease.out), 1, 1.04);
              const z0 = sz * CUBE;
              const hop = Math.sin(Math.PI * p) * (sz ? 150 : 40);
              const on = f >= SPLIT_AT[i] + SPLIT_DUR;
              const tone = on ? LIT : BLOCK;
              return (
                <At key={i} x={mix(p, x0, tx)} y={mix(p, y0, ty)} z={mix(p, z0, 0) + hop}>
                  <Box w={CUBE} d={CUBE} h={CUBE} {...tone} bevel={5} material="matte" ground={GROUND} shadow={sz && p < 0.5 ? 0 : 0.42} />
                </At>
              );
            })}
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the type layer (screen space)
const Statements: React.FC = () => {
  const f = useCurrentFrame();
  const swingOut = at(f, T.dive + 2, 8, ease.in);
  return (
    <AbsoluteFill>
      {f < 40 && <Line words={['One', 'model.']} times={T.one} y={808} size={176} out={accel(f, 32, 7)} />}
      {f >= T.thirty[0] && f < T.swing + 8 && <Line words={['Thirty', 'things', 'to', 'run', 'it.']} times={T.thirty} y={176} size={96} out={accel(f, T.swing, 7)} />}
      {/* on the model's white top face, then it rides the dive out */}
      {f >= T.or[0] && f < T.dive + 10 && <Line words={['Or', 'one', 'command.']} times={T.or} y={540} size={112} out={swingOut} scale={1 + 0.6 * swingOut} />}
      {f >= T.casc + 30 && f < T.dive2 + 6 && <ReplicaCount />}
      {f >= T.zero[0] && f < T.lock + 7 && <Line words={['Zero', 'when', 'idle.']} times={T.zero} y={812} size={140} out={accel(f, T.lock, 6)} />}
    </AbsoluteFill>
  );
};

/** "25 replicas": the count of the cascade, flat under the grid, stepping as each one lands. */
const ReplicaCount: React.FC = () => {
  const f = useCurrentFrame();
  const n = landed(f);
  const out = accel(f, T.dive2, 6);
  const inP = at(f, T.casc + 30, 8, ease.out);
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 846, textAlign: 'center', ...display, fontSize: 150, lineHeight: 1, opacity: (1 - out) * clamp(inP * 2), transform: `translateY(${mix(inP, 30, 0) + out * 60}px)` }}>
      <span style={{ display: 'inline-block', minWidth: '1.2em', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
      <span style={{ marginLeft: '0.26em' }}>replicas</span>
    </div>
  );
};

// ---------------------------------------------------------------- the lockup type: the F is the first letter of the wordmark
const LockType: React.FC = () => {
  const f = useCurrentFrame();
  const c = cam3(f);
  const P = { perspective: PERSP };
  // the F's letter box on screen: the top of its top row, the floor line of its bottom row, its right edge
  const [lx, ty] = fCell(0, 0);
  const [, by] = fCell(0, 4);
  const [rx] = fCell(2, 0);
  const top = toScreen(c, lx, ty - CUBE / 2, CUBE + STAGE_Z, P).y;
  const base = toScreen(c, lx, by + CUBE / 2, STAGE_Z, P).y;
  const right = toScreen(c, rx + CUBE / 2, ty + CUBE / 2, CUBE + STAGE_Z, P).x;
  const capH = base - top;
  const size = capH / 0.7; // Geist's cap height is 0.7 em
  const t0 = T.lock + 25;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: right + size * 0.035, top: base - size * 0.94, ...display, fontWeight: 560, letterSpacing: '-0.035em', fontSize: size, lineHeight: 1.2, whiteSpace: 'pre' }}>
        {'orge'.split('').map((ch, i) => (
          <span key={i} style={{ opacity: f >= t0 + i * 3 ? 1 : 0 }}>
            {ch}
          </span>
        ))}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: base + capH * 0.62, textAlign: 'center', ...display, fontWeight: 500, letterSpacing: '-0.01em', fontSize: 44, color: INK, opacity: f >= T.lock + 38 ? 1 : 0 }}>forge.dev</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the film
export const ForgeFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    { at: T.land, ...s['mixkit-2299'], volume: 0.9 },
    ...T.one.map((t) => ({ at: t, ...s['mixkit-2533'], volume: 0.3 })),
    ...CHORES.filter((_, i) => i % 2 === 0).map((b, i) => ({ at: b.f + 2, ...s['mixkit-2568'], volume: 0.2, rate: 0.88 + (i % 5) * 0.06 })),
    { at: T.sink + 4, ...s['mixkit-175'], volume: 0.35 },
    { at: T.term - 8, ...s['mixkit-1492'], volume: 0.45 },
    { at: T.term, ...s['mixkit-784'], volume: 0.4, maxS: 1 },
    // one tick per typed key (every other one), and one firmer tick when the model name lands in its burst
    ...[...new Set(KEYS)].filter((_, i) => i % 2 === 0).map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.22, rate: 0.92 + (i % 4) * 0.05 })),
    { at: KEYS[KEYS.length - 1], ...s['mixkit-2533'], volume: 0.34, rate: 0.85 },
    { at: T.enter, ...s['mixkit-2299'], volume: 0.7 },
    { at: T.enter, ...s['mixkit-3124'], volume: 0.45 },
    ...T.outs.map((o) => ({ at: o + 10, ...s['mixkit-1049'], volume: 0.32 })),
    { at: T.url, ...s['mixkit-2384'], volume: 0.3 },
    // the back half: out of the face, the block lights, the chain of replicas, the dive, the drain, the zero
    { at: T.out + 4, ...s['mixkit-175'], volume: 0.42 },
    { at: T.live, ...s['mixkit-2299'], volume: 0.62 },
    { at: T.live, ...s['mixkit-3124'], volume: 0.4 },
    // a tick per replica (every other one at the fast end), rising in pitch; one low hit on the last
    ...REPS.filter((_, i) => i < 9 || i % 2 === 0).map((r, i) => ({ at: r.f + 7, ...s['mixkit-2568'], volume: 0.12, rate: 0.9 + i * 0.035 })),
    { at: CHAIN_END + 7, ...s['mixkit-2299'], volume: 0.5 },
    { at: T.dive2 + 2, ...s['mixkit-168'], volume: 0.4 },
    { at: T.macro, ...s['mixkit-2299'], volume: 0.55 },
    { at: T.drain, ...s['mixkit-784'], volume: 0.32, maxS: 1 },
    ...[0, 4, 8, 12].map((k) => ({ at: T.drain + 2 + k, ...s['mixkit-1049'], volume: 0.2, rate: 1.1 - k * 0.02 })),
    { at: T.back + 2, ...s['mixkit-175'], volume: 0.32 },
    ...T.zero.map((t) => ({ at: t, ...s['mixkit-2533'], volume: 0.3 })),
    { at: T.lock, ...s['mixkit-2299'], volume: 0.9 },
    // each cube of the F lands and lights
    ...SPLIT_AT.filter((_, i) => i % 2 === 1).map((t, i) => ({ at: t + SPLIT_DUR, ...s['mixkit-2568'], volume: 0.16, rate: 1 + i * 0.05 })),
    { at: T.lock + 25, ...s['mixkit-3124'], volume: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <Ground color={GROUND} light={{ x: 0.5, y: 0.42, size: 0.9, amount: 0.035 }} />
      {(f < T.term || f >= T.out) && <World />}
      {f >= T.term && f < T.out && <Term />}
      <Statements />
      {f >= T.lock + 24 && <LockType />}
      <Music src="music/tech-house-vibes.mp3" startFrom={28.1} volume={0.5} enterAt={T.land} breaths={[T.term, T.lock]} breathLen={7} duck={[T.enter, T.live, T.macro, T.lock]} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const forgeDuration = T.end;
