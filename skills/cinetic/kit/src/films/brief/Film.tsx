// "Brief": an AI that reads your tools every morning and gives you one page. 14 s at 30 fps, an invented product.
// One world: a cool white desk (#F4F5F7) with white cards, ink, one morning-sky blue accent (the product is the
// morning's briefing: its accent is the clear sky of 7 am), one voice (Inter for statements and UI), real marks for the
// tools it reads. Three grounds: cool white (base), a soft field of morning-sky blues (accent), deep navy of the same
// blue (inverse). One light from above: every card sits on a layered soft shadow tinted to its ground. No grain, no
// vignette, nothing dimmed or blurred under a line: each statement sits alone on clean ground or on a product surface.
//
// Concept: one task, start to finish, because the brief is literally one flow (the morning's updates read, the four that
// need you handled in place, the morning given back); rejected: the number (the 4 hours is the result, not a story the
// brief can show), before and after (needs a second world of the same day the brief does not have)
//
// Devices (Brief, a morning briefing that reads your tools; the claim: one page instead of everything)
// - signature: the dot. The hook's full stop grows into the morning sky (ground cut 1); every unread update carries the
//   dot and reading puts it out, the four that need you keep it; Linear's in-progress status is the dot; the claim's
//   full stop swells into the mark, a sun rising over a page (the lockup)
// - opening: stack, real notifications piling up, already moving on frame 0
// - text arrivals: masked rise (the hook); cut-on words (every line after it)
// - type treatment: type set on a surface: after the hook every statement lands on a product surface (the emptied
//   inbox card, the calendar's freed morning)
// - seams: 1-2 the pile drops out of frame as the line rises | 2-3 the stop grows into the sky (ground cut 1, HIT 92) |
//   3-4 window, the bar's white body opens into the inbox card | 4-5 the list runs out under the camera, the card
//   stays | 5-6 the output becomes the card's title, the card opens one row | 6-7 velocity cut up, ground swap under
//   the pill, which stays (ground cut 2, navy) | 7-8 velocity cut left to the sky | 8-9 push-in on the chip carried
//   into the calendar (scale carry, back to white) | 9-10 dive into the freed morning, its white is the claim's ground |
//   10-11 quarter-spin out of the stop (signature)
// - spectacle: cascade, a reading front runs down the inbox, 4 f a row at first and accelerating to two rows a frame,
//   the camera riding it; each dot goes out, four stay lit (the claim is a quantity read, shown as speed, not a wall), 1.5 s
// - output-big: "Four things need you." lands at 120+ px alone on the emptied card, then shrinks into its title
// - integrations: a morph chain, no pinned plate: Approve -> GitHub's Merged -> Linear's In progress -> the 3:00 PM slot,
//   each host one calm component on its own ground (navy, sky, white)
// - lockup: quarter-spin, the claim's stop swells into the app-icon mark at the end of the line; the words give way to
//   the wordmark beside it (no tagline, no URL)
// - budget: one flood-like grow (the hook's stop), no wall, no relay, no mark gathered from a wall
//
// BEATS (frames, composition tag, what the viewer sees; how it hands off)
//  1   0-40  stack        real notifications pile up in a depth ladder, every card sharp; the camera climbs with them
//  2  40-92  statement    the pile drops out of frame at full speed while "Too much to read." rises alone on the
//                         white; its ink full stop pops, then grows into the morning sky          (ground cut 1, HIT 92)
//  3  92-124 macro        the ask bar at 140 px on the sky, one edge leaving the frame: two words typed, the rest lands
//                         at once; the camera rides the caret, pulls back to the whole bar on send
//  4 124-166 spectacle    the bar's body opens into the inbox card, row 0 in macro; the camera pulls back and rides a
//                         reading front down 41 updates, accelerating; each dot goes out, four rows stay lit
//  5 166-206 output-big   the list runs out; "Four things need you." lands alone on the empty card and shrinks into
//                         its title while the four rows rise into place
//  6 206-258 full-ui      the card: the pointer opens the first row, the other rows leave by the card's foot, the
//                         camera pushes to 1.15x; Approve; the camera whips up and the pressed pill stays
//  7 258-286 surface      GitHub on navy: the ground swaps under the pill, which becomes "Merged" under the pull
//                         request's title; the camera whips left
//  8 286-314 macro        Linear on the sky, one issue card: the pill flattens into the ink status chip "In progress"
//                         (its dot is the signature); "Unblocked by #482" cuts on; the camera pushes into the chip
//  9 314-357 full-ui      the calendar card arrives huge and shrinking: the chip lands as the 3:00 PM crit, accepted;
//                         the morning's four catch-up hours clear, 11:00 up to 8:00; the camera dives into the freed
//                         morning
// 10 357-380 statement    "4 hours back." lands on that white at 240 px, the film's largest line, ink, one colour
// 11 380-420 object       its full stop swells into the mark mid-spin at the end of the line; the words fall away and
//                         "Brief" wipes out of the mark
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  accel,
  AppIcon,
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
  Field,
  fonts,
  Ground,
  Icon,
  landBlur,
  lerpBox,
  lightUI,
  logScale,
  mix,
  mixColor,
  Music,
  Output,
  rand,
  Row,
  softShadow,
  springAt,
  springs,
  useTextWidth,
  useTyped,
  Words,
  toScreen,
  typingTimes,
  type CamKey,
  type Theme,
} from '../../kit';
import { sfx } from '../../sfx';

// ---------------------------------------------------------------- world tokens
const GROUND = '#F4F5F7'; // the desk: a cool white
const WHITE = '#FFFFFF';
const INK = '#0E1726'; // a blue-black ink
const MUTED = '#5A6475'; // 5.9:1 on white
const NIGHT = '#0A1730'; // the inverse ground: a deep tone of the accent's own blue
const ACCENT = '#1A6AF0'; // the morning sky at 7 am; shapes and controls only (white on it 4.8:1), never a statement
const ACCENT_INK = '#0A4FC4'; // the accent where it is a word in the UI (7.2:1 on white)
const SKY = ['#A6CEFF', '#86BAFF', '#C8E1FF']; // the accent ground: a soft field of neighbouring sky blues
const SKY_MEAN = '#9AC5FF';
const LIT = '#E6F0FF'; // a row that needs you
const TILE: [string, string] = ['#58A6FF', '#1A6AF0']; // the mark's tile: one hue, a lighter and a deeper step
const t: Theme = {
  ...lightUI,
  accent: ACCENT,
  ink: INK,
  muted: MUTED,
  line: 'rgba(14,23,38,0.08)',
  surface: WHITE,
  fill: '#F1F3F7',
  radius: 30,
  shadow: softShadow(3, GROUND),
};
// one voice: Inter. Statements at 540; the wordmark at 600. Sizes by word count: the hook (4 words) 150, the output 120+,
// the claim 240 (the film's largest line: it names the benefit).
const display: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 540, letterSpacing: '-0.025em', color: INK };

// ---------------------------------------------------------------- one timeline: every scene and every sound reads it
const TOAST_F = [-3, 4, 9, 13, 17, 20, 23, 25, 27, 29, 31, 32, 33];
const T = {
  recede: 34, // the pile drops out of frame
  words: [42, 47, 53, 58],
  stop: 64,
  grow: 76, // the stop grows for 16 f: the sky is full at 92 (MAIN HIT)
  bar: 92,
  typeAt: 96,
  pull: 112,
  send: 120,
  wall: 124, // the bar's body opens into the inbox card
  ev: 130, // the reading front starts
  gather: 164, // the front's last planned row; the list runs out by 168
  title: 166, // "Four things need you." alone on the empty card, as the list runs out
  land: 206, // the card: title and rows in place
  click: 218,
  approve: 246,
  // the chain: each link leaves on an accelerating 6 f move and the next is cut on its fastest frame, already moving
  whip: [252, 280, 308], // up, left, in
  cuts: [258, 286, 314], // GitHub on navy (ground cut 2, under the pill), Linear on the sky, the calendar on white
  dock: 320, // the slot lands, accepted
  clears: [325, 328, 331, 334], // the morning's four catch-up hours clear, 11:00 up to 8:00
  dive: 339, // the camera dives into the freed morning
  proofIn: 357, // "4"
  hours: 359,
  back: 361,
  stop2: 363,
  mark: 380, // the stop swells; cut to the mark mid-spin at the end of the line
  swap: 401, // the words fall away; the wordmark wipes out of the mark
  end: 420,
} as const;
const HIT = T.grow + 16;

/** The film's mark: the full stop as a sun rising over a page (two lines), white on a sky tile. Invented for this
 *  fictional product. */
const Glyph: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{ display: 'block' }}>
    <defs>
      <clipPath id="brief-horizon">
        <rect x="0" y="0" width="100" height="55" />
      </clipPath>
    </defs>
    <circle cx="50" cy="52" r="19" fill={WHITE} clipPath="url(#brief-horizon)" />
    <rect x="18" y="61" width="64" height="9" rx="4.5" fill={WHITE} />
    <rect x="18" y="76" width="40" height="9" rx="4.5" fill={WHITE} opacity={0.72} />
  </svg>
);
const Mark: React.FC<{ size: number; depth?: number }> = ({ size, depth = 1 }) => (
  <AppIcon size={size} colors={TILE} gloss={0.55} depth={depth} glyph={<Glyph size={size * 0.74} />} />
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
];

const Toast1: React.FC<{ i: number }> = ({ i }) => {
  const x = TOASTS[i];
  return (
    <Card t={t} w={1360} pad={34} style={{ display: 'flex', gap: 30, alignItems: 'center', borderRadius: 38, transform: `rotate(${(rand(i * 3.1 + 1) - 0.5) * 2}deg)` }}>
      <BrandTile name={x.brand} size={104} bg="#F3F5F8" shadow="none" />
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
  // the stack climbs and flattens as it fills, then drops out of frame at full speed (nothing stays behind the line)
  const fill = at(f, 0, 40, ease.soft);
  const climb = mix(fill, 20, -60);
  const drop = accel(f, T.recede, 9, 1.6);
  if (drop >= 1) return null;
  return (
    <AbsoluteFill style={{ perspective: 1800 }}>
      <AbsoluteFill
        style={{
          transformStyle: 'preserve-3d',
          transform: `translateY(${climb + drop * 1400}px) rotateX(${mix(fill, 18, 7)}deg) scale(${mix(fill, 1.14, 1.02)})`,
        }}
      >
        <DepthStack
          x={960}
          y={720}
          lift={[0, 128, 240, 338, 424, 496]}
          blur={[0, 0, 0, 0, 0, 0]}
          dim={[1, 1, 1, 1, 1, 1]}
          rise={170}
          items={TOAST_F.map((ff, i) => ({ f: ff, node: <Toast1 i={i} /> }))}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2. the line, whose ink full stop grows into the sky
const HOOK_FS = 150;
const Stop: React.FC<{ at0: number; grow: number; size: number; dur: number }> = ({ at0, grow, size, dur }) => {
  const f = useCurrentFrame();
  const pop = springAt(f, 30, at0, springs.pop);
  const g = at(f, grow, dur, ease.in);
  const r = logScale(size / 2, 2700, g);
  // ink while it is punctuation; it takes the sky's colour only as it stops being a full stop and becomes the ground
  const col = mixColor(INK, SKY_MEAN, at(f, grow, 5, ease.out));
  if (f < at0) return <span style={{ display: 'inline-block', width: size, height: size, marginLeft: size * 0.3 }} />;
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, marginLeft: size * 0.3 }}>
      <span style={{ position: 'absolute', left: size / 2 - r * pop, top: size / 2 - r * pop, width: r * 2 * pop, height: r * 2 * pop, borderRadius: '50%', background: col }} />
    </span>
  );
};

const Line: React.FC = () => {
  const f = useCurrentFrame();
  // the camera rises with the words (a small tilt that settles) and pushes; the grow adds a last push into the stop
  const rise = at(f, T.words[0] - 2, 30, ease.out);
  const push = 1 + 0.06 * creep(f, T.words[0], 50) + 0.06 * at(f, T.grow, 16, ease.in);
  return (
    <AbsoluteFill style={{ perspective: 2000 }}>
      <AbsoluteFill style={{ transform: `translateY(${mix(rise, 60, 0)}px) rotateX(${mix(rise, 8, 0)}deg) scale(${push})`, justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ ...display, fontSize: HOOK_FS, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', whiteSpace: 'nowrap' }}>
          <Words text="Too much to read" times={T.words.slice()} arrive="rise" dur={12} style={{ color: INK }} />
          <Stop at0={T.stop} grow={T.grow} size={26} dur={16} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3. the ask, in macro on the sky
const Q = 'What needs me today?';
const CPS = 24;
const BURST = 2; // two words typed, the rest lands at once
const FS = 140; // the bar's type at camera zoom 1
const BW = 2400;
const BH = 320;
const PADL = FS * 0.6;
const MARKW = FS * 1.4;
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
    <div style={{ position: 'absolute', left: 960 - BW / 2, top: 540 - BH / 2, width: BW, height: BH, boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: GAP, padding: `0 ${FS * 0.55}px 0 ${PADL}px`, borderRadius: BH / 2, background: WHITE, boxShadow: softShadow(5, SKY_MEAN), fontFamily: t.font, fontSize: FS, fontWeight: 500, letterSpacing: '-0.025em', color: INK }}>
      <Mark size={MARKW} depth={0.5} />
      <div style={{ position: 'relative', flex: 1, height: FS * 1.3, overflow: 'hidden', whiteSpace: 'nowrap' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, lineHeight: `${FS * 1.3}px`, transform: `translateY(${-lift * FS * 1.3}px)` }}>
          {hasText ? shown : <span style={{ color: '#8E97A6' }}>Ask Brief</span>}
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
    <AbsoluteFill>
      <Field colors={SKY} points={[{ x: 0.2, y: 0.2 }, { x: 0.85, y: 0.75 }, { x: 0.55, y: 0.05 }]} />
      <AbsoluteFill style={{ filter: landBlur(f, T.bar, 8, 4) ? `blur(${landBlur(f, T.bar, 8, 4)}px)` : undefined }}>
        <Camera cam={{ x, zoom, rx: mix(arrive, 10, 0) + 3 * Math.sin(pull * Math.PI), ry: mix(arrive, -6, 0) + 0.6 * Math.sin(f / 30) }}>
          <AskBar />
        </Camera>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
const barBox: Box = { x: 960, y: 540, w: BW * ZB, h: BH * ZB, r: (BH / 2) * ZB };

// ---------------------------------------------------------------- the card (inbox, then the page): one component
const ROW_W = 1628; // a row at world size (Row size 44, padding 26)
const ROW_HT = 153;
const CARD_W = 1400;
const CARD_X0 = 960 - CARD_W / 2;
const INSET = 24;
const PS = (CARD_W - 2 * INSET) / ROW_W; // rows in the card are page rows at this scale
const RP = ROW_HT * PS; // a row's pitch in the card
const H0 = 808; // the card's height with four rows
const TITLE_FS = 84;
const TITLE_L = CARD_X0 + 48;
const TITLE_DY = 56; // the title's top below the card's top
const ROWS_DY = 180; // the first row's top below the card's top
const DET_H = 236; // the opened row's detail
const H1 = ROWS_DY + RP + DET_H + 56; // the card with one row open
const cardTop = (h: number) => 540 - h / 2;

const ROWS = [
  { brand: 'github', title: 'Review PR #482: rotate refresh tokens', sub: 'Maya asked you · 2 h ago', trail: '5 min' },
  { brand: 'linear', title: 'ENG-219 is blocked on your answer', sub: 'Sam Ortiz · due today', trail: '2 min' },
  { brand: 'googlecalendar', title: 'Design crit moved to 3:00 PM', sub: 'With Sam and Priya · accept?', trail: '1 min' },
  { brand: 'gmail', title: 'Invoice #2291 needs your approval', sub: 'Northwind Ltd · $4,180.00', trail: '1 min' },
];
type Upd = { brand: string; title: string; sub: string; trail: string };

/** One update as a row at world size (1628 px wide): the inbox, the rising rows and the page all draw this. The dot is
 *  the film's signature: unread. */
const RowCard: React.FC<{ r: Upd; bg?: string; dot?: number; lit?: number; read?: number; rule?: boolean }> = ({ r, bg = WHITE, dot = 1, lit = 0, read = 0, rule = true }) => (
  <div style={{ position: 'relative', width: ROW_W, height: ROW_HT, borderRadius: 30, background: lit > 0 ? mixColor(bg, LIT, lit) : bg, boxShadow: rule ? 'inset 0 -2px 0 rgba(14,23,38,0.06)' : undefined, overflow: 'hidden' }}>
    <div style={{ position: 'absolute', left: 24, top: ROW_HT / 2 - 11, width: 22, height: 22, borderRadius: 11, background: ACCENT, transform: `scale(${dot})` }} />
    <Row
      t={{ ...t, ink: mixColor(INK, MUTED, read * 0.85) }}
      size={44}
      icon={<BrandTile name={r.brand} size={64} bg={WHITE} shadow="none" />}
      title={<span style={{ fontWeight: read > 0.5 ? 500 : 600 }}>{r.title}</span>}
      sub={<span style={{ fontSize: 38 }}>{r.sub}</span>}
      trail={<span style={{ fontFamily: t.font, fontSize: 38, fontVariantNumeric: 'tabular-nums' }}>{r.trail}</span>}
      style={{ padding: '22px 30px 22px 66px' }}
    />
  </div>
);

// ---------------------------------------------------------------- 4. the inbox: a reading front runs down it (spectacle)
const UPDATES: Upd[] = [
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
const LIST_N = 41;
const CH_IDX = [6, 14, 23, 32]; // the four that need you, in the order of the page's rows
const D_EV = T.gather - T.ev;
const V0 = 0.25; // rows a frame at first (4 f a row)
const VB = (40 - V0 * D_EV) / (D_EV * D_EV); // accelerating to about two rows a frame
const frontN = (f: number) => {
  const tt = Math.max(0, f - T.ev);
  return V0 * tt + VB * tt * tt;
};
const readF = (i: number) => T.ev + (-V0 + Math.sqrt(V0 * V0 + 4 * VB * i)) / (2 * VB);
const itemOf = (i: number): Upd => {
  const k = CH_IDX.indexOf(i);
  return k >= 0 ? ROWS[k] : UPDATES[(i * 7 + 3) % UPDATES.length];
};

const Inbox: React.FC = () => {
  const f = useCurrentFrame();
  // the camera starts on row 0 in macro (the bar's body) and pulls back to the card, then rides the reading front
  const z = logScale(1.5, 1, at(f, T.wall, 18, ease.out));
  const camY = frontN(f) * RP;
  const rows: React.ReactNode[] = [];
  for (let i = 0; i < LIST_N; i++) {
    const y = H0 / 2 + i * RP - camY - RP / 2;
    if (y < -RP || y > H0) continue;
    const rf = readF(i);
    const k = CH_IDX.indexOf(i);
    const read = at(f, rf, 4, ease.out);
    const flash = at(f, rf - 1, 2, ease.out) * (1 - at(f, rf + 1, 6, ease.out));
    rows.push(
      <div key={i} style={{ position: 'absolute', left: INSET, top: y, width: ROW_W, height: ROW_HT, transformOrigin: '0 0', transform: `scale(${PS})` }}>
        {k >= 0 ? (
          <RowCard r={itemOf(i)} lit={read} dot={1 + 0.35 * flash} />
        ) : (
          <RowCard r={itemOf(i)} bg={flash > 0.02 ? mixColor(WHITE, '#EEF4FF', flash) : WHITE} dot={1 - read} read={read} />
        )}
      </div>,
    );
  }
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <div style={{ position: 'absolute', left: CARD_X0, top: cardTop(H0), width: CARD_W, height: H0, transformOrigin: '50% 50%', transform: `scale(${z})`, borderRadius: 40, background: WHITE, boxShadow: softShadow(3, GROUND), overflow: 'hidden' }}>{rows}</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. the output, alone on the emptied card, then its title
const titleStyle: React.CSSProperties = { ...display, fontWeight: 560, letterSpacing: '-0.02em' };
const Gather: React.FC = () => {
  const f = useCurrentFrame();
  const tw100 = useTextWidth('Four things need you.', { ...titleStyle, fontSize: 100 });
  const big = tw100 ? Math.min(126, (100 * (CARD_W - 150)) / tw100) : 120;
  const twT = (tw100 * TITLE_FS) / 100;
  const top0 = cardTop(H0);
  // the line holds alone for 10 f only, and the four rows rise under it while it travels to its title place: the card
  // is never an empty white field under a heading
  const hold = 10;
  const travel = 9;
  const landed = T.title + hold + travel;
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <div style={{ position: 'absolute', left: CARD_X0, top: top0, width: CARD_W, height: H0, borderRadius: 40, background: WHITE, boxShadow: softShadow(3, GROUND), overflow: 'hidden' }}>
        {ROWS.map((r, k) => {
          const s = landed - 5 + k * 2;
          const p = at(f, s, 8, ease.out);
          if (f < s) return null;
          return (
            <div key={k} style={{ position: 'absolute', left: INSET, top: ROWS_DY + k * RP + mix(p, 620, 0), width: ROW_W, height: ROW_HT, transformOrigin: '0 0', transform: `scale(${PS})` }}>
              <RowCard r={r} lit={1 - at(f, T.land - 6, 10, ease.inOut)} rule={k < 3} />
            </div>
          );
        })}
      </div>
      {f >= T.title && f <= landed && (
        <Output
          text="Four things need you."
          start={T.title}
          hold={hold}
          travel={travel}
          from={{ x: 960, y: 540, size: big }}
          to={{ x: TITLE_L + twT / 2, y: top0 + TITLE_DY + (TITLE_FS * 1.1) / 2, size: TITLE_FS }}
          style={{ ...titleStyle, color: INK }}
        />
      )}
      {f > landed && <div style={{ position: 'absolute', left: TITLE_L, top: top0 + TITLE_DY, ...titleStyle, fontSize: TITLE_FS, lineHeight: 1.1, whiteSpace: 'nowrap' }}>Four things need you.</div>}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 6. the card, then the press (and the whip up out of it)
const WHIP_UP = 1250; // screen px the page travels up in its last 6 f
const WHIP_LEFT = 1700; // screen px GitHub travels left in its last 6 f
const BOX_TAKE = 0.12; // the carried pill takes this share of each whip: it slows while the world rushes past
const exitQ = (f: number, k: number) => accel(f, T.whip[k], T.cuts[k] - T.whip[k], 1.5);
const openP = (f: number) => at(f, T.click + 2, 18, ease.out);
const TEXT_L = CARD_X0 + INSET + 183 * PS; // the row's text column (dot, icon and gap before it)
const BTN_L = TEXT_L;
const BTN_DY = ROWS_DY + RP + 136; // the buttons' top below the card's top (open)
const PAGE_CAM: CamKey[] = [
  { f: T.land, x: 0, y: 0, zoom: 1 },
  { f: T.click + 6, x: 0, y: 0, zoom: 1.005 },
  { f: T.click + 26, x: 0, y: 0, zoom: 1.15, curve: ease.inOut },
  { f: T.cuts[0] + 12, x: 0, y: 0, zoom: 1.18, curve: ease.out },
];
const pageCam = (f: number) => camAt(f, PAGE_CAM);

const Page: React.FC = () => {
  const f = useCurrentFrame();
  const open = openP(f);
  const h = mix(open, H0, H1);
  const top = cardTop(h);
  const approved = f >= T.approve + 2;
  const pc = pageCam(f);
  const q = exitQ(f, 0);
  const lit = 0;
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <Camera cam={{ ...pc, y: pc.y + (WHIP_UP * q) / pc.zoom }} style={{ filter: q > 0.02 ? `blur(${14 * q}px)` : undefined }}>
        <div style={{ position: 'absolute', left: CARD_X0, top, width: CARD_W, height: h, borderRadius: 40, background: WHITE, boxShadow: softShadow(3, GROUND), overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: TITLE_L - CARD_X0, top: TITLE_DY, ...titleStyle, fontSize: TITLE_FS, lineHeight: 1.1, whiteSpace: 'nowrap' }}>Four things need you.</div>
          {ROWS.map((row, i) => {
            const first = i === 0;
            const y = ROWS_DY + i * RP + (i > 0 ? mix(open, 0, DET_H + 260) : 0);
            return (
              <div key={i} style={{ position: 'absolute', left: INSET, top: y, width: ROW_W, height: ROW_HT, transformOrigin: '0 0', transform: `scale(${PS})` }}>
                <RowCard r={row} lit={first ? 0.6 * at(f, T.click, 6, ease.out) + lit : 0} dot={first ? 1 - at(f, T.approve + 2, 4, ease.out) : 1} rule={!first && i < 3} />
              </div>
            );
          })}
          {open > 0 && (
            <div style={{ position: 'absolute', left: TEXT_L - CARD_X0, top: ROWS_DY + RP, height: mix(open, 0, DET_H), width: CARD_W - (TEXT_L - CARD_X0) - 48, overflow: 'hidden', fontFamily: t.font }}>
              <div style={{ position: 'absolute', left: 0, top: 10, fontSize: 38, color: INK, whiteSpace: 'nowrap' }}>
                <Words text="Moves token rotation server-side. Safe to merge." start={T.click + 8} arrive="cut" gap={1.4} settle={10} style={{ color: INK }} align="left" />
              </div>
              <div style={{ position: 'absolute', left: 0, top: 72, display: 'flex', gap: 28, fontSize: 34, fontVariantNumeric: 'tabular-nums', opacity: clamp(open * 2) }}>
                <span style={{ color: '#1A7F4B' }}>+214</span>
                <span style={{ color: '#C2382A' }}>−87</span>
                <span style={{ color: t.muted }}>6 files · 14 tests pass</span>
              </div>
              <div style={{ position: 'absolute', left: 0, top: 136, display: 'flex', gap: 18, opacity: at(f, T.click + 14, 4) }}>
                {/* from the whip on, the pressed button is the chain's carried pill (ChainBox) */}
                <Button t={{ ...t, accent: INK }} size={34} pressAt={T.approve} label={approved ? 'Approved' : 'Approve'} icon={approved ? <Icon name="Check" size={34} stroke={3} /> : undefined} style={{ boxShadow: softShadow(2, GROUND), opacity: f >= T.whip[0] ? 0 : 1 }} />
                <Button t={t} size={34} primary={false} label="Open in GitHub" />
              </div>
            </div>
          )}
          {/* everything else, named and set aside */}
          <div style={{ position: 'absolute', left: TITLE_L - CARD_X0, top: ROWS_DY + 4 * RP + 24 + mix(open, 0, DET_H + 260), display: 'flex', alignItems: 'center', gap: 14, fontFamily: t.font, fontSize: 34, color: t.muted, opacity: at(f, T.land + 2, 6) }}>
            <Brand name="notion" size={38} />
            <Brand name="figma" size={38} />
            <span>213 others can wait</span>
          </div>
        </div>
        <Cursor
          start={T.land}
          keys={[
            { f: T.land, x: 1640, y: 1160 },
            { f: T.click - 3, x: 1040, y: cardTop(H0) + ROWS_DY + RP * 0.5 + 8 },
            { f: T.click + 14, x: 1080, y: cardTop(H1) + ROWS_DY + RP * 0.5 + 30 },
            { f: T.approve - 6, x: BTN_L + 120, y: cardTop(H1) + BTN_DY + 50 },
          ]}
          clicks={[T.click, T.approve]}
          size={44}
        />
      </Camera>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 7-9. the chain: the approval becomes each tool's state
// One box is carried from the press to the calendar (turns.md 5.8): Approve (ink) -> Merged (accent pill on GitHub)
// -> In progress (ink chip on Linear) -> the 3:00 PM slot (a block on the calendar). Each host leaves on an accelerating
// move and the next is cut on its fastest frame, already moving the same way (turns.md 1.1). The box takes only a share
// of each whip, so the world rushes past it and the box changes shape in 6 f as the new world docks round it.
type SBox = { x: number; y: number; w: number; h: number; r: number; rot: number };
type Geo = { w: number[]; h: number[] };

/** The camera that puts world point (wx, wy) at screen point (px, py) at this zoom (no tilt): the inverse of toScreen. */
const aim = (wx: number, wy: number, px: number, py: number, zoom: number) => ({ x: wx - 960 - (px - 960) / zoom, y: wy - 540 - (py - 540) / zoom, zoom, rz: 0, rx: 0, ry: 0 });

// the three chips, at world size (the first is the card's Button at size 34, measured the way it lays out)
const CHIP = [
  { fs: 34, icon: 34, gap: 15.3, px: 37.4, py: 21.1, label: 'Approved' },
  { fs: 80, icon: 72, gap: 26, px: 60, py: 36, label: 'Merged' }, // 98 px on screen: the pill carries the navy
  { fs: 50, icon: 30, gap: 20, px: 38, py: 24, label: 'In progress' },
];
const chipStyle = (k: number): React.CSSProperties => ({ fontFamily: t.font, fontWeight: 600, fontSize: CHIP[k].fs, letterSpacing: k ? '-0.015em' : undefined });
const useGeo = (): Geo => {
  const a = useTextWidth(CHIP[0].label, chipStyle(0));
  const b = useTextWidth(CHIP[1].label, chipStyle(1));
  const c = useTextWidth(CHIP[2].label, chipStyle(2));
  const w = [a, b, c].map((tw, k) => 2 * CHIP[k].px + CHIP[k].icon + CHIP[k].gap + tw);
  return { w, h: CHIP.map((c) => c.fs * 1.21 + 2 * c.py) };
};

/** The signature as a status: Linear's in-progress dot is the film's dot. */
const StatusDot: React.FC<{ size: number }> = ({ size }) => <span style={{ display: 'inline-block', flexShrink: 0, width: size, height: size, borderRadius: '50%', background: '#5C9DFF' }} />;
const ChipFace: React.FC<{ k: number }> = ({ k }) => {
  const c = CHIP[k];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: c.gap, ...chipStyle(k), lineHeight: 1.21, color: WHITE, whiteSpace: 'nowrap' }}>
      {k === 0 ? <Icon name="Check" size={c.icon} stroke={3} /> : k === 1 ? <Icon name="GitMerge" size={c.icon} stroke={2.4} /> : <StatusDot size={c.icon} />}
      {c.label}
    </div>
  );
};

// GitHub's world: the pull request's title over the pill, centred as one group
const GH_TITLE = 'auth: rotate refresh tokens';
const GH_TFS = 54;
const GH_TTOP = 398;
const GH_T = 492; // the pill's top
const useGhLeft = () => {
  const tw = useTextWidth(GH_TITLE, { fontFamily: t.font, fontSize: GH_TFS, fontWeight: 600, letterSpacing: '-0.015em' });
  const tn = useTextWidth('#482', { fontFamily: t.font, fontSize: GH_TFS, fontWeight: 500 });
  const gw = 58 + 22 + tw + 18 + tn;
  return 960 - gw / 2;
};
const zGH = (f: number) => 1.22 * (1 + 0.05 * at(f, T.cuts[0], 28, ease.out));
const ghBase = (f: number) => ({ x: 0, y: 0, zoom: zGH(f), rx: 0, ry: 0, rz: 0 });
const ghCam = (f: number) => {
  const z = zGH(f);
  // arrives rising (the page left upward), leaves to the left
  return { ...ghBase(f), y: carry(f, T.cuts[0], 150 / z, 16), x: (WHIP_LEFT * exitQ(f, 1)) / z };
};

// Linear's world: one issue card, centred; the chip sits at its left under the title
const LC_W = 1240;
const LC_H = 420;
const LC_X0 = 960 - LC_W / 2;
const LC_Y0 = 540 - LC_H / 2;
const LI_L = LC_X0 + 64;
const LI_T = LC_Y0 + 150;
const zLI = (f: number) => 1.14 * (1 + 0.05 * at(f, T.cuts[1], 28, ease.out));
const liCam = (f: number, g: Geo) => {
  const q = exitQ(f, 2);
  const cx = LI_L + g.w[2] / 2;
  const cy = LI_T + g.h[2] / 2;
  const P = toScreen({ x: 0, y: 0, zoom: zLI(f) }, cx, cy);
  const c = aim(cx, cy, P.x, P.y, zLI(f) * Math.exp(1.15 * q)); // leaves by pushing in on the chip
  return { ...c, x: c.x + carry(f, T.cuts[1], 210 / c.zoom, 16) }; // arrives travelling left
};

// the calendar: one day card, 8:00 to 17:00, an hour is HY tall
const CAL_X0 = 380;
const CAL_W = 1160;
const CAL_Y0 = 100;
const CAL_H = 880;
const CY0 = 216; // 8:00
const HY = 80;
const CAL_BL = 540; // blocks' left
const CAL_BW = 960;
const CAL_BH = HY - 8;
const CRIT_TOP = CY0 + 7 * HY + 4; // 15:00
const CRIT_CY = CRIT_TOP + CAL_BH / 2;
const MORN = { x: CAL_BL + CAL_BW / 2, y: CY0 + 2 * HY }; // the centre of the four morning hours
const calCam = (f: number) => {
  // arrives huge and shrinking: the push-in out of Linear carried into the calendar (a scale carry), then dives into
  // the freed morning, whose white is the claim's ground
  const t3 = Math.max(0, f - T.cuts[2]);
  const dec = t3 >= 14 ? 0 : (Math.exp(-t3 / 3.5) - Math.exp(-4)) / (1 - Math.exp(-4));
  const cx = CAL_BL + 300;
  const rest = (ff: number) => aim(cx, CRIT_CY, cx, CRIT_CY, Math.exp(1.05 * dec) * (1 + 0.025 * creep(ff, T.cuts[2] + 10, 30)));
  if (f < T.dive) return rest(f);
  const pre = rest(T.dive);
  const P = toScreen(pre, MORN.x, MORN.y);
  const p = at(f, T.dive, T.proofIn - T.dive, ease.in);
  return aim(MORN.x, MORN.y, mix(p, P.x, 960), mix(p, P.y, 540), logScale(pre.zoom, 4.8, p));
};

const linkOf = (f: number) => (f < T.cuts[0] ? 0 : f < T.cuts[1] ? 1 : f < T.cuts[2] ? 2 : 3);
const pressOf = (f: number) => at(f, T.approve - 2, 3, ease.out) - at(f, T.approve + 1, 10, ease.out);
const boxRest = (k: number, f: number, g: Geo, ghL: number): SBox => {
  if (k === 0) {
    const c = pageCam(f);
    const p = toScreen(c, BTN_L + g.w[0] / 2, cardTop(H1) + BTN_DY + g.h[0] / 2);
    const s = c.zoom * (1 - 0.06 * pressOf(f));
    return { x: p.x, y: p.y, w: g.w[0] * s, h: g.h[0] * s, r: 23.8 * s, rot: 0 };
  }
  if (k === 1) {
    const z = zGH(f);
    const p = toScreen(ghBase(f), ghL + g.w[1] / 2, GH_T + g.h[1] / 2);
    return { x: p.x, y: p.y, w: g.w[1] * z, h: g.h[1] * z, r: (g.h[1] * z) / 2, rot: 0 };
  }
  if (k === 2) {
    const z = zLI(f);
    const p = toScreen({ x: 0, y: 0, zoom: z }, LI_L + g.w[2] / 2, LI_T + g.h[2] / 2);
    return { x: p.x, y: p.y, w: g.w[2] * z, h: g.h[2] * z, r: 24 * z, rot: 0 };
  }
  const c = calCam(f);
  const p = toScreen(c, CAL_BL + CAL_BW / 2, CRIT_CY);
  return { x: p.x, y: p.y, w: CAL_BW * c.zoom, h: CAL_BH * c.zoom, r: 14 * c.zoom, rot: 0 };
};
const boxAt = (f: number, g: Geo, ghL: number): SBox => {
  const k = linkOf(f);
  let b = boxRest(k, f, g, ghL);
  if (k > 0) {
    const p = at(f, T.cuts[k - 1] - 1, 7, ease.out);
    const prev = boxAt(T.cuts[k - 1] - 1, g, ghL);
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

const CRIT_BG = '#E4EEFF';
const FILLS = [INK, ACCENT, INK, CRIT_BG];
const SHADOWS = [softShadow(2, GROUND), softShadow(4, NIGHT), softShadow(4, SKY_MEAN), softShadow(2, WHITE)];

/** The 3:00 PM slot, at world size: the chain's last link and a block of the calendar. */
const CritFace: React.FC<{ f: number }> = ({ f }) => {
  const ok = at(f, T.dock, 6, ease.out);
  return (
    <div style={{ padding: '0 28px', height: CAL_BH, display: 'flex', alignItems: 'center', gap: 16, fontFamily: t.font, whiteSpace: 'nowrap' }}>
      <span style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.01em', color: INK }}>Design crit</span>
      {f >= T.dock && (
        <span style={{ display: 'inline-flex', transform: `scale(${mix(ok, 1.5, 1)})` }}>
          <Icon name="CircleCheck" size={38} color={ACCENT_INK} stroke={2.6} />
        </span>
      )}
      <span style={{ fontSize: 34, color: MUTED }}>
        15:00 – 16:00{f >= T.dock && <span style={{ color: ACCENT_INK }}> · accepted</span>}
      </span>
    </div>
  );
};

const ChainBox: React.FC = () => {
  const f = useCurrentFrame();
  const g = useGeo();
  const ghL = useGhLeft();
  const k = linkOf(f);
  const b = boxAt(f, g, ghL);
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
      <div style={{ position: 'absolute', left: show === 3 ? 0 : (b.w - cw * s) / 2, top: 0, width: cw, height: ch, transformOrigin: '0 0', transform: `scale(${s})`, display: 'flex', alignItems: 'center', justifyContent: show === 3 ? 'flex-start' : 'center' }}>
        {show === 3 ? <CritFace f={f} /> : <ChipFace k={show} />}
      </div>
    </div>
  );
};

/** GitHub on navy: the pull request's title rises into place over the pill, which is now its merged state. */
const HostGitHub: React.FC = () => {
  const f = useCurrentFrame();
  const ghL = useGhLeft();
  const c = ghCam(f);
  const q = exitQ(f, 1);
  const h = T.cuts[0];
  const tIn = at(f, h + 6, 8, ease.out);
  return (
    <AbsoluteFill>
      <Ground color={NIGHT} tint="#1E4FA8" light={{ x: 0.5, y: 0.46, size: 1.0, amount: 0.2 }} />
      <Camera cam={c} style={{ filter: q > 0.02 ? `blur(${16 * q}px)` : landBlur(f, h, 6, 4) ? `blur(${landBlur(f, h, 6, 4)}px)` : undefined }}>
        <div style={{ position: 'absolute', left: ghL, top: GH_TTOP + mix(tIn, 30, 0), display: 'flex', alignItems: 'center', gap: 22, fontFamily: t.font, fontSize: GH_TFS, fontWeight: 600, letterSpacing: '-0.015em', color: '#EEF3FB', whiteSpace: 'nowrap', opacity: f >= h + 6 ? 1 : 0 }}>
          <Brand name="github" size={58} color="#EEF3FB" />
          <span>
            {GH_TITLE} <span style={{ color: '#9FB0CC', fontWeight: 500, marginLeft: 4 }}>#482</span>
          </span>
        </div>
      </Camera>
    </AbsoluteFill>
  );
};

/** Linear on the sky: one issue card; the chip is its status, its dot the film's dot. */
const HostLinear: React.FC = () => {
  const f = useCurrentFrame();
  const g = useGeo();
  const c = liCam(f, g);
  const q = exitQ(f, 2);
  const h = T.cuts[1];
  const txt: React.CSSProperties = { position: 'absolute', fontFamily: t.font, whiteSpace: 'nowrap' };
  return (
    <AbsoluteFill>
      <Field colors={SKY} points={[{ x: 0.75, y: 0.2 }, { x: 0.15, y: 0.8 }, { x: 0.45, y: 0.1 }]} seed={3} />
      <Camera cam={c} style={{ filter: q > 0.02 ? `blur(${12 * q}px)` : landBlur(f, h, 6, 4) ? `blur(${landBlur(f, h, 6, 4)}px)` : undefined }}>
        <div style={{ position: 'absolute', left: LC_X0, top: LC_Y0, width: LC_W, height: LC_H, borderRadius: 40, background: WHITE, boxShadow: softShadow(4, SKY_MEAN) }} />
        <div style={{ ...txt, left: LI_L, top: LC_Y0 + 58, display: 'flex', alignItems: 'center', gap: 22, fontSize: 54, fontWeight: 600, letterSpacing: '-0.015em', color: INK }}>
          <Brand name="linear" size={54} /> Token rotation for mobile <span style={{ color: '#7B8597', fontWeight: 500 }}>ENG-219</span>
        </div>
        <div style={{ ...txt, left: LI_L + g.w[2] + 34, top: LI_T + g.h[2] / 2 - 29, display: 'flex', alignItems: 'center', gap: 16, fontSize: 38, color: MUTED }}>
          <span style={{ width: 58, height: 58, borderRadius: 58, background: '#55657F', color: WHITE, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>SO</span>
          Sam Ortiz
        </div>
        {f >= h + 8 && (
          <div style={{ ...txt, left: LI_L, top: LI_T + g.h[2] + 44, display: 'flex', alignItems: 'center', gap: 18, fontSize: 40, color: '#3C4656' }}>
            <Mark size={48} depth={0.4} />
            <Words text="Unblocked by #482, merged just now" start={h + 8} arrive="cut" gap={1.2} settle={10} style={{ color: '#3C4656' }} align="left" />
          </div>
        )}
      </Camera>
    </AbsoluteFill>
  );
};

/** The calendar card on white: the slot lands, the morning's catch-up hours clear, the camera dives into the space. */
const MORNING = [
  { brand: 'gmail', title: 'Read email', meta: '46 unread' },
  { brand: 'github', title: 'Go through GitHub', meta: '31 notifications' },
  { brand: 'linear', title: 'Triage Linear', meta: '12 issues' },
  { brand: 'notion', title: 'Catch up on Notion', meta: '6 comments' },
];
const CalBlock: React.FC<{ top: number; h: number; bg: string; style?: React.CSSProperties; children: React.ReactNode }> = ({ top, h, bg, style, children }) => (
  <div style={{ position: 'absolute', left: CAL_BL - CAL_X0, top: top - CAL_Y0, width: CAL_BW, height: h, borderRadius: 14, background: bg, boxSizing: 'border-box', padding: '0 28px', display: 'flex', alignItems: 'center', gap: 16, fontFamily: t.font, whiteSpace: 'nowrap', overflow: 'hidden', ...style }}>
    {children}
  </div>
);
const Calendar: React.FC = () => {
  const f = useCurrentFrame();
  const c = calCam(f);
  const lines = 1 - at(f, T.dive, 6, ease.out);
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      <Camera cam={c} style={{ filter: landBlur(f, T.cuts[2], 6, 4) > 0.3 ? `blur(${landBlur(f, T.cuts[2], 6, 4)}px)` : undefined }}>
        <div style={{ position: 'absolute', left: CAL_X0, top: CAL_Y0, width: CAL_W, height: CAL_H, borderRadius: 40, background: WHITE, boxShadow: softShadow(3, GROUND), overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 44, top: 30, display: 'flex', alignItems: 'center', gap: 18, fontFamily: t.font, fontSize: 46, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>
            <Brand name="googlecalendar" size={54} /> Tuesday 14 October
          </div>
          {Array.from({ length: 10 }, (_, i) => (
            <React.Fragment key={i}>
              <div style={{ position: 'absolute', left: 44, top: CY0 + i * HY - CAL_Y0 - 20, fontFamily: t.font, fontWeight: 500, fontSize: 34, fontVariantNumeric: 'tabular-nums', color: MUTED }}>{`${8 + i}:00`}</div>
              <div style={{ position: 'absolute', left: CAL_BL - CAL_X0 - 16, top: CY0 + i * HY - CAL_Y0, width: CAL_BW + 32, height: 2, background: 'rgba(14,23,38,0.08)', opacity: i > 0 && i < 4 ? lines : 1 }} />
            </React.Fragment>
          ))}
          {/* the morning Brief gives back: four hours of reading, cleared one after another from 11:00 up */}
          {MORNING.map((m, i) => {
            const out = accel(f, T.clears[3 - i], 7, 1.5);
            if (out >= 1) return null;
            return (
              <CalBlock key={i} top={CY0 + i * HY + 4} h={CAL_BH} bg="#EEF1F5" style={{ transform: `translateX(${1300 * out}px)` }}>
                <Brand name={m.brand} size={44} />
                <span style={{ fontSize: 42, fontWeight: 600, letterSpacing: '-0.01em', color: INK }}>{m.title}</span>
                <span style={{ fontSize: 34, color: MUTED }}>{m.meta}</span>
              </CalBlock>
            );
          })}
          <CalBlock top={CY0 + 4.5 * HY + 4} h={CAL_BH} bg="#EEF1F5">
            <span style={{ fontSize: 42, fontWeight: 600, color: INK }}>Lunch with Priya</span>
            <span style={{ fontSize: 34, color: MUTED }}>12:30 – 13:30</span>
          </CalBlock>
          {f >= T.cuts[2] + 8 && (
            <div style={{ position: 'absolute', left: CAL_BL - CAL_X0, top: CRIT_TOP - CAL_Y0, width: CAL_BW, height: CAL_BH, borderRadius: 14, background: CRIT_BG, overflow: 'hidden' }}>
              <CritFace f={f} />
            </div>
          )}
        </div>
      </Camera>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 10-11. the benefit, and the mark out of its full stop
const CLAIM_FS = 240;
const STOP_D = Math.round(CLAIM_FS * 0.17);
const TILE_S = 210;
const BRAND_FS = 190;
const End: React.FC = () => {
  const f = useCurrentFrame();
  const sW: React.CSSProperties = { ...display, fontSize: CLAIM_FS, fontWeight: 540, letterSpacing: '-0.035em' };
  const sBrand: React.CSSProperties = { ...display, fontSize: BRAND_FS, fontWeight: 600, letterSpacing: '-0.03em' };
  const w4 = useTextWidth('4', sW);
  const wH = useTextWidth('hours', sW);
  const wB = useTextWidth('back', sW);
  const wBrand = useTextWidth('Brief', sBrand);
  const sp = CLAIM_FS * 0.24;
  // the stop's slot widens into the tile's when the mark is cut on: the line re-centres with a jump
  const jump = at(f, T.mark, 5, ease.out);
  const SG = mix(jump, CLAIM_FS * 0.06, CLAIM_FS * 0.16);
  const endW = mix(jump, STOP_D, TILE_S);
  const W = w4 + sp + wH + sp + wB + SG + endW;
  const x0 = 960 - W / 2;
  const top = 540 - CLAIM_FS / 2 + 10;
  const base = top + 0.863 * CLAIM_FS; // Inter's baseline in a line box of height 1em
  const capC = base - 0.36 * CLAIM_FS; // the middle of the cap height
  const xs = [x0, x0 + w4 + sp, x0 + w4 + sp + wH + sp];
  // the line arrives still rising out of the dive, creeps; at the swap its words fall away at full speed
  const push = 1 + 0.04 * creep(f, T.proofIn, 40);
  const rise = carry(f, T.proofIn, -14, 12);
  const fall = accel(f, T.swap, 6, 1.5);
  const sx = (x: number) => 960 + (x - 960) * push;
  const sy = (y: number) => 540 + (y + rise - 540) * push;
  // the stop: pops on its beat, swells for 4 f in its place, and is cut to the mark mid-spin
  const pop = springAt(f, 30, T.stop2, springs.pop);
  const swell = at(f, T.mark - 4, 4, ease.in);
  const S = { x: sx(x0 + W - endW / 2), y: sy(mix(swell, base - STOP_D / 2, capC)) };
  const stopD = mix(swell, STOP_D, TILE_S * 0.7) * push * pop;
  const spin = at(f, T.mark, 16, ease.out);
  // the lockup: the mark travels left as the wordmark wipes out of it
  const G = TILE_S + 56 + wBrand;
  const L = { x: 960 - G / 2 + TILE_S / 2, y: 540 };
  const go = at(f, T.swap, 12, ease.inOut);
  const wipe = at(f, T.swap + 8, 11, ease.out);
  const mk = { x: mix(go, S.x, L.x), y: mix(go, S.y, L.y) };
  const lockCreep = 1 + 0.03 * creep(f, T.mark, T.end - T.mark);
  const word = (i: number, text: string, from: number) =>
    f >= from && (
      <div key={i} style={{ position: 'absolute', left: xs[i], top, ...sW, lineHeight: 1, whiteSpace: 'nowrap', color: INK, transform: `translateY(${mix(at(f, from, 5, ease.out), 24, 0) + fall * 1000}px)` }}>
        {text}
      </div>
    );
  return (
    <AbsoluteFill style={{ background: WHITE }}>
      {fall < 1 && (
        <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `translateY(${rise}px) scale(${push})` }}>
          {word(0, '4', T.proofIn)}
          {word(1, 'hours', T.hours)}
          {word(2, 'back', T.back)}
        </AbsoluteFill>
      )}
      {f >= T.stop2 && f < T.mark && <div style={{ position: 'absolute', left: S.x - stopD / 2, top: S.y - stopD / 2, width: stopD, height: stopD, borderRadius: '50%', background: mixColor(INK, TILE[1], swell) }} />}
      {f >= T.mark && (
        <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `scale(${lockCreep})` }}>
          <div style={{ position: 'absolute', left: mk.x - TILE_S / 2, top: mk.y - TILE_S / 2, transform: `rotate(${mix(spin, 74, 0)}deg) scale(${mix(spin, 0.8, 1)})`, filter: landBlur(f, T.mark, 5, 4) ? `blur(${landBlur(f, T.mark, 5, 4)}px)` : undefined }}>
            <Mark size={TILE_S} />
          </div>
          {f >= T.swap + 8 && (
            <div style={{ position: 'absolute', left: L.x + TILE_S / 2 + 56, top: L.y - BRAND_FS * 0.56, ...sBrand, color: INK, lineHeight: 1.12, whiteSpace: 'nowrap', clipPath: `inset(-20% ${mix(wipe, 100, -2)}% -30% 0)`, transform: `translateX(${mix(wipe, -60, 0)}px)` }}>Brief</div>
          )}
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
  // Sound (study 2026-11-25): dry, soft and few. No chimes, tones, bubbles, swells or booms; the ending is music only.
  const cues = [
    // the pile: a soft tap on every other toast, quieter as they crowd
    ...TOAST_F.filter((_, i) => i % 2 === 0).map((x, i) => ({ at: Math.max(0, x), ...s['kenney-interface-click_001'], volume: i < 3 ? 0.45 : 0.28, rate: 0.94 + (i % 4) * 0.05 })),
    { at: T.recede + 2, ...s['mixkit-168'], volume: 0.25 },
    ...T.words.map((w) => ({ at: w, ...s['mixkit-2384'], volume: 0.22 })),
    { at: T.stop, ...s['kenney-interface-click_001'], volume: 0.45 },
    // the main hit: one soft low knock; the music coming back after its breath carries the rest
    { at: HIT, ...s['kenney-rpg-footstep05'], volume: 0.8 },
    // one key sound per typed key, one for the rest landing at once
    ...keyTimes.filter((k, i) => i === 0 || k !== keyTimes[i - 1]).map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: k === burstKey ? 0.26 : 0.18, rate: 0.92 + rand(i * 1.7) * 0.18 })),
    { at: T.send, ...s['kenney-interface-click_001'], volume: 0.45 },
    { at: T.wall + 4, ...s['mixkit-175'], volume: 0.28 },
    // the reading front is silent; a dry click as each of the four that need you lights
    ...CH_IDX.map((i) => ({ at: Math.round(readF(i)), ...s['mixkit-3124'], volume: 0.3 })),
    { at: T.title, ...s['kenney-rpg-footstep04'], volume: 0.45 },
    { at: T.land, ...s['mixkit-3124'], volume: 0.36 },
    { at: T.click, ...s['kenney-interface-click_001'], volume: 0.5 },
    { at: T.approve, ...s['kenney-interface-click_001'], volume: 0.55 },
    // the run of velocity cuts: air into each cut, a soft knock under the ground cut, a click as each state lands
    { at: T.cuts[0], ...s['mixkit-168'], volume: 0.3 },
    { at: T.cuts[0], ...s['kenney-rpg-footstep05'], volume: 0.6 },
    { at: T.cuts[0] + 6, ...s['mixkit-3124'], volume: 0.3 },
    { at: T.cuts[1], ...s['mixkit-175'], volume: 0.28 },
    { at: T.cuts[1] + 6, ...s['kenney-interface-click_001'], volume: 0.35 },
    { at: T.cuts[2], ...s['kenney-rpg-cloth1'], volume: 0.5 },
    { at: T.dock, ...s['mixkit-3124'], volume: 0.36 },
    // the four hours clearing: paper slices, rising
    ...T.clears.map((c, i) => ({ at: c, ...s['mixkit-2384'], volume: 0.2, rate: 0.95 + i * 0.06 })),
    { at: T.dive + 4, ...s['mixkit-168'], volume: 0.25 },
  ];
  return (
    <AbsoluteFill style={{ background: GROUND }}>
      {f < HIT && <Pile />}
      {f >= T.words[0] - 1 && f < T.bar + 1 && <Line />}
      {f >= T.bar && f < T.wall + 15 && <Ask />}
      {f >= T.wall && f < T.title && (
        <AbsoluteFill style={{ clipPath: f < T.wall + 14 ? growClip(barBox, at(f, T.wall, 14, ease.in)) : undefined }}>
          <Inbox />
        </AbsoluteFill>
      )}
      {f >= T.title && f < T.land && <Gather />}
      {f >= T.land && f < T.cuts[0] && <Page />}
      {f >= T.cuts[0] && f < T.cuts[1] && <HostGitHub />}
      {f >= T.cuts[1] && f < T.cuts[2] && <HostLinear />}
      {f >= T.cuts[2] && f < T.proofIn && <Calendar />}
      {f >= T.whip[0] && f < T.cuts[2] + 8 && <ChainBox />}
      {f >= T.proofIn && <End />}
      {/* main hit HIT unchanged at 92 (startFrom 11.77 + 20 / 30 from the earlier move 112 -> 92) */}
      <Music src="music/your-breath.mp3" startFrom={12.44} volume={0.7} duck={[HIT, T.cuts[0], T.mark]} breaths={[HIT, T.proofIn]} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const briefDuration = T.end;
