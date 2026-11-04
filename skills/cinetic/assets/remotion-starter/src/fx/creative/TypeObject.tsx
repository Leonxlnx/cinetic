// type-object: the word becomes the thing it names. The line builds; the other words step away and the key word slides
// to the centre while a lit pill of the accent grows round it (the word turning white on it); the pill then becomes the
// product's own frame (size, corner and colour together), the word handing over to the product showing inside it, and
// the frame opens to the whole picture, at rest. Type that turns into the object, never a cut from words to a picture.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { mixColor } from '../../lib/color';
import { useFilm } from '../../lib/film';
import { type Box, face, frameOf, inkFor, k60, type LineProps, mixBox, type Recipe, SceneView } from './core';
import { keyIndex, recentre, type RowFont, rowOf, wordIn, WordAt } from './type';

/** House numbers (f@60, shares of the size): the others stepping away, the pill growing round the word (its padding),
 * the pill becoming the product's frame, the word fading, the open to the frame. */
export const OBJECT = { away: 14, pill: 16, padX: 0.52, padY: 0.3, morph: 28, fade: 10, open: 20, radius: 30 } as const;
/** The device's tail after its words start to leave (f@60). */
export const OBJECT_TAIL = OBJECT.pill + OBJECT.morph + OBJECT.open;

export const RECIPE: Recipe = {
  id: 'type-object',
  recipe:
    'The word becomes the thing it names: the line builds; the other words step away (14 f) as the key word slides to the centre and a lit accent pill grows round it (16 f, padding 0.52 x 0.3 em, the word turning white); the pill becomes the product\'s own frame (its focus box: size, corner and colour together, strongInOut 28 f), the word fading as the product shows inside, and the frame opens to the whole picture at rest (20 f).',
  params: { ...OBJECT },
};

/** The device at frame t (film frames), the words leaving from `out`: the others' exit, the slide, the pill, the morph,
 * the word's fade and the open (each 0..1). */
export const objectState = (t: number, out: number, k: number) => {
  const away = E.buildIn(clamp((t - out) / (OBJECT.away * k)));
  const slide = E.strongInOut(clamp((t - out) / (OBJECT.pill * k)));
  const pill = E.glideOut(clamp((t - out - 2 * k) / (OBJECT.pill * k)));
  const m0 = out + OBJECT.pill * k;
  const morph = E.strongInOut(clamp((t - m0) / (OBJECT.morph * k)));
  const fade = E.softOut(clamp((t - m0 - 2 * k) / (OBJECT.fade * k)));
  const open = E.strongInOut(clamp((t - m0 - OBJECT.morph * k) / (OBJECT.open * k)));
  return { away, slide, pill, morph, fade, open };
};

export const TypeObject: React.FC<LineProps> = ({ f, words, id, size, weight, track, font, pal, out, scene, focus, radius, cy }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const k = k60(film);
  const ki = keyIndex(words);
  const base: RowFont = { size, weight, track, font };
  const row = rowOf(words.map((w) => w.word), base, W);
  const st = objectState(f, out, k);
  const yc = cy ?? H / 2;
  const y = yc - size * 0.56;
  const off = recentre(f, row.xs, row.ws, row.space, k);
  const key = words[ki].word;
  const kw = row.ws[ki];
  const kx = mix(row.xs[ki] + off + kw / 2, W / 2, st.slide);
  const pillBox: Box = { x: kx - kw / 2 - OBJECT.padX * size, y: yc - size * (0.5 + OBJECT.padY), w: kw + 2 * OBJECT.padX * size, h: size * (1 + 2 * OBJECT.padY) };
  const fb = focus ?? { x: W * 0.25, y: H * 0.2, w: W * 0.5, h: H * 0.6 };
  const frame = mixBox(pillBox, fb, st.morph);
  const box = mixBox(frame, { x: 0, y: 0, w: W, h: H }, st.open);
  const r = mix(mix(pillBox.h / 2, (radius ?? OBJECT.radius) * u, st.morph), 0, st.open);
  const surface = pal.dark ? mixColor(pal.surface, '#ffffff', 0.06) : pal.surface;
  const fill = mixColor(pal.accent, surface, st.morph);
  const node = scene ? scene(0) : null;
  const ink = inkFor(pal.accent, pal);
  const b = wordIn(f, ki, k, size);
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((w, i) => {
        if (i === ki) return null;
        const bi = wordIn(f, i, k, size);
        const dir = i < ki ? -1 : 1;
        return <WordAt key={i} id={id} text={w.word} x={row.xs[i] + off + dir * st.away * size * 1.2} y={y + bi.rise} f={base} color={pal.type} opacity={bi.opacity * (1 - st.away)} />;
      })}
      {st.pill > 0 && (
        <div style={{ position: 'absolute', left: 0, top: 0, width: frame.w, height: frame.h, borderRadius: r, ...face(fill, { ...pal, dark: pal.dark || st.morph < 0.5 }, u, { lift: 0.4 }), opacity: st.pill * (1 - E.softOut(clamp(st.open * 2.5))), transformOrigin: '50% 50%', transform: `translate3d(${frame.x.toFixed(2)}px, ${frame.y.toFixed(2)}px, 0) scale(${mix(0.86, 1, st.pill).toFixed(4)})` }} />
      )}
      {node && st.morph > 0 && (
        <div style={{ position: 'absolute', inset: 0, opacity: E.softOut(clamp(st.morph * 1.6)) }}>
          <SceneView node={node} box={box} view={{ s: 1, tx: 0, ty: 0 }} radius={r} W={W} H={H} />
        </div>
      )}
      {st.fade < 1 && <WordAt id={id} text={key} x={kx - kw / 2} y={y + b.rise} f={base} color={mixColor(pal.type, ink, st.pill)} opacity={b.opacity * (1 - st.fade)} />}
    </div>
  );
};
