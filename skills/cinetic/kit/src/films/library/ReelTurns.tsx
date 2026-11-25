// A reel of the motion library's turns pieces, one after another with its name on screen: render it to see them move.
// Every scene carries real content (the licensed photographs in public/img, detailed panels), so a turn is judged the way
// it would be used. No sound.
import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile, useCurrentFrame } from 'remotion';
import {
  BlockBurst,
  Bloom,
  ChromaHit,
  DiveInto,
  DotReveal,
  DotScreen,
  GlitchCut,
  GrowIris,
  LightSweep,
  MorphBox,
  Shove,
  ShapeMatch,
  TrackOverlay,
  WhipGate,
  blockBurstEnd,
  dotRevealEnd,
  whipGateEnd,
  glitchCutEnd,
} from '../../kit/library';
import { PixelFilter } from '../../kit/library';
import { Ground, Phone, fonts, softShadow, ease, mix, clamp, Icon, useTextLayout } from '../../kit';

// palette: paper, ink, cobalt, sky, orange, coral, sun, navy
const PAPER = '#F4F2EE';
const WHITE = '#FAFAF8';
const INK = '#141519';
const NIGHT = '#0C0D10';
const COBALT = '#2F5BFF';
const SKY = '#9CC8FF';
const ORANGE = '#FF6A2B';
const CORAL = '#FF8A6B';
const SUN = '#FFC93C';

const IMG = {
  cloud: 'cloud-streets-over-the-bering-sea.jpg',
  delta: 'earth-observations-taken-by-expedition-26.jpg',
  shore: 'earth-observations-taken-by-the-expedition.jpg',
  tide: 'hokianga-tide-out.jpg',
  farms: 'seaweed-farms-in-south-korea.jpg',
  waves: 'waves-009.jpg',
};

const say = (size: number, color: string, weight = 520): React.CSSProperties => ({ fontFamily: fonts.inter, fontSize: size, fontWeight: weight, color, letterSpacing: size > 100 ? '-0.03em' : '-0.015em', lineHeight: 1.04 });
const Center: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', textAlign: 'center', ...style }}>{children}</AbsoluteFill>
);
/** A full-frame photograph with a slow drift (drift 0: still, so a plate can match it exactly). */
const Photo: React.FC<{ src: string; zoom?: number; drift?: number; children?: React.ReactNode; dim?: number; t0?: number }> = ({ src, zoom = 1.04, drift = 0.0006, children, dim = 0, t0 = 0 }) => {
  // t0: frames already drifted (a scene that continues in a second Sequence keeps its drift: no jump at the join)
  const f = useCurrentFrame() + t0;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', background: NIGHT }}>
      <Img src={staticFile(`img/${src}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${zoom + f * drift})` }} />
      {dim > 0 && <AbsoluteFill style={{ background: `rgba(8,9,12,${dim})` }} />}
      {children}
    </AbsoluteFill>
  );
};
const Pic: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(`img/${src}`)} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }} />
);
const Label: React.FC<{ name: string }> = ({ name }) => (
  <div style={{ position: 'absolute', left: 40, bottom: 36, padding: '10px 18px', borderRadius: 999, background: 'rgba(16,17,20,0.62)', color: '#fff', fontFamily: fonts.inter, fontSize: 28, fontWeight: 500, letterSpacing: '-0.01em', backdropFilter: 'blur(8px)' }}>
    {name}
  </div>
);
/** A line of type that rises out of a mask (a clean entrance; nothing here leaves by fading). */
const Rise: React.FC<{ at: number; children: React.ReactNode; style?: React.CSSProperties; dur?: number }> = ({ at: a, children, style, dur = 14 }) => {
  const f = useCurrentFrame();
  const p = ease.out(clamp((f - a) / dur));
  if (f < a) return null;
  return (
    <div style={{ overflow: 'hidden', paddingBottom: '0.12em', ...style }}>
      <div style={{ transform: `translateY(${mix(p, 110, 0)}%)` }}>{children}</div>
    </div>
  );
};
const shadowText = '0 2px 30px rgba(0,0,0,.28)';

// panels for the scenes ------------------------------------------------------------------------------------------------
const Notice: React.FC<{ w: number; app: string; title: string; body: string; color?: string; icon?: Parameters<typeof Icon>[0]['name']; dark?: boolean; time?: string }> = ({ w, app, title, body, color = COBALT, icon = 'CalendarDays', dark, time = 'now' }) => (
  <div style={{ width: w, padding: '22px 24px', borderRadius: 30, background: dark ? 'rgba(34,36,42,0.94)' : 'rgba(255,255,255,0.95)', boxShadow: softShadow(3, dark ? NIGHT : PAPER), fontFamily: fonts.inter, color: dark ? '#fff' : INK, display: 'flex', gap: 18, alignItems: 'flex-start', boxSizing: 'border-box', textAlign: 'left' }}>
    <div style={{ width: 60, height: 60, borderRadius: 16, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>
      <Icon name={icon} size={32} color="#fff" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 24, opacity: 0.55 }}>
        <span>{app}</span>
        <span>{time}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4 }}>{title}</div>
      <div style={{ fontSize: 28, opacity: 0.72, marginTop: 2 }}>{body}</div>
    </div>
  </div>
);
const Prompt: React.FC<{ w: number; text: string; dark?: boolean }> = ({ w, text, dark }) => (
  <div style={{ width: w, height: 150, borderRadius: 36, background: dark ? 'rgba(27,29,34,0.96)' : '#fff', boxShadow: dark ? `inset 0 1px 0 rgba(255,255,255,.08), ${softShadow(4, NIGHT)}` : softShadow(4, PAPER), fontFamily: fonts.inter, fontSize: 36, color: dark ? '#F2F3F5' : INK, padding: '28px 36px', boxSizing: 'border-box', position: 'relative', textAlign: 'left' }}>
    {text}
    <div style={{ position: 'absolute', left: 30, bottom: 22, display: 'flex', gap: 12 }}>
      {['Plus', 'Paperclip'].map((n) => (
        <div key={n} style={{ width: 50, height: 50, borderRadius: 25, border: `2px solid ${dark ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.1)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={n as 'Plus'} size={26} color={dark ? '#C9CCD3' : '#5B6170'} />
        </div>
      ))}
    </div>
    <div style={{ position: 'absolute', right: 24, bottom: 22, width: 56, height: 56, borderRadius: 28, background: dark ? '#fff' : INK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="ArrowUp" size={30} color={dark ? INK : '#fff'} />
    </div>
  </div>
);
const Avatars: React.FC<{ n: number; size?: number; ring?: string }> = ({ n, size = 48, ring = '#fff' }) => {
  const tones = [CORAL, SKY, SUN, ORANGE, COBALT, '#C9B8A6'];
  const ini = ['MA', 'JK', 'SO', 'RL', 'TE', 'AV'];
  return (
    <div style={{ display: 'flex' }}>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: size / 2, background: tones[i % 6], border: `3px solid ${ring}`, marginLeft: i ? -size * 0.28 : 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.inter, fontSize: size * 0.36, fontWeight: 600, color: INK, boxSizing: 'border-box' }}>
          {ini[i % 6]}
        </div>
      ))}
    </div>
  );
};
const Planner: React.FC<{ dark?: boolean; w?: number }> = ({ dark, w = 820 }) => {
  const rows: Array<[string, string, string, number]> = [
    ['Design review', '9:30', COBALT, 3],
    ['Tide walk, north beach', '11:00', SKY, 2],
    ['Lunch with Sam', '12:30', ORANGE, 1],
    ['Ship the beta', '15:00', SUN, 4],
  ];
  return (
    <div style={{ width: w, padding: '32px 36px', borderRadius: 36, background: dark ? 'rgba(22,24,28,0.94)' : 'rgba(255,255,255,0.96)', boxShadow: softShadow(5, dark ? NIGHT : '#9FB6C8'), fontFamily: fonts.inter, color: dark ? '#fff' : INK, boxSizing: 'border-box', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 46, fontWeight: 600, letterSpacing: '-0.02em' }}>Thursday</div>
        <div style={{ fontSize: 28, opacity: 0.55 }}>4 events</div>
      </div>
      {rows.map(([t, h, c, n]) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '16px 0', borderTop: `1px solid ${dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.07)'}` }}>
          <div style={{ width: 10, height: 48, borderRadius: 5, background: c }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 33, fontWeight: 550 }}>{t}</div>
            <div style={{ fontSize: 26, opacity: 0.55, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{h}</div>
          </div>
          <Avatars n={n} size={46} ring={dark ? '#16181C' : '#fff'} />
        </div>
      ))}
    </div>
  );
};

/** A photo board: a header and six photographs in a 3 x 2 grid. Tile (i, j) has its centre at gx(i), gy(j). */
const G = { x0: 148, y0: 290, w: 520, h: 330, gap: 32, r: 28 };
const gx = (i: number) => G.x0 + i * (G.w + G.gap) + G.w / 2;
const gy = (j: number) => G.y0 + j * (G.h + G.gap) + G.h / 2;
const BOARD: Array<[string, string]> = [
  [IMG.cloud, 'Cloud streets'],
  [IMG.delta, 'Delta'],
  [IMG.waves, 'Morning swell'],
  [IMG.tide, 'Low tide'],
  [IMG.farms, 'Kelp farms'],
  [IMG.shore, 'Sand bars'],
];
const Board: React.FC = () => (
  <Ground color={PAPER} light={false}>
    <div style={{ position: 'absolute', left: G.x0, top: 128, right: G.x0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: fonts.inter, color: INK }}>
      <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: '-0.03em' }}>Field notes</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <Avatars n={4} size={54} ring={PAPER} />
        <div style={{ padding: '14px 26px', borderRadius: 999, background: INK, color: '#fff', fontSize: 28, fontWeight: 550 }}>Share</div>
      </div>
    </div>
    {BOARD.map(([src, name], k) => {
      const i = k % 3;
      const j = Math.floor(k / 3);
      return (
        <div key={src} style={{ position: 'absolute', left: gx(i) - G.w / 2, top: gy(j) - G.h / 2, width: G.w, height: G.h, borderRadius: G.r, overflow: 'hidden', boxShadow: softShadow(2, PAPER) }}>
          <Pic src={src} />
          <div style={{ position: 'absolute', left: 18, bottom: 18, padding: '8px 16px', borderRadius: 999, background: 'rgba(255,255,255,.92)', fontFamily: fonts.inter, fontSize: 26, fontWeight: 550, color: INK }}>{name}</div>
        </div>
      );
    })}
  </Ground>
);

// the pieces -----------------------------------------------------------------------------------------------------------
type Seg = { name: string; len: number; C: React.FC };

const DotRevealDemo: React.FC = () => {
  const T = 22;
  const PhoneScene: React.FC = () => {
    const f = useCurrentFrame();
    // it settles, then sinks out of frame (accelerating) just as the dots begin, so the planner never lands on top of it
    const p = ease.out(clamp(f / 14));
    const q = ease.in(clamp((f - (T - 6)) / 9));
    return (
      <Ground color={WHITE} light={false}>
        <Center>
          <Phone w={560} ground={WHITE} screen="#DCE3EC" style={{ marginTop: 560, transform: `translateY(${mix(p, 40, 0) + q * 760}px)` }}>
            <Pic src={IMG.tide} style={{ position: 'absolute', inset: 0, height: '100%', opacity: 0.9 }} />
            <div style={{ position: 'absolute', left: 22, right: 22, top: 110 }}>
              <Notice w={486} app="Calendar" title="Move lunch to 12:30?" body="Sam is running late" />
            </div>
          </Phone>
        </Center>
      </Ground>
    );
  };
  // the planner arrives sharp above the new ground, its rows one after another
  const Front: React.FC = () => {
    const f = useCurrentFrame();
    const p = ease.out(clamp((f - T - 3) / 12));
    return (
      <Center>
        <div style={{ transform: `translateY(${mix(p, 60, 0)}px) scale(${mix(p, 0.94, 1)})`, opacity: clamp((f - T - 2) / 3) }}>
          <Planner />
        </div>
      </Center>
    );
  };
  return <DotReveal from={<PhoneScene />} to={<Photo src={IMG.tide} />} front={<Front />} at={T} origin="top" wash="#7CCBFF" />;
};

const PixelDissolveDemo: React.FC = () => {
  const to = (
    <Photo src={IMG.waves} zoom={1.02}>
      <div style={{ position: 'absolute', left: 120, bottom: 150, textAlign: 'left' }}>
        <Rise at={60} style={say(110, '#fff', 560)}>
          <span style={{ textShadow: shadowText }}>Morning swell</span>
        </Rise>
        <Rise at={64} style={{ ...say(40, '#fff', 500), opacity: 0.9, marginTop: 10 }}>
          <span style={{ textShadow: shadowText }}>6:40, offshore wind, 2.1 m</span>
        </Rise>
      </div>
    </Photo>
  );
  return <DotReveal from={<Board />} to={to} at={18} origin={{ x: gx(2), y: gy(0) }} shape="square" pitch={48} sweep={16} rag={0.25} />;
};

const BlockBurstDemo: React.FC = () => {
  const tile = (
    <div style={{ width: 200, height: 200, borderRadius: 46, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: softShadow(4, NIGHT) }}>
      <Icon name="Wallet" size={104} color="#fff" />
    </div>
  );
  // the icon is carried through the cut: it crushes to cells for four frames as the burst starts, stays on top while the
  // photo bursts out of it, then slides left to make room for the line
  const B = 14;
  const TX = 435;
  const TY = 540;
  const from = (
    <Ground color={NIGHT} light={false}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 497 + 100 + 40, textAlign: 'center', ...say(44, '#C9CCD3', 500) }}>Pay the surf school</div>
    </Ground>
  );
  const line = (p: number) => (
    <div style={{ position: 'absolute', left: TX + 150, top: TY - 82, overflow: 'hidden', paddingBottom: 20 }}>
      <div style={{ ...say(150, '#fff', 560), textShadow: '0 4px 40px rgba(0,0,0,.35)', transform: `translateY(${mix(p, 110, 0)}%)` }}>Paid in seconds</div>
    </div>
  );
  const Carried: React.FC = () => {
    const f = useCurrentFrame();
    const m = ease.inOut(clamp((f - (B + 22)) / 14));
    const x = mix(m, 960, TX);
    const y = mix(m, 497, TY);
    const crush = f >= B - 4 && f < B;
    return (
      <>
        {crush && <PixelFilter id="bbcrush" step={f < B - 2 ? 22 : 34} />}
        <div style={{ position: 'absolute', left: x - 100, top: y - 100, filter: crush ? 'url(#bbcrush)' : undefined }}>{tile}</div>
        {f >= B + 28 && line(ease.out(clamp((f - (B + 28)) / 14)))}
      </>
    );
  };
  const warm = (
    <Photo src={IMG.tide} zoom={1.08} t0={B + 28 + 14 + 18}>
      <div style={{ position: 'absolute', left: TX - 100, top: TY - 100 }}>{tile}</div>
      {line(1)}
    </Photo>
  );
  const receipt = (
    <Ground color={NIGHT} light={false}>
      <Center>
        <div style={{ width: 760, borderRadius: 40, background: '#17191E', boxShadow: `inset 0 1px 0 rgba(255,255,255,.06), ${softShadow(5, NIGHT)}`, padding: '44px 48px', boxSizing: 'border-box', fontFamily: fonts.inter, color: '#fff', textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 72, height: 72, borderRadius: 20, background: ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="Check" size={40} color="#fff" stroke={2.6} />
            </div>
            <div>
              <div style={{ fontSize: 34, fontWeight: 600 }}>Payment sent</div>
              <div style={{ fontSize: 28, opacity: 0.55 }}>North beach surf school</div>
            </div>
          </div>
          <div style={{ fontSize: 120, fontWeight: 600, letterSpacing: '-0.04em', margin: '34px 0 18px', fontVariantNumeric: 'tabular-nums' }}>€240.00</div>
          {[['Arrived in', '0.4 s'], ['Fee', '€0.00']].map(([a, b]) => (
            <div key={a} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, padding: '14px 0', borderTop: '1px solid rgba(255,255,255,.08)' }}>
              <span style={{ opacity: 0.6 }}>{a}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums' }}>{b}</span>
            </div>
          ))}
        </div>
      </Center>
    </Ground>
  );
  const t2 = B + 28 + 14 + 18;
  return (
    <>
      <Sequence durationInFrames={t2}>
        <BlockBurst from={from} to={<Photo src={IMG.tide} zoom={1.08} />} at={B} origin={{ x: 960, y: 497 }} />
        <Carried />
      </Sequence>
      <Sequence from={t2}>
        <BlockBurst from={warm} to={receipt} at={0} origin="right" edge={ORANGE} cell={60} reach={16} />
      </Sequence>
    </>
  );
};

const GrowIrisDemo: React.FC = () => {
  const from = (
    <Ground color={PAPER} light={false}>
      <Center style={{ gap: 44 }}>
        <div style={{ ...say(84, INK, 560) }}>A note for the team</div>
        <div style={{ padding: '26px 48px', borderRadius: 999, border: `3px solid ${CORAL}`, ...say(40, INK, 550), background: '#fff', boxShadow: softShadow(2, PAPER) }}>Start a draft</div>
      </Center>
    </Ground>
  );
  const mid = (t0: number) => (
    <Photo src={IMG.waves} zoom={1.06} t0={t0}>
      <Center style={{ gap: 40 }}>
        <div style={{ ...say(84, '#fff', 540), textShadow: shadowText }}>What are we writing?</div>
        <Prompt w={1000} text="Swell report for Saturday" />
      </Center>
    </Photo>
  );
  const last = (
    <Photo src={IMG.cloud} zoom={1.02}>
      <Center style={{ gap: 36 }}>
        <div style={{ ...say(130, INK, 560) }}>Sent to six people</div>
        <Avatars n={6} size={86} ring="#fff" />
      </Center>
    </Photo>
  );
  // the pill sits under the heading: centre of the button row
  return (
    <>
      <Sequence durationInFrames={54}>
        <GrowIris from={from} to={mid(0)} at={20} x={960} y={540 + 66} r0={74} rim={CORAL} />
      </Sequence>
      <Sequence from={54}>
        <GrowIris from={mid(54)} to={last} at={16} x={960} y={540 + 62} shape="rounded" box={{ w: 1000, h: 150, r: 36 }} dur={8} inner={0.7} />
      </Sequence>
    </>
  );
};

const DIVE = { x: 1180, y: 570, w: 1060, h: 640, r: 24 };
const DIVE_PLATE = 1.6;
const DiveIntoDemo: React.FC = () => {
  const T = 24;
  const D = 20;
  const ps0 = (DIVE_PLATE * DIVE.w) / 1920;
  const reports: Array<[string, string, boolean]> = [
    ['Delta, dry season', 'Today, 09:12', true],
    ['Sand bars after the storm', 'Mon, 16:40', false],
    ['Kelp farms, south coast', 'Sun, 11:05', false],
    ['Cloud streets', 'Sat, 07:30', false],
    ['Low tide survey', 'Fri, 18:22', false],
  ];
  const from = (
    <Ground color={PAPER} light={false}>
      <div style={{ position: 'absolute', left: 100, top: 110, width: 1720, height: 900, borderRadius: 36, background: '#fff', boxShadow: softShadow(5, PAPER), fontFamily: fonts.inter, color: INK, overflow: 'hidden' }}>
        <div style={{ height: 76, display: 'flex', alignItems: 'center', gap: 12, padding: '0 30px', borderBottom: '1px solid rgba(0,0,0,.07)' }}>
          {[CORAL, SUN, SKY].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
          ))}
          <div style={{ marginLeft: 24, fontSize: 28, fontWeight: 550 }}>Field reports</div>
        </div>
        <div style={{ position: 'absolute', left: 24, top: 100, width: 400 }}>
          {reports.map(([t, d, on]) => (
            <div key={t} style={{ padding: '20px 22px', borderRadius: 20, background: on ? '#EEF2FF' : 'transparent', marginBottom: 8, textAlign: 'left' }}>
              <div style={{ fontSize: 30, fontWeight: on ? 600 : 500 }}>{t}</div>
              <div style={{ fontSize: 25, opacity: 0.5, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </div>
      {/* the preview shows the next scene exactly as the dive's plate will: the full frame at ps0, centred on the window */}
      <div style={{ position: 'absolute', left: DIVE.x - DIVE.w / 2, top: DIVE.y - DIVE.h / 2, width: DIVE.w, height: DIVE.h, borderRadius: DIVE.r, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: DIVE.w / 2 - 960, top: DIVE.h / 2 - 540, width: 1920, height: 1080, transform: `scale(${ps0})` }}>
          <Pic src={IMG.delta} />
        </div>
      </div>
    </Ground>
  );
  const to = (
    <Photo src={IMG.delta} zoom={1} drift={0}>
      <div style={{ position: 'absolute', left: 120, bottom: 150, textAlign: 'left' }}>
        <Rise at={T + D + 6} style={say(110, '#fff', 560)}>
          <span style={{ textShadow: shadowText }}>Delta, dry season</span>
        </Rise>
        <Rise at={T + D + 10} style={{ ...say(40, '#fff', 500), marginTop: 10 }}>
          <span style={{ textShadow: shadowText }}>Seen from 400 km, 09:12</span>
        </Rise>
      </div>
    </Photo>
  );
  return <DiveInto from={from} to={to} at={T} box={DIVE} dur={D} plate={DIVE_PLATE} />;
};

const WhipDemo: React.FC = () => {
  const from = (
    <Photo src={IMG.tide} zoom={1.06}>
      <Center style={{ gap: 24 }}>
        <Notice w={780} app="Tides" title="Low tide at 11:04" body="Best walk window: 10:30 to 12:00" color={COBALT} icon="Waves" />
        <Notice w={780} app="Calendar" title="Tide walk, north beach" body="Thursday, with Sam and Jo" color={ORANGE} />
      </Center>
    </Photo>
  );
  const to = (
    <Photo src={IMG.cloud} zoom={1.04}>
      <Center style={{ gap: 40 }}>
        <div style={{ ...say(84, INK, 560) }}>Plan the rest of the week</div>
        <Prompt w={1100} text="Find two more calm mornings" dark />
      </Center>
    </Photo>
  );
  return <WhipGate from={from} to={to} at={22} dir="left" />;
};

const ShoveDemo: React.FC = () => {
  const from = (
    <Ground color={WHITE} light={false}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative', textAlign: 'center' }}>
          <div style={{ ...say(170, INK, 600) }}>sort</div>
          <div style={{ background: INK, margin: '6px -2000px', padding: '0 2000px' }}>
            <div style={{ ...say(170, '#fff', 600) }}>your</div>
          </div>
          <div style={{ ...say(170, INK, 600) }}>inbox</div>
        </div>
      </AbsoluteFill>
    </Ground>
  );
  const to = (
    <Ground color={WHITE} light={false}>
      <AbsoluteFill style={{ alignItems: 'center' }}>
        <Phone w={580} ground={WHITE} screen="#DCE3EC" style={{ marginTop: -600 }}>
          <Pic src={IMG.waves} style={{ position: 'absolute', inset: 0, height: '100%' }} />
          <div style={{ position: 'absolute', left: 22, right: 22, bottom: 110, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Notice w={492} app="Mail" title="4 replies drafted" body="Ready for you to send" icon="Mail" />
            <Notice w={492} app="Mail" title="Invoice from the school" body="Paid, filed under Surf" color={ORANGE} icon="Receipt" time="2m" />
          </div>
        </Phone>
      </AbsoluteFill>
    </Ground>
  );
  return <Shove from={from} to={to} at={22} dir="left" cuts={[449, 632]} lag={3} alternate enterFrom="top" ground={WHITE} />;
};

const MatchDemo: React.FC = () => {
  const style = say(150, INK, 600);
  const L = useTextLayout('Approved', style);
  const tile = 120;
  const gap = 40;
  // the line is the word and a tile after it, centred together
  const total = L.width + gap + tile;
  const ax = 960 - total / 2 + tile / 2;
  const a = { x: ax, y: 540, w: tile, h: tile, r: 28, color: COBALT };
  const b = { x: 960, y: 540, w: 300, h: 300, r: 68, color: COBALT };
  const check = <Icon name="Check" size={150} color="#fff" stroke={2.5} />;
  const from = (
    <Ground color={PAPER} light={false}>
      <div style={{ position: 'absolute', left: 960 - total / 2 + tile + gap, top: 540 - L.height / 2, ...style }}>Approved</div>
      <div style={{ position: 'absolute', left: a.x - tile / 2, top: a.y - tile / 2, width: tile, height: tile, borderRadius: 28, background: COBALT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="Check" size={60} color="#fff" stroke={2.5} />
      </div>
    </Ground>
  );
  const tiles: Array<[number, number, string]> = [
    [-1, -1, IMG.cloud],
    [0, -1, IMG.delta],
    [1, -1, IMG.waves],
    [-1, 0, IMG.tide],
    [1, 0, IMG.farms],
    [-1, 1, IMG.shore],
    [0, 1, IMG.waves],
    [1, 1, IMG.delta],
  ];
  const ToScene: React.FC = () => {
    const f = useCurrentFrame();
    return (
      <Ground color={PAPER} light={false}>
        {tiles.map(([i, j, src], k) => {
          const p = ease.out(clamp((f - 36 - k * 1.2) / 12));
          return (
            <div key={k} style={{ position: 'absolute', left: 960 + i * 340 - 150, top: 540 + j * 340 - 150, width: 300, height: 300, borderRadius: 68, overflow: 'hidden', opacity: clamp(p * 3), transform: `scale(${mix(p, 0.7, 1)})` }}>
              <Pic src={src} style={{ objectPosition: `${30 + k * 8}% 50%` }} />
            </div>
          );
        })}
        <div style={{ position: 'absolute', left: 810, top: 390, width: 300, height: 300, borderRadius: 68, background: COBALT, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{check}</div>
      </Ground>
    );
  };
  return <ShapeMatch from={from} to={<ToScene />} at={22} a={a} b={b} ground={PAPER} dur={14} inside={check} />;
};

const GlitchDemo: React.FC = () => {
  const to = (
    <Photo src={IMG.farms} zoom={1.05}>
      <Center>
        <div style={{ ...say(120, '#fff', 560), textShadow: shadowText }}>Most of it goes unseen</div>
      </Center>
    </Photo>
  );
  return <GlitchCut from={<Board />} to={to} at={26} />;
};

const SweepDemo: React.FC = () => (
  <Photo src={IMG.cloud} zoom={1.05}>
    <Center style={{ gap: 56 }}>
      <LightSweep at={14} w={1000} h={150} radius={36} dur={14}>
        <Prompt w={1000} text="Plan my launch week" dark />
      </LightSweep>
      <LightSweep at={34} w={360} h={110} radius={55} color={SKY} dur={10} strength={0.9}>
        <div style={{ width: 360, height: 110, borderRadius: 55, background: COBALT, display: 'flex', alignItems: 'center', justifyContent: 'center', ...say(40, '#fff', 560) }}>Get started</div>
      </LightSweep>
    </Center>
  </Photo>
);

const BloomDemo: React.FC = () => {
  const f = useCurrentFrame();
  const p = ease.out(clamp((f - 14) / 14));
  return (
    <Ground color={NIGHT} light={false}>
      <Center>
        <Bloom radius={40} strength={0.42} pulse={{ at: 14, up: 3, down: 14, gain: 2.2 }}>
          <div style={{ width: 1000, borderRadius: 40, overflow: 'hidden', background: '#16181C', transform: `scale(${mix(p, 0.92, 1)})`, opacity: clamp((f - 13) / 2), fontFamily: fonts.inter, color: '#fff', textAlign: 'left' }}>
            <div style={{ height: 480, position: 'relative' }}>
              <Pic src={IMG.waves} />
              <div style={{ position: 'absolute', left: 28, top: 28, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderRadius: 999, background: ORANGE, fontSize: 28, fontWeight: 600 }}>
                <div style={{ width: 14, height: 14, borderRadius: 7, background: '#fff' }} />
                Live
              </div>
            </div>
            <div style={{ padding: '28px 34px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 40, fontWeight: 600 }}>North beach, now</div>
                <div style={{ fontSize: 28, opacity: 0.55, marginTop: 4 }}>2.1 m swell, 1,204 watching</div>
              </div>
              <Avatars n={3} size={56} ring="#16181C" />
            </div>
          </div>
        </Bloom>
      </Center>
    </Ground>
  );
};

const TrackDemo: React.FC = () => {
  const f = useCurrentFrame();
  const style = say(240, '#fff', 560);
  const word = 'Launch';
  const L = useTextLayout(word, style);
  // the glyphs ride a slow arc that bends and settles
  const place = (i: number, frame: number) => {
    const g = L.chars[i];
    if (!g) return { x: 0, y: 0, rot: 0, g };
    const u = (g.cx - L.width / 2) / (L.width / 2);
    const bb = mix(ease.out(clamp(frame / 50)), 0.5, 0.18);
    const x = 960 + (g.cx - L.width / 2) * 1.08;
    const y = 520 + u * u * 220 * bb + Math.sin(frame / 14 + i) * 4;
    return { x, y, rot: u * 26 * bb, g };
  };
  return (
    <Photo src={IMG.farms} zoom={1.08} dim={0.38}>
      {L.ready &&
        word.split('').map((ch, i) => {
          const q = place(i, f);
          return (
            <div key={i} style={{ position: 'absolute', left: q.x, top: q.y, transform: `translate(-50%, -50%) rotate(${q.rot}deg)`, ...style }}>
              {ch}
            </div>
          );
        })}
      {L.ready && (
        <TrackOverlay
          at={10}
          track={(fr) =>
            word.split('').map((_, i) => {
              const q = place(i, fr);
              return { x: q.x, y: q.y, w: (q.g?.ink.width ?? 100) + 26, h: (q.g?.ink.height ?? 160) + 30, rot: q.rot };
            })
          }
        />
      )}
    </Photo>
  );
};

const DotScreenDemo: React.FC = () => {
  const f = useCurrentFrame();
  // an LED board: the word's dots shrink to nothing (6 f, ease in), then the picture lights up in the same grid as its
  // dots grow (10 f, ease out), and the grid relaxes to half over the plain picture. No flicker, no hard light change.
  const out = ease.in(clamp((f - 34) / 6));
  const up = ease.out(clamp((f - 40) / 10));
  const relax = ease.inOut(clamp((f - 54) / 14));
  return (
    <>
      <Sequence durationInFrames={40}>
        <Ground color={NIGHT} light={false}>
          <DotScreen pitch={15} dot={0.8 * (1 - out) + 0.001}>
            <Center>
              <div style={{ ...say(420, '#F2F2F2', 800), letterSpacing: '-0.02em' }}>Ready</div>
            </Center>
          </DotScreen>
        </Ground>
      </Sequence>
      <Sequence from={40}>
        <AbsoluteFill style={{ background: NIGHT }}>
          <DotScreen pitch={15} dot={mix(up, 0.05, 0.86)} amount={1 - 0.45 * relax} off="rgba(255,255,255,0.09)">
            <Photo src={IMG.waves} t0={40} />
          </DotScreen>
          <Center>
            <Rise at={14} style={say(110, '#fff', 600)}>
              <span style={{ textShadow: shadowText }}>Seen in every pixel</span>
            </Rise>
          </Center>
        </AbsoluteFill>
      </Sequence>
    </>
  );
};

const ChromaDemo: React.FC = () => {
  const f = useCurrentFrame();
  // three photo cards land on a pile, one per beat; each landing splits the channels for two frames
  const cards: Array<[number, string, string, number, number]> = [
    [14, IMG.tide, 'Low tide', -7, -220],
    [28, IMG.farms, 'Kelp farms', 5, 0],
    [42, IMG.waves, 'Morning swell', -2, 220],
  ];
  return (
    <Ground color={PAPER} light={false}>
      {cards.map(([t, src, name, rot, dx]) => {
        if (f < t) return null;
        const p = ease.out(clamp((f - t + 1) / 6));
        return (
          <ChromaHit key={src} at={t} px={14}>
            <Center>
              <div style={{ width: 620, height: 760, borderRadius: 34, background: '#fff', padding: 22, boxSizing: 'border-box', boxShadow: softShadow(4, PAPER), transform: `translateX(${dx}px) rotate(${rot}deg) scale(${mix(p, 1.22, 1)})` }}>
                <div style={{ width: '100%', height: 600, borderRadius: 20, overflow: 'hidden' }}>
                  <Pic src={src} />
                </div>
                <div style={{ ...say(44, INK, 560), marginTop: 26, textAlign: 'left', paddingLeft: 8 }}>{name}</div>
              </div>
            </Center>
          </ChromaHit>
        );
      })}
    </Ground>
  );
};

const MorphDemo: React.FC = () => {
  const f = useCurrentFrame();
  const dots = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ width: 16, height: 16, borderRadius: 8, background: '#5B6170', transform: `translateY(${Math.sin(f / 4 - i) * 5}px)` }} />
      ))}
    </div>
  );
  const pill = <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...say(36, INK, 550) }}>Three things for today</div>;
  const card = (
    <div style={{ padding: '30px 36px', fontFamily: fonts.inter, color: INK, textAlign: 'left' }}>
      <div style={{ fontSize: 36, fontWeight: 600 }}>Three things for today</div>
      {['Reply to the proposal', 'Review the new layouts', 'Team sync at 3pm'].map((t, i) => (
        <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 31, marginTop: 18 }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, border: `2.5px solid ${[COBALT, ORANGE, SUN][i]}` }} />
          {t}
        </div>
      ))}
    </div>
  );
  const win = (
    <div style={{ fontFamily: fonts.inter, color: INK, textAlign: 'left' }}>
      <div style={{ height: 68, display: 'flex', alignItems: 'center', gap: 10, padding: '0 26px', borderBottom: '1px solid rgba(0,0,0,.07)' }}>
        {[CORAL, SUN, SKY].map((c) => (
          <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
        ))}
        <div style={{ marginLeft: 20, fontSize: 28, fontWeight: 550 }}>Today</div>
        <div style={{ marginLeft: 'auto' }}>
          <Avatars n={3} size={44} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 24, padding: 30 }}>
        {([['Proposal', COBALT, IMG.delta, 'Due 12:00'], ['Layouts', ORANGE, IMG.waves, '6 screens'], ['Sync', SUN, IMG.cloud, '15:00, 30 min']] as const).map(([t, c, src, d]) => (
          <div key={t} style={{ flex: 1, height: 330, borderRadius: 22, background: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ height: 160 }}>
              <Pic src={src} />
            </div>
            <div style={{ padding: '18px 22px' }}>
              <div style={{ width: 54, height: 8, borderRadius: 4, background: c }} />
              <div style={{ fontSize: 34, fontWeight: 600, marginTop: 14 }}>{t}</div>
              <div style={{ fontSize: 26, opacity: 0.55, marginTop: 4 }}>{d}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <Photo src={IMG.tide} zoom={1.06}>
      <MorphBox
        shadow={softShadow(4, '#55606B')}
        stages={[
          { at: 0, box: { x: 960, y: 560, w: 140, h: 72, r: 36 }, color: '#EEF1F6', content: dots },
          { at: 16, box: { x: 960, y: 560, w: 520, h: 84, r: 42 }, color: '#FFFFFF', content: pill, dur: 10 },
          { at: 32, box: { x: 960, y: 560, w: 720, h: 320, r: 34 }, color: '#FFFFFF', content: card, dur: 14 },
          { at: 64, box: { x: 960, y: 560, w: 1240, h: 500, r: 28 }, color: '#FFFFFF', content: win, dur: 14 },
        ]}
      />
    </Photo>
  );
};

const SEGS: Seg[] = [
  { name: 'Dot reveal', len: dotRevealEnd(22) + 30, C: DotRevealDemo },
  { name: 'Dot reveal, square cells out of a photo', len: dotRevealEnd(18, { sweep: 16 }) + 40, C: PixelDissolveDemo },
  { name: 'Block burst, then a staircase eat', len: 14 + 28 + 14 + 18 + blockBurstEnd(0, { reach: 16 }) + 30, C: BlockBurstDemo },
  { name: 'Grow iris: circle, then rounded', len: 54 + 16 + 8 + 34, C: GrowIrisDemo },
  { name: 'Dive into', len: 24 + 20 + 50, C: DiveIntoDemo },
  { name: 'Whip gate', len: whipGateEnd(22) + 30, C: WhipDemo },
  { name: 'Shove', len: 22 + 24 + 30, C: ShoveDemo },
  { name: 'Shape match', len: 22 + 14 + 44, C: MatchDemo },
  { name: 'Glitch cut', len: glitchCutEnd(26) + 34, C: GlitchDemo },
  { name: 'Light sweep', len: 66, C: SweepDemo },
  { name: 'Bloom', len: 64, C: BloomDemo },
  { name: 'Track overlay', len: 80, C: TrackDemo },
  { name: 'Dot screen', len: 84, C: DotScreenDemo },
  { name: 'Chroma hit', len: 72, C: ChromaDemo },
  { name: 'Morph box', len: 100, C: MorphDemo },
];

export const reelTurnsStarts = SEGS.reduce<number[]>((acc, s, i) => [...acc, i === 0 ? 0 : acc[i - 1] + SEGS[i - 1].len], []);
export const reelTurnsDuration = SEGS.reduce((a, s) => a + s.len, 0);

export const ReelTurns: React.FC = () => (
  <AbsoluteFill style={{ background: NIGHT }}>
    {SEGS.map((s, i) => (
      <Sequence key={s.name} from={reelTurnsStarts[i]} durationInFrames={s.len}>
        <s.C />
        <Label name={s.name} />
      </Sequence>
    ))}
  </AbsoluteFill>
);
