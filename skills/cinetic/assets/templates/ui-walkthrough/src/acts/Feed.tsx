import React from 'react';
import { AbsoluteFill, staticFile } from 'remotion';
import { U } from '../brand/tokens';
import { DEAL } from '../deal';
import { Defocus, DirBlur } from '../fx/Defocus';
import { Lit } from '../fx/Lit';
import { growthSteps } from '../fx/Roll';
import { flickFeed, flickState } from '../fx/Scroll';
import { Avatar, AvatarStack, ContentTicker, DenseScreen, face, filmWorld, KIT_TYPE, Pill, type SampleWorld, surfaceShadow, type TileNode } from '../kit';
import { clamp, E, fd, lmix, mix, prog } from '../lib/anim';
import { mixColor } from '../lib/color';
import { ACT, CUE, f60x, FPS, H, W } from '../timeline';
import { WALK } from '../walk';
import { WHIP_UP } from './Field';
import { carryIn, Ground, HOLD, GROUNDS, themeOf, useAbs } from './stage';

// FEED - step two: the product reads every item, by the dealt device: 'lens' is the product's own dense screen (kit
// DenseScreen: a table of real rows, one line lifted and readable) whose focus line travels down the rows, gliding a
// row at a time and quickening, while the camera follows; 'flick' is a feed flicked past by a thumb (fx/Scroll, smeared
// along its travel by DirBlur) that brakes onto the item; 'ticker' is the items flowing past as content tiles on two
// depths. All three land on the item that matters, which lifts to the front and collapses into the insight's pill (the
// next act opens on that pill). The act opens on the whip's upward speed, carried and settling.

/** The found item as a card, and the insight pill's box (screen px) it collapses into: Insight.tsx draws the pill there. */
export const FEED = { w: 1120 * U, h: 150 * U, pitch: 172 * U, landRow: 22, rows: 30 } as const;
export const PILL_BOX = { w: 1240 * U, h: 164 * U, cx: W / 2, cy: 640 * U } as const;

/** The pill's own content (the people who asked, the insight): drawn by the feed as the morph lands and by the insight after it. */
export const PillContent: React.FC<{ chip?: number; opacity?: number }> = ({ chip = 0, opacity = 1 }) => {
  const t = themeOf('insight');
  const people = WALK.feed.rows.slice(0, 3).map((r) => ({ initials: r.initials, seed: r.who, src: facePhoto(r) })); // a real portrait, else the initials
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', gap: 30 * U, padding: `0 ${36 * U}px`, boxSizing: 'border-box', opacity }}>
      <AvatarStack theme={t} people={people} size={96 * U} ring={t.surface} kind="monogram" />
      <span data-text="insight-text" style={{ ...face(KIT_TYPE.body * U * 1.3, 620, t.text, -0.02), flex: 1 }}>
        {WALK.insight.text}
      </span>
      <div style={{ padding: `${12 * U}px ${26 * U}px`, borderRadius: 44 * U, background: t.accent, opacity: chip, transform: `translate3d(${((1 - chip) * 30 * U).toFixed(2)}px, 0, 0) scale(${mix(1.18, 1, chip).toFixed(4)})` }}>
        <span data-text="insight-count" style={face(KIT_TYPE.label * U * 1.15, 700, t.accentInk)}>
          {WALK.insight.count}
        </span>
      </div>
    </div>
  );
};

const flick = flickFeed(ACT.feed.from, { fps: FPS, width: W, height: H }, { brake: { fast: 0.922, share: 0.6, slow: 0.96 }, distance: FEED.landRow * FEED.pitch });
/** The product's count as a number (walk.ts writes it as it reads: "3,412"). */
const TOTAL = Number(String(WALK.feed.total).replace(/[^0-9.]/g, '')) || 0;
/** The counter's steps (whole frames): it grows as the feed is read and lands on the total just before the item does. */
export const COUNT = growthSteps(CUE.count, TOTAL, { within: CUE.land - CUE.count - f60x(6) }, FPS);
const countAt = (F: number) => COUNT.filter((s) => fd(F) >= s.at).pop()?.value ?? 0;
/** The feed row shown at list index i (the key row lands on index landRow). */
const rowOf = (i: number) => WALK.feed.rows[(((i - FEED.landRow + WALK.feed.key) % WALK.feed.rows.length) + WALK.feed.rows.length) % WALK.feed.rows.length];
/** A feed row's real portrait (walk.ts photos.people, in row order) as a staticFile URL, or undefined: the row then shows its initials. */
export const facePhoto = (row: (typeof WALK.feed.rows)[number]): string | undefined => {
  const ph = (WALK.photos.people as readonly string[])[WALK.feed.rows.indexOf(row)];
  return ph ? staticFile(ph) : undefined;
};

/** The product's screen of what it reads: the feed's own rows, one person and what they wrote each (kit/data.ts filmWorld). */
export const readWorld = (): SampleWorld =>
  filmWorld({
    workspace: WALK.name,
    noun: [WALK.feed.unit, WALK.feed.unit],
    people: WALK.feed.rows.map((r) => ({ name: r.who, initials: r.initials, photo: facePhoto(r) })),
    records: WALK.feed.rows.map((r, i) => ({ title: r.text, who: i })),
    focus: WALK.feed.key,
  });
/** The lens's schedule: down the rows to the key row, each glide a little sooner than the last (16 f glides that overlap into one travel). */
export const LENS = (() => {
  const n = WALK.feed.key;
  const span = CUE.land - CUE.flick;
  const w = Array.from({ length: n }, (_, i) => 1 - 0.55 * (i / Math.max(1, n - 1)));
  const sum = w.reduce((a, b) => a + b, 0);
  let at = CUE.flick;
  const steps = [{ at: CUE.count, row: 0 }];
  for (let i = 0; i < n; i++) {
    steps.push({ at: Math.round(at), row: i + 1 });
    at += (span * w[i]) / sum;
  }
  return steps;
})();

const Item: React.FC<{ i: number; on: number; row?: (typeof WALK.feed.rows)[number] }> = ({ i, on, row }) => {
  const t = themeOf('feed');
  const r = row ?? rowOf(i);
  return (
    <div data-ui style={{ position: 'relative', width: FEED.w, height: FEED.h, borderRadius: 30 * U, background: t.surface, boxShadow: `${surfaceShadow(t, mix(10, 30, on), U)}, inset 0 0 0 ${(3 * U * on).toFixed(2)}px ${t.accent}`, display: 'flex', alignItems: 'center', gap: 28 * U, padding: `0 ${36 * U}px`, boxSizing: 'border-box' }}>
      <Avatar theme={t} i={i} initials={r.initials} seed={r.who} size={92 * U} src={facePhoto(r)} kind={facePhoto(r) ? 'portrait' : 'monogram'} />
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
  const t = themeOf('feed');
  const carried = carryIn('feed', F, WHIP_UP.vCut, 44, 0.7);
  const cv = (carried - carryIn('feed', F - 1, WHIP_UP.vCut, 44, 0.7)) / U;
  const d = HOLD; // the hold rests between moves (no drift)
  const lift = prog(F, CUE.lift, CUE.lift + f60x(24), E.glideOut);
  const fall = prog(F, CUE.lift, CUE.lift + f60x(40), E.stdInOut); // the rest falls back, softens and is gone before the act line
  // the found item collapses into the pill: width and height lead, the travel on E.strongInOut into the act line
  const m = prog(F, CUE.morph, ACT.insight.from, E.strongInOut);
  const appear = DEAL.read === 'flick' ? 1 : prog(F, CUE.land - f60x(8), CUE.land + f60x(26), E.glideOut); // lens and ticker: the item rises out of the read
  const box = { w: mix(FEED.w * (1 + 0.04 * lift), PILL_BOX.w, m), h: mix(FEED.h * (1 + 0.04 * lift), PILL_BOX.h, m), cy: mix(H / 2, PILL_BOX.cy, m) };
  const count = countAt(F);
  const s = flickState(F, flick, { fps: FPS, width: W, height: H });
  const keyRow = WALK.feed.rows[WALK.feed.key];
  const read =
    DEAL.read === 'lens' ? (
      <Lit frame={F} x={W / 2} y={H / 2 + 110 * U} w={1640 * U} h={940 * U} r={22 * U} ground={GROUNDS.feed.base} id="read-window">
        <DenseScreen frame={F} theme={t} world={readWorld()} layout="table" w={1640 * U} h={940 * U} focus={LENS} view={lmix(1, 1.18, prog(F, CUE.flick, CUE.land, E.strongInOut))} lift={0} />
      </Lit>
    ) : DEAL.read === 'ticker' ? (
      // overscanned past the frame's edges (the hold's drift never shows the ticker's own edge) and already flowing on
      // the cut: the whip lands on content
      <div style={{ position: 'absolute', inset: 0, transformOrigin: '50% 50%', transform: `translate3d(0, ${(80 * U).toFixed(2)}px, 0) scale(1.08)` }}>
        <ContentTicker
          nodes={WALK.feed.rows.map((r, i): TileNode => ({ glyph: 'chat', label: r.who, sub: r.text, preview: facePhoto(r) ? 'person' : 'doc', photo: facePhoto(r), seed: `${r.who}:${i}` }))}
          frame={F}
          start={ACT.feed.from - Math.round(f60x(150))}
          tile={390 * U}
          aspect={1.1}
          speed={300 * U}
          rows={2}
          theme={t}
          seed={`${WALK.name}:ticker`}
        />
      </div>
    ) : (
      <div data-audit-scroll style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${H / 2}px`, transform: undefined }}>
        <DirBlur v={s.v / U} axis="y" id="feed-flick" style={{ maskImage: 'linear-gradient(180deg, transparent 0%, black 22%, black 82%, transparent 100%)' }}>
          {Array.from({ length: FEED.rows }, (_, i) => {
            const y = H / 2 - FEED.h / 2 + i * FEED.pitch - s.y;
            if (y < -FEED.h * 2 || y > H + FEED.h) return null;
            const key = i === FEED.landRow;
            if (key && F >= CUE.lift) return null; // drawn on its own below, lifting and collapsing
            const landed = prog(F, CUE.land - f60x(6), CUE.land + f60x(16), E.glideOut);
            return (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${((W - FEED.w) / 2).toFixed(2)}px, ${y.toFixed(2)}px, 0)` }}>
                <Item i={i} on={key ? landed : 0} />
              </div>
            );
          })}
        </DirBlur>
      </div>
    );
  return (
    <AbsoluteFill style={{ background: GROUNDS.feed.base, overflow: 'hidden' }}>
      {/* the whole frame rides the whip's carried speed (the ground with it: one move across the cut) */}
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(0, ${carried.toFixed(2)}px, 0)` }}>
        <Ground act="feed" F={F} />
      </div>
      <DirBlur v={cv} axis="y" id="feed-carry">
        <div style={{ position: 'absolute', inset: 0, opacity: 1 - fall, transform: `translate3d(${d.x.toFixed(3)}px, ${(carried + d.y + fall * 60 * U).toFixed(2)}px, 0)` }}>
          {fall > 0.02 ? <Defocus sigma={6 * fall}>{read}</Defocus> : read}
        </div>
      </DirBlur>
      {/* the found item: lifting to the front and collapsing into the pill */}
      {F >= (DEAL.read === 'flick' ? CUE.lift : CUE.land - f60x(8)) && (
        // 'flick': the item leaves the list from exactly where the list holds it
        <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${H / 2}px`, transform: DEAL.read === 'flick' ? `translate3d(${(d.x * (1 - lift)).toFixed(3)}px, ${((d.y + carried) * (1 - lift)).toFixed(3)}px, 0)` : undefined }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, borderRadius: mix(30 * U, PILL_BOX.h / 2, m), overflow: 'hidden', opacity: clamp(appear * 1.6), background: t.surface, boxShadow: `${surfaceShadow(t, 34, U)}, inset 0 0 0 ${(3 * U).toFixed(2)}px ${t.accent}`, transform: `translate3d(${(W / 2 - box.w / 2).toFixed(2)}px, ${(box.cy - box.h / 2 + (1 - appear) * 50 * U).toFixed(2)}px, 0) scale(${mix(0.9, 1, appear).toFixed(4)})` }}>
          <div style={{ opacity: 1 - clamp(m / 0.5), transform: `translate3d(0, ${(-26 * U * m).toFixed(2)}px, 0)` }}>
            <Item i={FEED.landRow} on={1} row={keyRow} />
          </div>
          <PillContent opacity={clamp((m - 0.3) / 0.45)} />
        </div>
        </div>
      )}
      {/* the count of what has been read: a quiet chip, never the hero of the shot */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, display: 'flex', justifyContent: 'center', opacity: (1 - clamp(m * 2)) * prog(F, CUE.count, CUE.count + f60x(20), E.glideOut), transform: `translate3d(0, ${(56 * U).toFixed(2)}px, 0)` }}>
        <Pill theme={t} h={(DEAL.read === 'flick' ? 96 : 76) * U} label={`${WALK.feed.label} ${count.toLocaleString('en-US')} ${WALK.feed.unit}`} spin={(F - ACT.feed.from) * 9} done={count >= TOTAL} id="feed-count" />
      </div>
    </AbsoluteFill>
  );
};
