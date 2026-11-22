// "Fieldnote": the v2 rework. ~17 s at 30 fps. An invented product (ask any question about any place on Earth,
// answered from satellite imagery). World: editorial paper, bare photo tiles with mono coordinates, a serif voice, a
// heavy grotesque only for the window device (EARTH, the wordmark), one cobalt accent that means "found / changed".
// Grounds: paper (base), the photograph itself (after the dive), cobalt (the flood out of the compare divider).
// Pictures: NASA / ISS crew Earth observations and Earth Observatory images (public domain).
//
// Beats (composition tag in brackets; no two neighbours share one):
//   0  wall          a mosaic of places already cutting on at frame 0, crops flipping; it collapses into the centre
//   1  giant-type    EARTH as windows, a new place in the letters every 0.4 s, coordinates stepping under it
//   2  macro         the dive into the stem of the H: the frame ends up inside the picture
//   3  type-on-surf  the question typed giant on a paper plate over the photo, the photo pushing in
//   4  full-ui       the plate shrinks into the input bar, send, a scan line reads 26 years of the picture
//   5  macro         the camera punches in on each finding (selection + label), whip between them
//   6  full-ui       the bar grows into the answer card: +18 % new land, the years stepping up as bars
//   7  split         before / after: the divider sweeps twice, giant years ride with it
//   8  flood         the divider opens into a cobalt ground
//   9  surface       the answer lands in Notion, Gmail and a Jupyter notebook, piling up in depth
//  10  macro         the camera dives into the notebook's output picture
//  11  object        the picture is the inside of a letter: pull back to the wordmark, the photo drains to ink (2 s)
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
  DepthStack,
  ease,
  fonts,
  Grain,
  keys,
  landBlur,
  lightUI,
  logScale,
  mix,
  mixColor,
  Music,
  Odometer,
  onTwos,
  PartnerSurface,
  Photo,
  rand,
  Selection,
  TextWindow,
  Typing,
  Words,
  type CamKey,
  type Grade,
  type Theme,
} from '../../kit';
import { sfx } from '../../sfx';

// ---------------------------------------------------------------- world
const PAPER = '#EDEAE3';
const INK = '#121212';
const COBALT = '#2347FF';
const MUTED = '#5E5A52';
const serif: React.CSSProperties = { fontFamily: fonts.serif, fontWeight: 400, letterSpacing: '-0.02em', color: INK };
const mono: React.CSSProperties = { fontFamily: fonts.mono, letterSpacing: '0.04em', color: MUTED };
const heavy: React.CSSProperties = { fontFamily: fonts.geist, fontWeight: 900, letterSpacing: '-0.06em' };
const GRADE: Grade = { dark: '#2B2118', light: '#F1E9DA', look: 'saturate(1.05) contrast(1.04)' };
const ui: Theme = { ...lightUI, accent: COBALT, font: fonts.inter, radius: 20 };

const IMG = {
  delta: 'img/earth-observations-taken-by-the-expedition.jpg',
  channels: 'img/earth-observations-taken-by-expedition-26.jpg',
  islands: 'img/seaweed-farms-in-south-korea.jpg',
  clouds: 'img/cloud-streets-over-the-bering-sea.jpg',
};
const POS = '46% 40%'; // the one crop of the Bahamas picture the whole middle of the film lives in

const T = {
  tiles: 0,
  converge: 20,
  earth: 28,
  swaps: [28, 38, 48, 58],
  kicker: 34,
  dive: 92,
  ask: 108,
  plate: 110,
  type: 118,
  shrink: 174,
  send: 190,
  scan: 192,
  find1: 206,
  find2: 228,
  answer: 248,
  cardOut: 288,
  compare: 300,
  flood: 346,
  surf: [358, 384, 410],
  into: 438,
  lock: 456,
  drain: 484,
  url: 488,
  end: 516,
} as const;

// ---------------------------------------------------------------- 0. the wall of places
const PLACES = [
  { src: IMG.channels, cap: (i: number) => `${(24.6 + (i % 5) * 0.13).toFixed(2)}°N  ${(77.4 + (i % 3) * 0.21).toFixed(2)}°W` },
  { src: IMG.islands, cap: (i: number) => `${(34.4 + (i % 4) * 0.11).toFixed(2)}°N  ${(126.6 + (i % 3) * 0.17).toFixed(2)}°E` },
  { src: IMG.clouds, cap: (i: number) => `${(57.9 + (i % 4) * 0.19).toFixed(2)}°N  ${(175.8 + (i % 5) * 0.23).toFixed(2)}°W` },
  { src: IMG.delta, cap: (i: number) => `${(21.2 + (i % 3) * 0.14).toFixed(2)}°N  ${(39.0 + (i % 4) * 0.09).toFixed(2)}°E` },
];
const TW = 400;
const TH = 250;
const TG = 30;
const COLS = 5;
const ROWS = 4;

const Tiles: React.FC = () => {
  const f = useCurrentFrame();
  const fs = onTwos(f, 2); // the tiles live on a stepped clock: they cut on and flip, they never slide in
  const push = 1 + 0.05 * creep(f, 0, 24);
  const q = accel(f, T.converge, T.earth + 2 - T.converge, 1.4);
  const left0 = 960 - (COLS * TW + (COLS - 1) * TG) / 2;
  const top0 = 540 - (ROWS * TH + (ROWS - 1) * TG) / 2;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const cx = left0 + c * (TW + TG) + TW / 2;
      const cy = top0 + r * (TH + TG) + TH / 2;
      const d = Math.hypot((cx - 960) / 960, (cy - 540) / 540);
      const s = onTwos(Math.round(-16 + d * 14));
      if (fs < s) continue;
      const flips = Math.floor(Math.max(0, fs - s) / 8);
      const k = (i * 3 + flips) % PLACES.length;
      const pl = PLACES[k];
      const j = at(f, s + flips * 8, 5, ease.snap);
      const x = mix(q, cx, 960);
      const y = mix(q, cy, 540);
      tiles.push(
        <div key={i} style={{ position: 'absolute', left: x - TW / 2, top: y - TH / 2, width: TW, height: TH, transform: `scale(${mix(j, 1.05, 1) * mix(q, 1, 0.2)})`, filter: q > 0.05 ? `blur(${q * 16}px)` : undefined }}>
          <Photo src={pl.src} w={TW} h={TH} grade={GRADE} position={`${15 + rand(i * 3 + k) * 70}% ${15 + rand(i * 5 + k + 2) * 60}%`} zoom={0.5 + rand(i + k) * 0.6} start={-100} dur={1} />
          <div style={{ position: 'absolute', left: 0, bottom: 0, background: PAPER, padding: '6px 10px 4px', ...mono, fontSize: 17, color: INK }}>{pl.cap(i)}</div>
        </div>,
      );
    }
  return <AbsoluteFill style={{ transform: `scale(${push})` }}>{tiles}</AbsoluteFill>;
};

// ---------------------------------------------------------------- 1-2. EARTH as windows, then the dive into the H
const EARTH_FONT = 520;
// a point inside the stem of the "H": the dive pivots on it, so the frame ends up entirely inside the picture
const HX = 1507;
const HY = 545;
const SWAPS = [
  { src: IMG.islands, pos: '30% 30%', cap: '34.62°N  126.91°E · SOUTH JEOLLA' },
  { src: IMG.clouds, pos: '45% 95%', cap: '58.21°N  176.40°W · BERING SEA' },
  { src: IMG.delta, pos: '60% 40%', cap: '21.43°N  39.12°E · RED SEA COAST' },
  { src: IMG.channels, pos: '', cap: '25.04°N  77.62°W · GREAT BAHAMA BANK' },
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
  const scale = mix(inn, 1.32, 1) * (1 + 0.03 * creep(f, T.earth + 10, 60)) * logScale(1, 34, dive);
  const blur = landBlur(f, T.earth, 10, 6) + dive * 6;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', inset: 0, transformOrigin: `${HX}px ${HY}px`, transform: `scale(${scale})`, filter: blur > 0.2 ? `blur(${blur}px)` : undefined, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <TextWindow text="EARTH" src={sw.src} position={pos} zoom={zoom} style={{ ...heavy, fontSize: EARTH_FONT }} />
      </div>
      <div style={{ position: 'absolute', top: 128, width: '100%', textAlign: 'center', ...serif, fontSize: 96, fontStyle: 'italic', opacity: 1 - dive * 4 }}>
        <Words text="Ask anything about" start={T.kicker} arrive="rise" gap={4} style={{ color: INK }} leaveAt={T.dive - 4} leave="rise" leaveDur={8} />
      </div>
      <div style={{ position: 'absolute', top: 852, width: '100%', textAlign: 'center', ...mono, fontSize: 30, color: INK, opacity: clamp(inn * 3) * (1 - dive * 4) }}>
        <span style={{ background: k === 3 ? COBALT : 'transparent', color: k === 3 ? '#fff' : INK, padding: '6px 14px' }}>{sw.cap}</span>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3-8. the photo: ask, read, find, answer, compare
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
  { f: T.compare, zoom: 1.1, curve: ease.out },
  { f: T.flood, zoom: 1.17, curve: ease.out },
];
const split = (f: number) =>
  keys(
    f,
    [
      [T.compare, 0],
      [T.compare + 16, 0.64],
      [T.compare + 32, 0.36],
      [T.flood - 2, 0.5],
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
const labelStyle: React.CSSProperties = { ...mono, color: '#fff', fontSize: 25, background: COBALT, padding: '8px 12px', top: -50 };

const Stage: React.FC = () => {
  const f = useCurrentFrame();
  const comparing = f >= T.compare;
  const sel = 1 - at(f, T.cardOut, 10, ease.in);
  return (
    <Camera keys={CAM}>
      <AbsoluteFill style={{ filter: f < T.ask + 8 ? `blur(${landBlur(f, T.ask, 12, 8)}px)` : undefined }}>
        {!comparing ? (
          <Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} position={POS} zoom={0} />
        ) : (
          <Compare
            w={1920}
            h={1080}
            split={split(f)}
            before={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} develop={0} position={POS} zoom={0} />}
            after={<Photo src={IMG.channels} w={1920} h={1080} grade={GRADE} position={POS} zoom={0} />}
          />
        )}
        <Graticule />
        {sel > 0 && (
          <div style={{ opacity: sel }}>
            <Selection {...A} start={T.find1} color="#FFFFFF" label={label('SANDBANK  +3.4 km²')} labelStyle={labelStyle} />
            <Selection {...B} start={T.find2} color="#FFFFFF" label={label('NEW CHANNEL  6.1 km')} labelStyle={labelStyle} />
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
  if (f < T.plate || f > T.compare + 2) return null;
  const rise = at(f, T.plate, 14, ease.out);
  const p1 = at(f, T.shrink, 14, ease.inOut);
  const p2 = at(f, T.answer, 16, ease.inOut);
  const out = accel(f, T.cardOut, T.compare - T.cardOut, 1.45);
  const b = lerpBox(lerpBox(PLATE, BAR, p1), CARD, p2);
  const bg = mixColor(PAPER, '#FFFFFF', p1);
  const press = at(f, T.send, 4, ease.out) - at(f, T.send + 4, 10, ease.out);
  // the question: one text that shrinks from the plate into the bar, then becomes the card's header
  const qSize = mix(p2, mix(p1, 124, 44), 32);
  const qx = mix(p2, mix(p1, 64, 46), 56);
  const qy = mix(p2, mix(p1, 136, (BAR.h - 44 * 1.25) / 2), 38);
  const sent = at(f, T.send + 2, 8);
  const qColor = mixColor(INK, MUTED, Math.max(sent * 0.6, p2));
  const showAns = at(f, T.answer + 8, 6);
  const year = 2000 + Math.round(26 * at(onTwos(f), T.scan, 22, ease.inOut));
  return (
    <>
      {f >= T.send && f < T.answer + 6 && (
        <div style={{ position: 'absolute', left: BAR.x + 10, top: BAR.y - 62, ...mono, fontSize: 24, color: '#fff', background: f >= T.find2 + 6 ? COBALT : INK, padding: '8px 14px', opacity: 1 - p2 * 3, transform: `translateY(${mix(at(f, T.send, 8, ease.out), 20, 0)}px)` }}>
          {f < T.find1 ? `READING ${year}` : f < T.find2 + 6 ? `READING 2000 → 2026 · 1 CHANGE` : '2 CHANGES FOUND'}
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
        <div style={{ position: 'absolute', left: 64, top: 50, ...mono, fontSize: 24, color: COBALT, opacity: 1 - at(f, T.shrink, 5) }}>FIELDNOTE · 25.04°N 77.62°W</div>
        <div style={{ position: 'absolute', left: qx, top: qy, ...serif, fontSize: qSize, lineHeight: 1.25, color: qColor, whiteSpace: 'nowrap' }}>
          {f < T.shrink ? <Typing text={QUESTION} start={T.type} cps={26} caretColor={COBALT} /> : QUESTION}
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
          <div style={{ position: 'absolute', left: 56, top: 112, width: CARD.w - 112, opacity: showAns, transform: `translateY(${mix(showAns, 16, 0)}px)` }}>
            <div style={{ ...mono, fontSize: 28, color: COBALT }}>GREAT BAHAMA BANK · 2000 → 2026</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 22, marginTop: 4 }}>
              <div style={{ fontFamily: fonts.geist, fontWeight: 650, fontSize: 250, letterSpacing: '-0.05em', lineHeight: 1, color: INK }}>
                +<Odometer value={18} from={0} start={T.answer + 10} dur={30} sep="" />%
              </div>
              <div style={{ fontFamily: fonts.geist, fontWeight: 600, fontSize: 72, letterSpacing: '-0.03em', color: INK, lineHeight: 1.05 }}>
                new
                <br />
                land
              </div>
            </div>
            <div style={{ fontFamily: fonts.inter, fontSize: 40, lineHeight: 1.3, color: '#3D3A35', marginTop: 14 }}>Tides built 3.4 km² of sandbank and cut one new channel.</div>
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

// giant years that ride with the compare divider
const Years: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.compare || f >= T.flood + 4) return null;
  const sx = toScreenX(f, split(f) * 1920);
  const tab: React.CSSProperties = { position: 'absolute', top: 96, background: PAPER, padding: '4px 26px 10px', fontFamily: fonts.geist, fontWeight: 650, fontSize: 132, letterSpacing: '-0.05em', lineHeight: 1, color: INK };
  const born = at(f, T.compare + 2, 8, ease.out);
  return (
    <>
      <div style={{ ...tab, right: 1920 - sx + 26 }}>2000</div>
      <div style={{ ...tab, left: sx + 26, color: COBALT, transform: `translateY(${mix(born, -160, 0)}px)` }}>2026</div>
    </>
  );
};

// the divider opens into a cobalt ground
const FloodOut: React.FC = () => {
  const f = useCurrentFrame();
  if (f < T.flood) return null;
  const p = at(f, T.flood, T.surf[0] - T.flood, ease.in);
  const sx = toScreenX(f, split(f) * 1920);
  const w = logScale(4, 4400, p);
  return <div style={{ position: 'absolute', left: sx - w / 2, top: 0, width: w, height: 1080, background: COBALT }} />;
};

// ---------------------------------------------------------------- 9-10. the answer, landing in other products
const Thumb: React.FC<{ w: number; h: number; marks?: boolean }> = ({ w, h, marks }) => (
  <div style={{ position: 'relative', width: w, height: h, borderRadius: 10, overflow: 'hidden', flexShrink: 0 }}>
    <Compare
      w={w}
      h={h}
      split={0.42}
      handle={false}
      line="#FFFFFF"
      before={<Photo src={IMG.channels} w={w} h={h} grade={GRADE} develop={0} position={POS} zoom={0} />}
      after={<Photo src={IMG.channels} w={w} h={h} grade={GRADE} position={POS} zoom={0} />}
    />
    {marks && (
      <>
        <div style={{ position: 'absolute', left: (A.x / 1920) * w, top: (A.y / 1080) * h, width: (A.w / 1920) * w, height: (A.h / 1080) * h, border: '2px solid #fff' }} />
        <div style={{ position: 'absolute', left: (B.x / 1920) * w, top: (B.y / 1080) * h, width: (B.w / 1920) * w, height: (B.h / 1080) * h, border: '2px solid #fff' }} />
      </>
    )}
  </div>
);

const NoteRow: React.FC = () => (
  <div style={{ display: 'flex', gap: 26, alignItems: 'center' }}>
    <Thumb w={250} h={141} />
    <div>
      <div style={{ fontWeight: 650, fontSize: 36, letterSpacing: '-0.02em' }}>+18 % new land since 2000</div>
      <div style={{ fontFamily: fonts.mono, fontSize: 22, color: COBALT, marginTop: 6, letterSpacing: '0.04em' }}>GREAT BAHAMA BANK · FIELDNOTE</div>
    </div>
  </div>
);

const SW = 1720;
const SH = 780;
const SY = 600;
// the notebook's output picture, in frame px (the camera dives into it at T.into)
const OUT = { w: 1120, h: 400 };
const OUT_X = 960 - SW / 2 + 44 + 20 + OUT.w / 2;
const OUT_Y = SY - SH / 2 + 253 + OUT.h / 2;

const Surfaces: React.FC = () => {
  const f = useCurrentFrame();
  const dive = at(f, T.into, T.lock - T.into, ease.in);
  const s = logScale(1, 18, dive);
  return (
    <AbsoluteFill style={{ background: COBALT }}>
      <AbsoluteFill style={{ transformOrigin: `${OUT_X}px ${OUT_Y}px`, transform: `scale(${s})`, filter: dive > 0.5 ? `blur(${(dive - 0.5) * 8}px)` : undefined }}>
        <DepthStack
          x={960}
          y={SY}
          rise={160}
          push={7}
          lift={[0, 70, 130, 180]}
          scale={[1, 0.93, 0.87, 0.82]}
          blur={[0, 3, 6, 10]}
          dim={[1, 0.9, 0.8, 0.7]}
          items={[
            {
              f: T.surf[0],
              node: (
                <PartnerSurface
                  t={ui}
                  brand="notion"
                  kind="doc"
                  title="Coastal survey · Andros, north shoals"
                  w={SW}
                  h={SH}
                  size={44}
                  landAt={T.surf[0] + 5}
                  items={[
                    { f: T.surf[0] + 1, who: 'Field notes, week 46', text: 'Shoreline walked from Morgan’s Bluff to the north channel.' },
                    { f: T.surf[0] + 5, text: <NoteRow /> },
                    { f: T.surf[0] + 10, text: 'Next: check the 2019 storm season against the same crop.' },
                    { f: T.surf[0] + 14, text: 'Bring the boat photos from Thursday to compare.' },
                  ]}
                />
              ),
            },
            {
              f: T.surf[1],
              node: (
                <PartnerSurface
                  t={ui}
                  brand="gmail"
                  kind="mail"
                  title="Inbox · coastal-team"
                  w={SW}
                  h={SH}
                  size={44}
                  landAt={T.surf[1] + 2}
                  items={[
                    { f: T.surf[1] + 2, who: 'Fieldnote', meta: 'now', text: <NoteRow /> },
                    { f: T.surf[1] + 6, who: 'Ines Duarte', meta: '09:12', text: 'Re: north shoals, can we see it back to 2000?' },
                    { f: T.surf[1] + 10, who: 'Tom Achebe', meta: '08:41', text: 'Survey boat is booked for Thursday.' },
                  ]}
                />
              ),
            },
            {
              f: T.surf[2],
              node: (
                <PartnerSurface
                  t={ui}
                  brand="jupyter"
                  kind="doc"
                  title="andros_shoals.ipynb"
                  w={SW}
                  h={SH}
                  size={44}
                  landAt={T.surf[2] + 8}
                  items={[
                    {
                      f: T.surf[2] + 2,
                      text: (
                        <span style={{ fontFamily: fonts.mono, fontSize: 30 }}>
                          <span style={{ color: '#9A948A' }}>[3] </span>fn.ask(<span style={{ color: COBALT }}>"How has this coast changed since 2000?"</span>)
                        </span>
                      ),
                    },
                    {
                      f: T.surf[2] + 8,
                      text: (
                        <div>
                          <Thumb w={OUT.w} h={OUT.h} marks />
                          <div style={{ fontFamily: fonts.mono, fontSize: 26, marginTop: 14, color: '#3D3A35' }}>land_change = +18.0 %   sandbank_km2 = 3.4   new_channels = 1</div>
                        </div>
                      ),
                    },
                  ]}
                />
              ),
            },
          ]}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 11. lockup: the picture was the inside of a letter
const WORD_FONT = 300;
// a point inside the stem of the "l" of "fieldnote"
const LX = 731;
const LY = 540;
const Lockup: React.FC = () => {
  const f = useCurrentFrame();
  const back = at(f, T.lock, 30, ease.out);
  const scale = logScale(34, 1, back) * (1 + 0.025 * creep(f, T.lock + 20, T.end - T.lock - 20));
  const drain = at(f, T.drain, 10, ease.inOut);
  const blur = mix(clamp(back * 4), 5, 0);
  const word: React.CSSProperties = { ...heavy, fontSize: WORD_FONT, letterSpacing: '-0.04em', lineHeight: 0.95, fontVariantLigatures: 'none' };
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
      <div style={{ position: 'absolute', top: 742, width: '100%', textAlign: 'center', ...mono, fontSize: 36, color: INK }}>
        <Words text="ask the planet · fieldnote.earth" start={T.url} arrive="rise" gap={2} by="word" style={{ color: INK }} accent={['fieldnote.earth']} accentStyle={{ color: COBALT }} />
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- the film
// the frames the question's keys land on (the same cadence as <Typing>), for the key sounds
const keyTimes = (text: string, start: number, cps: number, seed = 3) => {
  const per = 30 / cps;
  let t = start;
  const out: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    t += per + (rand(i * 7.3 + seed) - 0.5) * per * 0.9 + (c === ' ' ? per * 0.6 : c === ',' || c === '.' ? per * 2.5 : 0);
    if (c !== ' ') out.push(Math.ceil(t));
  }
  return out;
};

export const FieldnoteFilm: React.FC = () => {
  const f = useCurrentFrame();
  const s = sfx;
  const cues = [
    ...[0, 4, 8, 12, 16].map((c, i) => ({ at: c, ...s['mixkit-2384'], volume: 0.3, rate: 0.9 + i * 0.05 })),
    { at: T.earth, ...s['mixkit-168'], volume: 0.4 },
    { at: T.earth, ...s['mixkit-2299'], volume: 0.7 },
    ...T.swaps.slice(1).map((c, i) => ({ at: c, ...s['mixkit-1049'], volume: 0.35, rate: 1 + i * 0.08 })),
    { at: T.ask, ...s['mixkit-1492'], volume: 0.5 },
    { at: T.plate + 2, ...s['mixkit-2384'], volume: 0.3, rate: 0.8 },
    ...keyTimes(QUESTION, T.type, 26)
      .filter((_, i) => i % 2 === 0)
      .map((k, i) => ({ at: k, ...s['mixkit-2533'], volume: 0.16, rate: 0.95 + (i % 3) * 0.05 })),
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
    { at: T.surf[0], ...s['mixkit-2299'], volume: 0.7 },
    ...T.surf.map((c, i) => ({ at: c, ...s['mixkit-2384'], volume: 0.3, rate: 0.95 + i * 0.06 })),
    ...[5, 2, 8].map((d, i) => ({ at: T.surf[i] + d, ...s['mixkit-2867'], volume: 0.28, rate: 1 + i * 0.06 })), // on each surface's landAt
    { at: T.lock, ...s['mixkit-1492'], volume: 0.45 },
    { at: T.lock + 2, ...s['mixkit-2299'], volume: 0.65 },
    { at: T.url, ...s['mixkit-3000'], volume: 0.25, rate: 0.9 },
  ];
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      {f < T.earth + 3 && <Tiles />}
      {f >= T.earth && f < T.ask + 2 && <Earth />}
      {f >= T.ask && f < T.surf[0] && (
        <AbsoluteFill>
          <Stage />
          <Panel />
          <Years />
          <FloodOut />
        </AbsoluteFill>
      )}
      {f >= T.surf[0] && f < T.lock && <Surfaces />}
      {f >= T.lock && <Lockup />}
      <Grain amount={0.03} />
      <Music src="music/tech-house-vibes.mp3" startFrom={60} volume={0.45} enterAt={T.earth - 2} breaths={[T.surf[0], T.lock]} breathLen={6} fadeOut={50} />
      <Cues cues={cues} />
    </AbsoluteFill>
  );
};

export const fieldnoteDuration = T.end;
