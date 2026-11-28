// The frame every library reel shares. A reel file holds one list of segments, { name, from, dur, render }, in the order
// it plays them: each segment starts where the one before it ends (`from` = the previous `from + dur`) and its piece's
// catalogue entry gives the same frames (`reel: { from, to: from + dur - 1 }`); scripts/library-docs.mjs --check
// verifies both. A new piece appends one segment to its category's reel.
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { fonts } from '../../kit/fonts';

/** What a reel passes each segment: its place in the reel (from 1) and the piece's name. */
export type DemoProps = { n: number; name: string };
/** One piece in a reel: its catalogue name, its first frame, its length, and what it draws. Numbers written out. */
export type Segment = { name: string; from: number; dur: number; render: React.FC<DemoProps> };

/** The length of a reel with no pieces yet: one card that says so. */
const EMPTY = 30;

/** A reel's length: to the end of its last segment (an empty reel: its one card). */
export const reelDuration = (segments: Segment[]) => (segments.length ? Math.max(...segments.map((s) => s.from + s.dur)) : EMPTY);

/** A reel: each segment in a Sequence at its frames; a reel with no pieces yet shows one card that says so. */
export const Reel: React.FC<{ film: string; segments: Segment[]; background: string }> = ({ film, segments, background }) => (
  <AbsoluteFill style={{ background }}>
    {segments.length ? (
      segments.map((s, i) => (
        <Sequence key={s.name} from={s.from} durationInFrames={s.dur}>
          <s.render n={i + 1} name={s.name} />
        </Sequence>
      ))
    ) : (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ padding: '36px 56px', borderRadius: 28, background: '#FFFFFF', boxShadow: '0 1px 2px rgba(0,0,0,0.06), 0 12px 40px rgba(0,0,0,0.08)', fontFamily: fonts.inter, color: '#141519', textAlign: 'center' }}>
          <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em' }}>{film}</div>
          <div style={{ fontSize: 30, marginTop: 10, color: '#5D6470' }}>empty: no pieces yet</div>
        </div>
      </AbsoluteFill>
    )}
  </AbsoluteFill>
);
