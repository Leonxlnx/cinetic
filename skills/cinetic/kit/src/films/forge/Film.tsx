// "Forge": run any model, one command. 16.1 s (484 f) at 30 fps. An invented product (deploy any AI model with one command).
// World: an isometric city of bone blocks on a lit ink floor with a faint grid, labels printed on the faces, type set on
// the floor plane, one sun-yellow accent that means "live". Geist is the one voice. Three grounds, each reached through
// the block: ink (the world), paper (its top face is the terminal: the dive lands in it), sun (its lit front face, entered
// by a second dive for the proof). The back half was rebuilt after critic 6 and the device audit: no flood, no relay
// through hosts, one spectacle (a cascade) instead of a second wall.
//
// DEVICES (the claim: one command instead of thirty things, and the endpoint it gives carries any load and idles at zero)
// - signature: the block (the model), 5 uses: it drops in (the hook), its top face is the terminal (the dive in and the
//   snap back out), its lit face carries the load (the second dive: the proof), it splits into the mark (the lockup)
// - opening: drop-in, the model's block falls into frame and lands with weight on the bed's first beat
// - text arrivals: an append that re-centres (Build), each word born sun; glyph birth for the wordmark
// - type treatment: type set on a surface: every statement printed on the floor plane, the load printed on the block's face
// - seams: 3-4 the city sinks under the line | 4-5 dive into the top face (signature; ground cut 1, paper) | 6-7 the giant
//   command drops into the log's first line | 7-8 snap back out of the face as the block rises and lights (the dive's
//   return, ink) | 8-9 the load spills into the first replica | 9-10 dive into the lit face (signature, sun) | 10-11 tiles:
//   the face's cells go dark one by one as the count rolls to zero (ground cut 2, sun to ink) | 11-12 the split
// - spectacle: cascade, 31 replicas rising one after another in a spiral round the block, each set off by the one before
//   (gaps 4, 3, 3, 3, 2, 2, 2, 2, then 1 f), the camera riding the front, "32 replicas." stepping on the floor, 2.5 s
// - output-big: the load it carries, "12,480" requests a second at about 330 px on the block's lit face, then the roll to 0
// - integrations: none (the film hinges on the command and the load, not on partners)
// - lockup: glyph birth in light beside the mark: the block splits into the mark's three blocks top-down, one move, and
//   "Forge" is born a letter every 3 f in sun, cooling to bone
// - budget: no flood, no relay; one wall (the thirty chores: the problem is literally a quantity); one odometer (the load,
//   up and back to zero); one spectacle
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
  fonts,
  Grain,
  GridLines,
  Ground,
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
  type Cam,
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
const OFF = '#19181B'; // a face switched off
const BLOCK = { top: PAPER, front: '#D9D5CB', side: '#BDB8AC' };
// code and data in mono, as written (never uppercase, never tracked out); labels in the UI face, sentence case
const mono: React.CSSProperties = { fontFamily: fonts.mono, fontWeight: 500, letterSpacing: '0' };
// one voice: Geist for statements, labels and the UI around them (a developer brand); statements at 520, never heavier
const label: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 540, letterSpacing: '0' };
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 520, letterSpacing: '-0.025em' };

// ---------------------------------------------------------------- the timeline, on the music's beat grid (122 BPM)
const B = beats(122.2, 8);
const T = {
  land: B.at(0), // 8: the hero block lands, the bed enters (the main hit)
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
  // ---- the back half
  out: B.at(14.5), // 222: snap back out of the face; the block rises
  live: B.at(16), // 244: full height, its face lights: live; requests start to arrive
  casc: B.at(18), // 273: the load spills into the first replica (the spectacle, 2.5 s)
  dive2: B.at(23), // 347: from the widest frame, dive into the lit face
  macro: B.at(24), // 362: "12,480" requests a second, giant
  drain: B.at(24.5), // 369: the load drops: the count rolls to 0, the face's cells go dark
  back: B.at(25.5) + 5, // 389: pull back; the replicas sink
  zero: [B.at(26.5), B.at(27), B.at(27.5)], // 398: "Zero when idle."
  lock: B.at(28.5), // 428: the block splits into the mark
  end: 484,
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
  'CUDA 12.4', 'NCCL', 'Drivers 550', 'vLLM', 'Triton', 'Kubernetes', 'Helm chart', 'Autoscaler', 'Load balancer', 'TLS certs',
  'GPU quota', 'Weights 140 GB', 'Tokenizer', 'Request queue', 'KV cache', 'Logs', 'Metrics', 'Secrets', 'Batching', 'Retries',
  'Rate limits', 'Health checks', 'Dockerfile', 'CDN', 'Alerts', 'Spot fallback', 'Quantization', 'Sharding', 'Warm pool', 'Billing',
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

// ---------------------------------------------------------------- the cascade: 31 replicas of the hero in a spiral round it
// Each one rises when the one before it has landed: the gaps compress (4, 3, 3, 3, 2, 2, 2, 2, then 1 f), so the chain
// outruns the eye. The spiral opens toward the camera (the floor lane, where the count is printed, stays clear).
const REP = { w: 170, d: 170, h: 270 };
const GAPS = [4, 3, 3, 3, 2, 2, 2, 2];
const REPS = (() => {
  const out: Array<{ x: number; y: number; th: number; r: number }> = [];
  const r0 = 430;
  const b = 300 / (2 * Math.PI); // the arms 300 px apart
  const PHASE = -2.25; // start behind-left of the block (radians, 0 = +x, the floor's right)
  let th = 0;
  for (let guard = 0; out.length < 31 && guard < 600; guard++) {
    const r = r0 + b * th;
    const a = PHASE + th;
    const x = 960 + r * Math.cos(a);
    const y = 540 + r * Math.sin(a);
    if (!inLane(x, y, REP.w * 0.62, REP.h)) out.push({ x, y, th, r });
    th += 250 / r;
  }
  const last = out.length - 1;
  return out.map((p, i) => ({
    ...p,
    f: T.casc + GAPS.slice(0, i).reduce((a, g) => a + g, 0) + Math.max(0, i - GAPS.length),
    // they sink outside in as the load leaves
    sinkAt: T.back - 2 + Math.round(((last - i) / last) * 12),
  }));
})();
const CHAIN_END = REPS[REPS.length - 1].f;
/** How many replicas have landed at frame f (the hero counts as one). */
const landed = (f: number) => 1 + REPS.filter((r) => f >= r.f + 7).length;

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
/** Size by word count: the five-word line sits smaller than the two- and three-word ones, so it lands whole in the frame. */
const floorFive: React.CSSProperties = { ...floorStyle, fontSize: 142 };
const FloorType: React.FC<{ children: React.ReactNode; out?: number; size?: number }> = ({ children, out = 0, size = 168 }) => (
  <At x={LANE.x} y={LANE.y} z={2} rz={LANE.rot}>
    <div style={{ ...floorStyle, fontSize: size, whiteSpace: 'nowrap', opacity: 1 - out, transform: `translateY(${-out * 120}px)` }}>{children}</div>
  </At>
);

const Label: React.FC<{ text: string; size?: number; color?: string; w?: number }> = ({ text, size = 20, color = '#7D796F', w }) => (
  <div style={{ ...label, fontSize: size, color, position: 'absolute', left: 12, top: 10, width: w, lineHeight: 1.15 }}>{text}</div>
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

// ---------------------------------------------------------------- the hero's faces
const ModelFace: React.FC = () => (
  <>
    <Label text="Model" size={22} />
    <div style={{ ...mono, fontSize: 30, color: INK }}>llama-3.1-70b</div>
    <div style={{ ...mono, fontSize: 18, color: '#7D796F', position: 'absolute', left: 12, bottom: 10 }}>140 GB</div>
  </>
);
/** The terminal, printed on the top face: the full-frame shot at frame `at` (with its camera), scaled to the face. */
const TermFace: React.FC<{ at: number }> = ({ at: f }) => {
  const c = f > T.term ? termCam(f) : { s: 1, tx: 0, ty: 0 };
  return (
    <div style={{ width: 1920, height: 1080, flexShrink: 0, position: 'relative', overflow: 'hidden', transform: `scale(${300 / 1920})` }}>
      <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `translate(${c.tx}px, ${c.ty}px) scale(${c.s})` }}>
        <TermLayout f={f} />
      </AbsoluteFill>
    </div>
  );
};

// The front face carries the load: lit sun while it serves, its cells switching off one by one when the load leaves.
const FACE = { w: 300, h: 420 };
const TCOLS = 6;
const TROWS = 8;
const TILE = { w: FACE.w / TCOLS, h: FACE.h / TROWS };
/** When each cell goes dark: a sweep from the top-left corner with a little scatter, over about 16 frames. */
const tileAt = (c: number, r: number) => T.drain + 1 + Math.round(((c / (TCOLS - 1)) * 0.45 + (r / (TROWS - 1)) * 0.55) * 13 + rand(c * 7 + r * 13 + 2) * 4);
/** The load on the face: climbs as requests arrive, climbs again as the replicas take it, rolls back to zero. */
const LoadCount: React.FC<{ f: number }> = ({ f }) =>
  f < T.casc ? (
    <Odometer value={3120} from={0} start={T.live + 4} dur={28} />
  ) : f < T.drain ? (
    <Odometer value={12480} from={3120} start={T.casc + 2} dur={46} />
  ) : (
    <Odometer value={0} from={12480} start={T.drain} dur={16} curve={ease.inOut} />
  );
const FaceText: React.FC<{ f: number; dark: boolean }> = ({ f, dark }) => {
  const ink = dark ? BONE : INK;
  const sub = dark ? STONE : GRAPHITE;
  // the small labels show only while the face is large on screen (never a label under 28 px in the wide frames)
  const z = f >= T.out ? cam3(f).zoom : 2;
  const small: React.CSSProperties = { opacity: clamp((z - 0.95) / 0.35) };
  return (
    <>
      <div style={{ ...mono, ...small, fontSize: 19, color: sub, position: 'absolute', left: 16, top: 16, whiteSpace: 'nowrap' }}>api.forge.dev/v1/llama</div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 148, textAlign: 'center', color: ink }}>
        <div style={{ ...display, fontWeight: 620, letterSpacing: '-0.02em', fontSize: 80, lineHeight: 1 }}>
          <LoadCount f={f} />
        </div>
        <div style={{ ...label, ...small, fontWeight: 500, fontSize: 25, marginTop: 12, color: ink }}>requests a second</div>
      </div>
      <div style={{ ...label, ...small, fontSize: 21, position: 'absolute', left: 16, bottom: 16, color: sub }}>p50 84 ms</div>
      <div style={{ ...label, ...small, fontSize: 21, position: 'absolute', right: 16, bottom: 16, color: sub }}>{dark ? 'idle' : 'live'}</div>
    </>
  );
};
const LoadFace: React.FC<{ lit: number }> = ({ lit }) => {
  const f = useCurrentFrame();
  // the dark cells: one clip path of every cell that has switched off (each grows from its centre over 3 frames)
  let path = '';
  if (f > T.drain) {
    for (let r = 0; r < TROWS; r++)
      for (let c = 0; c < TCOLS; c++) {
        const p = at(f, tileAt(c, r), 3, ease.out);
        if (p <= 0) continue;
        const w = (TILE.w + 1) * p;
        const h = (TILE.h + 1) * p;
        const cx = (c + 0.5) * TILE.w;
        const cy = (r + 0.5) * TILE.h;
        path += `M${(cx - w / 2).toFixed(2)} ${(cy - h / 2).toFixed(2)}h${w.toFixed(2)}v${h.toFixed(2)}h${(-w).toFixed(2)}Z`;
      }
  }
  // the cells read as a faint grid on the lit face, so the switch-off reads as cells going out
  const cells = `linear-gradient(rgba(120,80,0,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(120,80,0,0.13) 1px, transparent 1px)`;
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* unlit before the block goes live: bone, then the sun switches on */}
      <div style={{ position: 'absolute', inset: 0, background: BLOCK.front }} />
      <div style={{ position: 'absolute', inset: 0, opacity: lit, background: `linear-gradient(180deg, #FFD862 0%, ${SUN} 34%, #F2B21F 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: cells, backgroundSize: `${TILE.w}px ${TILE.h}px` }} />
      </div>
      <FaceText f={f} dark={false} />
      {path && (
        <div style={{ position: 'absolute', inset: 0, clipPath: `path('${path}')` }}>
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, #232226 0%, ${OFF} 100%)` }} />
          <FaceText f={f} dark />
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- requests: sun streaks on the floor, stepped (the digital clock)
const STREAKS = Array.from({ length: 36 }, (_, i) => ({
  dir: i % 4,
  lane: (Math.round(rand(i + 2) * 4) - 2) * 60,
  t0: T.live + 2 + Math.round(rand(i + 9) * 30) + (i % 6) * 4,
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
        if (born > T.drain - 6) return null;
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

// ---------------------------------------------------------------- the camera
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
const PERSP = 2600;
/** The zoom at which the 300 px top face (at height 70) is as wide as the full-frame terminal at frame f: the snap-out's first frame. */
const outZoom = (0.945 * 1920 * termCam(T.out).s) / (300 * (PERSP / (PERSP - 70))); // 0.945: measured on the sheet

/** The cascade: the camera rides the chain's front, trailing it by 5-12 frames, pulling back as the spiral widens. */
const frontIdx = (f: number) => {
  if (f <= REPS[0].f) return 0;
  for (let i = 0; i < REPS.length - 1; i++) if (f < REPS[i + 1].f) return i + (f - REPS[i].f) / (REPS[i + 1].f - REPS[i].f);
  return REPS.length - 1;
};
const rideCam = (f: number): Required<Cam> => {
  let s = 0;
  for (let k = 0; k < 8; k++) s += frontIdx(f - 5 - k);
  s /= 8;
  const i = Math.min(REPS.length - 2, Math.floor(s));
  const t = s - i;
  const px = mix(t, REPS[i].x, REPS[i + 1].x);
  const py = mix(t, REPS[i].y, REPS[i + 1].y);
  const r = mix(t, REPS[i].r, REPS[i + 1].r);
  const th = mix(t, REPS[i].th, REPS[i + 1].th);
  const k = 0.5; // aim between the block and the front, so both stay in frame
  return {
    x: k * (px - 960),
    y: k * (py - 540) + 60,
    zoom: Math.min(1.75, 1.75 * Math.pow(470 / (r + 40), 0.8)),
    rx: mix(clamp(s / (REPS.length - 1)), 60, 52),
    ry: 0,
    rz: -36 - 1.2 * th,
  };
};
const RIDE_OUT = CHAIN_END + 10; // the front has stopped; the camera rises to the widest frame
const WIDE = { rx: 38, rz: -36 - 1.2 * REPS[REPS.length - 1].th, zoom: 0.56, x: 30, y: 90 };
const FACE_ZOOM = 4.35;
const ACT3: CamKey[] = [
  // the dive's return: out of the top face fast (front-loaded), swinging back to the iso view as the block rises
  { f: T.out, rx: 0, rz: 0, zoom: outZoom, x: 0, y: 0 },
  { f: T.out + 12, rx: 22, rz: -10, zoom: 2.5, x: 0, y: 30, curve: ease.out },
  { f: T.live, rx: 60, rz: -36, zoom: 1.8, x: 0, y: 100, curve: ease.inOut },
  // the load arrives: a slow orbit and push while the count climbs
  { f: T.casc, ...rideCam(T.casc), curve: ease.inOut },
  // (the ride: rideCam, between T.casc and RIDE_OUT)
  { f: RIDE_OUT, ...rideCam(RIDE_OUT) },
  { f: T.dive2, ...WIDE, curve: ease.out },
  // the second dive: into the lit face, accelerating, landing square on the count
  { f: T.macro, rx: 87, rz: -4, zoom: FACE_ZOOM, x: 0, y: 150, curves: { zoom: (t: number) => t * (0.35 + 0.65 * t), rot: ease.inOut, pan: ease.inOut } },
  { f: T.back, rx: 87, rz: -3, zoom: FACE_ZOOM * 1.06, x: 0, y: 150, curve: ease.glide },
  // pull back as the replicas sink; the floor line is read; then top-down for the split
  { f: T.back + 22, rx: 63, rz: -28, zoom: 1.52, x: 95, y: 300, curve: ease.inOut },
  { f: T.lock - 2, rx: 61, rz: -31, zoom: 1.44, x: 95, y: 285, curve: ease.glide },
  { f: T.lock + 18, rx: 0, rz: 0, zoom: 1.1, x: 266, y: 0, curve: ease.out },
  { f: T.end, rx: 0, rz: 0, zoom: 1.14, x: 259, y: 0, curve: ease.glide },
];
const cam3 = (f: number): Required<Cam> => {
  if (f > T.casc && f < RIDE_OUT) return rideCam(f);
  const c = camAt(f, ACT3);
  return { ...c, ry: 0 };
};
const smearOf = (f: number, max = 7) => {
  const a = cam3(f);
  const b = cam3(f - 1);
  const v = Math.hypot(a.x - b.x, a.y - b.y) + Math.abs(Math.log(a.zoom / b.zoom)) * 900 + (Math.abs(a.rx - b.rx) + Math.abs(a.rz - b.rz)) * 8;
  return Math.min(max, Math.max(0, v - 6) * 0.05);
};

// the replicas are lit from above: a bright top edge, faces darkening toward the floor
const REP_TOP = 'linear-gradient(160deg, #FFFFFF 0%, #F4F1E8 100%)';
const REP_FRONT = `linear-gradient(180deg, #FFD862 0%, ${SUN} 38%, #DDA11C 100%)`;
const REP_SIDE = 'linear-gradient(180deg, #E8AE27 0%, #A97810 100%)';

const World: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const act3 = f >= T.out;

  // act 1: the hero falls (already in the air on frame 0) and lands on the beat
  const fall = clamp((f + 10) / (T.land + 10));
  const heroZ = act3 ? 0 : 190 * (1 - fall * fall);
  // act 3: the block rises out of the floor as the camera snaps out of its face; on the beat its face lights
  const rise = act3 ? at(f, T.out + 3, 17, ease.out) : 0;
  const heroH = act3 ? mix(rise, 70, 420) : 70;
  const stageZ = act3 ? -(mix(rise, 70, 420) - 70) * 0.6 : 0;
  const lit = act3 ? at(f, T.live, 3, ease.out) : 0;
  const idle = at(f, T.drain + 8, 12, ease.inOut);

  // the lockup: the hero splits into the three blocks of the mark
  const split = at(f, T.lock, 16, ease.out);
  const pieces = [
    { x: -112, y: 0, w: 105, d: 270, h: 150, front: SUN, side: AMBER },
    { x: 62, y: -90, w: 215, d: 90, h: 110, front: BLOCK.front, side: BLOCK.side },
    { x: 32, y: 26, w: 155, d: 76, h: 110, front: BLOCK.front, side: BLOCK.side },
  ];

  const camShake = f < 30 ? shake(f, T.land, 10, 9) : act3 && f < T.live + 12 ? shake(f, T.live, 8, 5) : 'translate(0px, 0px)';
  // motion blur from the camera's speed: full on the seams (the snap-out, the dive, the pull-back), light during the ride
  const smear = !act3 ? (f > 116 ? camSmear(f, ACT1, 0.5, 7) : 0) : f < T.lock ? smearOf(f, f > T.casc && f < RIDE_OUT ? 3 : 7) : 0;
  const count = landed(f);

  return (
    <AbsoluteFill style={{ transform: camShake, filter: smear > 0.3 ? `blur(${smear.toFixed(2)}px)` : undefined }}>
      <Camera keys={act3 ? undefined : ACT1} cam={act3 ? cam3(f) : undefined} perspective={PERSP}>
        <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: act3 ? `translateZ(${stageZ}px)` : undefined }}>
          <GridLines size={80} color="rgba(242,240,234,0.075)" start={-14} reveal={30} />

          {/* act 1: floor type */}
          {!act3 && f < T.sink && f < T.thirty[0] && (
            <FloorType>
              <Build words={['One', 'model.']} times={[...T.one]} born={SUN} settle={14} style={floorStyle} />
            </FloorType>
          )}
          {!act3 && f >= T.thirty[0] && f < T.or[0] && (
            <FloorType>
              <Build words={['Thirty', 'things', 'to', 'run', 'it.']} times={[...T.thirty]} born={SUN} settle={14} style={floorFive} />
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

          {/* act 3: the lit face's glow on the floor, the requests, the replicas, the floor type */}
          {act3 && f < T.lock && (
            <At x={960} y={540 + 150 + 170} z={0.5}>
              <div style={{ width: 760, height: 360, borderRadius: '50%', background: 'radial-gradient(ellipse at 50% 30%, rgba(255,197,49,0.30) 0%, rgba(255,197,49,0.08) 45%, transparent 70%)', opacity: lit * (1 - idle) }} />
            </At>
          )}
          {act3 && f >= T.live && f < T.back && <Streaks />}
          {act3 &&
            REPS.map((r, i) => {
              if (f < r.f || f > r.sinkAt + 12) return null;
              // each rises on ease.in into its hit (7 f), lands with a 2-frame settle, and sinks outside in at the end
              const p = at(f, r.f, 7, ease.in);
              const settle = f >= r.f + 7 ? 0.05 * Math.exp(-(f - r.f - 7) / 1.6) * Math.cos((f - r.f - 7) * 1.4) : 0;
              const sink = accel(f, r.sinkAt, 12, 1.5);
              if (sink > 0.94) return null;
              const h = Math.max(1, REP.h * (p + settle) * (1 - sink));
              // the one at the front is full strength; the landed ones behind it settle 15 % darker
              const behind = clamp((f - r.f - 10) / 10) * 0.15;
              const veil = behind > 0.01 ? <div style={{ position: 'absolute', inset: 0, background: `rgba(14,14,16,${behind.toFixed(3)})` }} /> : undefined;
              return (
                <At key={i} x={r.x} y={r.y}>
                  <Box w={REP.w} d={REP.d} h={h} color={BONE} top={REP_TOP} front={REP_FRONT} side={REP_SIDE} edge="rgba(255,248,225,0.32)" shadow={0.55} frontContent={veil} sideContent={veil} />
                </At>
              );
            })}
          {act3 && f >= REPS[0].f + 4 && f < T.dive2 + 8 && (
            <FloorType size={224}>
              <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
                <span style={{ color: SUN, display: 'inline-block', minWidth: '1.2em', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                <span style={{ marginLeft: 36 }}>replicas.</span>
              </span>
            </FloorType>
          )}
          {act3 && f >= T.zero[0] && (
            <FloorType out={at(f, T.lock - 4, 8, ease.in)} size={140}>
              <Build words={['Zero', 'when', 'idle.']} times={[...T.zero]} born={SUN} settle={14} style={{ ...floorStyle, fontSize: 140 }} />
            </FloorType>
          )}

          {/* the hero block: the model; its top face is the terminal, its lit front face carries the load */}
          {(!act3 || f < T.lock) && (
            <At x={960} y={540} z={heroZ}>
              <Box
                w={300}
                d={300}
                h={heroH}
                color={BONE}
                top={PAPER}
                front={act3 ? (idle > 0.5 ? OFF : SUN) : BLOCK.front}
                side={act3 ? (idle > 0.5 || lit < 0.5 ? BLOCK.side : AMBER) : BLOCK.side}
                topContent={
                  act3 ? (
                    f < T.live - 6 ? <TermFace at={T.out} /> : <div style={{ ...mono, fontSize: 22, color: '#7D796F', position: 'absolute', left: 12, top: 10 }}>llama-3.1-70b</div>
                  ) : f >= T.sink + 4 ? (
                    <TermFace at={T.term} />
                  ) : (
                    <ModelFace />
                  )
                }
                frontContent={act3 ? <LoadFace lit={lit} /> : undefined}
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

// ---------------------------------------------------------------- the lockup type (the mark is the hero, split)
// Glyph birth in light: one letter every 3 frames, each born sun with a glow sized to the letter, cooling to bone.
const WORDMARK = 'Forge';
const LockType: React.FC = () => {
  const f = useCurrentFrame();
  // the type rides the camera's last creep, so mark and name stay one lockup
  const grow = cam3(f).zoom / 1.1;
  const t0 = T.lock + 10;
  return (
    <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `scale(${Math.max(1, grow)})` }}>
      <div style={{ position: 'absolute', left: 931, top: 540 - 0.6 * 184, whiteSpace: 'pre', ...display, fontWeight: 640, letterSpacing: '-0.03em', fontSize: 184, lineHeight: 1 }}>
        {WORDMARK.split('').map((ch, i) => {
          const born = t0 + i * 3;
          if (f < born) return <span key={i} style={{ opacity: 0 }}>{ch}</span>;
          const cool = at(f, born, 12, ease.out);
          const r = Math.round(mix(cool, 255, 242));
          const g = Math.round(mix(cool, 197, 240));
          const b = Math.round(mix(cool, 49, 234));
          return (
            <span key={i} style={{ color: `rgb(${r},${g},${b})`, textShadow: `0 0 ${Math.round(mix(cool, 26, 0))}px rgba(255,197,49,${mix(cool, 0.55, 0).toFixed(3)})` }}>
              {ch}
            </span>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 744 }}>
        <Build words={['Run', 'any', 'model.']} times={[T.lock + 24, T.lock + 27, T.lock + 30]} born={SUN} settle={12} style={{ ...display, fontWeight: 500, letterSpacing: '-0.015em', fontSize: 72, color: '#C9C5BB', lineHeight: 1.2 }} />
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 860, textAlign: 'center', ...label, fontWeight: 500, color: SUN, fontSize: 40, opacity: f >= T.lock + 36 ? 1 : 0 }}>forge.dev</div>
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
    // the back half: out of the face, the block lands lit, the chain of replicas, the dive, the drain, the zero
    { at: T.out + 4, ...s['mixkit-175'], volume: 0.42 },
    { at: T.live, ...s['mixkit-2299'], volume: 0.62 },
    { at: T.live, ...s['mixkit-3124'], volume: 0.4 },
    // a tick per replica (every other one at the fast end), rising in pitch; one low hit on the last
    ...REPS.filter((_, i) => i < 8 || i % 2 === 0).map((r, i) => ({ at: r.f + 7, ...s['mixkit-2568'], volume: 0.12, rate: 0.9 + i * 0.035 })),
    { at: CHAIN_END + 7, ...s['mixkit-2299'], volume: 0.5 },
    { at: T.dive2 + 2, ...s['mixkit-168'], volume: 0.4 },
    { at: T.macro, ...s['mixkit-2299'], volume: 0.55 },
    { at: T.drain, ...s['mixkit-784'], volume: 0.32, maxS: 1 },
    ...[0, 4, 8, 12].map((k) => ({ at: T.drain + 2 + k, ...s['mixkit-1049'], volume: 0.2, rate: 1.1 - k * 0.02 })),
    { at: T.back + 2, ...s['mixkit-175'], volume: 0.32 },
    ...T.zero.map((t) => ({ at: t, ...s['mixkit-2533'], volume: 0.3 })),
    { at: T.lock, ...s['mixkit-2299'], volume: 0.9 },
    { at: T.lock + 12, ...s['mixkit-3124'], volume: 0.35 },
  ];
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Ground color={INK} light={{ x: 0.5, y: 0.48, size: 0.85, amount: 0.07 }} />
      {(f < T.term || f >= T.out) && <World />}
      {f >= T.term && f < T.out && <Term />}
      {f >= T.lock + 8 && <LockType />}
      <Grain amount={0.045} />
      <Music src="music/tech-house-vibes.mp3" startFrom={28.1} volume={0.5} enterAt={T.land} breaths={[T.term, T.lock]} breathLen={7} duck={[T.enter, T.live, T.macro, T.lock]} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const forgeDuration = T.end;
