// The product's picture beats: one scene per `scene` id in launch.ts. Each draws the product doing the thing the line
// before it said, full frame and centred, in the ground family's inks: the input becoming the output, a click and its
// result, a count rising. `f` is the frame since the beat began (negative while the seam brings it in), `dur` its
// length, `hits` the frames of its own moments (launch.ts `hits`, on the music's grid: animate on them, sync.ts sounds
// them). Every string comes from launch.ts `ui`. The last scene names its `hero`: the box of the element the end card
// is built from (it becomes the mark; `fill` its colour). Build the product's real screens here; acts/ui.tsx has a
// card, a typed field, a row that checks itself and a count, and the rules that keep a calm picture from popping.
// Give the picture colour where the product has it: the result in the brand colour, the product's own coloured parts.
import React from 'react';
import { TYPE, U } from './brand/tokens';
import type { SceneDef, SceneProps } from './acts/stage';
import { Card, CARD, inkOn, Row, Txt, Typed, typedFrames } from './acts/ui';
import { clamp, E } from './lib/anim';
import { LAUNCH } from './launch';
import { H, W } from './timeline';

const ui = (pair: number, j: number) => LAUNCH.pairs[pair - 1]?.ui?.[j] ?? '';

// cinetic:placeholder - the template's stand-in scenes: rebuild them as the product's own screens, then delete this line.
/** The input becoming the output: a request typed into a field, then the product's answer rising under it in colour. */
const Input: React.FC<SceneProps> = ({ f, hits, inks, pair }) => {
  const w = 1080 * U;
  const h = 440 * U;
  const typeAt = Math.max(6, (hits[0] ?? 20) - typedFrames(ui(pair, 0)));
  const out = E.glideOut(clamp((f - (hits[1] ?? 60)) / 26));
  const rise = E.glideOut(clamp((f - (hits[1] ?? 60)) / 34)); // its opacity on the hit, its rise on a glide
  const outH = 190 * U;
  return (
    <Card f={f} cx={W / 2} cy={H / 2} w={w} h={h} inks={inks}>
      <Typed f={f} at={typeAt} x={CARD.pad * U} y={CARD.pad * U} text={ui(pair, 0)} inks={inks} />
      <div style={{ position: 'absolute', left: CARD.pad * U, top: h - outH - CARD.pad * U, width: w - 2 * CARD.pad * U, height: outH, borderRadius: (CARD.radius - 10) * U, background: inks.accent, opacity: out, transform: `translate3d(0px, ${((1 - rise) * 22 * U).toFixed(3)}px, 0)` }}>
        <Txt x={36 * U} y={outH / 2 - TYPE.display.size * 0.4 * U * 0.62} size={TYPE.display.size * 0.4} weight={500} color={inkOn(inks.accent, inks)}>{ui(pair, 1)}</Txt>
      </div>
    </Card>
  );
};

/** The work in steps: rows arriving one by one on their hits, each checking itself soon after. */
const Steps: React.FC<SceneProps> = ({ f, hits, inks, pair }) => {
  const rows = LAUNCH.pairs[pair - 1]?.ui ?? [];
  const w = 980 * U;
  const h = (CARD.pad * 2 + rows.length * CARD.row) * U;
  return (
    <Card f={f} cx={W / 2} cy={H / 2} w={w} h={h} inks={inks}>
      {rows.map((r, j) => (
        <Row key={j} f={f} at={hits[j] ?? 20 * j} done={(hits[j] ?? 20 * j) + 16} x={CARD.pad * U} y={(CARD.pad + j * CARD.row) * U} w={w - 2 * CARD.pad * U} label={r} inks={inks} />
      ))}
    </Card>
  );
};

/** The result, whole, in the brand colour: the card the end card is built from. */
const HERO = { x: W / 2 - 480 * U, y: H / 2 - 190 * U, w: 960 * U, h: 380 * U, radius: CARD.radius * U };
const Result: React.FC<SceneProps> = ({ f, hits, inks, pair }) => {
  const pop = E.snapOut(clamp((f - (hits[0] ?? 30)) / 18));
  const ink = inkOn(inks.accent, inks);
  return (
    <Card f={f} cx={HERO.x + HERO.w / 2} cy={HERO.y + HERO.h / 2} w={HERO.w} h={HERO.h} inks={inks} lift={pop} fill={inks.accent}>
      <Txt x={CARD.pad * U} y={CARD.pad * U} size={TYPE.display.size * 0.42} weight={500} color={ink}>{ui(pair, 0)}</Txt>
      <Txt x={CARD.pad * U} y={(CARD.pad + 128) * U} color={ink} opacity={0.82 * pop}>{ui(pair, 1)}</Txt>
    </Card>
  );
};

export const SCENES: Record<string, SceneDef> = {
  input: { draw: Input, focus: { x: W / 2, y: H / 2 + 77 * U } }, // the closer frame holds the answer, not the request
  steps: { draw: Steps },
  result: { draw: Result, hero: { ...HERO, fill: 'accent' } },
};
