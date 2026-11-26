// The reel of the motion library's design presets (named looks).
// It plays each piece in the order of SEGMENTS, at its frames, with its name in the corner; the catalogue entries are
// in src/kit/library/catalog/design.ts. A new piece appends one segment here (from = the last segment's from + dur)
// and its catalogue entry gives the same frames. Each preset is shown as a designed frame (DesignFrame: a statement,
// a card, a picture and a mark placeholder in the look) over its own ground piece.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { fonts } from '../../kit/fonts';
import {
  Blockprint, Cobalt, CobaltArcs, Cream, CuttingMat, type Design, DesignFrame, DotLattice, Drafting, Ember, Folio, Frost, Gallery, HairlineGrid, IsoFloor,
  Nightdesk, OrbitLines, PhotoPlate, Pixel, PlanetRim, Quiet, Shout, Sketchbook, TechGrid, Tray,
} from '../../kit/library';
import { luminance } from '../../kit';
import { Reel, reelDuration, type DemoProps, type Segment } from './reel';
import { IMG } from './scenes';

/** The corner label every segment here draws: the piece's number and name. */
export const Label: React.FC<{ n: number; name: string; dark?: boolean }> = ({ n, name, dark }) => (
  <div style={{ position: 'absolute', left: 56, bottom: 34, fontFamily: fonts.inter, fontSize: 26, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(17,19,24,0.45)', zIndex: 500 }}>
    <span style={{ fontVariantNumeric: 'tabular-nums', marginRight: 12, opacity: 0.7 }}>{n}</span>
    {name}
  </div>
);

const img = (k: keyof typeof IMG) => `img/${IMG[k]}`;

/** One preset's segment: its designed frame over its ground, its name in the corner. */
const demo = (d: Design, statement: string, opts: { ground?: React.ReactNode; picture?: keyof typeof IMG; align?: 'left' | 'center'; dark?: boolean; plate?: string } = {}) => {
  const Demo: React.FC<DemoProps> = ({ n, name }) => (
    <AbsoluteFill>
      <DesignFrame design={d} statement={statement} ground={opts.ground} picture={img(opts.picture ?? 'waves')} align={opts.align} plate={opts.plate} />
      <Label n={n} name={name} dark={opts.dark ?? luminance(d.palette.ground) < 0.4} />
    </AbsoluteFill>
  );
  return Demo;
};

// the pieces in the order the reel plays them
export const SEGMENTS: Segment[] = [
  { name: 'Drafting', from: 0, dur: 75, render: demo(Drafting, 'Every turn, cached', { ground: <HairlineGrid at={-1} blocks={3} accent={Drafting.palette.accent} clear={[3, 2]} />, picture: 'farms' }) },
  { name: 'Blockprint', from: 75, dur: 75, render: demo(Blockprint, 'Set budgets once', { ground: <IsoFloor at={-24} field={Blockprint.palette.ground} />, picture: 'delta' }) },
  { name: 'Nightdesk', from: 150, dur: 75, render: demo(Nightdesk, 'Built in the open', { ground: <TechGrid at={-1} ring={{ at: 0, r: 0.42 }} />, picture: 'shore' }) },
  { name: 'Ember', from: 225, dur: 75, render: demo(Ember, 'Hear every accent', { ground: <PlanetRim at={0} top={0.86} />, picture: 'cloud' }) },
  { name: 'Gallery', from: 300, dur: 75, render: demo(Gallery, 'The work, done together', { picture: 'tide' }) },
  { name: 'Quiet', from: 375, dur: 75, render: demo(Quiet, 'Your work, in one place', { picture: 'waves' }) },
  { name: 'Cream', from: 450, dur: 75, render: demo(Cream, 'And no time to read it all', { ground: <OrbitLines at={-30} ground={Cream.palette.ground} />, picture: 'shore' }) },
  { name: 'Folio', from: 525, dur: 75, render: demo(Folio, 'Made for the shoot', { ground: <HairlineGrid at={-1} ground={Folio.palette.ground} color="#DEDEDA" cell={0.031} marks="none" />, picture: 'tide' }) },
  { name: 'Pixel', from: 600, dur: 75, render: demo(Pixel, 'Thousands of products ship', { ground: <DotLattice shape="round" pools={2} />, picture: 'farms' }) },
  { name: 'Sketchbook', from: 675, dur: 75, render: demo(Sketchbook, 'Scaling by hand', { ground: <CuttingMat blinds={0.22} />, picture: 'delta' }) },
  { name: 'Cobalt', from: 750, dur: 75, render: demo(Cobalt, 'Paid In Minutes', { ground: <CobaltArcs at={-1} />, picture: 'waves' }) },
  { name: 'Frost', from: 825, dur: 75, render: demo(Frost, 'Ask anything about the trip', { ground: <PhotoPlate src={img('tide')} grade="saturate(0.9) brightness(0.8)" />, picture: 'shore', plate: 'rgba(12,14,18,0.72)' }) },
  { name: 'Tray', from: 900, dur: 75, render: demo(Tray, 'behind the product', { picture: 'farms' }) },
  { name: 'Shout', from: 975, dur: 75, render: demo(Shout, 'Launch it loud', { ground: <HairlineGrid at={-1} color="#E8E8EC" cell={0.028} marks="none" />, picture: 'tide' }) },
];

export const reelDesignsDuration = reelDuration(SEGMENTS);
export const ReelDesigns: React.FC = () => <Reel film="library-designs" segments={SEGMENTS} background="#E9EBEF" />;
