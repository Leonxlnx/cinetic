// "Inkwell": iteration 7 of the v2 kit, rebuilt after critic 4. ~9.2 s at 30 fps. An invented writing app with Claude
// inside every document. World: flat cream paper (no mesh), a serif voice, Inter for the product, one accent from the
// partner's own mark (Claude's coral). Grounds: cream, a coral flood, ink.
// Frame 0 is the document: the claim "Write with Claude." is its title, being written; the camera pushes down past it into
// the body while Claude's mark flies out of the title into the prompt pill. The rewrite is seen in macro (the weak sentence
// struck and falling, "Revenue grew 34 %." landing at ~145 px), then the camera pulls back and the line lifts off the page
// as the plate. The plate stays pinned while three hosts cut around it (Gmail full-bleed on coral, a Notion page tilted on
// ink, a markdown file as giant mono on cream). The markdown page becomes the centre cell of a wall of documents: the camera
// pulls back while Claude's line lands in every document in a coral wave (the spectacle), and the wall drains into a big
// ink drop that settles into the lockup.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  at,
  Brand,
  clamp,
  creep,
  Cues,
  ease,
  Flood,
  fonts,
  Grain,
  Icon,
  lightUI,
  logScale,
  mix,
  mixColor,
  Music,
  Paper,
  Relay,
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
const serif: React.CSSProperties = { fontFamily: fonts.serif, fontWeight: 400, letterSpacing: '-0.02em', color: INK };
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
  flood: 98,
  hA: 112, // MAIN HIT: the first relay host lands on the coral flood
  hB: 134,
  hC: 154,
  wall: 176,
  ev: 186, // the coral wave: Claude's line lands in every doc
  drain: 226,
  lock: 240,
  end: 276,
} as const;

// the artefact's pinned point for the whole relay
const AX = 960;
const AY = 560;
const FS = 58;
const NEW = 'Revenue grew 34 %. Every region beat plan.';

/** The artefact: the rewritten sentence on a cream plate with Claude's mark. Same component in every host and the wall. */
const Line: React.FC<{ text?: string; lit?: number; size?: number; coral?: number }> = ({ text = NEW, lit = 1, size = FS, coral = 0 }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: size * 0.38,
      padding: `${size * 0.38}px ${size * 0.66}px ${size * 0.38}px ${size * 0.52}px`,
      borderRadius: size * 0.3,
      background: coral > 0 ? `rgb(${mix(coral, 255, 217)},${mix(coral, 251, 119)},${mix(coral, 246, 87)})` : `rgba(255,251,246,${lit})`,
      boxShadow: lit > 0 ? `inset 0 ${size * 0.03}px 0 rgba(255,255,255,${lit}), inset 0 0 0 ${size * 0.03}px rgba(217,119,87,${0.45 * lit}), 0 ${size * 0.3}px ${size * 0.7}px -${size * 0.28}px rgba(70,35,15,${0.5 * lit})` : undefined,
      whiteSpace: 'nowrap',
      fontFamily: fonts.inter,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: '-0.015em',
      color: coral > 0.5 ? '#FFFFFF' : lit > 0.5 ? INK : '#A49C91',
    }}
  >
    <div style={{ width: size * 0.86, height: size * 0.86, transform: `scale(${lit})`, display: 'flex' }}>
      <Brand name="claude" size={size * 0.86} color={coral > 0.5 ? '#FFFFFF' : 'brand'} />
    </div>
    <span>{text}</span>
  </div>
);

const pivot = (s: number, extra = ''): React.CSSProperties => ({ transformOrigin: `${AX}px ${AY}px`, transform: `${extra} scale(${s})` });
/** Each host arrives with a small settle, so the cut lands like a push. */
const settle = (f: number, start: number, amt = 0.05) => 1 + amt * (1 - at(f, start, 9, ease.out));

// ---------------------------------------------------------------- 1-2. the document: title, push to the body, the rewrite in macro
// A 2D camera over the page's world: the world point (x, y) sits at the frame's centre at zoom z (log-space between keys).
type Key = { f: number; x: number; y: number; z: number; curve?: (t: number) => number };
const PADL = 340; // the text's left edge on the page
const TITLE_Y = 150;
const TITLE_SIZE = 130;
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
  { f: T.flood - 4, x: 712, y: 578, z: 1.92, curve: ease.inOut }, // pull back: the whole line
  { f: T.hA, x: 716, y: 578, z: 1.97, curve: ease.inOut },
];
const camAt = (f: number) => {
  if (f <= CAM[0].f) return CAM[0];
  for (let i = 1; i < CAM.length; i++) {
    const a = CAM[i - 1];
    const b = CAM[i];
    if (f <= b.f) {
      const p = (b.curve ?? ease.inOut)(clamp((f - a.f) / (b.f - a.f)));
      return { f, x: mix(p, a.x, b.x), y: mix(p, a.y, b.y), z: logScale(a.z, b.z, p) };
    }
  }
  return CAM[CAM.length - 1];
};
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
  const titleStyle: React.CSSProperties = { ...serif, fontSize: TITLE_SIZE, lineHeight: 1 };
  const wWrite = useTextWidth('Write', titleStyle);
  const wWith = useTextWidth('with', titleStyle);
  const gap = 0.26 * TITLE_SIZE;
  const SLOT = 150;
  const promptW = useTextWidth(PROMPT, { fontFamily: fonts.inter, fontSize: 30 });
  // the mark: pops into the title's slot, then flies down into the prompt pill as the camera pushes
  const pop = springAt(f, fps, T.words[2] - 2, springs.pop);
  const fly = at(f, T.push + 2, T.land - T.push - 2, ease.inOut);
  const markFrom = { x: PADL + wWrite + gap + wWith + gap + SLOT / 2, y: TITLE_Y + 72, s: 112 };
  const markTo = { x: PADL + 26 + 20, y: PILL_Y + 14 + 20, s: 40 };
  const markS = logScale(markFrom.s, markTo.s, fly) * mix(pop, 0.2, 1);
  const pill = springAt(f, fps, T.ask, springs.card);
  const pillOut = at(f, T.rewrite + 2, 8, ease.in);
  const shown = f >= T.type + 3 ? PROMPT : f >= T.type ? 'Sharper,' : '';
  const reflow = at(f, T.n[0], 14, ease.inOut); // the paragraphs under the sentence close the gap
  const wordIn = (t: number) => (f >= t ? 1 : 0);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
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
                  fontStyle: i === 3 ? 'italic' : undefined,
                  opacity: wordIn(T.words[i]),
                  color: mixColor(CLAUDE, INK, at(f, T.words[i], 12, ease.inOut)),
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
                <span style={{ position: 'absolute', left: -2, top: 25, height: 3, width: `calc(${strike * 100}% + 4px)`, background: CLAUDE, borderRadius: 2 }} />
              </span>
            );
          })}
        </div>
        {/* the rewrite, cut on word by word in its place */}
        <div style={{ position: 'absolute', left: PADL, top: PARA_Y, display: 'flex', gap: '0.27em', whiteSpace: 'nowrap', fontFamily: fonts.inter, fontWeight: 600, fontSize: 32, lineHeight: '48px', letterSpacing: '-0.015em', opacity: f >= T.flood ? 0 : 1 }}>
          {NEW_W.map((w, i) => (
            <span key={i} style={{ display: 'inline-block', opacity: wordIn(NEW_T[i]), color: mixColor(CLAUDE, INK, at(f, NEW_T[i] + 4, 12, ease.inOut)), transform: `translateY(${mix(at(f, NEW_T[i], 5, ease.out), 8, 0)}px)` }}>
              {w}
            </span>
          ))}
        </div>
        {/* the rest of the page, closing up under the new line */}
        <div style={{ position: 'absolute', left: PADL, top: mix(reflow, 750, 580), width: 900, fontFamily: fonts.inter, fontSize: 32, lineHeight: '48px', color: '#8B857C' }}>
          Customer count is up in all four regions, led by APAC.
          <div style={{ marginTop: 26, ...serif, fontSize: 52, color: INK }}>What changed</div>
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

/** The sentence lifts off the page as the plate and flies to its pinned point while the coral floods out of it. */
const PLATE_TEXT_X = FS * 0.52 + FS * 0.86 + FS * 0.38; // text offset inside the plate (padding + mark + gap)
const PLATE_W = 1410; // measured plate width at FS (sheet r3-a)
const CF = camAt(T.flood);
const S0 = (32 * CF.z) / FS;
const SENT = { left: 960 + (PADL - CF.x) * CF.z, y: 540 + (LINE_CY - CF.y) * CF.z };
const SX = SENT.left - PLATE_TEXT_X * S0 + (PLATE_W * S0) / 2;
// the coral grows out of the plate's own box
const FROM = { x: SX, y: SENT.y, w: PLATE_W * S0, h: FS * 1.62 * S0, r: FS * 0.3 * S0 };
const Flight: React.FC = () => {
  const f = useCurrentFrame();
  const p = at(f, T.flood, T.hA - T.flood, ease.inOut);
  const lit = at(f, T.flood, 6, ease.out);
  return (
    <div style={{ position: 'absolute', left: mix(p, SX, AX), top: mix(p, SENT.y, AY), transform: `translate(-50%, -50%) translateY(${-18 * Math.sin(Math.PI * p)}px) scale(${mix(p, S0, 1)})`, zIndex: 40 }}>
      <Line lit={lit} />
    </div>
  );
};

// ---------------------------------------------------------------- 3. the relay: the sentence pinned, the hosts cut around it
/** Host A, full-bleed on the coral flood: a Gmail compose drawn on the ground itself, sent on the beat. */
const HostMail: React.FC = () => {
  const f = useCurrentFrame();
  const back = settle(f, T.hA, 0.08) * (1 + 0.015 * creep(f, T.hA + 8, 16));
  const front = settle(f, T.hA, 0.03);
  const more = at(f, T.hA + 6, 8, ease.out);
  const press = at(f, T.hA + 13, 3, ease.out) * (1 - at(f, T.hA + 16, 5, ease.out));
  const sent = f >= T.hA + 16;
  const field: React.CSSProperties = { position: 'absolute', left: 110, fontFamily: fonts.inter, fontSize: 42, color: INK, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 26 };
  const rule = (top: number): React.CSSProperties => ({ position: 'absolute', left: -60, right: -60, top, height: 2, background: 'rgba(60,22,8,0.22)' });
  return (
    <AbsoluteFill style={{ background: CLAUDE, overflow: 'hidden' }}>
      <AbsoluteFill style={pivot(back)}>
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
        <div style={{ ...field, top: 410, fontSize: 46 }}>Hi all, a short Q3 note before Thursday.</div>
      </AbsoluteFill>
      <AbsoluteFill style={pivot(front)}>
        <div style={{ ...field, top: 660, fontSize: 46, opacity: more > 0 ? 1 : 0, transform: `translateY(${mix(more, 40, 0)}px)` }}>Full deck attached. Happy to take questions.</div>
        <div style={rule(880)} />
        <div style={{ ...field, top: 926, gap: 50 }}>
          <span style={{ background: sent ? '#2E2A25' : INK, color: CREAM, fontWeight: 600, borderRadius: 999, padding: '18px 54px', transform: `scale(${1 - 0.08 * press})`, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.18), 0 14px 30px -12px rgba(60,22,8,0.6)', display: 'flex', alignItems: 'center', gap: 16 }}>
            {sent ? 'Sent' : 'Send'} <Icon name={sent ? 'Check' : 'SendHorizontal'} size={38} color={CREAM} stroke={2.4} />
          </span>
          {['Paperclip', 'Link', 'Smile', 'Image', 'PenLine'].map((n) => (
            <Icon key={n} name={n} size={50} color={INK} stroke={2.2} />
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Host B, a Notion page as a tilted plane on ink: the page's edge shows, the to-dos land under the sentence. */
const HostNotion: React.FC = () => {
  const f = useCurrentFrame();
  const p = ease.out(clamp((f - T.hB) / 20));
  const rx = mix(p, 26, 15);
  const rz = mix(p, -7, -4);
  const s = settle(f, T.hB, 0.04) * mix(p, 1, 1.05);
  const row = (k: number) => at(f, T.hB + 5 + k * 4, 7, ease.out);
  const txt: React.CSSProperties = { fontFamily: fonts.inter, color: INK, whiteSpace: 'nowrap', position: 'absolute' };
  return (
    <AbsoluteFill style={{ background: INK, overflow: 'hidden', perspective: 1700, perspectiveOrigin: `${AX}px ${AY}px` }}>
      {/* a warm key light from the top left falls on the ink, so the page sits in light, not on a void */}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 70% 60% at 20% 10%, rgba(217,119,87,0.22), rgba(217,119,87,0) 70%)' }} />
      <AbsoluteFill style={{ transformStyle: 'preserve-3d', ...pivot(s, `rotateX(${rx}deg) rotateZ(${rz}deg)`) }}>
        <div style={{ position: 'absolute', left: 40, top: -60, width: 3200, height: 2600, background: '#F4EEE5', borderRadius: 28, boxShadow: 'inset 0 3px 0 #FFFFFF, inset 3px 0 0 rgba(255,255,255,0.8), -30px 60px 120px rgba(0,0,0,0.55)' }} />
        <div style={{ ...txt, left: 180, top: 20, display: 'flex', alignItems: 'center', gap: 22, fontSize: 36, color: MUTED }}>
          <Brand name="notion" size={62} color={INK} /> Board <span style={{ opacity: 0.5 }}>/</span> Q3 summary
        </div>
        <div style={{ ...txt, left: 180, top: 120, fontSize: 112, fontWeight: 700, letterSpacing: '-0.03em' }}>Q3 summary</div>
        <div style={{ ...txt, left: 180, top: 290, fontSize: 36, color: MUTED, display: 'flex', gap: 60 }}>
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
          <div key={k} style={{ ...txt, left: 210, top: 690 + k * 100, fontSize: 46, display: 'flex', alignItems: 'center', gap: 26, opacity: row(k) > 0 ? 1 : 0, transform: `translateY(${mix(row(k), 30, 0)}px)` }}>
            <span style={{ width: 44, height: 44, borderRadius: 8, border: `3px solid ${r.done ? CLAUDE : '#A49C91'}`, background: r.done ? CLAUDE : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {r.done && <Icon name="Check" size={34} color="#FFFFFF" stroke={3.2} />}
            </span>
            <span style={{ textDecoration: r.done ? 'line-through' : undefined, color: r.done ? '#A49C91' : INK }}>{r.t}</span>
          </div>
        ))}
        <div style={{ ...txt, left: 210, top: 900, fontSize: 42, color: '#B3AA9E', opacity: row(2) > 0 ? 1 : 0 }}>Type ‘/’ for commands</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** The markdown note's page in frame coordinates: drawn by host C, and again as the wall's centre cell (the match cut). */
const MdPage: React.FC = () => {
  const mono: React.CSSProperties = { position: 'absolute', fontFamily: fonts.mono, fontSize: 88, color: INK, whiteSpace: 'pre', letterSpacing: '-0.02em', lineHeight: 1 };
  const gut: React.CSSProperties = { position: 'absolute', left: 60, fontFamily: fonts.mono, fontSize: 40, color: '#B5AA9C' };
  const LINES: Array<{ y: number; node: React.ReactNode }> = [
    { y: 230, node: <><span style={{ color: CLAUDE }}>## </span>What went well</> },
    { y: 395, node: <span style={{ color: MUTED }}>{'> board, Thu 10:00'}</span> },
    { y: 725, node: <><span style={{ color: CLAUDE }}>- </span>APAC led at +41 %</> },
    { y: 890, node: <><span style={{ color: CLAUDE }}>## </span>What to fix</> },
    { y: 1055, node: <><span style={{ color: CLAUDE }}>- </span>SMB churn, 3.1 %</> },
  ];
  return (
    <>
      <div style={{ position: 'absolute', left: 110, top: 44, display: 'flex', alignItems: 'center', gap: 22, fontFamily: fonts.mono, fontSize: 34, color: MUTED, whiteSpace: 'nowrap' }}>
        <Brand name="obsidian" size={56} /> notes / q3-review.md
      </div>
      <div style={{ position: 'absolute', left: -60, right: -60, top: 128, height: 2, background: 'rgba(28,26,23,0.12)' }} />
      {[...LINES, { y: AY, node: null }].map((l, i) => (
        <React.Fragment key={i}>
          <div style={{ ...gut, top: l.y - 20 }}>{[11, 12, 14, 15, 16, 13][i]}</div>
          {l.node && <div style={{ ...mono, left: 190, top: l.y - 44 }}>{l.node}</div>}
        </React.Fragment>
      ))}
      <div style={{ position: 'absolute', left: 0, width: 10, top: AY - 70, height: 140, background: CLAUDE }} />
    </>
  );
};

/** Host C, a markdown note as giant mono on cream paper, in macro: the lines travel past the pinned sentence. */
const HostMarkdown: React.FC = () => {
  const f = useCurrentFrame();
  const t = f - T.hC;
  const zoom = logScale(1.22, 1.0, ease.out(clamp(t / 22)));
  const drift = mix(ease.out(clamp(t / 22)), 70, 0);
  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Paper color={CREAM} fibre={0.05} />
      {/* back plane: header and lines move more than the pinned sentence */}
      <AbsoluteFill style={{ ...pivot(zoom), translate: `0 ${drift}px` }}>
        <MdPage />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const RelayBeat: React.FC = () => (
  <Relay
    anchor={{ x: AX, y: AY }}
    artefact={<Line />}
    hosts={[
      { f: T.hA, node: <HostMail /> },
      { f: T.hB, node: <HostNotion /> },
      { f: T.hC, node: <HostMarkdown /> },
    ]}
  />
);

// ---------------------------------------------------------------- 4. the wall (spectacle): every doc, Claude's line lands in each
const TITLES = ['Launch plan', 'Hiring memo', 'Pricing FAQ', 'Offsite notes', 'Release notes 4.2', 'Investor letter', 'Support macros', 'Onboarding guide', 'Roadmap H1', 'Weekly digest', 'Press brief', 'Q3 board update'];
const CLAIMS = ['Ship date: May 12.', 'Two senior hires.', 'Plans start at $12.', 'Decisions, owners.', 'Faster sync, fewer taps.', 'Margin up 6 points.', 'Reply within 2 hours.', 'Day one, in 20 min.', 'Three bets, ranked.', 'Churn down to 2.4 %.', 'Live in 14 markets.'];
const WEAK = ['We are generally hoping to ship at some point around May.', 'There are quite a few things we may want to look into.', 'Overall it seems like most of it is more or less on track.', 'It could possibly be somewhat faster in some cases.'];
const BODY = ['Notes from Monday, owners in bold.', 'The short version for the team.', 'What changed since the last draft.', 'Open questions at the end.', 'Numbers as of Friday close.'];
const MARKS: Array<{ name: string; file?: string }> = [{ name: 'googledocs', file: 'logos/google-docs.svg' }, { name: 'gmail' }, { name: 'notion' }, { name: 'obsidian' }];
const COLS = 13;
const ROWS = 11;
const CW = 440;
const CH = 290;
const GAP = 30;
const PS = 0.22; // the centre plate's scale inside its cell; the wall starts at 1 / PS so it matches the relay's plate
const PSC = 0.4; // the plate in every other doc, larger so the wave reads from far
const PY = 196; // the plate's centre inside a cell
const CC = 6;
const CR = 5;
const DMAX = Math.hypot(CC, CR);
const pullCurve = (t: number) => 0.55 * ease.out(t) + 0.45 * ease.inOut(t);

const WallBeat: React.FC = () => {
  const f = useCurrentFrame();
  const pull = at(f, T.wall, T.drain - T.wall + 6, pullCurve);
  const zoom = logScale(1 / PS, 0.34, pull);
  const cx = CC * (CW + GAP) + CW / 2;
  const cy = CR * (CH + GAP) + PY;
  const ty = mix(pull, 0, 500 - AY);
  const rx = mix(pull, 0, 22);
  const rz = mix(pull, 0, -5) - 2 * at(f, T.wall + 30, T.lock - T.wall - 30, ease.inOut);
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const d = Math.hypot(c - CC, r - CR);
      const centre = d === 0;
      // the event: Claude's line lands in each doc, a wave from the centre (the weak line struck, the coral plate in)
      const t0 = T.ev + d * 3.2;
      const e = at(f, t0, 7, ease.out);
      const struck = at(f, t0 - 3, 3, ease.out);
      const flash = at(f, t0, 3) * (1 - at(f, t0 + 3, 10, ease.out));
      const kraft = !centre && (i * 5) % 7 === 3;
      // drain: edges first, each cell slides into the centre under the growing ink drop
      const drain = at(f, T.drain + (DMAX - d) * 0.5, 6, ease.in);
      const dx = (c - CC) * (CW + GAP);
      const dy = (r - CR) * (CH + GAP);
      const m = MARKS[(i * 5 + 2) % MARKS.length];
      cells.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cx + dx * (1 - drain) - CW / 2,
            top: cy - PY + dy * (1 - drain),
            width: CW,
            height: CH,
            opacity: 1 - drain,
            transform: `scale(${1 - drain * 0.95})`,
            borderRadius: 18,
            background: centre ? CREAM : kraft ? '#EFE4D6' : '#FFFDF9',
            boxShadow: `inset 0 2px 0 #FFFFFF, 0 0 0 ${1 + 4 * flash}px rgba(217,119,87,${0.08 + 0.7 * flash}), 0 16px 26px -14px rgba(100,50,20,0.38)`,
            boxSizing: 'border-box',
            fontFamily: fonts.inter,
            overflow: 'hidden',
          }}
        >
          {centre ? (
            <div style={{ position: 'absolute', left: CW / 2 - AX * PS, top: PY - AY * PS, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${PS})` }}>
              <MdPage />
            </div>
          ) : (
            <>
              <div style={{ position: 'absolute', left: 26, top: 24, display: 'flex', alignItems: 'center', gap: 12, whiteSpace: 'nowrap' }}>
                <Brand name={m.name} file={m.file} size={26} />
                <span style={{ fontFamily: fonts.serif, fontSize: 34, color: INK }}>{TITLES[(i * 7 + 3) % TITLES.length]}</span>
              </div>
              <div style={{ position: 'absolute', left: 26, right: 26, top: 80, fontSize: 17, lineHeight: 1.45, color: '#9A9288' }}>{BODY[(i * 3) % BODY.length]}</div>
              {/* the weak line, struck as the wave arrives */}
              <div style={{ position: 'absolute', left: 26, right: 26, top: PY - 24, fontSize: 18, lineHeight: '24px', color: '#6F685F', opacity: 1 - e }}>
                <span style={{ backgroundImage: `linear-gradient(${CLAUDE}, ${CLAUDE})`, backgroundRepeat: 'no-repeat', backgroundSize: `${struck * 100}% 2px`, backgroundPosition: '0 55%' }}>{WEAK[(i * 3 + 1) % WEAK.length]}</span>
              </div>
            </>
          )}
          <div style={{ position: 'absolute', left: CW / 2, top: PY, transform: `translate(-50%, -50%) scale(${(centre ? PS : PSC) * (centre ? 1 : mix(e, 1.35, 1))})`, opacity: centre || e > 0 ? 1 : 0 }}>
            <Line text={centre ? NEW : CLAIMS[(i * 3 + 1) % CLAIMS.length]} lit={1} coral={e} />
          </div>
          {!centre && <div style={{ position: 'absolute', left: 26, right: 26, top: PY + 40, fontSize: 17, lineHeight: 1.45, color: '#9A9288' }}>{BODY[(i * 3 + 2) % BODY.length]}</div>}
        </div>,
      );
    }
  return (
    <AbsoluteFill style={{ overflow: 'hidden', perspective: 2400, perspectiveOrigin: `${AX}px 500px` }}>
      <Paper color={CREAM} fibre={0.04} />
      <div style={{ position: 'absolute', left: AX - cx, top: AY - cy, width: COLS * CW + (COLS - 1) * GAP, height: ROWS * CH + (ROWS - 1) * GAP, transformOrigin: `${cx}px ${cy}px`, transform: `translateY(${ty}px) rotateX(${rx}deg) rotateZ(${rz}deg) scale(${zoom})` }}>
        {cells}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. lockup (1.2 s): the wall drains into a big ink drop that settles into the mark
const BIG = 2.8;
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const grow = springAt(f, fps, T.drain, springs.pop);
  const shrink = at(f, T.drain + 8, 10, ease.inOut);
  const s = f < T.drain + 8 ? mix(grow, 0.1, BIG) : logScale(BIG, 1, shrink);
  const word = at(f, T.lock, 12, ease.out);
  const dot = springAt(f, fps, T.lock + 16, springs.pop);
  const wordW = useTextWidth('Inkwell', { ...serif, fontSize: 240, lineHeight: 1 });
  const centreOff = (wordW + 40) / 2; // keeps the drop at the frame's centre until the word arrives
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${1 + 0.05 * at(f, T.lock - 8, T.end - T.lock + 8, ease.out)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40, transform: `translateX(${mix(word, centreOff, 0)}px)` }}>
        <svg width={150} height={188} viewBox="0 0 100 125" style={{ transform: `scale(${s})`, overflow: 'visible' }}>
          <path d="M50 4 C 64 34, 92 56, 92 82 A 42 42 0 0 1 8 82 C 8 56, 36 34, 50 4 Z" fill={INK} />
          <circle cx="36" cy="80" r={9 * dot} fill={CLAUDE} />
        </svg>
        <div style={{ ...serif, fontSize: 240, lineHeight: 1, clipPath: `inset(-10% ${mix(word, 100, -2)}% -20% 0)`, transform: `translateX(${mix(word, -60, 0)}px)` }}>Inkwell</div>
      </div>
      <div style={{ fontFamily: fonts.inter, fontSize: 40, color: MUTED, marginTop: 34, display: 'flex', alignItems: 'center', gap: 14, opacity: f >= T.lock + 12 ? 1 : 0, transform: `translateY(${mix(at(f, T.lock + 12, 8, ease.out), 24, 0)}px)` }}>
        Claude, in every doc <Brand name="claude" size={40} /> inkwell.app
      </div>
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
    { at: T.flood + 2, ...s['mixkit-168'], volume: 0.45 },
    { at: T.hA, ...s['mixkit-2299'], volume: 0.5 },
    { at: T.hA + 13, ...s['mixkit-2533'], volume: 0.4 },
    { at: T.hB, ...s['mixkit-2299'], volume: 0.42 },
    { at: T.hB + 9, ...s['mixkit-2568'], volume: 0.3 },
    { at: T.hC, ...s['mixkit-2299'], volume: 0.42 },
    { at: T.wall, ...s['mixkit-1492'], volume: 0.4 },
    ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ({ at: T.ev + k * 4, ...s['mixkit-2568'], volume: 0.16 + 0.02 * k, rate: 0.9 + k * 0.04 })),
    { at: T.drain - 4, ...s['mixkit-784'], volume: 0.35, maxS: 1 },
    { at: T.drain + 1, ...s['mixkit-2299'], volume: 0.55 },
    { at: T.lock + 16, ...s['mixkit-3124'], volume: 0.25 },
  ];
  return (
    <AbsoluteFill>
      <Paper color={CREAM} fibre={0.04} />
      {f < T.hA && <Flood from={FROM} start={T.flood} dur={T.hA - T.flood} color={CLAUDE} under={<Doc />} />}
      {f >= T.flood && f < T.hA && <Flight />}
      {f >= T.hA && f < T.wall && <RelayBeat />}
      {f >= T.wall && f < T.lock + 2 && <WallBeat />}
      {f >= T.drain && <Lockup />}
      <Grain amount={0.025} />
      {/* main hit T.hA moved 118 -> 112: startFrom 5.37 + 6 / 30 */}
      <Music src="music/coffee-or-tea.mp3" startFrom={5.57} volume={1} breaths={[T.rewrite, T.hA]} breathLen={6} fadeOut={40} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const inkwellDuration = T.end;
