// cinetic:house-scene (the scene bank: its colours come from the palette it is given)
// beat-lockup: the mark settles and the name is appended beside it one letter per beat, the lockup jumping to stay
// centred after every letter; a picture tile rides the caret, a new picture on each beat; then the ground flips to paper
// and the lockup lands in the accent.
//
// The mark arrives large and shrinks into place on an ease-out. Then every 8 frames (at 60 fps) one letter of the name
// cuts on to the right of the last (no fade, no slide) and the whole lockup jumps left so it stays centred (a cut, no
// tween), while it settles from 1.06 to 1 on an ease-out. Where the next letter will land sits a small rounded tile with
// one of the product's pictures (sharp, on the clean ground: never a blurred picture behind the type); each beat it jumps
// on with the caret and shows the next picture; with no pictures it is a block caret in the accent. After the last
// letter the tile goes, the type tints toward the accent for three frames and the ground washes to paper with the lockup
// in the accent. 1.7-2.2 s. Quiet.
//
// Numbers (1080p px, 60 fps): mark 190 px at rest (from 1.6x, 8 f, ease-out), type cap 102 px (ascender 489, baseline
// 591), the centre x 960; letters 8 f apart (fewer frames for a long name: the run is held to 64 f); lockup 1.06 -> 1;
// tint 3 f, wash 7 f (white peaking at 0.35), then the lockup holds.
import React from 'react';
import { FONT } from '../brand/tokens';
import { type Logo, LogoMark } from '../brand/Mark';
import { mixColor } from '../lib/color';
import { measureTracked } from '../lib/measure';
import { E } from '../lib/anim';
import { markOf, paletteOf, type Palette, type SceneMeta, span, useClock } from './parts';
import { bezier, Picture, Stage1080 } from './stage1080';

export const BEAT = {
  lead: 8, // f@60: the mark shrinks into place before the first letter
  every: 8, // f@60 between letters
  run: 64, // f@60: the longest the letters may take
  hold: 8, // f@60 after the last letter before the tint
  tint: 3,
  wash: 7,
  tail: 22,
  mark: { size: 190, from: 1.6 },
  type: { size: 140, weight: 600, track: -0.025, base: 591 },
  settle: [1.06, 1] as const,
  cx: 960,
} as const;

export type BeatLockupProps = {
  name: string;
  logo?: Logo;
  /** pictures shown one per beat in the caret tile (sharp, small, beside the type) */
  images?: string[];
  palette?: Partial<Palette>;
  /** 'flip': the ground washes to paper and the lockup lands in the accent; 'hold': it stays white on the dark ground */
  end?: 'flip' | 'hold';
  frame?: number;
};

/** The letters' rhythm for a name: frames at 60 fps from the scene start. */
export const beatTimes = (name: string) => {
  const n = Math.max(1, [...name].length);
  const every = Math.min(BEAT.every, BEAT.run / n); // lint-ok: a letter per beat (7.5 a second at 60 fps), not a typing rate
  const at = Array.from({ length: n }, (_, i) => BEAT.lead + i * every);
  const last = at[n - 1];
  const tint = last + BEAT.hold;
  const wash = tint + BEAT.tint;
  const end = wash + BEAT.wash + BEAT.tail;
  return { every, at, tint, wash, end };
};
/** The scene's length at 30 fps for a name. */
export const beatLockupDur = (name: string) => Math.ceil(beatTimes(name).end / 2);

export const beatLockupMeta: SceneMeta = {
  id: 'beat-lockup',
  does: 'the mark settles and the name is appended one letter per beat, the lockup re-centring on each, a picture tile riding the caret; the ground flips to paper',
  dur: beatLockupDur('northwind'),
  props: ['name', 'logo', 'images'],
  handIn: { form: 'mark', x: 960 - 152, y: 540 - 152, w: 304, h: 304 },
  handOut: { form: 'mark', x: 600, y: 445, w: 720, h: 190 },
  klass: 'quiet',
  cues: [
    { f: 4, kind: 'key', id: 'beat-letter-1', weight: 0.6 },
    { f: 8, kind: 'key', id: 'beat-letter-2', weight: 0.6 },
    { f: 12, kind: 'key', id: 'beat-letter-3', weight: 0.6 },
    { f: 36, kind: 'hit', id: 'beat-flip', weight: 0.9 },
  ],
};

export const BeatLockup: React.FC<BeatLockupProps> = ({ name, logo, images = [], palette, end = 'flip', frame }) => {
  const { t, W, H } = useClock(frame);
  const pal = paletteOf(palette);
  const B = BEAT;
  const f60 = t * 2;
  const bt = beatTimes(name);
  const chars = [...name];
  const shown = bt.at.filter((a) => f60 >= a).length;
  const typed = chars.slice(0, shown).join(''); // lint-ok: one letter per beat (7.5 a second), not a typing rate
  const flip = end === 'flip' && f60 >= bt.wash;
  const tinting = end === 'flip' && f60 >= bt.tint && f60 < bt.wash;
  const dark = mixColor(pal.ink, '#000000', 0.25);
  const washP = end === 'flip' ? E.stdInOut(span(f60, bt.wash, bt.wash + B.wash)) : 0;
  const ground = washP > 0 ? mixColor(dark, pal.ground, washP) : dark;
  const flash = washP > 0 ? 0.35 * Math.sin(Math.PI * Math.min(1, washP * 1.15)) : 0;
  const ink = flip ? mixColor('#FFFFFF', pal.accent, Math.min(1, washP * 1.6)) : tinting ? mixColor('#FFFFFF', pal.accent, 0.55) : '#FFFFFF';
  // the mark shrinks into place; the lockup settles 1.06 -> 1 over the run
  const markK = 1 + (B.mark.from - 1) * (1 - bezier(0.22, 1, 0.36, 1)(span(f60, 0, B.lead)));
  const settle = shown === 0 ? B.settle[0] : B.settle[0] + (B.settle[1] - B.settle[0]) * bezier(0.22, 1, 0.36, 1)(span(f60, bt.at[0], bt.at[chars.length - 1] + 4));
  const size = B.type.size;
  const tw = typed ? measureTracked(typed, size, B.type.weight, B.type.track) : 0;
  const gap = typed ? size * 0.22 : 0;
  const markW = B.mark.size * markK;
  const total = markW + gap + tw;
  const left = B.cx - total / 2;
  const cy = B.type.base - size * 0.36;
  const caretOn = shown < chars.length && f60 >= B.lead - 2;
  const caretH = size * 0.78;
  const caretW = images.length ? caretH * 1.25 : size * 0.12;
  const img = images.length ? images[Math.max(0, shown) % images.length] : null;
  const mark = markOf(logo);
  return (
    <Stage1080 W={W} H={H} ground={ground}>
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${settle})`, transformOrigin: `${B.cx}px ${cy}px` }}>
        <div style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left}px, ${cy - markW / 2}px)` }}>
          <LogoMark logo={mark} size={markW} fill={() => ink} />
        </div>
        {typed && (
          <div
            data-text="scene-name"
            style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${left + markW + gap}px, ${B.type.base - size * 0.96}px)`, fontFamily: FONT.text, fontWeight: B.type.weight, fontSize: size, letterSpacing: `${B.type.track}em`, lineHeight: 1.2, color: ink, whiteSpace: 'nowrap' }}
          >
            {typed}
          </div>
        )}
        {caretOn && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transform: `translate(${left + markW + gap + tw + size * 0.1}px, ${B.type.base - caretH}px)`,
              width: caretW,
              height: caretH,
              borderRadius: img ? 14 : 3,
              overflow: 'hidden',
              background: img ? mixColor(dark, '#FFFFFF', 0.1) : pal.accent,
            }}
          >
            {img && <Picture src={img} />}
          </div>
        )}
      </div>
      {flash > 0 && <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF', opacity: flash }} />}
    </Stage1080>
  );
};
