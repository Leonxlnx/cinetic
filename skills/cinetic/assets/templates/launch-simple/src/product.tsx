// The product's picture beats: one scene per `scene` id in launch.ts. Each draws the product doing the thing the line
// before it said, full frame and centred, in the ground family's inks: the input becoming the output, a click and its
// result, a count rising. `f` is the frame since the beat began (negative while the seam brings it in), `dur` its
// length, `hits` the frames of its own moments (launch.ts `hits`, on the music's grid: animate on them, sync.ts sounds
// them), `cut` the frame of its cut (the closer frame, or the cut from the input footage to the device). Every string
// comes from launch.ts `ui`. The last scene names its `hero`: the box of the element the end card is built from (it
// becomes the mark; `fill` its colour).
//
// Premium by default, and still one thing a frame:
//   - The core action is REAL FOOTAGE. The first scene opens on the input shot (a person giving the input: speaking
//     into the phone, typing, paying), found with `node scripts/assets.mjs recipe "<the input in your words>"` and saved
//     as public/assets/input.mp4 (`get #n --to public/assets --name input --trim <start>,3`; set INPUT below), then cuts
//     on the action to the lit device with the product's UI receiving it. With no clip it plays the code-built
//     fallback: the device alone, the input arriving on its screen.
//   - The product is a lit object: the kit's Phone or Laptop (src/kit/device.tsx: glass, edge light, contact shadow,
//     a reflection) or a lit card (acts/ui.tsx Card: a face lit from the key, a rim, a contact shadow, a glare that
//     slides against the camera). Never a flat slab or an outline bezel.
//   - Depth: what a scene shows moves in two planes under the picture's camera (a card's content creeps against its
//     edge, a device's screen against its body, a Plane at z 1.3 over the footage): look-audit floor-depth reads it.
//   - One signature (SIGNATURE, references/catalogue.md §2): the scaffold's is a dot that grows into the result.
// Build the product's real screens here; acts/ui.tsx has a card, a typed field, a row that checks itself, a count, a
// live waveform and a listening pill. Give the picture colour where the product has it.
import React from 'react';
import { getStaticFiles, staticFile } from 'remotion';
import { C, TYPE, U } from './brand/tokens';
import type { SceneDef, SceneProps } from './acts/stage';
import { Card, CARD, Glare, inkOn, ListenPill, litFace, Plane, Row, Txt, Typed, typedFrames, Waveform, wrapWords } from './acts/ui';
import { Footage } from './fx/Footage';
import { Phone, screenBox } from './kit/device';
import { kitTheme, photoGrade } from './kit/theme';
import { clamp, E, mix } from './lib/anim';
import { mixColor } from './lib/color';
import { LAUNCH } from './launch';
import { H, W } from './timeline';

const ui = (pair: number, j: number) => LAUNCH.pairs[pair - 1]?.ui?.[j] ?? '';
const k60 = 1; // the film runs at 60 fps: f@60 counts are frames

/**
 * The input shot (public/ path, its size and rate from `assets.mjs probe`, the source second it starts at, the point the
 * picture is framed on, where the listening pill sits as shares of the frame). Missing file: the code-built fallback.
 */
export const INPUT = { clip: 'assets/input.mp4', w: 1920, h: 1080, fps: 30, from: 0, focus: [0.5, 0.42] as [number, number], pill: [0.5, 0.8] as [number, number] };
/** Whether the input clip is in public/ (read at render time; a Node import sees none). */
export const hasClip = () => {
  try {
    return getStaticFiles().some((s) => s.name === INPUT.clip);
  } catch {
    return false;
  }
};

/** The film's one signature move (references/catalogue.md §2, the Signatures): the scaffold's is a dot that grows into
 * the result. Pick the one this film's payoff deserves, build it in its scene and name it here (film.json devices). */
export const SIGNATURE = 'dot-grows' as const;

// cinetic:placeholder - the template's stand-in scenes: rebuild them as the product's own screens, then delete this line.

/** The phone's screen for the input scene: the input arriving (a live waveform, its words typed as they are said) and
 * the output landing under it in the brand colour. Drawn in the screen's own box (sw x sh), scaled by its width. */
const InputScreen: React.FC<{ f: number; sw: number; top: number; inks: SceneProps['inks']; typeAt: number; outAt: number; pair: number }> = ({ f, sw, top, inks, typeAt, outAt, pair }) => {
  const s = sw / 596;
  const dark = inks.dark;
  // the screen glows a little against the room (a dark UI a touch under the field, never a black hole in it)
  const bg = dark ? mixColor(C.ink, inks.ground, 0.62) : C.white;
  const panel = dark ? mixColor(bg, C.white, 0.08) : mixColor(C.white, inks.type, 0.04);
  const pad = 30 * s;
  const size = Math.max(36, 38 * s);
  const said = ui(pair, 0);
  const done = typeAt + typedFrames(said);
  const live = 1 - E.stdInOut(clamp((f - done) / (18 * k60)));
  const lines = wrapWords(said, sw - 4 * pad, size);
  const qh = 2 * pad + 64 * s + lines.length * size * 1.25 * U;
  const out = E.glideOut(clamp((f - outAt) / (34 * k60)));
  const outIn = E.snapOut(clamp((f - outAt) / (20 * k60)));
  const result = ui(pair, 1);
  const rlines = wrapWords(result, sw - 4 * pad - 64 * s, size, 500);
  const oh = 2 * pad * 0.8 + rlines.length * size * 1.25 * U;
  const oy = top + qh + 28 * s;
  const ink = inkOn(inks.accent, inks);
  // the screen's content creeps up through the beat against the phone's body: two planes
  const creep = Math.tanh(((f - outAt) * 0.5) / 60) * 18 * s;
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(0px, ${(-creep).toFixed(3)}px, 0)` }}>
        <div style={{ position: 'absolute', left: pad, top, width: sw - 2 * pad, height: qh, borderRadius: CARD.radius * s, background: panel }}>
          <div style={{ position: 'absolute', left: pad, top: pad }}>
            <Waveform f={f} w={sw - 4 * pad} h={48 * s} color={inks.accent} n={26} live={live} />
          </div>
          <Typed f={f} at={typeAt} x={pad} y={pad + 64 * s} text={said} inks={inks} size={size} w={sw - 4 * pad} color={dark ? C.white : inks.type} />
        </div>
        <div style={{ position: 'absolute', left: pad, top: oy + (1 - out) * 26 * s, width: sw - 2 * pad, height: oh, borderRadius: CARD.radius * s, ...litFace(inks.accent, inks, { accent: true }), opacity: outIn }}>
          <svg width={44 * s} height={44 * s} viewBox="0 0 40 40" style={{ position: 'absolute', left: pad * 0.8, top: oh / 2 - 22 * s }}>
            <circle cx={20} cy={20} r={18} fill="none" stroke={ink} strokeWidth={3} />
            <path d="M12 21 L18 27 L29 14" fill="none" stroke={ink} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={30} strokeDashoffset={30 * (1 - E.stdInOut(clamp((f - outAt - 8) / (16 * k60))))} />
          </svg>
          {rlines.map((l, i) => (
            <Txt key={i} x={pad * 0.8 + 64 * s} y={pad * 0.8 + i * size * 1.25 * U} size={size} weight={500} color={ink}>{l}</Txt>
          ))}
        </div>
      </div>
    </div>
  );
};

/** The phone the input lands in: frontal, a little turned toward the key, its screen drawing InputScreen. Close, its
 * top and island stay in the frame (it reads as a phone, never a dark slab) and its foot bleeds past the bottom. */
const PHONE = { wide: { w: 540, y: H / 2 + 150 }, closer: { w: 720, y: (56 + (720 * 19.5) / 18) * U } } as const;
const phoneAt = (o: { w: number; y: number }) => ({ x: W / 2, y: o.y, w: o.w * U, S: screenBox('phone', o.w * U) });

/**
 * The input becoming the output. With the input clip: the person giving the input, full frame (the listening pill on
 * the near plane), then at the cut the phone, close, the words landing on it and the result rising under them. Without
 * it: the phone alone, the input arriving on its screen; the stage's closer frame pushes in on the result.
 */
const Input: React.FC<SceneProps> = ({ f, dur, hits, inks, pair, cut }) => {
  const clip = hasClip();
  const split = clip ? cut ?? Math.round(dur * 0.45) : -Infinity;
  const said = ui(pair, 0);
  const outAt = hits[1] ?? Math.round(dur * 0.62);
  // the words are typed as they are said, ending a beat before the result lands (with the clip: from the cut, already
  // under way, so the cut lands in the middle of the sentence)
  const typeAt = clip ? split - Math.round(typedFrames(said) * 0.4) : Math.max(6, (hits[0] ?? 20) - typedFrames(said));
  const P = phoneAt(clip ? PHONE.closer : PHONE.wide);
  const theme = kitTheme(inks.dark ? 'slateMid' : 'tintedPaper');
  const onPhone = f >= split ? 1 : 0;
  // the cut on the action carries motion across: the footage gathers speed to the left into the cut (8 f), the phone
  // arrives still travelling left and settles (30 f): the same direction both sides, so the cut flows
  const into = clip ? 64 * U * E.launchIn(clamp((f - (split - 8 * k60)) / (8 * k60))) : 0;
  const land = clip ? 96 * U * (1 - E.glideOut(clamp((f - split) / (30 * k60)))) : 0;
  const screenTop = clip ? 300 * U - (P.y - (P.w * 19.5) / 9 / 2) - P.S.y : 140 * (P.S.w / 596);
  return (
    <>
      {clip && f < split && (
        <>
          <div data-imagery="" style={{ position: 'absolute', inset: 0, transform: `translate3d(${(-into).toFixed(3)}px, 0px, 0)` }}>
          <Footage src={staticFile(INPUT.clip)} w={INPUT.w} h={INPUT.h} frame={f} start={0} from={INPUT.from} srcFps={INPUT.fps} focus={INPUT.focus} scale={1.1} room={[92 * U, 30 * U]} grade={photoGrade('natural')} />
          </div>
          <div style={{ position: 'absolute', inset: 0, transform: `translate3d(${(-into * 1.3).toFixed(3)}px, 0px, 0)` }}>
            <Plane z={1.3}>
              <ListenPill f={f} at={Math.min(hits[0] ?? 14, Math.round(split * 0.3))} cx={W * INPUT.pill[0]} cy={H * INPUT.pill[1]} inks={inks} />
            </Plane>
          </div>
        </>
      )}
      <div style={{ position: 'absolute', inset: 0, opacity: onPhone, transform: `translate3d(${land.toFixed(3)}px, 0px, 0)` }}>
        <Phone frame={f} x={P.x} y={P.y} w={P.w} theme={theme} ground={inks.ground} tilt={{ x: 0, y: -12 }}>
          <InputScreen f={f} sw={P.S.w} top={screenTop} inks={inks} typeAt={typeAt} outAt={outAt} pair={pair} />
        </Phone>
      </div>
    </>
  );
};

/** The work in steps: rows arriving one by one on their hits on a lit card, each checking itself soon after. */
const Steps: React.FC<SceneProps> = ({ f, hits, inks, pair }) => {
  const rows = LAUNCH.pairs[pair - 1]?.ui ?? [];
  const w = 920 * U;
  const h = (CARD.pad * 2 + rows.length * CARD.row) * U;
  return (
    <Card f={f} cx={W / 2} cy={H / 2} w={w} h={h} inks={inks}>
      {rows.map((r, j) => (
        <Row key={j} f={f} at={hits[j] ?? 20 * j} done={(hits[j] ?? 20 * j) + 16} x={CARD.pad * U} y={(CARD.pad + j * CARD.row) * U} w={w - 2 * CARD.pad * U} label={r} inks={inks} />
      ))}
    </Card>
  );
};

/**
 * The result, whole, in the brand colour, and the film's signature: the check dot the steps ended on grows into the
 * result card (size, radius and light carried through), landing on the beat's hit; its words rise once it is whole.
 * This card is the element the end card is built from.
 */
const HERO = { x: W / 2 - 480 * U, y: H / 2 - 190 * U, w: 960 * U, h: 380 * U, radius: CARD.radius * U };
const DOT = 132 * U;
const Result: React.FC<SceneProps> = ({ f, hits, inks, pair }) => {
  const land = hits[0] ?? 30;
  const g = E.strongInOut(clamp((f - (land - 40 * k60)) / (40 * k60)));
  const w = mix(DOT, HERO.w, g);
  const h = mix(DOT, HERO.h, g);
  const r = mix(DOT / 2, HERO.radius, g);
  const ink = inkOn(inks.accent, inks);
  const check = 1 - clamp(g / 0.35);
  const t1 = E.glideOut(clamp((f - land - 2) / (34 * k60)));
  const t2 = E.glideOut(clamp((f - land - 12) / (34 * k60)));
  const cx = HERO.x + HERO.w / 2;
  const cy = HERO.y + HERO.h / 2;
  // after it lands, its words creep up inside it against its edge (two planes), as a Card's do
  const creep = Math.tanh(((f - land) * 0.5) / 60) * 20 * U;
  const title = TYPE.display.size * 0.46;
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: r, ...litFace(inks.accent, inks, { accent: true, lift: g }), overflow: 'hidden', transform: `translate3d(${(cx - w / 2).toFixed(3)}px, ${(cy - h / 2).toFixed(3)}px, 0)` }}>
      <svg width={DOT * 0.5} height={DOT * 0.5} viewBox="0 0 40 40" style={{ position: 'absolute', left: (w - DOT * 0.5) / 2, top: (h - DOT * 0.5) / 2, opacity: check }}>
        <path d="M11 21 L18 28 L30 13" fill="none" stroke={ink} strokeWidth={4.5} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div style={{ position: 'absolute', left: 0, top: 0, width: HERO.w, height: HERO.h, transform: `translate3d(${((w - HERO.w) / 2).toFixed(3)}px, ${((h - HERO.h) / 2 - creep).toFixed(3)}px, 0)` }}>
        <Txt x={CARD.pad * U} y={CARD.pad * U + (1 - t1) * 22 * U} size={title} weight={600} track={-0.025} color={ink} opacity={t1}>{ui(pair, 0)}</Txt>
        <Txt x={CARD.pad * U} y={(CARD.pad + 128) * U + (1 - t2) * 18 * U} color={ink} opacity={0.84 * t2}>{ui(pair, 1)}</Txt>
      </div>
      <Glare w={w} h={h} r={r} dark />
    </div>
  );
};

export const SCENES: Record<string, SceneDef> = {
  // with the clip the cut is the scene's own (footage -> device); without it the stage cuts to a closer frame on the result
  input: { draw: Input, cut: () => (hasClip() ? 'scene' : 'closer'), focus: { x: W / 2, y: H / 2 + 150 * U - (PHONE.wide.w * U * 19.5) / 9 / 2 + 560 * (PHONE.wide.w / 596) * U } },
  steps: { draw: Steps },
  result: { draw: Result, hero: { ...HERO, fill: 'accent' } },
};
