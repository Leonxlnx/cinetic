// "Fieldnote": the v2 rework. ~15.3 s at 30 fps. An invented product (ask any question about any place on Earth,
// answered from satellite imagery). World: editorial paper, bare photo tiles with mono coordinates, one sans voice (Inter:
// statements, labels and the UI; bold only for the window device, Earth and the wordmark), one cobalt accent that means
// "found / changed". The editorial feel lives in the layout and the photography, not in a second face.
// Grounds: paper (base), the photograph (after the dive), cobalt (the picture in a cobalt duotone, the found sand left in
// its own colour), paper again around the wordmark. Pictures: NASA / ISS crew Earth observations (public domain).
//
// DEVICES (the claim: any place, answered from the picture itself)
// - signature: letters as windows onto the earth, 4 uses: "Earth" with a new place inside every 8 f (the hook and the
//   spectacle), the dive into the stem of its h (seam), the found sand kept as a window of true colour in the cobalt
//   world (the proof), the paper closing round the picture until it is the wordmark (the lockup)
// - opening: a stepped mosaic of 140 places, already moving on frame 0, collapsing into the centre
// - type treatment: a picture inside the line (letters as windows), on the giant word and the wordmark
// - text arrivals: masked rise (the lead-in, the line under the figure, the CTA); typing with a burst (the UI)
// - seams: 0-1 converge, the mosaic collapses into the word | 1-2 dive into the h (the picture becomes the ground) |
//   2-3 a paper plate rises over the picture | 3-4 / 5-6 the one panel morphs (plate -> bar -> card) | 4-5 punch-ins with
//   a whip | 6-7 the card leaves left as the divider sweeps | 7-8 the divider whips off and the camera travels to the
//   sandbank (one shot) | 8-9 colour-flip cut with a size step: cobalt leaves the sand and takes the world (ground cut,
//   the picture -> cobalt), the camera a size up | 9-10 out of a letter: the paper closes round the picture until it
//   is the wordmark (ground cut, cobalt -> paper)
// - spectacle: imagery in type, "Earth" at 650 px with a new place inside every 8 f, 1.5 s
// - output-big: "+18 %" at 250 px on the answer; the proof's "+3.4 km²" at 230 px on the found sand
// - proof: the sandbank traced from the photograph itself, lit cobalt in five steps from its 2000 cores to 2026
// - integrations: none (the brief hinges on places, not partners)
// - lockup: out of a letter, the cobalt picture the camera has been in is the inside of "fieldnote"; it drains to ink
//   on the music's last lift
//
// Beats (composition tag in brackets; no two neighbours share one):
//   0  quantity      a wall of a hundred and forty places, the camera travelling across it and pulling back while big
//                    out-of-focus tiles race past in front; the wall collapses into the centre
//   1  giant-type    SPECTACLE (1.5 s): Earth as windows, a new place in the letters every 0.27 s, coordinates under it
//   2  macro         the dive into the stem of the h: the frame ends up inside the picture
//   3  type-on-surf  the question on a paper plate over the photo: three words typed, the rest lands at once
//   4  full-ui       the plate shrinks into the input bar, send, a scan line reads 26 years of the picture
//   5  macro         the camera punches in on each finding (selection + label), whip between them
//   6  full-ui       OUTPUT-BIG: the bar grows into the answer card: +18 % new land, the years stepping up as bars
//   7  split         before / after: the divider sweeps twice, giant years ride with it, the camera pulls out
//   8  macro         PROOF (1.6 s): the divider whips off, the camera travels into the sandbank; the year tab turns
//                    back to 2000 and steps to 2026 while the sand traced from the picture lights cobalt, a step every
//                    4-5 f, the camera pushing in
//   9  giant-type    colour-flip with a size step: the world goes cobalt, the found sand stays in its own colour,
//                    "+3.4 km²" at 230 px, "Great Bahama Bank" rises under it (0.7 s)
//  10  object        LOCKUP (2 s): the paper closes round the cobalt picture until it is the wordmark (the found sand
//                    in its own colour inside the "note"); it drains to ink on the music's lift; the CTA rises
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
  mixColor,
  Music,
  Odometer,
  onTwos,
  Photo,
  rand,
  Selection,
  TextWindow,
  Typing,
  typingTimes,
  useTextWidth,
  Words,
  type CamKey,
  type Grade,
} from '../../kit';
import { sfx } from '../../sfx';
import { SAND_LEVELS } from './sandbank';
import { WORDMARK_PATH, WORDMARK_UNION } from './wordmark';

// ---------------------------------------------------------------- world
const PAPER = '#EDEAE3';
const INK = '#121212';
const COBALT = '#2347FF';
const MUTED = '#5E5A52';
// one voice: Inter for statements (480), labels and UI (sentence case, 0 tracking at UI sizes); mono only for coordinates
// and code as written; bold (700, never heavier) only where letters are windows onto a picture
const voice: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 480, letterSpacing: '-0.015em', color: INK };
const mono: React.CSSProperties = { fontFamily: fonts.mono, letterSpacing: '0', color: MUTED };
const heavy: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 700, letterSpacing: '-0.04em' };
/** A small label in the UI face (a status chip, a selection's tag, a caption): sentence case, never mono capitals. */
const tag: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 520, letterSpacing: '0', fontVariantNumeric: 'tabular-nums' };
const GRADE: Grade = { dark: '#2B2118', light: '#F1E9DA', look: 'saturate(1.05) contrast(1.04)' };

const IMG = {
  delta: 'img/earth-observations-taken-by-the-expedition.jpg',
  channels: 'img/earth-observations-taken-by-expedition-26.jpg',
  islands: 'img/seaweed-farms-in-south-korea.jpg',
  clouds: 'img/cloud-streets-over-the-bering-sea.jpg',
};
const POS = '46% 40%'; // the one crop of the Bahamas picture the whole middle of the film lives in

const S = 158; // the plate shrinks into the bar: everything after it hangs off this frame
const T = {
  tiles: 0,
  converge: 44,
  earth: 54,
  swaps: [54, 62, 70, 78],
  kicker: 58,
  dive: 100,
  ask: 116,
  plate: 118,
  type: 126,
  shrink: S,
  send: S + 16,
  scan: S + 18,
  find1: S + 32,
  find2: S + 54,
  answer: S + 74,
  cardOut: S + 114,
  compare: S + 126,
  // the proof: the divider whips off (the 2026 picture fills the frame on the beat), the camera travels to the sandbank
  proof: S + 172,
  wipeEnd: S + 176,
  // the camera lands, then the sand lights in steps on the stepped clock: the 2000 cores outlined, then four cobalt
  // steps (5, 5, 4, 5 f); the last lands 10 f before the flip
  land: S + 186,
  grow: [S + 190, S + 195, S + 200, S + 204, S + 209],
  flip: S + 219, // colour-flip cut with a size step, on the beat (ground cut: the picture -> cobalt)
  flipLine: S + 222,
  lock: S + 240, // on the beat: the paper closes round the picture (ground cut: cobalt -> paper)
  url: S + 270,
  drain: S + 283, // the music's last lift
  end: S + 300,
} as const;
const GROW_YEARS = ['2000', '2006', '2013', '2020', '2026'];

// ---------------------------------------------------------------- 0. the wall of places (the spectacle)
const PLACES = [
  { src: IMG.channels, cap: (i: number) => `${(24.6 + (i % 5) * 0.13).toFixed(2)}°N  ${(77.4 + (i % 3) * 0.21).toFixed(2)}°W` },
  { src: IMG.islands, cap: (i: number) => `${(34.4 + (i % 4) * 0.11).toFixed(2)}°N  ${(126.6 + (i % 3) * 0.17).toFixed(2)}°E` },
  { src: IMG.clouds, cap: (i: number) => `${(57.9 + (i % 4) * 0.19).toFixed(2)}°N  ${(175.8 + (i % 5) * 0.23).toFixed(2)}°W` },
  { src: IMG.delta, cap: (i: number) => `${(21.2 + (i % 3) * 0.14).toFixed(2)}°N  ${(39.0 + (i % 4) * 0.09).toFixed(2)}°E` },
];
const TW = 340;
const TH = 212;
const TG = 26;
const COLS = 16;
const ROWS = 9;
// the camera over the wall: travelling right-to-left across it while pulling back from 1.35x to 0.6x
const wallCam = (f: number) => {
  const travel = at(f, 0, 50, ease.out); // already moving at frame 0
  const pull = at(f, 0, 50, ease.inOut);
  return { x: mix(travel, 1150, -560), y: mix(travel, 190, -70), z: logScale(1.35, 0.6, pull), travel };
};
// light from above: a warm contact shadow on the paper, a lit top edge, a faint fall-off down the face
const tileLight: React.CSSProperties = { boxShadow: '0 2px 3px rgba(43,33,24,.3), 0 26px 44px -16px rgba(43,33,24,.5)' };
const TileSheen: React.FC = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.16), rgba(255,255,255,0) 32%, rgba(20,14,8,.12))', boxShadow: 'inset 0 1.5px 0 rgba(255,255,255,.55)' }} />
);

const Wall: React.FC = () => {
  const f = useCurrentFrame();
  const fs = onTwos(f, 2); // the tiles live on a stepped clock: they cut on and flip, they never slide in
  const cam = wallCam(f);
  const q = accel(f, T.converge, T.earth + 2 - T.converge, 1.4);
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const wx = (c - (COLS - 1) / 2) * (TW + TG);
      const wy = (r - (ROWS - 1) / 2) * (TH + TG);
      let sx = 960 + (wx - cam.x) * cam.z;
      let sy = 540 + (wy - cam.y) * cam.z;
      const half = (TW / 2) * cam.z;
      if (sx < -half - 20 || sx > 1920 + half + 20 || sy < -half - 20 || sy > 1080 + half + 20) continue;
      // the wave of arrivals starts at the first view and races outwards ahead of the camera
      const d = Math.hypot(wx - 1150, (wy - 190) * 1.4) / 2600;
      const s = onTwos(Math.round(-18 + d * 26));
      if (fs < s) continue;
      const flips = Math.floor(Math.max(0, fs - s + (i % 4) * 2) / 8);
      const k = (i * 3 + flips) % PLACES.length;
      const pl = PLACES[k];
      const j = at(f, s + flips * 8, 5, ease.snap);
      sx = mix(q, sx, 960);
      sy = mix(q, sy, 540);
      const sc = cam.z * mix(j, 1.05, 1) * mix(q, 1, 0.2);
      tiles.push(
        <div key={i} style={{ position: 'absolute', left: sx - TW / 2, top: sy - TH / 2, width: TW, height: TH, transform: `scale(${sc})`, filter: q > 0.05 ? `blur(${q * 16}px)` : undefined, ...tileLight }}>
          <Photo src={pl.src} w={TW} h={TH} grade={GRADE} develop={(i + flips) % 5 === 0 ? 0 : 1} position={`${15 + rand(i * 3 + k) * 70}% ${15 + rand(i * 5 + k + 2) * 60}%`} zoom={0.5 + rand(i + k) * 0.6} start={-100} dur={1} />
          <TileSheen />
          <div style={{ position: 'absolute', left: 0, bottom: 0, background: PAPER, padding: '6px 10px 4px', ...mono, fontSize: 19, color: INK }}>{pl.cap(i)}</div>
        </div>,
      );
    }
  return <AbsoluteFill>{tiles}</AbsoluteFill>;
};

// the near plane: big tiles out of focus racing past the corners at twice the wall's speed
const FRONT = [
  { x: 260, y: -40, i: 2 },
  { x: 1500, y: 1010, i: 5 },
  { x: 2350, y: 10, i: 1 },
  { x: 3250, y: 1040, i: 7 },
  { x: 4000, y: -20, i: 3 },
];
const NearTiles: React.FC = () => {
  const f = useCurrentFrame();
  const cam = wallCam(f);
  const out = accel(f, T.converge - 4, T.earth - T.converge + 4, 1.4);
  return (
    <AbsoluteFill>
      {FRONT.map((t) => {
        const x = t.x - cam.travel * 3500 + (t.x - 960) * out * 1.2;
        const y = t.y + (t.y - 540) * out * 1.2;
        const sc = mix(cam.travel, 1.25, 0.95);
        if (x < -700 || x > 2620) return null;
        const pl = PLACES[t.i % PLACES.length];
        return (
          <div key={t.x} style={{ position: 'absolute', left: x - 330, top: y - 206, width: 660, height: 412, transform: `scale(${sc})`, filter: 'blur(11px)', boxShadow: '0 40px 80px -20px rgba(43,33,24,.55)' }}>
            <Photo src={pl.src} w={660} h={412} grade={GRADE} position={`${20 + rand(t.i) * 60}% ${20 + rand(t.i + 4) * 60}%`} zoom={0.7} start={-100} dur={1} />
            <TileSheen />
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
  { src: IMG.islands, pos: '30% 30%', cap: '34.62°N  126.91°E · South Jeolla' },
  { src: IMG.clouds, pos: '45% 95%', cap: '58.21°N  176.40°W · Bering Sea' },
  { src: IMG.delta, pos: '60% 40%', cap: '21.43°N  39.12°E · Red Sea coast' },
  { src: IMG.channels, pos: '', cap: '25.04°N  77.62°W · Great Bahama Bank' },
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
      <div style={{ position: 'absolute', top: 118, width: '100%', textAlign: 'center', ...voice, fontSize: 104, opacity: 1 - dive * 4 }}>
        <Words text="Ask anything about" start={T.kicker} arrive="rise" gap={3} style={{ color: INK }} leaveAt={T.dive - 4} leave="rise" leaveDur={8} />
      </div>
      <div style={{ position: 'absolute', top: 846, width: '100%', textAlign: 'center', ...tag, fontWeight: 500, fontSize: 36, color: INK, opacity: clamp(inn * 3) * (1 - dive * 4) }}>
        <span style={{ background: k === 3 ? COBALT : 'transparent', color: k === 3 ? '#fff' : INK, padding: '6px 16px' }}>{sw.cap}</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3-7. the photo: ask, read, find, answer, compare
// findings on the 1920x1080 photo (world px of the stage)
const A = { x: 1250, y: 122, w: 650, h: 336 }; // the sandbank (the outlines in sandbank.ts sit inside it)
const B = { x: 1004, y: 470, w: 196, h: 318 }; // the new channel
const aim = (x: number, y: number, z: number) => {
  // keep the frame inside the picture at zoom z
  const cx = clamp(x, 960 / z, 1920 - 960 / z);
  const cy = clamp(y, 540 / z, 1080 - 540 / z);
  return { x: cx - 960, y: cy - 540, zoom: z };
};
const CAM: CamKey[] = [
  { f: T.ask, zoom: 1 },
  { f: T.shrink, zoom: 1.16, curve: ease.glide },
  { f: T.find1, zoom: 1.19, curve: ease.inOut },
  { f: T.find1 + 10, ...aim(A.x + A.w / 2, A.y + A.h / 2, 1.85), curve: ease.out },
  { f: T.find2, ...aim(A.x + A.w / 2, A.y + A.h / 2, 1.92), curve: ease.out },
  { f: T.find2 + 8, ...aim(B.x + B.w / 2, B.y + B.h / 2, 2.05), curve: ease.inOut },
  { f: T.answer, ...aim(B.x + B.w / 2, B.y + B.h / 2, 2.12), curve: ease.out },
  { f: T.answer + 18, zoom: 1.08, curve: ease.out },
  { f: T.compare, zoom: 1.12, curve: ease.out },
  // the camera pulls out while the divider sweeps, then travels to the sandbank as the divider whips off
  { f: T.compare + 34, zoom: 1, curve: ease.inOut },
  { f: T.proof - 4, zoom: 1.006, curve: ease.out },
  { f: T.land, ...aim(1600, 280, 1.8), curve: ease.inOut },
  { f: T.flip - 1, ...aim(1600, 280, 1.93), curve: ease.out },
  // the colour flip is a cut with a size step; then the paper closes in while the picture pulls back behind it
  { f: T.flip, cut: true, ...aim(1580, 400, 2.4) },
  { f: T.lock, ...aim(1580, 400, 2.5), curve: ease.out },
  // at rest the found sand sits behind "ldnote", so the mark holds the finding in its own colour
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
const toScreen = (f: number, wx: number, wy: number) => {
  const c = camAt(f, CAM);
  return { x: 960 + c.zoom * (wx - 960 - c.x), y: 540 + c.zoom * (wy - 540 - c.y) };
};
const toScreenX = (f: number, wx: number) => toScreen(f, wx, 540).x;

const Graticule: React.FC = () => {
  const f = useCurrentFrame();
  const p = at(f, T.scan, 22, ease.inOut);
  const y = mix(p, -10, 1090);
  if (f < T.scan) return null;
  const lines: React.ReactNode[] = [];
  for (let x = 120; x < 1920; x += 160) lines.push(<div key={`x${x}`} style={{ position: 'absolute', left: x, top: 0, width: 1, height: 1080, background: 'rgba(255,255,255,.28)' }} />);
  for (let yy = 60; yy < 1080; yy += 160) lines.push(<div key={`y${yy}`} style={{ position: 'absolute', left: 0, top: yy, width: 1920, height: 1, background: 'rgba(255,255,255,.28)' }} />);
  const out = 1 - at(f, T.answer, 16, ease.inOut);
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <AbsoluteFill style={{ clipPath: `inset(0 0 ${Math.max(0, 1080 - y)}px 0)` }}>{lines}</AbsoluteFill>
      {p < 1 && <div style={{ position: 'absolute', left: 0, top: y - 2, width: 1920, height: 4, background: COBALT, boxShadow: `0 0 24px 6px ${COBALT}88` }} />}
    </AbsoluteFill>
  );
};

const label = (text: string): React.ReactNode => <span>{text}</span>;
const labelStyle: React.CSSProperties = { ...tag, color: '#fff', fontSize: 30, background: COBALT, padding: '7px 14px', top: -56 };

// the before/after picture at stage size (the stage during the compare)
const Picture: React.FC<{ split: number }> = ({ split: sp }) => (
  <Compare
    w={1920}
    h={1080}
    split={sp}
    before={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} develop={0} position={POS} zoom={0} />}
    after={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} position={POS} zoom={0} />}
  />
);

// ---------------------------------------------------------------- 8. the proof: the sand traced from the picture
// Five nested outlines of the bright sand (sandbank.ts): the 2000 cores outlined in white, then the new land lights
// cobalt outwards in four steps on the stepped clock, the newest ring flaring as it lands. Drawn in stage px, under the
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
          {/* the earlier extent stays a deeper cobalt, the step that just landed is lighter and flares */}
          {k >= 2 && <path d={SAND_LEVELS[k - 1]} fill={COBALT} fillOpacity={0.62} fillRule="evenodd" />}
          <path d={SAND_LEVELS[k]} fill={COBALT} fillOpacity={0.42 + 0.3 * pop} fillRule="evenodd" stroke="#E4E9FF" strokeWidth={2 + 2.5 * pop} strokeLinejoin="round" />
        </>
      )}
      <path d={SAND_LEVELS[0]} fill="rgba(255,255,255,.4)" fillRule="evenodd" stroke="#FFFFFF" strokeWidth={2.4} strokeLinejoin="round" />
    </svg>
  );
};

// the colour flip: the whole picture in a cobalt duotone except the found sand, which keeps its own colour (a hole in the
// duotone layer, traced from the picture); the lockup's letters are windows onto this same picture
const DUO: Grade = { dark: '#030A40', light: '#2943D5' };
const HOLE = `path(evenodd, 'M-3000 -3000 H5000 V5000 H-3000 Z ${SAND_LEVELS[4]}')`;
const SandShade: React.FC = () => {
  const f = useCurrentFrame();
  const o = at(f, T.lock + 4, 10, ease.inOut) * 0.3;
  return o > 0 ? <path d={SAND_LEVELS[4]} fill="#2B2118" fillOpacity={o} fillRule="evenodd" /> : null;
};
const Flipped: React.FC = () => (
  <>
    <AbsoluteFill style={{ clipPath: HOLE }}>
      <Photo src={IMG.channels} w={1920} h={1080} grade={DUO} develop={0} position={POS} zoom={0} />
    </AbsoluteFill>
    {/* the found sand's lit rim; on the paper of the lockup the sand takes a warm shade so the letters it fills still read */}
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
      <SandShade />
      <path d={SAND_LEVELS[4]} fill="none" stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={1.6} strokeLinejoin="round" />
    </svg>
  </>
);

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const comparing = f >= T.compare && f < T.wipeEnd;
  const sel = 1 - at(f, T.cardOut, 10, ease.in);
  return (
    <Camera keys={CAM}>
      <AbsoluteFill style={{ filter: f < T.ask + 8 ? `blur(${landBlur(f, T.ask, 12, 8)}px)` : undefined }}>
        {!comparing ? <Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} position={POS} zoom={0} /> : <Picture split={split(f)} />}
        <Graticule />
        {sel > 0 && (
          <div style={{ opacity: sel }}>
            <Selection {...A} start={T.find1} color="#FFFFFF" label={label('Sandbank +3.4 km²')} labelStyle={labelStyle} />
            <Selection {...B} start={T.find2} color="#FFFFFF" label={label('New channel 6.1 km')} labelStyle={labelStyle} />
          </div>
        )}
        {f >= T.grow[0] && f < T.flip && <Growth />}
        {f >= T.flip && <Flipped />}
      </AbsoluteFill>
    </Camera>
  );
};

// the one panel: a paper plate with the question -> the input bar -> the answer card
type Box = { x: number; y: number; w: number; h: number; r: number };
const PLATE: Box = { x: 70, y: 600, w: 1780, h: 380, r: 6 };
const BAR: Box = { x: 340, y: 930, w: 1240, h: 100, r: 50 };
const CARD: Box = { x: 70, y: 70, w: 1100, h: 860, r: 30 };
const lerpBox = (a: Box, b: Box, p: number): Box => ({ x: mix(p, a.x, b.x), y: mix(p, a.y, b.y), w: mix(p, a.w, b.w), h: mix(p, a.h, b.h), r: mix(p, a.r, b.r) });
const QUESTION = 'How has this coast changed since 2000?';
const Q_FS = 84; // seven words on the plate: one line at the low end of the statement sizes, centred in the plate
const BURST = 3; // type "How has this", then the rest lands at once
const YEARS = [
  { y: '2000', v: 0 },
  { y: '2005', v: 3 },
  { y: '2010', v: 7 },
  { y: '2015', v: 10 },
  { y: '2020', v: 14 },
  { y: '2026', v: 18 },
];

const Panel: React.FC = () => {
  const f = useCurrentFrame();
  const qW = useTextWidth(QUESTION, { ...voice, fontSize: Q_FS });
  if (f < T.plate || f > T.compare + 2) return null;
  const rise = at(f, T.plate, 14, ease.out);
  const p1 = at(f, T.shrink, 14, ease.inOut);
  const p2 = at(f, T.answer, 16, ease.inOut);
  const out = accel(f, T.cardOut, T.compare - T.cardOut, 1.45);
  const b = lerpBox(lerpBox(PLATE, BAR, p1), CARD, p2);
  const bg = mixColor(PAPER, '#FFFFFF', p1);
  const press = at(f, T.send, 4, ease.out) - at(f, T.send + 4, 10, ease.out);
  // the question: one text that shrinks from the plate into the bar, then becomes the card's header
  const qSize = mix(p2, mix(p1, Q_FS, 44), 32);
  const qx = mix(p2, mix(p1, Math.max(64, (PLATE.w - qW) / 2), 46), 56);
  const qy = mix(p2, mix(p1, (PLATE.h - Q_FS * 1.25) / 2, (BAR.h - 44 * 1.25) / 2), 38);
  const sent = at(f, T.send + 2, 8);
  const qColor = mixColor(INK, MUTED, Math.max(sent * 0.6, p2));
  const showAns = at(f, T.answer + 8, 6);
  const year = 2000 + Math.round(26 * at(onTwos(f), T.scan, 22, ease.inOut));
  return (
    <>
      {f >= T.send && f < T.answer + 6 && (
        <div style={{ position: 'absolute', left: BAR.x + 10, top: BAR.y - 70, ...tag, fontSize: 34, lineHeight: 1.2, color: '#fff', background: f >= T.find2 + 6 ? COBALT : INK, padding: '6px 16px', opacity: 1 - p2 * 3, transform: `translateY(${mix(at(f, T.send, 8, ease.out), 20, 0)}px)` }}>
          {f < T.find1 ? `Reading ${year}` : f < T.find2 + 6 ? `Reading 2000 → 2026 · 1 change` : '2 changes found'}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: b.x,
          top: b.y + mix(rise, 380, 0),
          width: b.w,
          height: b.h,
          borderRadius: b.r,
          background: p2 > 0 ? `rgba(255,255,255,${mix(p2, 1, 0.9)})` : bg,
          backdropFilter: p2 > 0 ? 'blur(22px) saturate(1.2)' : undefined,
          boxShadow: `0 1px 0 rgba(255,255,255,.7) inset, 0 30px 70px -20px rgba(10,20,40,${mix(p1, 0.45, 0.5)})`,
          overflow: 'hidden',
          transform: `translateX(${-out * 1300}px)`,
          filter: out > 0.05 ? `blur(${out * 14}px)` : undefined,
        }}
      >
        <div style={{ position: 'absolute', left: qx, top: qy, ...voice, fontSize: qSize, lineHeight: 1.25, color: qColor, whiteSpace: 'nowrap' }}>
          {f < T.shrink ? <Typing text={QUESTION} start={T.type} cps={24} burst={BURST} caretColor={COBALT} /> : QUESTION}
        </div>
        {/* the send button grows out of the bar's right end */}
        {p1 > 0 && p2 < 1 && (
          <div style={{ position: 'absolute', right: 18, top: 18, width: 64, height: 64, borderRadius: 32, background: COBALT, display: 'flex', alignItems: 'center', justifyContent: 'center', transform: `scale(${clamp((p1 - 0.5) * 2) * (1 - press * 0.14)})`, opacity: 1 - p2 * 3 }}>
            <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </div>
        )}
        {showAns > 0 && (
          <div style={{ position: 'absolute', left: 56, top: 132, width: CARD.w - 112, opacity: showAns, transform: `translateY(${mix(showAns, 16, 0)}px)` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 26 }}>
              <div style={{ fontFamily: fonts.inter, fontWeight: 640, fontSize: 250, letterSpacing: '-0.03em', lineHeight: 1, color: INK }}>
                +<Odometer value={18} from={0} start={T.answer + 10} dur={30} sep="" />%
              </div>
              <div style={{ fontFamily: fonts.inter, fontWeight: 540, fontSize: 72, letterSpacing: '-0.015em', color: COBALT, lineHeight: 1.05 }}>
                new
                <br />
                land
              </div>
            </div>
            <div style={{ fontFamily: fonts.inter, fontWeight: 450, fontSize: 40, lineHeight: 1.3, color: '#3D3A35', marginTop: 18 }}>Tides built 3.4 km² of sandbank and cut one new channel.</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 30, height: 196, marginTop: 34 }}>
              {YEARS.map((yr, i) => {
                const g = at(onTwos(f), T.answer + 14 + i * 4, 8, ease.out);
                return (
                  <div key={yr.y} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-end', height: '100%' }}>
                    <div style={{ height: mix(g, 4, 10 + (yr.v / 18) * 140), background: i === YEARS.length - 1 ? COBALT : '#CBC5B9', borderRadius: 4 }} />
                    <div style={{ ...mono, fontSize: 24, marginTop: 10, textAlign: 'center', color: i === YEARS.length - 1 ? COBALT : MUTED }}>{yr.y}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// giant years that ride with the compare divider (sx: the divider's x in the layer they sit in)
const yearTab: React.CSSProperties = { position: 'absolute', top: 96, background: PAPER, padding: '4px 26px 10px', fontFamily: fonts.inter, fontWeight: 620, fontSize: 132, letterSpacing: '-0.025em', lineHeight: 1, color: INK, fontVariantNumeric: 'tabular-nums' };
// The 2026 tab rides the divider; when the divider whips off the left edge it parks there and becomes the proof's
// year counter: back to 2000 as the camera lands on the sandbank, then one year per growth step, on the same frames.
const Years: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.compare || f >= T.flip) return null;
  const sx = toScreenX(f, split(f) * 1920);
  const k = T.grow.filter((g) => onTwos(f) >= g).length - 1;
  const year = k < 0 ? '2026' : GROW_YEARS[k];
  const born = at(f, T.compare + 2, 8, ease.out);
  return (
    <>
      {sx > -400 && <div style={{ ...yearTab, right: 1920 - sx + 26 }}>2000</div>}
      <div style={{ ...yearTab, left: Math.max(26, sx + 26), color: year === '2026' ? COBALT : INK, transform: `translateY(${mix(born, -160, 0)}px)` }}>{year}</div>
    </>
  );
};

// ---------------------------------------------------------------- 9. the finding, giant, on the cobalt world
const Finding: React.FC = () => {
  const f = useCurrentFrame();
  const push = 1 + 0.035 * creep(f, T.flip, T.lock - T.flip);
  // leaves accelerating as the paper closes in, at full speed on its last frame
  const out = accel(f, T.lock - 5, 6, 1.6);
  return (
    <AbsoluteFill style={{ transform: `translateY(${out * 760}px) scale(${push})`, transformOrigin: '50% 70%', filter: out > 0.05 ? `blur(${out * 14}px)` : undefined }}>
      <div style={{ position: 'absolute', top: 650, width: '100%', textAlign: 'center', fontFamily: fonts.inter, fontWeight: 640, fontSize: 230, letterSpacing: '-0.035em', lineHeight: 1, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        +3.4 km²
      </div>
      <div style={{ position: 'absolute', top: 900, width: '100%', textAlign: 'center', ...voice, fontSize: 76, color: '#FFFFFF' }}>
        <Words text="Great Bahama Bank" start={T.flipLine} arrive="rise" gap={2} style={{ color: '#FFFFFF' }} />
      </div>
    </AbsoluteFill>
  );
};

// the cobalt world is lit: a soft light in its own hue over the sand, the figure's half kept deep (screen space, clipped
// with the picture, so in the lockup it is seen only inside the letters)
const FlipLight: React.FC = () => {
  const f = useCurrentFrame();
  const o = at(f, T.flip, 8, ease.out);
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{
        opacity: o,
        background:
          'radial-gradient(ellipse 70% 60% at 62% 22%, rgba(120,145,255,.24), rgba(120,145,255,0) 70%), linear-gradient(180deg, rgba(3,10,64,0) 45%, rgba(3,10,64,.4) 100%)',
      }}
    />
  );
};

// ---------------------------------------------------------------- 10. lockup: out of a letter
// The cobalt picture the camera is in turns out to be the inside of "fieldnote": from the lockup on, the picture is
// clipped to the wordmark's outline (wordmark.ts), which shrinks from 44x round a point where the f's crossbar meets its
// stem, so on the first frame the whole frame is inside the letter; the lit paper is behind it. The picture keeps its
// own camera (2.5x -> 1.6x), so the two planes pull back at different rates; the found sand shows in its own colour
// inside "ldnote"; the letters drain to ink on the music's lift.
const WORD = { lx: 452, ly: 511 }; // the f's crossbar meets its stem (wordmark.ts: 300 px, baseline 649)
const lockScale = (f: number) => logScale(44, 1, at(f, T.lock, 30, ease.out)) * (1 + 0.025 * creep(f, T.lock + 26, T.end - T.lock - 26));
const pathTokens = (d: string) => d.match(/[MLHVCQZ]|-?\d*\.?\d+/g) ?? [];
const WM_TOKENS = pathTokens(WORDMARK_PATH);
const WU_TOKENS = pathTokens(WORDMARK_UNION);
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
const PAPER_LIT = 'radial-gradient(ellipse 75% 70% at 50% 48%, #F5F2EC, #E0DCD2)';
/** Inside the letters: the paper's edge casts a soft shadow onto the picture (windows cut in a lit sheet). */
const LetterShade: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, filter: 'blur(5px)' }}>
      <path d={wordPathAt(lockScale(f), WU_TOKENS)} transform="translate(0 5)" fill="none" stroke="rgba(10,8,30,.55)" strokeWidth={12} strokeLinejoin="round" />
    </svg>
  );
};
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const drain = at(f, T.drain, 8, ease.inOut);
  return (
    <AbsoluteFill>
      {drain > 0 && (
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
          <path d={wordPathAt(lockScale(f))} fill={INK} opacity={drain} />
        </svg>
      )}
      <div style={{ position: 'absolute', top: 742, width: '100%', textAlign: 'center', ...voice, fontSize: 44, color: INK }}>
        <Words text="ask the planet · fieldnote.earth" start={T.url} arrive="rise" gap={2} by="word" style={{ color: INK }} accent={['fieldnote.earth']} accentStyle={{ color: COBALT }} />
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
  const cues = [
    ...[0, 6, 12, 18, 24, 30, 36].map((c, i) => ({ at: c, ...s['mixkit-2384'], volume: 0.3, rate: 0.88 + i * 0.04 })),
    { at: 4, ...s['mixkit-1492'], volume: 0.3, rate: 1.1 },
    { at: T.converge + 2, ...s['mixkit-175'], volume: 0.35 },
    { at: T.earth, ...s['mixkit-168'], volume: 0.4 },
    { at: T.earth, ...s['mixkit-2299'], volume: 0.7 },
    ...T.swaps.slice(1).map((c, i) => ({ at: c, ...s['mixkit-1049'], volume: 0.35, rate: 1 + i * 0.08 })),
    { at: T.ask, ...s['mixkit-1492'], volume: 0.5 },
    { at: T.plate + 2, ...s['mixkit-2384'], volume: 0.3, rate: 0.8 },
    ...keysAt.filter((k) => k < burstAt).map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.16, rate: 0.95 + (i % 3) * 0.05 })),
    { at: burstAt, ...s['mixkit-2533'], volume: 0.3, rate: 0.9 },
    { at: burstAt, ...s['mixkit-2384'], volume: 0.22, rate: 1.2 },
    { at: T.shrink + 6, ...s['mixkit-175'], volume: 0.3 },
    { at: T.send, ...s['mixkit-2568'], volume: 0.55 },
    { at: T.scan + 4, ...s['mixkit-1049'], volume: 0.3, rate: 1.3 },
    { at: T.find1, ...s['mixkit-3124'], volume: 0.45 },
    { at: T.find2, ...s['mixkit-168'], volume: 0.25 },
    { at: T.find2 + 4, ...s['mixkit-3124'], volume: 0.4, rate: 1.12 },
    { at: T.answer + 8, ...s['mixkit-3000'], volume: 0.4 },
    { at: T.answer + 30, ...s['mixkit-2867'], volume: 0.25 },
    { at: T.compare + 4, ...s['mixkit-175'], volume: 0.35 },
    { at: T.compare + 20, ...s['mixkit-168'], volume: 0.22 },
    // the proof: the whip, the landing, a tick per growth step, a tone as the sand completes
    { at: T.proof - 4, ...s['mixkit-175'], volume: 0.3, rate: 1.1 },
    { at: T.proof, ...s['mixkit-168'], volume: 0.32 },
    { at: T.land, ...s['mixkit-3124'], volume: 0.32, rate: 0.85 },
    { at: T.grow[0], ...s['mixkit-1049'], volume: 0.26, rate: 0.92 },
    ...T.grow.slice(1).map((g, i) => ({ at: g, ...s['mixkit-1049'], volume: 0.32, rate: 1 + i * 0.09 })),
    { at: T.grow[4], ...s['mixkit-2867'], volume: 0.2 },
    // the colour flip on the beat
    { at: T.flip, ...s['mixkit-2299'], volume: 0.7 },
    { at: T.flip, ...s['mixkit-2384'], volume: 0.35, rate: 0.92 },
    // the lockup
    { at: T.lock, ...s['mixkit-1492'], volume: 0.4 },
    { at: T.lock + 1, ...s['mixkit-2299'], volume: 0.55, rate: 0.94 },
    { at: T.url, ...s['mixkit-3000'], volume: 0.22, rate: 0.9 },
    { at: T.drain, ...s['mixkit-2299'], volume: 0.35, rate: 1.06 },
  ];
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {f < T.earth + 3 && (
        <>
          <Wall />
          <NearTiles />
        </>
      )}
      {f >= T.earth && f < T.ask + 2 && <Earth />}
      {f >= T.lock && <AbsoluteFill style={{ background: PAPER_LIT }} />}
      {f >= T.ask && (
        <AbsoluteFill style={{ clipPath: f >= T.lock ? `path('${wordPathAt(lockScale(f))}')` : undefined }}>
          <Stage />
          <Panel />
          <Years />
          {f >= T.flip && <FlipLight />}
          {f >= T.lock + 2 && <LetterShade />}
        </AbsoluteFill>
      )}
      {f >= T.lock && <Lockup />}
      {f >= T.flip && f < T.lock + 8 && <Finding />}
      <Grain amount={0.03} />
      <Music src="music/sonor-01.mp3" startFrom={20.54} volume={0.4} enterAt={0} breaths={[T.flip, T.lock]} breathLen={6} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const fieldnoteDuration = T.end;
