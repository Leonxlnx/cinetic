// The reel of the motion library's objects and logos (shapes, icons, pictures, marks that move or are built).
// It plays each piece in the order of SEGMENTS, at its frames, with its name in the corner; the catalogue entries are
// in src/kit/library/catalog/object.ts. Empty until the first piece lands (one card says so): a new piece appends one
// segment here (from = the last segment's from + dur) and its catalogue entry gives the same frames.
import React from 'react';
import { fonts } from '../../kit/fonts';
import { Reel, reelDuration, type Segment } from './reel';

/** The corner label every segment here draws: the piece's number and name. */
export const Label: React.FC<{ n: number; name: string; dark?: boolean }> = ({ n, name, dark }) => (
  <div style={{ position: 'absolute', left: 56, bottom: 34, fontFamily: fonts.inter, fontSize: 26, fontWeight: 500, color: dark ? 'rgba(255,255,255,0.55)' : 'rgba(17,19,24,0.45)', zIndex: 500 }}>
    <span style={{ fontVariantNumeric: 'tabular-nums', marginRight: 12, opacity: 0.7 }}>{n}</span>
    {name}
  </div>
);

// the pieces in the order the reel plays them, e.g. { name: 'PushIn', from: 0, dur: 90, render: PushInDemo }
export const SEGMENTS: Segment[] = [];

export const reelObjectsDuration = reelDuration(SEGMENTS);
export const ReelObjects: React.FC = () => <Reel film="library-objects" segments={SEGMENTS} background="#E9EBEF" />;
