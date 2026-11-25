// "Fieldnote": the look pass. ~14.1 s at 30 fps. An invented product (ask any question about any place on Earth,
// answered from satellite imagery). World: photo plates on clean paper. The licensed photographs are the world and are
// seen large and clean; the paper is a clean near-white, flat. One sans voice (Inter: 480 for lines and UI, 700 only
// where letters are windows onto a picture and for the wordmark). One accent, a sea blue taken from the channels in the
// photographs (#0D5878, 7.2:1 on the paper), that means "found / new". Grain on the photograph only, never on the paper.
// Grounds: paper (base), the photograph (after the dive), the sea-blue duotone of the same photograph (one ground cut,
// the found sand left in its own colour), paper again for the wordmark.
// Pictures: NASA / ISS crew Earth observations (public domain), unchanged.
//
// Concept: built from one picture (the place answers), because the product's input and output are the same satellite
// photograph; rejected: one task start to finish (the default), the number (the brief has one figure, not a story).
//
// Devices (the claim: any place, answered from the picture itself)
// - signature: letters as windows onto the earth: "Earth" with a new place inside every 8 f (hook and spectacle), the
//   dive into the stem of its h (seam), the found sand kept as a window of true colour in the duotone (the proof), the
//   paper closing round the picture until it is the wordmark (the lockup)
// - opening: six large photo tiles on clean paper, no captions, cutting on and turning to new places on the stepped
//   clock, then collapsing into the centre
// - type treatment: a picture inside the letters (the giant word and the wordmark); elsewhere one line alone
// - text arrivals: typing with a burst (the question), masked rise (the place name, the address)
// - seams: 0-1 converge (the tiles collapse into the word) | 1-2 dive into the h | 2-3 the bar rises on the picture |
//   3-4 the camera goes to the finding on the machine's turn | 4-5 the bar grows into the answer card | 5-6 the card
//   leaves left as the divider sweeps in | 6-7 the divider whips off, its year plate glides to the centre and counts |
//   7-8 colour-flip cut with a size step (ground cut: picture -> sea-blue duotone) | 8-9 the paper closes round the
//   picture until it is the wordmark (ground cut: duotone -> paper)
// - spectacle: imagery in type, "Earth" at 650 px with a new place inside every 8 f, 1.5 s
// - output-big: "+18 %" at 250 px on the answer card; the proof's "+3.4 km²" at 230 px on the found sand
// - proof: the sandbank traced from the photograph itself, lit sea blue in five steps from its 2000 cores to 2026
// - integrations: none (the brief hinges on places, not partners)
// - lockup: out of a letter: the picture the camera is in turns out to be the inside of "fieldnote"; it drains to clean
//   ink on paper, and the dot of the i (the pin of the place) takes the sea blue on the music's last lift
//
// Beats (composition tag in brackets; no two neighbours share one):
//   0  grid          six large places on paper, turning to new places on twos; they collapse into the centre
//   1  giant-type    SPECTACLE (1.5 s): "Earth" alone, letters as windows, a new place every 0.27 s
//   2  macro         the dive into the stem of the h: the frame ends up inside the picture
//   3  surface       the photograph full-bleed, one solid input bar rises centred low: three words typed, the rest lands
//   4  macro         send: the camera pushes onto the new channel; one selection, one label beside it (44 px+ on screen), the bar under it
//   5  centred-card  OUTPUT-BIG: the bar grows into one answer card: "+18 %" counting, "new land since 2000"
//   6  split         before / after: the divider sweeps twice carrying one paper plate with both years, large
//   7  macro         PROOF (1.6 s): the divider whips off, the camera travels into the sandbank; the plate counts 2000 ->
//                    2026 while the sand traced from the picture lights sea blue in steps
//   8  giant-type    colour-flip with a size step: the world goes sea-blue duotone, the found sand stays in its own
//                    colour, "+3.4 km²" at 230 px, "Great Bahama Bank" rises under it
//   9  object        LOCKUP (2 s): the paper closes round the picture until it is the wordmark; the letters drain to
//                    ink, the address rises, the dot of the i turns sea blue on the lift
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  accel,
  at,
  camAt,
  Camera,
  clamp,
  Compare,
  creep,
  Cues,
  ease,
  fonts,
  Grain,
  keys,
  landBlur,
  logScale,
  mix,
  Music,
  Odometer,
  onTwos,
  Photo,
  Selection,
  softShadow,
  Spinner,
  TextWindow,
  Typing,
  typingTimes,
  Words,
  type CamKey,
  type Grade,
} from '../../kit';
import { sfx } from '../../sfx';
import { SAND_LEVELS } from './sandbank';
import { WORDMARK_PATH } from './wordmark';

// ---------------------------------------------------------------- world
const PAPER = '#F5F6F6'; // clean paper, near-neutral
const INK = '#121417';
const SEA = '#0D5878'; // the accent: the deep water of the channels in the photographs
const MUTED = '#4A5258';
const voice: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 480, letterSpacing: '-0.015em', color: INK };
const heavy: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 700, letterSpacing: '-0.04em' };
const tag: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 520, letterSpacing: '0', fontVariantNumeric: 'tabular-nums' };
const GRADE: Grade = { dark: '#10222C', light: '#EEF3F4', look: 'saturate(1.05) contrast(1.04)' };

const IMG = {
  delta: 'img/earth-observations-taken-by-the-expedition.jpg',
  channels: 'img/earth-observations-taken-by-expedition-26.jpg',
  islands: 'img/seaweed-farms-in-south-korea.jpg',
  clouds: 'img/cloud-streets-over-the-bering-sea.jpg',
};
const POS = '46% 40%'; // the one crop of the Bahamas picture the whole middle of the film lives in

const T = {
  tiles: 0,
  converge: 44,
  earth: 54,
  swaps: [54, 62, 70, 78],
  dive: 100,
  ask: 116, // the picture is the ground; the bar rises
  type: 124,
  send: 152,
  find: 168, // the camera has arrived on the channel: the selection draws
  answer: 196, // the bar grows into the answer card
  cardOut: 236,
  compare: 248,
  // the proof: the divider whips off (the 2026 picture fills the frame on the beat), the camera travels to the sandbank
  proof: 294,
  wipeEnd: 298,
  land: 308,
  grow: [312, 317, 322, 326, 331],
  flip: 341, // colour-flip cut with a size step, on the beat (ground cut: the picture -> the duotone)
  flipLine: 344,
  lock: 362, // on the beat: the paper closes round the picture (ground cut: duotone -> paper)
  drain: 380, // the letters drain to ink
  url: 386,
  lift: 405, // the music's last lift: the dot of the i takes the sea blue
  end: 422,
} as const;
const GROW_YEARS = ['2000', '2006', '2013', '2020', '2026'];

// ---------------------------------------------------------------- 0. six places on paper
// each tile shows a place, then turns to a second place once (on twos): six large pictures, no captions
const PLACES = [
  { src: IMG.channels, pos: '30% 40%', zoom: 0.08 },
  { src: IMG.islands, pos: '35% 30%', zoom: 0.06 },
  { src: IMG.clouds, pos: '50% 60%', zoom: 0.07 },
  { src: IMG.delta, pos: '60% 45%', zoom: 0.06 },
  { src: IMG.channels, pos: '80% 70%', zoom: 0.07 },
  { src: IMG.islands, pos: '70% 75%', zoom: 0.08 },
  { src: IMG.delta, pos: '20% 70%', zoom: 0.06 },
  { src: IMG.clouds, pos: '15% 30%', zoom: 0.08 },
  { src: IMG.islands, pos: '55% 55%', zoom: 0.07 },
  { src: IMG.channels, pos: '55% 15%', zoom: 0.06 },
  { src: IMG.delta, pos: '85% 25%', zoom: 0.08 },
  { src: IMG.clouds, pos: '80% 85%', zoom: 0.06 },
];
const TW = 460;
const TH = 288;
const TG = 28;
const COLS = 3;
const ROWS = 2;
const ON = [4, 0, 2, 6, 0, 4]; // tiles cut on in a short stepped wave from the centre (two already there on frame 0)
const TURN = [14, 22, 18, 30, 26, 34]; // each tile turns to a new place once
const tileShadow = softShadow(3, PAPER);

const Tiles: React.FC = () => {
  const f = useCurrentFrame();
  const fs = onTwos(f);
  const q = accel(f, T.converge, T.earth + 2 - T.converge, 1.4);
  const push = 1 + 0.035 * at(f, 0, T.converge, ease.out);
  return (
    <AbsoluteFill>
      {Array.from({ length: COLS * ROWS }, (_, i) => {
        if (fs < ON[i]) return null;
        const c = i % COLS;
        const r = Math.floor(i / COLS);
        const wx = (c - (COLS - 1) / 2) * (TW + TG) * push;
        const wy = (r - (ROWS - 1) / 2) * (TH + TG) * push;
        const turned = fs >= TURN[i];
        const pl = PLACES[turned ? i + 6 : i];
        // a cut-on with a small settle; a turn is a cut with the same settle
        const j = at(f, turned ? TURN[i] : ON[i], 6, ease.snap);
        const sx = 960 + mix(q, wx, 0);
        const sy = 540 + mix(q, wy, 0);
        const sc = push * mix(j, 1.04, 1) * mix(q, 1, 0.22);
        return (
          <div key={i} style={{ position: 'absolute', left: sx - TW / 2, top: sy - TH / 2, width: TW, height: TH, transform: `scale(${sc})`, filter: q > 0.05 ? `blur(${q * 14}px)` : undefined, boxShadow: tileShadow }}>
            <Photo src={pl.src} w={TW} h={TH} grade={GRADE} position={pl.pos} zoom={pl.zoom} start={turned ? TURN[i] : 0} dur={60} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 1-2. EARTH as windows, then the dive into the H
const EARTH_FONT = 650;
// a point inside the stem of the "h": the dive pivots on it, so the frame ends up entirely inside the picture
const HX = 1433;
const HY = 545;
const SWAPS = [
  { src: IMG.islands, pos: '30% 30%' },
  { src: IMG.clouds, pos: '45% 95%' },
  { src: IMG.delta, pos: '60% 40%' },
  { src: IMG.channels, pos: '' },
];

const Earth: React.FC = () => {
  const f = useCurrentFrame();
  const inn = at(f, T.earth, 16, ease.out);
  const dive = at(f, T.dive, T.ask + 2 - T.dive, ease.in);
  const k = Math.max(0, T.swaps.filter((s) => f >= s).length - 1);
  const sw = SWAPS[k];
  // the last place settles inside the letters (a pull-out and a pan), so the dive lands on the crop the film lives in
  const settle = at(f, T.swaps[3], T.dive - T.swaps[3] + 6, ease.inOut);
  const pos = k === 3 ? `${mix(settle, 10, 46)}% ${mix(settle, 70, 40)}%` : sw.pos;
  const zoom = k === 3 ? mix(settle, 1.7, 1.05) : 1.25;
  const scale = mix(inn, 1.32, 1) * (1 + 0.03 * creep(f, T.earth + 10, 50)) * logScale(1, 34, dive);
  const blur = landBlur(f, T.earth, 10, 6) + dive * 6;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${HX}px ${HY}px`, transform: `scale(${scale})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TextWindow text="Earth" src={sw.src} position={pos} zoom={zoom} style={{ ...heavy, fontSize: EARTH_FONT }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3-7. the photo: ask, find, answer, compare, proof
// the one finding: the new channel, near the middle of the picture (stage px of the 1920x1080 crop)
const B = { x: 1004, y: 470, w: 196, h: 318 };
const aim = (x: number, y: number, z: number) => {
  // keep the frame inside the picture at zoom z
  const cx = clamp(x, 960 / z, 1920 - 960 / z);
  const cy = clamp(y, 540 / z, 1080 - 540 / z);
  return { x: cx - 960, y: cy - 540, zoom: z };
};
const BC = { x: B.x + B.w / 2, y: B.y + B.h / 2 };
const CAM: CamKey[] = [
  { f: T.ask, zoom: 1 },
  { f: T.send, zoom: 1.03, curve: ease.glide },
  // the machine's turn: the camera goes to the finding while the person waits
  { f: T.find, ...aim(BC.x, BC.y, 1.3), curve: ease.inOut },
  { f: T.answer, ...aim(BC.x, BC.y, 1.34), curve: ease.out },
  { f: T.answer + 18, zoom: 1.06, curve: ease.out },
  { f: T.compare, zoom: 1.1, curve: ease.out },
  // the camera pulls out while the divider sweeps, then travels to the sandbank as the divider whips off
  { f: T.compare + 34, zoom: 1, curve: ease.inOut },
  { f: T.proof - 4, zoom: 1.006, curve: ease.out },
  { f: T.land, ...aim(1600, 280, 1.8), curve: ease.inOut },
  { f: T.flip - 1, ...aim(1600, 280, 1.93), curve: ease.out },
  // the colour flip is a cut with a size step; then the paper closes in while the picture pulls back behind it
  { f: T.flip, cut: true, ...aim(1580, 400, 2.4) },
  { f: T.lock, ...aim(1580, 400, 2.5), curve: ease.out },
  { f: T.lock + 32, ...aim(1320, 330, 1.6), curve: ease.out },
  { f: T.end, ...aim(1320, 330, 1.57), curve: ease.inOut },
];
const split = (f: number) =>
  f < T.proof - 4
    ? keys(
        f,
        [
          [T.compare, 0],
          [T.compare + 16, 0.64],
          [T.compare + 32, 0.36],
          [T.proof - 4, 0.42],
        ],
        ease.out,
      )
    : // the whip: accelerating off the left edge, at full speed on its last frame
      mix(accel(f, T.proof - 4, T.wipeEnd - T.proof + 4, 1.4), 0.42, -0.02);
const toScreenX = (f: number, wx: number) => {
  const c = camAt(f, CAM);
  return 960 + c.zoom * (wx - 960 - c.x);
};

// the before/after picture at stage size; the divider is a plain line, the years ride it on one plate
const Picture: React.FC<{ split: number }> = ({ split: sp }) => (
  <Compare
    w={1920}
    h={1080}
    split={sp}
    handle={false}
    before={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} develop={0} position={POS} zoom={0} />}
    after={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} position={POS} zoom={0} />}
  />
);

// ---------------------------------------------------------------- the proof: the sand traced from the picture
// Five nested outlines of the bright sand (sandbank.ts): the 2000 cores outlined in white, then the new land lights sea
// blue outwards in four steps on the stepped clock, the newest ring flaring as it lands. Drawn in stage px, under the
// camera, so it rides the picture.
const Growth: React.FC = () => {
  const f = useCurrentFrame();
  const fs = onTwos(f);
  const k = T.grow.filter((g) => fs >= g).length - 1;
  if (k < 0) return null;
  const pop = 1 - at(f, T.grow[k], 6, ease.out);
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      {k >= 1 && (
        <>
          {k >= 2 && <path d={SAND_LEVELS[k - 1]} fill={SEA} fillOpacity={0.6} fillRule="evenodd" />}
          <path d={SAND_LEVELS[k]} fill={SEA} fillOpacity={0.4 + 0.3 * pop} fillRule="evenodd" stroke="#E6F2F6" strokeWidth={2 + 2.5 * pop} strokeLinejoin="round" />
        </>
      )}
      <path d={SAND_LEVELS[0]} fill="rgba(255,255,255,.4)" fillRule="evenodd" stroke="#FFFFFF" strokeWidth={2.4} strokeLinejoin="round" />
    </svg>
  );
};

// the colour flip: the whole picture in a sea-blue duotone except the found sand, which keeps its own colour (a hole in
// the duotone layer, traced from the picture); the lockup's letters are windows onto this same picture
const DUO: Grade = { dark: '#04202F', light: '#3C8DB0' };
const HOLE = `path(evenodd, 'M-3000 -3000 H5000 V5000 H-3000 Z ${SAND_LEVELS[4]}')`;
const Flipped: React.FC = () => (
  <>
    <AbsoluteFill style={{ clipPath: HOLE }}>
      <Photo src={IMG.channels} w={1920} h={1080} grade={DUO} develop={0} position={POS} zoom={0} />
    </AbsoluteFill>
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
      <path d={SAND_LEVELS[4]} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  </>
);

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const comparing = f >= T.compare && f < T.wipeEnd;
  const sel = 1 - at(f, T.answer, 8, ease.in);
  return (
    <Camera keys={CAM}>
      <AbsoluteFill style={{ filter: f < T.ask + 8 ? `blur(${landBlur(f, T.ask, 12, 8)}px)` : undefined }}>
        {!comparing ? <Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} position={POS} zoom={0} /> : <Picture split={split(f)} />}
        {sel > 0 && f >= T.find && (
          <div style={{ opacity: sel }}>
            <Selection {...B} start={T.find} dur={12} color="#FFFFFF" label={<span>New channel · 6.1 km</span>} labelStyle={{ ...tag, color: '#fff', fontSize: 34, background: SEA, padding: '8px 16px', left: 'calc(100% + 24px)', top: 0, boxShadow: softShadow(1, '#7FA9B8') }} />
          </div>
        )}
        {f >= T.grow[0] && f < T.flip && <Growth />}
        {f >= T.flip && <Flipped />}
      </AbsoluteFill>
    </Camera>
  );
};

// the one panel: a solid input bar -> the answer card
type Box = { x: number; y: number; w: number; h: number; r: number };
const BAR: Box = { x: 280, y: 850, w: 1360, h: 136, r: 68 };
const CARD: Box = { x: 440, y: 250, w: 1040, h: 580, r: 36 };
const lerpBox = (a: Box, b: Box, p: number): Box => ({ x: mix(p, a.x, b.x), y: mix(p, a.y, b.y), w: mix(p, a.w, b.w), h: mix(p, a.h, b.h), r: mix(p, a.r, b.r) });
const QUESTION = 'How has this coast changed since 2000?';
const Q_FS = 56;
const BURST = 3; // type "How has this", then the rest lands at once
const panelShadow = softShadow(5, '#86AEBB');

const Panel: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.ask || f > T.compare + 2) return null;
  const rise = at(f, T.ask, 14, ease.out);
  const p = at(f, T.answer, 16, ease.inOut);
  const out = accel(f, T.cardOut, T.compare - T.cardOut, 1.45);
  const b = lerpBox(BAR, CARD, p);
  const press = at(f, T.send, 4, ease.out) - at(f, T.send + 4, 10, ease.out);
  const showAns = at(f, T.answer + 5, 5);
  return (
    <div
      style={{
        position: 'absolute',
        left: b.x,
        top: b.y + mix(rise, 260, 0),
        width: b.w,
        height: b.h,
        borderRadius: b.r,
        background: '#FFFFFF',
        boxShadow: panelShadow,
        overflow: 'hidden',
        transform: `translateX(${-out * 1500}px)`,
        filter: out > 0.05 ? `blur(${out * 10}px)` : undefined,
      }}
    >
      {p < 0.25 && (
        <div style={{ position: 'absolute', left: 52, top: (BAR.h - Q_FS * 1.25) / 2, ...voice, fontSize: Q_FS, lineHeight: 1.25, whiteSpace: 'nowrap', color: f >= T.send + 2 ? MUTED : INK }}>
          {f < T.send ? <Typing text={QUESTION} start={T.type} cps={24} burst={BURST} caretColor={SEA} /> : QUESTION}
        </div>
      )}
      {/* send: pressed, then it works while the camera goes to the finding, and closes into a check as it lands */}
      {p < 0.25 && (
        <div style={{ position: 'absolute', right: 20, top: (BAR.h - 96) / 2, width: 96, height: 96, borderRadius: 48, background: f >= T.send ? SEA : '#E3E8EA', display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${1 - press * 0.12})` }}>
          {f < T.send + 2 ? (
            <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke={f >= T.send ? '#fff' : MUTED} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          ) : (
            <Spinner start={T.send + 2} doneAt={T.find + 6} size={48} color="#FFFFFF" done={SEA} />
          )}
        </div>
      )}
      {showAns > 0 && (
        <div style={{ position: 'absolute', left: (b.w - CARD.w) / 2, top: (b.h - 382) / 2, width: CARD.w, textAlign: 'center', opacity: showAns, transformOrigin: '50% 50%', transform: `translateY(${mix(showAns, 14, 0)}px) scale(${Math.min(1, b.h / CARD.h)})` }}>
          <div style={{ fontFamily: fonts.inter, fontWeight: 600, fontSize: 250, letterSpacing: '-0.03em', lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' }}>
            +<Odometer value={18} from={0} start={T.answer + 6} dur={26} sep="" /> %
          </div>
          <div style={{ ...voice, fontSize: 84, color: MUTED, marginTop: 30 }}>
            new land since 2000
          </div>
        </div>
      )}
    </div>
  );
};

// the years ride the compare divider on one paper plate, large; when the divider whips off, the plate glides to the
// centre and becomes the proof's year: back to 2000 as the camera lands on the sandbank, then one year per step
const YEAR_FS = 104;
const YW = 300; // one year's half of the plate
const yearText: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 560, fontSize: YEAR_FS, letterSpacing: '-0.025em', lineHeight: 1, fontVariantNumeric: 'tabular-nums', width: YW, textAlign: 'center' };
const Years: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.compare || f >= T.flip) return null;
  const born = at(f, T.compare + 4, 10, ease.out);
  const sxDiv = toScreenX(f, clamp(split(f), 0, 1) * 1920);
  const glide = at(f, T.proof - 4, 16, ease.inOut);
  const single = at(f, T.proof - 4, 10, ease.out);
  const x = f < T.proof - 4 ? sxDiv : mix(glide, toScreenX(T.proof - 4, 0.42 * 1920), 960);
  const k = T.grow.filter((g) => onTwos(f) >= g).length - 1;
  const year = f < T.land ? '2026' : GROW_YEARS[Math.max(0, k)];
  const w = mix(single, YW * 2 + 2, YW);
  const y = 880;
  return (
    <div style={{ position: 'absolute', left: x - w / 2, top: y - 74 + mix(born, 200, 0), width: w, height: 148, borderRadius: 74, background: PAPER, boxShadow: softShadow(4, '#86AEBB'), display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      {f < T.proof - 4 ? (
        <>
          <div style={{ ...yearText, color: INK }}>2000</div>
          <div style={{ width: 2, height: 84, background: '#C9D0D3' }} />
          <div style={{ ...yearText, color: SEA }}>2026</div>
        </>
      ) : (
        <div style={{ ...yearText, color: year === '2026' ? SEA : INK }}>{year}</div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------- 8. the finding, giant, on the duotone world
const Finding: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + 0.035 * creep(f, T.flip, T.lock - T.flip);
  // leaves accelerating as the paper closes in, at full speed on its last frame
  const out = accel(f, T.lock - 5, 6, 1.6);
  return (
    <AbsoluteFill style={{ transform: `translateY(${out * 760}px) scale(${push})`, transformOrigin: '50% 70%' }}>
      <div style={{ position: 'absolute', top: 620, width: '100%', textAlign: 'center', fontFamily: fonts.inter, fontWeight: 600, fontSize: 230, letterSpacing: '-0.035em', lineHeight: 1, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        +3.4 km²
      </div>
      <div style={{ position: 'absolute', top: 878, width: '100%', textAlign: 'center', ...voice, fontSize: 80, color: '#FFFFFF' }}>
        <Words text="Great Bahama Bank" start={T.flipLine} arrive="rise" gap={2} dur={8} style={{ color: '#FFFFFF' }} />
      </div>
    </AbsoluteFill>
  );
};

// the duotone world is lit: one broad light of its own hue over the sand, the lower half kept deep so the white figure
// reads (screen space, clipped with the picture, so in the lockup it is seen only inside the letters)
const FlipLight: React.FC = () => {
  const f = useCurrentFrame();
  const o = at(f, T.flip, 8, ease.out);
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background:
          'radial-gradient(ellipse 70% 60% at 62% 22%, rgba(120,190,220,.22), rgba(120,190,220,0) 70%), linear-gradient(180deg, rgba(4,32,47,0) 35%, rgba(4,32,47,.82) 100%)',
      }}
    />
  );
};

// ---------------------------------------------------------------- 9. lockup: out of a letter
// The picture the camera is in turns out to be the inside of "fieldnote": from the lockup on, the picture is clipped to
// the wordmark's outline (wordmark.ts), which shrinks from 44x round a point where the f's crossbar meets its stem, so on
// the first frame the whole frame is inside the letter; the clean paper is behind it. The letters drain to ink, and on
// the music's last lift the dot of the i, the pin of the place, takes the sea blue.
const WORD = { lx: 452, ly: 511 }; // the f's crossbar meets its stem (wordmark.ts: 300 px, baseline 649)
const TITTLE = { x: 532.35, y: 451.9, r: 23 }; // the dot of the i in wordmark.ts
const lockScale = (f: number) => logScale(44, 1, at(f, T.lock, 30, ease.out)) * (1 + 0.025 * creep(f, T.lock + 26, T.end - T.lock - 26));
const pathTokens = (d: string) => d.match(/[MLHVCQZ]|-?\d*\.?\d+/g) ?? [];
const WM_TOKENS = pathTokens(WORDMARK_PATH);
/** The wordmark's outline scaled by s round the pivot, as path data in screen px (for a CSS clip-path or an SVG path). */
const wordPathAt = (s: number, tokens: string[] = WM_TOKENS) => {
  let out = '';
  let cmd = '';
  let n = 0;
  for (const t of tokens) {
    if (/[A-Z]/.test(t)) {
      cmd = t;
      n = 0;
      out += t;
      continue;
    }
    const v = parseFloat(t);
    const isX = cmd === 'H' || (cmd !== 'V' && n % 2 === 0);
    out += `${(isX ? WORD.lx + (v - WORD.lx) * s : WORD.ly + (v - WORD.ly) * s).toFixed(1)} `;
    n++;
  }
  return out;
};
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const drain = at(f, T.drain, 8, ease.inOut);
  const s = lockScale(f);
  const pin = at(f, T.lift, 8, ease.out);
  const pinPop = 1 + 0.35 * (1 - at(f, T.lift, 10, ease.out)) * (f >= T.lift ? 1 : 0);
  return (
    <AbsoluteFill>
      {drain > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
          <path d={wordPathAt(s)} fill={INK} opacity={drain} />
          {pin > 0 && (
            <circle
              cx={WORD.lx + (TITTLE.x - WORD.lx) * s}
              cy={WORD.ly + (TITTLE.y - WORD.ly) * s}
              r={TITTLE.r * s * pinPop + 0.6}
              fill={SEA}
            />
          )}
        </svg>
      )}
      <div style={{ position: 'absolute', top: 700, width: '100%', textAlign: 'center', ...voice, fontSize: 100, color: MUTED }}>
        <Words text="fieldnote.earth" start={T.url} arrive="rise" style={{ color: MUTED }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the film
export const FieldnoteFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  // the key sounds follow the typed words; the burst lands as one louder key
  const keysAt = [...new Set(typingTimes(QUESTION, T.type, 30, 24, 3, BURST))];
  const burstAt = keysAt[keysAt.length - 2] ?? T.type;
  // Sound (study 2026-11-25): dry, soft and few. No chimes, tones, bubbles, swells or booms; the ending is music only.
  const cues = [
    ...[0, 4].map((c, i) => ({ at: c, ...s['mixkit-2384'], volume: 0.25, rate: 0.88 + i * 0.1 })),
    ...[14, 22, 30].map((c, i) => ({ at: c, ...s['kenney-interface-tick_001'], volume: 0.22, rate: 0.95 + i * 0.05 })),
    { at: T.converge + 2, ...s['mixkit-175'], volume: 0.3 },
    { at: T.earth, ...s['mixkit-168'], volume: 0.3 },
    { at: T.earth, ...s['kenney-rpg-footstep05'], volume: 0.7 },
    ...T.swaps.slice(1).map((c, i) => ({ at: c, ...s['kenney-interface-tick_001'], volume: 0.28, rate: 1 + i * 0.08 })),
    { at: T.ask, ...s['kenney-rpg-cloth1'], volume: 0.5 },
    { at: T.ask + 2, ...s['mixkit-2384'], volume: 0.25, rate: 0.8 },
    ...keysAt.filter((k) => k < burstAt).map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.16, rate: 0.95 + (i % 3) * 0.05 })),
    { at: burstAt, ...s['mixkit-2533'], volume: 0.26, rate: 0.9 },
    { at: T.send, ...s['kenney-interface-click_001'], volume: 0.55 },
    { at: T.send + 4, ...s['mixkit-175'], volume: 0.25 },
    { at: T.find, ...s['mixkit-3124'], volume: 0.4 },
    { at: T.answer + 8, ...s['kenney-interface-bong_001'], volume: 0.3 },
    { at: T.compare + 4, ...s['mixkit-175'], volume: 0.3 },
    // the proof: the whip, the landing, a soft tick on every other growth step
    { at: T.proof, ...s['mixkit-168'], volume: 0.3 },
    { at: T.land, ...s['mixkit-3124'], volume: 0.3, rate: 0.85 },
    ...[0, 2, 4].map((k, i) => ({ at: T.grow[k], ...s['kenney-interface-tick_001'], volume: 0.24 + 0.03 * i, rate: 0.95 + i * 0.08 })),
    // the colour flip on the beat; from the lockup on, the music alone
    { at: T.flip, ...s['kenney-rpg-footstep05'], volume: 0.6 },
  ];
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {f < T.earth + 3 && <Tiles />}
      {f >= T.earth && f < T.ask + 2 && <Earth />}
      {f >= T.ask && (
        <AbsoluteFill style={{ clipPath: f >= T.lock ? `path('${wordPathAt(lockScale(f))}')` : undefined }}>
          <Stage />
          {/* grain on the photograph only, never on the paper */}
          {f < T.lock && <Grain amount={0.03} force />}
          <Panel />
          <Years />
          {f >= T.flip && <FlipLight />}
        </AbsoluteFill>
      )}
      {f >= T.lock && <Lockup />}
      {f >= T.flip && f < T.lock + 8 && <Finding />}
      {/* the music's lift moved with the film: 36 f earlier than before, so it starts 1.2 s later in the track */}
      <Music src="music/sonor-01.mp3" startFrom={21.74} volume={0.4} enterAt={0} breaths={[T.flip, T.lock]} breathLen={6} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const fieldnoteDuration = T.end;
