// A reel of the motion library's type pieces, one after another with its name in a small corner label, on flat grounds,
// silent: render it to see them move and to pick from them.
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

type Seg = { name: string; dur: number; ground: string; node: React.ReactNode };

const DARK = '#0B0B0C';
const NIGHT = '#101012';
const PAPER = '#F3F2EE';
const WHITE = '#FFFFFF';
const INK = '#141414';
const EMBER = '#FF5A1F';

const SEGS: Seg[] = [
  {
    name: 'WeightLine',
    dur: 90,
    ground: PAPER,
    node: <WeightLine text="Every invoice sent tonight" times={[4, 13, 13, 24]} size={130} color={INK} born={EMBER} block={{ index: 3, color: INK, ink: WHITE, at: 40 }} />,
  },
  { name: 'BarStack', dur: 80, ground: WHITE, node: <BarStack lines={['plan', 'your', 'launch']} at={0} size={270} leaveAt={66} /> },
  { name: 'ScaleJump', dur: 80, ground: PAPER, node: <ScaleJump text="Shipping every week" at={2} times={[28, 38]} size={150} color={INK} /> },
  { name: 'BlockOut', dur: 46, ground: PAPER, node: <BlockOut text="Done in seconds" from={0} at={24} cover={NIGHT} block={INK} size={130} color={INK} /> },
  {
    name: 'RiseLine',
    dur: 92,
    ground: NIGHT,
    node: <RiseLine text="Made for designers" at={4} swap={{ at: 40, index: 2, word: 'founders' }} swapColor="#FF8A5C" leaveAt={74} size={130} color="#F2F2F0" />,
  },
  {
    name: 'MarkPhrase',
    dur: 84,
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
  { name: 'BlurSweep', dur: 70, ground: PAPER, node: <BlurSweep text="See you at the studio at nine?" at={4} /> },
  { name: 'RollType', dur: 62, ground: PAPER, node: <RollType text="Spring 2027" from="3" at={4} size={160} /> },
  { name: 'TrackedType', dur: 70, ground: DARK, node: <TrackedType text="Signal" at={2} size={400} glitch={[46, 48]} /> },
  { name: 'LightWord', dur: 80, ground: DARK, node: <LightWord text="2030" at={0} resolveAt={40} size={260} /> },
  { name: 'TileWord', dur: 70, ground: DARK, node: <TileWord text="Next" at={2} size={720} cell={28} /> },
  { name: 'DotWord', dur: 70, ground: DARK, node: <DotWord text="slow" at={3} size={460} cell={22} glitch={[42, 45]} /> },
  { name: 'DotDive', dur: 45, ground: '#161617', node: <DotDive char="o" at={4} size={460} /> },
  { name: 'HostType', dur: 100, ground: DARK, node: <HostType text="Anyone can build a shop tonight" at={2} /> },
  { name: 'DropWord', dur: 96, ground: WHITE, node: <DropWord text="blip" at={2} size={600} leaveAt={72} /> },
  { name: 'ArcToss', dur: 70, ground: DARK, node: <ArcToss text="Schedule" at={4} size={230} /> },
  {
    name: 'PushApart',
    dur: 76,
    ground: PAPER,
    node: <PushApart left="Meet" right="Pico" from={2} at={30} objSize={420} size={130} color={INK} node={<AppIcon size={420} colors={['#FF8A5C', '#F2552C']} glyph={<Icon name="Sparkles" size={200} color="#FFFFFF" />} />} />,
  },
];

const starts = SEGS.reduce<number[]>((a, s, i) => [...a, i === 0 ? 0 : a[i - 1] + SEGS[i - 1].dur], []);
export const reelTypeDuration = SEGS.reduce((a, s) => a + s.dur, 0);

const isDark = (c: string) => {
  const h = c.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 < 128;
};

export const ReelType: React.FC = () => (
  <AbsoluteFill style={{ background: '#000' }}>
    {SEGS.map((s, i) => (
      <Sequence key={s.name} from={starts[i]} durationInFrames={s.dur}>
        <AbsoluteFill style={{ background: s.ground, overflow: 'hidden' }}>
          {s.node}
          <div style={{ position: 'absolute', left: 40, bottom: 34, fontFamily: fonts.inter, fontWeight: 500, fontSize: 24, color: isDark(s.ground) ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}>
            {i + 1}. {s.name}
          </div>
        </AbsoluteFill>
      </Sequence>
    ))}
  </AbsoluteFill>
);
