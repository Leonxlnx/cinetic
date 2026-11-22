// "Brief": an AI that reads your tools every morning and gives you one page. 17.7 s at 30 fps, an invented product.
// One world: warm paper, ink, one vermilion accent, Geist display, Inter UI, real marks for the six tools it reads.
// Three grounds, cut on objects: paper (base), vermilion (the accent flood), night (the inverse).
//
// BEATS (composition tag, what carries the seam)
//  1   0-62  stack       14 real notifications pile up in a tilted depth ladder; the pile leaves upward at speed
//  2  57-112 giant-type  "Too much / to read." at 330 px rises into the pile's wake word by word; its full stop pops
//  3  96-112 flood       the full stop grows into the vermilion ground                 (ground cut 1: paper -> vermilion)
//  4 112-169 macro       the input bar at 140 px, cropped both sides: "Ask Brief", then the question typed; the camera
//                        follows the caret, pulls back on send, the words lift out and three dots take their place
//  5 169-254 full-ui     the bar's white body grows into the page                     (ground cut 2: vermilion -> page)
//                        the dots become the title in place; a count steps to 214; four rows land; the camera glides
//  6 254-304 macro       the pointer opens the first row; the camera pushes to 2.7x on Approve; the press, the state
//  7 304-318 flood       the pressed button's ink floods the frame                     (ground cut 3: page -> night)
//  8 318-452 surface     the result lands inside each tool: GitHub, Linear, Calendar, Gmail, whip-panned on one strip
//  9 452-478 giant-type  "4 hours back." carried in at the strip's speed; the number steps 2-3-4 on hard cuts
// 10 478-530 object      its full stop floods vermilion again (ground cut 4, a bookend) and the mark is born: lockup
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  accel,
  at,
  Brand,
  BrandTile,
  Button,
  Camera,
  camAt,
  Card,
  carry,
  clamp,
  creep,
  Cues,
  Cursor,
  DepthStack,
  ease,
  fonts,
  Grain,
  Icon,
  landBlur,
  lightUI,
  logScale,
  mix,
  Music,
  onTwos,
  PartnerSurface,
  rand,
  Row,
  springAt,
  springs,
  Thinking,
  useTyped,
  Vignette,
  Words,
  toScreen,
  typingTimes,
  type CamKey,
  type Theme,
} from '../../kit';
import { sfx } from '../../sfx';

// ---------------------------------------------------------------- world tokens
const PAPER = '#F2EFE9';
const INK = '#141414';
const NIGHT = '#161412';
const ACCENT = '#FF4F1F';
const WHITE = '#FFFFFF';
const t: Theme = {
  ...lightUI,
  accent: ACCENT,
  ink: INK,
  muted: '#77716A',
  line: 'rgba(40,30,20,0.09)',
  surface: WHITE,
  fill: '#F4F1EC',
  radius: 26,
  shadow: '0 1px 2px rgba(20,20,20,.05), 0 14px 30px -10px rgba(20,20,20,.16), 0 44px 90px -30px rgba(20,20,20,.22)',
};
const display: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 620, letterSpacing: '-0.045em', color: INK };

// ---------------------------------------------------------------- one timeline: every scene and every sound reads it
const TOAST_F = [-3, 7, 14, 20, 25, 29, 33, 36, 39, 41, 43, 45, 47, 49];
const T = {
  pileOut: 50,
  words: [57, 62, 68, 74],
  stop: 80,
  grow: 96, // the stop grows for 16 f: the vermilion ground is full at 112
  bar: 112,
  typeAt: 118,
  pull: 146,
  send: 160,
  dots: 162,
  page: 169, // the bar grows into the page for 16 f
  title: 187,
  count: 189,
  rows: [195, 202, 208, 213],
  rest: 219,
  cursorIn: 226,
  click: 254,
  macro: 262,
  approve: 294,
  ink: 304, // the button floods night for 14 f
  surf: [318, 354, 388, 422], // the strip camera settles on each surface
  exit: 442,
  proofIn: 452,
  digits: [452, 457, 462], // the count steps 2, 3, 4 on hard cuts
  hours: 453,
  back: 455,
  stop2: 468,
  lock: 478, // the second stop grows for 14 f
  end: 530,
} as const;

/** The film's own mark: a page with a folded corner and one line (invented for this fictional product). */
const Mark: React.FC<{ size: number; color?: string; fold?: string }> = ({ size, color = ACCENT, fold = '#FFB59E' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M18 8 H64 L84 28 V86 a6 6 0 0 1 -6 6 H18 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z" fill={color} />
    <path d="M64 8 V22 a6 6 0 0 0 6 6 H84 Z" fill={fold} />
    <rect x="26" y="50" width="40" height="8" rx="4" fill={color === ACCENT ? WHITE : ACCENT} />
    <rect x="26" y="66" width="26" height="8" rx="4" fill={color === ACCENT ? WHITE : ACCENT} opacity={0.7} />
  </svg>
);

/** A flood box: an object's screen box grown in log space past the frame (the same geometry as the kit's Flood), as a
 *  clip-path, so the next shot is revealed through it at full opacity instead of fading in. */
type Box = { x: number; y: number; w: number; h: number; r: number };
const growClip = (b: Box, p: number) => {
  const k = logScale(1, 40, p) - 1;
  const l = Math.max(-40, b.x - b.w / 2 - k * Math.max(1, b.x - b.w / 2));
  const r = Math.min(1960, b.x + b.w / 2 + k * Math.max(1, 1920 - b.x - b.w / 2));
  const top = Math.max(-40, b.y - b.h / 2 - k * Math.max(1, b.y - b.h / 2));
  const bot = Math.min(1120, b.y + b.h / 2 + k * Math.max(1, 1080 - b.y - b.h / 2));
  return `inset(${top}px ${1920 - r}px ${1080 - bot}px ${l}px round ${mix(p, b.r, 0)}px)`;
};

// ---------------------------------------------------------------- 1. the pile
const TOASTS: Array<{ brand: string; title: string; body: string }> = [
  { brand: 'gmail', title: 'Q3 planning', body: '14 new replies' },
  { brand: 'github', title: 'Review requested', body: 'auth: rotate refresh tokens #482' },
  { brand: 'linear', title: 'ENG-219 is blocked', body: 'Waiting on you since Tuesday' },
  { brand: 'notion', title: 'Roadmap doc edited', body: '6 comments mention you' },
  { brand: 'figma', title: 'Checkout v3', body: 'Priya left 9 comments' },
  { brand: 'googlecalendar', title: 'Design crit moved', body: 'Now 3:00 PM today' },
  { brand: 'gmail', title: 'Invoice #2291', body: 'Needs your approval' },
  { brand: 'github', title: 'CI failed on main', body: 'build / e2e (3 jobs)' },
  { brand: 'linear', title: '5 issues assigned', body: 'Cycle 18 starts today' },
  { brand: 'notion', title: 'Weekly notes', body: 'Sam shared a page' },
  { brand: 'figma', title: 'Onboarding flow', body: '2 new versions' },
  { brand: 'googlecalendar', title: '1:1 with Sam', body: 'Moved to 4:30 PM' },
  { brand: 'github', title: 'maya-r mentioned you', body: 'in #479: token expiry' },
  { brand: 'gmail', title: 'Northwind Ltd', body: 'Re: contract renewal' },
];

const Toast1: React.FC<{ i: number }> = ({ i }) => {
  const x = TOASTS[i];
  return (
    <Card t={t} w={1360} pad={34} style={{ display: 'flex', gap: 30, alignItems: 'center', borderRadius: 38, transform: `rotate(${(rand(i * 3.1 + 1) - 0.5) * 2.4}deg)` }}>
      <BrandTile name={x.brand} size={104} bg="#F6F4F0" shadow="none" />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 46, fontWeight: 650, letterSpacing: '-0.02em' }}>
          <span>{x.title}</span>
          <span style={{ fontSize: 30, color: t.muted, fontWeight: 500 }}>now</span>
        </div>
        <div style={{ fontSize: 34, color: t.muted, marginTop: 6 }}>{x.body}</div>
      </div>
    </Card>
  );
};

const Pile: React.FC = () => {
  const f = useCurrentFrame();
  // the stack climbs and flattens as it fills, then leaves upward at accelerating speed (the line rises into its wake)
  const fill = at(f, 0, 60, ease.soft);
  const climb = mix(fill, 20, -60);
  const leave = accel(f, T.pileOut, 12, 1.45);
  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <AbsoluteFill
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateY(${climb - leave * 1500}px) rotateX(${mix(fill, 24, 9)}deg) scale(${mix(fill, 1.18, 1.05)})`,
          filter: leave > 0.05 ? `blur(${leave * 26}px)` : undefined,
        }}
      >
        <DepthStack x={960} y={720} lift={[0, 128, 240, 338, 424, 496]} rise={170} items={TOAST_F.map((ff, i) => ({ f: ff, node: <Toast1 i={i} /> }))} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2-3. the line, whose full stop floods the ground
const Stop: React.FC<{ at0: number; grow: number; size: number; dur: number }> = ({ at0, grow, size, dur }) => {
  const f = useCurrentFrame();
  const pop = springAt(f, 30, at0, springs.pop);
  const r = logScale(size / 2, 2700, at(f, grow, dur, ease.in));
  if (f < at0) return <span style={{ display: 'inline-block', width: size, height: size, marginLeft: size * 0.16 }} />;
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, marginLeft: size * 0.16 }}>
      <span style={{ position: 'absolute', left: size / 2 - r * pop, top: size / 2 - r * pop, width: r * 2 * pop, height: r * 2 * pop, borderRadius: '50%', background: ACCENT }} />
    </span>
  );
};

const Line: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + 0.035 * creep(f, T.words[0], 60) + 0.05 * at(f, T.grow, 16, ease.in);
  return (
    <AbsoluteFill style={{ transform: `scale(${push})`, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ ...display, fontSize: 330, lineHeight: 0.94, textAlign: 'center' }}>
        <div>
          <Words text="Too much" times={[T.words[0], T.words[1]]} arrive="rise" dur={12} style={{ color: INK }} />
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
          <Words text="to read" times={[T.words[2], T.words[3]]} arrive="rise" dur={12} style={{ color: INK }} />
          <Stop at0={T.stop} grow={T.grow} size={52} dur={16} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 4. the ask, in macro on vermilion
const Q = 'What needs me today?';
const CPS = 19;
const FS = 140; // the bar's type at camera zoom 1
const BW = 2400;
const BH = 320;
const PADL = FS * 0.8;
const MARKW = FS * 1.2;
const GAP = FS * 0.45;
const BTN = FS * 1.6;
const TEXT0 = 960 - BW / 2 + PADL + MARKW + GAP; // world x where the typed text starts
const ZB = 0.55; // the pull-back on send
const CHAR = FS * 0.55; // average advance of Inter at FS

// the kit's typing clock, readable at any frame (the camera follows the caret with a lag; each key has its sound)
const keyTimes = typingTimes(Q, T.typeAt, 30, CPS);
const typedLen = (frame: number) => keyTimes.filter((k) => frame >= k).length;
const CAM0 = 960 - BW / 2 - 120; // the bar's left end sits 120 px in from the frame edge
const followX = (frame: number) => {
  let s = 0;
  for (let k = 0; k < 8; k++) s += Math.max(CAM0, TEXT0 + typedLen(frame - k) * CHAR - 1300);
  return s / 8;
};

const AskBar: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shown } = useTyped(Q, T.typeAt, CPS);
  const hasText = shown.length > 0;
  const press = at(f, T.send, 3, ease.out) - at(f, T.send + 3, 10, ease.out);
  const lift = at(f, T.send + 1, 7, ease.in);
  const dots = at(f, T.dots, 8, ease.out);
  const blink = f < T.typeAt || shown.length < Q.length ? true : Math.floor((f - T.typeAt) / 15) % 2 === 0;
  return (
    <div style={{ position: 'absolute', left: 960 - BW / 2, top: 540 - BH / 2, width: BW, height: BH, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: GAP, padding: `0 ${FS * 0.55}px 0 ${PADL}px`, borderRadius: BH / 2, background: WHITE, boxShadow: '0 30px 80px -24px rgba(110,25,0,.55), 0 6px 18px -6px rgba(110,25,0,.3)', fontFamily: t.font, fontSize: FS, fontWeight: 500, letterSpacing: '-0.025em', color: INK }}>
      <Mark size={MARKW} />
      <div style={{ position: 'relative', flex: 1, height: FS * 1.3, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, lineHeight: `${FS * 1.3}px`, transform: `translateY(${-lift * FS * 1.3}px)`, filter: lift > 0.05 ? `blur(${lift * 10}px)` : undefined }}>
          {hasText ? shown : <span style={{ color: '#A9A39B' }}>Ask Brief</span>}
          <span style={{ display: 'inline-block', width: 8, height: FS * 1.02, marginLeft: 6, transform: `translateY(${FS * 0.17}px)`, background: ACCENT, borderRadius: 4, opacity: blink && f < T.send ? 1 : 0 }} />
        </div>
        {f >= T.dots && (
          <div style={{ position: 'absolute', left: 0, top: 0, height: FS * 1.3, display: 'flex', alignItems: 'center', transform: `translateY(${mix(dots, FS, 0)}px)` }}>
            <Thinking color="#BDB6AC" size={30} />
          </div>
        )}
      </div>
      <div style={{ width: BTN, height: BTN, borderRadius: BTN, flexShrink: 0, background: hasText ? ACCENT : t.fill, color: hasText ? WHITE : t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${(1 - press * 0.14) * mix(springAt(f, fps, T.typeAt + 2, springs.pop), 0.92, 1)})` }}>
        <Icon name="ArrowUp" size={FS * 0.8} stroke={2.6} />
      </div>
    </div>
  );
};

const Ask: React.FC = () => {
  const f = useCurrentFrame();
  const arrive = at(f, T.bar, 16, ease.out);
  const pull = at(f, T.pull, 18, ease.out);
  const zoom = logScale(1.45, 1, arrive) * logScale(1, ZB, pull);
  const x = mix(pull, followX(f), 0);
  return (
    <AbsoluteFill style={{ background: ACCENT, filter: landBlur(f, T.bar, 10, 5) ? `blur(${landBlur(f, T.bar, 10, 5)}px)` : undefined }}>
      <Camera cam={{ x, zoom, rx: mix(arrive, 12, 0) + 3 * Math.sin(pull * Math.PI), ry: mix(arrive, -8, 0) + 0.6 * Math.sin(f / 30) }}>
        <AskBar />
      </Camera>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5-6. the page, then the press
const L = 170; // page margins in the world
const R = 1750;
const TITLE_TOP = 176;
const TITLE_CY = TITLE_TOP + 57;
const ROW0 = 410;
const ROW_H = 152;
const OPEN_H = 240;
const ZP = 1.2;
// the page camera starts where the bar's dots already are on screen, so the dots never move across the seam
const DOTS_SX = 960 + ZB * (TEXT0 - 960);
const PCX0 = L - 960 - (DOTS_SX - 960) / ZP;
const PCY0 = TITLE_CY - 540;
const BTN_L = L + 118; // Approve sits under the row's text
const BTN_TOP = ROW0 + ROW_H + 132;
const BTN_W = 210;
const BTN_H = 84;
const BX = BTN_L + BTN_W / 2;
const BY = BTN_TOP + BTN_H / 2;
const PAGE_CAM: CamKey[] = [
  { f: T.page, x: PCX0, y: PCY0, zoom: ZP },
  { f: T.title, x: PCX0, y: PCY0, zoom: ZP * 1.01, curve: ease.linear },
  { f: T.title + 36, x: 0, y: 46, zoom: 1.1, ry: -1.6, curve: ease.inOut },
  { f: T.click - 4, x: -30, y: 30, zoom: 1.17, ry: -1, rx: 1, curve: ease.glide },
  { f: T.macro + 26, x: BX - 960 + 40, y: BY - 540 - 20, zoom: 2.7, ry: 0, rx: 0, curve: ease.inOut },
  { f: T.ink + 16, x: BX - 960 + 46, y: BY - 540 - 22, zoom: 2.78, curve: ease.linear },
];

const ROWS = [
  { brand: 'github', title: 'Review PR #482: rotate refresh tokens', sub: 'Maya asked you · 2 h ago', trail: '5 min' },
  { brand: 'linear', title: 'ENG-219 is blocked on your answer', sub: 'Sam Ortiz · due today', trail: '2 min' },
  { brand: 'googlecalendar', title: 'Design crit moved to 3:00 PM', sub: 'With Sam and Priya · accept?', trail: '1 min' },
  { brand: 'gmail', title: 'Invoice #2291 needs your approval', sub: 'Northwind Ltd · $4,180.00', trail: '1 min' },
];
const TOOLS = ['github', 'linear', 'gmail', 'notion', 'figma', 'googlecalendar'];

const Page: React.FC = () => {
  const f = useCurrentFrame();
  const fe = onTwos(f); // the count and the marks step on twos: digital things step, the camera glides
  const open = at(f, T.click + 2, 20, ease.out);
  const ring = at(f, T.click, 8, ease.out);
  const approved = f >= T.approve + 2;
  const count = Math.round(mix(at(fe, T.count, 30, ease.out), 0, 214));
  const headIn = at(f, T.page + 9, 10, ease.out);
  return (
    <AbsoluteFill style={{ background: WHITE }}>
      <Camera keys={PAGE_CAM}>
        {/* header: the product's own mark in its own header, the date */}
        <div style={{ position: 'absolute', left: L, top: 92, width: R - L, display: 'flex', alignItems: 'center', gap: 18, fontFamily: t.font, opacity: headIn, transform: `translateY(${mix(headIn, -16, 0)}px)` }}>
          <Mark size={56} />
          <span style={{ fontSize: 34, fontWeight: 650, letterSpacing: '-0.02em', color: INK }}>Brief</span>
          <span style={{ marginLeft: 'auto', fontFamily: t.mono, fontSize: 28, color: t.muted }}>Tue 14 Oct · 7:30 AM</span>
        </div>
        {/* the dots that came from the bar become the title in place */}
        {f < T.title && (
          <div style={{ position: 'absolute', left: L, top: TITLE_CY - 14, height: 28, display: 'flex', alignItems: 'center' }}>
            <Thinking color="#BDB6AC" size={14} />
          </div>
        )}
        <div style={{ position: 'absolute', left: L, top: TITLE_TOP, ...display, fontSize: 104, lineHeight: 1.1, whiteSpace: 'nowrap' }}>
          <Words text="Four things need you." start={T.title} gap={3} arrive="cut" born={ACCENT} settle={14} style={{ color: INK }} align="left" />
        </div>
        <div style={{ position: 'absolute', left: L, top: 322, display: 'flex', alignItems: 'center', gap: 14, fontFamily: t.font, fontSize: 34, color: t.muted, opacity: f >= T.count ? 1 : 0 }}>
          <span>Read</span>
          <span style={{ color: INK, fontWeight: 650, fontVariantNumeric: 'tabular-nums', minWidth: 62 }}>{count}</span>
          <span>updates from</span>
          {TOOLS.map((b, i) => {
            const s = T.count + 2 + i * 3;
            if (fe < s) return null;
            return (
              <span key={b} style={{ display: 'inline-flex', transform: `scale(${fe < s + 2 ? 1.25 : 1})` }}>
                <Brand name={b} size={40} />
              </span>
            );
          })}
        </div>
        <div style={{ position: 'absolute', left: L, top: ROW0 - 14, width: R - L, height: 1, background: t.line, opacity: headIn }} />
        {ROWS.map((row, i) => {
          const s = T.rows[i];
          if (f < s) return null;
          const p = at(f, s, 12, ease.out);
          const first = i === 0;
          const top = ROW0 + i * ROW_H + (i > 0 ? mix(open, 0, OPEN_H) : 0);
          const dim = first ? 0 : open;
          return (
            <div key={i} style={{ position: 'absolute', left: L - 24, top, width: R - L + 48, transform: `translateY(${mix(p, 40, 0)}px)`, opacity: clamp(p * 3) * (1 - dim * 0.55), filter: p < 0.98 || dim > 0.02 ? `blur(${mix(p, 8, 0) + dim * 2.5}px)` : undefined }}>
              <div style={{ borderRadius: 30, background: first ? `rgba(255,79,31,${0.06 * ring})` : 'transparent', boxShadow: first && ring > 0 ? `0 0 0 ${2.5 * ring}px rgba(255,79,31,${0.45 * ring})` : undefined, overflow: 'hidden' }}>
                <Row t={t} size={44} icon={<BrandTile name={row.brand} size={64} bg={WHITE} shadow="none" />} title={row.title} sub={row.sub} trail={<span style={{ fontFamily: t.mono, fontSize: 32 }}>{row.trail}</span>} style={{ padding: '26px 30px' }} />
                {first && open > 0 && (
                  <div style={{ height: mix(open, 0, OPEN_H), position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 142, top: 0, display: 'flex', gap: 30, fontFamily: t.mono, fontSize: 32, opacity: clamp(open * 2) }}>
                      <span style={{ color: '#1A7F4B' }}>+214</span>
                      <span style={{ color: '#C2382A' }}>−87</span>
                      <span style={{ color: t.muted }}>6 files · 14 tests pass</span>
                    </div>
                    <div style={{ position: 'absolute', left: 142, top: 50, fontFamily: t.font, fontSize: 38, color: INK, whiteSpace: 'nowrap' }}>
                      <Words text="Moves token rotation server-side. Safe to merge." start={T.click + 8} arrive="cut" gap={1.6} born={ACCENT} settle={12} style={{ color: INK }} align="left" />
                    </div>
                    <div style={{ position: 'absolute', left: BTN_L - (L - 24), top: BTN_TOP - (ROW0 + ROW_H), display: 'flex', gap: 18, opacity: at(f, T.click + 14, 6) }}>
                      <Button t={{ ...t, accent: INK }} size={34} pressAt={T.approve} label={approved ? 'Approved' : 'Approve'} icon={approved ? <Icon name="Check" size={34} stroke={3} /> : undefined} style={{ boxShadow: '0 10px 26px -10px rgba(20,20,20,.6)' }} />
                      <Button t={t} size={34} primary={false} label="Open in GitHub" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {/* everything else, named and set aside */}
        {f >= T.rest && (
          <div style={{ position: 'absolute', left: L + 6, top: ROW0 + 4 * ROW_H + 18 + mix(open, 0, OPEN_H), display: 'flex', alignItems: 'center', gap: 14, fontFamily: t.font, fontSize: 32, color: t.muted, opacity: at(f, T.rest, 8) * (1 - open * 0.55) }}>
            <Brand name="notion" size={36} />
            <Brand name="figma" size={36} />
            <span>210 others can wait</span>
          </div>
        )}
        <Cursor
          start={T.cursorIn}
          keys={[
            { f: T.cursorIn, x: 1560, y: 1180 },
            { f: T.click - 3, x: 840, y: 468 },
            { f: T.click + 14, x: 860, y: 490 },
            { f: T.approve - 6, x: BX + 30, y: BY + 4 },
          ]}
          clicks={[T.click, T.approve]}
          size={44}
        />
      </Camera>
    </AbsoluteFill>
  );
};

// the pressed button's box on screen, from the page camera at the flood frame (Approved is wider than Approve)
const btnBox = (() => {
  const c = camAt(T.ink, PAGE_CAM);
  const p = toScreen(c, BTN_L + 138, BY);
  return { ...p, w: 276 * c.zoom, h: BTN_H * c.zoom, r: 24 * c.zoom };
})();
const pageBox: Box = { x: 960, y: 540, w: BW * ZB, h: BH * ZB, r: (BH / 2) * ZB };

// ---------------------------------------------------------------- 8. the result, inside each tool
const PITCH = 1700;
const SURF_CAM: CamKey[] = [
  { f: T.ink, x: 0, zoom: 1.4, ry: -9, rx: 4 },
  { f: T.surf[0], x: 0, zoom: 1.08, ry: -3, rx: 1, curve: ease.out },
  { f: T.surf[1] - 12, x: 0, zoom: 1.11, ry: -2.4, rx: 1, curve: ease.glide },
  { f: T.surf[1], x: PITCH, zoom: 1.08, ry: -3, rx: 1, curve: ease.inOut },
  { f: T.surf[2] - 12, x: PITCH, zoom: 1.11, ry: -2.4, curve: ease.glide },
  { f: T.surf[2], x: PITCH * 2, zoom: 1.08, ry: -3, curve: ease.inOut },
  { f: T.surf[3] - 12, x: PITCH * 2, zoom: 1.11, ry: -2.4, curve: ease.glide },
  { f: T.surf[3], x: PITCH * 3, zoom: 1.08, ry: -3, curve: ease.inOut },
  { f: T.exit, x: PITCH * 3, zoom: 1.11, ry: -2.4, curve: ease.glide },
  { f: T.proofIn, x: PITCH * 4.2, zoom: 1.02, ry: -6, curve: ease.in },
];

const viaBrief = (text: string) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 14 }}>
    <Mark size={40} />
    {text}
  </span>
);

const Strip: React.FC = () => {
  const f = useCurrentFrame();
  const v = Math.abs(camAt(f, SURF_CAM).x - camAt(f - 1, SURF_CAM).x);
  const smear = Math.min(10, v * 0.05);
  const s = T.surf;
  const L0 = s.map((x) => x + 8); // the product's own item lands once the camera has settled
  const surfaces = [
    <PartnerSurface key="gh" t={t} brand="github" kind="chat" title="auth: rotate refresh tokens #482" w={1600} h={700} size={48} landAt={L0[0]}
      items={[
        { f: T.ink + 4, who: 'maya-r', meta: '2 h ago', text: 'Could you review before the release cut?', color: '#7A5CFA' },
        { f: T.ink + 8, who: 'github-actions', meta: '12 min ago', text: 'All checks have passed · 6 of 6', color: '#24292F' },
        { f: L0[0], who: 'You', meta: 'via Brief · just now', text: viaBrief('Approved these changes'), color: INK },
      ]} />,
    <PartnerSurface key="li" t={t} brand="linear" kind="chat" title="ENG-219 · Token rotation for mobile" w={1600} h={700} size={48} landAt={L0[1]}
      items={[
        { f: s[1] - 20, who: 'Sam Ortiz', meta: 'Tuesday', text: 'Blocked until we pick an approach.', color: '#2F7D6D' },
        { f: L0[1], who: 'You', meta: 'via Brief · just now', text: viaBrief('Go server-side. Unblocked.'), color: INK },
        { f: L0[1] + 8, who: 'Linear', meta: 'just now', text: 'Status: Blocked → In Progress', color: '#5E6AD2' },
      ]} />,
    <PartnerSurface key="ca" t={t} brand="googlecalendar" kind="tracker" title="Today · Tuesday 14 October" w={1600} h={700} size={48} landAt={L0[2]}
      items={[
        { f: s[2] - 20, text: 'Standup', meta: '10:00', color: '#4285F4' },
        { f: s[2] - 18, text: 'Lunch with Priya', meta: '12:30', color: '#4285F4' },
        { f: L0[2], text: viaBrief('Design crit · accepted'), meta: '15:00', color: ACCENT },
        { f: s[2] - 16, text: '1:1 with Sam', meta: '16:30', color: '#4285F4' },
      ]} />,
    <PartnerSurface key="gm" t={t} brand="gmail" kind="mail" title="Invoice #2291 · Northwind Ltd" w={1600} h={700} size={48} landAt={L0[3]}
      items={[
        { f: s[3] - 20, who: 'Northwind Ltd', meta: '07:02', text: 'Invoice attached: $4,180.00, due Friday' },
        { f: s[3] - 18, who: 'Priya Shah', meta: '07:15', text: 'Matches the PO on my side.' },
        { f: L0[3], who: 'You', meta: 'via Brief · just now', text: viaBrief('Approved. Forwarded to finance.') },
      ]} />,
  ];
  return (
    <AbsoluteFill style={{ background: NIGHT }}>
      <Camera keys={SURF_CAM} perspective={2600} style={{ filter: smear > 0.6 ? `blur(${smear}px)` : undefined }}>
        {surfaces.map((node, i) => {
          // the surface in view is lit, its neighbours wait in the dark at the frame's edges
          const d = Math.abs(camAt(f, SURF_CAM).x / PITCH - i);
          return (
            <div key={i} style={{ position: 'absolute', left: 960 + i * PITCH - 800, top: 540 - 350, filter: `brightness(${mix(clamp(d), 1, 0.55)})` }}>
              {node}
            </div>
          );
        })}
      </Camera>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 9. proof
const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const step = 1 + T.digits.filter((d) => f >= d).length; // 2, 3, 4 on hard cuts
  const last = T.digits[Math.max(0, step - 2)];
  const pop = 1 + 0.1 * (1 - at(f, last, 4, ease.out));
  const push = 1 + 0.03 * creep(f, T.proofIn, 30) + 0.06 * at(f, T.lock, 14, ease.in);
  return (
    <AbsoluteFill style={{ background: NIGHT, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `translateX(${carry(f, T.proofIn, -120, 16)}px) scale(${push})`, filter: landBlur(f, T.proofIn, 12, 5) ? `blur(${landBlur(f, T.proofIn, 12, 5)}px)` : undefined }}>
        <div style={{ ...display, color: WHITE, fontSize: 250, lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '0.2em', whiteSpace: 'nowrap' }}>
          <span style={{ color: ACCENT, display: 'inline-block', width: '0.6em', textAlign: 'center', transform: `scale(${pop})` }}>{step}</span>
          <Words text="hours" times={[T.hours]} arrive="cut" born={ACCENT} settle={10} style={{ color: WHITE }} />
          <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
            <Words text="back" times={[T.back]} arrive="cut" born={ACCENT} settle={10} style={{ color: WHITE }} />
            <Stop at0={T.stop2} grow={T.lock} size={40} dur={14} />
          </span>
        </div>
        <div style={{ ...display, fontSize: 60, fontWeight: 500, letterSpacing: '-0.025em', color: '#A39C93', marginTop: 18, paddingLeft: '0.2em' }}>
          <Words text="every week" times={[T.back + 3, T.back + 6]} arrive="cut" style={{ color: '#A39C93' }} align="left" />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 10. lockup (born from the second full stop)
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const born = T.lock + 12;
  const m = springAt(f, fps, born, springs.heavy);
  const w = at(f, born + 5, 16, ease.out);
  const grow = 1 + 0.04 * at(f, born, T.end - born, ease.out);
  return (
    <AbsoluteFill style={{ background: ACCENT, justifyContent: 'center', alignItems: 'center', transform: `scale(${grow})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <div style={{ transform: `scale(${mix(m, 0.25, 1)}) rotate(${mix(m, -16, 0)}deg)`, opacity: clamp(m * 4) }}>
          <Mark size={196} color={WHITE} fold="#FFC3B0" />
        </div>
        <div style={{ ...display, color: WHITE, fontSize: 220, lineHeight: 1.1, clipPath: `inset(-10% ${mix(w, 100, -2)}% -20% 0)`, transform: `translateX(${mix(w, -50, 0)}px)` }}>Brief</div>
      </div>
      <div style={{ ...display, fontSize: 54, fontWeight: 500, letterSpacing: '-0.02em', color: '#FFE5DB', marginTop: 22 }}>
        <Words text="Your morning, in one page." start={born + 14} arrive="cut" gap={2} style={{ color: '#FFE5DB' }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the film
export const BriefFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    ...TOAST_F.map((x, i) => ({ at: Math.max(0, x), ...s['mixkit-3000'], volume: i < 5 ? 0.5 : 0.26, rate: 0.94 + (i % 4) * 0.05 })),
    { at: T.pileOut + 8, ...s['mixkit-168'], volume: 0.45 },
    ...T.words.map((w) => ({ at: w, ...s['mixkit-2384'], volume: 0.28 })),
    { at: T.stop, ...s['mixkit-2568'], volume: 0.5 },
    { at: T.grow + 16, ...s['mixkit-784'], volume: 0.5, maxS: 1.2 },
    { at: T.grow + 16, ...s['mixkit-2299'], volume: 0.85 },
    ...keyTimes.map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.22, rate: 0.92 + rand(i * 1.7) * 0.18 })),
    { at: T.send, ...s['mixkit-2568'], volume: 0.6 },
    { at: T.page + 14, ...s['mixkit-175'], volume: 0.4 },
    { at: T.title, ...s['mixkit-3124'], volume: 0.4 },
    { at: T.count, ...s['mixkit-1049'], volume: 0.3 },
    ...T.rows.map((r) => ({ at: r, ...s['mixkit-2384'], volume: 0.32 })),
    { at: T.click, ...s['mixkit-2568'], volume: 0.45 },
    { at: T.approve, ...s['mixkit-2568'], volume: 0.55 },
    { at: T.approve + 2, ...s['mixkit-2867'], volume: 0.45 },
    { at: T.ink + 12, ...s['mixkit-1492'], volume: 0.42 },
    ...T.surf.map((x) => ({ at: x + 8, ...s['mixkit-3124'], volume: 0.4 })),
    ...T.surf.slice(1).map((x) => ({ at: x - 6, ...s['mixkit-168'], volume: 0.3 })),
    { at: T.proofIn - 2, ...s['mixkit-175'], volume: 0.4 },
    ...T.digits.map((d) => ({ at: d, ...s['mixkit-1049'], volume: 0.38 })),
    { at: T.lock + 12, ...s['mixkit-784'], volume: 0.45, maxS: 1.2 },
    { at: T.lock + 12, ...s['mixkit-2299'], volume: 0.8 },
  ];
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {f < T.pileOut + 13 && <Pile />}
      {f >= T.words[0] - 1 && f < T.bar + 1 && <Line />}
      {f >= T.bar && f < T.page + 17 && <Ask />}
      {f >= T.page && f < T.ink + 15 && (
        <AbsoluteFill style={{ clipPath: f < T.page + 16 ? growClip(pageBox, at(f, T.page, 16, ease.in)) : undefined }}>
          <Page />
        </AbsoluteFill>
      )}
      {f >= T.ink && f < T.proofIn && (
        <AbsoluteFill style={{ clipPath: f < T.ink + 14 ? growClip(btnBox, at(f, T.ink, 14, ease.in)) : undefined }}>
          <Strip />
        </AbsoluteFill>
      )}
      {f >= T.proofIn && f < T.lock + 14 && <Proof />}
      {f >= T.lock + 14 && <Lockup />}
      <Vignette amount={0.1} color="60,40,20" />
      <Grain amount={0.035} />
      <Music src="music/your-breath.mp3" startFrom={11.77} volume={0.7} duck={[T.grow + 16, T.ink + 12, T.lock + 12]} breaths={[T.grow + 16, T.proofIn]} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const briefDuration = T.end;
