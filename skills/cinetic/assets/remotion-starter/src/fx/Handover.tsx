import React from 'react';
import { useCurrentFrame } from 'remotion';
import { type FilmCtx, sizeOf, uOf, useFilm } from '../lib/film';
import { type BoxAt, faceKey, type HandoverSpec, type HandoverState, handoverDeclares, handoverState, type HBox, ownOpacity, type SceneLayer, shadowColor, withAlpha } from '../lib/handover';
import type { Declares } from '../timeline';
import { Defocus, DirBlur } from './Defocus';
import { type Cam, basisOf, frameOf, project } from './depth/math';

// Handover: draws one element carried across a change of scene (lib/handover.ts is the geometry, lib/spine.ts the
// fourteen kinds and their house frames). Put it above both scenes, outside their cameras: it draws in screen px.
//
//   <Handover kind="grow" at={CUT} element="request"
//     from={{ form: 'pill', box: (f) => pillOnScreen(f), fill: skin.face, r: 60 }}  a={<PromptBar ... />}
//     to={{ form: 'page', box: (f) => pageOnScreen(f), fill: skin.face }}          b={<DocPage ... />} />
//
// The element's container (box, corner, fill, rim, shadow) morphs from the out box to the in box; its content never
// scales: `a` is laid out at the out box's size, `b` at the in box's (each sampled where its scene hands it over), and
// each rides the box (or, for an iris or a porthole, stays home while the box reveals it). Two exceptions: a side marked
// `picture: true` (a photo, a thumbnail, a plate) scales to cover the box, so a tile growing into its photo stays one
// picture and never doubles; and a converge's next element pops up whole out of the point (contained, never clipped). Blur and smear are fixed
// ladder copies (fx/Defocus), never an animated radius. While it draws the element, the scenes hide their own copy:
// useOwnOpacity(spec, 'out' | 'in') (or lib/handover ownOpacity(f, spec, side, film)) is the opacity to draw it at (0 inside the span).
//
// `outScene` / `inScene` (optional) are the two scenes, full frame: the camera kinds move them (zoom-into pushes the outgoing
// scene into the element and opens the next one still growing, pull-out pulls both back about one point, momentum
// launches one and carries the other), an iris opens the incoming scene inside its circle. Without them, draw the
// scenes yourself with state.scenes (handoverState). Scene-internal kinds (stay, part, same-surface) draw no element:
// the scene does, and the handover declares its track.
//
// declares(props, film): one seam at the cut with the element's box on every frame (handoverDeclares).

type Content = React.ReactNode | ((s: SceneLayer, h: HandoverState) => React.ReactNode);

export type HandoverProps = HandoverSpec & {
  frame?: number; // default the current frame
  a?: React.ReactNode; // the element's content on the out side, laid out at the out box's size
  b?: React.ReactNode; // ... on the in side, at the in box's size
  many?: React.ReactNode[]; // converge: the content of each of the many (laid out at its own box's size)
  outScene?: Content; // the outgoing scene, full frame
  inScene?: Content; // the incoming scene, full frame
  ground?: React.ReactNode; // under both, never moved or cut
  style?: React.CSSProperties;
};

const FULL: React.CSSProperties = { position: 'absolute', inset: 0 };
const px = (v: number) => `${v.toFixed(3)}px`;
/** A rounded rect as a clip path in its layer's px (it may run past the frame: an iris covering it). */
const roundRect = (c: { x: number; y: number; w: number; h: number; r: number }) => {
  const r = Math.max(0, Math.min(c.r, c.w / 2, c.h / 2));
  const [x0, y0, x1, y1] = [c.x, c.y, c.x + c.w, c.y + c.h].map((v) => v.toFixed(2));
  const [xa, xb, ya, yb, rr] = [c.x + r, c.x + c.w - r, c.y + r, c.y + c.h - r, r].map((v) => v.toFixed(2));
  return `path("M${xa} ${y0}H${xb}A${rr} ${rr} 0 0 1 ${x1} ${ya}V${yb}A${rr} ${rr} 0 0 1 ${xb} ${y1}H${xa}A${rr} ${rr} 0 0 1 ${x0} ${yb}V${ya}A${rr} ${rr} 0 0 1 ${xa} ${y0}Z")`;
};

const SceneLayerView: React.FC<{ s: SceneLayer; children: React.ReactNode }> = ({ s, children }) => {
  const film = useFilm();
  const u = uOf(film);
  let body: React.ReactNode = children;
  if (s.smear) body = <DirBlur v={s.smear / u} axis={s.axis}>{body}</DirBlur>;
  if (s.blur >= 0.5) body = <Defocus sigma={s.blur}>{body}</Defocus>;
  const moved = s.x !== 0 || s.y !== 0 || Math.abs(s.scale - 1) > 1e-6;
  return (
    <div
      style={{
        ...FULL,
        opacity: s.opacity,
        transformOrigin: `${px(s.ox)} ${px(s.oy)}`,
        transform: moved ? `translate3d(${px(s.x)}, ${px(s.y)}, 0) scale(${s.scale.toFixed(5)})` : undefined,
        clipPath: s.clip ? roundRect(s.clip) : undefined,
      }}
    >
      {body}
    </div>
  );
};

/** The element's container at its shape, its content riding inside (never scaled), its rim above. */
const ElementView: React.FC<{ h: HandoverState; a?: React.ReactNode; b?: React.ReactNode; many?: React.ReactNode[]; open?: boolean }> = ({ h, a, b, many, open }) => {
  const film = useFilm();
  const u = uOf(film);
  const el = h.el;
  const sh = el.shape;
  const shadow = el.shadow.a > 0.001 ? `0 ${px(el.shadow.y * u)} ${px(el.shadow.blur * u)} ${shadowColor(el.shadow.a)}` : undefined;
  const box = (s: HBox, r: number): React.CSSProperties => ({ position: 'absolute', left: 0, top: 0, width: Math.max(0, s.w), height: Math.max(0, s.h), borderRadius: r, transform: `translate3d(${px(s.x)}, ${px(s.y)}, 0)` });
  const layer = (node: React.ReactNode, o: number, blur: number, size: { w: number; h: number }, place: { x: number; y: number }, key: string, k = 1) =>
    node !== undefined && o > 0.002 ? (
      <div key={key} data-handover-content={key} style={{ position: 'absolute', left: 0, top: 0, width: size.w, height: size.h, opacity: o, transformOrigin: '50% 50%', transform: `translate3d(${px(place.x - sh.x)}, ${px(place.y - sh.y)}, 0)${Math.abs(k - 1) > 1e-4 ? ` scale(${k.toFixed(5)})` : ''}` }}>
        {blur >= 0.5 ? <Defocus sigma={blur}>{node}</Defocus> : node}
      </div>
    ) : null;
  const rim = el.rim.a > 0.002 && el.rim.w > 0.05 ? <div style={{ ...box(sh, el.r), boxShadow: `inset 0 0 0 ${px(el.rim.w * u)} ${withAlpha(el.rim.color, el.rim.a)}` }} /> : null;
  let body: React.ReactNode = (
    <div style={FULL}>
      {el.many.map((m, i) => (
        <div key={`m${i}`} data-handover={`${h.kind}-many`} style={{ ...box(m.box, m.r), overflow: 'hidden', background: el.fill, opacity: m.opacity, boxShadow: shadow }}>
          {many?.[i] !== undefined ? (
            // laid out at its own size, centred on the shrinking box: clipped, never scaled
            <div style={{ position: 'absolute', left: 0, top: 0, width: m.size.w, height: m.size.h, transform: `translate3d(${px((m.box.w - m.size.w) / 2)}, ${px((m.box.h - m.size.h) / 2)}, 0)` }}>{many[i]}</div>
          ) : null}
        </div>
      ))}
      {/* the many collapsing to the point draw the element until the cut; then the one that grows from it */}
      {el.many.length ? null : (
        <div data-handover={h.kind} style={{ ...box(sh, el.r), overflow: 'hidden', background: open ? undefined : el.fill, boxShadow: open ? undefined : shadow }}>
          {/* the key across the face: a lit object in flight, never a flat slab */}
          {!open && faceKey(el.fill) ? <div style={{ ...FULL, background: faceKey(el.fill) }} /> : null}
          {layer(a, el.content.a, el.content.blurA, el.size.a, el.place.a, 'a', el.content.scaleA)}
          {layer(b, el.content.b, el.content.blurB, el.size.b, el.place.b, 'b', el.content.scaleB)}
        </div>
      )}
      {el.many.length ? null : rim}
    </div>
  );
  if (el.blur >= 0.5) body = <Defocus sigma={el.blur}>{body}</Defocus>;
  if (el.smear.v > 0) body = <DirBlur v={el.smear.v / u} angle={el.smear.angle} id={`handover-${h.kind}-${h.at}`}>{body}</DirBlur>;
  return <div style={{ ...FULL, opacity: el.opacity, pointerEvents: 'none' }}>{body}</div>;
};

/** Draws a handover (see the file header). Nothing outside its span unless `outScene` / `inScene` are given (then the scene of the frame). */
export const Handover: React.FC<HandoverProps> = (props) => {
  const film = useFilm();
  const now = useCurrentFrame();
  const f = props.frame ?? now;
  const h = handoverState(f, props, film);
  const draw = (c: Content | undefined, s: SceneLayer) => (typeof c === 'function' ? (c as (x: SceneLayer, y: HandoverState) => React.ReactNode)(s, h) : c);
  const { width, height } = sizeOf(film);
  return (
    <div style={{ ...FULL, width, height, overflow: 'hidden', pointerEvents: 'none', ...props.style }}>
      {props.ground}
      {props.outScene !== undefined && h.scenes.out.show ? <SceneLayerView s={h.scenes.out}>{draw(props.outScene, h.scenes.out)}</SceneLayerView> : null}
      {props.inScene !== undefined && h.scenes.in.show ? <SceneLayerView s={h.scenes.in}>{draw(props.inScene, h.scenes.in)}</SceneLayerView> : null}
      {/* an iris over a drawn scene is an opening: no face of its own, the next scene shows through it */}
      {h.el.show ? <ElementView h={h} a={props.a} b={props.b} many={props.many} open={h.kind === 'iris' && props.inScene !== undefined} /> : null}
    </div>
  );
};

/** The scene's own copy of the element on one side, in a component: the opacity to draw it at on this frame (0 while the handover draws it). */
export const useOwnOpacity = (spec: HandoverSpec, side: 'out' | 'in', frame?: number) => {
  const film = useFilm();
  const now = useCurrentFrame();
  return ownOpacity(frame ?? now, spec, side, film);
};

/**
 * A box on the depth stage (fx/depth: a plane's box at depth z, design px at 1080p) as a box on screen under the stage's
 * camera at frame f: the bounds of its four projected corners, in film px. For a handover whose side lives on a Stage3D.
 */
export const underStage = (world: BoxAt, cam: (f: number) => Cam, film?: Partial<FilmCtx>, z = 0): ((f: number) => HBox) => (f) => {
  const { width, height } = sizeOf(film);
  const fr = frameOf(width, height);
  const b = typeof world === 'function' ? world(f) : world;
  const basis = basisOf(cam(f), fr);
  const pts = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
  ].map(([x, y]) => project(basis, fr, [x, y, z]));
  if (pts.some((p) => !p)) return { x: 0, y: 0, w: 0, h: 0 };
  const xs = pts.map((p) => (p as { x: number }).x);
  const ys = pts.map((p) => (p as { y: number }).y);
  return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
};

/** What a Handover instance declares: one seam at its cut with the element's track (lib/handover handoverDeclares). */
export const declares = (props?: Partial<HandoverSpec>, film?: Partial<FilmCtx>): Declares => handoverDeclares(props, film);
