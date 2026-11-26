// The reel of the motion library's type pieces: each piece in catalogue order (src/kit/library/catalog/), at its
// catalogue frames, with its name in a small corner label, on flat grounds, silent. A new type piece: its look in
// SEGS (ground and node) and one segment appended to SEGMENTS.
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { fonts } from '../../kit/fonts';
import { AppIcon, Icon } from '../../kit/icons';
import {
  ArcToss,
  BarStack,
  BlockOut,
  BlurSweep,
  DotDive,
  DotWord,
  DropWord,
  HostType,
  LightWord,
  MarkPhrase,
  PushApart,
  RiseLine,
  RollType,
  ScaleJump,
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

const SEGS: Record<string, Seg> = {
  WeightLine: {
    ground: PAPER,
    node: <WeightLine text="Every invoice sent tonight" times={[4, 13, 13, 24]} size={130} color={INK} born={EMBER} block={{ index: 3, color: INK, ink: WHITE, at: 40 }} />,
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
];

export const reelTypeDuration = reelDuration(SEGMENTS);
export const ReelType: React.FC = () => <Reel film="library-type" segments={SEGMENTS} background="#000" />;
