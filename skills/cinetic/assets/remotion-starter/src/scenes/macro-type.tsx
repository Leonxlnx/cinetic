// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// macro-type: the camera lands on a huge message field (a white pill on a pale field) and keeps scaling in; a giant
// cartoon pointer flies in from the bottom, turns into a chunky text cursor, descends (its shadow far below it closing
// in as it nears the field; the placeholder has faded before it lands, so the cursor never sits on words) and clicks: a
// soft light blooms where it clicked and the caret starts blinking. The request types in at macro scale, each new word
// arriving in the accent and settling to ink, the camera following the caret to the right; the text lives inside its
// field (the mic and the send button sit past its measured width, and the text is clipped to the field before them,
// so it never prints over the mic or the cursor). Then the camera runs on to the send button at the field's right end,
// the pointer comes back and clicks it.
// Numbers (frames at 30 fps, px at 1080): the pill grows x0.47 -> 1 (410 px tall) over 50 f; the pointer is 250 px
// tall with an 8 px outline; the text cursor 339 px tall descends 24 f with its shadow closing from (+170, +120) to
// (+13, +33), clicks at 0.72; the bloom's half radius 150 px, gone 17 f later; the caret blinks 12.5 f on / 12.5 off;
// type 130 px (cap 92), a word settling 3 f after its last key; the run to the button accelerates over 11 f; the send
// button (radius 193) squeezes to 0.88 on the click.
import React from 'react';
import { C, FONT } from '../brand/tokens';
import { withAlpha } from '../lib/handover';
import { typedAt, wordsOf } from '../kit/screens/typing';
import { clamp, E } from '../lib/anim';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { paletteOf, type Palette, type SceneMeta, span, tab, useClock } from './parts';
import { Stage1080 } from './stage1080';

export type MacroTypeProps = {
  /** what the empty field says ("Message"), then the request typed into it (a short sentence reads best) */
  placeholder: string;
  text: string;
  /** light scene: ground the pale field, paper the pill, ink the type, accent the new words, the bloom and the send button */
  palette?: Partial<Palette>;
  /** false: the scene ends on the send button without the pointer's click (the next scene presses it) */
  click?: boolean;
  frame?: number;
};

export const MACRO_TYPE = {
  click: 25, // the text cursor's click
  type: 37,
  pill: { h: 410, r: 205, text: 360, plus: 175, size: 130 },
  send: { r: 193, x: 1006, y: 533 }, // where the send button lands on screen
} as const;

// the camera on the pill: its scale, the pill's left end and top on screen (px), until the camera starts to follow
const SCALE: [number, number][] = [[0, 0.42], [1.25, 0.473], [15, 0.641], [26, 0.874], [35, 0.946], [50, 1]];
const LEFT: [number, number][] = [[0, 640], [1.25, 591], [15, 435], [26, 435], [35, 399], [50, 340]];
const TOP: [number, number][] = [[0, 600], [1.25, 568], [15, 453], [26, 365], [35, 339], [50, 330]];
// the giant cursor: the arrow flying in, then the text cursor descending (centre, px) and its shadow's offset
const ARROW_T: [number, number][] = [[0, 1160], [1, 980], [2, 860], [3, 780], [4, 730]];
const BEAM_X: [number, number][] = [[5, 639], [8.75, 662], [16.25, 683], [23.75, 765], [25, 787]];
const BEAM_Y: [number, number][] = [[5, 741], [8.75, 657], [16.25, 577], [23.75, 541], [25, 537]];
const SHADOW_X: [number, number][] = [[5, 170], [10, 140], [16.25, 133], [21.25, 70], [23.75, 20], [25, 13]];
const SHADOW_Y: [number, number][] = [[5, 120], [10, 147], [16.25, 133], [21.25, 90], [23.75, 40], [25, 33]];

const ARROW = 'M0 0 L0 200 L52 152 L88 236 L122 222 L86 140 L152 140 Z';
/** A cartoon shape: a thick outline pass under a fill pass, so overlapping parts share one outline. */
const Cartoon: React.FC<{ w: number; h: number; fill: string; line: string; stroke: number; children: (p: { fill: string; stroke?: string; strokeWidth?: number }) => React.ReactNode; style?: React.CSSProperties }> = ({ w, h, fill, line, stroke, children, style }) => (
  <svg width={w} height={h} viewBox={`${-stroke} ${-stroke} ${w} ${h}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible', ...style }}>
    <g strokeLinejoin="round">{children({ fill: line, stroke: line, strokeWidth: stroke * 2 })}</g>
    <g>{children({ fill })}</g>
  </svg>
);
const beamParts = (p: { fill: string; stroke?: string; strokeWidth?: number }) => (
  <>
    <rect x={5} y={0} width={110} height={40} rx={20} {...p} />
    <rect x={45} y={20} width={30} height={299} rx={6} {...p} />
    <rect x={30} y={152} width={60} height={34} rx={17} {...p} />
    <rect x={5} y={299} width={110} height={40} rx={20} {...p} />
  </>
);

export const MacroType: React.FC<MacroTypeProps> = ({ placeholder, text, palette, click = true, frame }) => {
  const { t, W, H } = useClock(frame);
  const P = paletteOf({ ground: mixColor(C.white, C.ink, 0.045), ...palette }); // a clean light ground, never an accent wash
  const field = P.ground;
  const pill = mixColor(P.paper, P.ground, 0.15);
  const ink = P.ink;
  const M = MACRO_TYPE.pill;
  const family = FONT.ui;
  const size = M.size;
  // ---- typing: the request at a fluent rate, done in about a second whatever its length
  const cps = clamp(text.length / 1.05, 24, 40);
  const typed = typedAt(text, t * 2, { at: MACRO_TYPE.type * 2, cps, fps: 60, seed: text });
  const doneAt = MACRO_TYPE.type + (typed.keys[typed.keys.length - 1] ?? 0) / 2;
  const caretX = measureTracked(typed.shown, size, 400, -0.01, family, { trailing: false });
  const fullW = measureTracked(text, size, 400, -0.01, family, { trailing: false });
  // the field runs on past the frame until the camera goes there; the mic sits past the text's measured width (the
  // text is clipped to that room, so it can never print over the mic or the send button)
  const textRoom = Math.max(fullW, 1500);
  const micX = M.text + textRoom + 260;
  const sendX = micX + 330;
  const pillW = sendX + M.r;
  // ---- the camera: scale in, follow the caret, run on to the send button
  const s = tab(t, SCALE);
  const top = tab(t, TOP);
  const follow = (tt: number) => {
    const c = measureTracked(typedAt(text, tt * 2, { at: MACRO_TYPE.type * 2, cps, fps: 60, seed: text }).shown, size, 400, -0.01, family, { trailing: false });
    return Math.max(0, M.text + c - 820);
  };
  const avg = [0, 1, 2, 3].reduce((a, d) => a + follow(t - d), 0) / 4; // the follow lags the caret a little
  const runFrom = doneAt + 2;
  const run = E.strongInOut(span(t, runFrom, runFrom + 11));
  const leftFollow = tab(t, LEFT) - avg;
  const leftSend = MACRO_TYPE.send.x - sendX;
  const left = leftFollow + (leftSend - leftFollow) * run;
  const topY = top + (MACRO_TYPE.send.y - M.h / 2 - top) * run;
  const cam = `translate(${left.toFixed(2)}px, ${topY.toFixed(2)}px) scale(${s.toFixed(4)})`;
  // ---- the cursor, the bloom, the caret
  const clickT = MACRO_TYPE.click;
  // every state change glides over a few frames (the pointer turning into the text cursor, its click squash, its leaving,
  // the caret's blink): nothing in this scene jumps in one frame
  const swap = E.stdInOut(span(t, 4, 6)); // the arrow hands over to the text cursor
  const beam = t >= 4 && t < clickT + 6;
  const beamS = 1 - 0.28 * Math.sin(Math.PI * span(t, clickT - 1, clickT + 2));
  const beamA = swap * (1 - E.buildIn(span(t, clickT + 1, clickT + 6)));
  const bx = tab(t, BEAM_X);
  const by = tab(t, BEAM_Y);
  const shx = tab(t, SHADOW_X);
  const shy = tab(t, SHADOW_Y);
  const bloom = t >= clickT + 2 ? E.snapOut(span(t, clickT + 2, clickT + 8)) * (1 - E.buildIn(span(t, clickT + 10, clickT + 18))) : 0;
  const caretA = t >= clickT + 1 && run < 0.5 ? clamp(0.5 + 1.6 * Math.cos((2 * Math.PI * (t - clickT - 1)) / 25)) * (1 - E.buildIn(span(run, 0.2, 0.5))) : 0;
  const caretOn = caretA > 0.01;
  // the placeholder fades as the text cursor descends: gone before it lands (it never sits on the words)
  const phA = 1 - E.buildIn(span(t, 13, 21));
  // the pointer's return for the send button
  const pIn = E.snapOut(span(t, runFrom + 3, runFrom + 10));
  const pClick = runFrom + 11;
  const ptrOn = click && t >= runFrom + 3;
  const ptr = { x: 1006 + 60 + (1 - E.glideOut(pIn)) * 420, y: 533 + 30 + (1 - E.glideOut(pIn)) * 560 };
  const pressed = click ? E.snapOut(span(t, pClick, pClick + 2)) * (1 - 0.6 * E.glideOut(span(t, pClick + 4, pClick + 9))) : 0;
  const sendR = MACRO_TYPE.send.r * (1 - 0.12 * pressed);
  // the words: a word arrives in the accent and settles to ink 3 f after its last key (over 2 f)
  const words = wordsOf(typed.shown);
  const settle = (end: number) => {
    const key = typed.keys[end - 1];
    if (key === undefined) return 0;
    const last = end >= typed.n ? (typed.done ? key / 2 : Infinity) : key / 2;
    return clamp((t - MACRO_TYPE.type - last - 3) / 2);
  };
  const shadowC = mixColor(field, C.ink, 0.38);
  return (
    <Stage1080 W={W} H={H} ground={field}>
      {/* the pale field: brighter soft cloud toward the top, bluer at the foot */}
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${mixColor(field, C.white, 0.35)} 0%, ${field} 55%, ${mixColor(field, P.ink, 0.06)} 100%)` }} />
      <div style={{ position: 'absolute', left: 0, top: 0, width: pillW, height: M.h, transformOrigin: '0 0', transform: cam }}>
        <div style={{ position: 'absolute', inset: 0, borderRadius: M.r, background: pill, boxShadow: '0 30px 60px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04)' }} />
        {/* the plus */}
        <svg width={120} height={120} style={{ position: 'absolute', left: M.plus - 60, top: M.h / 2 - 60 }}>
          <path d="M60 10 V110 M10 60 H110" stroke={mixColor(ink, pill, 0.45)} strokeWidth={9} strokeLinecap="round" />
        </svg>
        {/* the bloom where it clicked */}
        {bloom > 0 && (
          <div style={{ position: 'absolute', inset: 0, opacity: bloom }}>
            {/* a soft pool drawn in plain CSS (no blend mode, no baked sprite): the same on every frame of every render tab */}
            <div style={{ position: 'absolute', left: M.text + 20 - 420, top: 110 - 380, width: 840, height: 760, borderRadius: '50%', background: `radial-gradient(closest-side, ${withAlpha(mixColor(P.accent, C.white, 0.7), 0.55)} 0%, ${withAlpha(mixColor(P.accent, C.white, 0.5), 0.32)} 14%, ${withAlpha(mixColor(P.accent, C.white, 0.5), 0.12)} 42%, ${withAlpha(mixColor(P.accent, C.white, 0.5), 0.03)} 72%, ${withAlpha(mixColor(P.accent, C.white, 0.5), 0)} 100%)` }} />
          </div>
        )}
        {/* the text line */}
        <div style={{ position: 'absolute', left: M.text, top: M.h / 2 - size * 0.6, height: size * 1.2, width: textRoom + 120, overflow: 'hidden', display: 'flex', alignItems: 'center', fontFamily: family, fontSize: size, fontWeight: 400, letterSpacing: '-0.01em', whiteSpace: 'pre', lineHeight: 1 }}>
          {phA > 0 && <span style={{ color: mixColor(ink, pill, 0.5), opacity: phA }}>{placeholder}</span>}
          {phA <= 0 && t >= clickT + 1 && (
            <span data-text="macro-type">
              {words.map((w, i) => (
                <span key={i} style={{ color: mixColor(P.accent, ink, settle(w.end)) }}>{w.text}</span>
              ))}
            </span>
          )}
        </div>
        {caretOn && <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(M.text + (phA === 0 ? caretX : 0) + 6).toFixed(2)}px, ${M.h / 2 - 56}px)`, width: 10, height: 113, borderRadius: 3, background: ink, opacity: caretA }} />}
        {/* the mic and the send button at the far end */}
        <svg width={120} height={170} style={{ position: 'absolute', left: micX - 60, top: M.h / 2 - 85 }}>
          <g stroke={mixColor(ink, pill, 0.45)} strokeWidth={7} fill="none" strokeLinecap="round">
            <rect x={36} y={10} width={48} height={92} rx={24} />
            <path d="M18 78 a42 42 0 0 0 84 0 M60 120 V154" />
          </g>
        </svg>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${(sendX - sendR).toFixed(2)}px, ${(M.h / 2 - sendR).toFixed(2)}px)`, width: 2 * sendR, height: 2 * sendR, borderRadius: sendR, background: `linear-gradient(225deg, ${mixColor(P.accent, C.ink, 0.06)} 0%, ${mixColor(P.accent, C.white, 0.42)} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={150 * (sendR / 193)} height={170 * (sendR / 193)} viewBox="0 0 150 170">
            <path d="M75 150 V22 M22 72 L75 20 L128 72" stroke={C.white} strokeWidth={17} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
      {/* the giant pointer flying in, the text cursor descending and clicking (with its shadow far below it) */}
      {t < 6 && (
        <>
          {/* lint-ok: the cursor shadows are small sprites (170 x 260), one at a time */}
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${560 + 130 + 127}px, ${tab(t, ARROW_T) + 133}px)`, opacity: 0.6 * (1 - swap), filter: 'blur(7px)' }}>
            <Cartoon w={170} h={260} fill={shadowC} line={shadowC} stroke={8}>{(p) => <path d={ARROW} {...p} />}</Cartoon>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${560 + 130}px, ${tab(t, ARROW_T)}px)`, opacity: 1 - swap }}>
            <Cartoon w={170} h={260} fill={C.white} line={C.ink} stroke={8}>{(p) => <path d={ARROW} {...p} />}</Cartoon>
          </div>
        </>
      )}
      {beam && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${bx - 60 + shx}px, ${by - 170 + shy}px)`, opacity: 0.6 * swap * (1 - E.buildIn(span(t, clickT - 1, clickT + 1))), filter: 'blur(7px)' }}>
            <Cartoon w={120} h={339} fill={shadowC} line={shadowC} stroke={8}>{beamParts}</Cartoon>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '60px 170px', transform: `translate(${bx - 60}px, ${by - 170}px) rotate(${(15 * (1 - E.glideOut(span(t, 5, 8)))).toFixed(2)}deg) scale(${beamS.toFixed(4)})`, opacity: beamA }}>
            <Cartoon w={120} h={339} fill={C.white} line={C.ink} stroke={8}>{beamParts}</Cartoon>
          </div>
        </>
      )}
      {ptrOn && (
        <>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${ptr.x + 60}px, ${ptr.y + 70}px)`, opacity: 0.55, filter: 'blur(7px)' }}>
            <Cartoon w={170} h={260} fill={shadowC} line={shadowC} stroke={8}>{(p) => <path d={ARROW} {...p} />}</Cartoon>
          </div>
          <div style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${ptr.x}px, ${ptr.y}px) scale(${(1 - 0.14 * pressed).toFixed(3)})` }}>
            <Cartoon w={170} h={260} fill={C.white} line={C.ink} stroke={8}>{(p) => <path d={ARROW} {...p} />}</Cartoon>
          </div>
        </>
      )}
    </Stage1080>
  );
};

/** The scene's length for a request (the typing sets it): frames at 30 fps. */
/** The request the meta's length is measured on (any request of about 30 characters plays in the same length). */
export const MACRO_TYPE_SAMPLE = 'Can you move my 3 pm to Friday?';
export const macroTypeDur = (text: string) => {
  const cps = clamp(text.length / 1.05, 24, 40);
  const keys = typedAt(text, 1e6, { at: 0, cps, fps: 60, seed: text }).keys;
  return Math.ceil(MACRO_TYPE.type + (keys[keys.length - 1] ?? 0) / 2 + 2 + 11 + 6);
};

export const macroTypeMeta: SceneMeta = {
  id: 'macro-type',
  does: 'a giant pointer turns into a text cursor and clicks a huge message field; the request types in at macro scale with the camera following the caret, then runs on to the send button and clicks it',
  dur: macroTypeDur(MACRO_TYPE_SAMPLE),
  props: ['placeholder', 'text', 'palette?', 'click?'],
  handIn: { form: 'pill', x: 591, y: 568, w: 1329, h: 194, r: 97 },
  handOut: { form: 'button', x: 1006 - 193, y: 340, w: 386, h: 386, r: 193 },
  klass: 'big',
  cues: [
    { f: 1, kind: 'whoosh', id: 'pointer-in', weight: 0.5 },
    { f: MACRO_TYPE.click, kind: 'click', id: 'field', weight: 0.8 },
    { f: MACRO_TYPE.click + 3, kind: 'swell', id: 'bloom', weight: 0.4 },
    { f: MACRO_TYPE.type, kind: 'key', id: 'typing', weight: 0.5 },
    { f: macroTypeDur(MACRO_TYPE_SAMPLE) - 17, kind: 'whoosh', id: 'run-to-send', weight: 0.4 },
    { f: macroTypeDur(MACRO_TYPE_SAMPLE) - 6, kind: 'click', id: 'send', weight: 0.9 },
  ],
};
