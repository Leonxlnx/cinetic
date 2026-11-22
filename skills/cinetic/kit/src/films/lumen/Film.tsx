// "Lumen 2": iteration 4 of the v2 kit, rebuilt after critique. ~14 s at 30 fps. An invented AI model launch.
// World: a dark stage lit by one amber beam (a hard-edged cone, a floor pool, light that has a job every beat), a glass
// prism that splits the beam onto named benchmarks, an amber flood for the name, and a real prompt -> answer under the
// light. One light hue all the way through; the lockup beam is the opening beam, narrowed.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  accel,
  at,
  Beam,
  Box,
  Build,
  Camera,
  At,
  clamp,
  creep,
  Cues,
  ease,
  Flash,
  fonts,
  GlassPanel,
  Grain,
  logScale,
  mix,
  Music,
  Odometer,
  Pool,
  springAt,
  springs,
  useTyped,
  Vignette,
  Words,
} from '../../kit';
import { sfx } from '../../sfx';

const INK = '#07080B';
const AMBER = '#FFB547';
const BONE = '#F4F2EE';
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 600, letterSpacing: '-0.05em', color: BONE };
const mono: React.CSSProperties = { fontFamily: fonts.mono, letterSpacing: '0.08em', textTransform: 'uppercase' };

const T = {
  line: [6, 14, 22],
  split: 34,
  panes: [44, 58, 72],
  name: 102, // the flash on the "2", the frame floods amber
  sweep: 106,
  ask: 146,
  type: 150,
  answer: 178,
  lock: 268,
  end: 328,
} as const;

const PANES = [
  { label: 'Math', v: 92.4, d: 1, suffix: ' %', x: 380 },
  { label: 'Code', v: 81.0, d: 1, suffix: ' %', x: 960 },
  { label: 'Context', v: 1, d: 0, suffix: 'M tokens', x: 1540 },
];

// ---------------------------------------------------------------- 1-2. the beam finds the prism, splits onto the benchmarks
const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const beam = at(f, -16, 22, ease.out);
  const split = at(f, T.split, 10, ease.out);
  const spin = mix(at(f, -12, 110, ease.inOut), -30, 60);
  const lift = at(f, T.split - 4, 30, ease.inOut); // the prism rises into the frame as the beams split
  const leave = accel(f, T.name - 6, 6, 1.5);
  return (
    <AbsoluteFill style={{ filter: leave > 0.05 ? `brightness(${1 + leave * 3})` : undefined }}>
      <Beam open={beam * (1 - split * 0.45)} color={AMBER} w0={70} w1={720} floor={900} />
      <Pool open={beam} color={AMBER} y={900} />
      {/* three refracted beams from the prism to the panes, each opening in turn */}
      {PANES.map((p, i) => {
        const o = at(f, T.panes[i] - 6, 10, ease.out);
        if (o <= 0) return null;
        const x0 = 960;
        const y0 = mix(lift, 560, 470);
        const x1 = p.x;
        const y1 = 250;
        const w = 26 + 220 * o;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              inset: 0,
              clipPath: `polygon(${x0 - 8}px ${y0}px, ${x0 + 8}px ${y0}px, ${x1 + w / 2}px ${y1}px, ${x1 - w / 2}px ${y1}px)`,
              background: `linear-gradient(0deg, ${AMBER}cc, ${AMBER}22)`,
              mixBlendMode: 'screen',
              opacity: 0.75 * o,
            }}
          />
        );
      })}
      <Camera cam={{ rx: 10, zoom: 1.25 }} perspective={1800}>
        <At x={960} y={mix(lift, 640, 560)} rx={-90} ry={spin}>
          <Box
            w={210}
            d={210}
            h={360}
            color="#1A2230"
            top="linear-gradient(135deg, rgba(255,255,255,.35), rgba(95,212,255,.18))"
            front={`linear-gradient(135deg, rgba(255,255,255,.3), ${AMBER}55)`}
            side="linear-gradient(135deg, rgba(255,255,255,.18), rgba(95,212,255,.12))"
            edge="rgba(255,236,200,0.9)"
            radius={6}
          />
        </At>
      </Camera>
      {/* the named benchmarks: dark until their beam lights them, then the number counts */}
      {PANES.map((p, i) => {
        const lit = at(f, T.panes[i], 8, ease.out);
        const show = springAt(f, fps, T.split, springs.card);
        return (
          <div key={i} style={{ position: 'absolute', left: p.x - 265, top: 100, width: 530, opacity: clamp(show * 2), transform: `translateY(${mix(show, 40, 0)}px)` }}>
            <GlassPanel lit={0.25 + 0.75 * lit} tint={lit > 0.5 ? AMBER : '#FFFFFF'} pad="30px 36px" style={{ boxShadow: lit > 0 ? `0 0 ${80 * lit}px ${AMBER}55, inset 0 1px 0 rgba(255,255,255,.5)` : undefined }}>
              <div style={{ ...mono, fontSize: 30, color: lit > 0.5 ? AMBER : '#7D8590' }}>{p.label}</div>
              <div style={{ ...display, fontSize: 120, lineHeight: 1, marginTop: 10, color: lit > 0.1 ? BONE : '#3A3F47' }}>
                <Odometer value={p.v} decimals={p.d} start={T.panes[i] + 2} dur={24} sep="" />
                <span style={{ fontSize: 50, letterSpacing: '-0.02em' }}>{p.suffix}</span>
              </div>
            </GlassPanel>
          </div>
        );
      })}
      {/* the line, on clean dark under the pool */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 930, opacity: 1 - at(f, T.split, 8, ease.in) }}>
        <Build words={['Built', 'to', 'think.']} times={[...T.line]} born={AMBER} style={{ ...display, fontSize: 112, fontWeight: 560, color: BONE }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3. the name on an amber flood, lit by a sweep
const Name: React.FC = () => {
  const f = useCurrentFrame();
  const sweep = at(f, T.sweep, 34, ease.inOut);
  const push = 1 + 0.03 * creep(f, T.name, 50);
  const out = accel(f, T.ask - 8, 8, 1.5);
  return (
    <AbsoluteFill style={{ background: AMBER, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${push * logScale(1.3, 1, at(f, T.name, 14, ease.out)) * logScale(1, 4, out)})` }}>
        <div style={{ position: 'relative' }}>
          <div style={{ ...display, fontSize: 470, lineHeight: 0.9, color: INK }}>
            <Words text="Lumen 2" start={T.name} by="char" arrive="cut" gap={1.5} style={{ color: INK }} />
          </div>
          {/* the sweep: a band of white light crossing the letters */}
          <div
            style={{
              ...display,
              fontSize: 470,
              lineHeight: 0.9,
              position: 'absolute',
              inset: 0,
              color: '#FFFFFF',
              WebkitMaskImage: `linear-gradient(100deg, transparent ${mix(sweep, -30, 100)}%, black ${mix(sweep, -18, 112)}%, transparent ${mix(sweep, -6, 124)}%)`,
              maskImage: `linear-gradient(100deg, transparent ${mix(sweep, -30, 100)}%, black ${mix(sweep, -18, 112)}%, transparent ${mix(sweep, -6, 124)}%)`,
              opacity: f >= T.name + 10 ? 1 : 0,
            }}
          >
            Lumen 2
          </div>
        </div>
        <div style={{ ...mono, fontSize: 34, color: '#3A2600', textAlign: 'center', marginTop: 24, opacity: at(f, T.sweep + 10, 8) }}>Our fastest thinker</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 4. a real prompt, answered under the light
const PROMPT = 'Why does a spinning top stay upright?';
const ANSWER = [
  { b: 'Angular momentum.', t: ' A spinning top resists any change to its axis.' },
  { b: 'Gravity becomes precession:', t: ' it tips the axis sideways, so it circles instead of falling.' },
  { b: 'Friction wins in the end:', t: ' spin drops, the circle widens, and it falls.' },
];

const Answer: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arrive = springAt(f, fps, T.ask, springs.heavy);
  const beam = at(f, T.ask, 20, ease.out);
  const typed = useTyped(PROMPT, T.type, 34);
  const out = accel(f, T.lock - 10, 10, 1.45);
  const total = ANSWER.reduce((a, x) => a + x.b.length + x.t.length + 1, 0);
  const streamed = Math.max(0, Math.floor((f - T.answer) * 3.2));
  let left = streamed;
  // punch-ins: each time a bold point lands, the camera cuts a step closer (with a landing blur) and the beam pulses
  const lens = ANSWER.map((a) => a.b.length + a.t.length + 1);
  const starts = lens.map((_, i) => T.answer + Math.round(lens.slice(0, i).reduce((x, y) => x + y, 0) / 3.2));
  const k = starts.filter((s0) => f >= s0).length;
  const lastHit = k ? starts[k - 1] : T.answer;
  const punch = 1 + 0.07 * k + (f >= T.type && f < T.answer ? 0.05 * at(f, T.type, 30, ease.out) : 0);
  const blurHit = k ? Math.max(0, 5 - (f - lastHit) * 1.6) : 0;
  const pulse = k ? 1 - at(f, lastHit, 12, ease.out) : 0;
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Beam open={beam * 0.85} color={AMBER} w0={40} w1={1500} floor={1080} strength={0.35 + 0.3 * pulse} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          transform: `translateY(${mix(arrive, 160, 0) - out * 120 - (k - 1) * 40 * (k > 0 ? 1 : 0)}px) scale(${mix(arrive, 1.12, 1) * punch * mix(out, 1, 0.9)})`,
          opacity: clamp(arrive * 2) * (1 - out),
          filter: blurHit > 0.2 ? `blur(${blurHit}px)` : undefined,
        }}
      >
        <GlassPanel w={1560} pad="44px 56px" lit={0.9}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontFamily: fonts.inter, fontSize: 40, color: BONE }}>
            <span style={{ ...mono, fontSize: 26, color: AMBER }}>You</span>
            <span>
              {typed.shown}
              <span style={{ display: 'inline-block', width: 3, height: 42, background: AMBER, marginLeft: 3, transform: 'translateY(8px)', opacity: typed.done && f > T.answer ? 0 : 1 }} />
            </span>
          </div>
          <div style={{ height: 1, background: 'rgba(255,255,255,.12)', margin: '30px 0' }} />
          <div style={{ fontFamily: fonts.inter, fontSize: 38, lineHeight: 1.5, color: '#C9CDD3', minHeight: 300 }}>
            <span style={{ ...mono, fontSize: 26, color: AMBER, display: 'block', marginBottom: 12, opacity: f >= T.answer - 6 ? 1 : 0 }}>Lumen 2 · 0.9 s</span>
            {ANSWER.map((a, i) => {
              const full = a.b + a.t;
              const n = Math.min(full.length, Math.max(0, left));
              left -= full.length + 1;
              if (n <= 0) return null;
              return (
                <div key={i}>
                  <span style={{ color: BONE, fontWeight: 650 }}>{a.b.slice(0, n)}</span>
                  {n > a.b.length ? a.t.slice(0, n - a.b.length) : ''}
                </div>
              );
            })}
            {streamed < total && f >= T.answer && <span style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 7, background: AMBER, marginLeft: 6 }} />}
          </div>
        </GlassPanel>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. lockup: the opening beam, narrowed (2 s)
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const beam = at(f, T.lock - 4, 18, ease.out);
  return (
    <AbsoluteFill style={{ background: INK, justifyContent: 'center', alignItems: 'center' }}>
      <Beam open={beam} color={AMBER} w0={24} w1={300} floor={1080} strength={0.55} />
      <div style={{ textAlign: 'center', transform: `scale(${1 + 0.04 * at(f, T.lock, T.end - T.lock, ease.out)})` }}>
        <div style={{ ...display, fontSize: 210, lineHeight: 1 }}>
          <Words text="Lumen 2" start={T.lock} by="char" arrive="rise" gap={1.3} dur={12} style={{ color: BONE }} />
        </div>
        <div style={{ ...mono, fontSize: 30, marginTop: 26, color: AMBER, opacity: at(f, T.lock + 16, 8) }}>Available today · lumen.ai/2</div>
      </div>
    </AbsoluteFill>
  );
};

export const LumenFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    { at: 2, ...s['mixkit-2299'], volume: 0.7 },
    ...T.line.map((t) => ({ at: t, ...s['mixkit-2533'], volume: 0.3 })),
    { at: T.split, ...s['mixkit-3124'], volume: 0.4 },
    ...T.panes.map((t, i) => ({ at: t, ...s['mixkit-2568'], volume: 0.4, rate: 0.95 + i * 0.07 })),
    { at: T.name, ...s['mixkit-2299'], volume: 0.95 },
    { at: T.sweep + 6, ...s['mixkit-168'], volume: 0.3 },
    { at: T.ask, ...s['mixkit-175'], volume: 0.4 },
    { at: T.answer, ...s['mixkit-3000'], volume: 0.35 },
    { at: T.lock, ...s['mixkit-2299'], volume: 0.55 },
  ];
  return (
    <AbsoluteFill style={{ background: INK }}>
      {f < T.name + 1 && <Stage />}
      {f >= T.name && f < T.ask && <Name />}
      {f >= T.ask && f < T.lock && <Answer />}
      {f >= T.lock && <Lockup />}
      <Flash start={T.name - 4} dur={10} color="#FFFFFF" strength={0.9} />
      <Vignette amount={0.45} />
      <Grain amount={0.05} />
      <Music src="music/tech-house-vibes.mp3" startFrom={92} volume={0.5} breaths={[T.name]} breathLen={8} duck={[T.name]} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const lumenDuration = T.end;
