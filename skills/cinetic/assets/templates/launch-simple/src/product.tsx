// The product's picture beats: one scene per `scene` id in launch.ts. Each draws the product doing the thing the line
// before it said, full frame and centred, in the ground family's inks: the input becoming the output, a click and its
// result, a count rising. `f` is the frame since the beat began (negative while the seam brings it in), `dur` its
// length, `hits` the frames of its own moments (launch.ts `hits`, on the music's grid: animate on them, sync.ts sounds
// them), `cut` the frame of its cut (the closer frame, or the change from the input footage to the device). Every
// string comes from launch.ts `ui`. The last scene names its `hero`: the box of the element the end card is built from
// (it flies into the lockup and becomes the mark; `fill` its colour).
//
// Premium by default, and still one thing a frame:
//   - The core action is REAL FOOTAGE. The first scene opens on the input shot (a person giving the input: speaking
//     into the phone, typing, paying), fetched by `node tools/input.mjs` from launch.ts `input` (the footage recipe
//     for those words, else a search in them) into public/assets/input.mp4 and src/input.ts (INPUT reads it). It plays
//     in a lit window graded into the film (a soft source shown smaller reads sharp), the product's listening pill on
//     its lower edge; on the cut the window rises away, the lit phone rises in and the pill flies into its screen (one
//     element carried across, never a hard cut). With no clip it plays the code-built fallback: the phone alone.
//   - The product is a lit object: the kit's Phone (src/kit/device.tsx: a silver rim, glass, a contact shadow, a
//     reflection), whole in the frame, its screen light and full: the film's second value beside the dark ground.
//     Cards are lit too (acts/ui.tsx litFace): never a flat slab, never an empty one (a card is sized by what it holds).
//   - The picture proves the line before it: "lands on its day" shows the tasks dropping into their days.
//   - One visual idea, carried through the film as one object (SceneDef `carry`, drawn by the stage between two
//     pictures; IDEA draws it in flight when it changes form): the task the phone writes lifts off the screen and lands
//     as the first task on the board; the task chip the steps end on is pushed into until it is the frame (the claim's
//     colour field, stage.tsx); the result's progress ring closes into the mark (SIGNATURE).
//   - The push closer frames `focus` (a box: x, y, w, h) inside the safe area: give every scene its box.
//   - UI type at film size: 44 px and up (cap 3 %+), titles 60+.
// Build the product's real screens here; acts/ui.tsx has a card, a typed field, a row that checks itself, a count, a
// live waveform, a listening pill and a lit window. Give the picture colour where the product has it.
import React from 'react';
import { getStaticFiles, staticFile } from 'remotion';
import { C, FONT, U } from './brand/tokens';
import { carryOpacity, type SceneDef, type SceneProps } from './acts/stage';
import { Card, CARD, lightSurface, ListenPill, litFace, Plane, Row, surfaceInks, Txt, Window, wrapWords } from './acts/ui';
import { usePromote } from './acts/layer';
import { Footage } from './fx/Footage';
import { Phone, screenBox } from './kit/device';
import { kitTheme } from './kit/theme';
import { clamp, E, mix } from './lib/anim';
import { mixColor } from './lib/color';
import type { FamilyInks } from './fx/Grounds';
import { INPUT_SHOT } from './input';
import { LAUNCH } from './launch';
import { FPS, H, W } from './timeline';

const ui = (pair: number, j: number) => LAUNCH.pairs[pair - 1]?.ui?.[j] ?? '';
const k60 = FPS / 60; // choreography counts below are f@60

/**
 * The input shot (src/input.ts, written by tools/input.mjs: its public/ path, size and rate, the source second it starts
 * at) and the point the picture is framed on. None fetched or none that fits: the code-built fallback.
 */
export const INPUT = { ...INPUT_SHOT, focus: [0.5, 0.42] as [number, number] };
/** Whether the input clip is fetched and in public/ (read at render time; a Node import sees none). */
export const hasClip = () => {
  try {
    return INPUT_SHOT.status === 'fetched' && getStaticFiles().some((s) => s.name === INPUT.clip);
  } catch {
    return false;
  }
};

/** The film's one signature move (references/catalogue.md §2, the Signatures): the scaffold's is a chip pushed into
 * until it is the frame (the claim's colour field), then a ring that closes into the mark. Pick the one this film's
 * payoff deserves, build it in its scene and name it here (film.json devices). */
export const SIGNATURE = 'chip-becomes-field' as const;

// cinetic:placeholder - the template's stand-in scenes: rebuild them as the product's own screens, then delete this line.

/** Words that arrive one by one as they are said (a live transcript): each rises 10 px and fades in over 8 f, `per` f
 * apart from `at`, wrapped at `w`. Every line keeps the full string's id (the audit merges them). */
const Spoken: React.FC<{ f: number; at: number; per: number; x: number; y: number; w: number; text: string; size: number; color: string; weight?: number }> = ({ f, at, per, x, y, w, text, size, color, weight = 560 }) => {
  const promote = usePromote();
  const lines = wrapWords(text, w, size, weight, -0.015);
  let i = 0;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`, willChange: promote ? 'transform' : undefined }}>
      {lines.map((ln, li) => (
        <div key={li} data-text={text} data-ui="" style={{ position: 'absolute', left: 0, top: li * size * 1.16 * U, whiteSpace: 'pre', fontFamily: FONT.text, fontSize: size * U, fontWeight: weight, letterSpacing: '-0.015em', lineHeight: 1.16, color }}>
          {ln.split(' ').map((word, j) => {
            const p = clamp((Math.round(f) - (at + per * i++)) / (8 * k60));
            return (
              <React.Fragment key={j}>
                {j > 0 ? ' ' : ''}
                <span style={{ display: 'inline-block', opacity: E.snapOut(p), transform: `translate3d(0px, ${((1 - E.glideOut(p)) * 10 * U).toFixed(3)}px, 0)` }}>{word}</span>
              </React.Fragment>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** A check drawn in `color` inside a `size` px box (its stroke drawn on with `p`). */
const Check: React.FC<{ size: number; color: string; p?: number; width?: number }> = ({ size, color, p = 1, width = 4 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" style={{ position: 'absolute', left: 0, top: 0 }}>
    <path d="M11.5 21 L17.5 27 L29 14.5" fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp(p)} />
  </svg>
);

/**
 * The stand-in mark, built from the film's own element: the progress ring the result closes becomes a disc with a
 * check cut through it, the check's long stroke running out through the disc's edge (one colour, so it holds on the
 * light card, on the dark ground and at favicon size). `ring` draws the ring (0..1), `fill` turns it into the disc,
 * `check` cuts the check in. stage.tsx draws it as the lockup's mark while brand/logo.ts keeps LOGO_STANDIN; replace it
 * (or brand.py the real SVG) for a real product.
 */
export const MarkArt: React.FC<{ size: number; color: string; ring?: number; fill?: number; check?: number; id: string; track?: string }> = ({ size, color, ring = 1, fill = 1, check = 1, id, track }) => {
  const m = `mark-${id}`;
  const r = mix(40, 50, E.glideOut(clamp(fill)));
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <defs>
        <mask id={m} maskUnits="userSpaceOnUse" x={-20} y={-20} width={140} height={140}>
          <rect x={-20} y={-20} width={140} height={140} fill="white" />
          <path d="M29 50.5 L44.5 66 L98 12.5" fill="none" stroke="black" strokeWidth={11.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp(check)} />
        </mask>
      </defs>
      {track && <circle cx={50} cy={50} r={45} fill="none" stroke={track} strokeWidth={6} opacity={1 - clamp(fill)} />}
      <circle cx={50} cy={50} r={45} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - clamp(ring)} transform="rotate(-90 50 50)" opacity={1 - clamp(fill)} />
      <circle cx={50} cy={50} r={r} fill={color} opacity={clamp(fill * 1.6)} mask={`url(#${m})`} />
    </svg>
  );
};

// ------------------------------------------------------------------------------------------------ input

/** The input's window onto the footage (px at 1080p, centred, a touch above the middle) and the pill on its lower edge. */
const WIN = { w: 1160, h: 652, cy: H / 2 - 40 } as const;
const PILL = { w: 600, h: 132, n: 22 } as const;
/** The phone, whole in the frame and centred (its contact shadow on the ground under it). */
const PHONE = { w: 420, cy: H / 2 + 6 } as const;
const phoneBox = () => {
  const w = PHONE.w * U;
  const S = screenBox('phone', w);
  return { w, h: S.outer.h, x: W / 2, y: PHONE.cy * U, S, top: PHONE.cy * U - S.outer.h / 2 };
};
/** The phone screen's layout (screen px, by its width): the listening panel, the transcript, the task chip, the button. */
const screenLayout = (sw: number) => {
  const s = sw / 391;
  return { s, pad: 30 * s, panel: { x: 20 * s, y: 100 * s, w: sw - 40 * s, h: 108 * s }, said: { y: 262 * s, size: 50 }, chip: { y: 0, size: 40 }, button: { r: 44 * s, y: 0 } };
};

/** The phone's light screen: the transcript arriving word by word under the listening panel (the pill, which flies in
 * and is drawn by the scene), the task landing under it as a chip in the accent, the record button live below. */
const InputScreen: React.FC<{ f: number; sw: number; sh: number; inks: FamilyInks; saidAt: number; per: number; outAt: number; live: number; pair: number; chipOn?: number }> = ({ f, sw, sh, inks, saidAt, per, outAt, live, pair, chipOn = 1 }) => {
  const L = screenLayout(sw);
  const bg = mixColor(lightSurface(inks), inks.dark ? inks.ground : C.ink, 0.045);
  const si = surfaceInks(inks, C.white);
  const said = ui(pair, 0);
  const result = ui(pair, 1);
  const sl = wrapWords(said, sw - 2 * L.pad, L.said.size, 560, -0.015);
  const chipY = L.said.y + sl.length * L.said.size * 1.16 * U + 44 * L.s;
  const tw = sw - 2 * L.panel.x - 110 * L.s;
  const rl = wrapWords(result, tw, L.chip.size, 560, -0.01);
  const chipH = 2 * 26 * L.s + rl.length * L.chip.size * 1.2 * U;
  const inn = E.snapOut(clamp((f - outAt) / (18 * k60)));
  const rise = (1 - E.glideOut(clamp((f - outAt) / (30 * k60)))) * 34 * L.s;
  const chk = E.stdInOut(clamp((f - outAt - 10 * k60) / (16 * k60)));
  const by = sh - 118 * L.s;
  const pulse = 0.5 + 0.5 * Math.sin((2 * Math.PI * f) / (FPS * 1.2));
  // the screen's content creeps up through the beat against the phone's body: two planes
  const creep = Math.tanh(((f - outAt) * 0.5) / 60) * 14 * L.s;
  return (
    <div style={{ position: 'absolute', inset: 0, background: bg }}>
      <div style={{ position: 'absolute', inset: 0, transform: `translate3d(0px, ${(-creep).toFixed(3)}px, 0)` }}>
        <Spoken f={f} at={saidAt} per={per} x={L.pad} y={L.said.y} w={sw - 2 * L.pad} text={said} size={L.said.size} color={si.type} />
        <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: sw - 2 * L.panel.x, height: chipH, borderRadius: 26 * L.s, ...litFace(C.accent, si, { accent: true }), opacity: inn * chipOn, transform: `translate3d(${L.panel.x.toFixed(3)}px, ${(chipY + rise).toFixed(3)}px, 0)` }}>
          <div style={{ position: 'absolute', left: 24 * L.s, top: 26 * L.s, width: 38 * L.s, height: 38 * L.s, borderRadius: 19 * L.s, boxSizing: 'border-box', border: `${(3 * L.s).toFixed(2)}px solid ${C.white}`, background: mixColor(C.accent, C.white, chk) }}>
            <Check size={32 * L.s} color={C.accent} p={chk} width={5} />
          </div>
          {rl.map((l, i) => (
            <Txt key={i} x={24 * L.s + 46 * L.s + 14 * L.s} y={26 * L.s + i * L.chip.size * 1.2 * U - 4 * U} size={L.chip.size} weight={560} color={C.white}>{l}</Txt>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: sw / 2 - L.button.r, top: by - L.button.r, width: 2 * L.button.r, height: 2 * L.button.r, borderRadius: L.button.r, background: C.accent, boxShadow: `0 0 0 ${(10 * L.s * pulse * live).toFixed(2)}px ${mixColor(C.accent, bg, 0.78)}, 0 ${(6 * L.s).toFixed(1)}px ${(14 * L.s).toFixed(1)}px rgba(0, 0, 0, 0.16)` }}>
        <div style={{ position: 'absolute', left: L.button.r * 0.62, top: L.button.r * 0.62, width: L.button.r * 0.76, height: L.button.r * 0.76, borderRadius: 7 * L.s, background: C.white, opacity: mix(0.55, 1, live) }} />
      </div>
    </div>
  );
};

/**
 * The input becoming the output. With the clip: the person giving the input in a lit window (graded into the film),
 * the listening pill on its lower edge; on the cut the window rises away, the phone rises in from below and the pill
 * flies into the top of its screen, the words landing under it and the task rising out of them. Without it: the phone
 * alone from the first frame, the pill already in its screen.
 */
const Input: React.FC<SceneProps> = ({ f, dur, hits, inks, pair, cut, carry }) => {
  const clip = hasClip();
  const split = clip ? cut ?? Math.round(dur * 0.5) : -Infinity;
  const said = ui(pair, 0);
  const words = said.split(/\s+/).filter(Boolean).length;
  const outAt = hits[1] ?? Math.round(dur * 0.72);
  const pillAt = hits[0] ?? Math.round(18 * k60);
  // the words arrive as they are said, from the moment the pill has landed in the screen, whole as the task lands
  const landed = clip ? split + 10 * k60 : 6 * k60;
  const per = Math.max(3 * k60, Math.min(8 * k60, (outAt - 8 * k60 - landed) / Math.max(1, words)));
  const saidAt = Math.max(landed, outAt - 8 * k60 - per * words);
  const live = 1 - E.stdInOut(clamp((f - outAt - 6 * k60) / (24 * k60)));
  const P = phoneBox();
  const L = screenLayout(P.S.w);
  // the change on the cut: the window leaves upward into the cut (14 f, at speed), the phone arrives from below (32 f,
  // landing on a glide), the pill flies from the window's edge to the phone's screen: one direction, one carried element
  const exitU = clip ? clamp((f - (split - 12 * k60)) / (14 * k60)) : 1;
  const enterU = clip ? clamp((f - (split - 8 * k60)) / (28 * k60)) : 1;
  const phoneDy = (1 - E.glideOut(enterU)) * 980 * U; // it rises in and lands: no idle bob
  const winDy = -E.launchIn(exitU) * 1040 * U;
  const fly = clip ? E.strongInOut(clamp((f - (split - 14 * k60)) / (26 * k60))) : 1;
  const onScreen = { cx: P.x, cy: P.top + P.S.y + L.panel.y + L.panel.h / 2 + phoneDy, w: L.panel.w / U, h: L.panel.h / U };
  const onWin = { cx: W / 2, cy: (WIN.cy + WIN.h / 2) * U - 6 * U, w: PILL.w, h: PILL.h };
  const pill = { cx: mix(onWin.cx, onScreen.cx, fly), cy: mix(onWin.cy, onScreen.cy, fly), w: Math.exp(mix(Math.log(onWin.w), Math.log(onScreen.w), fly)), h: Math.exp(mix(Math.log(onWin.h), Math.log(onScreen.h), fly)) };
  // the footage grade: the film's light on it (a tint at the ground's hue in soft light), a touch less saturated
  const grade = { saturate: 0.74, contrast: 1.08, brightness: 1.03, tint: inks.dark ? mixColor(inks.ground, C.accent, 0.72) : C.accent, tintMix: inks.dark ? 0.46 : 0.2, tintMode: 'color' as const };
  const theme = kitTheme(inks.dark ? 'slateMid' : 'tintedPaper');
  return (
    <>
      {clip && exitU < 1 && (
        <Window cx={W / 2} cy={WIN.cy * U + winDy} w={WIN.w * U} h={WIN.h * U} inks={inks} scale={1 + 0.02 * clamp(f / Math.max(1, split))}>
          <Footage src={staticFile(INPUT.clip)} w={INPUT.w} h={INPUT.h} frame={f} start={0} from={INPUT.from} srcFps={INPUT.fps} focus={INPUT.focus} scale={1.04} grade={grade} />
        </Window>
      )}
      <div style={{ position: 'absolute', inset: 0, opacity: enterU > 0 ? 1 : 0 }}>
        <Phone frame={f} x={P.x} y={P.y + phoneDy} w={P.w} theme={theme} ground={inks.ground} finish="silver" tilt={{ x: 3, y: -9 }} sway={false} reflect={false}>
          <InputScreen f={f} sw={P.S.w} sh={P.S.h} inks={inks} saidAt={saidAt} per={per} outAt={outAt} live={live} pair={pair} chipOn={carryOpacity(f, carry)} />
        </Phone>
      </div>
      <Plane z={mix(1.25, 1, fly)}>
        <ListenPill f={f} at={clip ? pillAt : -60} cx={pill.cx} cy={pill.cy} w={pill.w} h={pill.h} n={PILL.n} inks={inks} live={live} />
      </Plane>
    </>
  );
};

// ------------------------------------------------------------------------------------------------ steps

/**
 * The steps' strings: one item per hit (launch.ts `hits`), and after them the slots the items land in, in the order
 * they land (item k lands in slot k: "Book the venue", "Call the printer", "Send the deck to Maya", "Tue", "Wed", "Fri").
 * With no slots the items stack on one card as rows that check themselves.
 */
const stepsOf = (pair: number) => {
  const all = LAUNCH.pairs[pair - 1]?.ui ?? [];
  const n = Math.min(all.length, (LAUNCH.pairs[pair - 1]?.hits ?? []).length || all.length);
  const items = all.slice(0, n);
  const slots = all.slice(n, n + items.length);
  return { items, slots, board: slots.length === items.length && items.length > 1 };
};
/** The board (px at 1080p): a lit light column per slot, the slot's name at its top, the item's chip landing in it. */
const BOARD = { col: 460, gap: 40, label: 48, chip: { x: 22, y: 112, size: 50, pad: 30 }, foot: 40 } as const;
const boardLayout = (pair: number) => {
  const { items } = stepsOf(pair);
  const n = items.length;
  const cw = BOARD.col * U;
  const total = n * cw + (n - 1) * BOARD.gap * U;
  const x0 = (W - total) / 2;
  const chipW = cw - 2 * BOARD.chip.x * U;
  const sized = items.map((it) => {
    const lines = wrapWords(it, chipW - 2 * BOARD.chip.pad * U, BOARD.chip.size, 560, -0.01);
    return { lines, h: 2 * BOARD.chip.pad * U + lines.length * BOARD.chip.size * 1.2 * U };
  });
  // a column is as tall as what it holds (its name, the tallest chip, a foot): never an empty slab
  const ch = BOARD.chip.y * U + Math.max(...sized.map((c) => c.h)) + BOARD.foot * U;
  const y0 = H / 2 - ch / 2;
  const chips = sized.map((c, k) => ({ x: x0 + k * (cw + BOARD.gap * U) + BOARD.chip.x * U, y: y0 + BOARD.chip.y * U, w: chipW, h: c.h, lines: c.lines }));
  return { n, cw, ch, x0, y0, chips };
};
/** The list card's box when there are no slots (rows that check themselves). */
const listLayout = (pair: number) => {
  const { items } = stepsOf(pair);
  const w = 940 * U;
  const h = (CARD.pad * 2 + items.length * CARD.row) * U;
  return { w, h, x: W / 2 - w / 2, y: H / 2 - h / 2 };
};

/** The task chip in the accent, its words in white; `k` scales it about its centre (it drops onto the board from the
 * camera's side, never across the column's name). */
const TaskChip: React.FC<{ x: number; y: number; w: number; h: number; lines: string[]; inks: FamilyInks; k?: number; opacity?: number; lift?: number }> = ({ x, y, w, h, lines, inks, k = 1, opacity = 1, lift = 0 }) => {
  return (
    <div data-ui="" style={{ position: 'absolute', left: 0, top: 0, width: w, height: h, borderRadius: 24 * U, ...litFace(C.accent, inks, { accent: true, lift }), opacity, transformOrigin: '50% 50%', transform: `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0) scale(${k.toFixed(5)})` }}>
      {lines.map((l, i) => (
        <Txt key={i} x={BOARD.chip.pad * U} y={BOARD.chip.pad * U + i * BOARD.chip.size * 1.2 * U - 4 * U} size={BOARD.chip.size} weight={560} color={C.white}>{l}</Txt>
      ))}
    </div>
  );
};

/** Each item lands in its slot on its hit: the chips drop onto the lit columns from the camera's side (a little larger
 * and lifted, landing on a settle: a true landing), the columns' names already there. With no slots: rows on one lit
 * card, each checking itself after it arrives. */
const Steps: React.FC<SceneProps> = ({ f, hits, inks, pair, carry }) => {
  const st = stepsOf(pair);
  const surf = lightSurface(inks);
  const si = surfaceInks(inks, surf);
  if (!st.board) {
    const b = listLayout(pair);
    return (
      <Card f={f} cx={W / 2} cy={H / 2} w={b.w} h={b.h} inks={inks} fill={surf} creep={false}>
        {st.items.map((r, j) => (
          <Row key={j} f={f} at={hits[j] ?? 20 * j} done={(hits[j] ?? 20 * j) + 16} x={CARD.pad * U} y={(CARD.pad + j * CARD.row) * U} w={b.w - 2 * CARD.pad * U} label={r} inks={si} />
        ))}
      </Card>
    );
  }
  const B = boardLayout(pair);
  return (
    <>
      {st.slots.map((s, k) => (
        <Card key={k} f={f} cx={B.x0 + k * (B.cw + BOARD.gap * U) + B.cw / 2} cy={H / 2} w={B.cw} h={B.ch} inks={inks} fill={surf}>
          <Txt x={34 * U} y={30 * U} size={BOARD.label} weight={620} track={-0.02} color={si.mute}>{s}</Txt>
        </Card>
      ))}
      {B.chips.map((c, k) => {
        const at = hits[k] ?? 20 * k;
        const p = clamp((f - (at - 10 * k60)) / (24 * k60));
        const drop = E.settleOut(p);
        // it fades in over its first 10 f while it drops (never most of its opacity in one frame: a pop)
        // the first task arrives carried from the phone (the stage flies it in): it shows, landed, once it is here
        if (k === 0 && carry?.in !== undefined) return <TaskChip key={k} x={c.x} y={c.y} w={c.w} h={c.h} lines={c.lines} inks={inks} opacity={carryOpacity(f, carry)} />;
        return <TaskChip key={k} x={c.x} y={c.y} w={c.w} h={c.h} lines={c.lines} inks={inks} k={mix(1.2, 1, drop)} lift={1 - drop} opacity={E.stdInOut(clamp((f - (at - 10 * k60)) / (10 * k60)))} />;
      })}
    </>
  );
};

/** Where the claim's colour field comes from: the last chip (or the last row's check), in scene px. */
const stepsField = (pair: number) => {
  const st = stepsOf(pair);
  if (st.board) {
    const c = boardLayout(pair).chips[st.items.length - 1];
    return { x: c.x, y: c.y, w: c.w, h: c.h, radius: 24 * U, color: C.accent };
  }
  const b = listLayout(pair);
  const j = st.items.length - 1;
  const r = CARD.text * 0.42 * U;
  return { x: b.x + CARD.pad * U, y: b.y + (CARD.pad + j * CARD.row) * U + (CARD.row * U) / 2 - r, w: 2 * r, h: 2 * r, radius: r, color: C.accent };
};

// ------------------------------------------------------------------------------------------------ result

/** The result card (px at 1080p): its title and the items, each checking itself on a hit, and the progress ring at its
 * top right closing as they do: the ring, whole, becomes the disc that flies into the lockup (the hero). */
const RESULT = { w: 1040, pad: 60, title: 76, gap: 30, ring: 112, row: 112, text: 56 } as const;
const resultLayout = (pair: number) => {
  const all = LAUNCH.pairs[pair - 1]?.ui ?? [];
  const rows = all.slice(1);
  const w = RESULT.w * U;
  const h = (RESULT.pad * 2 + RESULT.title * 1.1 + (rows.length ? RESULT.gap : 0) + rows.length * RESULT.row) * U;
  const x = W / 2 - w / 2;
  const y = H / 2 - h / 2;
  const ring = { x: x + w - RESULT.pad * U - RESULT.ring * U, y: y + RESULT.pad * U - 16 * U, w: RESULT.ring * U, h: RESULT.ring * U, radius: (RESULT.ring * U) / 2 };
  return { title: all[0] ?? '', rows, w, h, x, y, ring };
};

const Result: React.FC<SceneProps> = ({ f, dur, hits, inks, pair }) => {
  const R = resultLayout(pair);
  const surf = lightSurface(inks);
  const si = surfaceInks(inks, surf);
  const n = Math.max(1, R.rows.length);
  const doneAt = (j: number) => hits[j] ?? Math.round(((j + 1) / (n + 1)) * dur * 0.7);
  const ring = R.rows.length ? R.rows.reduce((m, _, j) => m + E.stdInOut(clamp((f - doneAt(j)) / (18 * k60))) / n, 0) : E.stdInOut(clamp((f - (hits[0] ?? 30)) / (24 * k60)));
  const last = R.rows.length ? doneAt(R.rows.length - 1) : hits[0] ?? 30;
  const fill = E.glideOut(clamp((f - last - 14 * k60) / (20 * k60)));
  const check = E.stdInOut(clamp((f - last - 22 * k60) / (18 * k60)));
  // the hero hands over to the stage's element 12 f before the end (it is drawn there, in the same place, from then)
  const handed = f >= dur - 12 * k60 ? 0 : 1;
  return (
    <>
      <Card f={f} cx={W / 2} cy={H / 2} w={R.w} h={R.h} inks={inks} fill={surf}>
        <Txt x={RESULT.pad * U} y={RESULT.pad * U - 6 * U} size={RESULT.title} weight={660} track={-0.03} color={si.type}>{R.title}</Txt>
        {R.rows.map((r, j) => (
          <Row key={j} f={f} at={-600} done={doneAt(j)} x={RESULT.pad * U} y={(RESULT.pad + RESULT.title * 1.1 + RESULT.gap + j * RESULT.row) * U} w={R.w - 2 * RESULT.pad * U} label={r} inks={si} size={RESULT.text} h={RESULT.row} />
        ))}
      </Card>
      {/* the ring sits on the card's frame (it does not creep with the words): the hero box the stage flies from */}
      <div style={{ position: 'absolute', left: 0, top: 0, width: R.ring.w, height: R.ring.h, opacity: handed, transform: `translate3d(${R.ring.x.toFixed(3)}px, ${R.ring.y.toFixed(3)}px, 0)` }}>
        <MarkArt id={`ring${pair}`} size={R.ring.w} color={C.accent} track={si.line} ring={ring} fill={fill} check={check} />
      </div>
    </>
  );
};

// ------------------------------------------------------------------------------------------------ the carried task

/** The task chip on the phone's screen as it leaves (scene px; the phone held still at its place). */
const inputChip = (pair: number) => {
  const P = phoneBox();
  const L = screenLayout(P.S.w);
  const sl = wrapWords(ui(pair, 0), P.S.w - 2 * L.pad, L.said.size, 560, -0.015);
  const rl = wrapWords(ui(pair, 1), P.S.w - 2 * L.panel.x - 110 * L.s, L.chip.size, 560, -0.01);
  const chipY = L.said.y + sl.length * L.said.size * 1.16 * U + 44 * L.s;
  return { x: P.x - P.w / 2 + P.S.x + L.panel.x, y: P.top + P.S.y + chipY - 14 * L.s, w: P.S.w - 2 * L.panel.x, h: 2 * 26 * L.s + rl.length * L.chip.size * 1.2 * U, radius: 26 * L.s, fill: 'accent' };
};
/** The board's first slot, where the carried task lands (scene px). */
const stepsFirst = (pair: number) => {
  const c = boardLayout(pair).chips[0];
  return { x: c.x, y: c.y, w: c.w, h: c.h, radius: 24 * U, fill: 'accent' };
};
const pairOf = (scene: string) => LAUNCH.pairs.findIndex((p) => p.scene === scene) + 1;

export const SCENES: Record<string, SceneDef> = {
  // with the clip the change is the scene's own (footage -> device); without it the camera pushes closer. `carry.out`:
  // the task it writes leaves the screen for the next picture
  input: { draw: Input, cut: () => (hasClip() ? 'scene' : 'closer'), focus: () => ({ x: W / 2 - 280 * U, y: phoneBox().top - 30 * U, w: 560 * U, h: phoneBox().h + 60 * U }), carry: { out: () => inputChip(pairOf('input')) } },
  // `carry.in`: the task lands as the board's first chip; `field`: the box the claim's colour field grows out of
  // (stage.tsx: the push into it becomes the next frame)
  steps: {
    draw: Steps,
    focus: () => {
      const B = boardLayout(Math.max(1, pairOf('steps')));
      const w = B.n * B.cw + (B.n - 1) * BOARD.gap * U;
      return { x: B.x0 - 20 * U, y: B.y0 - 20 * U, w: w + 40 * U, h: B.ch + 40 * U };
    },
    carry: stepsOf(Math.max(1, pairOf('steps'))).board ? { in: () => stepsFirst(pairOf('steps')) } : undefined,
    field: () => stepsField(pairOf('steps')),
  },
  result: {
    draw: Result,
    hero: { ...resultLayout(Math.max(1, pairOf('result'))).ring, fill: 'accent' },
    focus: () => {
      const R = resultLayout(Math.max(1, pairOf('result')));
      return { x: R.x - 20 * U, y: R.y - 40 * U, w: R.w + 40 * U, h: R.h + 60 * U };
    },
  },
};
/** The stand-in mark the lockup draws while brand/logo.ts keeps LOGO_STANDIN (stage.tsx): the result's ring, closed. */
export const HERO_MARK = MarkArt;
