// split-around: the line opens and the product grows in the gap. The line builds; once it is read it parts at its key
// word (the words before it one way, the rest the other) and a lit window of the product grows in the gap at cap
// height, the sentence closing round it; then the words leave outward at speed while the window opens to the whole
// frame, at rest. The thing the line names appears inside the line.
import React from 'react';
import { clamp, E, mix } from '../../lib/anim';
import { useFilm } from '../../lib/film';
import { type Box, face, frameOf, k60, type LineProps, mixBox, type Recipe, SceneView } from './core';
import { keyIndex, recentre, type RowFont, rowOf, wordIn, WordAt, fitRow, widthIn } from './type';

/** House numbers (f@60, shares of the size): the part after the line is read, the window's height and aspect, the
 * part's travel, the exit outward and the window opening to the frame. */
export const AROUND = { after: 6, part: 22, h: 1.5, aspect: 1.62, gap: 0.32, exit: 18, open: 28, radius: 0.2 } as const;
/** The device's tail after its words start to leave (f@60): the window opening to the frame. */
export const AROUND_TAIL = AROUND.open;

export const RECIPE: Recipe = {
  id: 'split-around',
  recipe:
    'The line opens and the product grows in the gap: once read, the line parts at its key word (expo-out 22 f) and a lit window of the product (1.5 x the size tall, 1.62 wide) grows in the gap at cap height, the sentence closing round it; then the words leave outward at speed (buildIn 18 f) while the window opens to the whole frame at rest (strongInOut 28 f).',
  params: { ...AROUND },
};

/** The device at frame t (film frames): the part (0..1) from `resolved`, the exit and the open from `out`. */
export const aroundState = (t: number, resolved: number, out: number, k: number) => ({
  part: E.glideOut(clamp((t - resolved - AROUND.after * k) / (AROUND.part * k))),
  exit: E.buildIn(clamp((t - out) / (AROUND.exit * k))),
  open: E.strongInOut(clamp((t - out) / (AROUND.open * k))),
});

export const SplitAround: React.FC<LineProps> = ({ f, words, id, size, weight, track, font, pal, resolved, out, scene, focus, cy }) => {
  const film = useFilm();
  const { W, H, u } = frameOf(film);
  const k = k60(film);
  const ki = Math.max(1, keyIndex(words));
  const winH0 = AROUND.h * size;
  const winW0 = winH0 * AROUND.aspect;
  // the row must hold the window in its gap: shrink the size until it fits 86 % of the width
  let F: RowFont = { size, weight, track, font };
  const need = (s: number) => widthIn(words.map((w) => w.word).join(' '), { ...F, size: s }) + (AROUND.h * AROUND.aspect + 2 * AROUND.gap) * s;
  if (need(size) > W * 0.86) F = { ...F, size: (size * W * 0.86) / need(size) };
  F = fitRow(words.map((w) => w.word), F, W * 0.86);
  const s = F.size;
  const winH = (winH0 * s) / size;
  const winW = (winW0 * s) / size;
  const row = rowOf(words.map((w) => w.word), F, W);
  const st = aroundState(f, resolved, out, k);
  const yc = cy ?? H / 2;
  const y = yc - s * 0.56;
  const off = recentre(f, row.xs, row.ws, row.space, k);
  const half = (winW / 2 + AROUND.gap * s) * st.part;
  const win: Box = { x: W / 2 - winW / 2, y: yc - winH / 2, w: winW, h: winH };
  // the gap opens where the key word starts: shift so the gap sits at the frame's centre once it is open
  const gapX = row.xs[ki] - row.space / 2 + off;
  const shift = (W / 2 - gapX) * st.part;
  const box = mixBox(win, { x: 0, y: 0, w: W, h: H }, st.open);
  const grow = E.glideOut(clamp((f - resolved - (AROUND.after + 4) * k) / (AROUND.part * k)));
  const r = mix(AROUND.radius * winH, 0, st.open);
  const node = scene ? scene(0) : null;
  const fb = focus ?? { x: W * 0.25, y: H * 0.2, w: W * 0.5, h: H * 0.6 };
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {words.map((w, i) => {
        const b = wordIn(f, i, k, s);
        const dir = i < ki ? -1 : 1;
        const x = row.xs[i] + off + shift + dir * half + dir * st.exit * W * 0.55;
        return <WordAt key={i} id={id} text={w.word} x={x} y={y + b.rise} f={F} color={w.key ? pal.accent : pal.type} opacity={b.opacity * (1 - st.exit)} />;
      })}
      {node && grow > 0 && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: box.w, height: box.h, borderRadius: r, ...face(pal.surface, pal, u), opacity: 1 - E.softOut(clamp(st.open * 2.5)), transform: `translate3d(${box.x.toFixed(2)}px, ${box.y.toFixed(2)}px, 0) scale(${mix(0.6, 1, grow).toFixed(4)})`, transformOrigin: '50% 50%' }} />
          <div style={{ position: 'absolute', inset: 0, transformOrigin: `${W / 2}px ${yc}px`, transform: `scale(${mix(0.6, 1, Math.max(grow, st.open)).toFixed(4)})` }}>
            <SceneView node={node} box={box} focus={mixBox(fb, { x: 0, y: 0, w: W, h: H }, st.open)} radius={r} fit="cover" W={W} H={H} />
          </div>
        </div>
      )}
    </div>
  );
};
