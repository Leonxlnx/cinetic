import React from 'react';
import { AbsoluteFill } from 'remotion';
import { U } from '../brand/tokens';
import { DirBlur } from '../fx/Defocus';
import { growthSteps } from '../fx/Roll';
import { flickFeed, flickState } from '../fx/Scroll';
import { Avatar, face, KIT_TYPE, Pill, surfaceShadow } from '../kit';
import { clamp, E, fd, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { DARK, useAbs } from './stage';

// FEED - step two: the product reads every item. The feed opens on the whip's speed, ramps into a hard thumb flick
// (fx/Scroll flickFeed, smeared along the scroll by fx/Defocus DirBlur), brakes and lands on the item that matters,
// while the pill above counts what has been read, faster and faster, then jumps to the total. The found item lifts,
// the rest fall away, and it collapses into the insight's pill (the next act opens on that pill).

/** The list: rows `pitch` apart, the key row landing at the centre after `landRow` rows of travel. */
export const FEED = { w: 1120 * U, h: 150 * U, pitch: 172 * U, landRow: 22, rows: 30 } as const;
/** The insight pill's box (screen px), where the found item collapses to: Insight.tsx draws the pill there. */
export const PILL_BOX = { w: 960 * U, h: 132 * U, cx: W / 2, cy: 600 * U } as const;

const flick = flickFeed(ACT.feed.from, { fps: FPS, width: W, height: H }, { brake: { fast: 0.922, share: 0.6, slow: 0.96 }, distance: FEED.landRow * FEED.pitch });
/** The counter's steps (whole frames): it grows as the feed is read, then jumps to the total. */
export const COUNT = growthSteps(CUE.count, WALK.feed.total, {}, FPS);
const countAt = (F: number) => COUNT.filter((s) => fd(F) >= s.at).pop()?.value ?? 0;
/** The feed row shown at list index i (the key row lands on index landRow). */
const rowOf = (i: number) => WALK.feed.rows[(((i - FEED.landRow + WALK.feed.key) % WALK.feed.rows.length) + WALK.feed.rows.length) % WALK.feed.rows.length];

const Item: React.FC<{ i: number; on: number }> = ({ i, on }) => {
  const t = DARK;
  const r = rowOf(i);
  return (
    <div data-ui style={{ position: 'relative', width: FEED.w, height: FEED.h, borderRadius: 30 * U, background: t.surface, boxShadow: `${surfaceShadow(t, mix(10, 30, on), U)}, inset 0 0 0 ${(3 * U * on).toFixed(2)}px ${t.accent}`, display: 'flex', alignItems: 'center', gap: 28 * U, padding: `0 ${36 * U}px`, boxSizing: 'border-box' }}>
      <Avatar theme={t} i={i} initials={r.initials} size={92 * U} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 * U }}>
        <span data-text={`feed-who-${i}`} style={face(KIT_TYPE.label * U, 600, t.mute)}>
          {r.who}
        </span>
        <span data-text={`feed-text-${i}`} style={face(KIT_TYPE.body * U, 560, mixColor(t.text, t.accent, on))}>
          {r.text}
        </span>
      </div>
    </div>
  );
};

export const Feed: React.FC = () => {
  const F = useAbs('feed');
  const t = DARK;
  const s = flickState(F, flick, { fps: FPS, width: W, height: H });
  const landed = prog(F, CUE.land - f60x(6), CUE.land + f60x(10), E.snapOut);
  const lift = prog(F, CUE.lift, CUE.lift + f60x(12), E.snapOut);
  const fall = prog(F, CUE.lift, CUE.lift + f60x(10), E.buildIn); // the other rows fall away
  // the found item collapses into the pill: width and height lead, 70 % of the change on its last frames
  const m = prog(F, CUE.morph, ACT.insight.from, E.buildIn);
  const box = { w: mix(FEED.w * (1 + 0.04 * lift), PILL_BOX.w, m), h: mix(FEED.h * (1 + 0.04 * lift), PILL_BOX.h, m), cy: mix(H / 2, PILL_BOX.cy, m) };
  const count = countAt(F);
  const cx = (W - FEED.w) / 2;
  return (
    <AbsoluteFill style={{ background: t.ground, overflow: 'hidden' }}>
      <DirBlur v={s.v} axis="y" id="feed-flick" style={{ maskImage: 'linear-gradient(180deg, transparent 0%, black 22%, black 82%, transparent 100%)' }}>
        {Array.from({ length: FEED.rows }, (_, i) => {
          const y = H / 2 - FEED.h / 2 + i * FEED.pitch - s.y;
          if (y < -FEED.h * 2 || y > H + FEED.h) return null;
          const key = i === FEED.landRow;
          if (key && F >= CUE.lift) return null; // drawn on its own below, lifting and collapsing
          return (
            <div key={i} style={{ position: 'absolute', left: 0, top: 0, opacity: key ? 1 : 1 - fall, transform: `translate3d(${cx.toFixed(2)}px, ${(y + fall * 80 * U).toFixed(2)}px, 0)` }}>
              <Item i={i} on={key ? landed : 0} />
            </div>
          );
        })}
      </DirBlur>
      {F >= CUE.lift && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, borderRadius: mix(30 * U, PILL_BOX.h / 2, m), overflow: 'hidden', background: t.surface, boxShadow: `${surfaceShadow(t, 34, U)}, inset 0 0 0 ${(3 * U).toFixed(2)}px ${t.accent}`, transform: `translate3d(${(W / 2 - box.w / 2).toFixed(2)}px, ${(box.cy - box.h / 2).toFixed(2)}px, 0)` }}>
          <div style={{ opacity: 1 - clamp(m / 0.35), transform: `translate3d(0, ${(-26 * U * m).toFixed(2)}px, 0)` }}>
            <Item i={FEED.landRow} on={1} />
          </div>
        </div>
      )}
      {/* the counter: what has been read so far */}
      <div style={{ position: 'absolute', left: 0, top: 70 * U, width: W, display: 'flex', justifyContent: 'center', opacity: 1 - clamp(m * 2) }}>
        <Pill theme={t} h={104 * U} label={`${WALK.feed.label} ${count.toLocaleString('en-US')} ${WALK.feed.unit}`} spin={(F - ACT.feed.from) * 9} done={count >= WALK.feed.total} id="feed-count" />
      </div>
    </AbsoluteFill>
  );
};
