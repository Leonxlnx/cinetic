// "Forge": run any model, one command. 20.5 s at 30 fps. An invented product (deploy any AI model with one command).
// World: an isometric city of bone blocks on an ink floor with a faint grid, mono labels printed on the faces, type set
// on the floor plane, one yellow accent that means "live". Three grounds, each cut carried by an object: ink (the
// world), paper (the hero block's top face is the terminal: the dive lands in it), sun (the live endpoint floods the
// frame, and the pull-back reveals the sun was the block's lit face). Integrations are surfaces: the endpoint lands in a
// notebook, a pull request and a team chat. The lockup is the hero block splitting into the mark.
// Beats, compositions and seams: BEATS.md in this folder.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
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
  clamp,
  creep,
  Cues,
  DepthStack,
  ease,
  Flood,
  fonts,
  Grain,
  GridLines,
  Icon,
  landBlur,
  lightUI,
  logScale,
  Marker,
  mix,
  Music,
  Odometer,
  onTwos,
  PartnerSurface,
  rand,
  shake,
  Spinner,
  springAt,
  springs,
  Words,
  type CamKey,
  type Theme,
} from '../../kit';
import { sfx } from '../../sfx';

// ---------------------------------------------------------------- world tokens
const INK = '#0E0E10'; // ground 1: the world
const PAPER = '#FBFAF6'; // ground 2: block tops, the terminal
const SUN = '#FFC531'; // ground 3 and the one accent: live
const BONE = '#F2F0EA';
const AMBER = '#D9A21E';
const STONE = '#8F8B82'; // labels on ink
const GRAPHITE = '#66625A'; // labels on paper and sun
const BLOCK = { top: PAPER, front: '#D9D5CB', side: '#BDB8AC' };
const mono: React.CSSProperties = { fontFamily: fonts.mono, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' };
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 640, letterSpacing: '-0.045em' };
const sui: Theme = {
  ...lightUI,
  surface: '#FFFEFA',
  ink: INK,
  muted: GRAPHITE,
  line: 'rgba(14,14,16,0.09)',
  accent: SUN,
  accentInk: INK,
  radius: 28,
  font: fonts.geist,
  mono: fonts.mono,
  shadow: '0 2px 4px rgba(70,45,0,.10), 0 40px 80px -24px rgba(70,45,0,.40)',
};

// ---------------------------------------------------------------- the timeline, on the music's beat grid (122 BPM)
const B = beats(122.2, 8);
const T = {
  land: B.at(0), // 8: the hero block lands, the bed enters
  one: [14, B.at(1)],
  city: 30,
  thirty: [B.half(45), B.at(3), 56, B.half(60), B.at(4)],
  sink: B.at(6), // 96
  or: [B.half(89), B.at(6), B.half(103)],
  dive: 116,
  term: B.at(9), // 141: inside the face
  typed: 146,
  enter: B.at(12), // 185
  outs: [192, 200, 208, 216],
  url: 226,
  flood: 235, // full sun on 244
  rise: 239, // the notebook rides in on the flood
  s1: B.at(16), // 244
  s2: B.at(19), // 288
  s3: B.at(22), // 332
  lit1: 264,
  lit2: B.at(20), // 303
  lit3: B.at(23), // 347
  up: B.at(25), // 376: the stack leaves, the world returns under it
  face: 374,
  block: B.at(28), // 421
  push: 440,
  wall: B.at(32), // 480
  zero: B.at(35), // 524
  lock: B.at(37), // 553
  end: 614,
} as const;

// ---------------------------------------------------------------- the floor type: one anchor, a lane kept clear of blocks
const LANE = { x: 1010, y: 905, rot: 30, u: 1000, back: 130, front: 150 };
/** Is a block (footprint radius r, height h) in the lane? Blocks in front of the type (toward the camera) hide it by their height. */
const inLane = (x: number, y: number, r: number, h: number) => {
  const dx = x - LANE.x;
  const dy = y - LANE.y;
  const a = (LANE.rot * Math.PI) / 180;
  const u = dx * Math.cos(a) + dy * Math.sin(a);
  const v = -dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(u) < LANE.u + r && v > -LANE.back - r && v < LANE.front + r + h * 1.1;
};

// ---------------------------------------------------------------- the city: thirty labelled things it takes to run a model
const LABELS = [
  'CUDA 12.4', 'NCCL', 'DRIVERS 550', 'VLLM', 'TRITON', 'KUBERNETES', 'HELM CHART', 'AUTOSCALER', 'LOAD BALANCER', 'TLS CERTS',
  'GPU QUOTA', 'WEIGHTS 140 GB', 'TOKENIZER', 'REQUEST QUEUE', 'KV CACHE', 'LOGS', 'METRICS', 'SECRETS', 'BATCHING', 'RETRIES',
  'RATE LIMITS', 'HEALTH CHECKS', 'DOCKERFILE', 'CDN', 'ALERTS', 'SPOT FALLBACK', 'QUANTIZATION', 'SHARDING', 'WARM POOL', 'BILLING',
];
const CITY = (() => {
  const cand: Array<{ x: number; y: number; w: number; d: number; h: number; dist: number; s: number }> = [];
  let s = 0;
  for (let gx = -2; gx <= 8; gx++)
    for (let gy = -3; gy <= 6; gy++) {
      s++;
      const x = 960 + (gx - 3) * 330 + (rand(s) - 0.5) * 120;
      const y = 540 + (gy - 0) * 300 + (rand(s + 40) - 0.5) * 110;
      const w = 150 + Math.round(rand(s + 3) * 3) * 40;
      const d = 150 + Math.round(rand(s + 5) * 3) * 36;
      const h = 50 + Math.round(rand(s + 7) * 6) * 28;
      const dist = Math.hypot(x - 960, (y - 540) * 1.1);
      if (dist < 330 || inLane(x, y, Math.max(w, d) * 0.6, h)) continue;
      cand.push({ x, y, w, d, h, dist, s });
    }
  cand.sort((a, b) => a.dist - b.dist);
  const maxD = cand[29].dist;
  return cand.slice(0, 30).map((b, i) => ({
    ...b,
    label: LABELS[i],
    f: T.city + Math.round(i * 1.9),
    sinkAt: T.sink + Math.round((1 - b.dist / maxD) * 12 + rand(b.s + 11) * 4),
  }));
})();

// ---------------------------------------------------------------- the replicas: 63 more of the hero, a wall
const REPLICAS = (() => {
  const out: Array<{ x: number; y: number; dist: number; f: number; sinkAt: number; n: number }> = [];
  for (let gx = -6; gx <= 6; gx++)
    for (let gy = -6; gy <= 6; gy++) {
      if (gx === 0 && gy === 0) continue;
      const x = 960 + gx * 300;
      const y = 540 + gy * 300;
      if (inLane(x, y, 140, 300)) continue;
      out.push({ x, y, dist: Math.hypot(gx, gy), f: 0, sinkAt: 0, n: 0 });
    }
  out.sort((a, b) => a.dist - b.dist);
  const list = out.slice(0, 63);
  const maxD = list[list.length - 1].dist;
  return list.map((r, i) => ({
    ...r,
    n: i + 2,
    f: T.wall - 6 + Math.round(Math.pow(r.dist / maxD, 0.8) * 18),
    sinkAt: T.zero + Math.round((1 - r.dist / maxD) * 12 + rand(i + 3) * 3),
  }));
})();

// ---------------------------------------------------------------- the command, typed (same cadence as the kit's useTyped)
const CMD = 'forge deploy llama-3.1-70b';
const CPS = 24;
const typedTimes = (text: string, start: number, cps: number, seed = 3) => {
  const per = 30 / cps;
  let t = start;
  return text.split('').map((c, i) => {
    t += per + (rand(i * 7.3 + seed) - 0.5) * per * 0.9 + (c === ' ' ? per * 0.6 : c === ',' || c === '.' ? per * 2.5 : 0);
    return t;
  });
};
const KEYS = typedTimes(CMD, T.typed, CPS);
/** Characters typed at frame f, fractional between keystrokes (the camera follows it smoothly). */
const typedAt = (f: number) => {
  if (f < KEYS[0]) return 0;
  for (let i = 1; i < KEYS.length; i++) if (f < KEYS[i]) return i + (f - KEYS[i - 1]) / (KEYS[i] - KEYS[i - 1]);
  return KEYS.length;
};
const shownAt = (f: number) => KEYS.filter((k) => f >= k).length;

// ---------------------------------------------------------------- floor type
const floorStyle: React.CSSProperties = { ...display, fontSize: 168, color: BONE, lineHeight: 1 };
const FloorType: React.FC<{ children: React.ReactNode; out?: number }> = ({ children, out = 0 }) => (
  <At x={LANE.x} y={LANE.y} z={2} rz={LANE.rot}>
    <div style={{ ...floorStyle, whiteSpace: 'nowrap', opacity: 1 - out, transform: `translateY(${-out * 120}px)` }}>{children}</div>
  </At>
);

const Label: React.FC<{ text: string; size?: number; color?: string; w?: number }> = ({ text, size = 20, color = '#7D796F', w }) => (
  <div style={{ ...mono, fontSize: size, color, position: 'absolute', left: 12, top: 10, width: w, lineHeight: 1.15 }}>{text}</div>
);

// ---------------------------------------------------------------- the terminal layout (shared by the hero's face and the full-frame shot)
const FS = 120; // the command, giant
const CW = 0.6; // Geist Mono advance in em
const CMD_X = 130;
const OUT_Y = 390;
const OUTS = [
  { label: 'weights', brand: 'huggingface', detail: 'meta-llama · 140 GB' },
  { label: 'image', brand: 'docker', detail: 'vllm/vllm-openai:0.6.3' },
  { label: 'gpus', brand: 'nvidia', detail: '8 × H100 · us-east-1' },
  { label: 'endpoint', brand: '', detail: 'api.forge.dev/v1/llama' },
];
const OUT_FS = 68;
const DETAIL_X = 800;

const Status: React.FC<{ f: number }> = ({ f }) => {
  const running = f >= T.outs[3] + 10;
  const secs = f < T.enter ? 0 : Math.round(mix(at(onTwos(f), T.enter, T.outs[3] + 10 - T.enter, ease.linear), 0, 41));
  const s: React.CSSProperties = { ...mono, fontSize: 32, color: GRAPHITE, position: 'absolute', whiteSpace: 'nowrap' };
  return (
    <>
      <div style={{ ...s, left: CMD_X, top: 64 }}>~/models · main</div>
      <div style={{ ...s, right: 130, top: 64 }}>{f < T.enter ? 'forge 1.4.2 · us-east-1' : `elapsed 0:${String(secs).padStart(2, '0')}`}</div>
      <div style={{ ...s, left: CMD_X, top: 980 }}>{running ? '8 × H100 · 1 endpoint live' : '8 × H100 free · 0 running'}</div>
      <div style={{ ...s, right: 130, top: 980 }}>⏎ run   ⌃c cancel</div>
    </>
  );
};

/** The terminal at frame f, laid out at 1920 x 1080. */
const TermLayout: React.FC<{ f: number }> = ({ f }) => {
  const n = shownAt(f);
  const typing = f < T.enter;
  const caretOn = typing && (n < CMD.length || Math.floor((f - KEYS[KEYS.length - 1]) / 8) % 2 === 0);
  const jump = at(f, T.enter, 9, ease.out);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <Status f={f} />
      {/* the command: giant while it is typed, then it jumps up to be the first line of the log */}
      <div
        style={{
          position: 'absolute',
          left: CMD_X,
          top: 540 - FS * 0.62,
          fontFamily: fonts.mono,
          fontWeight: 500,
          fontSize: FS,
          lineHeight: 1.24,
          color: INK,
          whiteSpace: 'pre',
          transformOrigin: '0 50%',
          transform: `translateY(${mix(jump, 0, OUT_Y - 122 - 540 + FS * 0.62)}px) scale(${mix(jump, 1, OUT_FS / FS)})`,
        }}
      >
        <span style={{ color: '#A8A396' }}>❯ </span>
        {CMD.slice(0, n)}
        <span style={{ display: 'inline-block', width: `${CW}em`, height: '1.02em', transform: 'translateY(0.16em)', background: SUN, opacity: caretOn ? 1 : 0 }} />
      </div>
      {/* the log */}
      {OUTS.map((o, i) => {
        const s0 = T.outs[i];
        if (f < s0) return null;
        const p = at(f, s0, 7, ease.out);
        const done = f >= s0 + 10;
        const y = OUT_Y + i * 122;
        const isUrl = i === 3;
        return (
          <div key={i} style={{ position: 'absolute', left: CMD_X, top: y, display: 'flex', alignItems: 'center', fontFamily: fonts.mono, fontSize: OUT_FS, color: INK, whiteSpace: 'pre', transform: `translateY(${mix(p, 26, 0)}px)`, opacity: clamp(p * 3) }}>
            <Spinner start={s0} doneAt={s0 + 10} size={62} color={GRAPHITE} done={INK} stroke={4} />
            <span style={{ marginLeft: 30, width: DETAIL_X - CMD_X - 86, fontWeight: done ? 600 : 400, color: done ? INK : GRAPHITE }}>{o.label}</span>
            <span style={{ width: 64, display: 'flex', alignItems: 'center' }}>{o.brand && <Brand name={o.brand} size={60} color={o.brand === 'huggingface' ? 'brand' : o.brand === 'docker' ? 'brand' : '#76B900'} />}</span>
            <span style={{ marginLeft: 22, color: done ? INK : GRAPHITE }}>
              {isUrl ? (
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

/** The full-frame terminal's camera: carry from the dive, follow the caret, jump back on enter, creep over the log. */
const termCam = (f: number) => {
  const carry = logScale(1, 1.1, at(f, T.term, 18, ease.out));
  const caretX = CMD_X + (2 + typedAt(f)) * FS * CW;
  const caretScreen = 960 + carry * (caretX - 960);
  const follow = Math.min(0, 1380 - caretScreen);
  const back = at(f, T.enter, 9, ease.out);
  const s = mix(back, carry, 1) * (1 + 0.05 * creep(f, T.enter + 4, 60));
  const tx = mix(back, follow, 0);
  const ty = mix(at(f, T.enter + 6, 50, ease.glide), 0, -40);
  return { s, tx, ty, blur: back > 0 && back < 0.6 ? 6 * (1 - back) : 0 };
};
const toScreen = (f: number, x: number, y: number) => {
  const c = termCam(f);
  return { x: 960 + c.s * (x - 960) + c.tx, y: 540 + c.s * (y - 540) + c.ty, s: c.s };
};

const Term: React.FC = () => {
  const f = useCurrentFrame();
  const c = termCam(f);
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.s})`, filter: c.blur ? `blur(${c.blur}px)` : `blur(${landBlur(f, T.term, 3, 3)}px)` }}>
        <TermLayout f={f} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// the URL chip's box on screen when the flood starts (the flood grows from it)
const chipBox = (() => {
  const x0 = CMD_X + 56 + 30 + (DETAIL_X - CMD_X - 86) + 64 + 22 - 0.2 * OUT_FS;
  const x1 = x0 + OUTS[3].detail.length * OUT_FS * CW + 0.4 * OUT_FS;
  const yc = OUT_Y + 3 * 122 + OUT_FS * 0.62;
  const a = toScreen(T.flood, x0, yc - 40);
  const b = toScreen(T.flood, x1, yc + 40);
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, w: b.x - a.x, h: b.y - a.y, r: 10 };
})();

// ---------------------------------------------------------------- the hero's faces
const ModelFace: React.FC = () => (
  <>
    <Label text="MODEL" size={22} />
    <div style={{ ...mono, fontSize: 30, color: INK, letterSpacing: '0.02em' }}>LLAMA-3.1-70B</div>
    <div style={{ ...mono, fontSize: 18, color: '#7D796F', position: 'absolute', left: 12, bottom: 10 }}>140 GB</div>
  </>
);
/** The terminal, printed on the top face: exactly the first frame of the full-frame shot, scaled to the face. */
const TermFace: React.FC = () => (
  <div style={{ width: 1920, height: 1080, flexShrink: 0, position: 'relative', transform: `scale(${300 / 1920})` }}>
    <TermLayout f={T.term} />
  </div>
);
const ReqFace: React.FC<{ idle: number }> = ({ idle }) => {
  const f = useCurrentFrame();
  const v = f < T.zero ? 12480 : 0;
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', color: INK }}>
      <div style={{ ...mono, fontSize: 20, position: 'absolute', left: 18, top: 16 }}>LLAMA-3.1-70B</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 120, textAlign: 'center' }}>
        <div style={{ ...display, fontSize: 76, lineHeight: 1 }}>
          {f < T.zero ? <Odometer value={v} from={0} start={T.face + 6} dur={70} /> : <Odometer value={0} from={12480} start={T.zero} dur={26} curve={ease.inOut} />}
        </div>
        <div style={{ ...mono, fontSize: 19, marginTop: 10 }}>REQUESTS / S</div>
      </div>
      <div style={{ ...mono, fontSize: 19, position: 'absolute', left: 18, bottom: 18, opacity: 1 - idle }}>P50 84 MS</div>
      <div style={{ ...mono, fontSize: 19, position: 'absolute', right: 18, bottom: 18 }}>{f < T.zero ? 'LIVE' : 'IDLE'}</div>
    </div>
  );
};

// ---------------------------------------------------------------- requests: sun streaks on the floor, stepped (the digital clock)
const STREAKS = Array.from({ length: 36 }, (_, i) => ({
  dir: i % 4,
  lane: (Math.round(rand(i + 2) * 4) - 2) * 60,
  t0: T.face + 20 + Math.round(rand(i + 9) * 40) + (i % 6) * 5,
  speed: 52 + Math.round(rand(i + 4) * 3) * 12,
}));
const Streaks: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <>
      {STREAKS.map((s, i) => {
        const period = Math.round(1700 / s.speed) + 4;
        const k = Math.floor((f - s.t0) / period);
        if (f < s.t0) return null;
        const born = s.t0 + k * period;
        if (born > T.zero) return null;
        const dist = 1700 - s.speed * onTwos(f - born);
        if (dist < 170) return null;
        const dx = s.dir === 0 ? -dist : s.dir === 1 ? dist : s.lane;
        const dy = s.dir === 2 ? -dist : s.dir === 3 ? dist : s.lane;
        const horiz = s.dir < 2;
        return (
          <At key={i} x={960 + dx} y={540 + dy} z={1}>
            <div style={{ width: horiz ? 150 : 12, height: horiz ? 12 : 150, borderRadius: 6, background: SUN, boxShadow: `0 0 24px rgba(255,197,49,.55)` }} />
          </At>
        );
      })}
    </>
  );
};

// ---------------------------------------------------------------- the iso world (acts 1 and 3)
const ISO = { rx: 56, rz: -42 };
const ACT1: CamKey[] = [
  { f: 0, ...ISO, zoom: 2.4, x: 0, y: -40 },
  { f: 16, ...ISO, zoom: 1.95, x: 20, y: 90, curve: ease.out },
  { f: 40, ...ISO, zoom: 1.5, x: 30, y: 150, curve: ease.inOut },
  { f: 92, rx: 56, rz: -47, zoom: 0.8, x: 60, y: 180, curve: ease.inOut },
  { f: 110, rx: 55, rz: -45, zoom: 1.0, x: 80, y: 260, curve: ease.inOut },
  // the dive: swing to top-down over the face (the terminal is printed on it), then fall into it, accelerating,
  // landing at the zoom where the face is exactly the frame (h = 70)
  { f: 130, rx: 0, rz: 0, zoom: 1.9, x: 0, y: 0, curve: ease.inOut },
  { f: T.term, rx: 0, rz: 0, zoom: 5.46, x: 0, y: 0, curve: (t: number) => t * t },
];
const ACT3: CamKey[] = [
  { f: T.face, rx: 86, rz: -6, zoom: 7.2, x: 0, y: 150 },
  { f: T.block, rx: 62, rz: -32, zoom: 1.75, x: 0, y: 90, curve: ease.out },
  { f: T.push - 6, rx: 64, rz: -21, zoom: 1.95, x: 0, y: 100, curve: ease.glide },
  { f: T.wall - 4, rx: 76, rz: -14, zoom: 2.5, x: 0, y: 150, curve: ease.inOut },
  { f: T.wall + 10, rx: 57, rz: -44, zoom: 0.62, x: 40, y: 200, curve: ease.out },
  { f: T.zero, rx: 56, rz: -47, zoom: 0.64, x: 40, y: 200, curve: ease.glide },
  { f: T.lock - 2, rx: 54, rz: -40, zoom: 1.0, x: 20, y: 120, curve: ease.inOut },
  { f: T.lock + 18, rx: 0, rz: 0, zoom: 1.1, x: 295, y: 0, curve: ease.out },
  { f: T.end, rx: 0, rz: 0, zoom: 1.14, x: 285, y: 0, curve: ease.glide },
];

const World: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const act3 = f >= T.face;

  // act 1: the hero falls (already in the air on frame 0) and lands on the beat
  const fall = clamp((f + 10) / (T.land + 10));
  const heroZ = act3 ? 0 : 190 * (1 - fall * fall);

  // the lockup: the hero splits into the three blocks of the mark
  const split = at(f, T.lock, 16, ease.out);
  const idle = at(f, T.zero + 4, 14, ease.inOut) * (1 - at(f, T.lock, 8, ease.out));
  const heroFront = idle > 0 ? (idle > 0.5 ? BLOCK.front : SUN) : SUN;
  const heroH = act3 ? 420 : 70;

  const pieces = [
    { x: -112, y: 0, w: 105, d: 270, h: 150, front: SUN, side: AMBER },
    { x: 62, y: -90, w: 215, d: 90, h: 110, front: BLOCK.front, side: BLOCK.side },
    { x: 32, y: 26, w: 155, d: 76, h: 110, front: BLOCK.front, side: BLOCK.side },
  ];

  const camShake = f < 30 ? shake(f, T.land, 10, 9) : 'translate(0px, 0px)';

  return (
    <AbsoluteFill style={{ transform: camShake }}>
      <Camera keys={act3 ? ACT3 : ACT1} perspective={2600}>
        <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: act3 ? 'translateZ(-210px)' : undefined }}>
          <GridLines size={80} color="rgba(242,240,234,0.075)" start={act3 ? T.face : -14} reveal={act3 ? 1 : 30} />

          {/* act 1: floor type */}
          {!act3 && f < T.sink && f < T.thirty[0] && (
            <FloorType>
              <Build words={['One', 'model.']} times={[...T.one]} born={SUN} settle={14} style={floorStyle} />
            </FloorType>
          )}
          {!act3 && f >= T.thirty[0] && f < T.or[0] && (
            <FloorType>
              <Build words={['Thirty', 'things', 'to', 'run', 'it.']} times={[...T.thirty]} born={SUN} settle={14} style={floorStyle} />
            </FloorType>
          )}
          {!act3 && f >= T.or[0] && (
            <FloorType out={at(f, 122, 10, ease.in)}>
              <Build words={['Or', 'one', 'command.']} times={[...T.or]} born={SUN} settle={14} style={floorStyle} />
            </FloorType>
          )}

          {/* act 1: the city */}
          {!act3 &&
            CITY.map((b, i) => {
              if (f < b.f || f > b.sinkAt + 12) return null;
              const up = springAt(f, fps, b.f, springs.card);
              const sink = accel(f, b.sinkAt, 12, 1.5);
              const h = Math.max(1, b.h * mix(up, 0, 1) * (1 - sink));
              return (
                <At key={i} x={b.x} y={b.y}>
                  <Box w={b.w} d={b.d} h={h} color={BONE} top={BLOCK.top} front={BLOCK.front} side={BLOCK.side} topContent={<Label text={b.label} w={b.w - 24} />} />
                </At>
              );
            })}

          {/* act 3: requests, replicas, floor type */}
          {act3 && f < T.lock && <Streaks />}
          {act3 &&
            REPLICAS.map((r, i) => {
              if (f < r.f || f > r.sinkAt + 12) return null;
              const up = springAt(f, fps, r.f, springs.card);
              const sink = accel(f, r.sinkAt, 12, 1.5);
              const h = Math.max(1, 300 * mix(up, 0, 1) * (1 - sink));
              return (
                <At key={i} x={r.x} y={r.y}>
                  <Box w={200} d={200} h={h} color={BONE} top={BLOCK.top} front={SUN} side={AMBER} topContent={<Label text={`REPLICA ${String(r.n).padStart(2, '0')}`} size={19} />} />
                </At>
              );
            })}
          {act3 && f >= T.wall && f < T.zero && (
            <FloorType>
              <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                <Odometer value={64} from={1} start={T.wall} dur={24} style={{ color: SUN }} />
                <span style={{ marginLeft: 36 }}>
                  <Words text="replicas." times={[T.wall + 6]} arrive="cut" style={{ color: BONE }} />
                </span>
              </span>
            </FloorType>
          )}
          {act3 && f >= T.zero && (
            <FloorType out={at(f, T.lock - 6, 8, ease.in)}>
              <Build words={['Zero', 'when', 'idle.']} times={[T.zero, B.half(531), B.at(36)]} born={SUN} settle={14} style={floorStyle} />
            </FloorType>
          )}

          {/* the hero block: the model; its top face becomes the terminal, its lit front face carries the load */}
          {(!act3 || f < T.lock) && (
            <At x={960} y={540} z={heroZ}>
              <Box
                w={300}
                d={300}
                h={heroH}
                color={BONE}
                top={PAPER}
                front={act3 ? heroFront : BLOCK.front}
                side={act3 ? (idle > 0.5 ? BLOCK.side : AMBER) : BLOCK.side}
                topContent={act3 ? <Label text="LLAMA-3.1-70B" size={22} /> : f >= T.sink + 4 ? <TermFace /> : <ModelFace />}
                frontContent={act3 ? <ReqFace idle={idle} /> : undefined}
              />
            </At>
          )}
          {act3 &&
            f >= T.lock &&
            pieces.map((p, i) => (
              <At key={i} x={960 + mix(split, 0, p.x)} y={540 + mix(split, 0, p.y)}>
                <Box w={mix(split, 300, p.w)} d={mix(split, 300, p.d)} h={mix(split, 420, p.h)} color={BONE} top={i === 0 ? (split > 0.4 ? SUN : PAPER) : PAPER} front={p.front} side={p.side} />
              </At>
            ))}
        </AbsoluteFill>
      </Camera>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the surfaces: the endpoint, used inside other products
const code: React.CSSProperties = { fontFamily: fonts.mono, fontSize: 40, whiteSpace: 'pre' };
const S1: React.FC = () => (
  <PartnerSurface
    t={sui}
    brand="jupyter"
    kind="doc"
    title="serve.ipynb"
    w={1520}
    h={640}
    size={42}
    landAt={T.lit1}
    items={[
      { f: T.rise + 6, text: <span style={code}>import forge</span> },
      { f: T.rise + 11, text: <span style={code}>llama = forge.model(<span style={{ color: GRAPHITE }}>"llama-3.1-70b"</span>)</span> },
      { f: T.rise + 16, text: <span style={code}>llama.chat(<span style={{ color: GRAPHITE }}>"Summarise PR #482"</span>)</span> },
      {
        f: T.lit1,
        text: (
          <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 40 }}>
            <span>→ “Adds retries to the payment webhook.”</span>
            <span style={{ ...code, color: GRAPHITE }}>84 ms</span>
          </span>
        ),
      },
    ]}
  />
);
const Check: React.FC<{ text: React.ReactNode; meta: string; lit?: boolean }> = ({ text, meta, lit }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
    <Icon name="CircleCheck" size={44} color={lit ? AMBER : INK} stroke={2.4} />
    <span style={{ flex: 1, fontWeight: lit ? 650 : 450 }}>{text}</span>
    <span style={{ fontFamily: fonts.mono, fontSize: 34, color: GRAPHITE }}>{meta}</span>
  </span>
);
const S2: React.FC = () => (
  <PartnerSurface
    t={sui}
    brand="github"
    kind="doc"
    title="acme/support-bot · PR #482 · checks"
    w={1520}
    h={640}
    size={42}
    landAt={T.lit2}
    items={[
      { f: T.s2 + 4, text: <Check text="lint" meta="12 s" /> },
      { f: T.s2 + 8, text: <Check text="unit tests · 212 passed" meta="1m 04s" /> },
      { f: T.s2 + 11, text: <Check text="e2e · checkout flow" meta="2m 31s" /> },
      { f: T.lit2, text: <Check text="forge / preview · llama-3.1-70b live" meta="41 s" lit /> },
    ]}
  />
);
const S3: React.FC = () => (
  <PartnerSurface
    t={sui}
    brand="discord"
    kind="chat"
    title="#ml-infra"
    w={1520}
    h={640}
    size={42}
    landAt={T.lit3}
    items={[
      { f: T.s3 + 4, who: 'Maya Chen', text: 'is the 70B up yet?', meta: '10:41', color: '#7A6A58' },
      { f: T.lit3, who: 'forge', text: 'llama-3.1-70b is live · api.forge.dev/v1/llama', meta: 'APP · 10:42', color: AMBER },
      { f: T.lit3 + 13, who: 'Dev Okafor', text: 'ship it', meta: '10:42', color: '#4F5B66' },
    ]}
  />
);

const SURF_CAM: CamKey[] = [
  { f: T.rise, zoom: 1.1, rx: 0, x: 0, y: -30 },
  { f: T.s2 - 2, zoom: 1.16, rx: 3, ry: -2, x: 0, y: -40, curve: ease.glide },
  { f: T.lit2 + 2, zoom: 1.55, rx: 0, ry: 0, x: -230, y: 150, curve: ease.out },
  { f: T.s3 - 4, zoom: 1.62, x: -200, y: 160, curve: ease.glide },
  { f: T.s3 + 12, zoom: 1.04, rx: 12, ry: -7, x: 0, y: -40, curve: ease.out },
  { f: T.up + 16, zoom: 1.1, rx: 15, ry: -9, x: 0, y: -40, curve: ease.glide },
];

const Surfaces: React.FC = () => {
  const f = useCurrentFrame();
  const out = accel(f, T.up, 14, 1.45);
  const arrive = at(f, T.rise, 13, ease.out);
  return (
    <AbsoluteFill style={{ background: f >= T.s1 && f < T.face ? SUN : 'transparent' }}>
      <AbsoluteFill style={{ transform: `translateY(${-out * 1500}px)`, filter: out > 0.02 ? `blur(${out * 16}px)` : undefined }}>
        <Camera keys={SURF_CAM} perspective={2400}>
          <AbsoluteFill style={{ transform: `translateY(${mix(arrive, 520, 0)}px) scale(${mix(arrive, 0.9, 1)})`, filter: `blur(${landBlur(f, T.rise, 5, 5)}px)` }}>
            <DepthStack
              x={960}
              y={560}
              rise={200}
              push={7}
              items={[
                { f: T.rise, node: <S1 /> },
                { f: T.s2, node: <S2 /> },
                { f: T.s3, node: <S3 /> },
              ]}
            />
          </AbsoluteFill>
        </Camera>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the lockup type (the mark is the hero, split)
const LockType: React.FC = () => {
  const f = useCurrentFrame();
  const w = at(f, T.lock + 8, 16, ease.out);
  // the type rides the camera's last creep, so mark and name stay one lockup
  const grow = camAt(f, ACT3).zoom / 1.1;
  return (
    <AbsoluteFill style={{ transformOrigin: '635px 540px', transform: `scale(${Math.max(1, grow)})` }}>
      <div style={{ position: 'absolute', left: 880, top: 540 - 0.56 * 250, overflow: 'hidden', paddingBottom: 24 }}>
        <div style={{ ...display, color: BONE, fontSize: 250, lineHeight: 1, transform: `translateX(${mix(w, -90, 0)}px)`, clipPath: `inset(-10% ${mix(w, 100, -2)}% -20% 0)` }}>Forge</div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 780, textAlign: 'center', ...display, fontWeight: 520, letterSpacing: '-0.02em', fontSize: 56, color: '#B4AFA4' }}>
        <Words text="Run any model. One command." times={[T.lock + 18, T.lock + 21, T.lock + 24, T.lock + 29, T.lock + 32]} arrive="cut" born={SUN} settle={12} style={{ color: '#B4AFA4' }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 880, textAlign: 'center', ...mono, color: SUN, fontSize: 32, opacity: f >= T.lock + 36 ? 1 : 0 }}>forge.dev</div>
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
    ...CITY.filter((_, i) => i % 2 === 0).map((b, i) => ({ at: b.f + 2, ...s['mixkit-2568'], volume: 0.2, rate: 0.88 + (i % 5) * 0.06 })),
    { at: T.sink + 4, ...s['mixkit-175'], volume: 0.35 },
    { at: T.term - 8, ...s['mixkit-1492'], volume: 0.45 },
    { at: T.term, ...s['mixkit-784'], volume: 0.4, maxS: 1 },
    ...KEYS.filter((_, i) => i % 2 === 0).map((k, i) => ({ at: Math.ceil(k), ...s['mixkit-2533'], volume: 0.22, rate: 0.92 + (i % 4) * 0.05 })),
    { at: T.enter, ...s['mixkit-2299'], volume: 0.7 },
    { at: T.enter, ...s['mixkit-3124'], volume: 0.45 },
    ...T.outs.map((o) => ({ at: o + 10, ...s['mixkit-1049'], volume: 0.32 })),
    { at: T.url, ...s['mixkit-2384'], volume: 0.3 },
    { at: T.s1, ...s['mixkit-168'], volume: 0.45 },
    { at: T.s1, ...s['mixkit-2299'], volume: 0.55 },
    { at: T.s2, ...s['mixkit-175'], volume: 0.3 },
    { at: T.s3, ...s['mixkit-175'], volume: 0.3 },
    { at: T.lit1, ...s['mixkit-3000'], volume: 0.32 },
    { at: T.lit2, ...s['mixkit-3000'], volume: 0.32 },
    { at: T.lit3, ...s['mixkit-2867'], volume: 0.35 },
    { at: T.up + 8, ...s['mixkit-1492'], volume: 0.4 },
    { at: T.block, ...s['mixkit-2299'], volume: 0.5 },
    { at: T.wall, ...s['mixkit-2299'], volume: 0.5 },
    ...REPLICAS.filter((_, i) => i % 4 === 0).map((r, i) => ({ at: r.f + 2, ...s['mixkit-2568'], volume: 0.14, rate: 0.9 + (i % 4) * 0.06 })),
    { at: T.zero + 4, ...s['mixkit-784'], volume: 0.3, maxS: 1 },
    { at: T.lock, ...s['mixkit-2299'], volume: 0.9 },
    { at: T.lock + 12, ...s['mixkit-3124'], volume: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: INK }}>
      {f < T.term && <World />}
      {f >= T.term && f < T.s1 + 2 && <Flood from={chipBox} start={T.flood} dur={9} color={SUN} under={<Term />} />}
      {f >= T.face && <World />}
      {f >= T.rise && f < T.up + 16 && <Surfaces />}
      {f >= T.lock + 8 && <LockType />}
      <Grain amount={0.045} />
      <Music src="music/tech-house-vibes.mp3" startFrom={28.1} volume={0.5} enterAt={T.land} breaths={[T.term, T.lock]} breathLen={7} duck={[T.enter, T.s1, T.lock]} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const forgeDuration = T.end;
