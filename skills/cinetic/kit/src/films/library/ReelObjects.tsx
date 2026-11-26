// The reel of the motion library's objects and logos (shapes, icons, pictures, marks that move or are built).
// It plays each piece in the order of SEGMENTS, at its frames, with its name in the corner; the catalogue entries are
// in src/kit/library/catalog/object.ts. A new piece appends one segment here (from = the last segment's from + dur) and
// its catalogue entry gives the same frames. The marks and names in the demos are invented. No sound.
import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { fonts } from '../../kit/fonts';
import { AppIcon, Icon, softShadow } from '../../kit';
import { ARCH_SVG, BlobMerge, DotWave, MarkCondense, OrbitRing, SlotSwap, SpiralFan, CardDrift, BlockPrint, CellStack, ConstructType, CubeSplit, CurlRing, DealtStack, DiagonalStream, DotRing, LockupType, MarkDolly, PillBurst, PixelIris, PixelMark, PixelatePortrait, PlateSqueeze, SquareTunnel, TilePop, TumbleLockup, WireTetra } from '../../kit/library';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';
import { IMG, Pic } from './scenes';

/** The corner label every segment here draws: the piece's number and name. */
export const Label: React.FC<{ n: number; name: string; dark?: boolean }> = ({ n, name, dark }) => (
  <div style={{ position: 'absolute', left: 56, bottom: 34, fontFamily: fonts.inter, fontSize: 26, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(17,19,24,0.45)', zIndex: 500 }}>
    <span style={{ fontVariantNumeric: 'tabular-nums', marginRight: 12, opacity: 0.7 }}>{n}</span>
    {name}
  </div>
);

const PICS = Object.values(IMG).map((f) => `img/${f}`);
const CREAM = '#F3EEE6';
const NAVY = '#16233A';

/** An invented mark: a split disc, its right half lifted a step (size: its height). */
export const SplitDisc: React.FC<{ size: number; color?: string; p?: number }> = ({ size, color = NAVY, p = 1 }) => {
  const r = size / 2;
  const lift = size * 0.14 * p;
  return (
    <svg width={size * 1.08} height={size} viewBox={`0 0 ${size * 1.08} ${size}`} style={{ overflow: 'visible', display: 'block' }}>
      <path d={`M${r} 0 A${r} ${r} 0 0 0 ${r} ${size} Z`} fill={color} />
      <path d={`M${r + size * 0.08} ${-lift + size * 0.14} A${r * 0.86} ${r * 0.86} 0 0 1 ${r + size * 0.08} ${size * 0.86 - lift + size * 0.14} Z`} fill={color} opacity={0.38 + 0.62 * p} transform={`translate(${(1 - p) * -size * 0.3} 0)`} />
    </svg>
  );
};

const on = (bg: string, dark: boolean, node: React.ReactNode): React.FC<DemoProps> =>
  function Demo({ n, name }) {
    return (
      <AbsoluteFill style={{ background: bg }}>
        {node}
        <Label n={n} name={name} dark={dark} />
      </AbsoluteFill>
    );
  };

const TilePopDemo = on('#FFFFFF', false, <TilePop pics={PICS} at={0} count={26} />);
const DealtStackDemo = on('#FFFFFF', false, <DealtStack pics={PICS} at={2} before="Moments" after="kept" />);
const BlobMergeDemo = on(CREAM, false, <BlobMerge at={2} color={NAVY} mark={<SplitDisc size={190} />} />);
const LockupTypeDemo = on(CREAM, false, <LockupType at={0} name="Halden" mark={(p) => <SplitDisc size={118} p={p} />} markW={128} hold={16} build={10} color={NAVY} />);
const CubeSplitDemo = on('#FFFFFF', false, <CubeSplit at={2} side={0.08} />);
const SquareTunnelDemo = on('#F7F5F1', false, <SquareTunnel at={4} color="#F0541E" />);
const PixelMarkDemo = on('#060607', true, <PixelMark at={2} />);
/** An invented glyph for the tile: two stacked chevrons. */
const Chevrons: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 10 10">
    <path d="M2 3.2 L5 5.6 L8 3.2 M2 5.6 L5 8 L8 5.6" stroke="#fff" strokeWidth={1.35} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const TumbleLockupDemo = on('#FFFFFF', false, <TumbleLockup at={4} name="Tandem" glyph={<Chevrons size={70} />} color="#E8452C" />);

const DotRingDemo = on('#0C0D10', true, <DotRing at={2} label="linked" />);
const CurlRingDemo = on('#F6F3EE', false, <CurlRing pics={PICS} at={2} />);
const TOOLS = [
  { label: 'Notes', icon: 'StickyNote' }, { label: 'Mail', icon: 'Mail' }, { label: 'Sheets', icon: 'Sheet' }, { label: 'Calendar', icon: 'Calendar' },
  { label: 'Chat', icon: 'MessageSquare' }, { label: 'Docs', icon: 'FileText' }, { label: 'Tasks', icon: 'ListChecks' }, { label: 'Files', icon: 'Folder' }, { label: 'Drive', icon: 'Cloud' },
];
const lineStyle: React.CSSProperties = { position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)', textAlign: 'center', fontFamily: fonts.inter, fontSize: 64, fontWeight: 520, letterSpacing: '-0.02em', color: '#17181C', zIndex: 20 };
const PillLine: React.FC = () => {
  const f = useCurrentFrame();
  return <div style={lineStyle}>{f < 44 ? 'Across nine open tabs' : 'None of them talk'}</div>;
};
const PillBurstDemo = on('#FFFFFF', false, <><PillBurst items={TOOLS} at={2} fallAt={44} ground="#FFFFFF" /><PillLine /></>);
const CellStackDemo = on('#F2F2F0', false, <CellStack at={2} />);
const DiagonalStreamDemo = on('#FFFFFF', false, <><DiagonalStream pics={PICS} at={0} /><div style={{ ...lineStyle, fontSize: 44, fontWeight: 500 }}>Collected</div></>);
const BlockPrintDemo = on('#ECEEF1', false, <BlockPrint pics={PICS} at={2} />);
const MarkDollyDemo = on('#EEF1F6', false, <MarkDolly at={2} flat={ARCH_SVG(504)} />);
const PixelatePortraitDemo = on('#15110D', true, <PixelatePortrait src={PICS[3]} at={2} />);
const PixelCells: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 5 5">
    {[[0, 4], [1, 3], [2, 2], [3, 1], [4, 0], [2, 0], [3, 0], [4, 1], [4, 2]].map(([x, y]) => (
      <rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill="#fff" />
    ))}
  </svg>
);
const PlateSqueezeDemo = on('#FFFFFF', false, <PlateSqueeze at={6} color="#3A6BF2" mark={<PixelCells size={70} />} />);
const IrisFrom: React.FC = () => (
  <AbsoluteFill style={{ background: '#F1EFEA' }}>
    <div style={{ ...lineStyle, fontSize: 56 }}>Every idea, kept in one place</div>
  </AbsoluteFill>
);
const IrisTo: React.FC = () => (
  <AbsoluteFill style={{ background: '#F4EEE9' }}>
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '46%', background: '#E8503F', borderTopLeftRadius: '60% 40%', borderTopRightRadius: '40% 30%' }} />
    <div style={{ ...lineStyle, fontSize: 230, fontWeight: 700, letterSpacing: '-0.05em', color: '#1A0F0E' }}>nooka</div>
  </AbsoluteFill>
);
const PixelIrisDemo = on('#F1EFEA', false, <PixelIris at={8} from={<IrisFrom />} to={<IrisTo />} />);

const ConstructTypeDemo = on('#FFFFFF', false, <ConstructType at={2} name="Gridwell" />);
const AppTile: React.FC<{ size: number }> = ({ size }) => (
  <div style={{ width: size, height: size, borderRadius: size * 0.22, background: '#17181C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ARCH_SVG(size * 0.62, '#FFFFFF', '#8FA4BF')}</div>
);
const MarkCondenseDemo = on('#EEF0F3', false, <MarkCondense at={2} mark={<AppTile size={300} />} size={324} />);
const DotWaveDemo = on('#050506', true, <DotWave at={2} calmAt={36} />);
const ORBIT_ICONS: Array<[string, string, string]> = [
  ['Calendar', '#FF8A5C', '#F0552B'], ['Mail', '#6FA8FF', '#2F6BFF'], ['Music', '#FF7FA0', '#E8406A'], ['Camera', '#9AA3B2', '#59616F'],
  ['Map', '#5FC8F0', '#1E8FD0'], ['FileText', '#FFC65C', '#F09A1E'], ['MessageCircle', '#7FB2FF', '#3D74E8'],
];
const OrbitCentre: React.FC = () => (
  <div style={{ width: 520, height: 340, borderRadius: 40, background: '#FFFFFF', boxShadow: softShadow(5, '#DDE6F2'), padding: 40, boxSizing: 'border-box', fontFamily: fonts.inter }}>
    <div style={{ fontSize: 30, fontWeight: 600, color: '#15171C' }}>Today</div>
    {['Standup moved to 10:30', 'Draft sent to Mira', 'Flight checked in'].map((r, i) => (
      <div key={r} style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 16, fontSize: 24, color: '#3A3F4A' }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: ['#2F6BFF', '#F0552B', '#1E8FD0'][i] }} />
        {r}
      </div>
    ))}
  </div>
);
const OrbitRingDemo = on('#DDE6F2', false, <OrbitRing at={2} centre={<OrbitCentre />} items={ORBIT_ICONS.map(([g, a, b]) => <AppIcon key={g} size={130} colors={[a, b]} glyph={<Icon name={g} size={60} color="#fff" />} />)} />);
const WireTetraDemo = on('#030304', true, <WireTetra at={2} />);

const FAN_ICONS = ['Box', 'Database', 'Globe', 'Cpu', 'Table', 'FileJson', 'Image', 'Layers'];
const FanCard: React.FC<{ i: number }> = ({ i }) => {
  const kind = i % 4;
  const bg = kind === 0 ? '#EE5A2A' : kind === 1 ? '#17181C' : kind === 2 ? '#FFFFFF' : '#E9E6E1';
  const ink = kind === 0 || kind === 1 ? '#FFFFFF' : '#17181C';
  return (
    <div style={{ width: '100%', height: '100%', background: bg, borderRadius: 6, boxShadow: '0 1px 2px rgba(0,0,0,0.12), 0 6px 18px rgba(0,0,0,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={FAN_ICONS[i % FAN_ICONS.length]} size={34} color={ink} />
    </div>
  );
};
const SpiralLine: React.FC = () => {
  const f = useCurrentFrame();
  return f >= 20 ? <div style={{ ...lineStyle, fontSize: 46, fontWeight: 540 }}>Every format, one call</div> : null;
};
const SpiralFanDemo = on('#F7F6F4', false, <><SpiralFan at={2} cards={Array.from({ length: 12 }, (_, i) => <FanCard key={i} i={i} />)} /><SpiralLine /></>);
const SlotSwapDemo = on('#F4F4F2', false, <SlotSwap pics={PICS} at={2} before="Every" after="kept" />);

const DriftCard: React.FC<{ i: number }> = ({ i }) => {
  const w = [220, 170, 250, 190][i % 4];
  const h = [150, 210, 170, 140][i % 4];
  return (
    <div style={{ width: w, height: h, borderRadius: 14, overflow: 'hidden', boxShadow: softShadow(3, '#FFFFFF') }}>
      <Pic src={Object.values(IMG)[i % 6]} />
    </div>
  );
};
const DriftChip: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', borderRadius: 999, background: '#17181C', color: '#fff', fontFamily: fonts.inter, fontSize: 26, fontWeight: 500 }}>
    <Icon name={icon} size={26} color="#fff" />
    {label}
  </div>
);
const CardDriftDemo = on('#FFFFFF', false, (
  <>
    <CardDrift
      at={2}
      items={Array.from({ length: 10 }, (_, i) => <DriftCard key={i} i={i} />)}
      pops={[<DriftChip key="a" icon="FileText" label="Brief" />, <DriftChip key="b" icon="Image" label="Moodboard" />, <DriftChip key="c" icon="Type" label="Copy" />, <DriftChip key="d" icon="Palette" label="Colours" />]}
    />
    <div style={{ ...lineStyle, fontSize: 52, fontWeight: 540 }}>Everything for the launch</div>
  </>
));

// the pieces in the order the reel plays them
export const SEGMENTS: Segment[] = [
  { name: 'TilePop', from: 0, dur: 60, render: TilePopDemo },
  { name: 'DealtStack', from: 60, dur: 40, render: DealtStackDemo },
  { name: 'BlobMerge', from: 100, dur: 48, render: BlobMergeDemo },
  { name: 'LockupType', from: 148, dur: 50, render: LockupTypeDemo },
  { name: 'CubeSplit', from: 198, dur: 84, render: CubeSplitDemo },
  { name: 'SquareTunnel', from: 282, dur: 54, render: SquareTunnelDemo },
  { name: 'PixelMark', from: 336, dur: 40, render: PixelMarkDemo },
  { name: 'TumbleLockup', from: 376, dur: 36, render: TumbleLockupDemo },
  { name: 'DotRing', from: 412, dur: 62, render: DotRingDemo },
  { name: 'CurlRing', from: 474, dur: 78, render: CurlRingDemo },
  { name: 'PillBurst', from: 552, dur: 72, render: PillBurstDemo },
  { name: 'CellStack', from: 624, dur: 40, render: CellStackDemo },
  { name: 'DiagonalStream', from: 664, dur: 50, render: DiagonalStreamDemo },
  { name: 'BlockPrint', from: 714, dur: 40, render: BlockPrintDemo },
  { name: 'MarkDolly', from: 754, dur: 36, render: MarkDollyDemo },
  { name: 'PixelatePortrait', from: 790, dur: 24, render: PixelatePortraitDemo },
  { name: 'PlateSqueeze', from: 814, dur: 26, render: PlateSqueezeDemo },
  { name: 'PixelIris', from: 840, dur: 26, render: PixelIrisDemo },
  { name: 'ConstructType', from: 866, dur: 34, render: ConstructTypeDemo },
  { name: 'MarkCondense', from: 900, dur: 36, render: MarkCondenseDemo },
  { name: 'DotWave', from: 936, dur: 52, render: DotWaveDemo },
  { name: 'OrbitRing', from: 988, dur: 60, render: OrbitRingDemo },
  { name: 'WireTetra', from: 1048, dur: 76, render: WireTetraDemo },
  { name: 'SpiralFan', from: 1124, dur: 44, render: SpiralFanDemo },
  { name: 'SlotSwap', from: 1168, dur: 54, render: SlotSwapDemo },
  { name: 'CardDrift', from: 1222, dur: 60, render: CardDriftDemo },
];

export const reelObjectsDuration = reelDuration(SEGMENTS);
export const ReelObjects: React.FC = () => <Reel film="library-objects" segments={SEGMENTS} background="#E9EBEF" />;
