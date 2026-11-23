// "Brief": an AI that reads your tools every morning and gives you one page. 14 s at 30 fps, an invented product.
// One world: warm paper, ink, one vermilion accent, one voice (Inter for statements and UI), real marks for the tools it reads.
// Three grounds, each lit by a soft light in its own hue: paper/white (base), vermilion (accent), night (inverse).
// Fourth pass: the back half is rebuilt. The approval no longer floods night and relays a plate through three hosts: it
// becomes each tool's own state on a run of velocity cuts, the benefit is the biggest line after the hook, set on the
// dimmed day it freed, and the mark is born from that line's full stop.
//
// DEVICES (the claim: one page instead of everything, and the hours it gives back)
// - signature: the vermilion full stop, 3 uses: the hook's stop grows into the vermilion ground (ground cut 1), the dot
//   of Linear's status in the chain, the benefit's stop that turns into the mark (the lockup)
// - opening: stack, 14 real notifications piling up in a tilted depth ladder, already moving on frame 0
// - text arrivals: masked rise (the hook); cut-on words with a born tint (every line after it)
// - seams: 1-2 recede, the pile sinks behind the rising line | 2-3 the stop grows into vermilion (signature; the film's
//   one flood, ground cut 1) | 3-4 window, the bar's body opens into the wall | 4-5 lift-off, the four lit rows rise out
//   of the draining wall | 5-6 output travels into the UI | 6-7-8-9 a run of velocity cuts (up, left, in) carrying a
//   morph chain; its first cut is ground cut 2, a ground swap under the pill, which stays | 9-10 pull-back and dim under
//   the line | 10-11 quarter-spin out of the stop (signature)
// - spectacle: a wall pulled back from (the claim is literally a quantity: 217 updates read), a reading wave, 2.1 s
// - output-big: "Four things need you." lands at 144 px, then travels into the page
// - integrations: a morph chain, no pinned plate: Approve -> GitHub's Merged state -> Linear's In progress -> the 3:00 PM
//   slot, each host in its own composition and on its own ground (night, vermilion, paper)
// - lockup: quarter-spin, the benefit's full stop swells and is cut to the mark mid-spin; the wordmark wipes out of it
// - budget: one flood (the hook's stop), one wall, no relay, no mark gathered from the wall
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
//                         it; the title and the rows travel into the page together
//  6 206-258 full-ui>macro the page; the pointer opens the first row while the camera pushes to 2.7x on Approve; the
//                         press; the camera whips up and the pressed pill stays                    (velocity cut, up)
//  7 258-286 surface      GitHub on night: the ground swaps under the pill, which turns vermilion and becomes "Merged"
//                         while the pull request rises into place round it; the camera rides left and whips left
//  8 286-314 macro        Linear on vermilion, the issue page rolled and cropped: the pill flattens into the ink status
//                         chip "In progress" (its dot is the stop); "Unblocked by #482" cuts on; the camera pushes in fast
//  9 314-358 full-ui      the calendar on paper arrives huge and shrinking: the chip lands as the 3:00 PM design crit,
//                         accepted; the camera pulls back to the whole day while the morning's four catch-up hours clear
// 10 358-385 veil         the day dims, keeping its colours, and "4 hours back." lands at 250 px, the figure in vermilion
// 11 385-420 object       the words fall away, the stop swells and is cut to the mark mid-spin; "Brief" wipes out of it
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
  Ground,
  Icon,
  landBlur,
  lerpBox,
  lightUI,
  logScale,
  mix,
  mixColor,
  Music,
  onTwos,
  Output,
  rand,
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
// one voice: Inter (optical sizing gives the display cut at large sizes). Statements at 520-540; 620-640 only for the
// hook, a figure and the wordmark. Sizes by word count: the hook 330, the benefit 250 (the largest after the hook),
// resting lines 144-160, tails 58+.
const display: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 520, letterSpacing: '-0.02em', color: INK };
const PROOF_FS = 250; // "4 hours back.": the benefit, the film's largest statement after the hook

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
  // the chain: each link leaves on an accelerating 6 f move and the next is cut on its fastest frame, already moving
  whip: [252, 280, 308], // up, left, in
  cuts: [258, 286, 314], // GitHub on night (ground cut 2, under the pill), Linear on vermilion, the calendar on paper
  dock: 320, // the slot lands, accepted
  calPull: 326, // the camera rides up and back to the morning
  clears: [340, 343, 346, 348], // the morning's four catch-up hours clear, 11:00 up to 8:00, as the camera arrives
  dim: 346, // the day dims under the line, keeping its colours
  proofIn: 358, // "4"
  hours: 361,
  back: 364,
  stop2: 367,
  lock: 379, // the words fall away, the stop swells for 6 f
  mark: 385, // cut to the mark mid-spin
  end: 420,
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
  { f: T.cuts[0] + 12, x: BX - 960 + 46, y: BY - 540 - 22, zoom: 2.78, curve: ease.out },
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

// ---------------------------------------------------------------- 6. the page, then the press (and the whip up out of it)
const WHIP_UP = 1250; // screen px the page travels up in its last 6 f
const WHIP_LEFT = 1700; // screen px GitHub travels left in its last 6 f
const BOX_TAKE = 0.12; // the carried pill takes this share of each whip: it slows while the world rushes past
const exitQ = (f: number, k: number) => accel(f, T.whip[k], T.cuts[k] - T.whip[k], 1.5);

const Page: React.FC = () => {
  const f = useCurrentFrame();
  const fe = onTwos(f); // the marks step on twos: digital things step, the camera glides
  const open = at(f, T.click + 2, 20, ease.out);
  const ring = at(f, T.click, 8, ease.out);
  const approved = f >= T.approve + 2;
  const headIn = at(f, T.land, 10, ease.out);
  const pc = camAt(f, PAGE_CAM);
  const q = exitQ(f, 0);
  return (
    <AbsoluteFill style={{ background: WHITE }}>
      <Camera cam={{ ...pc, y: pc.y + (WHIP_UP * q) / pc.zoom }} style={{ filter: q > 0.02 ? `blur(${16 * q}px)` : undefined }}>
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
                      {/* from the whip on, the pressed button is the chain's carried pill (ChainBox) */}
                      <Button t={{ ...t, accent: INK }} size={34} pressAt={T.approve} label={approved ? 'Approved' : 'Approve'} icon={approved ? <Icon name="Check" size={34} stroke={3} /> : undefined} style={{ boxShadow: '0 10px 26px -10px rgba(20,20,20,.6)', opacity: f >= T.whip[0] ? 0 : 1 }} />
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

// ---------------------------------------------------------------- 7-9. the chain: the approval becomes each tool's state
// One box is carried from the press to the calendar (turns.md 5.8): Approve (ink) -> Merged (vermilion pill on GitHub)
// -> In progress (ink chip on Linear, rolled) -> the 3:00 PM slot (a wide block on the calendar). Each host leaves on an
// accelerating move and the next is cut on its fastest frame, already moving the same way (turns.md 1.1). The box takes
// only a share of each whip, so the world rushes past it and the box changes shape in 6 f as the new world docks round it.
type SBox = { x: number; y: number; w: number; h: number; r: number; rot: number };
type Geo = { w: number[]; h: number[] };

/** The camera that puts world point (wx, wy) at screen point (px, py) at this zoom and roll (no tilt): the inverse of toScreen. */
const aim = (wx: number, wy: number, px: number, py: number, zoom: number, rz = 0) => {
  const dx = (px - 960) / zoom;
  const dy = (py - 540) / zoom;
  const a = (-rz * Math.PI) / 180;
  return { x: wx - 960 - (dx * Math.cos(a) - dy * Math.sin(a)), y: wy - 540 - (dx * Math.sin(a) + dy * Math.cos(a)), zoom, rz, rx: 0, ry: 0 };
};

// the three chips, at world size (the first is the page's Button at size 34, measured the way it lays out)
const CHIP = [
  { fs: 34, icon: 34, gap: 15.3, px: 37.4, py: 21.1, label: 'Approved' },
  { fs: 84, icon: 80, gap: 26, px: 60, py: 38, label: 'Merged' },
  { fs: 64, icon: 40, gap: 26, px: 48, py: 30, label: 'In progress' },
];
const chipStyle = (k: number): React.CSSProperties => ({ fontFamily: t.font, fontWeight: 600, fontSize: CHIP[k].fs, letterSpacing: k ? '-0.015em' : undefined });
const useGeo = (): Geo => {
  const a = useTextWidth(CHIP[0].label, chipStyle(0));
  const b = useTextWidth(CHIP[1].label, chipStyle(1));
  const c = useTextWidth(CHIP[2].label, chipStyle(2));
  const w = [a, b, c].map((tw, k) => 2 * CHIP[k].px + CHIP[k].icon + CHIP[k].gap + tw);
  return { w, h: CHIP.map((c) => c.fs * 1.21 + 2 * c.py) };
};

/** The signature as a status: Linear's in-progress dot is the film's full stop. */
const StatusDot: React.FC<{ size: number }> = ({ size }) => (
  <span style={{ display: 'inline-block', flexShrink: 0, width: size, height: size, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 0 ${size * 0.14}px rgba(255,79,31,0.32)` }} />
);
const ChipFace: React.FC<{ k: number }> = ({ k }) => {
  const c = CHIP[k];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: c.gap, ...chipStyle(k), lineHeight: 1.21, color: WHITE, whiteSpace: 'nowrap' }}>
      {k === 0 ? <Icon name="Check" size={c.icon} stroke={3} /> : k === 1 ? <Icon name="GitMerge" size={c.icon} stroke={2.4} /> : <StatusDot size={c.icon} />}
      {c.label}
    </div>
  );
};

// the calendar's world: one day, 8:00 to 17:00, an hour is HY tall; blocks bleed off the right edge
const CY0 = 150;
const HY = 170;
const CAL_BL = 345;
const CAL_BW = 2300;
const CAL_BH = HY - 12;
const CRIT_TOP = CY0 + 7 * HY + 6; // 15:00
const CRIT_CY = CRIT_TOP + CAL_BH / 2;
const CAL_AIM = { x: CAL_BL + 300, y: CRIT_CY, px: 760, py: 584 }; // the camera holds the slot's title here as it lands
const CAL_REST = aim(CAL_AIM.x, CAL_AIM.y, CAL_AIM.px, CAL_AIM.py, 1.15);
const CAL_MORNING = { x: 990 - 960, y: CY0 + 2 * HY - 540, zoom: 1.0 }; // the four morning hours fill the frame
const calCam = (f: number) => {
  if (f < T.calPull) {
    // arrives huge and shrinking: the push-in out of Linear carried into the calendar (a scale carry)
    const t3 = Math.max(0, f - T.cuts[2]);
    const dec = t3 >= 14 ? 0 : (Math.exp(-t3 / 3.5) - Math.exp(-4)) / (1 - Math.exp(-4));
    return aim(CAL_AIM.x, CAL_AIM.y, CAL_AIM.px, CAL_AIM.py, 1.15 * Math.exp(0.95 * dec));
  }
  return camAt(f, [
    { f: T.calPull, ...CAL_REST },
    { f: T.calPull + 20, ...CAL_MORNING, rz: 0, curve: ease.inOut },
    { f: T.end, x: CAL_MORNING.x + 16, y: CAL_MORNING.y - 24, zoom: 1.07, rz: 0, curve: ease.out },
  ]);
};

// where each host holds its chip on screen (the box rides there while the world docks round it)
const restGH = (f: number) => {
  const r = at(f, T.cuts[0], 28, ease.out);
  return { x: 880 - 130 * r, y: 470 - 34 * r };
};
const restLI = (f: number) => {
  const r = at(f, T.cuts[1], 28, ease.out);
  return { x: 630 - 30 * r, y: 466 + 34 * r };
};
const zGH = (f: number) => 1.56 * (1 + 0.08 * at(f, T.cuts[0], 28, ease.out));
const zLI = (f: number) => 1.65 * (1 + 0.1 * at(f, T.cuts[1], 28, ease.out));
const rzLI = (f: number) => mix(at(f, T.cuts[1], 28, ease.out), -4.5, -1.6);
const GH_L = 230; // GitHub's world: the pill's top-left
const GH_T = 360;
const LI_L = 250; // Linear's world: the chip's top-left
const LI_T = 356;

const ghCam = (f: number, g: Geo) => {
  const z = zGH(f);
  const P = restGH(f);
  const c = aim(GH_L + g.w[1] / 2, GH_T + g.h[1] / 2, P.x, P.y, z);
  // arrives rising (the page left upward), leaves to the left
  return { ...c, y: c.y + carry(f, T.cuts[0], 150 / z, 16), x: c.x + (WHIP_LEFT * exitQ(f, 1)) / z };
};
const liCam = (f: number, g: Geo) => {
  const q = exitQ(f, 2);
  const z = zLI(f) * Math.exp(1.15 * q); // leaves by pushing in on the chip
  const P = restLI(f);
  const c = aim(LI_L + g.w[2] / 2, LI_T + g.h[2] / 2, P.x, P.y, z, rzLI(f));
  return { ...c, x: c.x + carry(f, T.cuts[1], 210 / z, 16) }; // arrives travelling left
};

const linkOf = (f: number) => (f < T.cuts[0] ? 0 : f < T.cuts[1] ? 1 : f < T.cuts[2] ? 2 : 3);
const pressOf = (f: number) => at(f, T.approve - 2, 3, ease.out) - at(f, T.approve + 1, 10, ease.out);
const boxRest = (k: number, f: number, g: Geo): SBox => {
  if (k === 0) {
    const c = camAt(f, PAGE_CAM);
    const p = toScreen(c, BTN_L + g.w[0] / 2, BTN_TOP + 1 + g.h[0] / 2);
    const s = c.zoom * (1 - 0.06 * pressOf(f));
    return { x: p.x, y: p.y, w: g.w[0] * s, h: g.h[0] * s, r: 23.8 * s, rot: 0 };
  }
  if (k === 1) {
    const P = restGH(f);
    const z = zGH(f);
    return { x: P.x, y: P.y, w: g.w[1] * z, h: g.h[1] * z, r: (g.h[1] * z) / 2, rot: 0 };
  }
  if (k === 2) {
    const P = restLI(f);
    const z = zLI(f);
    return { x: P.x, y: P.y, w: g.w[2] * z, h: g.h[2] * z, r: 26 * z, rot: rzLI(f) };
  }
  const c = calCam(f);
  const p = toScreen(c, CAL_BL + CAL_BW / 2, CRIT_CY);
  return { x: p.x, y: p.y, w: CAL_BW * c.zoom, h: CAL_BH * c.zoom, r: 18 * c.zoom, rot: 0 };
};
const boxAt = (f: number, g: Geo): SBox => {
  const k = linkOf(f);
  let b = boxRest(k, f, g);
  if (k > 0) {
    const p = at(f, T.cuts[k - 1] - 1, 7, ease.out);
    const prev = boxAt(T.cuts[k - 1] - 1, g);
    b = { ...lerpBox(p, prev, b), r: mix(p, prev.r, b.r), rot: mix(p, prev.rot, b.rot) } as SBox;
  }
  if (k < 3) {
    const q = exitQ(f, k);
    if (k === 0) b = { ...b, y: b.y - BOX_TAKE * WHIP_UP * q };
    if (k === 1) b = { ...b, x: b.x - BOX_TAKE * WHIP_LEFT * q };
    if (k === 2) b = { ...b, w: b.w * (1 + 0.25 * q), h: b.h * (1 + 0.25 * q), r: b.r * (1 + 0.25 * q) };
  }
  return b;
};

const FILLS = [INK, ACCENT, INK, '#FFE3D9'];
const SHADOWS = [
  '0 22px 60px -20px rgba(20,20,20,.6)',
  '0 0 80px rgba(255,79,31,.45), 0 30px 70px -24px rgba(0,0,0,.7)',
  '0 26px 50px -18px rgba(70,20,5,.5)',
  '0 0 0 4px rgba(255,79,31,.55), 0 26px 50px -24px rgba(140,40,10,.45)',
];

/** The 3:00 PM slot, at world size: the chain's last link and a block of the calendar. */
const CritFace: React.FC<{ f: number }> = ({ f }) => {
  const ok = at(f, T.dock, 6, ease.out);
  return (
    <div style={{ padding: '20px 44px', fontFamily: t.font, whiteSpace: 'nowrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, fontSize: 54, fontWeight: 600, letterSpacing: '-0.012em', color: INK, lineHeight: 1.2 }}>
        Design crit
        {f >= T.dock && (
          <span style={{ display: 'inline-flex', transform: `scale(${mix(ok, 1.5, 1)})` }}>
            <Icon name="CircleCheck" size={48} color={ACCENT} stroke={2.6} />
          </span>
        )}
      </div>
      <div style={{ fontSize: 36, color: '#6B5B52', marginTop: 4 }}>
        15:00 – 16:00 · with Sam and Priya
        {f >= T.dock && <span style={{ color: '#C23A12' }}> · accepted</span>}
      </div>
    </div>
  );
};

const ChainBox: React.FC = () => {
  const f = useCurrentFrame();
  const g = useGeo();
  const k = linkOf(f);
  const b = boxAt(f, g);
  const p = k === 0 ? 1 : at(f, T.cuts[k - 1] - 1, 7, ease.out);
  const show = p >= 0.5 ? k : k - 1; // the old content cuts out at the change, the new one cuts on before it lands
  const fill = k === 0 ? FILLS[0] : mixColor(FILLS[k - 1], FILLS[k], p);
  const cw = show === 3 ? CAL_BW : g.w[show];
  const ch = show === 3 ? CAL_BH : g.h[show];
  const s = b.h / ch;
  const blur = (k > 0 ? landBlur(f, T.cuts[k - 1], 5, 3) : 0) + (k < 3 ? 4 * exitQ(f, k) : 0);
  return (
    <div
      style={{
        position: 'absolute',
        left: b.x - b.w / 2,
        top: b.y - b.h / 2,
        width: b.w,
        height: b.h,
        borderRadius: b.r,
        background: fill,
        transform: `rotate(${b.rot}deg)`,
        boxShadow: SHADOWS[p >= 0.5 ? k : Math.max(0, k - 1)],
        overflow: 'hidden',
        filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
      }}
    >
      {k === 3 && <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14 * s * p, background: ACCENT }} />}
      <div style={{ position: 'absolute', left: show === 3 ? 0 : (b.w - cw * s) / 2, top: 0, width: cw, height: ch, transformOrigin: '0 0', transform: `scale(${s})`, display: 'flex', alignItems: 'center', justifyContent: show === 3 ? 'flex-start' : 'center' }}>
        {show === 3 ? <CritFace f={f} /> : <ChipFace k={show} />}
      </div>
    </div>
  );
};

/** GitHub on night: the pull request rises into place round the pill, which is now its merged state. */
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
  const g = useGeo();
  const c = ghCam(f, g);
  const q = exitQ(f, 1);
  const h = T.cuts[0];
  const txt: React.CSSProperties = { position: 'absolute', fontFamily: t.font, whiteSpace: 'nowrap' };
  const pillCY = GH_T + g.h[1] / 2;
  const below = GH_T + g.h[1];
  return (
    <AbsoluteFill>
      <Ground color={NIGHT} light={{ x: 0.42, y: 0.38, size: 0.95, amount: 0.14 }} />
      <Camera cam={c} style={{ filter: q > 0.02 ? `blur(${18 * q}px)` : landBlur(f, h, 6, 4) ? `blur(${landBlur(f, h, 6, 4)}px)` : undefined }}>
        {/* the diff, a plane behind the page: it moves slower than the subject */}
        <div style={{ position: 'absolute', left: -600, top: below + 200, width: 5200, transform: 'translateZ(-220px)', opacity: 0.8 }}>
          {[...DIFF, ...DIFF].map((l, i) => (
            <div key={i} style={{ fontFamily: fonts.mono, whiteSpace: 'pre', fontSize: 38, lineHeight: '60px', paddingLeft: 830, color: l.k === '+' ? '#7EE2A0' : l.k === '-' ? '#FF9A8A' : '#8B857C', background: l.k === '+' ? 'rgba(46,160,67,0.16)' : l.k === '-' ? 'rgba(248,81,73,0.14)' : 'transparent' }}>
              {l.k} {l.s}
            </div>
          ))}
        </div>
        {/* the merge's own light, sized to the pill */}
        <div style={{ position: 'absolute', left: GH_L - 260, top: pillCY - 260, width: g.w[1] + 520, height: 520, background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255,79,31,0.26), rgba(255,79,31,0) 70%)' }} />
        <div style={{ ...txt, left: GH_L, top: 232, display: 'flex', alignItems: 'center', gap: 20, fontSize: 50, fontWeight: 600, letterSpacing: '-0.015em', color: '#F2EEE8' }}>
          <Brand name="github" size={52} color="#F2EEE8" />
          auth: rotate refresh tokens <span style={{ color: '#8B857C', fontWeight: 500 }}>#482</span>
        </div>
        <div style={{ ...txt, left: GH_L + g.w[1] + 40, top: pillCY - 26, fontSize: 42, color: '#B3ACA2' }}>6 commits into main</div>
        {f >= h + 8 && (
          <div style={{ ...txt, left: GH_L, top: below + 40, display: 'flex', alignItems: 'center', gap: 18, fontSize: 40, color: '#E4DDD3' }}>
            <Mark size={50} />
            <Words text="You approved it in Brief, just now" start={h + 8} arrive="cut" gap={1.2} born={ACCENT} settle={10} style={{ color: '#E4DDD3' }} align="left" />
          </div>
        )}
        {f >= h + 12 && (
          <div style={{ ...txt, left: GH_L, top: below + 108, display: 'flex', alignItems: 'baseline', gap: 26, fontSize: 40, fontVariantNumeric: 'tabular-nums', color: '#A39C93' }}>
            <span style={{ color: '#7EE2A0' }}>+214</span>
            <span style={{ color: '#FF9A8A' }}>−87</span>
            <span>6 files · 14 tests pass</span>
          </div>
        )}
      </Camera>
    </AbsoluteFill>
  );
};

/** Linear on vermilion: the issue page, rolled and cropped; the chip is its status, its dot the film's full stop. */
const HostLinear: React.FC = () => {
  const f = useCurrentFrame();
  const g = useGeo();
  const c = liCam(f, g);
  const q = exitQ(f, 2);
  const h = T.cuts[1];
  const txt: React.CSSProperties = { position: 'absolute', fontFamily: t.font, whiteSpace: 'nowrap' };
  const below = LI_T + g.h[2];
  return (
    <AbsoluteFill>
      <Ground color={ACCENT} light={{ x: 0.28, y: 0.3, size: 0.9, amount: 0.13 }} />
      <Camera cam={c} style={{ filter: q > 0.02 ? `blur(${14 * q}px)` : landBlur(f, h, 6, 4) ? `blur(${landBlur(f, h, 6, 4)}px)` : undefined }}>
        {/* the board behind the page, a plane further back */}
        <div style={{ position: 'absolute', left: -40, top: -260, width: 3400, height: 2600, borderRadius: 44, background: '#F9C9B6', transform: 'translateZ(-380px) rotate(3deg)', boxShadow: '-20px 40px 90px rgba(110,25,0,0.35)' }} />
        <div style={{ position: 'absolute', left: 120, top: 40, width: 3600, height: 2600, borderRadius: 44, background: '#FBF7F2', boxShadow: 'inset 0 3px 0 #FFFFFF, -30px 50px 110px rgba(110,25,0,0.5)' }} />
        <div style={{ ...txt, left: LI_L, top: 222, display: 'flex', alignItems: 'center', gap: 22, fontSize: 60, fontWeight: 600, letterSpacing: '-0.015em', color: INK }}>
          <Brand name="linear" size={56} /> Token rotation for mobile <span style={{ color: '#9A938A', fontWeight: 500 }}>ENG-219</span>
        </div>
        <div style={{ ...txt, left: LI_L + g.w[2] + 36, top: LI_T + g.h[2] / 2 - 30, display: 'flex', alignItems: 'center', gap: 18, fontSize: 40, color: '#77716A' }}>
          <span style={{ width: 58, height: 58, borderRadius: 58, background: '#2F7D6D', color: WHITE, fontSize: 26, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SO</span>
          Sam Ortiz
        </div>
        {f >= h + 8 && (
          <div style={{ ...txt, left: LI_L, top: below + 54, display: 'flex', alignItems: 'center', gap: 18, fontSize: 42, color: '#4E4840' }}>
            <Mark size={48} />
            <Words text="Unblocked by #482, merged just now" start={h + 8} arrive="cut" gap={1.2} born={ACCENT} settle={10} style={{ color: '#4E4840' }} align="left" />
          </div>
        )}
        <div style={{ ...txt, left: LI_L, top: below + 140, fontSize: 38, color: '#8A837A' }}>Move refresh-token rotation server-side so the app stops signing people out.</div>
        <div style={{ ...txt, left: LI_L, top: below + 200, fontSize: 38, color: '#8A837A' }}>Blocked until #482 lands on main.</div>
      </Camera>
    </AbsoluteFill>
  );
};

/** The calendar on paper: the slot lands, the camera pulls back to the day, the morning's catch-up hours clear, it dims. */
const MORNING = [
  { brand: 'gmail', title: 'Read email', meta: '46 unread' },
  { brand: 'github', title: 'Go through GitHub', meta: '31 notifications' },
  { brand: 'linear', title: 'Triage Linear', meta: '12 issues' },
  { brand: 'notion', title: 'Catch up on Notion', meta: '6 comments' },
];
const CalBlock: React.FC<{ top: number; h: number; bg: string; edge: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ top, h, bg, edge, style, children }) => (
  <div style={{ position: 'absolute', left: CAL_BL, top, width: CAL_BW, height: h, borderRadius: 18, background: bg, borderLeft: `14px solid ${edge}`, boxSizing: 'border-box', padding: '0 40px', display: 'flex', alignItems: 'center', gap: 22, fontFamily: t.font, whiteSpace: 'nowrap', overflow: 'hidden', ...style }}>
    {children}
  </div>
);
const Calendar: React.FC = () => {
  const f = useCurrentFrame();
  const c = calCam(f);
  const c0 = calCam(f - 1);
  // motion blur from the camera's own speed (the ride up to the morning is a fast pan)
  const v = Math.hypot(c.x - c0.x, c.y - c0.y) * c.zoom + Math.abs(Math.log(c.zoom / c0.zoom)) * 900;
  const smear = f >= T.calPull ? clamp((v - 14) * 0.08, 0, 14) : 0;
  const d = at(f, T.dim, 12, ease.inOut);
  const d2 = at(f, T.lock, 24, ease.out);
  return (
    <AbsoluteFill style={{ filter: d > 0.01 ? `brightness(${1 - 0.7 * d - 0.06 * d2}) saturate(${1 + 0.6 * d}) sepia(${0.12 * d}) blur(${3 * d + 2 * d2}px)` : undefined }}>
      <Ground color={PAPER} light={{ x: 0.42, y: 0.45, size: 0.9, amount: 0.1 }} />
      <Camera cam={c} style={{ filter: landBlur(f, T.cuts[2], 6, 4) + smear > 0.3 ? `blur(${landBlur(f, T.cuts[2], 6, 4) + smear}px)` : undefined }}>
        <div style={{ position: 'absolute', left: 150, top: 30, display: 'flex', alignItems: 'center', gap: 22, fontFamily: t.font, fontSize: 44, color: '#77716A', whiteSpace: 'nowrap' }}>
          <Brand name="googlecalendar" size={56} /> Tuesday 14 October
        </div>
        {Array.from({ length: 10 }, (_, i) => (
          <React.Fragment key={i}>
            <div style={{ position: 'absolute', left: 150, top: CY0 + i * HY - 30, fontFamily: t.font, fontWeight: 500, fontSize: 46, fontVariantNumeric: 'tabular-nums', color: '#9A938A' }}>{`${8 + i}:00`}</div>
            <div style={{ position: 'absolute', left: 330, top: CY0 + i * HY, width: 3000, height: 2, background: 'rgba(40,30,20,0.12)' }} />
          </React.Fragment>
        ))}
        {/* the morning Brief gives back: four hours of reading, cleared one after another from 11:00 up */}
        {MORNING.map((m, i) => {
          const cAt = T.clears[3 - i];
          const out = accel(f, cAt, 7, 1.5);
          const glow = at(f, cAt + 3, 10, ease.out);
          return (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: CAL_BL, top: CY0 + i * HY + 6, width: CAL_BW, height: CAL_BH, borderRadius: 18, background: `radial-gradient(ellipse 46% 120% at 24% 50%, rgba(255,79,31,${0.3 * glow}), rgba(255,79,31,${0.05 * glow}) 80%)`, boxShadow: glow > 0 ? `inset 0 0 0 2px rgba(255,79,31,${0.3 * glow})` : undefined }} />
              {out < 1 && (
                <CalBlock top={CY0 + i * HY + 6} h={CAL_BH} bg="#E2DACE" edge="#A3988A" style={{ transform: `translateX(${2300 * out}px)`, filter: out > 0.02 ? `blur(${16 * out}px)` : undefined, boxShadow: '0 10px 24px -14px rgba(60,40,20,.35)' }}>
                  <Brand name={m.brand} size={58} />
                  <span style={{ fontSize: 58, fontWeight: 600, letterSpacing: '-0.012em', color: INK }}>{m.title}</span>
                  <span style={{ fontSize: 42, color: '#7A7268' }}>{m.meta}</span>
                </CalBlock>
              )}
            </React.Fragment>
          );
        })}
        <CalBlock top={CY0 + 4.5 * HY + 6} h={CAL_BH} bg="#E3EBFA" edge="#4285F4">
          <span style={{ fontSize: 50, fontWeight: 600, color: INK }}>Lunch with Priya</span>
          <span style={{ fontSize: 38, color: '#5E6B80' }}>12:30 – 13:30</span>
        </CalBlock>
        {f >= T.cuts[2] + 8 && (
          <div style={{ position: 'absolute', left: CAL_BL, top: CRIT_TOP, width: CAL_BW, height: CAL_BH, borderRadius: 18, background: FILLS[3], boxShadow: SHADOWS[3], overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, background: ACCENT }} />
            <div style={{ height: CAL_BH, display: 'flex', alignItems: 'center' }}>
              <CritFace f={f} />
            </div>
          </div>
        )}
        <CalBlock top={CY0 + 8.5 * HY + 6} h={HY / 2 - 12} bg="#E3EBFA" edge="#4285F4">
          <span style={{ fontSize: 40, fontWeight: 600, color: INK }}>1:1 with Sam</span>
          <span style={{ fontSize: 34, color: '#5E6B80' }}>16:30</span>
        </CalBlock>
      </Camera>
    </AbsoluteFill>
  );
};
/** One soft warm light over the dimmed day, behind the end type: the ground stays lit and keeps its colour. */
const EndLight: React.FC = () => {
  const f = useCurrentFrame();
  const d = at(f, T.dim, 14, ease.inOut);
  return <AbsoluteFill style={{ mixBlendMode: 'screen', opacity: d, background: 'radial-gradient(ellipse 62% 58% at 50% 50%, rgba(255,120,70,0.2), rgba(255,120,70,0.05) 55%, rgba(255,120,70,0) 80%)' }} />;
};

// ---------------------------------------------------------------- 10-11. the benefit, and the mark out of its full stop
const STOP_D = Math.round(PROOF_FS * 0.19);
const MARK_S = 196;
const BRAND_FS = 188;
const End: React.FC = () => {
  const f = useCurrentFrame();
  const sNum: React.CSSProperties = { ...display, fontSize: PROOF_FS, fontWeight: 620, letterSpacing: '-0.035em' };
  const sWord: React.CSSProperties = { ...display, fontSize: PROOF_FS, fontWeight: 540, letterSpacing: '-0.035em' };
  const sBrand: React.CSSProperties = { ...display, fontSize: BRAND_FS, fontWeight: 620, letterSpacing: '-0.03em' };
  const w4 = useTextWidth('4', sNum);
  const wH = useTextWidth('hours', sWord);
  const wB = useTextWidth('back', sWord);
  const wBrand = useTextWidth('Brief', sBrand);
  const sp = PROOF_FS * 0.24;
  const SG = PROOF_FS * 0.05; // the stop's gap
  const W = w4 + sp + wH + sp + wB + SG + STOP_D;
  const x0 = 960 - W / 2;
  const top = 540 - PROOF_FS / 2 + 14;
  const base = top + 0.863 * PROOF_FS; // Inter's baseline in a line box of height 1em
  const xs = [x0, x0 + w4 + sp, x0 + w4 + sp + wH + sp];
  // the line arrives still rising with the pull-back, creeps in, then its words fall away at full speed
  const push = 1 + 0.05 * creep(f, T.proofIn, 30);
  const rise = carry(f, T.proofIn, -14, 12);
  const fall = accel(f, T.lock, T.mark - T.lock, 1.5);
  const sx = (x: number) => 960 + (x - 960) * push;
  const sy = (y: number) => 540 + (y + rise - 540) * push;
  // the lockup: the mark beside the wordmark, centred together
  const G = MARK_S + 52 + wBrand;
  const M = { x: 960 - G / 2 + MARK_S / 2, y: 496 };
  // the stop: pops on its beat, then swells where it stands while the words fall; on the cut it is the mark, mid-spin,
  // and the mark travels to its place beside the wordmark as it un-rotates
  const pop = springAt(f, 30, T.stop2, springs.pop);
  const S = { x: sx(x0 + W - STOP_D / 2), y: sy(base - STOP_D / 2) };
  const sq = accel(f, T.lock, T.mark - T.lock, 1.5);
  const stopD = mix(sq, STOP_D * push, MARK_S * 0.8) * pop;
  const stopC = { x: S.x - 30 * sq, y: S.y - 60 * sq };
  const spin = at(f, T.mark, 16, ease.out);
  const wipe = at(f, T.mark + 6, 12, ease.out);
  const lockCreep = 1 + 0.035 * creep(f, T.mark + 10, T.end - T.mark - 10);
  const word = (i: number, text: string, from: number, st: React.CSSProperties, color: string) =>
    f >= from && (
      <div key={i} style={{ position: 'absolute', left: xs[i], top, ...st, lineHeight: 1, whiteSpace: 'nowrap', color: f < from + 8 && i > 0 ? mixColor(ACCENT, color, at(f, from, 8, ease.out)) : color, transform: `translateY(${mix(at(f, from, 5, ease.out), 26, 0) + fall * 900}px)`, filter: fall > 0.02 ? `blur(${fall * 16}px)` : undefined }}>
        {text}
      </div>
    );
  return (
    <AbsoluteFill>
      {f < T.mark && (
        <>
          <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `translateY(${rise}px) scale(${push})` }}>
            {word(0, '4', T.proofIn, sNum, ACCENT)}
            {word(1, 'hours', T.hours, sWord, PAPER)}
            {word(2, 'back', T.back, sWord, PAPER)}
          </AbsoluteFill>
          {f >= T.stop2 && <div style={{ position: 'absolute', left: stopC.x - stopD / 2, top: stopC.y - stopD / 2, width: stopD, height: stopD, borderRadius: '50%', background: ACCENT, boxShadow: `0 0 ${50 * sq}px rgba(255,79,31,${0.5 * sq})` }} />}
        </>
      )}
      {f >= T.mark && (
        <AbsoluteFill style={{ transformOrigin: `960px 540px`, transform: `scale(${lockCreep})` }}>
          <div style={{ position: 'absolute', left: mix(spin, S.x - 30, M.x) - MARK_S / 2, top: mix(spin, S.y - 60, M.y) - MARK_S / 2, transform: `rotate(${mix(spin, 74, 0)}deg) scale(${mix(spin, 0.8, 1)})`, filter: landBlur(f, T.mark, 6, 4) ? `blur(${landBlur(f, T.mark, 6, 4)}px)` : undefined }}>
            <Mark size={MARK_S} />
          </div>
          <div style={{ position: 'absolute', left: M.x + MARK_S / 2 + 52, top: M.y - BRAND_FS * 0.56, ...sBrand, color: PAPER, lineHeight: 1.12, whiteSpace: 'nowrap', clipPath: `inset(-20% ${mix(wipe, 100, -2)}% -30% 0)`, transform: `translateX(${mix(wipe, -60, 0)}px)` }}>Brief</div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: 666, textAlign: 'center', ...display, fontSize: 62, fontWeight: 480, letterSpacing: '-0.012em' }}>
            <Words text="Your morning, in one page." start={T.mark + 6} arrive="cut" gap={1.5} style={{ color: '#ECE5DB' }} align="center" />
          </div>
        </AbsoluteFill>
      )}
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
    // the run of velocity cuts: air into each cut, a low hit under the ground cut, a click as each state lands
    { at: T.cuts[0], ...s['mixkit-168'], volume: 0.4 },
    { at: T.cuts[0], ...s['mixkit-2299'], volume: 0.6 },
    { at: T.cuts[0] + 6, ...s['mixkit-3124'], volume: 0.36 },
    { at: T.cuts[1], ...s['mixkit-175'], volume: 0.36 },
    { at: T.cuts[1] + 6, ...s['mixkit-2568'], volume: 0.34 },
    { at: T.cuts[2], ...s['mixkit-1492'], volume: 0.34 },
    { at: T.dock, ...s['mixkit-3124'], volume: 0.42 },
    // the four hours clearing: paper slices, rising
    ...T.clears.map((c, i) => ({ at: c, ...s['mixkit-2384'], volume: 0.24, rate: 0.95 + i * 0.06 })),
    { at: T.proofIn, ...s['mixkit-2299'], volume: 0.7 },
    { at: T.stop2, ...s['mixkit-3000'], volume: 0.36 },
    { at: T.mark, ...s['mixkit-784'], volume: 0.45, maxS: 1.2 },
    { at: T.mark, ...s['mixkit-2299'], volume: 0.8 },
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
      {f >= T.land && f < T.cuts[0] && <Page />}
      {f >= T.cuts[0] && f < T.cuts[1] && <HostGitHub />}
      {f >= T.cuts[1] && f < T.cuts[2] && <HostLinear />}
      {f >= T.cuts[2] && <Calendar />}
      {f >= T.dim && <EndLight />}
      {f >= T.whip[0] && f < T.cuts[2] + 8 && <ChainBox />}
      {f >= T.proofIn && <End />}
      <Vignette amount={0.1} color="60,40,20" />
      <Grain amount={0.035} />
      {/* main hit HIT unchanged at 92 (startFrom 11.77 + 20 / 30 from the earlier move 112 -> 92) */}
      <Music src="music/your-breath.mp3" startFrom={12.44} volume={0.7} duck={[HIT, T.cuts[0], T.mark]} breaths={[HIT, T.proofIn]} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const briefDuration = T.end;
