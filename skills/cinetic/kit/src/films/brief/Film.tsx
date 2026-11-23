// "Brief": an AI that reads your tools every morning and gives you one page. ~14 s at 30 fps, an invented product.
// One world: warm paper, ink, one vermilion accent, one voice (Inter for statements and UI), real marks for the tools it reads.
// Three grounds, cut on objects: paper/white (base), vermilion (the accent flood), night (the inverse).
// Third pass (critic 2 + the round-3 rules): the camera is always going somewhere, Brief's reading is the spectacle, the
// answer's title is seen giant before the page, the result is a relay of one pinned artefact through three hosts.
//
// BEATS (frames, composition tag, what the viewer sees; how it hands off)
//  1   0-40  stack        14 real notifications pile up in a tilted depth ladder; the camera climbs with the pile
//  2  40-92  giant-type   the pile sinks back, pale and blurred, while "Too much / to read." rises in front of it; the
//                         camera lifts and pushes; the full stop pops and grows into the vermilion ground   (cut 1, HIT 92)
//  3  92-124 macro        the ask bar at 140 px, cropped both sides: two words typed, the rest lands at once; the camera
//                         rides the caret, pulls back on send
//  4 124-186 spectacle    the bar's white body grows into a wall of 217 updates (every row real); the camera pulls back
//                         from one row in macro to all of them, tilting, while Brief reads: a vermilion wave crosses the
//                         wall, each row flashes and greys as it is read, four stay lit (the accent: "needs you")
//  5 174-206 output-big   the wall drains; "Four things need you." lands at 160 px while the four lit rows fly in under
//                         it; the title and the rows travel into the page together                       (cut 2: the page)
//  6 206-254 full-ui>macro the page; the pointer opens the first row while the camera pushes from the page to 2.7x on
//                         Approve; the press
//  7 254-268 flood        the pressed button's ink floods night; the approval lifts off as a plate (the artefact)
//  8 268-346 surface x3   a relay: the plate pinned at 61 % of the width while the host changes around it: GitHub as a
//                         full-bleed diff on night, Linear as a tilted issue on vermilion, the calendar in macro on paper
//  9 346-366 giant-type   the calendar sinks behind a veil, "4 hours back." lands over it, the number steps 2-3-4
// 10 366-422 object       its full stop floods vermilion again (a bookend) and the mark is born: lockup (56 f)
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
  mixColor,
  Music,
  onTwos,
  Output,
  rand,
  Relay,
  Row,
  springAt,
  springs,
  useTextWidth,
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
// one voice: Inter (optical sizing gives the display cut at large sizes). Statements at 520; 620-640 only for the one
// spectacle line, a figure and the wordmark. Sizes by word count: the spectacle 330, resting lines 144-150, tails 64+.
const display: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 520, letterSpacing: '-0.02em', color: INK };
const PROOF_FS = 150; // "4 hours back.": three words, a resting line with its figure in the accent

// ---------------------------------------------------------------- one timeline: every scene and every sound reads it
const TOAST_F = [-3, 5, 11, 16, 20, 23, 26, 29, 31, 33, 35, 37, 39, 41];
const T = {
  recede: 40, // the pile sinks back behind the line
  words: [42, 47, 53, 58],
  stop: 64,
  grow: 76, // the stop grows for 16 f: the vermilion ground is full at 92 (MAIN HIT)
  bar: 92,
  typeAt: 96,
  pull: 112,
  send: 120,
  wall: 124, // the bar's body grows into the wall for 14 f
  ev: 136, // the reading wave
  gather: 168, // the wall drains, the four lit rows lift off
  title: 174, // "Four things need you." giant (Output), lands at T.land
  land: 206, // the page: title and rows in place
  click: 218,
  approve: 246,
  ink: 254, // the button floods night for 14 f
  hosts: [268, 294, 320], // the relay's three hosts
  proofIn: 346,
  digits: [346, 351, 356], // the count steps 2, 3, 4 on hard cuts
  hours: 347,
  back: 349,
  stop2: 360,
  lock: 366, // the second stop grows for 14 f
  end: 422,
} as const;
const HIT = T.grow + 16;

/** The film's own mark: a page with a folded corner and one line (invented for this fictional product). */
const Mark: React.FC<{ size: number; color?: string; fold?: string }> = ({ size, color = ACCENT, fold = '#FFB59E' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block', flexShrink: 0 }}>
    <path d="M18 8 H64 L84 28 V86 a6 6 0 0 1 -6 6 H18 a6 6 0 0 1 -6 -6 V14 a6 6 0 0 1 6 -6 Z" fill={color} />
    <path d="M64 8 V22 a6 6 0 0 0 6 6 H84 Z" fill={fold} />
    <rect x="26" y="50" width="40" height="8" rx="4" fill={color === ACCENT ? WHITE : ACCENT} />
    <rect x="26" y="66" width="26" height="8" rx="4" fill={color === ACCENT ? WHITE : ACCENT} opacity={0.7} />
  </svg>
);

/** A flood box: an object's screen box grown in log space past the frame, as a clip-path, so the next shot is revealed
 *  through it at full opacity instead of fading in. */
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
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 46, fontWeight: 600, letterSpacing: '-0.01em' }}>
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
  // the stack climbs and flattens as it fills, then sinks back, pale and soft, behind the line (it keeps moving)
  const fill = at(f, 0, 50, ease.soft);
  const climb = mix(fill, 20, -60);
  const sink = at(f, T.recede, 40, ease.out);
  return (
    <AbsoluteFill style={{ perspective: 1800, opacity: 1 - 0.62 * sink }}>
      <AbsoluteFill
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateY(${climb - sink * 160 - 30 * creep(f, T.recede + 20, 50)}px) rotateX(${mix(fill, 24, 9) + sink * 14}deg) scale(${mix(fill, 1.18, 1.05) * mix(sink, 1, 0.78)})`,
          filter: sink > 0.02 ? `blur(${sink * 14}px)` : undefined,
        }}
      >
        <DepthStack x={960} y={720} lift={[0, 128, 240, 338, 424, 496]} rise={170} items={TOAST_F.map((ff, i) => ({ f: ff, node: <Toast1 i={i} /> }))} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2. the line, whose full stop floods the ground
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
  // the camera rises with the words (a tilt that settles) and pushes; the grow adds a last push into the stop
  const rise = at(f, T.words[0] - 2, 34, ease.out);
  const push = 1 + 0.07 * creep(f, T.words[0], 50) + 0.06 * at(f, T.grow, 16, ease.in);
  return (
    <AbsoluteFill style={{ perspective: 2000 }}>
      <AbsoluteFill style={{ transform: `translateY(${mix(rise, 70, -10)}px) rotateX(${mix(rise, 14, 0)}deg) scale(${push})`, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...display, fontWeight: 620, letterSpacing: '-0.04em', fontSize: 330, lineHeight: 0.94, textAlign: 'center' }}>
          <div>
            <Words text="Too much" times={[T.words[0], T.words[1]]} arrive="rise" dur={12} style={{ color: INK }} />
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'baseline' }}>
            <Words text="to read" times={[T.words[2], T.words[3]]} arrive="rise" dur={12} style={{ color: INK }} />
            <Stop at0={T.stop} grow={T.grow} size={52} dur={16} />
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3. the ask, in macro on vermilion
const Q = 'What needs me today?';
const CPS = 24;
const BURST = 2; // two words typed, the rest lands at once
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

const keyTimes = typingTimes(Q, T.typeAt, 30, CPS, 3, BURST);
const typedLen = (frame: number) => keyTimes.filter((k) => frame >= k).length;
const CAM0 = 960 - BW / 2 - 120; // the bar's left end sits 120 px in from the frame edge
const followX = (frame: number) => {
  let s = 0;
  for (let k = 0; k < 6; k++) s += Math.max(CAM0, TEXT0 + typedLen(frame - k) * CHAR - 1300);
  return s / 6;
};

const AskBar: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { shown } = useTyped(Q, T.typeAt, CPS, 3, BURST);
  const hasText = shown.length > 0;
  const press = at(f, T.send, 3, ease.out) - at(f, T.send + 3, 10, ease.out);
  const lift = at(f, T.send + 1, 6, ease.in);
  const blink = f < T.typeAt || shown.length < Q.length ? true : Math.floor((f - T.typeAt) / 15) % 2 === 0;
  return (
    <div style={{ position: 'absolute', left: 960 - BW / 2, top: 540 - BH / 2, width: BW, height: BH, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: GAP, padding: `0 ${FS * 0.55}px 0 ${PADL}px`, borderRadius: BH / 2, background: WHITE, boxShadow: '0 30px 80px -24px rgba(110,25,0,.55), 0 6px 18px -6px rgba(110,25,0,.3)', fontFamily: t.font, fontSize: FS, fontWeight: 500, letterSpacing: '-0.025em', color: INK }}>
      <Mark size={MARKW} />
      <div style={{ position: 'relative', flex: 1, height: FS * 1.3, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, lineHeight: `${FS * 1.3}px`, transform: `translateY(${-lift * FS * 1.3}px)`, filter: lift > 0.05 ? `blur(${lift * 10}px)` : undefined }}>
          {hasText ? shown : <span style={{ color: '#A9A39B' }}>Ask Brief</span>}
          <span style={{ display: 'inline-block', width: 8, height: FS * 1.02, marginLeft: 6, transform: `translateY(${FS * 0.17}px)`, background: ACCENT, borderRadius: 4, opacity: blink && f < T.send ? 1 : 0 }} />
        </div>
      </div>
      <div style={{ width: BTN, height: BTN, borderRadius: BTN, flexShrink: 0, background: hasText ? ACCENT : t.fill, color: hasText ? WHITE : t.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${(1 - press * 0.14) * mix(springAt(f, fps, T.typeAt + 2, springs.pop), 0.92, 1)})` }}>
        <Icon name="ArrowUp" size={FS * 0.8} stroke={2.6} />
      </div>
    </div>
  );
};

const Ask: React.FC = () => {
  const f = useCurrentFrame();
  const arrive = at(f, T.bar, 14, ease.out);
  const pull = at(f, T.pull, 14, ease.out);
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
const barBox: Box = { x: 960, y: 540, w: BW * ZB, h: BH * ZB, r: (BH / 2) * ZB };

// ---------------------------------------------------------------- page geometry (the wall's rows are the page's rows)
const L = 170; // page margins in the world
const R = 1750;
const ROW_W = R - L + 48;
const ROW_HT = 153; // a row's laid-out height (Row size 44, padding 26)
const TITLE_TOP = 176;
const TITLE_SIZE = 104;
const TITLE_CY = TITLE_TOP + (TITLE_SIZE * 1.1) / 2;
const ROW0 = 410;
const ROW_H = 152;
const OPEN_H = 240;
const BTN_L = L + 118; // Approve sits under the row's text
const BTN_TOP = ROW0 + ROW_H + 132;
const BTN_W = 210;
const BTN_H = 84;
const BX = BTN_L + BTN_W / 2;
const BY = BTN_TOP + BTN_H / 2;
const PAGE_CAM: CamKey[] = [
  { f: T.land, x: 0, y: 46, zoom: 1.1 },
  { f: T.click - 2, x: -70, y: 10, zoom: 1.34, ry: -1.5, rx: 1, curve: ease.out },
  { f: T.approve - 6, x: BX - 960 + 40, y: BY - 540 - 20, zoom: 2.7, ry: 0, rx: 0, curve: ease.inOut },
  { f: T.ink + 16, x: BX - 960 + 46, y: BY - 540 - 22, zoom: 2.78, curve: ease.linear },
];

const ROWS = [
  { brand: 'github', title: 'Review PR #482: rotate refresh tokens', sub: 'Maya asked you · 2 h ago', trail: '5 min' },
  { brand: 'linear', title: 'ENG-219 is blocked on your answer', sub: 'Sam Ortiz · due today', trail: '2 min' },
  { brand: 'googlecalendar', title: 'Design crit moved to 3:00 PM', sub: 'With Sam and Priya · accept?', trail: '1 min' },
  { brand: 'gmail', title: 'Invoice #2291 needs your approval', sub: 'Northwind Ltd · $4,180.00', trail: '1 min' },
];
const TOOLS = ['github', 'linear', 'gmail', 'notion', 'figma', 'googlecalendar'];

/** One update as a row, at page size (1628 px wide): the wall's cells, the flying rows and the page all draw this. */
const RowCard: React.FC<{ r: { brand: string; title: string; sub: string; trail: string }; bg?: string; ring?: number; fade?: number; lit?: number }> = ({ r, bg = WHITE, ring = 0, fade = 0, lit = 0 }) => (
  <div style={{ width: ROW_W, height: ROW_HT, borderRadius: 30, background: lit > 0 ? mixColor(bg, ACCENT, lit) : bg, boxShadow: ring > 0 ? `0 0 0 ${4 * ring}px rgba(255,79,31,${0.9 * ring}), 0 24px 50px -20px rgba(140,40,10,${0.45 * ring})` : 'inset 0 0 0 2px rgba(40,30,20,0.06)', overflow: 'hidden' }}>
    <div style={{ opacity: 1 - fade }}>
      <Row t={lit > 0.5 ? { ...t, ink: WHITE, muted: '#FFD9CC' } : t} size={44} icon={<BrandTile name={r.brand} size={64} bg={WHITE} shadow="none" />} title={r.title} sub={r.sub} trail={<span style={{ fontFamily: t.font, fontSize: 32, fontVariantNumeric: 'tabular-nums' }}>{r.trail}</span>} style={{ padding: '26px 30px' }} />
    </div>
  </div>
);

// ---------------------------------------------------------------- 4. the wall: everything Brief reads (spectacle)
const UPDATES: Array<{ brand: string; title: string; sub: string; trail: string }> = [
  { brand: 'gmail', title: 'Re: Q3 planning (14 replies)', sub: 'Dana Kim · thread', trail: '7:02' },
  { brand: 'github', title: 'CI failed on main: build / e2e', sub: 'github-actions · 3 jobs', trail: '6:48' },
  { brand: 'notion', title: 'Roadmap H1 was edited', sub: '6 comments mention you', trail: '6:40' },
  { brand: 'figma', title: 'Checkout v3: 9 new comments', sub: 'Priya Shah · file', trail: '6:31' },
  { brand: 'linear', title: '5 issues assigned to you', sub: 'Cycle 18 starts today', trail: '6:30' },
  { brand: 'googlecalendar', title: '1:1 with Sam moved to 4:30 PM', sub: 'Sam Ortiz · updated', trail: '6:22' },
  { brand: 'github', title: 'maya-r mentioned you in #479', sub: 'token expiry on mobile', trail: '6:15' },
  { brand: 'gmail', title: 'Northwind Ltd: contract renewal', sub: 'Legal · 2 attachments', trail: '6:09' },
  { brand: 'notion', title: 'Sam shared “Weekly notes”', sub: 'Team space · page', trail: '6:02' },
  { brand: 'figma', title: 'Onboarding flow: 2 new versions', sub: 'Leo Brandt · file', trail: '5:58' },
  { brand: 'linear', title: 'ENG-231 moved to In review', sub: 'Platform team', trail: '5:51' },
  { brand: 'github', title: 'Dependabot: bump undici to 6.21', sub: 'security · #485', trail: '5:44' },
  { brand: 'gmail', title: 'Your receipt from Vercel', sub: 'billing@vercel.com', trail: '5:40' },
  { brand: 'googlecalendar', title: 'Offsite planning: new time proposed', sub: 'Dana Kim · Thu 11:00', trail: '5:33' },
  { brand: 'notion', title: 'Hiring plan Q4: 3 new comments', sub: 'People team · page', trail: '5:21' },
  { brand: 'figma', title: 'Icons v2 published to library', sub: 'Design system', trail: '5:12' },
  { brand: 'linear', title: 'ENG-207 was closed as done', sub: 'Maya Reyes', trail: '5:06' },
  { brand: 'github', title: 'Release v4.2.0 drafted', sub: 'release-bot · notes', trail: '4:58' },
];
const COLS = 7;
const WROWS = 31; // 217 updates
const CS = 0.32; // a cell is a page row at this scale
const CW = ROW_W * CS;
const CH = ROW_HT * CS;
const GX = 18;
const GY = 14;
const WW = COLS * CW + (COLS - 1) * GX;
const WH = WROWS * CH + (WROWS - 1) * GY;
const cellC = (c: number, r: number) => ({ x: c * (CW + GX) + CW / 2, y: r * (CH + GY) + CH / 2 });
// the four that need you, in the order of the page's rows
const CHOSEN: Array<[number, number]> = [
  [3, 15],
  [1, 12],
  [5, 17],
  [2, 19],
];
const chosenIdx = (c: number, r: number) => CHOSEN.findIndex(([cc, rr]) => cc === c && rr === r);
const WC = cellC(3, 15);
const DMAX = Math.hypot(3 * (CW + GX), 16 * (CH + GY));
const readAt = (c: number, r: number) => T.ev + Math.pow(Math.hypot((c - 3) * (CW + GX), (r - 15) * (CH + GY)) / DMAX, 0.85) * 28;
// the wall's camera: from one row in macro to all of them, a tilt that swings in and settles flat for the gather
const wallCam = (f: number) => {
  const p = at(f, T.wall + 6, T.gather - T.wall - 10, ease.glide);
  const swing = Math.sin(Math.PI * at(f, T.wall + 4, T.gather - T.wall - 2, ease.inOut));
  return {
    zoom: logScale(2.3, 0.47, p) * (1 - 0.06 * at(f, T.wall, 20, ease.out)) * (1 + 0.04 * at(f, T.gather - 4, 30, ease.out)),
    fx: mix(p, WC.x - 120, WW / 2),
    fy: mix(p, WC.y, WH / 2 + 40),
    rx: 20 * swing,
    rz: -4 * swing,
  };
};
const wallToScreen = (f: number, x: number, y: number) => {
  const c = wallCam(f);
  return { x: 960 + (x - c.fx) * c.zoom, y: 540 + (y - c.fy) * c.zoom, s: c.zoom };
};

const WallBeat: React.FC = () => {
  const f = useCurrentFrame();
  const c = wallCam(f);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < WROWS; r++)
    for (let col = 0; col < COLS; col++) {
      const k = chosenIdx(col, r);
      if (k >= 0 && f >= T.gather) continue; // the lit rows fly on their own from here
      const p = cellC(col, r);
      const t0 = readAt(col, r);
      const flash = at(f, t0, 3, ease.out) * (1 - at(f, t0 + 3, 9, ease.out));
      const read = at(f, t0 + 2, 8, ease.out);
      const d = Math.hypot((col - 3) * (CW + GX), (r - 15) * (CH + GY)) / DMAX;
      const drain = at(f, T.gather + (1 - d) * 8, 9, ease.in);
      const u = UPDATES[(r * 5 + col * 7 + (r % 3)) % UPDATES.length];
      cells.push(
        <div key={r * COLS + col} style={{ position: 'absolute', left: p.x - CW / 2, top: p.y - CH / 2, width: CW, height: CH, opacity: 1 - drain, transform: `translateY(${drain * 120}px) scale(${1 - drain * 0.2})` }}>
          <div style={{ width: ROW_W, height: ROW_HT, transformOrigin: '0 0', transform: `scale(${CS}) translateY(${k >= 0 ? -24 * read : 0}px) translate(${k >= 0 ? -ROW_W * 0.04 * read : 0}px, 0px) scale(${k >= 0 ? 1 + 0.08 * read : 1})` }}>
            {k >= 0 ? (
              <RowCard r={ROWS[k]} bg={WHITE} ring={Math.max(read, flash)} lit={read} />
            ) : (
              <RowCard r={u} bg={flash > 0.05 ? `rgba(255,${Math.round(mix(flash, 247, 214))},${Math.round(mix(flash, 241, 196))},1)` : '#F7F4EF'} ring={flash * 0.7} fade={0.62 * read} />
            )}
          </div>
        </div>,
      );
    }
  return (
    <AbsoluteFill style={{ background: WHITE, overflow: 'hidden', perspective: 2200 }}>
      <div style={{ position: 'absolute', left: 960 - c.fx, top: 540 - c.fy, width: WW, height: WH, transformOrigin: `${c.fx}px ${c.fy}px`, transform: `rotateX(${c.rx}deg) rotateZ(${c.rz}deg) scale(${c.zoom})` }}>{cells}</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. the output, giant, then the page
const pageAt = (k: number) => toScreen(camAt(T.land, PAGE_CAM), L - 24 + ROW_W / 2, ROW0 + k * ROW_H + ROW_HT / 2);
const Gather: React.FC = () => {
  const f = useCurrentFrame();
  const titleStyle: React.CSSProperties = { ...display, fontSize: TITLE_SIZE };
  const tw = useTextWidth('Four things need you.', titleStyle);
  const to = toScreen(camAt(T.land, PAGE_CAM), L + tw / 2, TITLE_CY);
  const z = camAt(T.land, PAGE_CAM).zoom;
  return (
    <AbsoluteFill style={{ transform: `scale(${1 + 0.02 * creep(f, T.gather, 40) * (1 - at(f, T.land - 10, 10, ease.inOut))})` }}>
      {CHOSEN.map(([col, r], k) => {
        const a = wallToScreen(T.gather, cellC(col, r).x, cellC(col, r).y - 24 * CS);
        const b = pageAt(k);
        const p = ease.inOut(clamp((f - T.gather - k * 2) / (T.land - T.gather - 6)));
        const s = logScale(a.s * CS, b.scale, p);
        const ring = 1 - at(f, T.land - 8, 8, ease.out);
        return (
          <div key={k} style={{ position: 'absolute', left: mix(p, a.x, b.x), top: mix(p, a.y, b.y) - 90 * Math.sin(Math.PI * p), width: 0, height: 0, zIndex: 4 - k }}>
            <div style={{ position: 'absolute', left: -ROW_W / 2, top: -ROW_HT / 2, transform: `scale(${s}) rotate(${(1 - p) * (k % 2 ? 3 : -3)}deg)`, filter: p > 0.1 && p < 0.85 ? 'blur(1.5px)' : undefined }}>
              <RowCard r={ROWS[k]} ring={ring} bg={WHITE} lit={1 - at(f, T.land - 12, 10, ease.inOut)} />
            </div>
          </div>
        );
      })}
      <Output
        text="Four things need you."
        start={T.title}
        hold={T.land - T.title - 10}
        travel={10}
        from={{ x: 960, y: 250, size: 144 }}
        to={{ x: to.x, y: to.y, size: TITLE_SIZE * z }}
        born={ACCENT}
        style={{ ...display, color: INK }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 6. the page, then the press
const Page: React.FC = () => {
  const f = useCurrentFrame();
  const fe = onTwos(f); // the marks step on twos: digital things step, the camera glides
  const open = at(f, T.click + 2, 20, ease.out);
  const ring = at(f, T.click, 8, ease.out);
  const approved = f >= T.approve + 2;
  const headIn = at(f, T.land, 10, ease.out);
  return (
    <AbsoluteFill style={{ background: WHITE }}>
      <Camera keys={PAGE_CAM}>
        {/* header: the product's own mark in its own header, the date */}
        <div style={{ position: 'absolute', left: L, top: 92, width: R - L, display: 'flex', alignItems: 'center', gap: 18, fontFamily: t.font, opacity: headIn, transform: `translateY(${mix(headIn, -16, 0)}px)` }}>
          <Mark size={56} />
          <span style={{ fontSize: 34, fontWeight: 620, letterSpacing: '-0.01em', color: INK }}>Brief</span>
          <span style={{ marginLeft: 'auto', fontSize: 30, color: t.muted }}>Tue 14 Oct · 7:30 AM</span>
        </div>
        <div style={{ position: 'absolute', left: L, top: TITLE_TOP, ...display, fontSize: TITLE_SIZE, lineHeight: 1.1, whiteSpace: 'nowrap' }}>Four things need you.</div>
        <div style={{ position: 'absolute', left: L, top: 322, display: 'flex', alignItems: 'center', gap: 14, fontFamily: t.font, fontSize: 34, color: t.muted, opacity: headIn }}>
          <span>Read</span>
          <span style={{ color: INK, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>217</span>
          <span>updates from</span>
          {TOOLS.map((b, i) => {
            const s = T.land + 2 + i * 2;
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
          const first = i === 0;
          const top = ROW0 + i * ROW_H + (i > 0 ? mix(open, 0, OPEN_H) : 0);
          const dim = first ? 0 : open;
          return (
            <div key={i} style={{ position: 'absolute', left: L - 24, top, width: ROW_W, opacity: 1 - dim * 0.55, filter: dim > 0.02 ? `blur(${dim * 2.5}px)` : undefined }}>
              <div style={{ borderRadius: 30, background: first ? `rgba(255,79,31,${0.06 * ring})` : 'transparent', boxShadow: first && ring > 0 ? `0 0 0 ${2.5 * ring}px rgba(255,79,31,${0.45 * ring})` : undefined, overflow: 'hidden' }}>
                <Row t={t} size={44} icon={<BrandTile name={row.brand} size={64} bg={WHITE} shadow="none" />} title={row.title} sub={row.sub} trail={<span style={{ fontFamily: t.font, fontSize: 32, fontVariantNumeric: 'tabular-nums' }}>{row.trail}</span>} style={{ padding: '26px 30px' }} />
                {first && open > 0 && (
                  <div style={{ height: mix(open, 0, OPEN_H), position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 142, top: 0, display: 'flex', gap: 30, fontFamily: t.font, fontSize: 34, fontVariantNumeric: 'tabular-nums', opacity: clamp(open * 2) }}>
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
        <div style={{ position: 'absolute', left: L + 6, top: ROW0 + 4 * ROW_H + 18 + mix(open, 0, OPEN_H), display: 'flex', alignItems: 'center', gap: 14, fontFamily: t.font, fontSize: 32, color: t.muted, opacity: at(f, T.land + 4, 8) * (1 - open * 0.55) }}>
          <Brand name="notion" size={36} />
          <Brand name="figma" size={36} />
          <span>213 others can wait</span>
        </div>
        <Cursor
          start={T.land}
          keys={[
            { f: T.land, x: 1560, y: 1180 },
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

// ---------------------------------------------------------------- 7-8. the relay: the approval pinned, the hosts cut around it
const AX = 960;
const AY = 700;
const PLATE_W = 1180; // 61 % of the frame: the thing to read
const ACTS = ['Approved these changes', 'Unblocked: go server-side', 'Accepted: design crit, 3:00 PM'];
const hostIdx = (f: number) => (f >= T.hosts[2] ? 2 : f >= T.hosts[1] ? 1 : 0);

/** The artefact: what Brief did for you, as one plate. The same plate in every host; its line names the act there. */
const Plate: React.FC = () => {
  const f = useCurrentFrame();
  const i = hostIdx(f);
  const swap = i > 0 ? at(f, T.hosts[i], 6, ease.out) : 1;
  return (
    <div style={{ width: PLATE_W, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 34, padding: '30px 44px', borderRadius: 36, background: WHITE, boxShadow: 'inset 0 0 0 3px rgba(255,79,31,0.55), 0 30px 60px -24px rgba(20,10,5,0.55)', fontFamily: t.font, color: INK, whiteSpace: 'nowrap' }}>
      <Mark size={96} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: 32, color: t.muted, display: 'flex', alignItems: 'center', gap: 12 }}>
          You, via Brief <span style={{ opacity: 0.6 }}>·</span> just now
        </div>
        <div style={{ fontSize: 58, fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.2, display: 'flex', alignItems: 'center', gap: 18, transform: `translateY(${mix(swap, 30, 0)}px)`, opacity: clamp(swap * 2) }}>
          <Icon name="Check" size={54} stroke={3} color={ACCENT} />
          {ACTS[i]}
        </div>
      </div>
    </div>
  );
};

const pivot = (s: number, extra = ''): React.CSSProperties => ({ transformOrigin: `${AX}px ${AY}px`, transform: `${extra} scale(${s})` });
const settle = (f: number, start: number, amt = 0.05) => 1 + amt * (1 - at(f, start, 10, ease.out));
const mono: React.CSSProperties = { fontFamily: fonts.mono, whiteSpace: 'pre', letterSpacing: '0' };

/** Host A, GitHub on night: the pull request as a full-bleed diff that rides up behind the plate; the figure giant. */
const DIFF: Array<{ k: ' ' | '+' | '-'; s: string }> = [
  { k: ' ', s: '@@ -41,9 +41,14 @@ export async function refresh(session) {' },
  { k: '-', s: '  const token = await client.refresh(session.token)' },
  { k: '+', s: '  const token = await rotateRefreshToken(session)' },
  { k: '+', s: '  await store.revoke(session.previous)' },
  { k: ' ', s: "  return issue(token, { ttl: '15m' })" },
  { k: '+', s: '  audit.log("rotated", session.user)' },
  { k: ' ', s: '}' },
];
const HostGitHub: React.FC = () => {
  const f = useCurrentFrame();
  const h = T.hosts[0];
  const s = settle(f, h, 0.07) * (1 + 0.07 * at(f, h, T.hosts[1] - h, ease.inOut));
  const ride = mix(at(f, T.ink, T.hosts[1] - T.ink, ease.inOut), 110, -120);
  return (
    <AbsoluteFill style={{ background: NIGHT, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 60% 55% at 70% 20%, rgba(255,79,31,0.12), rgba(255,79,31,0) 70%)' }} />
      <AbsoluteFill style={pivot(s)}>
        <div style={{ position: 'absolute', left: 110, top: 70, display: 'flex', alignItems: 'center', gap: 30, fontFamily: t.font, fontSize: 76, fontWeight: 600, letterSpacing: '-0.015em', color: '#F2EEE8', whiteSpace: 'nowrap' }}>
          <Brand name="github" size={84} color="#F2EEE8" />
          auth: rotate refresh tokens <span style={{ color: '#8B857C', fontWeight: 500 }}>#482</span>
        </div>
        <div style={{ position: 'absolute', left: 110, top: 186, display: 'flex', alignItems: 'center', gap: 22, fontFamily: t.font, fontSize: 36, color: '#A39C93', whiteSpace: 'nowrap' }}>
          <span style={{ background: '#238636', color: WHITE, fontWeight: 600, borderRadius: 999, padding: '8px 26px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon name="GitPullRequest" size={34} color={WHITE} stroke={2.4} /> Open
          </span>
          maya-r wants to merge 6 commits into main
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 290, height: 420, overflow: 'hidden' }}>
          <div style={{ transform: `translateY(${ride}px)` }}>
            {DIFF.map((l, i) => (
              <div key={i} style={{ ...mono, fontSize: 40, lineHeight: '62px', paddingLeft: 110, color: l.k === '+' ? '#7EE2A0' : l.k === '-' ? '#FF9A8A' : '#8B857C', background: l.k === '+' ? 'rgba(46,160,67,0.16)' : l.k === '-' ? 'rgba(248,81,73,0.14)' : 'transparent' }}>
                {l.k} {l.s}
              </div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={pivot(settle(f, h, 0.03))}>
        <div style={{ position: 'absolute', left: 110, top: 820, display: 'flex', alignItems: 'baseline', gap: 40, fontFamily: fonts.inter, fontWeight: 620, fontSize: 190, letterSpacing: '-0.03em', lineHeight: 1, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: '#7EE2A0' }}>+214</span>
          <span style={{ color: '#FF9A8A' }}>−87</span>
          <span style={{ fontFamily: t.font, fontSize: 44, fontWeight: 500, letterSpacing: '0', color: '#A39C93' }}>6 files · 14 tests pass</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host B, Linear on vermilion: the issue as a tilted page; its status flips from Blocked to In progress, large. */
const HostLinear: React.FC = () => {
  const f = useCurrentFrame();
  const h = T.hosts[1];
  const p = ease.out(clamp((f - h) / 22));
  const flip = at(f, h + 8, 6, ease.out);
  const prog = f >= h + 8;
  const txt: React.CSSProperties = { position: 'absolute', fontFamily: t.font, color: INK, whiteSpace: 'nowrap' };
  return (
    <AbsoluteFill style={{ background: ACCENT, overflow: 'hidden', perspective: 1700, perspectiveOrigin: `${AX}px ${AY}px` }}>
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', ...pivot(settle(f, h, 0.04) * mix(p, 1, 1.05) * (1 + 0.06 * at(f, h + 10, 18, ease.inOut)), `rotateX(${mix(p, 26, 15) - 4 * at(f, h + 10, 18, ease.inOut)}deg) rotateZ(${mix(p, -7, -4) + 2 * at(f, h + 10, 18, ease.inOut)}deg)`) }}>
        <div style={{ position: 'absolute', left: 30, top: -80, width: 3200, height: 2600, background: '#FBF7F2', borderRadius: 30, boxShadow: 'inset 0 3px 0 #FFFFFF, -30px 60px 120px rgba(110,25,0,0.5)' }} />
        <div style={{ ...txt, left: 170, top: 10, display: 'flex', alignItems: 'center', gap: 20, fontSize: 38, color: t.muted }}>
          <Brand name="linear" size={58} /> Platform <span style={{ opacity: 0.5 }}>/</span> ENG-219
        </div>
        <div style={{ ...txt, left: 170, top: 100, fontSize: 116, fontWeight: 620, letterSpacing: '-0.025em' }}>Token rotation for mobile</div>
        <div style={{ ...txt, left: 170, top: 300, display: 'flex', alignItems: 'center', gap: 30, fontSize: 40, color: t.muted }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: '-0.015em',
              borderRadius: 999,
              padding: '14px 40px 14px 30px',
              background: prog ? INK : '#EDE6DE',
              color: prog ? WHITE : '#8B857C',
              transform: `scale(${1 + 0.12 * (1 - flip) * (prog ? 1 : 0)})`,
              transformOrigin: 'left center',
            }}
          >
            <Icon name={prog ? 'CircleDot' : 'Ban'} size={74} stroke={2.6} color={prog ? ACCENT : '#8B857C'} />
            {prog ? 'In progress' : 'Blocked'}
          </span>
          Sam Ortiz · due today
        </div>
        <div style={{ ...txt, left: 170, top: 880, fontSize: 46, color: '#5E5850', display: 'flex', alignItems: 'center', gap: 22 }}>
          <span style={{ width: 60, height: 60, borderRadius: 60, background: '#2F7D6D', color: WHITE, fontSize: 30, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SO</span>
          Blocked until we pick an approach.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host C, the calendar in macro on paper: the hours are giant, the crit lands in its slot, the camera rides down the day. */
const HOURS = ['14:00', '15:00', '16:00', '17:00', '18:00'];
const HostCalendar: React.FC = () => {
  const f = useCurrentFrame();
  const h = T.hosts[2];
  const ride = mix(at(f, h, 40, ease.out), 70, -40);
  const land = at(f, h + 4, 10, ease.out);
  const s = settle(f, h, 0.06);
  const HY = 230; // one hour
  const y0 = 110;
  const block = (top: number, hgt: number, color: string, bg: string, title: string, meta: string, extra?: React.CSSProperties) => (
    <div style={{ position: 'absolute', left: 380, right: -80, top, height: hgt, borderRadius: 22, background: bg, borderLeft: `14px solid ${color}`, padding: '20px 36px', boxSizing: 'border-box', fontFamily: t.font, whiteSpace: 'nowrap', ...extra }}>
      <div style={{ fontSize: 50, fontWeight: 600, letterSpacing: '-0.01em', color: INK }}>{title}</div>
      <div style={{ fontSize: 34, color: '#5E5850', marginTop: 6 }}>{meta}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ background: PAPER, overflow: 'hidden' }}>
      <AbsoluteFill style={{ ...pivot(s), translate: `0 ${ride}px` }}>
        <div style={{ position: 'absolute', left: 110, top: y0 - 150, display: 'flex', alignItems: 'center', gap: 24, fontFamily: t.font, fontSize: 44, color: t.muted, whiteSpace: 'nowrap' }}>
          <Brand name="googlecalendar" size={58} /> Tuesday 14 October
        </div>
        {HOURS.map((hh, i) => (
          <React.Fragment key={hh}>
            <div style={{ position: 'absolute', left: 110, top: y0 + i * HY - 34, fontFamily: t.font, fontWeight: 500, fontSize: 58, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums', color: '#9A938A' }}>{hh}</div>
            <div style={{ position: 'absolute', left: 380, right: -60, top: y0 + i * HY, height: 2, background: 'rgba(40,30,20,0.12)' }} />
          </React.Fragment>
        ))}
        {block(y0 - 190, 150, '#4285F4', '#E6EEFB', 'Lunch with Priya', '12:30 – 13:30')}
        {block(y0 + HY + 6, HY - 12, ACCENT, '#FFE3D9', 'Design crit', 'With Sam and Priya · 15:00 – 16:00', {
          transform: `translateX(${mix(land, 900, 0)}px)`,
          boxShadow: `0 0 0 ${3 * (1 - land) + 1}px rgba(255,79,31,0.6), 0 20px 40px -20px rgba(140,40,10,0.5)`,
        })}
        {block(y0 + 2.5 * HY + 6, HY / 2 + 20, '#4285F4', '#E6EEFB', '1:1 with Sam', '16:30 – 17:00')}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const RelayBeat: React.FC = () => (
  <Relay
    anchor={{ x: AX, y: AY }}
    artefact={<Plate />}
    enter={{ f: T.ink, from: { x: btnBox.x, y: btnBox.y, scale: btnBox.w / PLATE_W } }}
    hosts={[
      { f: T.hosts[0], node: <HostGitHub /> },
      { f: T.hosts[1], node: <HostLinear />, pose: 'perspective(1800px) rotateX(8deg) rotateZ(-2deg)' },
      { f: T.hosts[2], node: <HostCalendar /> },
    ]}
  />
);

// ---------------------------------------------------------------- 9. proof, set over the calendar as it sinks back
const Proof: React.FC = () => {
  const f = useCurrentFrame();
  const step = 1 + T.digits.filter((d) => f >= d).length; // 2, 3, 4 on hard cuts
  const last = T.digits[Math.max(0, step - 2)];
  const pop = 1 + 0.1 * (1 - at(f, last, 4, ease.out));
  const push = 1 + 0.04 * creep(f, T.proofIn, 30) + 0.06 * at(f, T.lock, 14, ease.in);
  const sink = at(f, T.proofIn, 12, ease.out);
  const out = at(f, T.proofIn, 6, ease.out);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${mix(sink, 1, 0.9)})`, filter: `blur(${sink * 9}px)` }}>
        <HostCalendar />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: PAPER, opacity: 0.72 * sink }} />
      {/* the plate leaves upward at speed as the line lands */}
      {out < 1 && (
        <div style={{ position: 'absolute', left: AX, top: AY + out * 900, transform: 'translate(-50%, -50%)', filter: out > 0.1 ? `blur(${out * 12}px)` : undefined }}>
          <Plate />
        </div>
      )}
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ transform: `translateY(${carry(f, T.proofIn, 90, 14)}px) scale(${push})` }}>
          <div style={{ ...display, fontSize: PROOF_FS, letterSpacing: '-0.025em', lineHeight: 1, display: 'flex', alignItems: 'baseline', gap: '0.24em', whiteSpace: 'nowrap' }}>
            <span style={{ color: ACCENT, fontWeight: 640, display: 'inline-block', width: '0.6em', textAlign: 'center', transform: `scale(${pop})` }}>{step}</span>
            <Words text="hours" times={[T.hours]} arrive="cut" born={ACCENT} settle={10} style={{ color: INK }} />
            <span style={{ display: 'inline-flex', alignItems: 'baseline' }}>
              <Words text="back" times={[T.back]} arrive="cut" born={ACCENT} settle={10} style={{ color: INK }} />
              <Stop at0={T.stop2} grow={T.lock} size={Math.round(PROOF_FS * 0.16)} dur={14} />
            </span>
          </div>
          <div style={{ ...display, fontSize: 72, fontWeight: 480, letterSpacing: '-0.015em', color: t.muted, marginTop: 20, textAlign: 'center' }}>
            <Words text="every week" times={[T.back + 3, T.back + 6]} arrive="cut" style={{ color: t.muted }} align="center" />
          </div>
        </div>
      </AbsoluteFill>
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
        <div style={{ ...display, fontWeight: 640, letterSpacing: '-0.03em', color: WHITE, fontSize: 180, lineHeight: 1.1, clipPath: `inset(-10% ${mix(w, 100, -2)}% -20% 0)`, transform: `translateX(${mix(w, -50, 0)}px)` }}>Brief</div>
      </div>
      <div style={{ ...display, fontSize: 64, fontWeight: 480, letterSpacing: '-0.015em', color: '#FFE5DB', marginTop: 26 }}>
        <Words text="Your morning, in one page." start={born + 12} arrive="cut" gap={2} style={{ color: '#FFE5DB' }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the film
const burstKey = keyTimes[keyTimes.length - 1];
export const BriefFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    ...TOAST_F.map((x, i) => ({ at: Math.max(0, x), ...s['mixkit-3000'], volume: i < 5 ? 0.5 : 0.26, rate: 0.94 + (i % 4) * 0.05 })),
    { at: T.recede + 4, ...s['mixkit-168'], volume: 0.35 },
    ...T.words.map((w) => ({ at: w, ...s['mixkit-2384'], volume: 0.28 })),
    { at: T.stop, ...s['mixkit-2568'], volume: 0.5 },
    { at: HIT, ...s['mixkit-784'], volume: 0.5, maxS: 1.2 },
    { at: HIT, ...s['mixkit-2299'], volume: 0.85 },
    // one key sound per typed key, one for the rest landing at once
    ...keyTimes.filter((k, i) => i === 0 || k !== keyTimes[i - 1]).map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: k === burstKey ? 0.34 : 0.22, rate: 0.92 + rand(i * 1.7) * 0.18 })),
    { at: T.send, ...s['mixkit-2568'], volume: 0.6 },
    { at: T.wall + 12, ...s['mixkit-175'], volume: 0.4 },
    // the reading wave: soft ticks across it, a brighter one as each of the four lights
    ...[0, 1, 2, 3, 4, 5, 6].map((k) => ({ at: T.ev + k * 4, ...s['mixkit-2384'], volume: 0.14 + 0.015 * k, rate: 0.9 + k * 0.04 })),
    ...CHOSEN.map(([c, r]) => ({ at: Math.round(readAt(c, r)), ...s['mixkit-3124'], volume: 0.34 })),
    { at: T.gather + 2, ...s['mixkit-168'], volume: 0.38 },
    { at: T.title, ...s['mixkit-2568'], volume: 0.42 },
    { at: T.land, ...s['mixkit-3124'], volume: 0.4 },
    { at: T.click, ...s['mixkit-2568'], volume: 0.45 },
    { at: T.approve, ...s['mixkit-2568'], volume: 0.55 },
    { at: T.approve + 2, ...s['mixkit-2867'], volume: 0.45 },
    { at: T.ink + 12, ...s['mixkit-1492'], volume: 0.42 },
    ...T.hosts.map((x) => ({ at: x, ...s['mixkit-2299'], volume: 0.42 })),
    { at: T.hosts[1] + 8, ...s['mixkit-2568'], volume: 0.32 },
    { at: T.hosts[2] + 4, ...s['mixkit-3124'], volume: 0.34 },
    { at: T.proofIn - 2, ...s['mixkit-175'], volume: 0.4 },
    ...T.digits.map((d) => ({ at: d, ...s['mixkit-1049'], volume: 0.38 })),
    { at: T.lock + 12, ...s['mixkit-784'], volume: 0.45, maxS: 1.2 },
    { at: T.lock + 12, ...s['mixkit-2299'], volume: 0.8 },
  ];
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {f < HIT && <Pile />}
      {f >= T.words[0] - 1 && f < T.bar + 1 && <Line />}
      {f >= T.bar && f < T.wall + 15 && <Ask />}
      {f >= T.wall && f < T.gather + 18 && (
        <AbsoluteFill style={{ clipPath: f < T.wall + 14 ? growClip(barBox, at(f, T.wall, 14, ease.in)) : undefined }}>
          <WallBeat />
        </AbsoluteFill>
      )}
      {f >= T.gather + 18 && f < T.land && <AbsoluteFill style={{ background: WHITE }} />}
      {f >= T.gather && f <= T.land && <Gather />}
      {f >= T.land && f < T.ink + 15 && <Page />}
      {f >= T.ink && f < T.hosts[0] && (
        <AbsoluteFill style={{ clipPath: growClip(btnBox, at(f, T.ink, 14, ease.in)) }}>
          <HostGitHub />
        </AbsoluteFill>
      )}
      {f >= T.ink && f < T.proofIn && <RelayBeat />}
      {f >= T.proofIn && f < T.lock + 14 && <Proof />}
      {f >= T.lock + 14 && <Lockup />}
      <Vignette amount={0.1} color="60,40,20" />
      <Grain amount={0.035} />
      {/* main hit HIT moved 112 -> 92: startFrom 11.77 + 20 / 30 */}
      <Music src="music/your-breath.mp3" startFrom={12.44} volume={0.7} duck={[HIT, T.ink + 12, T.lock + 12]} breaths={[HIT, T.proofIn]} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const briefDuration = T.end;
