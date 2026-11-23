// "Inkwell": iteration 8 of the v2 kit. 9.0 s (271 f) at 30 fps. An invented writing app with Claude inside every document.
// World: cream paper, one Inter voice for the claims and the product, a serif only in the wordmark, one accent from the
// partner's own mark (Claude's coral). Grounds: cream (base), coral (accent), ink (inverse), each lit by one soft light.
// The front half is the document: the claim "Write with Claude." is its title on frame 0, the camera travels down into the
// body, the weak sentence is struck and falls, "Revenue grew 34 %." lands in macro. The back half was rebuilt after
// critic 6 (it no longer floods, relays through three hosts, pulls back from a wall and drains it into the mark).
//
// DEVICES (the claim: Claude writes better, in whatever you write in)
// - signature: Claude's mark joining a line, 4 uses: in the title's word gap, flown into the prompt pill, at the head of
//   the lifted plate, turning over above every rewrite in the spectacle
// - opening: type on the product's own paper, the claim written as the document's title, already moving on frame 0
// - type treatment: type set on the paper; each new word born in coral and cooling to its ink
// - text arrivals: cut-on words (born coral); a rewrite in place (the draft struck, the new line cut on)
// - seams: 1-2 camera travel down the page (one shot) | 2-3 macro ride on "34 %" and back out (one shot) | 3-4 the line
//   lifts off as a plate and the hosts hard-cut under it (ground swap under a layer that stays; ground cut 1, coral) |
//   4-5 colour-flip cut with a size step, the cream plate's ink line cut to cream on ink at 112 px (ground cut 2) |
//   5-6 push, a new sheet slides up over the ink (ground cut 3, cream)
// - output-big: "Revenue grew 34 %." in macro, about 145 px
// - integrations: object-lock swap, the sentence fixed at 70 px (78 % of the width, the largest text in every host) while
//   six hosts cut behind it on the music's sixteenths (6, 6, 5, 5, 4 f, the last 17 f): Gmail on coral, Notion tilted on
//   ink, an Obsidian note in mono on cream, Google Slides on sand, a Substack post on deep coral, iMessage on a phone
// - spectacle: type spectacle, a conveyor of drafts from every doc, each carried to the centre, struck and rewritten
//   under Claude's light at 140 px, the conveyor in perspective, accelerating (rewrites 17, 17, 9 f apart), 2.3 s on a lit ink ground
// - lockup: bookend, a new page whose title answers the opening's ("Wherever you write."); the ink drop falls into the
//   title's head as Claude's mark fell into the first one, and the title turns over into the wordmark
// - budget: no flood, no relay, no wall, no mark gathered from the many
//
// BEATS (frames, composition, what the viewer sees; how it hands off)
//  1   0-20  type-on-surface  the title "Write with ✳ Claude." written on the page; the camera starts to travel
//  2  20-52  full-ui          down into the body: the weak sentence highlighted, the prompt pill, Claude's mark lands in it
//  3  52-80  macro            output-big: the sentence struck and falling, "Revenue grew 34 %." at ~145 px, the camera rides it
//  4  80-112 full-ui          pull back to the whole line; it lifts off the page as a plate      (ground swap under the plate)
//  5 112-155 surface          the object-lock swap through six hosts (HIT 112)                       (colour-flip cut, size step)
//  6 155-225 giant-type       spectacle: drafts carried in and rewritten one after another, faster   (push: a new sheet)
//  7 225-271 type-on-surface  the bookend page, "Wherever you write.", the drop falls in, the title turns into "Inkwell"
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  at,
  Brand,
  clamp,
  creep,
  Cues,
  ease,
  fonts,
  Grain,
  Ground,
  Icon,
  lightUI,
  logScale,
  mix,
  mixColor,
  Music,
  Paper,
  Phone,
  Spinner,
  springAt,
  springs,
  useTextWidth,
  type Theme,
} from '../../kit';
import { sfx } from '../../sfx';

const INK = '#1C1A17';
const CLAUDE = '#D97757';
const CORAL_DEEP = '#B9603F';
const CREAM = '#F6F1EA';
const MUTED = '#7A746B';
const SAND = '#E8D7BA';
const NIGHT = '#2A201B'; // the phone's warm dark room
// one sans voice (Inter, optical sizing on): titles and claims at 500-540, sentence case, emphasis by colour
const voice: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 520, letterSpacing: '-0.022em', color: INK };
// the wordmark is the one serif: the drop and the name set as one logotype (Newsreader, regular, tracking -0.01 em)
const mark: React.CSSProperties = { fontFamily: fonts.serif, fontWeight: 400, letterSpacing: '-0.01em', color: INK };
const ui: Theme = { ...lightUI, accent: CLAUDE, ink: INK, muted: MUTED, fill: '#F3EEE7', line: 'rgba(28,26,23,0.08)', radius: 26, font: fonts.inter };

const T = {
  words: [-4, 3, 9, 15], // "Write" "with" [mark] "Claude." as the doc's title
  push: 20, // the camera leaves the title for the body
  select: 28,
  ask: 30, // the prompt pill rises under the sentence
  land: 36, // the mark from the title lands in the pill
  type: 37,
  think: 42,
  rewrite: 52, // the weak sentence is struck
  n: [61, 64, 67], // "Revenue" "grew" "34 %." in macro
  pull: 80, // the camera pulls back from the macro
  rest: 84, // "Every region beat plan."
  lift: 98, // the line lifts off the page as a plate
  hA: 112, // MAIN HIT: the first host of the swap cuts in under the plate (a lift of the track, a beat)
  hosts: [112, 118, 124, 129, 134, 138], // Gmail, Notion, Obsidian, Slides, Substack, iMessage (sixteenths of 105 BPM)
  sp: 155, // colour-flip cut into the ink: the spectacle (a half-beat)
  whips: [164, 181, 198, 210], // the conveyor carries draft k to the centre
  rw: [172, 189, 206, 215], // ... where it is struck and rewritten (half-beats, then a beat)
  page: 225, // a new sheet slides up over the ink, lands on the beat (231)
  title: [231, 233, 235], // "Wherever" "you" "write." (end type from here: 40 f, 14.8 %)
  drip: 238, // the ink drop falls into the title's head
  turn: 243, // the title turns over into the wordmark; the camera goes to it
  end: 271,
} as const;

// the swap's locked point and the plate
const AX = 960;
const AY = 540;
const PLATE_FS = 70;
const NEW = 'Revenue grew 34 %. Every region beat plan.';
const KEY = '34 %.';
const PLATE_PAD_L = PLATE_FS * 0.52;
const PLATE_PAD_R = PLATE_FS * 0.66;
const PLATE_MARK = PLATE_FS * 0.86;
const PLATE_GAP = PLATE_FS * 0.36;
const plateText: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 540, fontSize: PLATE_FS, letterSpacing: '-0.015em' };

type Tint = { bg: string; fg: string; key: string; mark: string };
const PL_CREAM: Tint = { bg: '#FFFBF6', fg: INK, key: CORAL_DEEP, mark: 'brand' };
const PL_CORAL: Tint = { bg: CLAUDE, fg: INK, key: INK, mark: '#FFF4EC' };
const PL_INK: Tint = { bg: '#211E1A', fg: CREAM, key: '#E8906E', mark: 'brand' };

/** The artefact: the rewritten sentence on a plate led by Claude's mark. Re-tinted for each host's ground in the cut frame. */
const Plate: React.FC<{ tint: Tint; lit?: number }> = ({ tint, lit = 1 }) => {
  const i = NEW.indexOf(KEY);
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: PLATE_GAP,
        padding: `${PLATE_FS * 0.42}px ${PLATE_PAD_R}px ${PLATE_FS * 0.42}px ${PLATE_PAD_L}px`,
        borderRadius: PLATE_FS * 0.32,
        background: lit >= 1 ? tint.bg : `rgba(255,251,246,${lit})`,
        boxShadow: lit > 0 ? `inset 0 2px 0 rgba(255,255,255,${0.35 * lit}), 0 ${PLATE_FS * 0.4}px ${PLATE_FS * 0.9}px -${PLATE_FS * 0.3}px rgba(25,12,4,${0.55 * lit})` : undefined,
        whiteSpace: 'nowrap',
        ...plateText,
        lineHeight: 1.15,
        color: tint.fg,
      }}
    >
      <div style={{ width: PLATE_MARK, height: PLATE_MARK, flexShrink: 0, display: 'flex', transform: `scale(${lit})` }}>
        <Brand name="claude" size={PLATE_MARK} color={tint.mark} />
      </div>
      <span>
        {NEW.slice(0, i)}
        <span style={{ color: mixColor(tint.fg, tint.key, lit) }}>{KEY}</span>
        {NEW.slice(i + KEY.length)}
      </span>
    </div>
  );
};

const pivot = (s: number, extra = ''): React.CSSProperties => ({ transformOrigin: `${AX}px ${AY}px`, transform: `${extra} scale(${s})` });

/** Horizontal motion blur (an SVG filter), only on the frames that move fast. */
const HBlur: React.FC<{ id: string; px: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ id, px, children, style }) => (
  <>
    {px > 0.6 && (
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <filter id={id} x="-5%" y="0%" width="110%" height="100%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={`${px.toFixed(1)} 0`} />
        </filter>
      </svg>
    )}
    <AbsoluteFill style={{ ...style, filter: px > 0.6 ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
  </>
);

// ---------------------------------------------------------------- 1-4. the document: title, travel to the body, the rewrite in macro
// A 2D camera over the page's world: the world point (x, y) sits at the frame's centre at zoom z (log-space between keys).
type Key = { f: number; x: number; y: number; z: number; curve?: (t: number) => number };
const PADL = 340; // the text's left edge on the page
const TITLE_Y = 190;
const TITLE_SIZE = 100; // 160-168 px on screen at the opening zoom: the whole line fits the frame
const PARA_Y = 500; // the sentence's first line (32 px, line height 48)
const LINE_CY = PARA_Y + 24;
const PILL_Y = 630;
const CAM: Key[] = [
  { f: 0, x: 870, y: 260, z: 1.6 },
  { f: T.push, x: 872, y: 268, z: 1.68, curve: ease.inOut },
  { f: T.land, x: 790, y: 600, z: 2.0, curve: ease.inOut }, // down past the title into the body
  { f: T.rewrite, x: 800, y: 594, z: 2.15, curve: ease.inOut },
  { f: T.n[2] - 1, x: 492, y: LINE_CY, z: 4.4, curve: ease.inOut }, // macro on the rewrite
  { f: T.pull, x: 525, y: LINE_CY + 2, z: 4.6, curve: ease.inOut }, // ride along "34 %"
  { f: T.lift - 4, x: 712, y: 578, z: 1.92, curve: ease.inOut }, // pull back: the whole line
  { f: T.hA, x: 716, y: 578, z: 1.97, curve: ease.inOut },
];
const camOf = (keys: Key[], f: number) => {
  if (f <= keys[0].f) return keys[0];
  for (let i = 1; i < keys.length; i++) {
    const a = keys[i - 1];
    const b = keys[i];
    if (f <= b.f) {
      const p = (b.curve ?? ease.inOut)(clamp((f - a.f) / (b.f - a.f)));
      return { f, x: mix(p, a.x, b.x), y: mix(p, a.y, b.y), z: logScale(a.z, b.z, p) };
    }
  }
  return keys[keys.length - 1];
};
const camAt = (f: number) => camOf(CAM, f);
const worldStyle = (c: { x: number; y: number; z: number }, par = 1): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: 1920,
  height: 1080,
  transformOrigin: '0 0',
  transform: `translate(${960 - c.x * c.z * par}px, ${540 - c.y * c.z * par}px) scale(${c.z * par})`,
});

const OLD = 'Our quarterly results were generally quite positive in most of the areas we looked at.';
const OLD_W = OLD.split(' ');
const NEW_W = NEW.split(' ');
const NEW_T = [T.n[0], T.n[1], T.n[2], T.n[2], T.rest, T.rest + 1, T.rest + 3, T.rest + 4];
const PROMPT = 'Sharper, with the numbers';

const Doc: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = camAt(f);
  const titleStyle: React.CSSProperties = { ...voice, fontSize: TITLE_SIZE, lineHeight: 1 };
  const wWrite = useTextWidth('Write', titleStyle);
  const wWith = useTextWidth('with', titleStyle);
  const gap = 0.26 * TITLE_SIZE;
  const SLOT = Math.round(TITLE_SIZE * 1.16); // the mark's slot in the title, sized to the line
  const promptW = useTextWidth(PROMPT, { fontFamily: fonts.inter, fontSize: 30 });
  // the mark: pops into the title's slot, then flies down into the prompt pill as the camera pushes
  const pop = springAt(f, fps, T.words[2] - 2, springs.pop);
  const fly = at(f, T.push + 2, T.land - T.push - 2, ease.inOut);
  const markFrom = { x: PADL + wWrite + gap + wWith + gap + SLOT / 2, y: TITLE_Y + TITLE_SIZE * 0.5, s: Math.round(TITLE_SIZE * 0.92) }; // centred on the cap height
  const markTo = { x: PADL + 26 + 20, y: PILL_Y + 14 + 20, s: 40 };
  const markS = logScale(markFrom.s, markTo.s, fly) * mix(pop, 0.2, 1);
  const pill = springAt(f, fps, T.ask, springs.card);
  const pillOut = at(f, T.rewrite + 2, 8, ease.in);
  const shown = f >= T.type + 3 ? PROMPT : f >= T.type ? 'Sharper,' : '';
  const reflow = at(f, T.n[0], 14, ease.inOut); // the paragraphs under the sentence close the gap
  const wordIn = (t: number) => (f >= t ? 1 : 0);
  // as the line lifts off, the page falls out of focus behind it
  const dof = at(f, T.lift + 2, 10, ease.inOut) * 2.5;
  return (
    <AbsoluteFill style={{ overflow: 'hidden', filter: dof > 0.05 ? `blur(${dof}px)` : undefined }}>
      {/* a second sheet behind the page, on its own parallax */}
      <div style={worldStyle(cam, 0.94)}>
        <div style={{ position: 'absolute', left: 330, top: 120, width: 1420, height: 1500, borderRadius: 30, background: '#EDE5DA', transform: 'rotate(2.4deg)', boxShadow: '0 30px 70px -30px rgba(110,60,30,0.3)', filter: 'blur(1.5px)' }} />
      </div>
      <div style={worldStyle(cam)}>
        <div style={{ position: 'absolute', left: 250, top: 60, width: 1420, height: 1500, borderRadius: 30, background: '#FFFDF9', boxShadow: 'inset 0 1.5px 0 #FFFFFF, 0 30px 70px -30px rgba(110,60,30,0.35)' }} />
        <div style={{ position: 'absolute', left: PADL, top: 92, fontFamily: fonts.inter, fontSize: 22, color: ui.muted, display: 'flex', gap: 14, alignItems: 'center', height: 30, whiteSpace: 'nowrap' }}>
          <Brand name="googledocs" file="logos/google-docs.svg" size={30} /> Q3 board update · Draft
        </div>
        {/* the title is the claim, written on the page */}
        <div style={{ position: 'absolute', left: PADL, top: TITLE_Y, display: 'flex', gap, whiteSpace: 'nowrap' }}>
          {['Write', 'with', null, 'Claude.'].map((w, i) =>
            w === null ? (
              <div key={i} style={{ width: SLOT }} />
            ) : (
              <span
                key={i}
                style={{
                  ...titleStyle,
                  opacity: wordIn(T.words[i]),
                  // emphasis by colour: "Claude." parks in the deep coral, the rest settles to ink
                  color: mixColor(CLAUDE, i === 3 ? CORAL_DEEP : INK, at(f, T.words[i], 12, ease.inOut)),
                  transform: `translateY(${mix(at(f, T.words[i], 6, ease.out), 18, 0)}px)`,
                  display: 'inline-block',
                }}
              >
                {w}
              </span>
            ),
          )}
        </div>
        {/* the weak sentence: highlighted, struck, falling away */}
        <div style={{ position: 'absolute', left: PADL, top: PARA_Y, width: 880, fontFamily: fonts.inter, fontSize: 32, lineHeight: '48px', color: '#3B3732' }}>
          {OLD_W.map((w, i) => {
            const hl = at(f, T.select + i * 0.5, 3, ease.out);
            const strike = at(f, T.rewrite + i * 0.3, 3, ease.out);
            const fall = at(f, T.rewrite + 2 + i * 0.3, 7, ease.in);
            return (
              <span key={i} style={{ position: 'relative', display: 'inline-block', marginRight: '0.27em', background: `rgba(217,119,87,${0.22 * hl * (1 - strike)})`, opacity: 1 - fall, transform: `translateY(${fall * 46}px) rotate(${fall * (i % 2 ? 7 : -6)}deg)`, filter: `blur(${fall * 3}px)`, color: strike > 0 ? '#9C948A' : undefined }}>
                {w}
                <span style={{ position: 'absolute', left: -2, top: 25, height: 3, width: `calc(${strike * 100}% + 4px)`, background: CLAUDE, borderRadius: 2, opacity: strike > 0 ? 1 : 0 }} />
              </span>
            );
          })}
        </div>
        {/* the rewrite, cut on word by word in its place */}
        <div style={{ position: 'absolute', left: PADL, top: PARA_Y, display: 'flex', gap: '0.27em', whiteSpace: 'nowrap', fontFamily: fonts.inter, fontWeight: 540, fontSize: 32, lineHeight: '48px', letterSpacing: '-0.015em', opacity: f >= T.lift ? 0 : 1 }}>
          {NEW_W.map((w, i) => (
            <span key={i} style={{ display: 'inline-block', opacity: wordIn(NEW_T[i]), color: mixColor(CLAUDE, INK, at(f, NEW_T[i] + 4, 12, ease.inOut)), transform: `translateY(${mix(at(f, NEW_T[i], 5, ease.out), 8, 0)}px)` }}>
              {w}
            </span>
          ))}
        </div>
        {/* the rest of the page, closing up under the new line */}
        <div style={{ position: 'absolute', left: PADL, top: mix(reflow, 750, 580), width: 900, fontFamily: fonts.inter, fontSize: 32, lineHeight: '48px', color: '#8B857C' }}>
          Customer count is up in all four regions, led by APAC.
          <div style={{ marginTop: 26, ...voice, fontWeight: 540, fontSize: 50, lineHeight: 1.1, letterSpacing: '-0.015em' }}>What changed</div>
          <div style={{ marginTop: 14 }}>SMB churn fell to 3.1 % after the pricing change.</div>
        </div>
        {/* the prompt pill, under the sentence */}
        {f >= T.ask && (
          <div style={{ position: 'absolute', left: PADL, top: PILL_Y, transformOrigin: 'left center', transform: `translateY(${mix(pill, 30, 0) + pillOut * 30}px) scale(${mix(pill, 0.85, 1)})`, opacity: clamp(pill * 2) * (1 - pillOut) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderRadius: 999, padding: '14px 26px', background: 'rgba(255,255,255,0.95)', boxShadow: 'inset 0 1px 0 #FFFFFF, inset 0 0 0 1.5px rgba(217,119,87,0.35), 0 16px 34px -14px rgba(90,60,30,0.4)' }}>
              <div style={{ width: 40, height: 40, opacity: f >= T.land ? 1 : 0 }}>
                <Brand name="claude" size={40} />
              </div>
              <span style={{ fontFamily: fonts.inter, fontSize: 30, color: INK, width: promptW + 4, whiteSpace: 'nowrap', lineHeight: '40px' }}>
                {shown}
                {f < T.think && <span style={{ display: 'inline-block', width: 3, height: 32, marginLeft: 2, verticalAlign: -5, background: CLAUDE, opacity: Math.floor(f / 6) % 2 ? 0.2 : 1 }} />}
              </span>
              <div style={{ width: 32, height: 32 }}>{f >= T.think && <Spinner start={T.think} doneAt={T.rewrite} size={32} color="#C8BFB4" done={CLAUDE} stroke={3.5} />}</div>
            </div>
          </div>
        )}
        {/* the mark itself: in the title, then carried into the pill */}
        {f >= T.words[2] - 2 && f < T.land && (
          <div style={{ position: 'absolute', left: mix(fly, markFrom.x, markTo.x), top: mix(fly, markFrom.y, markTo.y) - 60 * Math.sin(Math.PI * fly), width: 0, height: 0, opacity: clamp(pop * 3) }}>
            <div style={{ position: 'absolute', left: -markS / 2, top: -markS / 2, transform: `rotate(${mix(pop, -40, 0) + 200 * fly}deg)` }}>
              <Brand name="claude" size={markS} />
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

/** The sentence lifts off the page as a cream plate and rises to the swap's locked point; the page blurs behind it. */
const CF = camAt(T.lift);
const S0 = (32 * CF.z) / PLATE_FS;
const SENT = { left: 960 + (PADL - CF.x) * CF.z, y: 540 + (LINE_CY - CF.y) * CF.z };
const Lift: React.FC = () => {
  const f = useCurrentFrame();
  const textW = useTextWidth(NEW, plateText);
  const lead = PLATE_PAD_L + PLATE_MARK + PLATE_GAP;
  const plateW = lead + textW + PLATE_PAD_R;
  const sx = SENT.left - lead * S0 + (plateW * S0) / 2;
  const p = at(f, T.lift, T.hA - T.lift, ease.inOut);
  const lit = at(f, T.lift, 7, ease.out);
  return (
    <div style={{ position: 'absolute', left: mix(p, sx, AX), top: mix(p, SENT.y, AY), transform: `translate(-50%, -50%) translateY(${-22 * Math.sin(Math.PI * p)}px) scale(${mix(p, S0, 1)})`, zIndex: 40 }}>
      <Plate tint={PL_CREAM} lit={lit} />
    </div>
  );
};

// ---------------------------------------------------------------- 5. the object-lock swap: the plate fixed, six hosts cut behind it
const txt: React.CSSProperties = { position: 'absolute', fontFamily: fonts.inter, color: INK, whiteSpace: 'nowrap' };

/** Host 1, Gmail on coral: a compose window drawn full-bleed on the ground itself. */
const HostMail: React.FC<{ t: number }> = () => {
  const field: React.CSSProperties = { ...txt, left: 110, fontSize: 42, display: 'flex', alignItems: 'center', gap: 26 };
  const rule = (top: number): React.CSSProperties => ({ position: 'absolute', left: -60, right: -60, top, height: 2, background: 'rgba(60,22,8,0.22)' });
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Ground color={CLAUDE} light={{ x: 0.3, y: 0.3, size: 0.9, amount: 0.12 }} />
      <div style={{ position: 'absolute', left: -80, right: -80, top: -60, height: 196, background: CORAL_DEEP, boxShadow: 'inset 0 -2px 0 rgba(60,22,8,0.25)' }} />
      <div style={{ ...field, top: 40, color: CREAM, fontSize: 46, fontWeight: 600 }}>
        <Brand name="gmail" size={60} color={CREAM} /> New message
      </div>
      <div style={{ position: 'absolute', right: 110, top: 50, display: 'flex', gap: 44 }}>
        {['Minus', 'Maximize2', 'X'].map((n) => (
          <Icon key={n} name={n} size={46} color={CREAM} stroke={2.4} />
        ))}
      </div>
      <div style={{ ...field, top: 170 }}>
        <span style={{ color: '#6E2D17' }}>To</span>
        <span style={{ background: 'rgba(255,240,230,0.45)', borderRadius: 999, padding: '6px 24px' }}>board@northwind.co</span>
      </div>
      <div style={rule(250)} />
      <div style={{ ...field, top: 276 }}>
        <span style={{ color: '#6E2D17' }}>Subject</span> Q3 update, before Thursday
      </div>
      <div style={rule(354)} />
      <div style={{ ...field, top: 392, fontSize: 44 }}>Hi all, a short Q3 note before Thursday.</div>
      <div style={{ ...field, top: 650, fontSize: 44 }}>Full deck attached. Happy to take questions.</div>
      <div style={rule(880)} />
      <div style={{ ...field, top: 926, gap: 50 }}>
        <span style={{ background: INK, color: CREAM, fontWeight: 600, borderRadius: 999, padding: '18px 54px', boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18), 0 14px 30px -12px rgba(60,22,8,0.6)', display: 'flex', alignItems: 'center', gap: 16 }}>
          Send <Icon name="SendHorizontal" size={38} color={CREAM} stroke={2.4} />
        </span>
        {['Paperclip', 'Link', 'Smile', 'Image', 'PenLine'].map((n) => (
          <Icon key={n} name={n} size={50} color={INK} stroke={2.2} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** Host 2, a Notion page as a tilted plane on ink, in a warm key light: the page's edge shows. */
const HostNotion: React.FC<{ t: number }> = ({ t }) => {
  const p = ease.out(clamp(t / 6));
  const rx = mix(p, 24, 17);
  const rz = mix(p, -8, -5);
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden', perspective: 1700, perspectiveOrigin: `${AX}px ${AY}px` }}>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 10%, rgba(217,119,87,0.24), rgba(217,119,87,0) 70%)' }} />
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', ...pivot(1.04, `rotateX(${rx}deg) rotateZ(${rz}deg)`) }}>
        <div style={{ position: 'absolute', left: 40, top: -60, width: 3200, height: 2600, background: '#F4EEE5', borderRadius: 28, boxShadow: 'inset 0 3px 0 #FFFFFF, inset 3px 0 0 rgba(255,255,255,0.8), -30px 60px 120px rgba(0,0,0,0.55)' }} />
        <div style={{ ...txt, left: 180, top: 24, display: 'flex', alignItems: 'center', gap: 22, fontSize: 36, color: MUTED }}>
          <Brand name="notion" size={62} color={INK} /> Board <span style={{ opacity: 0.5 }}>/</span> Q3 summary
        </div>
        <div style={{ ...txt, left: 180, top: 122, fontSize: 62, fontWeight: 650, letterSpacing: '-0.025em' }}>Q3 summary</div>
        <div style={{ ...txt, left: 180, top: 236, fontSize: 36, color: MUTED, display: 'flex', gap: 60 }}>
          <span>
            Owner <b style={{ color: INK, fontWeight: 550, marginLeft: 16 }}>Priya Nair</b>
          </span>
          <span>
            Status <b style={{ color: CORAL_DEEP, fontWeight: 600, marginLeft: 16 }}>● Ready for board</b>
          </span>
        </div>
        <div style={{ ...txt, left: 112, top: AY - 26 }}>
          <Icon name="GripVertical" size={52} color="#B3AA9E" />
        </div>
        {[
          { t: 'Hiring plan for Q4', done: false },
          { t: 'Send the numbers to finance', done: true },
        ].map((r, k) => (
          <div key={k} style={{ ...txt, left: 210, top: 690 + k * 96, fontSize: 44, display: 'flex', alignItems: 'center', gap: 26 }}>
            <span style={{ width: 44, height: 44, borderRadius: 8, border: `3px solid ${r.done ? CLAUDE : '#A49C91'}`, background: r.done ? CLAUDE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.done && <Icon name="Check" size={34} color="#FFFFFF" stroke={3.2} />}
            </span>
            <span style={{ textDecoration: r.done ? 'line-through' : undefined, color: r.done ? '#A49C91' : INK }}>{r.t}</span>
          </div>
        ))}
        <div style={{ ...txt, left: 210, top: 890, fontSize: 40, color: '#B3AA9E' }}>Type ‘/’ for commands</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host 3, an Obsidian note: markdown in mono on cream paper, in close-up; the lines travel past the locked plate. */
const HostMarkdown: React.FC<{ t: number }> = ({ t }) => {
  const p = ease.out(clamp(t / 5));
  const mono: React.CSSProperties = { position: 'absolute', left: 190, fontFamily: fonts.mono, fontSize: 56, color: INK, whiteSpace: 'pre', letterSpacing: '-0.02em', lineHeight: 1 };
  const gut: React.CSSProperties = { position: 'absolute', left: 64, fontFamily: fonts.mono, fontSize: 36, color: '#B5AA9C' };
  const LINES: Array<{ y: number; n: number; node: React.ReactNode }> = [
    { y: 230, n: 11, node: <><span style={{ color: CLAUDE }}>## </span>What went well</> },
    { y: 370, n: 12, node: <span style={{ color: MUTED }}>{'> board, Thu 10:00'}</span> },
    { y: AY, n: 13, node: null },
    { y: 712, n: 14, node: <><span style={{ color: CLAUDE }}>- </span>APAC led at +41 %</> },
    { y: 852, n: 15, node: <><span style={{ color: CLAUDE }}>## </span>What to fix</> },
    { y: 992, n: 16, node: <><span style={{ color: CLAUDE }}>- </span>SMB churn, 3.1 %</> },
  ];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Ground color={CREAM} light={{ x: 0.35, y: 0.3, size: 0.85, amount: 0.07 }} />
      <AbsoluteFill style={{ ...pivot(logScale(1.08, 1.0, p)), translate: `0 ${mix(p, 50, 0)}px` }}>
        <div style={{ ...txt, left: 110, top: 50, display: 'flex', alignItems: 'center', gap: 22, fontFamily: fonts.mono, fontSize: 34, color: MUTED }}>
          <Brand name="obsidian" size={56} /> notes / q3-review.md
        </div>
        <div style={{ position: 'absolute', left: -60, right: -60, top: 136, height: 2, background: 'rgba(28,26,23,0.12)' }} />
        {LINES.map((l) => (
          <React.Fragment key={l.n}>
            <div style={{ ...gut, top: l.y - 18 }}>{l.n}</div>
            {l.node && <div style={{ ...mono, top: l.y - 28 }}>{l.node}</div>}
          </React.Fragment>
        ))}
        <div style={{ position: 'absolute', left: 0, width: 10, top: AY - 70, height: 140, background: CLAUDE }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host 4, Google Slides on sand: the filmstrip, and the slide whose title is the sentence, a bar chart under it. */
const HostSlides: React.FC<{ t: number }> = ({ t }) => {
  const grow = ease.out(clamp(t / 5));
  const BARS = [
    { l: 'NA', h: 0.62 },
    { l: 'EMEA', h: 0.5 },
    { l: 'APAC', h: 0.86, key: true },
    { l: 'LATAM', h: 0.4 },
  ];
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Ground color={SAND} light={{ x: 0.6, y: 0.45, size: 0.9, amount: 0.12 }} />
      <AbsoluteFill style={pivot(mix(grow, 1.03, 1))}>
        <div style={{ ...txt, left: 56, top: 36, display: 'flex', alignItems: 'center', gap: 24, fontSize: 40 }}>
          <Brand name="googleslides" size={62} /> Q3 board deck
          <span style={{ display: 'flex', gap: 30, marginLeft: 34, fontSize: 30, color: '#7D705C' }}>
            {['File', 'Edit', 'View', 'Insert', 'Slide'].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </span>
        </div>
        <div style={{ ...txt, right: 64, top: 30, fontSize: 34, fontWeight: 600, background: '#F6C445', borderRadius: 999, padding: '14px 38px', boxShadow: '0 10px 24px -12px rgba(90,60,10,0.5)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Icon name="Play" size={30} color={INK} stroke={2.6} /> Slideshow
        </div>
        {[0, 1, 2, 3].map((k) => (
          <div key={k} style={{ position: 'absolute', left: 96, top: 160 + k * 218, width: 290, height: 163, borderRadius: 10, background: '#FFFDF9', boxShadow: k === 1 ? '0 0 0 5px #F4B400, 0 10px 22px -10px rgba(90,60,20,0.45)' : '0 8px 18px -10px rgba(90,60,20,0.4)' }}>
            <div style={{ ...txt, left: -52, top: 58, fontSize: 30, color: '#7D705C' }}>{k + 1}</div>
            <div style={{ position: 'absolute', left: 22, top: 26, width: [150, 200, 130, 170][k], height: 14, borderRadius: 7, background: k === 1 ? CLAUDE : '#CDBB9A' }} />
            {[0, 1, 2].map((b) => (
              <div key={b} style={{ position: 'absolute', left: 22 + b * 78, bottom: 22, width: 52, height: [40, 64, 30, 52][(k + b) % 4], borderRadius: 4, background: '#E4D6BC' }} />
            ))}
          </div>
        ))}
        <div style={{ position: 'absolute', left: 450, top: 150, width: 1420, height: 800, borderRadius: 16, background: '#FFFDF9', boxShadow: 'inset 0 2px 0 #FFFFFF, 0 30px 60px -26px rgba(90,60,20,0.5)' }}>
          <div style={{ ...txt, left: 80, top: 60, fontSize: 36, color: MUTED }}>Q3 2026 · Board review</div>
          {BARS.map((b, k) => (
            <React.Fragment key={b.l}>
              <div style={{ position: 'absolute', left: 300 + k * 230, bottom: 110, width: 150, height: 250 * b.h * mix(grow, 0.7, 1), borderRadius: '10px 10px 0 0', background: b.key ? CLAUDE : '#DCCBAA' }} />
              <div style={{ ...txt, left: 300 + k * 230, width: 150, bottom: 50, textAlign: 'center', fontSize: 32, color: b.key ? CORAL_DEEP : MUTED, fontWeight: b.key ? 600 : 450 }}>{b.l}</div>
            </React.Fragment>
          ))}
          <div style={{ position: 'absolute', left: 240, right: 240, bottom: 108, height: 3, background: '#D5C7AE' }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host 5, a Substack post: a centred page column on a deep coral ground. */
const HostSubstack: React.FC<{ t: number }> = ({ t }) => {
  const p = ease.out(clamp(t / 4));
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Ground color={CORAL_DEEP} light={{ x: 0.5, y: 0.25, size: 0.8, amount: 0.14 }} />
      <div style={{ position: 'absolute', left: 420, top: mix(p, -10, -40), width: 1080, height: 1200, background: '#FFFDF9', boxShadow: 'inset 0 2px 0 #FFFFFF, 0 40px 90px -30px rgba(40,12,2,0.65)' }}>
        <div style={{ ...txt, left: 70, top: 110, display: 'flex', alignItems: 'center', gap: 20, fontSize: 44, fontWeight: 650, letterSpacing: '-0.02em' }}>
          <Brand name="substack" size={54} /> Northwind Notes
        </div>
        <div style={{ ...txt, right: 70, top: 104, fontSize: 32, fontWeight: 600, color: '#FFFFFF', background: '#FF6719', borderRadius: 10, padding: '12px 30px' }}>Subscribe</div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 210, height: 2, background: 'rgba(28,26,23,0.1)' }} />
        <div style={{ ...txt, left: 70, top: 262, fontSize: 56, fontWeight: 650, letterSpacing: '-0.025em' }}>What Q3 taught us</div>
        <div style={{ ...txt, left: 70, top: 356, display: 'flex', alignItems: 'center', gap: 18, fontSize: 32, color: MUTED }}>
          <span style={{ width: 50, height: 50, borderRadius: 25, background: '#E2C3AE', display: 'inline-block' }} /> Priya Nair · Nov 20
        </div>
        <div style={{ position: 'absolute', left: 70, right: 70, top: 690, fontFamily: fonts.inter, fontSize: 36, lineHeight: 1.5, color: '#4A443D' }}>
          We closed the quarter ahead of plan, and the board asked for the short version first. Here it is, with the numbers.
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Host 6 (holds): iMessage on a phone held in warm light; the plate is the message, delivered. */
const HostPhone: React.FC<{ t: number }> = ({ t }) => {
  const W = 780;
  const sw = W - 2 * Math.round(W * 0.028);
  // the phone rises a little and turns toward us while the message is delivered and Priya starts to answer
  const c = ease.out(clamp(t / 17));
  const s = 1 + 0.07 * c;
  const delivered = t >= 7;
  const typing = t >= 11;
  const bubble: React.CSSProperties = { position: 'absolute', fontFamily: fonts.inter, fontSize: 40, lineHeight: 1.3, borderRadius: 40, padding: '22px 34px' };
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Ground color={NIGHT} light={{ x: 0.32, y: 0.22, size: 0.9, amount: 0.16 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 40% 50% at 50% 45%, rgba(217,119,87,0.18), rgba(217,119,87,0) 70%)' }} />
      <AbsoluteFill style={pivot(s, `translateY(${mix(c, 50, 0)}px) rotate(${mix(c, -9, -3)}deg)`)}>
        <div style={{ position: 'absolute', left: AX - W / 2, top: -330 }}>
          <Phone w={W} frame="#1A1614" screen="#FFFFFF">
            <div style={{ position: 'absolute', left: 0, top: 360, width: sw, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 96, height: 96, borderRadius: 48, background: 'linear-gradient(#C9B8A8, #A8968A)', color: '#FFFFFF', fontFamily: fonts.inter, fontSize: 40, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>PN</div>
              <div style={{ fontFamily: fonts.inter, fontSize: 32, color: INK, display: 'flex', alignItems: 'center', gap: 10 }}>
                Priya Nair <Icon name="ChevronRight" size={26} color="#8E8E93" />
              </div>
            </div>
            <div style={{ position: 'absolute', left: 30, top: 560, display: 'flex', alignItems: 'center', gap: 12, fontFamily: fonts.inter, fontSize: 26, color: '#8E8E93' }}>
              <Brand name="imessage" size={30} /> iMessage · Today 9:41
            </div>
            <div style={{ ...bubble, left: 30, top: 610, maxWidth: 560, background: '#E9E9EB', color: INK }}>Can you send me the Q3 line for the board?</div>
            <div style={{ position: 'absolute', right: 40, top: 958, fontFamily: fonts.inter, fontSize: 28, color: '#8E8E93', opacity: delivered ? 1 : 0 }}>Delivered</div>
            {/* Priya is typing */}
            <div style={{ position: 'absolute', left: 30, top: 1030, width: 150, height: 84, borderRadius: 42, background: '#E9E9EB', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, transformOrigin: 'left center', transform: `scale(${typing ? mix(at(t, 11, 4, ease.out), 0.6, 1) : 0})` }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{ width: 18, height: 18, borderRadius: 9, background: '#8E8E93', opacity: 0.45 + 0.55 * (Math.floor(t / 2 + d) % 3 === 0 ? 1 : 0) }} />
              ))}
            </div>
            <div style={{ position: 'absolute', left: 30, right: 30, top: 1200, height: 84, borderRadius: 42, border: '2px solid #D1D1D6', display: 'flex', alignItems: 'center', padding: '0 30px', fontFamily: fonts.inter, fontSize: 34, color: '#AEAEB2', boxSizing: 'border-box' }}>
              iMessage
            </div>
          </Phone>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const HOSTS: Array<{ C: React.FC<{ t: number }>; tint: Tint }> = [
  { C: HostMail, tint: PL_CREAM },
  { C: HostNotion, tint: PL_CORAL },
  { C: HostMarkdown, tint: PL_INK },
  { C: HostSlides, tint: PL_CORAL },
  { C: HostSubstack, tint: PL_INK },
  { C: HostPhone, tint: PL_CREAM },
];

const SwapBeat: React.FC = () => {
  const f = useCurrentFrame();
  let i = 0;
  while (i < T.hosts.length - 1 && f >= T.hosts[i + 1]) i++;
  const start = T.hosts[i];
  const end = i < T.hosts.length - 1 ? T.hosts[i + 1] : T.sp;
  const H = HOSTS[i];
  // each host pushes 1.00 -> 1.02 over its own frames; the plate stays put, creeping 0.5 % over the whole run
  const push = 1 + 0.02 * ease.out(clamp((f - start) / (end - start)));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={pivot(push)}>
        <H.C t={f - start} />
      </AbsoluteFill>
      <div style={{ position: 'absolute', left: AX, top: AY, transform: `translate(-50%, -50%) scale(${1 + 0.005 * at(f, T.hA, T.sp - T.hA)})` }}>
        <Plate tint={H.tint} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 6. spectacle: drafts from every doc, rewritten at the centre
const SP_FS = 140; // a rewritten line, 3-4 words
const SP0_FS = 124; // the carried sentence, two lines
const DRAFT_FS = 64;
const DRAFT_W = 1180;
const SP_GAP = 80;
const strongStyle = (size: number): React.CSSProperties => ({ fontFamily: fonts.inter, fontWeight: 520, fontSize: size, letterSpacing: '-0.02em', lineHeight: 1.06 });
type Item = { mark: { name: string; file?: string }; doc: string; lines: string[]; key: string; draft?: string };
const ITEMS: Item[] = [
  { mark: { name: 'googledocs', file: 'logos/google-docs.svg' }, doc: 'Q3 board update', lines: ['Revenue grew 34 %.', 'Every region beat plan.'], key: '34 %.' },
  { mark: { name: 'gmail' }, doc: 'Launch update', draft: 'We are generally hoping to ship at some point around May, if things go to plan.', lines: ['Ship date: May 12.'], key: 'May 12.' },
  { mark: { name: 'notion' }, doc: 'Hiring plan', draft: 'There are quite a few roles that we may want to look into hiring for soon.', lines: ['Two senior hires.'], key: 'Two' },
  { mark: { name: 'googleslides' }, doc: 'Pricing review', draft: 'Plans would probably start somewhere at around twelve dollars a month or so.', lines: ['Plans start at $12.'], key: '$12.' },
  { mark: { name: 'obsidian' }, doc: 'support-notes.md', draft: 'Most of the time we try to get back to our customers fairly quickly.', lines: ['Replies within 2 hours.'], key: '2 hours.' },
];
// the conveyor in item units: draft k arrives at the centre on its whip (glide), rests while it is rewritten
const ARRIVE = T.rw.map((r, k) => r - (k === 3 ? 2 : 3));
const U_KEYS: Array<[number, number]> = [[T.sp, 0]];
T.whips.forEach((w, k) => U_KEYS.push([w, k], [ARRIVE[k], k + 1]));
const conveyorU = (f: number) => {
  if (f <= U_KEYS[0][0]) return 0;
  for (let i = 1; i < U_KEYS.length; i++) {
    const [fa, ua] = U_KEYS[i - 1];
    const [fb, ub] = U_KEYS[i];
    if (f <= fb) return ua === ub ? ua : mix(ease.glide(clamp((f - fa) / (fb - fa))), ua, ub);
  }
  return U_KEYS[U_KEYS.length - 1][1];
};
const GHOST_TOP = 'It could possibly be somewhat faster in some cases.     We may want to revisit the pricing at some point.     Overall it seems like most of it is more or less on track.';
const GHOST_BOTTOM = 'Margin up 6 points.     Day one, in 20 minutes.     Live in 14 markets.     Churn down to 2.4 %.     Decisions, owners, dates.';

/** One rewritten line: the key words in coral, the rest born coral and cooling to cream; cut on word by word. */
const Strong: React.FC<{ it: Item; size: number; born: number }> = ({ it, size, born }) => {
  const f = useCurrentFrame();
  const cool = at(f, born + 2, 10, ease.inOut);
  return (
    <div style={{ ...strongStyle(size), textAlign: 'center', whiteSpace: 'nowrap', transform: `scale(${mix(at(f, born, 7, ease.out), 1.05, 1)})` }}>
      {it.lines.map((line, li) => {
        const ki = line.indexOf(it.key);
        const words = line.split(' ');
        let pos = 0;
        return (
          <div key={li}>
            {words.map((w, wi) => {
              const isKey = ki >= 0 && pos >= ki && pos < ki + it.key.length;
              pos += w.length + 1;
              return (
                <span key={wi} style={{ color: isKey ? CLAUDE : mixColor(CLAUDE, CREAM, cool), opacity: f >= born + wi ? 1 : 0 }}>
                  {w}
                  {wi < words.length - 1 ? ' ' : ''}
                </span>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

const Spectacle: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  // measured once per line (a fixed list, so the hooks keep their order)
  const widths = ITEMS.map((it, k) => Math.max(...it.lines.map((l) => useTextWidth(l, strongStyle(k === 0 ? SP0_FS : SP_FS)))));
  const slot = widths.map((w, k) => Math.max(w, k === 0 ? 0 : DRAFT_W) + SP_GAP);
  const C: number[] = [0];
  for (let k = 1; k < ITEMS.length; k++) C.push(C[k - 1] + slot[k - 1] / 2 + slot[k] / 2);
  const posAt = (fr: number) => {
    const u = conveyorU(fr);
    const k = Math.min(ITEMS.length - 2, Math.floor(u));
    return mix(u - k, C[k], C[k + 1]);
  };
  const cu = posAt(f);
  const v = Math.abs(cu - posAt(f - 1));
  const blur = Math.min(28, Math.max(0, v - 20) * 0.12);
  // the camera: a slow push over the whole beat
  const push = 1 + 0.06 * at(f, T.sp, T.page - T.sp + 8, ease.inOut);
  // Claude's mark above the centre turns over on every rewrite; its light flares with it
  const turns = T.rw.reduce((a, r) => a + springAt(f, fps, r - 1, springs.pop), 0);
  const flare = T.rw.reduce((a, r) => Math.max(a, at(f, r - 1, 2) * (1 - at(f, r + 1, 12, ease.out))), 0);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Ground color={INK} light={{ x: 0.5, y: 0.45, size: 0.95, amount: 0.07 }} />
      {/* two lights in the ground's own hue: a lamp over the mark, a band along the line it rewrites */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 50% 46% at 50% 30%, rgba(217,119,87,${0.27 + 0.12 * flare}), rgba(217,119,87,0) 72%)` }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 85% 24% at 50% 51%, rgba(217,119,87,0.14), rgba(217,119,87,0) 80%)' }} />
      <AbsoluteFill style={{ transformOrigin: '960px 520px', transform: `scale(${push})` }}>
        {/* far plane: other docs' lines drifting the other way, large and out of focus */}
        <div style={{ ...txt, left: -500 + 2.4 * (f - T.sp), top: 96, fontSize: 104, letterSpacing: '-0.02em', color: 'rgba(246,241,234,0.06)', filter: 'blur(5px)' }}>{GHOST_TOP}</div>
        <div style={{ ...txt, left: 60 - 3.2 * (f - T.sp), top: 878, fontSize: 104, letterSpacing: '-0.02em', color: 'rgba(217,119,87,0.15)', filter: 'blur(5px)' }}>{GHOST_BOTTOM}</div>
        {/* Claude's mark, the engine of the rewrite */}
        <div style={{ position: 'absolute', left: AX - 110, top: 300 - 110, width: 220, height: 220, borderRadius: '50%', background: `radial-gradient(circle, rgba(217,119,87,${0.45 + 0.4 * flare}) 0%, rgba(217,119,87,0) 65%)`, filter: 'blur(10px)' }} />
        <div style={{ position: 'absolute', left: AX - 50, top: 250, width: 100, height: 100, transform: `rotate(${45 * turns + 6 * creep(f, T.sp, 70)}deg) scale(${1 + 0.12 * flare})` }}>
          <Brand name="claude" size={100} />
        </div>
        <HBlur id={`sp-blur-${f}`} px={blur}>
          {/* the conveyor in perspective: drafts queue in from the distance, rewritten lines sweep past the camera */}
          <AbsoluteFill style={{ transformOrigin: `${AX}px ${AY}px`, transform: `perspective(1500px) rotateY(${mix(at(f, T.sp, T.page - T.sp, ease.inOut), 26, 18)}deg)` }}>
          {ITEMS.map((it, k) => {
            const x = AX + C[k] - cu;
            if (x < -2600 || x > 4200) return null;
            // the carried sentence arrives whole and already cooled (it is the same line, cut to a new size and colour)
            const rw = k === 0 ? T.sp - 30 : T.rw[k - 1];
            const arrive = k === 0 ? T.sp : ARRIVE[k - 1];
            const rewritten = f >= rw;
            const strike = at(f, arrive, rw - arrive, ease.out);
            const size = k === 0 ? SP0_FS : SP_FS;
            const labelY = AY + (it.lines.length * size * 1.06) / 2 + 46;
            return (
              <React.Fragment key={k}>
                <div style={{ position: 'absolute', left: x, top: AY, transform: 'translate(-50%, -50%)' }}>
                  {rewritten ? (
                    <Strong it={it} size={size} born={rw} />
                  ) : (
                    <div style={{ width: DRAFT_W, fontFamily: fonts.inter, fontSize: DRAFT_FS, lineHeight: 1.28, color: '#9A9085', textAlign: 'center' }}>
                      <span style={{ backgroundImage: `linear-gradient(${CLAUDE}, ${CLAUDE})`, backgroundRepeat: 'no-repeat', backgroundSize: `${strike * 100}% 6px`, backgroundPosition: '0 58%', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}>{it.draft}</span>
                    </div>
                  )}
                </div>
                <div style={{ ...txt, left: x, top: labelY, transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 14, fontSize: 38, color: '#A39A8E' }}>
                  <Brand name={it.mark.name} file={it.mark.file} size={42} /> {it.doc}
                </div>
              </React.Fragment>
            );
          })}
          </AbsoluteFill>
        </HBlur>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 7. bookend: a new page, its title, the drop, the wordmark
const END_TITLE = ['Wherever', 'you', 'write.'];
const WM = 110; // the wordmark's size on the page (about 200 px on screen at the end zoom)
const DROP_H = 96;
const DROP_W = DROP_H * 0.8;
const dropPath = 'M50 4 C 64 34, 92 56, 92 82 A 42 42 0 0 1 8 82 C 8 56, 36 34, 50 4 Z';
const Bookend: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const titleStyle: React.CSSProperties = { ...voice, fontSize: TITLE_SIZE, lineHeight: 1 };
  const ww = END_TITLE.map((w) => useTextWidth(w, titleStyle)); // a fixed list: the hooks keep their order
  const gap = 0.26 * TITLE_SIZE;
  const wTitle = ww.reduce((a, b) => a + b, 0) + gap * (END_TITLE.length - 1);
  const wInk = useTextWidth('Inkwell', { ...mark, fontSize: WM, lineHeight: 1 });
  const DGAP = 0.2 * WM; // between the drop and the name
  // the sheet slides up over the ink and lands on the beat
  const slide = at(f, T.page, 6, ease.out);
  const sy = mix(slide, 1160, 0);
  // the drop falls into the title's head: a slot opens, the line steps right, the drop lands with a squash
  const slotOpen = at(f, T.drip, 5, ease.out);
  const fall = at(f, T.drip - 1, 6, ease.in);
  // squash on landing, a small stretch on the rebound, settled
  const sq = f >= T.drip + 5 ? 0.24 * (1 - springAt(f, fps, T.drip + 5, springs.pop)) : 0;
  // the turnover: the title's words rise out of their line, then the name rises in beside the drop
  const out = at(f, T.turn + 4, 3, ease.inOut); // the emptied line closes up
  const open = f >= T.turn + 5 ? 1 : 0;
  const inn = at(f, T.turn + 5, 8, ease.out);
  const dot = springAt(f, fps, T.turn + 10, springs.pop);
  const slotW = slotOpen * (DROP_W + DGAP);
  // the camera: the opening's framing, creeping in while the title is written, then it goes to the mark
  const groupW = DROP_W + DGAP + wInk;
  const gx = PADL + groupW / 2;
  const cam = camOf(
    [
      { f: T.page, x: 866, y: 266, z: 1.56 },
      { f: T.turn, x: 880, y: 262, z: 1.66, curve: ease.out },
      { f: T.turn + 12, x: gx, y: TITLE_Y + 58, z: 1.82, curve: ease.inOut },
      { f: T.end, x: gx + 3, y: TITLE_Y + 57, z: 1.87, curve: ease.out },
    ],
    f,
  );
  const header = 1 - at(f, T.turn, 6, ease.out);
  return (
    <AbsoluteFill style={{ transform: `translateY(${sy}px)` }}>
      <AbsoluteFill style={{ boxShadow: '0 -30px 70px rgba(0,0,0,0.55)', overflow: 'hidden' }}>
        <Paper color={CREAM} fibre={0.04} />
        <AbsoluteFill style={{ background: 'radial-gradient(ellipse 60% 55% at 45% 48%, rgba(255,252,246,0.7), rgba(255,252,246,0) 70%)' }} />
        <div style={worldStyle(cam, 0.94)}>
          <div style={{ position: 'absolute', left: 330, top: 120, width: 1420, height: 1500, borderRadius: 30, background: '#EDE5DA', transform: 'rotate(-2deg)', boxShadow: '0 30px 70px -30px rgba(110,60,30,0.3)', filter: 'blur(1.5px)' }} />
        </div>
        <div style={worldStyle(cam)}>
          {/* the page, lit from the top left, wide enough that its side never shows */}
          <div style={{ position: 'absolute', left: -600, top: 60, width: 2600, height: 1500, borderRadius: 30, background: 'linear-gradient(165deg, #FFFEFB 25%, #F7F0E6 75%)', boxShadow: 'inset 0 1.5px 0 #FFFFFF, 0 30px 70px -30px rgba(110,60,30,0.35)' }} />
          <div style={{ position: 'absolute', left: PADL, top: 92, fontFamily: fonts.inter, fontSize: 22, color: ui.muted, display: 'flex', gap: 12, alignItems: 'center', height: 30, whiteSpace: 'nowrap', opacity: header }}>
            <Icon name="FilePen" size={26} color={ui.muted} /> Untitled · Draft
          </div>
          {/* one line, so the title, the drop and the name share a baseline */}
          <div style={{ position: 'absolute', left: PADL, top: TITLE_Y, whiteSpace: 'nowrap', lineHeight: 1 }}>
            <span style={{ display: 'inline-block', width: slotW, height: 1, position: 'relative', verticalAlign: 'baseline' }}>
              <svg
                width={DROP_W}
                height={DROP_H}
                viewBox="0 0 100 125"
                style={{ position: 'absolute', left: 0, bottom: -0.1 * DROP_H, overflow: 'visible', transformOrigin: '50% 100%', transform: `translateY(${-mix(fall, 760, 0)}px) scale(${1 + sq}, ${1 - sq})`, opacity: f >= T.drip - 1 ? 1 : 0 }}
              >
                <path d={dropPath} fill={INK} />
                <circle cx="36" cy="80" r={9 * dot} fill={CLAUDE} />
              </svg>
            </span>
            <span style={{ display: 'inline-block', width: mix(out, wTitle, 0), clipPath: 'inset(-5% -2% -30% -2%)', verticalAlign: 'baseline' }}>
              {END_TITLE.map((w, i) => {
                const t = T.title[i];
                const leave = at(f, T.turn + i * 0.7, 4, ease.in);
                return (
                  <span
                    key={w}
                    style={{
                      ...titleStyle,
                      display: 'inline-block',
                      marginRight: i < END_TITLE.length - 1 ? gap : 0,
                      opacity: f >= t ? 1 - leave : 0,
                      color: mixColor(CLAUDE, i === 2 ? CORAL_DEEP : INK, at(f, t, 12, ease.inOut)),
                      transform: `translateY(${mix(at(f, t, 6, ease.out), 18, 0) - leave * 1.1 * TITLE_SIZE}px)`,
                    }}
                  >
                    {w}
                  </span>
                );
              })}
            </span>
            <span style={{ display: 'inline-block', width: open * (wInk + 8), clipPath: 'inset(-40% -4% 0 -4%)', verticalAlign: 'baseline' }}>
              <span style={{ ...mark, fontSize: WM, display: 'inline-block', transform: `translateY(${mix(inn, 0.9, 0) * WM}px)` }}>Inkwell</span>
            </span>
          </div>
          {/* the caret: on the fresh page as it lands, then riding the title as it is written */}
          {f < T.drip && (
            <div
              style={{
                position: 'absolute',
                left: PADL + slotW + (() => {
                  const n = T.title.filter((t) => f >= t).length;
                  return n === 0 ? 0 : ww.slice(0, n).reduce((a, b) => a + b, 0) + gap * (n - 1) + 10;
                })(),
                top: TITLE_Y + 0.08 * TITLE_SIZE,
                width: 6,
                height: 0.84 * TITLE_SIZE,
                borderRadius: 3,
                background: CLAUDE,
                opacity: f >= T.title[2] + 2 && Math.floor((f - T.title[2]) / 4) % 2 ? 0.15 : 1,
              }}
            />
          )}
          {/* the one CTA line, under the mark */}
          <div style={{ position: 'absolute', left: gx, top: TITLE_Y + WM * 1.18, transform: `translateX(-50%) translateY(${mix(at(f, T.turn + 12, 8, ease.out), 10, 0)}px)`, fontFamily: fonts.inter, fontSize: 36, color: '#6B645B', whiteSpace: 'nowrap', opacity: f >= T.turn + 12 ? 1 : 0 }}>
            inkwell.app
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const InkwellFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    ...[0, 1, 3].map((i) => ({ at: T.words[i], ...s['mixkit-2533'], volume: i === 3 ? 0.5 : 0.32 })),
    { at: T.words[2] - 1, ...s['mixkit-3000'], volume: 0.45 },
    { at: T.select, ...s['mixkit-3124'], volume: 0.3 },
    { at: T.land, ...s['mixkit-3000'], volume: 0.3, rate: 1.1 },
    { at: T.type, ...s['mixkit-2533'], volume: 0.22 },
    { at: T.type + 3, ...s['mixkit-2533'], volume: 0.26, rate: 0.9 },
    { at: T.rewrite, ...s['mixkit-2867'], volume: 0.45 },
    ...T.n.map((n, k) => ({ at: n, ...s['mixkit-2533'], volume: 0.3 + 0.12 * k, rate: 0.95 - 0.05 * k })),
    { at: T.rest, ...s['mixkit-2568'], volume: 0.25 },
    { at: T.lift + 4, ...s['mixkit-175'], volume: 0.35 },
    // the swap: the main hit, then a tick on every cut
    { at: T.hA, ...s['mixkit-2299'], volume: 0.55 },
    ...T.hosts.map((h, k) => ({ at: h, ...s['mixkit-2568'], volume: 0.24 + 0.02 * k, rate: k % 2 ? 1.06 : 0.96 })),
    { at: T.hosts[5] + 7, ...s['mixkit-3124'], volume: 0.3 },
    // the colour-flip cut into the ink, then each draft struck and rewritten
    { at: T.sp, ...s['mixkit-2299'], volume: 0.42, rate: 1.08 },
    ...T.whips.map((w) => ({ at: w + 2, ...s['mixkit-168'], volume: 0.18, maxS: 0.5 })),
    ...T.rw.map((r, k) => ({ at: r - 3 + (k === 3 ? 1 : 0), ...s['mixkit-2384'], volume: 0.26 })),
    ...T.rw.map((r, k) => ({ at: r, ...s['mixkit-2533'], volume: 0.42, rate: 0.92 + 0.04 * k })),
    // the bookend: the sheet, the title, the drop, the name
    { at: T.page + 4, ...s['mixkit-175'], volume: 0.32 },
    { at: T.page + 6, ...s['mixkit-2384'], volume: 0.3 },
    ...T.title.map((w, i) => ({ at: w, ...s['mixkit-2533'], volume: 0.3 + 0.08 * i })),
    { at: T.drip + 5, ...s['mixkit-3000'], volume: 0.55, rate: 0.85 },
    { at: T.turn + 2, ...s['mixkit-2299'], volume: 0.45 },
    { at: T.turn + 10, ...s['mixkit-3124'], volume: 0.22 },
  ];
  return (
    <AbsoluteFill>
      <Paper color={CREAM} fibre={0.04} />
      {f < T.hA && <Doc />}
      {f >= T.lift && f < T.hA && <Lift />}
      {f >= T.hA && f < T.sp && <SwapBeat />}
      {f >= T.sp && f < T.page + 8 && <Spectacle />}
      {f >= T.page && <Bookend />}
      <Grain amount={0.025} />
      {/* main hit T.hA at 112, unchanged: startFrom stays 5.57 */}
      <Music src="music/coffee-or-tea.mp3" startFrom={5.57} volume={1} breaths={[T.rewrite, T.hA]} breathLen={6} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const inkwellDuration = T.end;
