// "Fieldnote": the v2 rework. ~15.8 s at 30 fps. An invented product (ask any question about any place on Earth,
// answered from satellite imagery). World: editorial paper, bare photo tiles with mono coordinates, one sans voice (Inter:
// statements, labels and the UI; bold only for the window device, Earth and the wordmark), one cobalt accent that means
// "found / changed". The editorial feel lives in the layout and the photography, not in a second face.
// Grounds: paper (base), the photograph itself (after the dive), then the relay's hosts take the world's grounds in turn
// (paper, cobalt, ink). Pictures: NASA / ISS crew Earth observations and Earth Observatory images (public domain).
//
// Beats (composition tag in brackets; no two neighbours share one):
//   0  wall          SPECTACLE (1.8 s): a wall of a hundred and forty places, the camera travelling across it and
//                    pulling back while big out-of-focus tiles race past in front; the wall collapses into the centre
//   1  giant-type    Earth as windows, a new place in the letters every 0.27 s, coordinates stepping under it
//   2  macro         the dive into the stem of the h: the frame ends up inside the picture
//   3  type-on-surf  the question on a paper plate over the photo: three words typed, the rest lands at once
//   4  full-ui       the plate shrinks into the input bar, send, a scan line reads 26 years of the picture
//   5  macro         the camera punches in on each finding (selection + label), whip between them
//   6  full-ui       the bar grows into the answer card: +18 % new land, the years stepping up as bars
//   7  split         before / after: the divider sweeps twice, giant years ride with it, the camera pulls out
//   8  relay         the pull-back continues: the before/after becomes the artefact, fixed on screen, while its host
//                    changes around it on the beat: a full-bleed Notion page on paper, a Gmail thread on a tilted
//                    cobalt plane, a Jupyter notebook in ink with a giant cropped `fn.ask(` line
//   9  macro         the camera dives into the artefact's picture
//  10  object        the picture is the inside of a letter: pull back to the wordmark, the photo drains to ink (2 s)
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import {
  accel,
  at,
  Brand,
  BrandTile,
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

// ---------------------------------------------------------------- world
const PAPER = '#EDEAE3';
const PAPER_2 = '#E1DDD3';
const INK = '#121212';
const INK_GROUND = '#151413';
const COBALT = '#2347FF';
const COBALT_LIGHT = '#93A5FF';
const MUTED = '#5E5A52';
// one voice: Inter for statements (480), labels and UI (sentence case, 0 tracking at UI sizes); mono only for coordinates
// and code as written; bold (700, never heavier) only where letters are windows onto a picture
const voice: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 480, letterSpacing: '-0.015em', color: INK };
const mono: React.CSSProperties = { fontFamily: fonts.mono, letterSpacing: '0', color: MUTED };
const heavy: React.CSSProperties = { fontFamily: fonts.inter, fontWeight: 700, letterSpacing: '-0.04em' };
const sans: React.CSSProperties = { fontFamily: fonts.inter, letterSpacing: '0' };
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
  relay: S + 172, // the picture becomes the artefact (pull-back), host A around it
  land: S + 188,
  hostB: S + 198,
  hostC: S + 218,
  into: S + 240,
  lock: S + 258,
  drain: S + 286,
  url: S + 290,
  end: S + 316,
} as const;

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
const A = { x: 1236, y: 432, w: 452, h: 262 }; // the sandbank
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
  // the camera starts pulling out during the compare; the relay's pull-back continues the same move
  { f: T.relay, zoom: 1, curve: ease.in },
];
const split = (f: number) =>
  keys(
    f,
    [
      [T.compare, 0],
      [T.compare + 16, 0.64],
      [T.compare + 32, 0.36],
      [T.relay - 2, 0.5],
    ],
    ease.out,
  );
const toScreenX = (f: number, wx: number) => {
  const c = camAt(f, CAM);
  return 960 + c.zoom * (wx - 960 - c.x);
};

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

// the before/after picture at stage size (the stage during the compare, and the relay's artefact afterwards)
const Picture: React.FC<{ split: number; handle?: boolean }> = ({ split: sp, handle = true }) => (
  <Compare
    w={1920}
    h={1080}
    split={sp}
    handle={handle}
    before={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} develop={0} position={POS} zoom={0} />}
    after={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} position={POS} zoom={0} />}
  />
);

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const comparing = f >= T.compare;
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
const YearTabs: React.FC<{ sx: number; born?: number }> = ({ sx, born = 1 }) => (
  <>
    <div style={{ ...yearTab, right: 1920 - sx + 26 }}>2000</div>
    <div style={{ ...yearTab, left: sx + 26, color: COBALT, transform: `translateY(${mix(born, -160, 0)}px)` }}>2026</div>
  </>
);
const Years: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.compare) return null;
  return <YearTabs sx={toScreenX(f, split(f) * 1920)} born={at(f, T.compare + 2, 8, ease.out)} />;
};

// ---------------------------------------------------------------- 8-9. the relay: one artefact, three hosts
// The before/after (with its years) is the artefact. It stays at ART on screen; the host changes around it on the beat,
// each in a different composition and on one of the world's grounds, bleeding off every edge.
const ART = { x: 560, y: 300, w: 1080, h: 607.5 };
const AS = ART.w / 1920;
const Z0 = 1 / AS;
// the dive into the artefact pivots on a point inside its "after" half
const DIVE = { x: ART.x + 1460 * AS, y: ART.y + 600 * AS };

const NOTION_PAGES = ['Andros, north shoals', 'Exuma cays', 'Field notes', 'Survey boat', '2019 storm season', 'Sandbank archive'];
const HostNotion: React.FC = () => {
  const f = useCurrentFrame();
  const d = creep(f, T.relay, T.hostB - T.relay + 12);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {/* the sidebar, cropped by the left edge */}
      <div style={{ position: 'absolute', left: -60, top: -40, width: 520, height: 1160, background: PAPER_2, transform: `translateY(${-d * 30}px)` }}>
        <div style={{ position: 'absolute', left: 100, top: 92, display: 'flex', alignItems: 'center', gap: 18 }}>
          <Brand name="notion" size={52} color={INK} />
          <div style={{ ...sans, fontSize: 34, fontWeight: 600, color: INK }}>Coastal lab</div>
        </div>
        {NOTION_PAGES.map((p, i) => (
          <div key={p} style={{ position: 'absolute', left: 84, top: 210 + i * 72, width: 400, height: 58, borderRadius: 10, background: i === 0 ? '#D2CDC1' : 'transparent', display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 16 }}>
            <div style={{ width: 22, height: 26, borderRadius: 4, border: `2.5px solid ${i === 0 ? INK : '#8C877D'}` }} />
            <div style={{ ...sans, fontSize: 30, fontWeight: i === 0 ? 600 : 450, color: i === 0 ? INK : MUTED, whiteSpace: 'nowrap' }}>{p}</div>
          </div>
        ))}
      </div>
      {/* the page, scrolling a little under the artefact */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${-d * 90}px)` }}>
        <div style={{ position: 'absolute', left: 562, top: 28, ...sans, fontSize: 26, color: MUTED, whiteSpace: 'nowrap' }}>Coastal survey &nbsp;/&nbsp; Andros, north shoals</div>
        <div style={{ position: 'absolute', left: 554, top: 70, ...sans, fontSize: 116, fontWeight: 640, letterSpacing: '-0.025em', color: INK, lineHeight: 1, whiteSpace: 'nowrap' }}>North shoals, week 46</div>
        <div style={{ position: 'absolute', left: 562, top: 204, ...sans, fontSize: 32, color: '#3D3A35', whiteSpace: 'nowrap' }}>Shoreline walked from Morgan’s Bluff to the north channel.</div>
        <div style={{ position: 'absolute', left: 562, top: 932, ...sans, fontSize: 28, color: MUTED, whiteSpace: 'nowrap' }}>Fieldnote embed · Great Bahama Bank, 2000 → 2026</div>
        <div style={{ position: 'absolute', left: 562, top: 992, ...sans, fontSize: 32, color: '#3D3A35', whiteSpace: 'nowrap' }}>Next: check the 2019 storm season against the same crop.</div>
      </div>
    </AbsoluteFill>
  );
};

const MAIL_ROWS = [
  { who: 'Fieldnote', text: '+18 % new land since 2000 · Great Bahama Bank', t: 'now', me: true },
  { who: 'Ines Duarte', text: 'Re: north shoals, can we see it back to 2000?', t: '09:12' },
  { who: 'Tom Achebe', text: 'Survey boat is booked for Thursday', t: '08:41' },
  { who: 'Harbour office', text: 'Tide tables for December', t: 'Tue' },
];
const HostMail: React.FC = () => {
  const f = useCurrentFrame();
  const d = at(f, T.hostB, T.hostC - T.hostB + 8, ease.out);
  const rowText: React.CSSProperties = { ...sans, fontSize: 40, color: '#fff', whiteSpace: 'nowrap' };
  return (
    <AbsoluteFill style={{ background: '#1631C8', perspective: 1900, overflow: 'hidden' }}>
      {/* the mailbox as a lit plane, tilted away and tracking left */}
      <div
        style={{
          position: 'absolute',
          left: -420,
          top: -300,
          width: 2800,
          height: 1700,
          background: `linear-gradient(165deg, #3A5BFF 0%, ${COBALT} 38%, #1D3CE6 100%)`,
          boxShadow: 'inset 0 3px 0 rgba(255,255,255,.35)',
          transformOrigin: '50% 50%',
          transform: `translateX(${mix(d, 220, -60)}px) rotateX(${mix(d, 22, 16)}deg) rotateY(${mix(d, -22, -14)}deg) rotateZ(-5deg)`,
        }}
      >
        {/* left rail */}
        <div style={{ position: 'absolute', left: 300, top: 0, width: 420, height: 1700, background: 'rgba(8,20,110,.28)' }} />
        <div style={{ position: 'absolute', left: 360, top: 330 }}>
          <BrandTile name="gmail" size={104} shadow="0 14px 30px -10px rgba(5,10,60,.6)" />
        </div>
        {['Inbox', 'Starred', 'Sent', 'Survey'].map((n, i) => (
          <div key={n} style={{ position: 'absolute', left: 360, top: 480 + i * 74, ...sans, fontSize: 38, fontWeight: i === 0 ? 600 : 450, color: i === 0 ? '#fff' : 'rgba(255,255,255,.62)' }}>
            {n} {i === 0 && <span style={{ ...sans, fontWeight: 600, fontSize: 28, color: '#fff', marginLeft: 12, background: 'rgba(255,255,255,.2)', padding: '2px 10px', borderRadius: 14 }}>1</span>}
          </div>
        ))}
        {/* the thread */}
        <div style={{ position: 'absolute', left: 790, top: 320, ...sans, fontSize: 88, fontWeight: 600, letterSpacing: '-0.015em', color: '#fff', whiteSpace: 'nowrap' }}>Re: north shoals, back to 2000?</div>
        <div style={{ position: 'absolute', left: 794, top: 440, ...sans, fontSize: 34, color: 'rgba(255,255,255,.8)', whiteSpace: 'nowrap' }}>Ines Duarte to coastal team · 09:12 · 1 attachment</div>
        {MAIL_ROWS.map((r, i) => (
          <div key={r.who} style={{ position: 'absolute', left: 790, top: 1140 + i * 96, width: 2000, height: 84, display: 'flex', alignItems: 'center', gap: 28, paddingLeft: 24, background: r.me ? 'rgba(255,255,255,.16)' : 'transparent', borderTop: '1.5px solid rgba(255,255,255,.18)' }}>
            <div style={{ width: 16, height: 16, borderRadius: 8, background: r.me ? '#fff' : 'transparent' }} />
            <div style={{ ...rowText, fontWeight: 600, width: 340 }}>{r.who}</div>
            <div style={{ ...rowText, color: r.me ? '#fff' : 'rgba(255,255,255,.78)' }}>{r.text}</div>
            <div style={{ ...sans, fontSize: 30, color: 'rgba(255,255,255,.72)', marginLeft: 40 }}>{r.t}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const HostNotebook: React.FC = () => {
  const f = useCurrentFrame();
  const d = at(f, T.hostC, T.lock - T.hostC, ease.out);
  return (
    <AbsoluteFill style={{ background: INK_GROUND }}>
      {/* the notebook's header strip */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 64, background: '#201F1D', display: 'flex', alignItems: 'center', gap: 16, paddingLeft: 40 }}>
        <Brand name="jupyter" size={36} />
        <div style={{ ...mono, fontSize: 25, color: '#CFCAC0' }}>andros_shoals.ipynb</div>
        <div style={{ ...sans, fontSize: 26, color: '#8E887E', marginLeft: 40 }}>Python 3 · idle</div>
      </div>
      {/* the call, giant and cropped by the left edge, sliding left */}
      <div style={{ position: 'absolute', left: mix(d, -330, -540), top: 70, fontFamily: fonts.mono, fontSize: 184, lineHeight: 1.12, letterSpacing: '-0.02em', color: PAPER, whiteSpace: 'nowrap' }}>
        <span style={{ color: '#6B665E' }}>[3] </span>fn.ask(<span style={{ color: COBALT_LIGHT }}>“How has this coast changed since 2000?”</span>)
      </div>
      <div style={{ position: 'absolute', left: 410, top: ART.y + 6, ...mono, fontSize: 30, color: '#8E887E', transform: `translateX(${-d * 30}px)` }}>Out[3]</div>
      {/* the result prints in three steps, on twos */}
      <div style={{ position: 'absolute', left: 562, top: 968, ...mono, fontSize: 32, color: '#D8D3C8', whiteSpace: 'nowrap', display: 'flex', gap: 44, transform: `translateX(${-d * 30}px)` }}>
        {f >= T.hostC + 4 && (
          <span>
            land_change = <span style={{ color: COBALT_LIGHT }}>+18.0 %</span>
          </span>
        )}
        {f >= T.hostC + 8 && <span>sandbank_km2 = 3.4</span>}
        {f >= T.hostC + 12 && <span>new_channels = 1</span>}
      </div>
    </AbsoluteFill>
  );
};

const Relay: React.FC = () => {
  const f = useCurrentFrame();
  // the pull-back: the layer maps ART onto the whole frame at p = 0, and is itself at p = 1
  const p = at(f, T.relay, T.land - T.relay, ease.out);
  const z = logScale(Z0, 1, p);
  const q = (Z0 - z) / (Z0 - 1);
  const tx = mix(q, 0, ART.x) - ART.x * z;
  const ty = mix(q, 0, ART.y) - ART.y * z;
  const host = f < T.hostB ? 0 : f < T.hostC ? 1 : 2;
  const dive = at(f, T.into, T.lock - T.into, ease.in);
  const ds = logScale(1, 18, dive);
  const sp = mix(at(f, T.land, T.into - T.land, ease.inOut), 0.5, 0.6);
  // the artefact: fixed on screen, a slow push of its own (a second plane against the host's drift), a landing light
  const push = 1 + 0.03 * creep(f, T.land, T.lock - T.land);
  const lit = 1 - at(f, T.land, 22, ease.inOut);
  const settle = host === 0 ? 0 : 1 - at(f, host === 1 ? T.hostB : T.hostC, 6, ease.out); // a small kick on each cut
  const shadow = ['rgba(43,33,24,', 'rgba(4,10,70,', 'rgba(0,0,0,'][host];
  const chipBg = host === 1 ? '#FFFFFF' : COBALT;
  const chipInk = host === 1 ? COBALT : '#FFFFFF';
  const chipIn = at(onTwos(f), T.land - 4, 6, ease.out);
  const pose = [
    { s: 1, rx: 0, ry: 0, rz: 0 },
    { s: 1.12, rx: 14, ry: -16, rz: -4 },
    { s: 1, rx: 0, ry: 0, rz: 0 },
  ][host];
  return (
    <AbsoluteFill style={{ transformOrigin: `${DIVE.x}px ${DIVE.y}px`, transform: `scale(${ds})`, filter: dive > 0.5 ? `blur(${(dive - 0.5) * 8}px)` : undefined }}>
      <AbsoluteFill style={{ transformOrigin: '0 0', transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
        {host === 0 && <HostNotion />}
        {host === 1 && <HostMail />}
        {host === 2 && <HostNotebook />}
        {/* the artefact: one group (picture + chip) at ART, posed per host: flat on the page, tilted with the mail plane,
            flat again as the notebook's output. The cut is matched on its centre. */}
        <div style={{ position: 'absolute', left: ART.x, top: ART.y, width: ART.w, height: ART.h, transform: `perspective(1900px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s * push * (1 + 0.04 * settle)})` }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 16 * p,
              overflow: 'hidden',
              boxShadow: `0 2px 4px ${shadow}${0.35 * p}), 0 44px 90px -26px ${shadow}${0.7 * p}), 0 0 0 ${2 + 7 * lit}px rgba(35,71,255,${p * lit})`,
            }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `scale(${AS})` }}>
              <Picture split={sp} />
              <YearTabs sx={sp * 1920} />
            </div>
            {/* the lit top edge */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 16 * p, boxShadow: `inset 0 2px 0 rgba(255,255,255,${0.55 * p})`, background: `linear-gradient(180deg, rgba(255,255,255,${0.1 * p}), rgba(255,255,255,0) 30%)` }} />
          </div>
          {chipIn > 0 && (
            <div style={{ position: 'absolute', left: -22, top: ART.h - 40, transform: `translateY(${mix(chipIn, 24, 0)}px)`, background: chipBg, ...tag, fontWeight: 600, letterSpacing: '-0.005em', color: chipInk, fontSize: 40, padding: '10px 22px', whiteSpace: 'nowrap', boxShadow: `0 16px 30px -12px ${shadow}.6)` }}>
              +18 % new land
            </div>
          )}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 10. lockup: the picture was the inside of a letter
const WORD_FONT = 300;
// a point where the crossbar of the "f" of "fieldnote" crosses its stem: the widest solid patch of the word at weight 700,
// so at the opening scale (34x) the frame is entirely inside the letter
const LX = 436;
const LY = 511;
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const back = at(f, T.lock, 30, ease.out);
  const scale = logScale(34, 1, back) * (1 + 0.025 * creep(f, T.lock + 20, T.end - T.lock - 20));
  const drain = at(f, T.drain, 10, ease.inOut);
  const blur = mix(clamp(back * 4), 5, 0);
  // paddingRight: the negative tracking would leave the last letter's edge outside the picture's box
  const word: React.CSSProperties = { ...heavy, fontSize: WORD_FONT, lineHeight: 0.95, fontVariantLigatures: 'none', paddingRight: '0.05em' };
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${LX}px ${LY}px`, transform: `scale(${scale})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ ...word, color: INK }}>fieldnote</div>
          <div style={{ position: 'absolute', inset: 0, opacity: 1 - drain }}>
            <TextWindow text="fieldnote" src={IMG.channels} position="46% 40%" zoom={1.1} style={word} />
          </div>
        </div>
      </div>
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
    { at: T.relay, ...s['mixkit-1492'], volume: 0.35, rate: 1.05 },
    { at: T.land, ...s['mixkit-2299'], volume: 0.65 },
    { at: T.land, ...s['mixkit-2867'], volume: 0.28 },
    { at: T.hostB, ...s['mixkit-2384'], volume: 0.35, rate: 1.0 },
    { at: T.hostB, ...s['mixkit-2299'], volume: 0.35, rate: 1.1 },
    { at: T.hostC, ...s['mixkit-2384'], volume: 0.35, rate: 1.08 },
    { at: T.hostC, ...s['mixkit-2299'], volume: 0.35, rate: 1.2 },
    { at: T.hostC + 4, ...s['mixkit-3124'], volume: 0.3 },
    { at: T.lock, ...s['mixkit-1492'], volume: 0.45 },
    { at: T.lock + 2, ...s['mixkit-2299'], volume: 0.65 },
    { at: T.url, ...s['mixkit-3000'], volume: 0.25, rate: 0.9 },
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
      {f >= T.ask && f < T.relay && (
        <AbsoluteFill>
          <Stage />
          <Panel />
          <Years />
        </AbsoluteFill>
      )}
      {f >= T.relay && f < T.lock && <Relay />}
      {f >= T.lock && <Lockup />}
      <Grain amount={0.03} />
      <Music src="music/sonor-01.mp3" startFrom={20.54} volume={0.4} enterAt={0} breaths={[T.land, T.lock]} breathLen={6} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const fieldnoteDuration = T.end;
