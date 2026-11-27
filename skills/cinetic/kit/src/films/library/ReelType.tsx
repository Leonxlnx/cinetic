// The reel of the motion library's type pieces: each piece in catalogue order (src/kit/library/catalog/), at its
// catalogue frames, with its name in a small corner label, on flat grounds, silent. A new type piece: its look in
// SEGS (ground and node) and one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill, Img, Sequence, staticFile } from 'remotion';
import { fonts } from '../../kit/fonts';
import { AppIcon, Icon } from '../../kit/icons';
import {
  ArcToss,
  BarStack,
  CaretFollow,
  ClipExit,
  CornerLine,
  CutAway,
  GradientPass,
  InlineChip,
  LetterRewrite,
  LightStreak,
  TypeHead,
  WordTicker,
  BlockOut,
  BlurSweep,
  DotDive,
  DotWord,
  DropWord,
  EatSquares,
  EchoStack,
  FaceCycle,
  GatherLine,
  GiantTruck,
  HingeWord,
  HostType,
  HUE_PATH,
  InkLine,
  LightWord,
  MarkPhrase,
  OutlineFill,
  PartStack,
  PushApart,
  RandomFill,
  RiseLine,
  RollType,
  ScaleJump,
  ScrambleType,
  SlideOff,
  SplitWord,
  StepWhip,
  TagSlap,
  TokenBlocks,
  TileWord,
  TrackedType,
  WeightLine,
} from '../../kit/library/type';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';

type Seg = { ground: string; node: React.ReactNode };

const DARK = '#0B0B0C';
const NIGHT = '#101012';
const PAPER = '#F3F2EE';
const WHITE = '#FFFFFF';
const INK = '#141414';
const EMBER = '#FF5A1F';
const COBALT = '#2F6BE0';

// tonight's additions: each demo in its own Sequence parts where a piece has several modes
const inkLineDemo = (
  <>
    <Sequence durationInFrames={46} layout="none">
      <InkLine text="Your plans live in one place" at={2} gap={8} size={104} color={INK} />
    </Sequence>
    <Sequence from={46} durationInFrames={46} layout="none">
      <AbsoluteFill style={{ background: '#F7F5F1' }} />
      <InkLine text="What if your week planned itself" at={1} gap={7} size={100} color={INK} tint={HUE_PATH} />
    </Sequence>
    <Sequence from={92} durationInFrames={48} layout="none">
      <AbsoluteFill style={{ background: WHITE }} />
      <InkLine text="Notes that write themselves tonight" at={1} gap={7} size={96} color={INK} tint="heat" space="close" />
    </Sequence>
    <Sequence from={140} durationInFrames={52} layout="none">
      <InkLine text="Every invoice, receipt and contract you have sent this year" at={1} gap={5} size={120} color={INK} fit={0.84} />
    </Sequence>
    <Sequence from={192} layout="none">
      <InkLine text="Your work is split across nine tools" at={3} gap={10} size={104} color={INK} anticipate={2} lead={0.39} tau={4.5} space="close" />
    </Sequence>
  </>
);

const PICS = ['img/hokianga-tide-out.jpg', 'img/waves-009.jpg', 'img/seaweed-farms-in-south-korea.jpg', 'img/cloud-streets-over-the-bering-sea.jpg'];

const tagDemo = (
  <>
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.inter, fontWeight: 700, fontSize: 330, letterSpacing: '-0.05em', color: INK }}>Studio</div>
    <TagSlap tags={[{ text: 'Launch films', at: 8, x: 0.33, y: 0.3, rot: -3 }, { text: 'Product demos', at: 26, x: 0.66, y: 0.71, rot: 2 }, { text: 'Weekly cuts', at: 42, x: 0.35, y: 0.76, rot: -2 }]} />
  </>
);

const hingeDemo = (
  <>
    <div style={{ position: 'absolute', left: 560, top: 380, width: 320, height: 320, borderRadius: 28, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,.08), 0 18px 50px rgba(0,0,0,.12)' }}>
      <Img src={staticFile('img/hokianga-tide-out.jpg')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
    </div>
    <HingeWord words={['Coastlines', 'Harbours', 'Islands']} times={[4, 30, 54]} x={940} y={540} size={84} />
  </>
);

const CODE = [
  [{ text: 'const', color: '#E07A8B' }, { text: ' ' }, { text: 'route', color: '#7FB2F0' }, { text: ' = ' }, { text: 'plan', color: '#7FB2F0' }, { text: '(' }, { text: 'trip', color: '#E8E6E1' }, { text: ', { ' }, { text: 'days', color: '#E8E6E1' }, { text: ': ' }, { text: '3', color: '#E8C27A' }, { text: ' });' }],
  [{ text: 'await', color: '#E07A8B' }, { text: ' ' }, { text: 'route', color: '#7FB2F0' }, { text: '.' }, { text: 'share', color: '#7FB2F0' }, { text: '(' }, { text: "'team'", color: '#E8C27A' }, { text: ');' }],
];

const SEGS: Record<string, Seg> = {
  OutlineFill: { ground: PAPER, node: <OutlineFill text="Field notes" at={2} gapMin={3} gapMax={6} size={240} ground={PAPER} /> },
  WordTicker: { ground: NIGHT, node: <WordTicker text="Sorting every note by hand" times={[4, 12, 20, 28, 38]} keep={3} flashes={[{ at: 32, index: 3 }]} /> },
  RandomFill: { ground: NIGHT, node: <RandomFill text="Syncing your calendars" at={4} size={70} /> },
  LetterRewrite: { ground: PAPER, node: <LetterRewrite from="Draft" to="Final" at={12} size={150} color={INK} /> },
  TokenBlocks: { ground: '#15161A', node: <TokenBlocks lines={CODE} at={4} size={48} /> },
  GiantTruck: { ground: WHITE, node: <GiantTruck text="Plan any trip" at={0} color={INK} /> },
  EatSquares: { ground: WHITE, node: <EatSquares text="Gridwork Studio" at={16} size={96} /> },
  SlideOff: { ground: PAPER, node: <SlideOff lines={['Plan less', 'ship more']} at={16} dur={14} dir="shear" size={150} color={INK} /> },
  PartStack: {
    ground: NIGHT,
    node: <PartStack text="Every coast matters" after={0} at={8} size={96} pictures={[...PICS, 'img/earth-observations-taken-by-expedition-26.jpg', 'img/earth-observations-taken-by-the-expedition.jpg']} />,
  },
  StepWhip: { ground: PAPER, node: <StepWhip text="Your inbox is a little full" times={[4, 6, 8, 18, 20, 22]} still={50} size={84} color={INK} /> },
  HingeWord: { ground: WHITE, node: hingeDemo },
  LightStreak: { ground: DARK, node: <LightStreak text="Everyone has a story" at={4} leaveAt={46} size={76} /> },
  ClipExit: {
    ground: PAPER,
    node: <ClipExit text="Your team in one view" at={22} objectAt={0} size={92} color={INK} w={150} h={150} node={<AppIcon size={150} colors={['#FF8A5C', '#F2552C']} glyph={<Icon name="LayoutGrid" size={70} color="#FFFFFF" />} />} />,
  },
  SplitWord: { ground: WHITE, node: <SplitWord text="Mapping" split={3} at={4} pictures={['img/hokianga-tide-out.jpg', 'img/seaweed-farms-in-south-korea.jpg']} swaps={[34]} size={210} color={INK} /> },
  EchoStack: { ground: DARK, node: <EchoStack text="Growing" at={3} size={180} labels={['team of four', 'first hundred users', 'twelve cities', 'week nine', 'two offices', 'six new hires']} zoomAt={36} ground={DARK} /> },
  TagSlap: { ground: WHITE, node: tagDemo },
  GatherLine: { ground: PAPER, node: <GatherLine text="Every note finds its place" at={0} gatherAt={26} spread={[0.72, 0.4]} size={84} color={INK} /> },
  CornerLine: { ground: PAPER, node: <CornerLine text="Plans that keep themselves" at={4} gap={9} size={92} color={INK} flash={EMBER} /> },
  CutAway: { ground: PAPER, node: <CutAway text="Your files sit in six different apps" at={16} size={88} color={INK} /> },
  GradientPass: { ground: PAPER, node: <GradientPass text="Keep every idea without losing the thread" at={3} size={78} color={INK} /> },
  TypeHead: { ground: WHITE, node: <TypeHead text="Find the slides from Tuesday" at={4} size={84} color={INK} accent={EMBER} caret /> },
  CaretFollow: { ground: '#17171A', node: <CaretFollow text="Plan a dinner for twelve on Friday" at={2} accentFrom={5} accent="#7C9BFF" /> },
  InlineChip: { ground: PAPER, node: <InlineChip text="We map the coast from above every morning" after={3} at={8} w={2.1} h={1.0} pictures={PICS} every={12} grow={{ at: 58, w: 3.4, h: 1.7 }} size={72} color={INK} /> },
  InkLine: { ground: PAPER, node: inkLineDemo },
  ScrambleType: {
    ground: NIGHT,
    node: <ScrambleType text="Draft" at={2} brackets size={96} swaps={[{ at: 34, text: 'Review', size: 132 }, { at: 56, text: 'Publish', size: 118 }]} closeAt={74} />,
  },
  FaceCycle: { ground: PAPER, node: <FaceCycle text="Every draft finds its reader" at={0} gap={4} size={72} color={INK} accent={COBALT} flip={{ index: 1, at: 44 }} /> },
  WeightLine: {
    ground: PAPER,
    node: <WeightLine text="Every invoice sent tonight" times={[4, 13, 13, 24]} size={130} color={INK} born={EMBER} block={{ index: 3, color: INK, ink: WHITE, at: 40 }} leaveAt={88} />,
  },
  BarStack: { ground: WHITE, node: <BarStack lines={['plan', 'your', 'launch']} at={0} size={270} leaveAt={66} /> },
  ScaleJump: { ground: PAPER, node: <ScaleJump text="Shipping every week" at={2} times={[28, 38]} size={150} color={INK} /> },
  BlockOut: { ground: PAPER, node: <BlockOut text="Done in seconds" from={0} at={24} cover={NIGHT} block={INK} size={130} color={INK} /> },
  RiseLine: {
    ground: NIGHT,
    node: <RiseLine text="Made for designers" at={4} swap={{ at: 40, index: 2, word: 'founders' }} swapColor="#FF8A5C" leaveAt={74} size={130} color="#F2F2F0" />,
  },
  MarkPhrase: {
    ground: PAPER,
    node: (
      <>
        <Sequence durationInFrames={18} layout="none">
          <RiseLine text="Reviews take minutes, not days" at={2} size={110} color={INK} />
        </Sequence>
        <Sequence from={18} layout="none">
          <MarkPhrase
            text="Reviews take minutes, not days"
            size={110}
            color={INK}
            marks={[
              { from: 2, to: 2, at: 4, kind: 'highlight', color: INK, ink: WHITE },
              { from: 3, to: 4, at: 26, kind: 'underline', color: EMBER },
            ]}
          />
        </Sequence>
      </>
    ),
  },
  BlurSweep: { ground: PAPER, node: <BlurSweep text="See you at the studio at nine?" at={4} /> },
  RollType: { ground: PAPER, node: <RollType text="Spring 2027" from="3" at={4} size={160} /> },
  TrackedType: { ground: DARK, node: <TrackedType text="Signal" at={2} size={400} glitch={[46, 48]} /> },
  LightWord: { ground: DARK, node: <LightWord text="2030" at={0} resolveAt={40} size={260} /> },
  TileWord: { ground: DARK, node: <TileWord text="Next" at={2} size={720} cell={28} /> },
  DotWord: { ground: DARK, node: <DotWord text="slow" at={3} size={460} cell={22} glitch={[42, 45]} /> },
  DotDive: { ground: '#161617', node: <DotDive char="o" at={4} size={460} /> },
  HostType: { ground: DARK, node: <HostType text="Anyone can build a shop tonight" at={2} /> },
  DropWord: { ground: WHITE, node: <DropWord text="blip" at={2} size={600} leaveAt={72} /> },
  ArcToss: { ground: DARK, node: <ArcToss text="Schedule" at={4} size={230} /> },
  PushApart: {
    ground: PAPER,
    node: <PushApart left="Meet" right="Pico" from={2} at={30} objSize={420} size={130} color={INK} node={<AppIcon size={420} colors={['#FF8A5C', '#F2552C']} glyph={<Icon name="Package" size={200} color="#FFFFFF" />} />} />,
  },
};

const isDark = (c: string) => {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 128;
};

/** One type piece on its ground, with its number and name in the corner. */
const shot =
  (s: Seg): React.FC<DemoProps> =>
  ({ n, name }) => (
    <AbsoluteFill style={{ background: s.ground, overflow: 'hidden' }}>
      {s.node}
      <div style={{ position: 'absolute', left: 40, bottom: 34, fontFamily: fonts.inter, fontWeight: 500, fontSize: 24, color: isDark(s.ground) ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}>
        {n}. {name}
      </div>
    </AbsoluteFill>
  );

// the pieces in the order the reel plays them; a new piece appends its segment (from = the last from + dur) and
// gives its catalogue entry the same frames
export const SEGMENTS: Segment[] = [
  { name: 'WeightLine', from: 0, dur: 90, render: shot(SEGS.WeightLine) },
  { name: 'BarStack', from: 90, dur: 80, render: shot(SEGS.BarStack) },
  { name: 'ScaleJump', from: 170, dur: 80, render: shot(SEGS.ScaleJump) },
  { name: 'BlockOut', from: 250, dur: 46, render: shot(SEGS.BlockOut) },
  { name: 'RiseLine', from: 296, dur: 92, render: shot(SEGS.RiseLine) },
  { name: 'MarkPhrase', from: 388, dur: 84, render: shot(SEGS.MarkPhrase) },
  { name: 'BlurSweep', from: 472, dur: 70, render: shot(SEGS.BlurSweep) },
  { name: 'RollType', from: 542, dur: 62, render: shot(SEGS.RollType) },
  { name: 'TrackedType', from: 604, dur: 70, render: shot(SEGS.TrackedType) },
  { name: 'LightWord', from: 674, dur: 80, render: shot(SEGS.LightWord) },
  { name: 'TileWord', from: 754, dur: 70, render: shot(SEGS.TileWord) },
  { name: 'DotWord', from: 824, dur: 70, render: shot(SEGS.DotWord) },
  { name: 'DotDive', from: 894, dur: 45, render: shot(SEGS.DotDive) },
  { name: 'HostType', from: 939, dur: 100, render: shot(SEGS.HostType) },
  { name: 'DropWord', from: 1039, dur: 96, render: shot(SEGS.DropWord) },
  { name: 'ArcToss', from: 1135, dur: 70, render: shot(SEGS.ArcToss) },
  { name: 'PushApart', from: 1205, dur: 76, render: shot(SEGS.PushApart) },
  { name: 'InkLine', from: 1281, dur: 240, render: shot(SEGS.InkLine) },
  { name: 'ScrambleType', from: 1521, dur: 84, render: shot(SEGS.ScrambleType) },
  { name: 'FaceCycle', from: 1605, dur: 64, render: shot(SEGS.FaceCycle) },
  { name: 'CornerLine', from: 1669, dur: 70, render: shot(SEGS.CornerLine) },
  { name: 'CutAway', from: 1739, dur: 40, render: shot(SEGS.CutAway) },
  { name: 'GradientPass', from: 1779, dur: 84, render: shot(SEGS.GradientPass) },
  { name: 'TypeHead', from: 1863, dur: 56, render: shot(SEGS.TypeHead) },
  { name: 'CaretFollow', from: 1919, dur: 90, render: shot(SEGS.CaretFollow) },
  { name: 'InlineChip', from: 2009, dur: 84, render: shot(SEGS.InlineChip) },
  { name: 'EchoStack', from: 2093, dur: 43, render: shot(SEGS.EchoStack) },
  { name: 'TagSlap', from: 2136, dur: 64, render: shot(SEGS.TagSlap) },
  { name: 'GatherLine', from: 2200, dur: 56, render: shot(SEGS.GatherLine) },
  { name: 'LightStreak', from: 2256, dur: 60, render: shot(SEGS.LightStreak) },
  { name: 'ClipExit', from: 2316, dur: 50, render: shot(SEGS.ClipExit) },
  { name: 'SplitWord', from: 2366, dur: 60, render: shot(SEGS.SplitWord) },
  { name: 'HingeWord', from: 2426, dur: 76, render: shot(SEGS.HingeWord) },
  { name: 'StepWhip', from: 2502, dur: 60, render: shot(SEGS.StepWhip) },
  { name: 'PartStack', from: 2562, dur: 50, render: shot(SEGS.PartStack) },
  { name: 'SlideOff', from: 2612, dur: 32, render: shot(SEGS.SlideOff) },
  { name: 'EatSquares', from: 2644, dur: 44, render: shot(SEGS.EatSquares) },
  { name: 'OutlineFill', from: 2688, dur: 100, render: shot(SEGS.OutlineFill) },
  { name: 'WordTicker', from: 2788, dur: 60, render: shot(SEGS.WordTicker) },
  { name: 'RandomFill', from: 2848, dur: 36, render: shot(SEGS.RandomFill) },
  { name: 'LetterRewrite', from: 2884, dur: 50, render: shot(SEGS.LetterRewrite) },
  { name: 'TokenBlocks', from: 2934, dur: 50, render: shot(SEGS.TokenBlocks) },
  { name: 'GiantTruck', from: 2984, dur: 50, render: shot(SEGS.GiantTruck) },
];

export const reelTypeDuration = reelDuration(SEGMENTS);
export const ReelType: React.FC = () => <Reel film="library-type" segments={SEGMENTS} background="#000" />;
