// "Forge": run any model, one command. 18.3 s at 30 fps. An invented product (deploy any AI model with one command).
// World: an isometric city of bone blocks on an ink floor with a faint grid, mono labels printed on the faces, type set
// on the floor plane, one yellow accent that means "live". Three grounds, each cut carried by an object: ink (the
// world), paper (the hero block's top face is the terminal: the dive lands in it), sun (the live endpoint floods the
// frame, and the pull-back reveals the sun was the block's lit face). Integrations are a relay: the endpoint chip lifts
// off the log and stays put while the host changes around it on the beat (a notebook in macro on sun, the pull request's
// checks on ink, the team chat as a tilted paper plane), every host full-bleed. The spectacle: 64 replicas rise and the
// camera travels through the field. The lockup is the hero block splitting into the mark.
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
  camSmear,
  clamp,
  creep,
  Cues,
  ease,
  Flood,
  fonts,
  Grain,
  GridLines,
  Icon,
  landBlur,
  logScale,
  Marker,
  mix,
  Music,
  Odometer,
  onTwos,
  rand,
  shake,
  Spinner,
  springAt,
  springs,
  typingTimes,
  Words,
  type CamKey,
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
  typed: 145, // two words typed, the model name lands in one burst
  enter: B.at(11), // 170
  outs: [177, 185, 193, 201],
  url: 211,
  flood: 220, // the URL chip lifts off the log and the sun floods out of it; full sun on 229
  // the relay: the chip stays put, the host changes around it on the beat, each on one of the world's grounds
  hA: B.at(15), // 229: a notebook, macro, on sun
  hB: B.at(16.5), // 251: the pull request's checks, full-ui, on ink
  hC: B.at(18), // 273: the team chat, a tilted plane, on paper
  up: B.at(19.5), // 295: the chat leaves, the world returns under it
  face: 293,
  block: B.at(22.5), // 339
  push: 358,
  wall: B.at(26.5), // 398: the replica field, 2.2 s with the camera travelling through it
  zero: B.at(31), // 465
  lock: B.at(33), // 494
  end: 550,
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

// ---------------------------------------------------------------- the command: "forge deploy " typed, the model name lands in one burst
const CMD = 'forge deploy llama-3.1-70b';
const CPS = 24;
const KEYS = typingTimes(CMD, T.typed, 30, CPS, 3, 2);
const shownAt = (f: number) => KEYS.filter((k) => f >= k).length;
/** Characters typed at frame f, fractional toward the next keystroke. */
const typedRaw = (f: number) => {
  const n = shownAt(f);
  if (n === 0 || n >= KEYS.length) return n;
  const a = KEYS[n - 1];
  const b = KEYS[n];
  return n + (b > a ? clamp((f - a) / (b - a)) : 0);
};
/** The caret the camera follows: averaged over 10 frames, so the burst is a quick glide, not a jump. */
const typedAt = (f: number) => {
  let s = 0;
  for (let k = 0; k < 10; k++) s += typedRaw(f - k);
  return s / 10;
};

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
// the replicas are lit from above: a bright top edge, faces darkening toward the floor
const REP_TOP = 'linear-gradient(160deg, #FFFFFF 0%, #F4F1E8 100%)';
const REP_FRONT = `linear-gradient(180deg, #FFD862 0%, ${SUN} 38%, #DDA11C 100%)`;
const REP_SIDE = 'linear-gradient(180deg, #E8AE27 0%, #A97810 100%)';
const ACT3: CamKey[] = [
  { f: T.face, rx: 86, rz: -6, zoom: 7.2, x: 0, y: 150 },
  { f: T.block, rx: 62, rz: -32, zoom: 1.75, x: 0, y: 90, curve: ease.out },
  { f: T.push - 6, rx: 64, rz: -21, zoom: 1.95, x: 0, y: 100, curve: ease.glide },
  { f: T.wall - 4, rx: 76, rz: -14, zoom: 2.5, x: 0, y: 150, curve: ease.inOut },
  // the spectacle: a fast pull-back that stays low, inside the field as it rises; then the camera travels through the
  // towers on an orbit, and rises at the end to see all 64 at once
  { f: T.wall + 12, rx: 72, rz: -24, zoom: 1.25, x: -60, y: 260, curve: ease.out },
  { f: T.wall + 42, rx: 70, rz: -62, zoom: 1.35, x: -420, y: -60, curve: ease.inOut },
  { f: T.zero - 2, rx: 56, rz: -47, zoom: 0.64, x: 40, y: 200, curve: ease.inOut },
  { f: T.zero + 10, rx: 56, rz: -47, zoom: 0.66, x: 40, y: 200, curve: ease.glide },
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
  const smear = act3 && f > T.wall - 6 && f < T.lock ? camSmear(f, ACT3, 0.5, 7) : 0;

  return (
    <AbsoluteFill style={{ transform: camShake, filter: smear > 0.3 ? `blur(${smear.toFixed(2)}px)` : undefined }}>
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
                  <Box w={200} d={200} h={h} color={BONE} top={REP_TOP} front={REP_FRONT} side={REP_SIDE} edge="rgba(255,248,225,0.32)" shadow={0.55} topContent={<Label text={`REPLICA ${String(r.n).padStart(2, '0')}`} size={19} />} />
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
              <Build words={['Zero', 'when', 'idle.']} times={[T.zero, B.at(31.5), B.at(32)]} born={SUN} settle={14} style={floorStyle} />
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

// ---------------------------------------------------------------- the relay: the endpoint stays, the host changes around it
// The chip (the URL the log printed) lifts off the terminal as the sun floods out of it, flies up to its spot and stays
// there for three hosts. Every host is laid out around that spot and moves by scale and tilt pivoted on it, so the chip
// never jumps at a cut. Each host takes one of the world's grounds and bleeds off the frame.
const CHIP = 'api.forge.dev/v1/llama';
const CHIP_FS = 60;
const CHIP_W = CHIP.length * CHIP_FS * CW + CHIP_FS * 0.7;
const CHIP_H = CHIP_FS * 1.5;
const AX = 1340; // the chip's centre, the same on every host
const AY = 560;
const L_EDGE = AX - CHIP_W / 2 - 22; // text left of the chip ends here
const R_EDGE = AX + CHIP_W / 2 + 22; // text right of the chip starts here
const A_MACRO = 1.35; // the notebook's opening zoom on the chip
const pivot = (s: number, pre = ''): React.CSSProperties => ({ transformOrigin: `${AX}px ${AY}px`, transform: `${pre} scale(${s})` });

/** The artefact: a sun slab with a lit top, an amber underside and a shadow that grows with `lift`. */
const Chip: React.FC<{ lift?: number; rim?: number; glow?: number; x?: number; y?: number; s?: number }> = ({ lift = 0, rim = 1, glow = 0, x = AX, y = AY, s = 1 }) => (
  <div
    style={{
      position: 'absolute',
      left: x - CHIP_W / 2,
      top: y - CHIP_H / 2,
      width: CHIP_W,
      height: CHIP_H,
      borderRadius: 12,
      background: `linear-gradient(180deg, #FFDA6E 0%, ${SUN} 42%, #F4B41E 100%)`,
      boxShadow: [
        'inset 0 2px 0 rgba(255,255,255,0.7)',
        `inset 0 -4px 0 ${AMBER}`,
        `0 0 0 ${(3 * rim).toFixed(2)}px ${INK}`,
        `0 ${8 + lift * 34}px ${16 + lift * 46}px rgba(46,28,0,${(0.3 + 0.16 * lift).toFixed(3)})`,
        `0 0 ${60 + 40 * glow}px rgba(255,197,49,${(0.5 * glow).toFixed(3)})`,
      ].join(', '),
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: fonts.mono,
      fontWeight: 500,
      fontSize: CHIP_FS,
      color: INK,
      whiteSpace: 'pre',
      transform: `translateY(${-lift * 14}px) scale(${s})`,
    }}
  >
    {CHIP}
  </div>
);

/** The chip lands in each host: lifted on the cut, settled 8 frames later. */
const landLift = (f: number, start: number, from = 0.7) => from * (1 - at(f, start, 9, ease.out));
/** Each host arrives with a small settle, so the cut lands like a push. */
const settle = (f: number, start: number, amt = 0.05) => 1 + amt * (1 - at(f, start, 8, ease.out));

const codeStyle: React.CSSProperties = { fontFamily: fonts.mono, fontWeight: 500, fontSize: CHIP_FS, color: INK, whiteSpace: 'pre', position: 'absolute', lineHeight: 1 };
const gutter: React.CSSProperties = { fontFamily: fonts.mono, fontSize: 30, color: '#8A660C', position: 'absolute', left: 64, whiteSpace: 'pre' };

/** Host A, macro on sun: the notebook's active cell, code at the chip's own size, cropped by the frame. */
const HostNotebook: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - T.hA;
  // the chip lands in macro (1.35x) and the camera pulls back off it to show the notebook; the page behind
  // travels further than the chip's cell, so the two planes separate
  const q = ease.out(clamp(t / 20));
  const front = mix(q, A_MACRO, 1) * (1 + 0.02 * clamp((t - 20) / 4));
  const back = mix(q, A_MACRO * 1.2, 1) * (1 + 0.012 * clamp((t - 20) / 4));
  const out1 = at(f, T.hA + 5, 6, ease.out);
  const out2 = at(f, T.hA + 11, 6, ease.out);
  const y = (base: number) => base - CHIP_FS / 2;
  return (
    <AbsoluteFill style={{ background: SUN, overflow: 'hidden' }}>
      {/* back plane: the notebook around the cell */}
      <AbsoluteFill style={pivot(back)}>
        <div style={{ position: 'absolute', left: 64, top: 70, display: 'flex', alignItems: 'center', gap: 22 }}>
          <Brand name="jupyter" size={58} />
          <span style={{ ...mono, fontSize: 34, color: INK, textTransform: 'none', letterSpacing: '0.01em' }}>serve.ipynb</span>
          <span style={{ ...mono, fontSize: 26, color: '#8A660C', marginLeft: 28 }}>Python 3 · forge 1.4.2</span>
        </div>
        <div style={{ position: 'absolute', left: -40, right: -40, top: 150, height: 2, background: 'rgba(14,14,16,0.16)' }} />
        <div style={{ ...gutter, top: y(330) + 14 }}>[1]:</div>
        <div style={{ ...codeStyle, left: 190, top: y(330) }}>import forge</div>
        <div style={{ ...gutter, top: y(790) + 14, opacity: out1 > 0 ? 1 : 0 }}>[3]:</div>
        <div style={{ ...codeStyle, left: 190, top: y(790), opacity: out1 > 0 ? 1 : 0, transform: `translateY(${mix(out1, 30, 0)}px)` }}>
          llm.chat(<span style={{ color: '#7A5A08' }}>"Summarise PR #482"</span>)
        </div>
        <div style={{ position: 'absolute', left: 190, right: 120, top: 900, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', opacity: out2 > 0 ? 1 : 0, transform: `translateY(${mix(out2, 30, 0)}px)` }}>
          <span style={{ ...display, fontWeight: 520, letterSpacing: '-0.02em', fontSize: 58, color: INK }}>→ “Adds retries to the payment webhook.”</span>
          <span style={{ fontFamily: fonts.mono, fontSize: 44, color: '#7A5A08' }}>84 ms</span>
        </div>
      </AbsoluteFill>
      {/* front plane: the active cell, the chip's line */}
      <AbsoluteFill style={pivot(front)}>
        <div style={{ position: 'absolute', left: -60, right: -60, top: AY - 115, height: 230, background: 'rgba(255,248,222,0.42)', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.6), 0 18px 40px -20px rgba(120,80,0,0.45)' }} />
        <div style={{ position: 'absolute', left: 0, width: 12, top: AY - 115, height: 230, background: INK }} />
        <div style={{ ...gutter, top: AY - 16 }}>[2]:</div>
        <div style={{ ...codeStyle, right: 1920 - L_EDGE, top: AY - CHIP_FS / 2 }}>llm = forge.connect(</div>
        <div style={{ ...codeStyle, left: R_EDGE, top: AY - CHIP_FS / 2 }}>)</div>
        <Chip lift={landLift(f, T.hA, 1)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host B, full-ui on ink: the pull request's checks, the forge row lit, the finished rows sliding up behind it. */
const CHECKS = [
  { text: 'typecheck', meta: '31 s' },
  { text: 'unit tests · 212 passed', meta: '1m 04s' },
  { text: 'e2e · checkout flow', meta: '2m 31s' },
];
const ROW = 118;
const HostChecks: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - T.hB;
  const s = settle(f, T.hB, 0.05) * (1 + 0.04 * ease.glide(clamp(t / 24)));
  // the finished rows step up on twos as the forge row lands: the list is a moving surface
  const scroll = mix(ease.out(clamp(onTwos(t) / 16)), 0, -64);
  const rowText: React.CSSProperties = { fontFamily: fonts.geist, fontSize: 46, color: BONE, letterSpacing: '-0.01em' };
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden' }}>
      <AbsoluteFill style={pivot(s)}>
        <GridLines size={80} color="rgba(242,240,234,0.05)" start={-30} reveal={1} />
        {/* back plane: header and the finished checks */}
        <AbsoluteFill style={{ transform: `translateY(${scroll}px)` }}>
          <div style={{ position: 'absolute', left: 110, top: 70, display: 'flex', alignItems: 'center', gap: 26 }}>
            <Brand name="github" size={64} color={BONE} />
            <span style={{ ...display, fontSize: 60, color: BONE }}>All checks have passed</span>
            <span style={{ ...mono, fontSize: 28, color: STONE, marginLeft: 20 }}>acme/support-bot · PR #482</span>
          </div>
          {CHECKS.map((c, i) => {
            const yy = AY - (CHECKS.length - i) * ROW;
            return (
              <React.Fragment key={i}>
                <div style={{ position: 'absolute', left: -40, right: -40, top: yy + ROW / 2, height: 1.5, background: 'rgba(242,240,234,0.12)' }} />
                <div style={{ position: 'absolute', left: 110, top: yy - 30, display: 'flex', alignItems: 'center', gap: 30 }}>
                  <Icon name="CircleCheck" size={58} color={STONE} stroke={2.2} />
                  <span style={{ ...rowText, color: '#CFCBC1' }}>{c.text}</span>
                </div>
                <div style={{ ...mono, position: 'absolute', right: 120, top: yy - 18, fontSize: 32, color: STONE }}>{c.meta}</div>
              </React.Fragment>
            );
          })}
        </AbsoluteFill>
        {/* front plane: the forge row, lit, full-bleed */}
        <div style={{ position: 'absolute', left: -40, right: -40, top: AY - ROW / 2, height: ROW, background: 'linear-gradient(90deg, rgba(255,197,49,0.16), rgba(255,197,49,0.04))', boxShadow: `inset 0 1.5px 0 rgba(255,197,49,0.5), inset 0 -1.5px 0 rgba(255,197,49,0.5)` }} />
        <div style={{ position: 'absolute', left: 0, width: 12, top: AY - ROW / 2, height: ROW, background: SUN }} />
        <div style={{ position: 'absolute', left: 110, top: AY - 31, display: 'flex', alignItems: 'center', gap: 30 }}>
          <Spinner start={T.hB - 4} doneAt={T.hB + 6} size={60} color={STONE} done={SUN} stroke={4} />
          <span style={{ ...rowText, fontWeight: 650 }}>forge / preview</span>
        </div>
        <div style={{ ...mono, position: 'absolute', left: 110, top: AY + ROW / 2 + 36, fontSize: 30, color: STONE }}>llama-3.1-70b · 8 × H100 · deployed in 41 s</div>
        <div style={{ position: 'absolute', left: 110, top: AY + ROW / 2 + 130, padding: '22px 40px', borderRadius: 14, background: SUN, color: INK, ...display, fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', boxShadow: `inset 0 2px 0 rgba(255,255,255,0.6), inset 0 -4px 0 ${AMBER}` }}>Merge pull request</div>
        {/* the deployment record under the merge box, bleeding off the bottom */}
        <div style={{ position: 'absolute', left: -40, right: -40, top: 905, height: 1.5, background: 'rgba(242,240,234,0.12)' }} />
        <div style={{ position: 'absolute', left: 110, top: 950, display: 'flex', alignItems: 'center', gap: 26, whiteSpace: 'nowrap' }}>
          <Brand name="github" size={44} color={STONE} />
          <span style={{ ...rowText, fontSize: 40, color: '#CFCBC1' }}>forge-bot deployed to <b style={{ color: BONE }}>preview</b></span>
          <span style={{ ...mono, fontSize: 26, color: INK, background: SUN, borderRadius: 8, padding: '6px 14px' }}>Active</span>
          <span style={{ ...mono, fontSize: 28, color: STONE }}>10:42 · 8 × H100 · us-east-1</span>
        </div>
        <Chip lift={landLift(f, T.hB, 0.6)} rim={0} glow={1 - 0.6 * at(f, T.hB, 14, ease.out)} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host C, a tilted paper plane: the team channel, the forge app's message holding the chip, "ship it" landing under it. */
const HostChat: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - T.hC;
  const p = ease.glide(clamp(t / 30));
  const rx = mix(p, 20, 9);
  const rz = mix(p, -4, -2);
  const s = settle(f, T.hC, 0.03) * mix(p, 1.08, 1.16);
  const ship = at(f, T.hC + 12, 7, ease.out);
  const lift = (n: number) => `translateY(${-ship * 22 * n}px)`;
  const nameStyle: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 650, fontSize: 42, color: INK };
  const meta: React.CSSProperties = { fontFamily: fonts.geist, fontSize: 30, color: GRAPHITE, marginLeft: 18 };
  const body: React.CSSProperties = { fontFamily: fonts.geist, fontSize: 52, color: INK, letterSpacing: '-0.01em', whiteSpace: 'nowrap' };
  const Av: React.FC<{ y: number; bg: string; ch: string; fg?: string }> = ({ y, bg, ch, fg = PAPER }) => (
    <div style={{ position: 'absolute', left: 90, top: y, width: 96, height: 96, borderRadius: 48, background: bg, color: fg, display: 'flex', alignItems: 'center', justifyContent: 'center', ...display, fontSize: 40 }}>{ch}</div>
  );
  return (
    <AbsoluteFill style={{ background: SUN, overflow: 'hidden', perspective: 1900, perspectiveOrigin: `${AX}px ${AY}px` }}>
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', ...pivot(s, `rotateX(${rx}deg) rotateZ(${rz}deg)`) }}>
        {/* the plane, much larger than the frame so its edges never show */}
        <div style={{ position: 'absolute', left: -1400, top: -1800, width: 4800, height: 4400, background: PAPER, boxShadow: 'inset 0 0 0 2px rgba(14,14,16,0.06)' }} />
        {/* channel bar */}
        <div style={{ position: 'absolute', left: -900, width: 3800, top: 40, height: 130, background: '#F1EEE5', borderBottom: '2px solid rgba(14,14,16,0.08)' }} />
        <div style={{ position: 'absolute', left: 90, top: 70, display: 'flex', alignItems: 'center', gap: 24 }}>
          <Brand name="discord" size={66} />
          <span style={{ ...display, fontSize: 54, color: INK }}># ml-infra</span>
          <span style={{ fontFamily: fonts.geist, fontSize: 32, color: GRAPHITE, marginLeft: 14 }}>model serving, deploys</span>
        </div>
        {/* the earlier message */}
        <div style={{ transform: lift(1) }}>
          <Av y={250} bg="#7A6A58" ch="M" />
          <div style={{ position: 'absolute', left: 220, top: 250, display: 'flex', alignItems: 'baseline' }}>
            <span style={nameStyle}>Maya Chen</span>
            <span style={meta}>10:41</span>
          </div>
          <div style={{ ...body, position: 'absolute', left: 220, top: 304 }}>is the 70B up yet?</div>
        </div>
        {/* the forge app's message: the chip is its link */}
        <div style={{ transform: lift(1), transformStyle: 'preserve-3d' }}>
          <div style={{ position: 'absolute', left: -900, width: 3800, top: AY - 120, height: 200, background: 'rgba(255,197,49,0.13)', borderLeft: `0 solid ${SUN}` }} />
          <Av y={AY - 98} bg={INK} ch="" />
          <div style={{ position: 'absolute', left: 117, top: AY - 71, width: 42, height: 42, borderRadius: 6, background: SUN, boxShadow: `inset 0 -5px 0 ${AMBER}` }} />
          <div style={{ position: 'absolute', left: 220, top: AY - 100, display: 'flex', alignItems: 'baseline' }}>
            <span style={nameStyle}>forge</span>
            <span style={{ ...mono, fontSize: 22, color: PAPER, background: INK, borderRadius: 6, padding: '3px 9px', marginLeft: 14, position: 'relative', top: -6 }}>APP</span>
            <span style={meta}>10:42</span>
          </div>
          <div style={{ ...body, position: 'absolute', right: 1920 - L_EDGE, top: AY - 30 }}>llama-3.1-70b is live at</div>
          <div style={{ transform: `translateZ(${8 + 30 * landLift(f, T.hC, 0.7)}px)` }}>
            <Chip lift={landLift(f, T.hC, 0.7)} />
          </div>
        </div>
        {/* the reply lands under it */}
        <div style={{ opacity: ship > 0 ? 1 : 0, transform: `translateY(${mix(ship, 60, 0) - ship * 22}px)` }}>
          <Av y={720} bg="#4F5B66" ch="D" />
          <div style={{ position: 'absolute', left: 220, top: 720, display: 'flex', alignItems: 'baseline' }}>
            <span style={nameStyle}>Dev Okafor</span>
            <span style={meta}>10:42</span>
          </div>
          <div style={{ ...body, position: 'absolute', left: 220, top: 774 }}>ship it</div>
        </div>
        {/* the composer, bleeding off the bottom */}
        <div style={{ position: 'absolute', left: 90, right: -400, top: 960, height: 110, borderRadius: 20, background: '#EEEAE0', display: 'flex', alignItems: 'center', paddingLeft: 40, fontFamily: fonts.geist, fontSize: 40, color: '#A29D91' }}>Message #ml-infra</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The flight: the chip lifts off the log while the sun floods out of it, and lands on its spot for the relay. */
const ChipFlight: React.FC = () => {
  const f = useCurrentFrame();
  const p = at(f, T.flood, T.hA - T.flood, ease.inOut);
  const s0 = (OUT_FS * termCam(T.flood).s) / CHIP_FS;
  return <Chip x={mix(p, chipBox.x, AX)} y={mix(p, chipBox.y, AY)} s={mix(p, s0, A_MACRO)} lift={ease.out(clamp(p * 1.4))} rim={p} />;
};

const Relay: React.FC = () => {
  const f = useCurrentFrame();
  const out = accel(f, T.up, 14, 1.45);
  return (
    <AbsoluteFill style={{ background: f < T.face ? SUN : 'transparent' }}>
      <AbsoluteFill style={{ transform: `translateY(${-out * 1500}px)`, filter: out > 0.02 ? `blur(${out * 16}px)` : undefined }}>
        {f < T.hB ? <HostNotebook /> : f < T.hC ? <HostChecks /> : <HostChat />}
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
    // one tick per typed key (every other one), and one firmer tick when the model name lands in its burst
    ...[...new Set(KEYS)].filter((_, i) => i % 2 === 0).map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.22, rate: 0.92 + (i % 4) * 0.05 })),
    { at: KEYS[KEYS.length - 1], ...s['mixkit-2533'], volume: 0.34, rate: 0.85 },
    { at: T.enter, ...s['mixkit-2299'], volume: 0.7 },
    { at: T.enter, ...s['mixkit-3124'], volume: 0.45 },
    ...T.outs.map((o) => ({ at: o + 10, ...s['mixkit-1049'], volume: 0.32 })),
    { at: T.url, ...s['mixkit-2384'], volume: 0.3 },
    // the relay: the flood and the chip's flight, then one hard cut per host with the chip landing
    { at: T.flood, ...s['mixkit-168'], volume: 0.45 },
    { at: T.hA, ...s['mixkit-2299'], volume: 0.55 },
    { at: T.hA + 11, ...s['mixkit-3000'], volume: 0.3 },
    { at: T.hB, ...s['mixkit-2299'], volume: 0.42 },
    { at: T.hB + 6, ...s['mixkit-1049'], volume: 0.32 },
    { at: T.hC, ...s['mixkit-2299'], volume: 0.42 },
    { at: T.hC + 12, ...s['mixkit-2867'], volume: 0.35 },
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
      {f >= T.term && f < T.hA && <Flood from={chipBox} start={T.flood} dur={T.hA - T.flood} color={SUN} under={<Term />} />}
      {f >= T.flood && f < T.hA && <ChipFlight />}
      {f >= T.face && <World />}
      {f >= T.hA && f < T.up + 16 && <Relay />}
      {f >= T.lock + 8 && <LockType />}
      <Grain amount={0.045} />
      <Music src="music/tech-house-vibes.mp3" startFrom={28.1} volume={0.5} enterAt={T.land} breaths={[T.term, T.lock]} breathLen={7} duck={[T.enter, T.hA, T.lock]} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const forgeDuration = T.end;
