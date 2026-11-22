// "Inkwell": iteration 5 of the v2 kit, rebuilt after critique. ~12.5 s at 30 fps. An invented writing app with Claude
// inside every document. World: soft air (a living cream gradient), a serif voice, Inter for the product, one accent from
// the partner's own mark (Claude's coral); three grounds: cream, a coral flood for "everywhere", cream again for the wall.
// Real marks for Claude and the places people write; the artefact lands inside their surfaces (never a logo row).
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import {
  accel,
  at,
  Aura,
  Brand,
  Build,
  Card,
  clamp,
  creep,
  Cues,
  ease,
  Flood,
  fonts,
  Grain,
  lightUI,
  logScale,
  Marker,
  mix,
  Music,
  PartnerSurface,
  Spinner,
  springAt,
  springs,
  Typing,
  Words,
  type Theme,
} from '../../kit';
import { sfx } from '../../sfx';

const INK = '#1C1A17';
const CLAUDE = '#D97757';
const CREAM = '#F6F1EA';
const serif: React.CSSProperties = { fontFamily: fonts.serif, fontWeight: 400, letterSpacing: '-0.02em', color: INK };
const ui: Theme = { ...lightUI, accent: CLAUDE, ink: INK, muted: '#7A746B', fill: '#F3EEE7', line: 'rgba(28,26,23,0.08)', radius: 26, font: fonts.inter };
const glass: Theme = { ...ui, surface: 'rgba(255,255,255,0.86)', line: 'rgba(255,255,255,0.9)', shadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 24px 60px -18px rgba(90,60,30,0.35)' };

const T = {
  words: [-4, 6, 16, 26],
  doc: 44,
  select: 50,
  ask: 58,
  type: 62,
  think: 92,
  rewrite: 104,
  flood: 132,
  surfaces: [146, 166, 186],
  wall: 206,
  drain: 262,
  lock: 300,
  end: 372,
} as const;

const Sky: React.FC = () => (
  <Aura
    base={CREAM}
    blobs={[
      { color: '#FFD8C2', x: 380, y: 260, r: 620 },
      { color: '#DCE7F4', x: 1560, y: 820, r: 700 },
      { color: '#FFF4E6', x: 1200, y: 180, r: 520 },
    ]}
    speed={1.4}
  />
);

// ---------------------------------------------------------------- 1. "Write with Claude." (the real mark joins the line)
const Open: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mark = springAt(f, fps, T.words[2] - 2, springs.pop);
  const out = accel(f, T.doc - 6, 8, 1.5);
  const push = 1 + 0.03 * creep(f, 0, T.doc);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${push * logScale(1, 1.6, out)})`, opacity: 1 - out }}>
      <div style={{ width: 1920 }}>
        <Build words={['Write', 'with', '   ', 'Claude.']} times={[...T.words]} born={CLAUDE} style={{ ...serif, fontSize: 205 }} wordStyle={(i) => (i === 3 ? { fontStyle: 'italic' } : undefined)} />
      </div>
      {f >= T.words[2] - 2 && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 540 - 76, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div style={{ transform: `translateX(${mix(at(f, T.words[3], 9, ease.out), 138, 0) - 43}px) scale(${mix(mark, 0.2, 1)}) rotate(${mix(mark, -40, 0)}deg)`, opacity: clamp(mark * 3) }}>
            <Brand name="claude" size={140} />
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2. the document, already in macro: select, ask, rewrite
const OLD = 'Our quarterly results were generally quite positive in most of the areas we looked at.';
const NEW = 'Revenue grew 34 %. Every region beat plan.';

const Doc: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const arrive = at(f, T.doc, 20, ease.out);
  const ask = springAt(f, fps, T.ask, springs.card);
  const rewriting = f >= T.rewrite;
  // the camera arrives moving and keeps leaning in on the sentence
  const zoom = logScale(2.3, 1.75, arrive) * (1 + 0.05 * creep(f, T.ask, T.flood - T.ask));
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${zoom}) translate(110px, 40px)`, filter: `blur(${mix(arrive, 8, 0)}px)` }}>
        <Card t={ui} w={1180} h={700} pad={70} style={{ borderRadius: 30 }}>
          <div style={{ fontFamily: fonts.inter, fontSize: 22, color: ui.muted, display: 'flex', gap: 14, alignItems: 'center' }}>
            <Brand name="googledocs" file="logos/google-docs.svg" size={30} /> Q3 board update · Draft
          </div>
          <div style={{ ...serif, fontSize: 76, marginTop: 30, lineHeight: 1.05 }}>Q3, in one page</div>
          <div style={{ fontFamily: fonts.inter, fontSize: 32, lineHeight: 1.5, color: '#3B3732', marginTop: 34, width: 1000 }}>
            {!rewriting ? (
              <Marker start={T.select} dur={10} color="rgba(217,119,87,0.24)">
                {OLD}
              </Marker>
            ) : (
              <span style={{ fontWeight: 650, color: INK }}>
                <Words text={NEW} start={T.rewrite} arrive="cut" gap={2} align="left" width={1000} style={{ color: INK }} born={CLAUDE} settle={20} />
              </span>
            )}
            <div style={{ marginTop: 22, color: '#8B857C' }}>Customer count is up in all four regions, led by APAC.</div>
          </div>
        </Card>
      </div>
      {/* the ask, large, in screen space under the sentence */}
      {f >= T.ask && (
        <div style={{ position: 'absolute', left: 260, top: 760, transform: `translateY(${mix(ask, 40, 0)}px) scale(${mix(ask, 0.85, 1)})`, opacity: clamp(ask * 2) }}>
          <Card t={glass} pad={0} style={{ display: 'flex', alignItems: 'center', gap: 22, borderRadius: 999, padding: '22px 36px' }}>
            <Brand name="claude" size={50} />
            <span style={{ fontFamily: fonts.inter, fontSize: 44, color: INK }}>
              <Typing text="Sharper, with the numbers" start={T.type} cps={26} caretColor={CLAUDE} />
            </span>
            {f >= T.think && <Spinner start={T.think} doneAt={T.rewrite} size={46} color="#C8BFB4" done={CLAUDE} stroke={4} />}
          </Card>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3. everywhere: the sentence lands inside each product
// The landed item sits at the same screen place in all three surfaces, so the cuts match on it.
const LINE = <><b>Revenue grew 34 %.</b> Every region beat plan.</>;
const SURFACES: Array<{ brand: string; kind: 'mail' | 'doc' | 'chat'; title: string; items: Array<{ who?: string; text: React.ReactNode; meta?: string; color?: string }> }> = [
  { brand: 'gmail', kind: 'mail', title: 'To: board@northwind.co · Q3 update', items: [{ text: 'Hi all, a short Q3 note before Thursday.' }, { text: LINE }, { text: 'Full deck attached. Happy to take questions.' }] },
  { brand: 'notion', kind: 'doc', title: 'Board / Q3 summary', items: [{ text: 'Summary' }, { text: LINE }, { text: 'Next: hiring plan for Q4' }] },
  { brand: 'obsidian', kind: 'doc', title: 'notes / q3-review.md', items: [{ text: '## What went well' }, { text: LINE }, { text: '## What to fix' }] },
];

const Everywhere: React.FC = () => {
  const f = useCurrentFrame();
  const i = f < T.surfaces[1] ? 0 : f < T.surfaces[2] ? 1 : 2;
  const s = SURFACES[i];
  const start = T.surfaces[i];
  const land = start + 3;
  const push = 1 + 0.04 * at(f, start, 20, ease.out);
  return (
    <AbsoluteFill style={{ background: CLAUDE, justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ transform: `scale(${push})` }}>
        <PartnerSurface
          t={ui}
          brand={s.brand}
          kind={s.kind}
          title={s.title}
          w={1560}
          h={780}
          size={44}
          landAt={land}
          items={s.items.map((it, k) => ({ f: k === 1 ? land : start - 30, text: it.text, who: it.who, meta: it.meta, color: it.color }))}
        />
      </div>
      <div style={{ position: 'absolute', top: 60, left: 0, right: 0, textAlign: 'center', ...serif, fontSize: 64, color: '#FFFFFF', fontStyle: 'italic', opacity: at(f, T.surfaces[0], 6) }}>
        everywhere you write
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 4. the wall: every document, then they drain into the ink
const TITLES = ['Q3 board update', 'Launch plan', 'Hiring memo', 'Pricing FAQ', 'Offsite notes', 'Release notes 4.2', 'Investor letter', 'Support macros', 'Onboarding guide', 'Roadmap H1'];
const LINES = ['Revenue grew 34 %.', 'Ship date: May 12.', 'Two senior hires.', 'Plans start at $12.', 'Decisions, owners.', 'Faster sync, fewer taps.', 'Margin up 6 points.', 'Reply within 2 hours.', 'Day one, in 20 min.', 'Three bets, ranked.'];
const COLS = 9;
const ROWS = 5;
const CW = 300;
const CH = 200;
const GAP = 26;

const WallBeat: React.FC = () => {
  const f = useCurrentFrame();
  // pull back from the centre document (readable) to the whole wall, in log space
  const pull = at(f, T.wall, 46, ease.inOut);
  const zoom = logScale(6.2, 0.62, pull);
  const W = COLS * CW + (COLS - 1) * GAP;
  const H = ROWS * CH + (ROWS - 1) * GAP;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const d = Math.hypot(c - (COLS - 1) / 2, r - (ROWS - 1) / 2);
      const centre = d === 0;
      const appear = centre ? 1 : at(f, T.wall + 8 + d * 4, 10, ease.out);
      // drain: from the edges inward, each cell shrinks into the centre (toward where the ink drop will fall)
      const drain = at(f, T.drain + (6 - d) * 3, 12, ease.in);
      const dx = (c - (COLS - 1) / 2) * (CW + GAP);
      const dy = (r - (ROWS - 1) / 2) * (CH + GAP);
      cells.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: W / 2 + dx * (1 - drain) - CW / 2,
            top: H / 2 + dy * (1 - drain) - CH / 2,
            width: CW,
            height: CH,
            opacity: appear * (1 - drain * 0.7),
            transform: `scale(${mix(appear, 0.85, 1) * (1 - drain * 0.85)})`,
            borderRadius: 18,
            background: '#FFFFFF',
            boxShadow: '0 12px 30px -14px rgba(90,60,30,0.3)',
            padding: '22px 24px',
            boxSizing: 'border-box',
            fontFamily: fonts.inter,
            overflow: 'hidden',
          }}
        >
          {/* the centre cell is the document the film just followed, so the cut into the wall matches */}
          <div style={{ fontFamily: fonts.serif, fontSize: 32, color: INK, whiteSpace: 'nowrap' }}>{centre ? 'Q3 board update' : TITLES[(i + 7) % TITLES.length]}</div>
          <div style={{ fontSize: 19, lineHeight: 1.45, color: '#8B857C', marginTop: 10 }}>
            <span style={{ color: CLAUDE, fontWeight: 650 }}>{centre ? 'Revenue grew 34 %.' : LINES[(i * 3) % LINES.length]}</span> {centre ? 'Every region beat plan.' : LINES[(i * 7 + 1) % LINES.length]}
          </div>
        </div>,
      );
    }
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ position: 'relative', width: W, height: H, transform: `scale(${zoom})` }}>{cells}</div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. lockup (2 s): the ink drop the wall drained into
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const d = springAt(f, fps, T.lock - 8, springs.pop);
  const word = at(f, T.lock + 2, 14, ease.out);
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', transform: `scale(${1 + 0.04 * at(f, T.lock, T.end - T.lock, ease.out)})` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 40 }}>
        <svg width={150} height={188} viewBox="0 0 100 125" style={{ transform: `scale(${mix(d, 0.15, 1)})`, marginRight: mix(word, -150, 0) }}>
          <path d="M50 4 C 64 34, 92 56, 92 82 A 42 42 0 0 1 8 82 C 8 56, 36 34, 50 4 Z" fill={INK} />
          <circle cx="36" cy="80" r="9" fill={CLAUDE} />
        </svg>
        <div style={{ ...serif, fontSize: 240, lineHeight: 1, clipPath: `inset(-10% ${mix(word, 100, -2)}% -20% 0)` }}>Inkwell</div>
      </div>
      <div style={{ fontFamily: fonts.inter, fontSize: 38, color: '#7A746B', marginTop: 34, display: 'flex', alignItems: 'center', gap: 14, opacity: at(f, T.lock + 14, 10) }}>
        Claude, in every doc <Brand name="claude" size={38} /> inkwell.app
      </div>
    </AbsoluteFill>
  );
};

export const InkwellFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    ...T.words.map((w, i) => ({ at: w, ...s['mixkit-2533'], volume: i === 3 ? 0.5 : 0.32 })),
    { at: T.words[2] - 1, ...s['mixkit-3000'], volume: 0.45 },
    { at: T.select, ...s['mixkit-3124'], volume: 0.3 },
    { at: T.ask, ...s['mixkit-3000'], volume: 0.3, rate: 1.1 },
    { at: T.rewrite, ...s['mixkit-2867'], volume: 0.45 },
    { at: T.flood + 6, ...s['mixkit-168'], volume: 0.45 },
    ...T.surfaces.map((t, i) => ({ at: t + 3, ...s['mixkit-2568'], volume: 0.4, rate: 0.95 + i * 0.06 })),
    { at: T.wall, ...s['mixkit-1492'], volume: 0.35 },
    { at: T.drain + 14, ...s['mixkit-784'], volume: 0.35, maxS: 1 },
    { at: T.lock - 6, ...s['mixkit-2299'], volume: 0.6 },
  ];
  return (
    <AbsoluteFill>
      <Sky />
      {f < T.doc + 1 && <Open />}
      {f >= T.doc && f < T.surfaces[0] && (
        <Flood from={{ x: 760, y: 820, w: 860, h: 110, r: 55 }} start={T.flood} dur={14} color={CLAUDE} under={<Doc />} />
      )}
      {f >= T.surfaces[0] && f < T.wall && <Everywhere />}
      {f >= T.wall && f < T.lock && <WallBeat />}
      {f >= T.lock - 8 && <Lockup />}
      <Grain amount={0.025} />
      <Music src="music/tech-house-vibes.mp3" startFrom={120} volume={0.42} breaths={[T.rewrite, T.flood + 12]} breathLen={6} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const inkwellDuration = T.end;
