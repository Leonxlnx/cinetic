// "Inkwell": the look pass (round 4). 9.0 s (271 f) at 30 fps. An invented writing app with Claude inside every document.
// World: editorial paper. A warm-white paper ground (a writing product may keep paper), one serif voice (Newsreader) for
// every statement, the document's own text and the wordmark; Inter only inside other products' UI and the prompt pill.
// One accent from the product's object: a royal blue ink, wet when a word is new and drying to black. Grounds: paper
// (base), the hosts' own white surfaces, a deep ink navy with one broad bloom of its own hue (inverse). Claude's mark is
// the partner's official mark in its own colour. No grain, no fibre, no vignette, no blurred or ghosted text anywhere.
//
// Concept: one artefact, because the brief's promise is one sentence made better and then carried wherever you write;
// rejected: one task start to finish (the worked films' concept), before and after (no second state worth a split)
// Devices (the claim: Claude writes better, in whatever you write in)
// - signature: wet ink: every new word is born in the ink's blue and dries to black; the claim's full stop becomes the
//   drop that dots the wordmark's i
// - opening: type on the product's own paper, the claim written as the document's title, already moving on frame 0
// - text arrivals: cut-on words; a swap in place (the weak line struck, the strong line cut on where it stood)
// - type treatment: type set on the product's paper, drying from wet blue to ink
// - seams: 1-2 Claude's mark flies from the title's word gap into the prompt pill while the camera travels down |
//   2-3 scale jump into macro on "34 %" | 3-4 pull back to the whole sentence | 4-5 ground swap under the sentence, which
//   stays (ground cut 1) | 5-6 colour-flip cut with a size step into the navy (ground cut 2) | 6-7 push, a new sheet
//   slides up over the navy (ground cut 3)
// - output-big: "Revenue grew 34 %." in macro, 130-140 px, the camera riding along it
// - integrations: object-lock swap with three hosts, each a real surface around the sentence at one scale (a Gmail
//   compose card, a full-bleed Notion page, a Google Slides slide); the sentence never moves and is the largest text
// - spectacle: accelerating rewrite montage on the navy, 2.3 s: four drafts from four documents, each alone and centred,
//   struck and swapped in place for its rewrite (rewrites a beat, a beat, a beat, a half-beat apart); each line cuts
//   on already moving (a short slide and settle) under a slow push; the source document's real mark and name under it
// - lockup: the claim "Write anywhere." on a fresh page; its full stop lifts, swells into the ink drop and dots the i of
//   the wordmark "inkwell" rising above it; the claim stays on as the lockup's line
// - budget: no flood, no relay, no wall, no mark gathered from the many; glow and grain nowhere
//
// BEATS (frames, composition, what the viewer sees; how it hands off)
//  1   0-20  type-on-surface  the title "Write with ✳ Claude." written on the page; the camera follows the writing
//  2  20-52  full-ui          down into the body: the weak sentence highlighted, the prompt pill, Claude's mark lands in it
//  3  52-78  macro            output-big: the sentence struck and falling, "Revenue grew 34 %." at ~130 px
//  4  78-112 statement        pull back to the whole rewrite, centred; the second line is written and dries
//  5 112-155 surface          the object-lock swap through three hosts (HIT 112)                    (colour-flip cut)
//  6 155-225 giant-type       spectacle: drafts struck and rewritten in place, one at a time        (push: a new sheet)
//  7 225-271 statement        "Write anywhere."; its full stop becomes the drop on the wordmark's i
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { at, Brand, clamp, creep, Cues, ease, fonts, Ground, Icon, logScale, mix, mixColor, Music, softShadow, Spinner, springAt, springs, useTextWidth } from '../../kit';
import { sfx } from '../../sfx';

// ---------------------------------------------------------------- world tokens
const PAPER = '#F8F6F1'; // the product's paper: a warm white, never cream-yellow
const INK = '#15171C'; // dry ink
const WET = '#3557E8'; // the ink while it is wet (a new word's first frames)
const ACCENT = '#1E3AB8'; // royal blue ink: the key word, the strike, the drop (8:1 on the paper)
const NAVY = '#0C1533'; // the inverse ground: a deep tone of the ink's own hue
const BLOOM = '#2B48B8';
const ON_NAVY = '#F4F2EC';
const ACCENT_LIGHT = '#A7B8FF'; // the accent as text on the navy (9:1)
const DRAFT_ON_NAVY = '#98A3C6';
const MUTED = '#6A6E78';
// one serif voice: every statement, the document's own text and the wordmark (Newsreader, optical sizing on)
const serif: React.CSSProperties = { fontFamily: fonts.serif, fontWeight: 440, letterSpacing: '-0.01em', color: INK };

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
  pull: 78, // the camera pulls back from the macro
  rest: [88, 90, 92, 94], // "Every region beat plan."
  hA: 112, // MAIN HIT: the page cuts to the first host under the sentence (a lift of the track)
  hosts: [112, 129, 141], // Gmail, Notion, Google Slides (a beat, then an eighth and a half)
  sp: 155, // colour-flip cut into the navy: the spectacle
  drafts: [166, 183, 201, 211], // draft k cuts on, alone
  rw: [172, 189, 206, 215], // ... is struck, and its rewrite cuts on in place (beats, then a half-beat)
  page: 225, // a new sheet slides up over the navy
  claim: [231, 234], // "Write" "anywhere." (end type from here: 40 f, 14.8 %)
  lift: 242, // the full stop lifts and becomes the drop
  mark: 248, // the wordmark rises; the drop lands on its i at 251
  end: 271,
} as const;

// ---------------------------------------------------------------- 1-4. the document, under a 2D camera
type Key = { f: number; x: number; y: number; z: number; curve?: (t: number) => number };
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
const worldStyle = (c: { x: number; y: number; z: number }): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  top: 0,
  width: 1920,
  height: 1080,
  transformOrigin: '0 0',
  transform: `translate(${960 - c.x * c.z}px, ${540 - c.y * c.z}px) scale(${c.z})`,
});

// the page, in world px
const TITLE_SIZE = 84; // 134 px on screen at the opening zoom
const TITLE_Y = 300; // the title's centre
const COL_L = 640; // the body column
const COL_W = 640;
const BODY_Y = 680; // the body's first line (30 px, line height 44)
const BODY_FS = 30;
const BODY_LH = 44;
const PILL_Y = BODY_Y + 2 * BODY_LH + 40;
const Z_LOCK = 2.5; // the sentence at 75 px on screen: the size it keeps through every host
const body: React.CSSProperties = { ...serif, fontSize: BODY_FS, lineHeight: `${BODY_LH}px` };
const strong: React.CSSProperties = { ...body, fontWeight: 520 };

const OLD = 'Our quarterly results were generally quite positive in most of the areas we looked at.';
const OLD_W = OLD.split(' ');
const NEW_LINES = [['Revenue', 'grew', '34 %.'], ['Every', 'region', 'beat', 'plan.']];
const NEW_T = [[T.n[0], T.n[1], T.n[2]], [...T.rest]];
const PROMPT = 'Sharper, with the numbers';

/** A word whose trailing punctuation is always dry ink: wet ink colours letters, never a full stop. */
const dryPunct = (w: string, dryColor = INK) => {
  const m = w.match(/^(.*?)([.,:?]+)$/);
  return m ? (
    <>
      {m[1]}
      <span style={{ color: dryColor }}>{m[2]}</span>
    </>
  ) : (
    w
  );
};

/** The rewrite as the document holds it: two lines, "34 %" in the ink's blue (its full stop stays ink). */
const Sentence: React.FC<{ f: number; dry?: boolean; keyColor?: string }> = ({ f, dry, keyColor = ACCENT }) => (
  <div style={{ whiteSpace: 'nowrap' }}>
    {NEW_LINES.map((line, li) => (
      <div key={li} style={{ ...strong, height: BODY_LH }}>
        {line.map((w, wi) => {
          const t = NEW_T[li][wi];
          const shown = dry || f >= t;
          const col = dry ? INK : mixColor(WET, INK, at(f, t + 2, 12, ease.inOut));
          const isKey = w === '34 %.';
          return (
            <span key={wi} style={{ display: 'inline-block', marginRight: wi < line.length - 1 ? '0.25em' : 0, opacity: shown ? 1 : 0, color: col, transform: dry ? undefined : `translateY(${mix(at(f, t, 5, ease.out), 6, 0)}px)` }}>
              {isKey ? (
                <>
                  <span style={{ color: dry ? keyColor : mixColor(WET, keyColor, at(f, t + 2, 12, ease.inOut)) }}>34 %</span>.
                </>
              ) : (
                dryPunct(w)
              )}
            </span>
          );
        })}
      </div>
    ))}
  </div>
);

/** The document's camera, from the measured title and sentence. */
const useDocCam = () => {
  const titleStyle: React.CSSProperties = { ...serif, fontSize: TITLE_SIZE, lineHeight: 1 };
  const wWrite = useTextWidth('Write', titleStyle);
  const wWith = useTextWidth('with', titleStyle);
  const wClaude = useTextWidth('Claude.', titleStyle);
  const w1 = useTextWidth(NEW_LINES[0].join(' '), strong);
  const w2 = useTextWidth(NEW_LINES[1].join(' '), strong);
  const gap = 0.26 * TITLE_SIZE;
  const SLOT = Math.round(TITLE_SIZE * 1.1);
  const titleW = wWrite + wWith + SLOT + wClaude + 3 * gap;
  const titleL = 960 - titleW / 2;
  const blockW = Math.max(w1, w2);
  const lock = { x: COL_L + blockW / 2, y: BODY_Y + BODY_LH, z: Z_LOCK };
  const keys: Key[] = [
    { f: 0, x: titleL + wWrite * 0.5 + 230, y: TITLE_Y + 6, z: 1.6 }, // the camera follows the writing to the centre
    { f: T.words[3] + 4, x: 960, y: TITLE_Y, z: 1.62, curve: ease.out },
    { f: T.push, x: 960, y: TITLE_Y + 2, z: 1.64 },
    { f: T.land, x: 960, y: BODY_Y + 92, z: 2.4, curve: ease.inOut }, // down past the title into the body: the draft at 72 px, the pill's text at 48
    { f: T.rewrite + 5, x: 958, y: BODY_Y + 86, z: 2.5, curve: ease.out }, // holds while the weak sentence falls
    { f: T.n[2] - 1, x: COL_L + w1 / 2, y: BODY_Y + BODY_LH / 2, z: 4.3, curve: ease.inOut }, // macro on the rewrite
    { f: T.pull, x: COL_L + w1 / 2 + 16, y: BODY_Y + BODY_LH / 2, z: 4.75, curve: ease.out }, // a ride along "34 %"
    { f: T.rest[0] + 2, x: lock.x, y: lock.y, z: 3.0, curve: ease.inOut }, // pull back: the whole sentence
    { f: T.hA, x: lock.x, y: lock.y, z: Z_LOCK, curve: ease.inOut }, // settles exactly on the lock point
  ];
  return { keys, titleL, wWrite, wWith, gap, SLOT, blockW, lock };
};

const Doc: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { keys, titleL, wWrite, wWith, gap, SLOT } = useDocCam();
  const cam = camOf(keys, f);
  const titleStyle: React.CSSProperties = { ...serif, fontSize: TITLE_SIZE, lineHeight: 1 };
  const promptW = useTextWidth(PROMPT, { fontFamily: fonts.inter, fontSize: 20 });
  // Claude's mark pops into the title's slot, then flies down into the prompt pill as the camera travels
  const pop = springAt(f, fps, T.words[2] - 2, springs.pop);
  const fly = at(f, T.push + 2, T.land - T.push - 2, ease.inOut);
  const markFrom = { x: titleL + wWrite + gap + wWith + gap + SLOT / 2, y: TITLE_Y, s: Math.round(TITLE_SIZE * 0.86) };
  const markTo = { x: COL_L + 22 + 15, y: PILL_Y + 12 + 15, s: 30 };
  const markS = logScale(markFrom.s, markTo.s, fly) * mix(pop, 0.2, 1);
  const pill = springAt(f, fps, T.ask, springs.card);
  const pillOut = at(f, T.rewrite + 2, 7, ease.in);
  const shown = f >= T.type + 3 ? PROMPT : f >= T.type ? 'Sharper,' : '';
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div style={worldStyle(cam)}>
        {/* the title is the claim, written on the page; each word wet, then dry */}
        <div style={{ position: 'absolute', left: titleL, top: TITLE_Y - TITLE_SIZE / 2, display: 'flex', gap, whiteSpace: 'nowrap', height: TITLE_SIZE, alignItems: 'center' }}>
          {['Write', 'with', null, 'Claude.'].map((w, i) =>
            w === null ? (
              <div key={i} style={{ width: SLOT }} />
            ) : (
              <span key={i} style={{ ...titleStyle, display: 'inline-block', opacity: f >= T.words[i] ? 1 : 0, color: mixColor(WET, INK, at(f, T.words[i] + 2, 12, ease.inOut)), transform: `translateY(${mix(at(f, T.words[i], 6, ease.out), 10, 0)}px)` }}>
                {dryPunct(w)}
              </span>
            ),
          )}
        </div>
        {/* the weak sentence: one highlight, one stroke, then it falls away */}
        <div style={{ position: 'absolute', left: COL_L, top: BODY_Y, width: COL_W, ...body, color: '#3A3D45' }}>
          {OLD_W.map((w, i) => {
            const hl = at(f, T.select + i * 0.4, 3, ease.out);
            const strike = at(f, T.rewrite + i * 0.2, 3, ease.out);
            const fall = at(f, T.rewrite + 3 + i * 0.15, 5, ease.in);
            const gone = clamp((f - (T.rewrite + 3 + i * 0.15)) / 4);
            if (fall >= 1) return null;
            return (
              <React.Fragment key={i}>
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block',
                    paddingRight: i < OLD_W.length - 1 ? '0.25em' : 0,
                    backgroundImage: `linear-gradient(rgba(53,87,232,0.16), rgba(53,87,232,0.16))`,
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: `${hl * (1 - strike) * 100}% 78%`,
                    backgroundPosition: '0 60%',
                    opacity: 1 - gone,
                    transform: `translateY(${fall * 50}px) rotate(${fall * (i % 2 ? 5 : -4)}deg)`,
                    color: strike > 0 ? '#9A9CA3' : undefined,
                  }}
                >
                  {w}
                  <span style={{ position: 'absolute', left: -1, top: 23, height: 2.5, width: `calc(${strike * 100}% + 2px)`, background: ACCENT, borderRadius: 2, opacity: strike > 0 ? 1 : 0 }} />
                </span>
                {'​'}
              </React.Fragment>
            );
          })}
        </div>
        {/* the rewrite, cut on word by word where the weak sentence stood */}
        <div style={{ position: 'absolute', left: COL_L, top: BODY_Y }}>
          <Sentence f={f} />
        </div>
        {/* the prompt pill, under the sentence */}
        {f >= T.ask && pillOut < 1 && (
          <div style={{ position: 'absolute', left: COL_L, top: PILL_Y, transformOrigin: 'left center', transform: `translateY(${mix(pill, 20, 0) + pillOut * 24}px) scale(${mix(pill, 0.9, 1)})`, opacity: clamp(pill * 2) * (1 - pillOut) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderRadius: 999, padding: '12px 22px', background: '#FFFFFF', boxShadow: `inset 0 0 0 1px rgba(21,23,28,0.08), ${softShadow(2, PAPER)}` }}>
              <div style={{ width: 30, height: 30, opacity: f >= T.land ? 1 : 0 }}>
                <Brand name="claude" size={30} />
              </div>
              <span style={{ fontFamily: fonts.inter, fontSize: 20, color: INK, width: promptW + 4, whiteSpace: 'nowrap', lineHeight: '30px' }}>
                {shown}
                {f < T.think && <span style={{ display: 'inline-block', width: 2, height: 22, marginLeft: 2, verticalAlign: -4, background: ACCENT, opacity: Math.floor(f / 6) % 2 ? 0.2 : 1 }} />}
              </span>
              <div style={{ width: 24, height: 24 }}>{f >= T.think && <Spinner start={T.think} doneAt={T.rewrite} size={24} color="#C3C6CE" done={ACCENT} stroke={2.6} />}</div>
            </div>
          </div>
        )}
        {/* Claude's mark: in the title, then carried into the pill */}
        {f >= T.words[2] - 2 && f < T.land && (
          <div style={{ position: 'absolute', left: mix(fly, markFrom.x, markTo.x), top: mix(fly, markFrom.y, markTo.y) - 50 * Math.sin(Math.PI * fly), width: 0, height: 0, opacity: clamp(pop * 3) }}>
            <div style={{ position: 'absolute', left: -markS / 2, top: -markS / 2, transform: `rotate(${mix(pop, -40, 0) + 180 * fly}deg)` }}>
              <Brand name="claude" size={markS} />
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. the object-lock swap: the sentence fixed, three hosts cut round it
/** The sentence at its locked place and size: exactly where the document's camera left it on frame T.hA. */
const LockedSentence: React.FC = () => {
  const { blockW } = useDocCam();
  return (
    <div style={{ position: 'absolute', left: 960 - (blockW * Z_LOCK) / 2, top: 540 - BODY_LH * Z_LOCK, transformOrigin: '0 0', transform: `scale(${Z_LOCK})`, zIndex: 10 }}>
      <Sentence f={T.end} dry />
    </div>
  );
};
const useLockBox = () => {
  const { blockW } = useDocCam();
  const w = blockW * Z_LOCK;
  const h = 2 * BODY_LH * Z_LOCK;
  return { l: 960 - w / 2, r: 960 + w / 2, t: 540 - h / 2, b: 540 + h / 2, w, h };
};
const ui: React.CSSProperties = { position: 'absolute', fontFamily: fonts.inter, color: '#1F1F1F', whiteSpace: 'nowrap' };

/** Host 1, Gmail: one compose card on Gmail's cool canvas; the sentence is the message body. */
const HostMail: React.FC<{ t: number }> = () => {
  const box = useLockBox();
  // the card at 70 % of the width, its chrome at 40 px: a compose window you can read
  const L = 960 - 672;
  const R = 960 + 672;
  const top = box.t - 250;
  const bottom = box.b + 170;
  const canvas = '#F3F6FB';
  return (
    <AbsoluteFill>
      <Ground color={canvas} light={{ x: 0.42, y: 0.4, size: 0.9 }} />
      <div style={{ position: 'absolute', left: L, top, width: R - L, height: bottom - top, borderRadius: 28, background: '#FFFFFF', boxShadow: softShadow(5, canvas), overflow: 'hidden' }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 104, background: '#F2F6FC' }} />
        <div style={{ ...ui, left: 44, top: 26, display: 'flex', alignItems: 'center', gap: 20, fontSize: 40, fontWeight: 500 }}>
          <Brand name="gmail" size={52} /> New message
        </div>
        <div style={{ position: 'absolute', right: 44, top: 32, display: 'flex', gap: 34 }}>
          {['Minus', 'Maximize2', 'X'].map((n) => (
            <Icon key={n} name={n} size={40} color="#444746" stroke={2.2} />
          ))}
        </div>
        <div style={{ ...ui, left: 80, top: 132, fontSize: 40, display: 'flex', alignItems: 'center', gap: 22 }}>
          <span style={{ color: '#5E5E5E' }}>To</span>
          <span style={{ background: '#E9EEF6', borderRadius: 999, padding: '4px 24px' }}>board@northwind.co</span>
        </div>
        <div style={{ position: 'absolute', left: 80, right: 0, top: 206, height: 1.5, background: '#E3E3E3' }} />
        <div style={{ ...ui, left: 80, bottom: 40, display: 'flex', alignItems: 'center', gap: 38 }}>
          <span style={{ background: '#0B57D0', color: '#FFFFFF', fontSize: 38, fontWeight: 500, borderRadius: 999, padding: '12px 44px' }}>Send</span>
          {['Paperclip', 'Link', 'Image'].map((n) => (
            <Icon key={n} name={n} size={40} color="#444746" stroke={2.2} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};

/** Host 2, Notion: the page full-bleed, in its serif style; the sentence is a block with its handle. */
const HostNotion: React.FC<{ t: number }> = () => {
  const box = useLockBox();
  return (
    <AbsoluteFill>
      <Ground color="#FFFFFF" light={false} />
      <div style={{ ...ui, left: 160, top: 120, display: 'flex', alignItems: 'center', gap: 20, fontSize: 42, color: '#787774' }}>
        <Brand name="notion" size={56} color="#191919" /> Board <span style={{ color: '#C7C6C3' }}>/</span> Q3 summary
      </div>
      <div style={{ ...ui, right: 160, top: 124, fontSize: 42, color: '#37352F', display: 'flex', alignItems: 'center', gap: 30 }}>
        Share <Icon name="Star" size={42} color="#91918E" stroke={2} />
      </div>
      {/* the page's own title above the block: the page reads as a Notion page, not a white void */}
      <div style={{ ...ui, left: box.l, top: box.t - 150, fontSize: 62, fontWeight: 700, color: '#37352F', letterSpacing: '-0.02em' }}>Q3 summary</div>
      <div style={{ position: 'absolute', left: box.l - 110, top: box.t + 22, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="Plus" size={40} color="#A5A4A0" stroke={2} />
        <Icon name="GripVertical" size={40} color="#A5A4A0" stroke={2} />
      </div>
    </AbsoluteFill>
  );
};

/** Host 3, Google Slides: the slide as one card on the editor's grey, its filmstrip reduced to quiet shapes. */
const HostSlides: React.FC<{ t: number }> = () => {
  const canvas = '#EEF0F3';
  const sw = 1120;
  const sh = 630;
  const sl = 960 - sw / 2;
  const st = 540 - sh / 2 + 40;
  return (
    <AbsoluteFill>
      <Ground color={canvas} light={{ x: 0.55, y: 0.5, size: 0.9 }} />
      {/* the filmstrip's wireframe thumbnails are gone: the slide alone under the deck's name at 44 px */}
      <div style={{ ...ui, left: sl, top: st - 96, display: 'flex', alignItems: 'center', gap: 20, fontSize: 44 }}>
        <Brand name="googleslides" size={56} /> Q3 board deck
      </div>
      <div style={{ position: 'absolute', left: sl, top: st, width: sw, height: sh, borderRadius: 10, background: '#FFFFFF', boxShadow: softShadow(4, canvas) }} />
    </AbsoluteFill>
  );
};

const HOSTS: Array<React.FC<{ t: number }>> = [HostMail, HostNotion, HostSlides];

const SwapBeat: React.FC = () => {
  const f = useCurrentFrame();
  let i = 0;
  while (i < T.hosts.length - 1 && f >= T.hosts[i + 1]) i++;
  const start = T.hosts[i];
  const end = i < T.hosts.length - 1 ? T.hosts[i + 1] : T.sp;
  const H = HOSTS[i];
  // each host settles in from 1.03 over its own frames (the second plane); the sentence holds still on top
  const push = mix(ease.out(clamp((f - start) / (end - start))), 1.03, 1);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `scale(${push})` }}>
        <H t={f - start} />
      </AbsoluteFill>
      <LockedSentence />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 6. spectacle: drafts from four documents, rewritten in place
const SP0_FS = 112; // the carried sentence, two lines
const DRAFT_FS = 112; // a draft, 3 words
const SP_FS = 132; // a rewrite, 3-4 words
type Item = { mark: { name: string; file?: string }; doc: string; draft: string; line: string; key: string };
const ITEMS: Item[] = [
  { mark: { name: 'gmail' }, doc: 'Launch update', draft: 'Sometime in May?', line: 'Ship date: May 12.', key: 'May 12' },
  { mark: { name: 'notion' }, doc: 'Hiring plan', draft: 'A few roles, maybe', line: 'Two senior hires.', key: 'Two' },
  { mark: { name: 'googledocs', file: 'logos/google-docs.svg' }, doc: 'Pricing review', draft: 'Around twelve-ish', line: 'Plans start at $12.', key: '$12' },
  { mark: { name: 'obsidian' }, doc: 'support-notes.md', draft: 'Fairly quickly', line: 'Replies within 2 hours.', key: '2 hours' },
];

/** A line with one key phrase in the light accent; every other letter born light blue and drying to the paper colour. */
const Line: React.FC<{ text: string; keyText?: string; born: number; size: number; color?: string; wet?: boolean }> = ({ text, keyText, born, size, color = ON_NAVY, wet = true }) => {
  const f = useCurrentFrame();
  const k = keyText ? text.indexOf(keyText) : -1;
  const base = wet ? mixColor(ACCENT_LIGHT, color, at(f, born + 2, 12, ease.inOut)) : color;
  const st: React.CSSProperties = { ...serif, fontSize: size, lineHeight: 1.1, letterSpacing: '-0.015em', fontWeight: 460, color: base, whiteSpace: 'nowrap' };
  const tail = text.match(/[.?]$/) ? text.slice(-1) : '';
  const head = tail ? text.slice(0, -1) : text;
  const dot = tail ? <span style={{ color }}>{tail}</span> : null;
  if (k < 0)
    return (
      <span style={st}>
        {head}
        {dot}
      </span>
    );
  return (
    <span style={st}>
      {head.slice(0, k)}
      <span style={{ color: ACCENT_LIGHT }}>{keyText}</span>
      {head.slice(k + keyText!.length)}
      {dot}
    </span>
  );
};

const Spectacle: React.FC = () => {
  const f = useCurrentFrame();
  // which item is on: -1 the carried sentence, then each draft from its cut
  let k = -1;
  T.drafts.forEach((d, i) => {
    if (f >= d) k = i;
  });
  const it = k >= 0 ? ITEMS[k] : null;
  const rewritten = k >= 0 && f >= T.rw[k];
  const cutAt = k < 0 ? T.sp : rewritten ? T.rw[k] : T.drafts[k];
  // every cut-on line settles from 1.035 (it arrives already moving); the whole beat pushes slowly in
  const arrive = at(f, cutAt, 8, ease.out);
  const settle = mix(arrive, 1.06, 1);
  const slideX = mix(arrive, 110, 0);
  const push = 1 + 0.1 * at(f, T.sp, T.page - T.sp + 6, ease.inOut);
  const strike = k >= 0 && !rewritten ? at(f, T.rw[k] - 5, 4, ease.out) : 0;
  const draftW = useTextWidth(it ? it.draft : '', { ...serif, fontSize: DRAFT_FS, fontWeight: 460, letterSpacing: '-0.015em' });
  // the bloom drifts a little (the second plane)
  const lx = 0.5 + 0.08 * Math.sin((f - T.sp) / 22);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Ground color={NAVY} tint={BLOOM} light={{ x: lx, y: 0.46, size: 0.95, amount: 0.17 }} />
      <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `translateX(${slideX}px) scale(${push * settle})` }}>
        {k < 0 && (
          <div style={{ position: 'absolute', left: 0, right: 0, top: 540 - SP0_FS * 1.1, textAlign: 'center' }}>
            <div>
              <Line text="Revenue grew 34 %." keyText="34 %" born={T.sp} size={SP0_FS} wet={false} />
            </div>
            <div>
              <Line text="Every region beat plan." born={T.sp} size={SP0_FS} wet={false} />
            </div>
          </div>
        )}
        {it && (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 530 - (rewritten ? SP_FS : DRAFT_FS) * 0.55, textAlign: 'center' }}>
              {rewritten ? (
                <Line text={it.line} keyText={it.key} born={T.rw[k]} size={SP_FS} />
              ) : (
                <span style={{ position: 'relative', display: 'inline-block' }}>
                  <Line text={it.draft} born={T.drafts[k]} size={DRAFT_FS} color={DRAFT_ON_NAVY} wet={false} />
                  <span style={{ position: 'absolute', left: -6, top: '56%', height: 7, width: (draftW + 12) * strike, background: ACCENT_LIGHT, borderRadius: 4 }} />
                </span>
              )}
            </div>
            {/* the document it came from, under the line */}
            <div style={{ position: 'absolute', left: 0, right: 0, top: 690, display: 'flex', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: fonts.inter, fontSize: 48, color: '#A9B2CF', whiteSpace: 'nowrap' }}>
                <Brand name={it.mark.name} file={it.mark.file} size={54} color={it.mark.name === 'notion' ? '#FFFFFF' : 'brand'} /> {it.doc}
              </div>
            </div>
          </>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 7. a fresh page: the claim, its full stop, the wordmark
const CLAIM_FS = 190;
const CLAIM_END_FS = 78;
const WM_FS = 220;
const claimStyle: React.CSSProperties = { ...serif, fontSize: CLAIM_FS, lineHeight: 1, letterSpacing: '-0.02em' };
const wmStyle: React.CSSProperties = { ...serif, fontSize: WM_FS, fontWeight: 460, lineHeight: 1, letterSpacing: '-0.02em' };
const dropPath = 'M50 2 C 63 30, 92 55, 92 82 A 42 42 0 0 1 8 82 C 8 55, 37 30, 50 2 Z';

const Bookend: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const wW = useTextWidth('Write', claimStyle);
  const wA = useTextWidth('anywhere', claimStyle);
  const wDot = useTextWidth('.', claimStyle);
  const wMark = useTextWidth('ınkwell', wmStyle);
  const wI = useTextWidth('ı', wmStyle);
  const gap = 0.24 * CLAIM_FS;
  // the sheet slides up over the navy
  const slide = at(f, T.page, 7, ease.out);
  const sy = mix(slide, 1100, 0);
  // the claim: "Write" alone and centred, then "anywhere." joins and the line re-centres
  const two = f >= T.claim[1];
  const lineW = two ? wW + gap + wA + wDot : wW;
  const prevW = wW;
  const rc = two ? at(f, T.claim[1], 6, ease.out) : 1;
  const curW = two ? mix(rc, prevW + gap + wA + wDot, lineW) : lineW; // the jump is the re-centre
  const left0 = 960 - (two ? mix(rc, prevW, lineW) : lineW) / 2;
  // the lockup: the claim shrinks under the mark; its full stop lifts into the drop
  const down = at(f, T.lift, 7, ease.inOut);
  const cScale = mix(down, 1, CLAIM_END_FS / CLAIM_FS);
  const cy = mix(down, 540, 690); // the claim line's centre
  const baseline = (y: number, s: number) => y + 0.33 * CLAIM_FS * s; // baseline of the claim at centre y, scale s
  const dotX0 = 960 + (lineW / 2 - wDot / 2); // the full stop's centre in the full line (before the shrink)
  const dotY0 = baseline(540, 1) - 0.06 * CLAIM_FS;
  // the wordmark rises above; the drop lands on its i
  const markY = 470; // the wordmark's centre
  const markL = 960 - wMark / 2;
  const rise = at(f, T.mark, 8, ease.out);
  const wmBase = markY + 0.3 * WM_FS;
  const xh = 0.47 * WM_FS;
  const DROP_W = 0.2 * WM_FS;
  const DROP_H = DROP_W * 1.25;
  const tit = { x: markL + wI / 2 + 0.01 * WM_FS, y: wmBase - xh - 0.2 * WM_FS - DROP_H / 2 };
  const fly = at(f, T.lift + 1, 8, ease.inOut);
  const dx = mix(fly, dotX0, tit.x);
  const dy = mix(fly, dotY0, tit.y) - 180 * Math.sin(Math.PI * fly);
  const grow = mix(fly, 0.13 * CLAIM_FS / DROP_W, 1);
  const landed = T.lift + 9;
  const sq = f >= landed ? 0.2 * (1 - springAt(f, fps, landed, springs.pop)) : 0;
  const dropOn = f >= T.lift + 1;
  // a slow creep on the whole page while it rests
  const cr = 1 + 0.015 * creep(f, T.claim[0], T.end - T.claim[0]);
  void curW;
  return (
    <AbsoluteFill style={{ transform: `translateY(${sy}px)` }}>
      <AbsoluteFill style={{ boxShadow: softShadow(7, NAVY) }}>
        <Ground color={PAPER} light={{ x: 0.5, y: 0.45, size: 0.9 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ transformOrigin: '960px 540px', transform: `scale(${cr})` }}>
        {/* the caret on the fresh page, then the claim */}
        {f < T.claim[0] && f >= T.page && (
          <div style={{ position: 'absolute', left: 956, top: 540 - 0.42 * CLAIM_FS, width: 7, height: 0.8 * CLAIM_FS, borderRadius: 3, background: ACCENT, opacity: Math.floor((f - T.page) / 4) % 2 ? 0.2 : 1 }} />
        )}
        {f >= T.claim[0] && (
          <div style={{ position: 'absolute', left: 960, top: cy, transformOrigin: '0 50%', transform: `scale(${cScale})` }}>
            <div style={{ position: 'absolute', left: left0 - 960, top: -CLAIM_FS / 2, display: 'flex', gap, whiteSpace: 'nowrap', height: CLAIM_FS, alignItems: 'center' }}>
              <span style={{ ...claimStyle, color: mixColor(WET, INK, at(f, T.claim[0] + 2, 12, ease.inOut)) }}>Write</span>
              {two && (
                <span style={{ ...claimStyle, color: mixColor(WET, INK, at(f, T.claim[1] + 2, 12, ease.inOut)) }}>
                  anywhere<span style={{ opacity: dropOn ? 0 : 1, color: INK }}>.</span>
                </span>
              )}
            </div>
          </div>
        )}
        {/* the wordmark: a dotless i, rising out of a mask */}
        {f >= T.mark && (
          <div style={{ position: 'absolute', left: markL, top: markY - WM_FS / 2 - 0.1 * WM_FS, height: WM_FS * 1.2, overflow: 'hidden' }}>
            <div style={{ ...wmStyle, height: WM_FS * 1.2, display: 'flex', alignItems: 'center', transform: `translateY(${mix(rise, 0.75, 0) * WM_FS}px)` }}>{'ınkwell'}</div>
          </div>
        )}
        {/* the drop: the claim's full stop, lifted, swelling and turning to the ink's blue */}
        {dropOn && (
          <svg
            width={DROP_W}
            height={DROP_H}
            viewBox="0 0 100 125"
            style={{ position: 'absolute', left: dx - DROP_W / 2, top: dy - DROP_H / 2, overflow: 'visible', transformOrigin: '50% 100%', transform: `scale(${grow * (1 + sq)}, ${grow * (1 - sq)})` }}
          >
            <path d={fly < 0.35 ? 'M50 40 A 42 42 0 1 1 49.9 40 Z' : dropPath} transform={fly < 0.35 ? 'translate(0 0)' : undefined} fill={mixColor(INK, ACCENT, at(f, T.lift + 1, 6, ease.inOut))} />
          </svg>
        )}
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
    ...T.rest.map((n, k) => ({ at: n, ...s['mixkit-2533'], volume: 0.18 + 0.03 * k, rate: 1.05 })),
    // the swap: the main hit, then a tick on each later cut
    { at: T.hA, ...s['mixkit-2299'], volume: 0.55 },
    ...T.hosts.slice(1).map((h, k) => ({ at: h, ...s['mixkit-2568'], volume: 0.28, rate: k % 2 ? 1.06 : 0.96 })),
    // the colour-flip cut into the navy, then each draft cut on, struck and rewritten
    { at: T.sp, ...s['mixkit-2299'], volume: 0.42, rate: 1.08 },
    ...T.drafts.map((d) => ({ at: d, ...s['mixkit-2568'], volume: 0.2 })),
    ...T.rw.map((r) => ({ at: r - 4, ...s['mixkit-2384'], volume: 0.24 })),
    ...T.rw.map((r, k) => ({ at: r, ...s['mixkit-2533'], volume: 0.42, rate: 0.92 + 0.04 * k })),
    // the bookend: the sheet, the claim, the drop, the name
    { at: T.page + 3, ...s['mixkit-175'], volume: 0.32 },
    ...T.claim.map((w, i) => ({ at: w, ...s['mixkit-2533'], volume: 0.34 + 0.08 * i })),
    { at: T.lift + 9, ...s['mixkit-3000'], volume: 0.55, rate: 0.85 },
    { at: T.mark, ...s['mixkit-2299'], volume: 0.4 },
  ];
  return (
    <AbsoluteFill>
      <Ground color={PAPER} light={{ x: 0.45 + 0.05 * Math.sin(f / 40), y: 0.42, size: 0.95 }} />
      {f < T.hA && <Doc />}
      {f >= T.hA && f < T.sp && <SwapBeat />}
      {f >= T.sp && f < T.page + 8 && <Spectacle />}
      {f >= T.page && <Bookend />}
      {/* main hit T.hA at 112, unchanged: startFrom stays 5.57 */}
      <Music src="music/coffee-or-tea.mp3" startFrom={5.57} volume={1} breaths={[T.rewrite, T.hA]} breathLen={6} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const inkwellDuration = T.end;
