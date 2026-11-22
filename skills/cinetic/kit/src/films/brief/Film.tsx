// "Brief": iteration 1 of the v2 kit. 26 s at 30 fps. An invented product (an AI that reads your tools each morning).
// One world: warm paper, ink, one vermilion accent, Geist display, Inter UI. Real marks for the tools it reads.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  accel,
  at,
  BrandTile,
  Bubble,
  Button,
  Card,
  clamp,
  creep,
  Cues,
  Cursor,
  DepthStack,
  ease,
  fonts,
  Grain,
  Icon,
  InputBar,
  landBlur,
  lightUI,
  logScale,
  mix,
  Music,
  Odometer,
  Row,
  springAt,
  springs,
  Thinking,
  Vignette,
  Words,
  type Theme,
} from '../../kit';
import { sfx } from '../../sfx';

const PAPER = '#F2EFE9';
const INK = '#141414';
const ACCENT = '#FF4F1F';
const t: Theme = { ...lightUI, accent: ACCENT, ink: INK, surface: '#FFFFFF', fill: '#F1EEE8', radius: 24, shadow: '0 1px 2px rgba(20,20,20,.05), 0 14px 30px -10px rgba(20,20,20,.16), 0 44px 90px -30px rgba(20,20,20,.22)' };
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 620, letterSpacing: '-0.045em', color: INK };

// One timeline: every scene and every sound reads its frames from here.
const T = {
  pileEnd: 90,
  lineIn: 84, // the line rises while the pile is still leaving: no empty frame between them
  dotGrow: 120,
  meet: 138,
  meetOut: 192,
  ask: 204,
  typeAt: 212,
  send: 258,
  think: 264,
  morph: 276,
  rows: [290, 298, 306],
  cursorIn: 352,
  click1: 376,
  approve: 432,
  proofIn: 478,
  lock: 584,
  end: 680,
} as const;

/** The film's own mark: a page with a folded corner and one line (invented for this fictional product). */
const Mark: React.FC<{ size: number; color?: string; fold?: string }> = ({ size, color = ACCENT, fold = '#FFB59E' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M18 8 H64 L84 28 V86 a6 6 0 0 1 -6 6 H18 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z" fill={color} />
    <path d="M64 8 V22 a6 6 0 0 0 6 6 H84 Z" fill={fold} />
    <rect x="26" y="50" width="40" height="8" rx="4" fill="#fff" />
    <rect x="26" y="66" width="26" height="8" rx="4" fill="#fff" opacity={0.7} />
  </svg>
);

// ---------------------------------------------------------------- 1. the pile
const TOASTS: Array<{ f: number; brand: string; title: string; body: string }> = [
  { f: -3, brand: 'gmail', title: 'Q3 planning', body: '14 new replies' },
  { f: 16, brand: 'github', title: 'Review requested', body: 'auth: rotate refresh tokens #482' },
  { f: 25, brand: 'linear', title: 'ENG-219 is blocked', body: 'Waiting on you since Tuesday' },
  { f: 33, brand: 'notion', title: 'Roadmap doc edited', body: '6 comments mention you' },
  { f: 40, brand: 'figma', title: 'Checkout v3', body: 'Priya left 9 comments' },
  { f: 46, brand: 'googlecalendar', title: 'Design crit moved', body: 'Now 3:00 PM today' },
  { f: 51, brand: 'jira', title: 'Sprint 42 starts', body: '31 issues, 12 yours' },
  { f: 55, brand: 'zoom', title: 'Recording ready', body: 'Weekly sync, 48 min' },
  { f: 59, brand: 'discord', title: '#incidents', body: '23 new messages' },
  { f: 62, brand: 'gmail', title: 'Invoice #2291', body: 'Needs approval' },
  { f: 65, brand: 'github', title: 'CI failed on main', body: 'build / e2e (3 jobs)' },
  { f: 68, brand: 'linear', title: '5 issues assigned', body: 'Cycle 18' },
];
const Toast1: React.FC<{ toast: (typeof TOASTS)[number] }> = ({ toast }) => (
  <Card t={t} w={820} pad={26} style={{ display: 'flex', gap: 24, alignItems: 'center', borderRadius: 30 }}>
    <BrandTile name={toast.brand} size={76} bg="#F6F4F0" shadow="none" />
    <div style={{ flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, fontWeight: 650, letterSpacing: '-0.02em' }}>
        <span>{toast.title}</span>
        <span style={{ fontSize: 22, color: t.muted, fontWeight: 500 }}>now</span>
      </div>
      <div style={{ fontSize: 25, color: t.muted, marginTop: 4 }}>{toast.body}</div>
    </div>
  </Card>
);

const Pile: React.FC = () => {
  const f = useCurrentFrame();
  // the whole stack climbs as it fills, tilted back like a tower, then leaves upward at accelerating speed
  const fill = at(f, 0, 80, ease.soft);
  const climb = mix(at(f, 0, 70, ease.soft), 140, -40);
  const leave = accel(f, T.pileEnd - 12, 12, 1.42);
  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `translateY(${climb - leave * 1300}px) rotateX(${mix(fill, 24, 10)}deg) scale(${mix(fill, 1.28, 1.12)})`, filter: leave > 0.05 ? `blur(${leave * 26}px)` : undefined }}>
        <DepthStack x={960} y={630} items={TOASTS.map((toast) => ({ f: toast.f, node: <Toast1 toast={toast} /> }))} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2. the line, whose full stop becomes the reveal
const Line: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + 0.012 * creep(f, T.lineIn, 50);
  // the full stop lands with the line, then grows into the vermilion world (log-space, accelerating)
  const g = at(f, T.dotGrow, 20, ease.in);
  const r = logScale(15, 2400, g);
  const pop = springAt(f, 30, T.lineIn + 24, springs.pop);
  const away = at(f, T.dotGrow, 12, ease.in);
  return (
    <AbsoluteFill style={{ transform: `scale(${push})`, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ ...display, fontSize: 188, lineHeight: 0.98, textAlign: 'center' }}>
        <div style={{ opacity: 1 - away, filter: away > 0 ? `blur(${away * 8}px)` : undefined }}>
          <Words text="Too much" start={T.lineIn} arrive="rise" gap={4} dur={16} style={{ color: INK }} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <span style={{ opacity: 1 - away, filter: away > 0 ? `blur(${away * 8}px)` : undefined }}>
            <Words text="to read" start={T.lineIn + 10} arrive="rise" gap={4} dur={16} style={{ color: INK }} />
          </span>
          {/* the stop: an inline box the size of a full stop; its circle grows from its own centre */}
          <span style={{ position: 'relative', display: 'inline-block', width: 34, height: 34, marginLeft: 6 }}>
            {f >= T.lineIn + 24 && (
              <span style={{ position: 'absolute', left: 17 - r * pop, top: 17 - r * pop, width: r * 2 * pop, height: r * 2 * pop, borderRadius: '50%', background: ACCENT }} />
            )}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3. meet Brief
const Meet: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = springAt(f, fps, T.meet, springs.heavy);
  const w = at(f, T.meet + 8, 18, ease.out);
  const push = 1 + 0.02 * creep(f, T.meet, 56);
  const out = accel(f, T.meetOut - 10, 10, 1.5);
  return (
    <AbsoluteFill style={{ background: ACCENT, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, transform: `scale(${push * mix(out, 1, 0.82)}) translateY(${-out * 700}px)`, filter: out > 0.05 ? `blur(${out * 18}px)` : undefined }}>
        <div style={{ transform: `translateY(${mix(m, -40, 0)}px) rotate(${mix(m, -14, 0)}deg) scale(${mix(m, 0.4, 1)})`, opacity: clamp(m * 3) }}>
          <Mark size={210} color="#FFFFFF" fold="#FFC3B0" />
        </div>
        <div style={{ overflow: 'hidden', paddingBottom: 18 }}>
          <div style={{ ...display, color: '#FFFFFF', fontSize: 230, transform: `translateX(${mix(w, -60, 0)}px)`, opacity: clamp(w * 2), clipPath: `inset(0 ${mix(w, 100, 0)}% 0 0)` }}>Brief</div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 4. ask -> 5. answer -> 6. do
const ROWS = [
  { brand: 'github', title: 'Review PR #482: rotate refresh tokens', sub: 'Maya asked you · 2 h ago', trail: '5 min' },
  { brand: 'linear', title: 'ENG-219 is blocked on your answer', sub: 'Due today · Cycle 18', trail: '2 min' },
  { brand: 'googlecalendar', title: 'Design crit moved to 3:00 PM', sub: 'With Sam and Priya', trail: '45 min' },
];

const Work: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // camera: arrives moving (zoomed in, settling), then pushes toward the first row on the click, then leaves
  const arrive = at(f, T.ask, 34, ease.out);
  const focus = at(f, T.click1, 24, ease.inOut);
  const leave = accel(f, T.proofIn - 12, 12, 1.5);
  const zoom = logScale(1.7, 1.12, arrive) * logScale(1, 1.14, focus) * logScale(1, 3.2, leave);
  const camY = mix(focus, 0, -70);
  const blurIn = landBlur(f, T.ask, 10, 6);

  // the input bar rides down and shrinks away as the answer grows
  const barAway = at(f, T.think, 16, ease.inOut);
  // thinking pill -> answer card morph
  const morph = at(f, T.morph, 18, ease.out);
  const front = at(f, T.morph + 4, 10, ease.inOut);
  const cardW = mix(morph, 230, 1240);
  const cardH = mix(at(f, T.morph + 2, 18, ease.out), 92, 560);
  const thinkingOn = f >= T.think && f < T.morph + 6;

  // the first row grows into its own detail (one container, many identities)
  const open = at(f, T.click1 + 4, 20, ease.out);
  const approved = f >= T.approve + 2;
  const others = at(f, T.click1, 10, ease.out);

  return (
    <AbsoluteFill style={{ transform: `perspective(2400px) rotateX(${mix(arrive, 14, 2) - mix(focus, 0, 2)}deg) rotateY(${mix(arrive, -6, 0) + 1.2 * Math.sin(f / 80)}deg) scale(${zoom}) translateY(${-camY}px)`, filter: blurIn || leave > 0.05 ? `blur(${blurIn + leave * 16}px)` : undefined, transformOrigin: '50% 46%' }}>
      {/* the input bar */}
      <div style={{ position: 'absolute', left: 960, top: 540, transform: `translate(-50%, -50%) translateY(${mix(barAway, 0, 400)}px) scale(${mix(barAway, 1, 0.8)})`, opacity: 1 - barAway * 0.0 }}>
        <InputBar t={t} text="What needs me today?" start={T.typeAt} w={1120} size={40} placeholder="Ask Brief" sendAt={T.send} leading={<Mark size={44} />} cps={14} />
      </div>
      {/* the answer: a pill of thinking dots that stretches into the card */}
      {f >= T.think && (
        <div style={{ position: 'absolute', left: 960, top: mix(at(f, T.morph, 30, ease.out), 470, 470), transform: `translate(-50%, -50%) scale(${mix(springAt(f, fps, T.think, springs.pop), 0.5, 1)})` }}>
          <div style={{ position: 'relative', width: cardW, height: cardH, borderRadius: mix(morph, 32, 30), overflow: 'hidden', boxShadow: t.shadow, background: `linear-gradient(90deg, #FFFFFF ${mix(front, -20, 100)}%, #FFD2C4 ${mix(front, 10, 130)}%, #FFB59E ${mix(front, 40, 160)}%)`, border: `1px solid ${t.line}` }}>
            {thinkingOn && (
              <div style={{ position: 'absolute', left: 66, top: 26, opacity: 1 - morph }}>
                <Thinking color="#BDB6AC" size={20} />
              </div>
            )}
            {f >= T.morph + 6 && (
              <div style={{ padding: '34px 40px', fontFamily: t.font, color: INK, width: 1240, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 30, fontWeight: 650, letterSpacing: '-0.02em', opacity: at(f, T.morph + 7, 6) }}>
                  <Mark size={40} />
                  <Words text="Three things need you today" start={T.morph + 7} arrive="cut" style={{ color: INK }} born={ACCENT} settle={16} />
                </div>
                <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {ROWS.map((row, i) => {
                    const s = T.rows[i];
                    if (f < s) return null;
                    const p = at(f, s, 12, ease.out);
                    const isFirst = i === 0;
                    const dim = isFirst ? 0 : others;
                    return (
                      <div key={i} style={{ transform: `translateY(${mix(p, 22, 0)}px)`, opacity: clamp(p * 2) * (1 - dim * 0.62), filter: `blur(${mix(p, 6, 0) + dim * 3}px)`, borderRadius: 20, background: isFirst ? `rgba(255,79,31,${0.07 * others})` : 'transparent', boxShadow: isFirst && others > 0 ? `0 0 0 ${2 * others}px rgba(255,79,31,${0.5 * others})` : undefined }}>
                        <Row t={t} size={30} icon={<BrandTileInner name={row.brand} />} title={row.title} sub={row.sub} trail={row.trail} />
                        {isFirst && open > 0 && (
                          <div style={{ height: mix(open, 0, 150), overflow: 'hidden', padding: '0 24px' }}>
                            <div style={{ display: 'flex', gap: 28, alignItems: 'center', fontFamily: t.mono, fontSize: 24, marginTop: 6, opacity: open }}>
                              <span style={{ color: '#1A7F4B' }}>+214</span>
                              <span style={{ color: '#C2382A' }}>−87</span>
                              <span style={{ color: t.muted }}>6 files · tests pass</span>
                            </div>
                            <div style={{ fontSize: 24, color: '#3A3A3A', marginTop: 12, opacity: open }}>
                              <Words text="Moves token rotation server-side. Safe to merge." start={T.click1 + 14} arrive="cut" by="word" gap={1.4} style={{ color: '#3A3A3A' }} align="left" born={ACCENT} settle={12} />
                            </div>
                            <div style={{ position: 'absolute', right: 70, marginTop: -64 }}>
                              <Button t={{ ...t, accent: approved ? '#1A7F4B' : ACCENT }} size={24} pressAt={T.approve} label={approved ? 'Approved' : 'Approve'} icon={approved ? <Icon name="Check" size={24} stroke={3} /> : undefined} />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <Cursor
        start={T.cursorIn}
        keys={[
          { f: T.cursorIn, x: 1640, y: 1040 },
          { f: T.click1 - 6, x: 980, y: 420 },
          { f: T.approve - 30, x: 1000, y: 440 },
          { f: T.approve - 4, x: 1418, y: 610 },
        ]}
        clicks={[T.click1, T.approve]}
        size={50}
      />
    </AbsoluteFill>
  );
};

const BrandTileInner: React.FC<{ name: string }> = ({ name }) => <BrandTile name={name} size={52} bg="#FFFFFF" shadow="none" />;

// ---------------------------------------------------------------- 7. proof
const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const p = at(f, T.proofIn, 16, ease.out);
  const push = 1 + 0.02 * creep(f, T.proofIn, 90);
  const out = accel(f, T.lock - 10, 10, 1.45);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${logScale(1.6, 1, p) * push}) translateY(${-out * 260}px)`, filter: `blur(${landBlur(f, T.proofIn, 10, 6) + out * 14}px)`, opacity: 1 - out }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 28 }}>
        <div style={{ ...display, fontSize: 420, lineHeight: 1, color: ACCENT }}>
          <Odometer value={4} from={0} start={T.proofIn + 2} dur={34} sep="" />
        </div>
        <div style={{ ...display, fontSize: 150, lineHeight: 1 }}>
          <Words text="hours back" start={T.proofIn + 20} arrive="rise" gap={4} style={{ color: INK }} align="left" />
        </div>
      </div>
      <div style={{ ...display, fontSize: 64, fontWeight: 500, letterSpacing: '-0.03em', color: '#6E6A63', marginTop: 10 }}>
        <Words text="every single week" start={T.proofIn + 40} arrive="blur" gap={3} style={{ color: '#6E6A63' }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 8. lockup
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const m = springAt(f, fps, T.lock, springs.heavy);
  const w = at(f, T.lock + 6, 20, ease.out);
  const grow = 1 + 0.045 * at(f, T.lock, T.end - T.lock, ease.out);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${grow})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
        <div style={{ transform: `scale(${mix(m, 0.3, 1)}) rotate(${mix(m, -18, 0)}deg)`, opacity: clamp(m * 3) }}>
          <Mark size={150} />
        </div>
        <div style={{ ...display, fontSize: 170, clipPath: `inset(-10% ${mix(w, 100, -2)}% -20% 0)`, transform: `translateX(${mix(w, -40, 0)}px)` }}>Brief</div>
      </div>
      <div style={{ ...display, fontSize: 46, fontWeight: 500, letterSpacing: '-0.02em', color: '#6E6A63', marginTop: 26 }}>
        <Words text="Your morning, in one page." start={T.lock + 22} arrive="blur" gap={2.5} style={{ color: '#6E6A63' }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the film
export const BriefFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    ...TOASTS.map((x, i) => ({ at: x.f, ...s['mixkit-3000'], volume: i < 4 ? 0.5 : 0.28, rate: 0.95 + (i % 3) * 0.06 })),
    { at: T.pileEnd - 2, ...s['mixkit-168'], volume: 0.55 },
    { at: T.lineIn + 22, ...s['mixkit-2568'], volume: 0.5 },
    { at: T.dotGrow + 18, ...s['mixkit-784'], volume: 0.55, maxS: 1.2 },
    { at: T.meet, ...s['mixkit-2299'], volume: 0.9 },
    { at: T.meetOut, ...s['mixkit-175'], volume: 0.5 },
    { at: T.send, ...s['mixkit-2568'], volume: 0.6 },
    { at: T.morph, ...s['mixkit-3124'], volume: 0.45 },
    ...T.rows.map((r) => ({ at: r, ...s['mixkit-2384'], volume: 0.35 })),
    { at: T.click1, ...s['mixkit-2568'], volume: 0.5 },
    { at: T.approve, ...s['mixkit-2867'], volume: 0.55 },
    { at: T.proofIn, ...s['mixkit-1492'], volume: 0.5 },
    { at: T.proofIn + 36, ...s['mixkit-1049'], volume: 0.5 },
    { at: T.lock, ...s['mixkit-2299'], volume: 0.8 },
  ];
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {f < T.pileEnd + 2 && <Pile />}
      {f >= T.lineIn && f < T.meet + 2 && <Line />}
      {f >= T.meet && f < T.ask && <Meet />}
      {f >= T.ask && f < T.proofIn + 2 && <Work />}
      {f >= T.proofIn && f < T.lock && <Proof />}
      {f >= T.lock && <Lockup />}
      <Vignette amount={0.12} color="60,40,20" />
      <Grain amount={0.035} />
      <Music src="music/tech-house-vibes.mp3" startFrom={7.8} volume={0.5} duck={[T.meet, T.lock]} fadeOut={60} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const briefDuration = T.end;
