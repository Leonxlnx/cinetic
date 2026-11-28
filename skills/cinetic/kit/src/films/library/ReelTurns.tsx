// The reel of the motion library's turns: each piece in catalogue order (src/kit/library/catalog/), at its catalogue
// frames, with its name in the corner. Every scene carries real content (the licensed photographs in public/img, detailed
// panels), so a turn is judged the way it would be used. No sound. A new turn: one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { BlockBurst, ChipBloom, CollapsePill, CrossFall, DiveInto, DotIris, DotReveal, FaceDive, FrameCollapse, GlitchCut, GrowIris, Interleave, LensIris, PixelFilter, PixelStair, ShapeMatch, Shove, StampHop, StepTear, TileFlood, TiltLift, VelocityCut, WhipGate, WindowOpen, dotRevealEnd } from '../../kit/library';
import { Ground, Phone, fonts, softShadow, ease, mix, clamp, Icon, useTextLayout, shade } from '../../kit';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';
import { Avatars, Board, CORAL, COBALT, Center, IMG, INK, Label, NIGHT, Notice, ORANGE, PAPER, Photo, Pic, Planner, Prompt, Rise, SKY, SUN, WHITE, gx, gy, say, shadowText } from './scenes';

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

// the button grows into the report window, its real content drawn whole inside the growing rectangle from the first frame;
// the card it sits on lies wholly inside the window's rectangle, so nothing of the old scene is left beside the window
const WO_BTN = { x: 1300, y: 772, w: 340, h: 92, r: 46 };
const WO_WIN = { x: 880, y: 540, w: 1460, h: 840, r: 30 };
const WO_AT = 24;
const WindowOpenDemo: React.FC = () => {
  const rows: Array<[string, string, boolean]> = [
    ['Delta, dry season', 'Today, 09:12', true],
    ['Sand bars after the storm', 'Mon, 16:40', false],
    ['Kelp farms, south coast', 'Sun, 11:05', false],
    ['Cloud streets', 'Sat, 07:30', false],
  ];
  const from = (
    <Ground color={PAPER} light={false}>
      <div style={{ position: 'absolute', left: 930, top: 560, width: 620, height: 330, borderRadius: 32, background: '#fff', boxShadow: softShadow(4, PAPER), fontFamily: fonts.inter, color: INK, textAlign: 'left', padding: '40px 44px', boxSizing: 'border-box' }}>
        <div style={{ fontSize: 40, fontWeight: 600 }}>Delta, dry season</div>
        <div style={{ fontSize: 30, opacity: 0.55, marginTop: 8 }}>New field report, 12 photos</div>
      </div>
      <div style={{ position: 'absolute', left: WO_BTN.x - WO_BTN.w / 2, top: WO_BTN.y - WO_BTN.h / 2, width: WO_BTN.w, height: WO_BTN.h }}>{btn}</div>
    </Ground>
  );
  const to = (
    <Ground color={PAPER} light={false}>
      <div style={{ position: 'absolute', left: WO_WIN.x - WO_WIN.w / 2, top: WO_WIN.y - WO_WIN.h / 2, width: WO_WIN.w, height: WO_WIN.h, borderRadius: WO_WIN.r, background: '#fff', boxShadow: softShadow(5, PAPER), overflow: 'hidden', fontFamily: fonts.inter, color: INK, textAlign: 'left' }}>
        <div style={{ height: 76, display: 'flex', alignItems: 'center', gap: 12, padding: '0 30px', borderBottom: '1px solid rgba(0,0,0,.07)' }}>
          {[CORAL, SUN, SKY].map((c) => (
            <div key={c} style={{ width: 16, height: 16, borderRadius: 8, background: c }} />
          ))}
          <div style={{ marginLeft: 24, fontSize: 30, fontWeight: 550 }}>Field reports</div>
          <div style={{ marginLeft: 'auto' }}>
            <Avatars n={3} size={46} />
          </div>
        </div>
        <div style={{ position: 'absolute', left: 24, top: 100, width: 420 }}>
          {rows.map(([t, d, on]) => (
            <div key={t} style={{ padding: '20px 22px', borderRadius: 20, background: on ? '#EEF2FF' : 'transparent', marginBottom: 8 }}>
              <div style={{ fontSize: 31, fontWeight: on ? 600 : 500 }}>{t}</div>
              <div style={{ fontSize: 26, opacity: 0.5, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
        <div style={{ position: 'absolute', left: 480, top: 100, right: 30, bottom: 30, display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ height: 470, borderRadius: 22, overflow: 'hidden' }}>
            <Pic src={IMG.delta} />
          </div>
          <div style={{ fontSize: 48, fontWeight: 600, letterSpacing: '-0.02em' }}>Delta, dry season</div>
          <div style={{ fontSize: 30, opacity: 0.6 }}>Seen from 400 km at 09:12. The channels have moved 40 m since March.</div>
        </div>
      </div>
    </Ground>
  );
  return <WindowOpen from={from} to={to} at={WO_AT} box={WO_BTN} win={WO_WIN} dur={14} face={btn} shadow={softShadow(5, PAPER)} />;
};
const btn = (
  <div style={{ width: '100%', height: '100%', borderRadius: 46, background: COBALT, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.inter, fontSize: 34, fontWeight: 560 }}>Open report</div>
);

// ---- the second set of turns ----

// the line keeps drifting left through the turn; the dot opens in the gap between its two words, fixed on screen
const DI_STYLE = say(104, '#fff', 540);
const DriftLine: React.FC<{ ink: string; text: string }> = ({ ink, text }) => {
  const f = useCurrentFrame();
  return <div style={{ position: 'absolute', left: 0, right: 0, top: 540 - 56, textAlign: 'center', ...DI_STYLE, color: ink, transform: `translateX(${-1.6 * f}px)` }}>{text}</div>;
};
const DotIrisDemo: React.FC = () => {
  const T = 30;
  const L = useTextLayout('Every morning', DI_STYLE);
  // the gap between the words at frame T, on screen
  const gx = L.words.length > 1 ? 960 - L.width / 2 + (L.words[0].x + L.words[0].width + L.words[1].x) / 2 - 1.6 * T : 960;
  const from = (
    <Ground color={NIGHT} light={false}>
      <DriftLine ink="#fff" text="Every morning" />
    </Ground>
  );
  const to = (
    <Ground color={PAPER} light={false}>
      <DriftLine ink={INK} text="Every morning" />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 660, display: 'flex', justifyContent: 'center' }}>
        <Rise at={T + 12} style={say(58, '#4A505B', 500)}>
          a plan for the day, ready before you are
        </Rise>
      </div>
    </Ground>
  );
  return <DotIris from={from} to={to} at={T} x={gx} y={540 - 6} />;
};

const ChipBloomDemo: React.FC = () => {
  const T = 30;
  const from = <Ground color={WHITE} light={false} />;
  const to = (
    <Photo src={IMG.waves} zoom={1} drift={0}>
      <div style={{ position: 'absolute', left: 120, bottom: 150, textAlign: 'left' }}>
        <Rise at={T + 12} style={say(110, '#fff', 560)}>
          <span style={{ textShadow: shadowText }}>Every swell, logged</span>
        </Rise>
      </div>
    </Photo>
  );
  return <ChipBloom from={from} to={to} at={T} before="we keep the sea" after="in one place" style={say(64, INK, 500)} chip={{ w: 200, h: 112, r: 26 }} shadow={softShadow(2, WHITE)} />;
};

// a hexagon face of an isometric block (pointy top), lit from above
const hexPts = (cx: number, cy: number, r: number) => Array.from({ length: 6 }, (_, i) => { const a = ((-90 + 60 * i) * Math.PI) / 180; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');
// the two lower side faces of a hexagonal block, extruded down by half its radius, the left one lighter
const hexSides = (cx: number, cy: number, r: number, c: string) => {
  const p = (deg: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)] as const;
  const q = (a: readonly [number, number], b: readonly [number, number]) => `${a[0]},${a[1]} ${b[0]},${b[1]} ${b[0]},${b[1] + r / 2} ${a[0]},${a[1] + r / 2}`;
  return (
    <>
      <polygon points={q(p(30), p(90))} fill={shade(c, -0.3)} />
      <polygon points={q(p(90), p(150))} fill={shade(c, -0.12)} />
    </>
  );
};
const FD = { x: 640, y: 430, r: 210 };
// the dived face's own label: there while the face waits, gone over the dive's first three frames (it belongs to the
// old scene, so it never rides along the face's edge)
const FaceLabel: React.FC<{ at: number }> = ({ at }) => {
  const f = useCurrentFrame();
  return <div style={{ position: 'absolute', left: FD.x - 200, width: 400, top: FD.y + FD.r + 130, textAlign: 'center', ...say(38, '#D5D8DE', 500), opacity: 1 - clamp((f - at) / 3) }}>Sources</div>;
};
const FaceDiveDemo: React.FC = () => {
  const T = 30;
  const from = (
    <Ground color={NIGHT} light={false}>
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id="fdA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFB49C" /><stop offset="1" stopColor={CORAL} /></linearGradient>
          <linearGradient id="fdB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFE08A" /><stop offset="1" stopColor={SUN} /></linearGradient>
        </defs>
        {hexSides(1040, 640, 150, CORAL)}
        <polygon points={hexPts(1040, 640, 150)} fill="url(#fdA)" />
        {hexSides(1360, 420, 110, SUN)}
        <polygon points={hexPts(1360, 420, 110)} fill="url(#fdB)" />
      </svg>
      {[['Routing', 1040, 640 + 250], ['Limits', 1360, 420 + 190]].map(([t, x, y]) => (
        <div key={t as string} style={{ position: 'absolute', left: (x as number) - 200, width: 400, top: y as number, textAlign: 'center', ...say(38, '#D5D8DE', 500) }}>{t}</div>
      ))}
      <FaceLabel at={T} />
    </Ground>
  );
  const to = (
    <Photo src={IMG.farms} zoom={1} drift={0}>
      <div style={{ position: 'absolute', left: 120, bottom: 150, textAlign: 'left' }}>
        <Rise at={T + 16} style={say(110, '#fff', 560)}>
          <span style={{ textShadow: shadowText }}>Every source, one view</span>
        </Rise>
      </div>
    </Photo>
  );
  return <FaceDive from={from} to={to} at={T} x={FD.x} y={FD.y} r={FD.r} preview={T} solid="#3E8C96" />;
};

const VelocityCutDemo: React.FC = () => {
  const from = (
    <Center>
      <div style={say(110, INK, 560)}>Notes become plans</div>
    </Center>
  );
  const to = (
    <Center>
      <div style={{ transform: 'scale(1.4)' }}>
        <Planner w={900} />
      </div>
    </Center>
  );
  return <VelocityCut from={from} to={to} at={30} dir="left" ground={WHITE} />;
};

const FrameCollapseDemo: React.FC = () => {
  const from = (
    <Photo src={IMG.delta} zoom={1.05} dim={0.42}>
      <Center>
        <div style={{ ...say(110, '#fff', 560), textShadow: shadowText }}>
          The survey
          <br />
          stalls
        </div>
      </Center>
    </Photo>
  );
  const to = (
    <Ground color={WHITE} light={false}>
      <Center>
        <div style={say(120, INK, 560)}>Until today</div>
      </Center>
    </Ground>
  );
  // the panel collapses onto the white the next line is set on, so the ground is the next scene's own, not a new colour
  return <FrameCollapse from={from} to={to} at={20} ground={WHITE} />;
};

const LensIrisDemo: React.FC = () => {
  const from = (
    <Photo src={IMG.tide} zoom={1.06}>
      <Center>
        <div style={{ ...say(110, '#fff', 560), textShadow: shadowText }}>Low tide at 11:04</div>
      </Center>
    </Photo>
  );
  const to = (
    <Ground color={NIGHT} light={false}>
      <Center>
        <Planner dark w={860} />
      </Center>
    </Ground>
  );
  return <LensIris from={from} to={to} at={34} color={NIGHT} rim={SKY} />;
};

const TiltLiftDemo: React.FC = () => {
  const from = (
    <Ground color={WHITE} light={false}>
      <Center>
        <div style={say(120, INK, 560)}>Your week, sorted</div>
      </Center>
    </Ground>
  );
  const card = (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      <div style={{ marginTop: 190, transform: 'scale(1.45)', transformOrigin: '50% 0' }}>
        <Planner w={1000} />
      </div>
    </AbsoluteFill>
  );
  return <TiltLift from={from} to={card} at={26} ground={COBALT} />;
};

const CrossFallDemo: React.FC = () => {
  const from = (
    <Center>
      <div style={say(72, '#fff', 500)}>A new kind of planner</div>
    </Center>
  );
  const to = (
    <Center>
      <div style={say(240, '#fff', 600)}>Tidewise</div>
    </Center>
  );
  return <CrossFall from={from} to={to} at={30} ground={NIGHT} />;
};

const PixelStairDemo: React.FC = () => {
  const from = (
    <Photo src={IMG.shore} zoom={1.05}>
      <Center>
        <div style={{ ...say(96, '#fff', 540), textShadow: shadowText }}>Every tool you open</div>
      </Center>
    </Photo>
  );
  const to = (
    <Ground color="#E7E5E0" light={false}>
      <Center>
        <Rise at={36} style={say(96, INK, 540)}>in one place</Rise>
      </Center>
    </Ground>
  );
  const board = <Board />;
  const field = (
    <Ground color={ORANGE} light={false}>
      <Center>
        <Rise at={44}>
          <div style={{ width: 220, height: 220, borderRadius: 54, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="Waves" size={120} color={ORANGE} stroke={2.4} />
          </div>
        </Rise>
      </Center>
    </Ground>
  );
  return (
    <>
      <Sequence durationInFrames={70}>
        <PixelStair from={from} to={to} at={22} tints={['#FFD27A', '#FFA48C', '#FFE9B8']} />
      </Sequence>
      <Sequence from={70}>
        <PixelStair from={board} to={field} at={16} front="scatter" />
      </Sequence>
    </>
  );
};

const TileFloodDemo: React.FC = () => {
  // three photo cards with their captions: the things the flood carries into the night view
  const slab = (x: number, y: number, src: string, t: string) => (
    <div key={t} style={{ position: 'absolute', left: x - 190, top: y - 135, width: 380, height: 270, borderRadius: 30, overflow: 'hidden', boxShadow: softShadow(4, '#9AA3B0') }}>
      <Pic src={src} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 120, background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,0.55))' }} />
      <div style={{ position: 'absolute', left: 28, bottom: 22, ...say(40, '#fff', 560) }}>{t}</div>
    </div>
  );
  const front = (
    <>
      {slab(600, 650, IMG.tide, 'Low tide')}
      {slab(960, 500, IMG.waves, 'Swell')}
      {slab(1320, 350, IMG.farms, 'Kelp rows')}
    </>
  );
  const grid = (bg: string, line: string) => (
    <Ground color={bg} light={false}>
      <AbsoluteFill style={{ backgroundImage: `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`, backgroundSize: '80px 80px' }} />
    </Ground>
  );
  return <TileFlood from={grid(WHITE, 'rgba(0,0,0,.05)')} to={grid(NIGHT, 'rgba(255,255,255,.05)')} front={front} at={20} />;
};

const InterleaveDemo: React.FC = () => {
  const from = (
    <Ground color={PAPER} light={false}>
      <Center>
        <div style={say(84, INK, 520)}>Thousands of field notes a day</div>
      </Center>
    </Ground>
  );
  return <Interleave from={from} to={<Board />} at={30} />;
};

const StampHopDemo: React.FC = () => {
  const g = <Ground color={NIGHT} light={false} />;
  return <StampHop from={g} to={g} at={30} text="They read it once" next="Now it stays" style={say(96, '#F2F3F5', 500)} color="#F2F3F5" />;
};

const CollapsePillDemo: React.FC = () => {
  const rowA = { x: 960, y: 540, w: 1280, h: 150, r: 34, color: '#F2F3F5' };
  const pillB = { x: 960, y: 820, w: 540, h: 84, r: 42, color: COBALT };
  const other = (y: number, t: string, who: string) => (
    <div style={{ position: 'absolute', left: 960 - 640, top: y - 75, width: 1280, height: 150, borderRadius: 34, background: 'rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 24, padding: '0 34px', boxSizing: 'border-box', ...say(40, '#C9CCD3', 500) }}>
      <Avatars n={1} size={72} ring={NIGHT} />
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 30, opacity: 0.6 }}>{who}</div>
        {t}
      </div>
    </div>
  );
  const from = (
    <Ground color={NIGHT} light={false}>
      {other(355, 'Is the north beach walk still on for Thursday?', 'Jo')}
      {other(725, 'Can we move it to the afternoon tide?', 'Ren')}
    </Ground>
  );
  const row = (
    <div style={{ width: rowA.w, height: rowA.h, display: 'flex', alignItems: 'center', gap: 24, padding: '0 34px', boxSizing: 'border-box', ...say(40, INK, 520) }}>
      <Avatars n={2} size={72} ring="#F2F3F5" />
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 30, opacity: 0.55 }}>Sam, 3 replies</div>
        Can someone send the new times to everyone?
      </div>
    </div>
  );
  const pill = (
    <div style={{ width: pillB.w, height: pillB.h, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, ...say(36, '#fff', 520) }}>
      <Icon name="Send" size={34} color="#fff" />
      Sending to 6 people
    </div>
  );
  const to = (
    <Ground color={NIGHT} light={false}>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 360, display: 'flex', justifyContent: 'center' }}>
        <Rise at={42} style={say(96, '#fff', 560)}>New times, sent</Rise>
      </div>
    </Ground>
  );
  return <CollapsePill from={from} to={to} at={30} a={rowA} b={pillB} row={row} pill={pill} />;
};

const StepTearDemo: React.FC = () => (
  <StepTear from={<Ground color={WHITE} light={false} />} to={<Photo src={IMG.waves} zoom={1.04} />} at={24} words={['Read', 'the', 'whole', 'tide']} style={say(84, '#B5482F', 560)} ink="#B5482F" inkTo="#10263A" y={250} />
);

/** A demo and its name in the corner. */
const named = (C: React.FC): React.FC<DemoProps> => ({ name }) => (
  <>
    <C />
    <Label name={name} />
  </>
);
// the dot reveal twice: out of a phone, then square cells out of a photo board
const DOT_A = dotRevealEnd(22) + 30;
const DotRevealTwice: React.FC<DemoProps> = ({ name }) => (
  <>
    <Sequence durationInFrames={DOT_A}>
      <DotRevealDemo />
      <Label name={name} />
    </Sequence>
    <Sequence from={DOT_A}>
      <PixelDissolveDemo />
      <Label name={`${name}, square cells out of a photo`} />
    </Sequence>
  </>
);

// the pieces in the order the reel plays them; a new piece appends its segment (from = the last from + dur) and
// gives its catalogue entry the same frames
export const SEGMENTS: Segment[] = [
  { name: 'DotReveal', from: 0, dur: 180, render: DotRevealTwice },
  { name: 'BlockBurst', from: 180, dur: 125, render: named(BlockBurstDemo) },
  { name: 'GrowIris', from: 305, dur: 112, render: named(GrowIrisDemo) },
  { name: 'DiveInto', from: 417, dur: 94, render: named(DiveIntoDemo) },
  { name: 'WhipGate', from: 511, dur: 74, render: named(WhipDemo) },
  { name: 'Shove', from: 585, dur: 76, render: named(ShoveDemo) },
  { name: 'ShapeMatch', from: 661, dur: 80, render: named(MatchDemo) },
  { name: 'GlitchCut', from: 741, dur: 68, render: named(GlitchDemo) },
  { name: 'WindowOpen', from: 809, dur: 77, render: named(WindowOpenDemo) },
  { name: 'DotIris', from: 886, dur: 70, render: named(DotIrisDemo) },
  { name: 'ChipBloom', from: 956, dur: 76, render: named(ChipBloomDemo) },
  { name: 'FaceDive', from: 1032, dur: 82, render: named(FaceDiveDemo) },
  { name: 'VelocityCut', from: 1114, dur: 72, render: named(VelocityCutDemo) },
  { name: 'FrameCollapse', from: 1186, dur: 81, render: named(FrameCollapseDemo) },
  { name: 'LensIris', from: 1267, dur: 75, render: named(LensIrisDemo) },
  { name: 'TiltLift', from: 1342, dur: 76, render: named(TiltLiftDemo) },
  { name: 'CrossFall', from: 1418, dur: 72, render: named(CrossFallDemo) },
  { name: 'PixelStair', from: 1490, dur: 136, render: named(PixelStairDemo) },
  { name: 'TileFlood', from: 1626, dur: 74, render: named(TileFloodDemo) },
  { name: 'Interleave', from: 1700, dur: 68, render: named(InterleaveDemo) },
  { name: 'StampHop', from: 1768, dur: 62, render: named(StampHopDemo) },
  { name: 'CollapsePill', from: 1830, dur: 69, render: named(CollapsePillDemo) },
  { name: 'StepTear', from: 1899, dur: 70, render: named(StepTearDemo) },
];

export const reelTurnsDuration = reelDuration(SEGMENTS);
export const ReelTurns: React.FC = () => <Reel film="library-turns" segments={SEGMENTS} background={NIGHT} />;
