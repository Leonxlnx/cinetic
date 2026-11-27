// The reel of the motion library's grounds (designed backgrounds and how they move).
// It plays each piece in the order of SEGMENTS, at its frames, with its name in the corner; the catalogue entries are
// in src/kit/library/catalog/ground.ts. A new piece appends one segment here (from = the last segment's from + dur)
// and its catalogue entry gives the same frames. Each demo shows the ground moving with a little real content on it.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fonts } from '../../kit/fonts';
import { CobaltArcs, CuttingMat, DotLattice, FourUp, GhostWord, HairlineGrid, HalftoneField, IsoFloor, OrbitLines, PhotoPlate, PlanetRim, TechGrid } from '../../kit/library';
import { softShadow } from '../../kit';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';
import { Center, IMG, Rise, say } from './scenes';

/** The corner label every segment here draws: the piece's number and name. */
export const Label: React.FC<{ n: number; name: string; dark?: boolean }> = ({ n, name, dark }) => (
  <div style={{ position: 'absolute', left: 56, bottom: 34, fontFamily: fonts.inter, fontSize: 26, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(17,19,24,0.45)', zIndex: 500 }}>
    <span style={{ fontVariantNumeric: 'tabular-nums', marginRight: 12, opacity: 0.7 }}>{n}</span>
    {name}
  </div>
);

const img = (k: keyof typeof IMG) => `img/${IMG[k]}`;

const HairlineGridDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    {/* the clear box spans the whole plate (4 cells each side), so no block ever hops under it */}
    <HairlineGrid at={0} blocks={5} accent="#2A4BF2" clear={[4, 1]} />
    <Center>
      <Rise at={20} style={{ background: '#FFFFFF', padding: '64px 120px', boxShadow: '0 0 0 1px #E5E5E5' }}>
        <div style={say(56, '#0E0E0E', 450)}>In every format you need</div>
      </Rise>
    </Center>
    <Label n={n} name={name} />
  </AbsoluteFill>
);

const TechGridDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <TechGrid at={0} color="#4A4E57" tick="#F0F0F0" ring={{ at: 18, r: 0.42, sweep: 300, color: '#E3A04E' }} />
    <Center>
      <Rise at={30}>
        <div style={{ ...say(96, '#F2F2F2', 500), fontFamily: fonts.geist }}>Built in the open</div>
      </Rise>
      <Rise at={38}>
        <div style={{ ...say(36, 'rgba(242,242,242,0.62)', 450), fontFamily: fonts.geist, marginTop: 22 }}>1,204 contributors, every commit public</div>
      </Rise>
    </Center>
    <Label n={n} name={name} dark />
  </AbsoluteFill>
);

const DotLatticeDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    {/* warm dots lit clearly (no grey haze), the hole cut close round a large line so it never reads as an empty box */}
    <DotLattice color="#FFB25C" shape="round" base={0.26} lit={0.65} fill={{ at: 0, dur: 24 }} hole={{ at: 30, w: 0.4, h: 0.17 }} />
    <Center>
      <Rise at={36}>
        <div style={say(110, '#FFFFFF', 560)}>Seconds later</div>
      </Rise>
    </Center>
    <Label n={n} name={name} dark />
  </AbsoluteFill>
);

const HalftoneFieldDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <HalftoneField swaps={[24, 40, 56, 72]} />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#FFFFFF', borderRadius: 18, padding: '14px 30px', ...say(48, '#1A1A1A', 420) }}>anyone can build it</div>
    </AbsoluteFill>
    <Label n={n} name={name} />
  </AbsoluteFill>
);

const PlanetRimDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <PlanetRim at={6} top={0.62} sinkAt={84} />
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: '22vh' }}>
      <Rise at={20}>
        <div style={say(104, '#FFFFFF', 550)}>Northwind 3</div>
      </Rise>
      <Rise at={28}>
        <div style={{ ...say(36, 'rgba(255,255,255,0.8)', 500), marginTop: 18 }}>The speech model for every accent</div>
      </Rise>
    </AbsoluteFill>
    <Label n={n} name={name} dark />
  </AbsoluteFill>
);

const OrbitLinesDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <OrbitLines at={2} color="#BEB9AE" count={3} />
    <Center>
      <Rise at={10}>
        <div style={say(80, '#1A1917', 460)}>And no time to read it all</div>
      </Rise>
    </Center>
    <Label n={n} name={name} />
  </AbsoluteFill>
);

const CobaltArcsDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <CobaltArcs at={0} />
    <Center>
      <Rise at={14} style={{ padding: '44px 64px', borderRadius: 22, background: 'rgba(255,255,255,0.14)', boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.25), ${softShadow(5, '#2140D9')}`, backdropFilter: 'blur(18px)' }}>
        <div style={say(76, '#FFFFFF', 500)}>Your store is live</div>
        <div style={{ ...say(36, 'rgba(255,255,255,0.78)', 450), marginTop: 14 }}>The first payment came in at 9:41</div>
      </Rise>
    </Center>
    <Label n={n} name={name} dark />
  </AbsoluteFill>
);

const PhotoPlateDemo: React.FC<DemoProps> = ({ n, name }) => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill>
      <PhotoPlate
        src={img('tide')}
        at={0}
        shapes={[
          { kind: 'rect', x: 0.43, y: 0.5, w: 0.13, h: 0.3, at: 10 },
          { kind: 'circle', x: 0.57, y: 0.5, w: 0.15, h: 0.15 * (16 / 9), at: 16 },
        ]}
        tint={{ at: 54, until: 78, color: '#C8321E', amount: 0.5, fade: 10 }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 160 }}>
        <Rise at={24}>
          <div style={{ ...say(44, '#FFFFFF', 400), textShadow: '0 2px 24px rgba(0,0,0,0.25)' }}>{f < 56 || f >= 80 ? 'Ship from anywhere' : 'One step failed'}</div>
        </Rise>
      </AbsoluteFill>
      <Label n={n} name={name} dark />
    </AbsoluteFill>
  );
};

const CuttingMatDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <CuttingMat />
    <Center>
      <Rise at={12} style={{ background: '#FFFFFF', padding: '30px 48px', borderRadius: 10, transform: 'rotate(-4deg)', boxShadow: '6px 10px 14px rgba(20,24,30,0.28)' }}>
        <div style={say(72, '#111111', 600)}>Pinned for Monday</div>
      </Rise>
    </Center>
    <Label n={n} name={name} dark />
  </AbsoluteFill>
);

const GhostWordDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <GhostWord text="harbour" at={0} />
    <Center>
      <Rise at={16}>
        <div style={say(84, '#1E201E', 500)}>Made for teams that ship</div>
      </Rise>
    </Center>
    <Label n={n} name={name} />
  </AbsoluteFill>
);

const FourUpDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <FourUp
      loops={[96, 120, 84, 108]}
      phases={[0, 31, 57, 14]}
      panels={[
        <AbsoluteFill key="a">
          <HairlineGrid at={0} blocks={4} accent="#FF7A1F" />
          <Center>
            <Rise at={14}>
              <div style={say(110, '#0E0E0E', 500)}>Every turn</div>
            </Rise>
          </Center>
        </AbsoluteFill>,
        <AbsoluteFill key="b">
          <DotLattice fill={{ at: 0, dur: 20 }} pools={1} base={0.2} hole={{ at: 16, w: 0.62, h: 0.22 }} />
          <Center>
            <Rise at={20}>
              <div style={say(110, '#FFFFFF', 500)}>Seconds later</div>
            </Rise>
          </Center>
        </AbsoluteFill>,
        <AbsoluteFill key="c">
          <PhotoPlate src={img('tide')} />
          <Center>
            <Rise at={18}>
              <div style={say(110, '#FFFFFF', 500)}>Above it all</div>
            </Rise>
          </Center>
        </AbsoluteFill>,
        <AbsoluteFill key="d">
          <OrbitLines at={0} />
          <Center>
            <Rise at={10}>
              <div style={say(96, '#1A1917', 420)}>In one place</div>
            </Rise>
          </Center>
        </AbsoluteFill>,
      ]}
    />
    <Label n={n} name={name} dark />
  </AbsoluteFill>
);

const IsoFloorDemo: React.FC<DemoProps> = ({ n, name }) => (
  <AbsoluteFill>
    <IsoFloor
      at={14}
      field="#FF6B1A"
      tiles={[
        { x: -2, y: -2, color: '#0B0B0C' },
        { x: 0, y: -2, color: '#FFFFFF', lift: 0.8 },
        { x: 1, y: 0, w: 2, color: '#0B0B0C' },
        { x: -2, y: 1, color: '#F1EEE6', lift: 0.5 },
        { x: 2, y: 2, color: '#FFFFFF', lift: 1.2 },
      ]}
    />
    <AbsoluteFill style={{ padding: '110px 120px' }}>
      <Rise at={30}>
        <div style={say(110, '#0B0B0C', 450)}>set budgets once</div>
      </Rise>
    </AbsoluteFill>
    <Label n={n} name={name} />
  </AbsoluteFill>
);

// the pieces in the order the reel plays them
export const SEGMENTS: Segment[] = [
  { name: 'HairlineGrid', from: 0, dur: 96, render: HairlineGridDemo },
  { name: 'TechGrid', from: 96, dur: 96, render: TechGridDemo },
  { name: 'DotLattice', from: 192, dur: 96, render: DotLatticeDemo },
  { name: 'HalftoneField', from: 288, dur: 90, render: HalftoneFieldDemo },
  { name: 'PlanetRim', from: 378, dur: 100, render: PlanetRimDemo },
  { name: 'OrbitLines', from: 478, dur: 90, render: OrbitLinesDemo },
  { name: 'CobaltArcs', from: 568, dur: 90, render: CobaltArcsDemo },
  { name: 'PhotoPlate', from: 658, dur: 90, render: PhotoPlateDemo },
  { name: 'CuttingMat', from: 748, dur: 90, render: CuttingMatDemo },
  { name: 'GhostWord', from: 838, dur: 90, render: GhostWordDemo },
  { name: 'FourUp', from: 928, dur: 120, render: FourUpDemo },
  { name: 'IsoFloor', from: 1048, dur: 90, render: IsoFloorDemo },
];

export const reelGroundsDuration = reelDuration(SEGMENTS);
export const ReelGrounds: React.FC = () => <Reel film="library-grounds" segments={SEGMENTS} background="#E9EBEF" />;
