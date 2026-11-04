# Items

The things on screen: product windows, prompt boxes, cursors, glass panes, 3D hero objects, chats, inline pictures,
logo lockups, toasts, cards, photos, rings, pills, buttons, toggles, counters, charts, lists, checklists, avatars,
treated portraits, video panels, icons, node graphs, markers, guides, hand strokes, code panels, devices, grids,
mosaics, dot screens, particle fields, discs, orbit rings, planets, giant type, skeletons, menus and light objects.
Each entry says what the item is, the job it does, its numbers, how it moves in / holds / leaves, what makes it rich or
cheap, and Remotion 4 code that builds it at film size (deterministic, no state).

**Units.** px at 1920 x 1080 (a value noted "@1280" or "@720" is at that frame width; scale it). Frames at 30 fps unless
noted; convert with `fps / 30`.

---

## House rules for items

1. **Official files for real companies.** A real company's mark, app icon or wordmark is its current official file
   (press kit, Simple Icons, svgl, Wikimedia), never a drawn look-alike. If its colours clash with the palette, use the
   official monochrome variant, never a recolour of a multi-colour mark.
2. **Cards face the camera.** A tilt is only part of a designed 3D move that ends face-on (or an item held in a dragging
   hand). Nothing rests diagonally.
3. **No idle bobbing.** Hold motion is a camera creep of 0.2-1 px per frame, a slow push, or the item's own action
   (typing, counting, a shimmer).
4. **Every item does something:** it is typed into, clicked, counted, sent, stacked or morphed. An item with no action is
   decoration; cut it.
5. **Real content.** Real names, prices, timestamps and copy written for the product; never filler text, never
   identical rows.
6. **One system.** One radius family, one stroke weight for icons, one type family, one glass recipe per film.

## Shared kit

Every build below imports this file (`items-kit.tsx`): seconds-to-frames, a tween, a per-frame table player, a seeded
random, the official-logo loader stub and small layout helpers.

```tsx
// items-kit.tsx
import {interpolate, Easing, random} from 'remotion';
export const C = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const EXPO_OUT = Easing.bezier(0.16, 1, 0.3, 1);      // expo-out
export const QUINT_OUT = Easing.bezier(0.22, 1, 0.36, 1);
export const CIRC_OUT = Easing.bezier(0, 0.55, 0.45, 1);
export const EXPO_IN = Easing.bezier(0.7, 0, 0.84, 0);
export const IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);        // camera and pill width moves
export const ez = (f: number, f0: number, f1: number, a: number, b: number, e = EXPO_OUT) =>
  interpolate(f, [f0, f1], [a, b], {...C, easing: e});
// Per-frame tables: rows [frame, v0, v1, ...]; linear between listed frames.
export function tableAt(rows: number[][], f: number): number[] {
  if (f <= rows[0][0]) return rows[0].slice(1);
  for (let i = 1; i < rows.length; i++) if (f <= rows[i][0]) {
    const [a, b] = [rows[i - 1], rows[i]]; const t = (f - a[0]) / (b[0] - a[0]);
    return a.slice(1).map((v, k) => v + (b[k + 1] - v) * t);
  }
  return rows[rows.length - 1].slice(1);
}
// Motion blur rule: directional blur = half the per-frame step.
export const smear = (rows: number[][], f: number, k = 0) => Math.abs(tableAt(rows, f)[k] - tableAt(rows, f - 1)[k]) * 0.5;
export const seeded = (s: string) => random(s);               // never Math.random
// Directional blur filter (SVG): <DirBlur id="mbx" x={smear} y={0}/> then style={{filter:'url(#mbx)'}}
export const DirBlur: React.FC<{id: string; x: number; y: number}> = ({id, x, y}) => (
  <svg width={0} height={0} style={{position: 'absolute'}}><defs><filter id={id} x="-20%" y="-20%" width="140%" height="140%">
    <feGaussianBlur stdDeviation={`${x / 2} ${y / 2}`} /></filter></defs></svg>);
// Hold clock for films animated "on twos"/stepped.
export const onTwos = (f: number) => f - (f % 2);
```

## Index

| # | slug | item | job |
|---|---|---|---|
| 1 | `product-window` | real product UI under a camera | proof of what it does |
| 2 | `prompt-input` | prompt box, composer, search field | the user's intent |
| 3 | `cursor` | pointer and caret | cause and effect |
| 4 | `glass-pane` | glass with rim light | material, depth |
| 5 | `hero-3d-object` | a 3D object that carries the idea | the brand as a thing |
| 6 | `chat-thread` | a chat that grows | thinking and answering |
| 7 | `inline-object` | a picture inside the sentence | the noun becomes the picture |
| 8 | `logo-lockup` | the official logo locking up | the signature |
| 9 | `toast-stack` | notifications stacking in depth | traction, completion |
| 10 | `ui-card` | product cards and their state changes | the offer |
| 11 | `photo-card` | photos as physical cards | abundance, material |
| 12 | `card-ring` | many cards arranged in space | everything in one place |
| 13 | `pill-chip` | pills and chips | keywords, states |
| 14 | `button` | buttons that get pressed | commit |
| 15 | `toggle` | a toggle that flips the film's state | before / after |
| 16 | `counter` | numbers that move | magnitude |
| 17 | `chart` | data graphics that build | the measurable win |
| 18 | `data-list` | lists, tables, boards that build or reorganise | order from chaos |
| 19 | `checklist-row` | agent steps and checklists | competence, progress |
| 20 | `avatar` | avatars and people discs | who it is for |
| 21 | `treated-portrait` | photos turned into graphics | understanding, palette |
| 22 | `video-panel` | footage inside a shape, graded plates | the real world |
| 23 | `app-icon` | app icons and squircles | identity |
| 24 | `line-icon` | line icons that draw on | the concept, drawn |
| 25 | `node-graph` | networks, trees, connectors | integration |
| 26 | `marker-block` | coloured blocks behind words | the one word |
| 27 | `handles-guides` | handles, brackets, guides | precision |
| 28 | `hand-stroke` | hand-drawn marks | human intent |
| 29 | `code-panel` | code editors and terminals | it writes the code |
| 30 | `device` | phones, laptops, browser frames | context of use |
| 31 | `tile-grid` | grids of tiles and panels | many capabilities |
| 32 | `mosaic` | pixel blocks and mosaics | digital construction |
| 33 | `dot-grid` | dot screens and LED dots | a medium's texture |
| 34 | `particle-field` | fields of small things | the medium around the hero |
| 35 | `disc-porthole` | circles as actors | focus, opening |
| 36 | `orbit-rings` | concentric rings with riders | works with everything |
| 37 | `planet-globe` | planets and globes | scale, ambition |
| 38 | `giant-type` | type as an object | the claim as a monument |
| 39 | `skeleton` | placeholders that resolve | the product producing |
| 40 | `menu-tooltip` | menus, tooltips, dropdowns | the exact action |
| 41 | `light-objects` | light as an item | emphasis, material |

---

## Entries

### 1. Product window under a camera · `product-window`

**What.** One large, real-looking product screen (full layout, real copy, real data) built in code as one flat canvas,
with a separate camera (scale + translate, rarely a 3D yaw) that flies over it: push to the element that matters, pan
to follow the action, whip to the next region, pull back to show the whole. The canvas never wobbles; widgets build on
it.

**Job.** Proof. It answers "what does it do" without words: the camera lands on the exact control the line talks about.

**Numbers.** Camera scale on a UI canvas 0.92-2.09; pushes 18-42 f; widget stagger 4 f (2-3 f for skeletons); an
arrival overshoot 107 % -> 100 % in 5 f; window radius 0 to 110; shadow from none to `0 30px 80px rgba(80,90,140,.12)`.

**Presets.**
- *App under a camera.* One canvas at scale 1.00; the camera scale changes by scene (1.40 on the input, 1.0-1.48
  elsewhere); every move a push, a follow or a whip that lands.
- *Dashboard build.* A hard cut to the page at scale 1.296 settling to 1.0 on an expo-out (1.095, 1.036, 1.003, 0.983
  over 35 f); eight widgets cut on one every 4 frames at 107 %.
- *Window rise.* At scale 2.086 the window's top rises 870 -> 728 -> 641 -> 569 -> 504 -> 450 -> 403 ... -> 77 px over
  21 f (velocity decays about 12 % per frame).
- *Swing to flat.* A white window (radius 24, shadow `0 30px 80px rgba(80,90,140,0.12)`) swings in from rotateY 28
  degrees and lands flat over 18 f.
- *Glass dashboard.* Rises to flat, then makes one fast move up and back (width 1587 -> 1414 px in 9 f, 22-29 px per
  frame).
- *Page in perspective.* A flat website page placed in 3D enters 1.29x larger and recedes while it slides in.

**In / hold / out.** In: cut in at scale 1.3 and settle, rise with decaying velocity, or swing from a tilt to flat.
Hold: a camera creep of 1 px per frame while widgets build. Out: a whip (x1.3-2.4 acceleration per frame) or a
zoom-through into the next element.

**Rich.** Real copy and data (names, prices, timestamps); one coherent design system inside the window; the camera moving
with purpose; widgets building in a staggered order; motion blur on whips; a hidden cut inside a whip.

**Cheap.** A screenshot or a vague UI-shaped wireframe; the whole window fading in at once; aimless pans; idle floating;
a tilted card at rest; filler text; text colliding with other elements; everything sharp during a 140 px/f move.

```tsx
// AppCamera: one canvas, one camera table. Canvas is plain DOM at design size; camera rows [f, s, tx, ty].
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {CIRC_OUT, ez, smear, tableAt} from './items-kit';
const CAM: number[][] = [[0,1.296,-120,-80],[5,1.095,-40,-30],[10,1.036,-15,-10],[20,1.003,0,0],[40,0.983,10,5],
  [46,1.0,0,0],[58,1.25,180,-60],[75,1.45,330,-120],[85,1.432,322,-117]];   // one row per camera key; add rows per shot
export const AppCamera: React.FC<{children: React.ReactNode}> = ({children}) => {
  const f = useCurrentFrame(); const [s, tx, ty] = tableAt(CAM, f);
  const blur = Math.min(12, smear(CAM, f, 1));               // only on whips
  return <AbsoluteFill style={{overflow: 'hidden'}}>
    <div style={{position: 'absolute', width: 1920, height: 1080, transformOrigin: '0 0',
      transform: `translate(${tx}px,${ty}px) scale(${s})`, filter: blur > 1 ? `blur(${blur * 0.15}px)` : undefined}}>{children}</div>
  </AbsoluteFill>;
};
// Widget that cuts on at 107 % and settles in 5 frames: no fade.
export const Widget: React.FC<{at: number; box: number[]; children: React.ReactNode}> = ({at, box, children}) => {
  const f = useCurrentFrame(); if (f < at) return null;
  const k = ez(f, at, at + 5, 1.07, 1.0);
  return <div style={{position: 'absolute', left: box[0], top: box[1], width: box[2] - box[0], height: box[3] - box[1],
    transform: `scale(${k})`, background: '#fff', borderRadius: 18, boxShadow: '0 2px 10px rgba(0,0,0,.04)'}}>{children}</div>;
};
// 3D swing-to-flat entrance
const swing = (f: number) => ({transform: `perspective(1800px) translateX(${ez(f,192,210,90,0,CIRC_OUT)}px)
  rotateY(${ez(f,192,210,28,0,CIRC_OUT)}deg) rotateX(${ez(f,192,210,6,0,CIRC_OUT)}deg) scale(${ez(f,192,210,0.92,1,CIRC_OUT)})`});
```

### 2. Prompt box, composer, search field · `prompt-input`

**What.** A rounded field (pill or rounded rect) with a placeholder, small tool icons, a model chip and a send disc. It
enters big and close, the placeholder gives way to a caret, the request types (per-frame visible strings), the send
button is pressed, and the field becomes something else (a bubble, a glow, a card, a porthole, the next scene).

**Job.** The user's intent in their own words; the press is the hinge of the film (problem -> product).

**Numbers.** Field height 70-182 px; radius 3 (a field inside a bezel), 12 (the bezel), 22-42 (cards), h / 2 (pills);
typing 1 character per frame to one word every 2 f; the newest glyphs tinted for 1-4 f; caret blink 10 / 10 f (about
0.4-0.5 s half period); press depth 47-80 % of the button size.

**Presets.**
- *Dark glass box.* 975 x 182, radius 42, fill `#242424` with the top 40 px at `#2A2A2A`, a 1.5 px border
  `rgba(255,255,255,0.10)`, a soft outer glow; Lucide icons in `#565656` / `#747474`.
- *Bezel box.* A white field (radius 3) inside a translucent glass bezel 16-18 px wide (white about 35 %), bezel radius
  12, outer white glow 14 px at 55 %.
- *Light message field.* A white pill `#F6FBF5`, shadow `0 30px 60px rgba(60,90,120,.12)`, a grey "+" and placeholder; a
  giant cartoon cursor clicks it.
- *Frosted pill over a photo.* `rgba(255,255,255,0.72)` over an 18 px backdrop blur, 1 px white border at 60 %, shadow `0
  8px 30px rgba(20,40,60,0.12)`.
- *Iridescent bar.* 804 x 80, radius 40, a 2-3 px backdrop blur under a 70 % pale cyan fill with soft pink, lilac and
  cyan blobs drifting inside, a 1 px white inner rim at 60 %.
- *Composer card.* White, radius 40, border 2 px `#E5E5E5`, shadow `0 10px 30px rgba(0,0,0,0.08)`, sliding in
  decelerating (left edge 1175, 1125, 1103, 1090, 1077, 1071 px).

**In / hold / out.** In: rise from blur 40 -> 0 px in 18 f with scale 0.845 -> 0.98, slide in decelerating, or arrive
huge and pull back (1.55 -> 1.0 quint-out). Hold: typing and a creep. Out: the press, then a morph into a bubble or a
glow, a wipe, or a zoom-through.

**Rich.** Real request copy, a model chip and tool icons; the box arriving from blur and creeping; a coloured head on new
glyphs; a caret that blinks independently of typing; a press with a real spring; a transformation on send.

**Cheap.** A plain rounded rectangle with centred text; typing at a constant rate with no caret logic; the box simply
fading out after typing; placeholder and typed text in the same colour; icons of mixed stroke weights.

```tsx
import React from 'react';
import {interpolateColors, useCurrentFrame} from 'remotion';
import {tableAt} from './items-kit';
import {SendDisc} from './button';   // the send disc (`button`)
const ENTER = [[0,752,0.845,40,0.6],[1,668,0.845,34,0.85],[2,630,0.846,28,1],[3,606,0.847,22,1],[4,589,0.848,17,1],
  [5,574,0.85,13,1],[6,563,0.852,10,1],[12,552,0.912,3.2,1],[14,555,0.94,2.2,1],[16,552,0.967,1.4,1],[18,550,0.984,0.8,1],[33,546,1.03,0,1]];
const TYPED: [number, string][] = [[36, 'Plan'], [37, 'Plan my'], [39, 'Plan my launch'], [41, 'Plan my launch week']];
export const PromptBox: React.FC = () => {
  const f = useCurrentFrame(); const [cy, s, blur, op] = tableAt(ENTER, f);
  const typed = [...TYPED].reverse().find(([k]) => f >= k)?.[1];
  const caretOn = Math.floor(f / 15) % 2 === 0;                // blink independent of typing
  return <div style={{position: 'absolute', left: 962 - 487, top: cy - 91, width: 975, height: 182, borderRadius: 42,
      background: 'linear-gradient(#2A2A2A 0 40px, #242424 40px)', border: '1.5px solid rgba(255,255,255,.10)',
      boxShadow: '0 0 120px rgba(255,255,255,.06)', transform: `scale(${s})`, filter: `blur(${blur}px)`, opacity: op}}>
    <div style={{position: 'absolute', left: 38, top: 51, font: '400 35px "Segoe UI", Inter', color: typed ? '#EDEDED' : '#6A6A6A'}}>
      {typed ?? 'Ask anything'}{typed && caretOn && <span style={{display: 'inline-block', width: 2, height: 36, background: '#EDEDED', marginLeft: 3}}/>}
    </div>
    <SendDisc cx={975 - 91} cy={91} r0={34} pressAt={60} />
  </div>;
};
// Send disc press and coloured head on new glyphs
const PRESS = [[0,34],[1,28],[2,16],[3,27],[4,31],[5,33]];
const glyphColor = (age: number) => interpolateColors(Math.min(age, 4), [0, 4], ['#38A5FA', '#111111']);
```

### 3. Cursor and caret · `cursor`

**What.** A vector cursor (a macOS-style arrow 22 x 40 with a 1.5 px white outline, a hand, a grab hand, an I-beam) or a
designed one (a giant cartoon arrow with a thick outline and a far shadow, a pixel hand, a chunky 3D cursor, team
cursors with name pills). Its tip is the anchor the camera follows. A click is a 1-5 frame shrink (72-92 %) with a
spring release and a visible consequence.

**Job.** Cause and effect, and whose action (a team cursor names the actor); also a camera anchor.

**Numbers.** Height 40 px (@1280), 64 px, 110-260 px (giant); click shrink 72-92 %; click length 1-5 f; an ease-out
landing after a 15-25 f approach; a 360-degree spin in 6 f; name pills 210 x 56.

**Presets.**
- *System arrow.* An SVG arrow 22 x 40 (@1280), black body, 1.5 px white outline, shadow `0 1px 2px rgba(0,0,0,0.35)`,
  variants arrow / hand / grab.
- *Giant cartoon.* White fill, thick black outline, a blurred grey shadow far below-right (it hovers high); flies in from
  the bottom, turns into a hand on hover; the click is 0.72 for one frame.
- *3D cursor.* Spins in from below (edge-on twice), parks under a menu item, clicks (shrink 10 %); then a selection bar
  slides to the next item.
- *Spin cursor.* One full clockwise turn in 6 frames while travelling up-right; letters nearest it swap style as it
  passes.
- *Hand on a button.* A 64 px hand rises from below in 5 frames (blurred on the first) onto a glowing pill.
- *Giant black arrow.* Solid black, 4 px white outline, 200 px tall growing to 260 with a push-in; the clicked row greys
  to 40 % for 10 f.

**In / hold / out.** In: rise from below or fly in with a 2-4 f smear, an ease-out landing. Hover: 2-4 px micro moves or
none. Click: a 1-3 f shrink and a spring release (m 0.6, k 300, d 18). Out: leaves with the camera.

**Rich.** Scale contrast (a giant cursor over small UI, or a tiny one in a vast canvas); a shadow that tells its height; a
shape change on hover; a click with a real spring and a visible consequence; a spin or 3D turn on entry; a curved path
that lands.

**Cheap.** A cursor sliding linearly from A to B; a click with no consequence; a default 20 px cursor on a 1080p frame
where nobody sees it; a cursor drawn above everything with no shadow; jitter.

```tsx
import React from 'react';
import {Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {C, ez, smear, tableAt} from './items-kit';
const ARROW = 'M0 0 L0 30 L8 23 L13 36 L18 34 L13 22 L23 22 Z';   // 22x40 box, tip at (0,0)
export const Cursor: React.FC<{path: number[][]; clickAt?: number; size?: number; variant?: 'arrow' | 'ibeam'; label?: {text: string; color: string}}> =
  ({path, clickAt, size = 1, variant = 'arrow', label}) => {
  const f = useCurrentFrame(); const {fps} = useVideoConfig();
  const [x, y] = tableAt(path, f);
  let k = 1;
  if (clickAt !== undefined && f >= clickAt) {
    k = f < clickAt + 3 ? 0.73 : 0.73 + 0.27 * spring({frame: f - clickAt - 3, fps, config: {mass: 0.6, stiffness: 300, damping: 18}});
  }
  const blur = smear(path, f) + smear(path, f, 1);
  return <div style={{position: 'absolute', left: x, top: y, transformOrigin: '0 0', transform: `scale(${size * k})`,
      filter: `drop-shadow(0 1px 2px rgba(0,0,0,.35))${blur > 4 ? ` blur(${Math.min(blur * 0.1, 6)}px)` : ''}`}}>
    {variant === 'arrow'
      ? <svg width={24} height={40}><path d={ARROW} fill="#000" stroke="#fff" strokeWidth={1.5} strokeLinejoin="round"/></svg>
      : <svg width={14} height={40}><path d="M2 2h10M7 2v36M2 38h10" stroke="#111" strokeWidth={2.5} fill="none"/></svg>}
    {label && <div style={{position: 'absolute', left: 30, top: 34, height: 56 / 2, padding: '0 14px', borderRadius: 14,
      background: label.color, color: '#fff', font: '600 15px Inter', lineHeight: '28px', whiteSpace: 'nowrap'}}>{label.text}</div>}
  </div>;
};
// Click bloom: radial light under the text, d 150 -> peak at +4..+7 f -> gone at +14 f
export const ClickBloom: React.FC<{at: number; x: number; y: number}> = ({at, x, y}) => {
  const f = useCurrentFrame(); const t = f - at; if (t < 0 || t > 14) return null;
  const r = interpolate(t, [0, 5, 14], [75, 290, 300], C); const a = interpolate(t, [0, 4, 8, 14], [0.4, 1, 0.8, 0], C);
  return <div style={{position: 'absolute', left: x - r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', opacity: a,
    background: 'radial-gradient(circle, #AFD6F5 0%, rgba(175,214,245,.5) 50%, rgba(175,214,245,0) 100%)'}}/>;
};
// Spin-in and 3D edge-on spin
const spin2d = (f: number, at: number) => ez(f, at, at + 6, 0, 360, Easing.inOut(Easing.quad));
const spin3d = (f: number, at: number) => `perspective(800px) rotateY(${ez(f, at, at + 12, 720, 0)}deg)`;
```

### 4. Glass with rim light · `glass-pane`

**What.** A layered pane: (1) a blurred sample of what is behind (backdrop filter or a pre-blurred copy), (2) a body tint
(dark `#202020` at 0.92, white at 0.035-0.72, or a coloured gradient), (3) a rim (1-2.5 px, 8-60 % white, brighter on
top), (4) an outer glow (blur 10-60 px, 6-55 %), (5) optional specular streaks or a clipped light sweep. Variants: dark
glass, frosted light, a bezel around a white field, a zoned glass disc button, glass letters, glass solids, reeded bars.
See `effects.md` `frosted-glass` and `glass-solid` for the light recipes.

**Job.** Material is brand quality; glass also forces depth, because it needs something behind it (a blurred stage, a
sky, a ring of light, a photo).

**Numbers.** Rim 1-2.5 px at 8-60 % white (top brighter); body alpha 0.035 (dark on dark) to 0.92 (a toast), 0.72 light
frosted; backdrop blur 2-24 px; outer glow sigma 10-60 px at 6-55 %; radius 3-110.

**Presets.**
- *Dark plan card.* Radius 26, fill `rgba(255,255,255,0.035)`, backdrop blur 14 px, border 1.5 px
  `rgba(255,255,255,0.18)`, a 1 px inner top highlight.
- *Dark toast.* Radius 34, `#202020` at 0.92 over a 20 px blur, border 1 px `rgba(255,255,255,0.08)`, a deep soft
  shadow.
- *Glass disc button.* The outer rim radius closes from 109.5 to 57 px over 20 f while the zones inside settle (the zone
  colours are in `effects.md` `glass-solid`).
- *Bezel around white.* A bezel 16-18 px at about 35 % white, radius 12, outer glow 14 px at 55 %; cards with an 8 px
  bezel.
- *Glass letters.* A display serif at about 1000 px; each glyph face a vertical gradient from black to violet, readable at
  the top only by its 1.5 px rim.
- *Glass app frame.* An outer frame radius about 110 with a lighter frosted band (+18 luma) and a 1.5 px rim (40 %
  white, brighter on top).

**In / hold / out.** In: rise from blur with scale 0.845, or slide in with an overshoot. Hold: a specular slides, the
camera creeps. Out: slide into an invisible slot, blur away (0 -> 25 px), or fold into the next panel.

**Rich.** Something real and moving behind the glass; a brighter top rim; one moving specular; dark glass on near-black
with the ground lifted to `#090909` and fine grain; coloured zones inside.

**Cheap.** A backdrop filter over a flat colour (nothing to refract, it reads grey); an even 1 px white border all round; a
heavy drop shadow; multi-hue glassmorphism everywhere; glass on glass on glass.

```tsx
// Glass pane: backdrop sample + tint + rim + glow + optional moving specular. Cheap: if the world behind is a static layer,
import React from 'react';
// pre-render a blurred copy of it once and show it clipped to the pane (backdrop-filter is costly in software GL at large sizes).
export const Glass: React.FC<{box: number[]; r: number; tint: string; rim?: number; glow?: string; blur?: number; children?: React.ReactNode; spec?: number}> =
  ({box, r, tint, rim = 0.18, glow = '0 0 60px rgba(255,255,255,.06)', blur = 14, children, spec}) => {
  const [x0, y0, x1, y1] = box;
  return <div style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, borderRadius: r, overflow: 'hidden',
      background: tint, backdropFilter: `blur(${blur}px)`, border: `1.5px solid rgba(255,255,255,${rim})`, boxShadow: glow}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: r, boxShadow: 'inset 0 1px 0 rgba(255,255,255,.10)'}}/>
    {spec !== undefined && <div style={{position: 'absolute', left: spec - 85, bottom: -1, width: 170, height: 3, borderRadius: 2,
      background: 'radial-gradient(closest-side, #fff, rgba(255,255,255,0))', filter: 'blur(0.5px)', mixBlendMode: 'screen',
      boxShadow: '0 0 10px 2px rgba(255,255,255,.45)'}}/>}
    {children}
  </div>;
};
// Glass letters: text with a vertical gradient fill (black top -> violet bottom), a thin top rim via a 1.5 px offset copy
// and a white sweep band clipped to the glyphs (background-clip:text on a moving gradient).
export const GlassWord: React.FC<{text: string; sweepX: number}> = ({text, sweepX}) => <div style={{position: 'relative',
  font: '400 1000px "Instrument Serif"', lineHeight: 1}}>
  <span style={{background: 'linear-gradient(#000 0%, #000 40%, #937BF0 62%, #A996F9 75%, #CFC1FC 88%, #E6DDFB 100%)',
    WebkitBackgroundClip: 'text', color: 'transparent'}}>{text}</span>
  <span style={{position: 'absolute', inset: 0, transform: 'translateY(-1.5px)', color: 'transparent',
    WebkitTextStroke: '1.5px rgba(200,232,208,.6)', clipPath: 'inset(0 0 60% 0)'}}>{text}</span>
  <span style={{position: 'absolute', inset: 0, color: 'transparent', WebkitBackgroundClip: 'text', mixBlendMode: 'screen',
    background: `linear-gradient(100deg, transparent ${sweepX - 6}%, rgba(255,255,255,.9) ${sweepX}%, transparent ${sweepX + 6}%)`}}>{text}</span>
</div>;
```

### 5. A 3D hero object that carries the idea · `hero-3d-object`

**What.** A real 3D object (three.js via `@remotion/three` in software GL, or CSS 3D for boxes and slabs) that performs one
designed move: drops and squashes, assembles from parts, swings face-on into the flat logo, pulls back into the lockup,
tumbles and explodes, or is a small world the camera dives into. It always resolves into a 2D brand state.

**Job.** The brand as a physical thing; a transformation (parts -> whole, 3D -> flat mark) that says "it comes together".

**Numbers.** Entrance 7-25 f; squash to 82 % height / 127 % width, stretch to 106 %; a face-on landing in 7-15 f; an
overshoot of about 8 px or none; a pull-back scale 1.0 -> 0.38 in 13 f with a 12-degree turn; a slab receding 1 -> 0.55.
The only allowed idle is one slow spin (1.5 degrees per frame).

**Presets.**
- *Extruded mark pull-back.* Extrude the official SVG paths (depth 0.35 x the arm width, a 2-3 % rounded bevel); light it
  with the rig in `effects.md` `light-rig-3d`; pull back into the lockup.
- *Voxel mark.* An orthographic camera, dark matte boxes lit from the top (top `#154626`, sides `#092913`), no outlines,
  no ground shadow; one cube splits into four, a lattice, then the mark.
- *Block drop.* A white rounded cube with 7 px black outlines and the official icon on its face falls tumbling, squashes on
  landing and stretches past rest.
- *Logo slab.* A thick rounded slab about 1700 x 560 px, 70 px deep, the lockup on its white face, its side band coloured
  with a heat ramp; it recedes 1 -> 0.55.
- *Glass cube.* Translucent tinted faces (alpha 0.45-0.7), white 2 px edges, a sphere fixed at its centre; it grows from
  a point.
- *Diorama.* About 6k triangles: a lathe disc, a bowl, a glass dome; the camera dives in.

**In / hold / out.** In: a drop with blur, an assembly, a swing in. Hold: none, or one slow spin. Out: land face-on and
flatten, pull back into the lockup, bleach into the stage.

**Rich.** Real lighting (key, rim, hemisphere); bevels that catch light; motion blur on the fast part; a precise landing in
the flat logo; squash and stretch only on contact; the object resolving into the brand.

**Cheap.** A spinning logo with no light change; CSS 3D cards rotated at rest; extrusions with flat unlit sides; endless
rotation; a stand-in shape for a real company's mark.

```tsx
// (a) CSS-3D slab / logo card (no WebGL): swing-down, recede, face-on. Edge band = a child rotated -90deg about X.
import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {C} from './items-kit';
export const Slab: React.FC<{f0: number; children: React.ReactNode}> = ({f0, children}) => {
  const f = useCurrentFrame(); const t = f - f0;
  const rx = interpolate(t, [0, 7, 29], [55, 30, 0], {...C, easing: Easing.out(Easing.cubic)});
  const y = interpolate(t, [0, 7, 36], [-700, 0, 180], {...C, easing: Easing.out(Easing.quad)});
  const s = interpolate(t, [0, 6, 22, 36], [1, 0.82, 0.7, 0.55], C);
  const bleach = interpolate(t, [29, 33], [0, 1], C);
  return <div style={{position: 'absolute', left: 110, top: 260, width: 1700, height: 560, transformStyle: 'preserve-3d',
      transform: `perspective(2200px) translateY(${y}px) scale(${s}) rotateX(${rx}deg)`}}>
    <div style={{position: 'absolute', inset: 0, borderRadius: 48, background: `rgba(255,255,255,${1})`,
      boxShadow: `0 0 0 ${1 - bleach}px #eee`}}>{children}</div>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 70, transformOrigin: 'bottom', transform: 'rotateX(-90deg)',
      background: 'linear-gradient(90deg,#F5C518,#F08A1C,#D9301C,#111 50%,#D9301C,#F08A1C,#F5C518)'}}/>
  </div>;
};
// (b) Squash on contact: height 225 -> 185 & width 227 -> 287 over 5 f after landing, then stretch past rest to 239.
const squash = (f: number, land = 160) => {
  const sy = interpolate(f, [land, land + 5, land + 16], [1, 185 / 225, 239 / 225], {...C, easing: Easing.out(Easing.quad)});
  const sx = interpolate(f, [land, land + 5, land + 16], [1, 287 / 227, 215 / 227], {...C, easing: Easing.out(Easing.quad)});
  return `scale(${sx}, ${sy})`;   // transform-origin: 50% 100% (bottom fixed)
};
// (c) three.js extrusion of an OFFICIAL SVG mark: SVGLoader -> ExtrudeGeometry({depth: 0.35*arm, bevelEnabled: true
// bevelThickness: 0.03*arm, bevelSize: 0.03*arm, bevelSegments: 3}); MeshStandardMaterial({color:'#1E56E8', roughness:.35});
// DirectionalLight key (upper-left-front, 1.2) + DirectionalLight rim (right, cool #BFD8FF, 0.8) + HemisphereLight('#CFE0FF','#FFFFFF',0.6).
// Camera: scale table [[0,1],[3,.624],[8,.456],[13,.378]] -> camera.position.z = z0 / s; camera rotation.z = -deg.
// Render with <ThreeCanvas> and `npx remotion render --gl=swangle`; keep < 30k triangles; no shadows, no transmission.
```

### 6. A chat that grows · `chat-thread`

**What.** A vertical stack anchored at the bottom: the user's bubble (from the sent request), an agent row (a thinking label
with a shimmer or pulsing dots, or a checklist of steps), then the answer streaming in; each new item cuts on low and
eases up while the stack pushes everything older up; older items defocus and fade.

**Job.** The product thinking and answering; real steps make the AI feel competent.

**Numbers.** Item entry offset 40-60 px with an 11-18 f ease, or 75 % on the first frame and a 3-5 f settle; bubble
radius 14-34; stream rates: a paragraph wipe about 100 px per frame, lists about 5 characters per frame, a question 1-2.5
characters per frame, rows about 1 line every 2 f; shimmer period 18-20 f.

**Presets.**
- *Bottom-anchored stack.* Items cut on 40-60 px low and ease up over 11-18 f; the stack grows upward; older items defocus
  and fade; the typing pill turns blue, stretches and becomes the answer card.
- *Two-column chat.* The user's grey bubble in a right column, the answer in a left column; the thread auto-scrolls on an
  ease-out re-triggered whenever content grows.
- *Agent steps.* A white user bubble (radius about 34) pushed up step by step, each push 75 % on its first frame and
  settled over 3-5 f.
- *Thinking and checklist.* The request becomes a grey bubble `#F4F4F4` (radius 24) at the top right and slides up; a
  thinking row with a shimmer; a checklist builds under it (see `checklist-row`).
- *Streaming paragraph.* The paragraph block grows downward about one line every 2 frames until it reaches the frame
  bottom.

**In / hold / out.** In: cut on low and ease up, or unfold from a bar. Hold: the stream and the shimmer. Out: a push-in
through a card into the next element (x1.55 over 42 f), or an iris.

**Rich.** Real, specific copy (names, files, tools); different stream rates for different content; a shimmer on the agent
status; a push-up with a 75 % first-frame settle; older items defocusing; the typing pill morphing into the answer.

**Cheap.** Bubbles fading in one after another at a fixed interval; filler text; everything typing at the same rate; a
static screenshot of a chat; dots with no rhythm.

```tsx
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ez} from './items-kit';
type Item = {at: number; h: number; node: React.ReactNode};
// Bottom-anchored stack: each item cuts on 50 px low, eases up over 14 f; every older item is pushed up by the newcomer's height
// on the same curve; items older than 3 places blur 2 px and fade to 0.5.
export const ChatStack: React.FC<{items: Item[]; bottom: number; gap?: number}> = ({items, bottom, gap = 18}) => {
  const f = useCurrentFrame();
  const live = items.filter((i) => f >= i.at);
  return <>{live.map((it, idx) => {
    const above = live.slice(idx + 1);                       // newer items push this one up
    const push = above.reduce((acc, n) => acc + (n.h + gap) * ez(f, n.at, n.at + 14, 0, 1), 0);
    const rise = ez(f, it.at, it.at + 14, 50, 0);
    const age = live.length - 1 - idx;
    return <div key={idx} style={{position: 'absolute', left: 0, right: 0, top: bottom - it.h - push + rise,
      filter: age > 3 ? 'blur(2px)' : undefined, opacity: age > 3 ? 0.5 : 1}}>{it.node}</div>;
  })}</>;
};
// Shimmer text: background-clip text with a moving light band every 20 f.
export const Shimmer: React.FC<{text: string; f: number}> = ({text, f}) => {
  const p = ((f % 20) / 20) * 160 - 30;
  return <span style={{background: `linear-gradient(90deg,#9A9A9A ${p - 20}%,#EDEDED ${p}%,#9A9A9A ${p + 20}%)`,
    WebkitBackgroundClip: 'text', color: 'transparent'}}>{text}</span>;
};
// Streamed list line: visible string per frame from a table (never chars/second): [[0,''],[1,'Draft'],[2,'Draft the brief'],...]
```

### 7. A picture inside the sentence · `inline-object`

**What.** A small rounded picture (a photo chip, an avatar circle, a video card, a tile, a photo stack) sits in the line
at cap height between two words; it grows about its own centre and pushes the words outward (the type moves, it never
scales), its content may flip on beats, and the camera may zoom through it into the next scene. Motion recipe in
`animations.md` `grow-push`.

**Job.** The noun becomes the picture (who, what, where) without a separate image shot; also a transition device.

**Numbers.** Chip height = the cap height to 1.2x the cap; radius 14, h / 2 or a circle; words pushed 20-600 px; content
flips every 2-6 f or on quarter beats; the picture may lead the words by 3 f.

**Presets.**
- *Chip in the line.* The line re-lays out in one frame around a 77 px photo chip at a 70 px cap; the chip grows, its
  photo changes on the beat, then the camera zooms through it.
- *Pair re-centre.* Two words cut on 5 f apart; the pair re-centres in one frame (no animation); a small picture grows in
  the gap.
- *Sky pill.* A pill with a sky photo (radius h / 2) sits in the line and grows about its centre, pushing both sides.
- *Placeholder block.* A tilted photo print (+3 degrees, small corner squares) with a coloured block holding the place of
  the next word until the word arrives.
- *Source slot.* A 480 px tile is the slot between two words; every source word arrives by flipping up about its
  baseline (`animations.md` `swap-drum`).
- *Leading card.* A mini video card sits between the words and leads them by 3 frames; the line rises about 80 px on an
  ease-out.

**In / hold / out.** In: a one-frame re-layout and the chip grows. Hold: flips on beats, a slow zoom. Out: a zoom through
the chip, the chip collapsing to a block, or the words flying out.

**Rich.** The chip exactly at cap height with tight spacing; the words pushed, not scaled; the picture changing on beats;
a one-frame re-centre on re-layout; a zoom-through at the end.

**Cheap.** An emoji in the line; a picture placed above or below the text; the line scaling with the chip; letter-spacing
changed to make room; a chip radius that does not match the rest of the film.

```tsx
// Line with an inline chip whose width w(f) pushes the two word groups apart; both groups keep their font size.
import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, EXPO_OUT} from './items-kit';
export const InlineChipLine: React.FC<{left: string; right: string; srcs: [number, string][]; cap: number; y: number}> =
  ({left, right, srcs, cap, y}) => {
  const f = useCurrentFrame();
  const h = cap * 1.1; const w = interpolate(f, [0, 10, 40], [h * 0.6, h * 2.2, h * 4.0], {...C, easing: EXPO_OUT});
  const src = [...srcs].reverse().find(([k]) => f >= k)?.[1] ?? srcs[0][1];   // cut flips on listed frames
  const gap = cap * 0.28;
  return <div style={{position: 'absolute', top: y, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap, font: `500 ${cap / 0.72}px Inter`, letterSpacing: '-0.02em'}}>
    <span>{left}</span>
    <div style={{width: w, height: h, borderRadius: h / 2, overflow: 'hidden', boxShadow: 'inset 0 0 0 2px rgba(255,255,255,.7)'}}>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
    </div>
    <span>{right}</span>
  </div>;
};
```

### 8. The official logo locking up · `logo-lockup`

**What.** The official mark (the press-kit SVG, never redrawn) plus the wordmark, assembled by one designed move: a spin-in
from 2x with rotational blur; parts sliding together with a glow; the wordmark typed and re-centred every frame; the
wordmark sliding out from behind the badge while fading 25 % -> 100 %; a hue walk into the brand ink; a jump left when the
wordmark cuts on; a write-on by a pen dot; a 3D extrusion pulling back. The hold is still or shrinks very slowly.

**Job.** The signature; it should echo a shape or colour from the film (the knob, the chip, the dot) so it lands as a
payoff.

**Numbers.** Spin-in of 84 degrees from 2.06-2.16x in about 28 f; scale-in 0.807 -> 1 in 12 f; 1.3 -> 1.0 with 12 -> 0
px blur in 11-15 f; typing 1 letter per frame to 1 letter every 2 f; a final hold of 0.5-8 s, still or shrinking 2 % at
most.

**Presets.**
- *Badge spin-in.* On its first frame the badge is already 2.16x its rest size, rotated +84 degrees; it spins back and
  shrinks to rest over about 28 f with a rotational blur on the fast frames; the wordmark slides out from behind it.
- *Parts assemble.* The mark's parts start spread apart, one glowing (a soft 30 px glow), and slide together; the letters
  follow.
- *Blur-scale wordmark.* The wordmark arrives large and blurred (about 12 px, pale), settles to scale 1 over 15 f.
- *Typed and re-centred.* The wordmark types one letter per frame and the whole lockup (mark + gap + text) re-centres
  every frame.
- *Lockup jump.* The wordmark cuts on to the right of the glyph and the whole lockup jumps left and eases in on a stepped
  clock.
- *Scale and hold.* The mark already at 0.807 on black, to 1.0 in 12 f, then perfectly still.

**In / hold / out.** In: a spin or scale from 2x with blur, parts assembling, or typing. Hold: still or a slow shrink. Out:
a cut to black, or the film ends on it.

**Rich.** The official mark; one decisive move with blur on its fast part; the wordmark entering from behind the mark;
tracking that closes as letters land; a still final hold or a barely visible shrink.

**Cheap.** A fade in plus scale 0.9 -> 1; a redrawn approximation of a real logo; logo colours that clash with the palette
(use the official monochrome variant); bouncing.

```tsx
import React from 'react';
import {Easing, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, tableAt} from './items-kit';
const ROT = [[0,84],[2,66],[4,56],[6,48],[8,42],[10,36],[12,32],[14,28],[16,24],[18,22],[20,20],[24,16],[28,10],[40,0]];
export const BadgeSpinIn: React.FC<{svg: string; word: string; f0: number}> = ({svg, word, f0}) => {
  const f = useCurrentFrame() - f0 + 720;
  const [rot] = tableAt(ROT, f);
  const s = interpolate(f, [720, 774], [2.16, 1], {...C, easing: Easing.out(Easing.cubic)});
  const cx = interpolate(f, [720, 774], [939, 733], {...C, easing: Easing.out(Easing.cubic)});
  const dRot = Math.abs(tableAt(ROT, f)[0] - tableAt(ROT, f - 1)[0]);
  const wx = interpolate(f, [746, 764], [183, 0], {...C, easing: Easing.out(Easing.cubic)});
  const wo = interpolate(f, [746, 764], [0.25, 1], C);
  return <>
    {/* rotational blur: 3 ghost copies at -dRot/2..0 with falling opacity */}
    {[0.5, 0.25, 0].map((k, i) => <Img key={i} src={staticFile(svg)} style={{position: 'absolute', width: 154, height: 154,
      left: cx - 77, top: 532 - 77, transform: `scale(${s}) rotate(${rot + dRot * k}deg)`, opacity: i === 2 ? 1 : 0.25}}/>)}
    <div style={{position: 'absolute', left: 840 + wx, top: 480, opacity: wo, clipPath: 'inset(0 0 0 0)',
      font: '700 92px Inter', color: '#1F1F1F'}}>{word}</div>   {/* use the official wordmark SVG in production */}
  </>;
};
// Typed lockup re-centred every frame: measure the typed string each frame and shift the group so its centre stays at 960.
// const w = measureText({text: typed, fontFamily: 'Inter', fontSize: 94, fontWeight: '600'}).width; left = 960 - (116 + 26 + w) / 2;
```

### 9. Notifications stacking in depth · `toast-stack`

**What.** Dark rounded toasts with an app-icon tile, a bold title and a grey line; a new one enters the front slot every
4 frames from below (scale 0.95, 60 %, 6 px blur) while every older one moves one slot back (smaller, dimmer, higher); the
whole stack climbs. A single-toast variant: one glass toast over a blurred, darkened stage. Depth numbers in
`effects.md` `dof-ladder`.

**Job.** Traction, volume, completion ("it is live").

**Numbers.** One toast every 4 f (7.5 per second); entry 6-8 f on an expo-out from 120 px below; scale 0.92-0.95 -> 1.0;
blur 6-8 -> 0; radius 34-72; the stage behind blurred 12 px.

**Presets.**
- *Payment stack.* The front toast 1376 x 215 px, radius 72, fill `#1B2232` -> `#181D28` top to bottom, no border, a
  deep soft shadow; a new toast every 4 frames reaching its slot in 6 f; names and amounts change on every arrival.
- *Night stack.* A black stage with a blue glow band rising from the bottom (`#1E4FD8` at the bottom fading to black by
  y 700) that climbs with the stack.
- *Single glass toast.* Radius 34, `#202020` at 0.92 over a 20 px blur, border 1 px `rgba(255,255,255,0.08)`, over a
  blurred, darkened stage.

**In / hold / out.** In: from 120 px below at 0.95, 60 %, blur 6 -> its slot in 6 f. Hold: the stack climbs and drifts.
Out: a push-in, then a pull-out to black.

**Rich.** Real names and amounts that change per toast; depth (older toasts smaller and higher); the whole stack moving; a
blurred, darkened world behind a single toast; an official app icon.

**Cheap.** Toasts sliding in from the side one per second; identical text; no depth; a bright white toast with a huge
shadow on a white page.

```tsx
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {tableAt} from './items-kit';
const CURVE = [0, 0.59, 0.76, 0.87, 0.93, 0.96, 0.98, 1];          // Per-frame progress
const prog = (t: number) => t <= 0 ? 0 : t >= 7 ? 1 : CURVE[Math.floor(t)] + (CURVE[Math.ceil(t)] - CURVE[Math.floor(t)]) * (t % 1);
const SLOT = [{y: 0, s: 1, o: 1}, {y: -150, s: 0.86, o: 0.85}, {y: -280, s: 0.74, o: 0.6}, {y: -390, s: 0.64, o: 0.35}];
export const ToastStack: React.FC<{arrivals: number[]; names: string[]; anchor: number[][]}> = ({arrivals, names, anchor}) => {
  const f = useCurrentFrame(); const [ay] = tableAt(anchor, f);
  return <>{arrivals.map((a, i) => {
    if (f < a) return null;
    const newer = arrivals.filter((b) => b > a && f >= b);           // how many slots it has been pushed back
    const slotF = newer.reduce((acc, b) => acc + prog(f - b), 0);   // fractional slot index
    const lo = SLOT[Math.min(3, Math.floor(slotF))], hi = SLOT[Math.min(3, Math.ceil(slotF))], k = slotF % 1;
    const p = prog(f - a);
    const y = ay + lo.y + (hi.y - lo.y) * k + (1 - p) * 120;
    const s = (lo.s + (hi.s - lo.s) * k) * (0.95 + 0.05 * p);
    return <div key={i} style={{position: 'absolute', left: 272, top: y, width: 1376, height: 215, borderRadius: 72, zIndex: 100 - newer.length,
      background: 'linear-gradient(#1B2232,#181D28)', boxShadow: '0 18px 40px rgba(8,16,48,.35)', transform: `scale(${s})`,
      opacity: (lo.o + (hi.o - lo.o) * k) * (0.6 + 0.4 * p), filter: `blur(${(1 - p) * 6}px)`}}>
      <Img src={staticFile('app-icon.png')} style={{position: 'absolute', left: 34, top: 38, width: 140, height: 140, borderRadius: 34}}/>
      <div style={{position: 'absolute', left: 227, top: 40, font: '600 60px Inter', color: '#fff'}}>New Payment 💰</div>
      <div style={{position: 'absolute', left: 230, top: 124, font: '400 56px Inter', color: '#B8BDC8'}}>{names[i]} just paid $37</div>
    </div>;
  })}</>;
};
```

### 10. Product cards and their state changes · `ui-card`

**What.** A rounded rectangle with a real micro-layout (header, numbers, tags, buttons): dark glass plan cards, white
pricing cards with an active border and glow, persona cards with tag pills, an avatar and a quote in a glass bezel, a social
post card, an agent proposal card with two buttons, list cards that dissolve into a table, a title card that flattens
into a tile grid.

**Job.** The product's concrete offer (a plan, a profile, a result, a proposal); cards are the nouns of the film.

**Numbers.** Radius 0 to 56 (198 for large app-style squares); shadow none to `0 10px 30px rgba(0,0,0,.08)`; entry: a
slide from behind in 8 f with half-step blur, a spring of 25 f, or an expo-out scale 0.9 -> 1 in 12 f; an active-state
glow 140 px radial.

**Presets.**
- *Plans from behind.* The hero plan card first, alone; the side cards start hidden exactly behind it and slide out
  (760, 650, 560, 505, 472, 440, 418 px ...).
- *Active pricing card.* White 420 x 516, a 2 px accent border, the glow a radial gradient from a pale accent tint at
  60 % to transparent 140 px beyond the card; the other cards plain.
- *Persona card.* A white face 495 x 195 (radius 3) in a lilac glass bezel of 8 px with a 10 px glow; a row of three
  black tag pills, an avatar and a quote.
- *Post card.* No shadow; a white header with an avatar disc, a name, a verified badge and a menu; video as the media.
- *Proposal card.* Radius 56, a deep blue fill at 85 % with a light rim; an app icon and name; an inner panel; two
  buttons.
- *List cards.* White, radius 10, shadow `0 2px 6px rgba(0,0,0,0.04)`, five in a centred column; cut in motion zoomed
  x1.17 and settling with `zoomSettle`.

**In / hold / out.** In: a slide from behind, a spring settle, or an expo scale. Hold: a state change (an active border, a
fill, a check, typing). Out: widen into the cut, dissolve into a table, or blur away (0 -> 25 px).

**Rich.** Specific, correct content; a state change on the card; entering from behind another element; half-step motion
blur; one hero card with the others subordinate; glass bezels on dark.

**Cheap.** Three identical cards fading in left to right; tilted cards at rest; cards that bob; heavy shadows; an accent bar
along the side of a small card; text not aligned to a grid inside the card.

```tsx
// Cards that start hidden behind the hero card and slide out: x0 tables + half-step blur; zIndex below the hero.
import React from 'react';
import {spring, useCurrentFrame} from 'remotion';
import {DirBlur, smear, tableAt} from './items-kit';
const FREE = [[0,760],[1,650],[2,560],[3,505],[4,472],[5,440],[6,418],[7,404],[8,397]];
const PLUS = [[0,900],[1,1000],[2,1067],[3,1110],[4,1137],[5,1145],[6,1152],[7,1160],[8,1163]];
export const SideCard: React.FC<{rows: number[][]; children: React.ReactNode}> = ({rows, children}) => {
  const f = useCurrentFrame(); const [x] = tableAt(rows, f); const b = smear(rows, f);
  return <><DirBlur id={`sc${rows[0][1]}`} x={b} y={0}/>
    <div style={{position: 'absolute', left: x, top: 353, width: 358, height: 481, borderRadius: 26, zIndex: 1,
      background: 'rgba(255,255,255,.035)', border: '1.5px solid rgba(255,255,255,.18)', backdropFilter: 'blur(14px)',
      filter: b > 1 ? `url(#sc${rows[0][1]})` : undefined}}>{children}</div></>;
};
// Spring settle of a zoomed-in list: s = 1.17 -> 1.0 with stiffness 120, damping 18, mass 1
const settle = (f: number, fps: number) => 1.17 - 0.17 * spring({frame: f - 575, fps, config: {stiffness: 120, damping: 18, mass: 1}});
```

### 11. Photos as physical cards · `photo-card`

**What.** Photos with a radius (sometimes a thin coloured frame) that are dealt, stacked, scattered into a collage, shrunk
into a card on paper, burst out of a folder into a grid, or spun onto a pile. Placeholders resolve into pictures.

**Job.** Abundance (all your content), memory, the raw material the product works on.

**Numbers.** A deal every 8 f at 60 fps (a quarter beat); radius 10-28; frame 3-4 px; prints rotated -4 to +4 degrees
(physical prints only; UI cards never rotate at rest); collage growth x2.1 in 18 f; placeholder -> picture in 5 f.

**Presets.**
- *Dealt on quarter beats.* One card at -3 degrees, then a new card on top every 8 frames (60 fps), each through a 2-3
  frame blocky dissolve.
- *Framed collage.* Six photo cards with 4 px pastel frames (radius about 28, a thin white inner border) around a central
  large card, words flanking it.
- *Collage to icon.* 4-5 overlapping, slightly rotated photo cards and pale UI chips appear where a ring closed, starting
  as pastel gradient maps, grow, then shrink into the app icon (`app-icon`).
- *Picture to card on paper.* The full picture shrinks to 0.94 inside a paper-white frame with a narrow window showing the
  next picture, then snaps into a card.
- *Floating collage.* Seven cards slide in from the right with blur, decelerate over about 280 px, then each drifts at its
  own rate (parallax 1-3 px per frame).
- *Results grid.* Four columns; each card starts as a dark tinted placeholder and brightens to its picture over 5 frames in
  reading order.

**In / hold / out.** In: a deal (a 2-3 f pixel dissolve), a slide with blur and an expo-out, a burst up then a fall. Hold:
parallax 1-3 px per frame inside a camera-led drift, or flips on beats. Out: shrink into an icon, accelerate up with a
40 px blur, snap into a card on paper.

**Rich.** Real, well-chosen photographs with one grade; placeholders resolving; a collage that becomes an object; dealing on
the beat; gravity-like falls into a grid.

**Cheap.** Random stock photos with different colour casts; photos drifting aimlessly; drop shadows on every card; rotations
on UI cards.

```tsx
// Deal on beats + pixel dissolve: render the new photo through a mask of 16 px blocks that switch on over 3 frames (seeded order).
import React from 'react';
import {Img, random, staticFile, useCurrentFrame} from 'remotion';
import {seeded} from './items-kit';
export const DealtStack: React.FC<{deals: number[]; srcs: string[]; box: number[]}> = ({deals, srcs, box}) => {
  const f = useCurrentFrame(); const [x0, y0, x1, y1] = box; const W = x1 - x0, H = y1 - y0;
  return <>{deals.map((d, i) => {
    if (f < d) return null;
    const t = (f - d) / 3;                                         // 0..1 over 3 frames
    const cols = Math.ceil(W / 16), rows = Math.ceil(H / 16);
    const mask = t >= 1 ? undefined : Array.from({length: cols * rows}, (_, k) => k).filter((k) => random(`d${i}-${k}`) < t)
      .map((k) => `${(k % cols) * 16}px ${Math.floor(k / cols) * 16}px`);
    return <div key={i} style={{position: 'absolute', left: x0, top: y0, width: W, height: H, borderRadius: 24, overflow: 'hidden',
      WebkitMaskImage: mask ? 'linear-gradient(#000,#000)' : undefined, WebkitMaskSize: '16px 16px',
      WebkitMaskPosition: mask?.join(','), WebkitMaskRepeat: 'no-repeat'}}>
      <Img src={staticFile(srcs[i])} style={{width: '100%', height: '100%', objectFit: 'cover'}}/>
    </div>;
  })}</>;
};
// (For many blocks, draw the dissolve on a <canvas>: drawImage per revealed block; cheaper than CSS mask lists.)
```

### 12. Many cards arranged in space · `card-ring`

**What.** N cards on a circle or cylinder (or a flat cover-flow row with depth by size), rotating or travelled by the
camera; near cards large and sharp, far cards small, darker and blurred. Motion recipes in `animations.md` `orbit` and
`deal-pile`.

**Job.** "All of it, in one place": the library; a ring collapsing says everything converges into the product.

**Numbers.** 5 to 96 visible cards; about 4 px per frame at the centre of a cylinder; depth cues: size 1.0 -> 0.6,
darkening, blur 0-6 px; a cover-flow hero growing 1.0 -> 1.25.

**Presets.**
- *Cylinder carousel.* A ring of 9:16 video cards seen from outside, turning left; three full and two partial cards in
  view (about 254-262 x 450-464 px, the centre card tallest).
- *Hundred-card ring.* 96 stills on a ring in a 3D canvas, the camera moving axial -> side -> dive.
- *Cover-flow.* The hero poster slides in smeared, settles right of centre and grows 1.0 -> 1.25 while seven cards slide
  out from behind it.
- *Strip to ring.* Follow the leader: the rightmost tile leads, rising and curving left over the top, the others follow,
  so the row bends into a ring that spins and then implodes.
- *Orbiting tiles.* Logos on frosted tiles orbit a glass dome; front tiles move right, back tiles left; depth of field by
  depth; built as camera-facing sprites.

**In / hold / out.** In: a strip curls into a ring, or a hero slides in while the others slide out from behind. Hold: a
constant spin. Out: a dive through, an implosion, a collapse into an object.

**Rich.** Many distinct real images; correct perspective (outer edges shorter); a stepped clock for a filmic cadence; one
story move for the ring (a dive, a curl, an implosion).

**Cheap.** Six identical placeholders spinning forever; CSS 3D with backface artefacts; no depth cue; a carousel that only
loops.

```tsx
// Cylinder carousel without WebGL: each card's x on screen = R*sin(theta), scale and darkening by cos(theta); perspective skew by
import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
// a CSS rotateY(theta) inside perspective(2400px). 12 fps stepped clock.
export const Cylinder: React.FC<{srcs: string[]; R: number; pxPerFrame: number}> = ({srcs, R, pxPerFrame}) => {
  const frame = useCurrentFrame(); const q = Math.floor(frame * 12 / 30) * 30 / 12;
  const step = (2 * Math.PI) / srcs.length; const rot = (q * pxPerFrame) / R;     // arc length -> angle
  return <AbsoluteFill style={{perspective: 2400}}>
    {srcs.map((s, i) => {
      const th = i * step - rot; const c = Math.cos(th); if (c < 0.15) return null;
      return <Img key={i} src={staticFile(s)} style={{position: 'absolute', left: 960 + R * Math.sin(th) - 129, top: 576, width: 258,
        height: 464, borderRadius: 6, objectFit: 'cover', transform: `rotateY(${-th}rad)`, filter: `brightness(${0.55 + 0.45 * c})`, zIndex: Math.round(c * 100)}}/>;
    })}
  </AbsoluteFill>;
};
```

### 13. Pills and chips · `pill-chip`

**What.** A capsule (radius = h / 2) with a label and optionally an icon or check. Families: a keyword chip hopping from word
to word, signal chips that type on and connect, floating benefit pills, a dense pill grid, glowing category pills racing
sideways, status and stat pills on cards, tag pills on persona cards, a label cloud, marquee rows with one selected pill,
pills flying in and landing as chips that orbit.

**Job.** Keywords, categories, states; a hopping chip is a reading cursor; a pill -> dot -> waveform chain links scenes.

**Numbers.** Height 33 (@720), 40, 106, 130, 190 px; outline 1-3 px; a fill sweep in 9-10 f; a collapse to a dot in 16 f;
floating pills about 40 f apart, type-on chips 2-4 f apart.

**Presets.**
- *Hopping keyword chip.* The first chip fades in while sliding left about 21 px per frame (alpha 0.15, 0.3, ... over
  15 f), sits under one word, then hops to the next word; its fill sweeps in 9-10 f.
- *Signal chips.* Six white chips pop in near points of a star field, each typing its label while its pill grows to fit;
  each new chip joined to the previous one by a thin curve that draws on.
- *Soft benefit pills.* 360-520 x 130 (radius 65), fill `#F3F3F6`, a soft shadow (blur 30, offset 10), a rounded
  geometric sans label in a mid grey; they float in one by one.
- *Pill grid on dark.* Rows 143 px apart, pills 106 px tall, a 2 px muted violet outline, labels 30 px in a lighter
  muted violet; a few filled accent pills with checks.
- *Racing category pills.* Height about 190, radius 95, a dark translucent fill at 70 %, a 3 px glowing accent outline
  with a 12 px outer glow, white bold labels; three rows racing (see `animations.md` `marquee`).
- *Status pill.* White 268 x 40, radius 20, a green check circle, a medium-weight label and a document icon; it flips
  from an "adding" state to "added".

**In / hold / out.** In: a type-on growth, a fly-in and land, or a fade and slide. Hold: racing or a marquee with depth.
Out: a collapse to a dot, scale to 0 one by one, a swing into a ring.

**Rich.** The label typing as the pill grows; fills that sweep; a chip that clips its word; radius always h / 2; depth blur
on rows; pills that become something (a dot, a waveform, a card, a ring).

**Cheap.** A row of pills fading in one after another; mismatched heights; wobbling pills; pills with emoji; too many
colours.

```tsx
// Pill that grows to fit its typed label: width = rendered width of the visible string + padding; text clipped by the pill.
import {measureText} from '@remotion/layout-utils';
import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {ez} from './items-kit';
export const TypePill: React.FC<{text: string; at: number; x: number; y: number; perFrame?: number}> = ({text, at, x, y, perFrame = 1}) => {
  const f = useCurrentFrame(); if (f < at) return null;
  const n = Math.min(text.length, Math.floor((f - at) * perFrame) + 1); const vis = text.slice(0, n);
  const w = measureText({text: vis, fontFamily: 'Poppins', fontSize: 15, fontWeight: '500'}).width + 32;
  const pop = ez(f, at, at + 6, 0.6, 1, Easing.out(Easing.back(1.4)));
  return <div style={{position: 'absolute', left: x, top: y, height: 34, width: w, borderRadius: 17, background: '#fff',
    transform: `scale(${pop})`, transformOrigin: 'left center', overflow: 'hidden', font: '500 15px Poppins', lineHeight: '34px', paddingLeft: 16}}>{vis}</div>;
};
// Chip that clips its word and collapses to a dot
const COLLAPSE = [[0,700,473,1220,595],[2,709,476,1211,593],[4,725,480,1195,590],[6,754,486,1166,585],[8,801,497,1119,576],
  [10,860,510,1060,565],[12,905,521,1015,557],[14,933,527,987,553],[15,941,533,978,546],[16,953,533,967,547]];
// <div style={{clipPath: `inset(${y0}px ${1920-x1}px ${1080-y1}px ${x0}px round ${(y1-y0)/2}px)`}}> black word </div> + grey copy outside fading 3 f
```

### 14. Buttons that get pressed · `button`

**What.** A send disc or a call-to-action pill with a gradient and a top highlight; pressed by a cursor (or on the beat by
itself), it shrinks in 2-5 frames, releases with or without an overshoot, and its press causes the next scene (a zoom into
it, a porthole, a fill, a morph). Press acting in `animations.md` `press-click`.

**Job.** Commit: the moment the user hands over to the product.

**Numbers.** Press depth to 47 %, 80 % or 90 % of the size; press 1-5 f; release 3-6 f with no overshoot, or the `click`
spring; glow 24 px; gradients light at the top to dark at the bottom, or light left to dark right.

**Presets.**
- *Send to porthole.* A round send button (r 188) with a gradient `#93C5F8` (left / bottom) -> `#4084EB` (right) and a
  white 16 px up-arrow; pressed, it becomes a porthole that grows between two words.
- *Publish pill.* 596 x 212, radius 106, `linear-gradient(180deg, #7CD3FF 0%, #45A6F7 55%, #2E7DEB 100%)`, a 2 px white
  inner top highlight, a 24 px blue glow.
- *Spring-back press.* Diameter 34, 28, 16, 27, 31, 33 px over 6 frames (no overshoot); the field then fills with a moving
  gradient.
- *Button flight.* The button's centre x 1863 -> 1170 over 18 f on `cubic-bezier(0.187, 0.876, 0.421, 0.986)` (see
  `animations.md` `arc-flight`).
- *Icon button.* 246 x 246, radius 44, fill `#4A484B`, a white 6 px outline glyph; scales up 0.78 -> 1.0 cubic-out over
  9 f.
- *Gradient small button.* 171 x 49, radius 8, a horizontal warm gradient, a semibold 18 px label in near-white.

**In / hold / out.** In: scale 0.78 -> 1 cubic-out, or a camera push into it. Press: a 2-5 f shrink. Out: drain, morph,
zoom-through.

**Rich.** Scale (a button filling the frame); a press with real depth; a consequence that grows out of the button; a light
top highlight and a soft coloured glow.

**Cheap.** A hover colour change and nothing else; a default flat button; a press with a bounce on every button.

```tsx
// button.tsx
import React from 'react';
import {Easing, interpolate, useCurrentFrame} from 'remotion';
import {C, ez} from './items-kit';
export const SendDisc: React.FC<{cx: number; cy: number; r0: number; pressAt: number}> = ({cx, cy, r0, pressAt}) => {
  const f = useCurrentFrame();
  const r = interpolate(f, [pressAt, pressAt + 5], [r0, r0 * 151 / 188], {...C, easing: Easing.out(Easing.quad)});
  const drain = ez(f, pressAt + 19, pressAt + 23, 0, 1, Easing.inOut(Easing.quad));      // white rises from the bottom
  return <div style={{position: 'absolute', left: cx - r, top: cy - r, width: 2 * r, height: 2 * r, borderRadius: '50%', overflow: 'hidden',
      background: 'linear-gradient(60deg,#93C5F8,#4084EB)'}}>
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: `${drain * 100}%`, background: '#fff'}}/>
    <svg viewBox="-10 -10 20 20" style={{position: 'absolute', inset: '25%'}}><path d="M0 7V-7M-6 -1L0 -7L6 -1" stroke="#fff"
      strokeWidth={2.1} fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
  </div>;
};
// Outside-in label reveal: order of letter indices and their first frames; each fades over 2 f at its final position.
const ORDER: [number, number][] = [[0, 939], [6, 939], [1, 942], [5, 943], [2, 945], [4, 947], [3, 949]];   // P u b l i s h
```

### 15. A toggle that flips the film's state · `toggle`

**What.** A track and a knob; the flip changes the colour of the whole scene (wordmark, pills, a content vignette) on the
same frame.

**Job.** Before and after in one gesture; the product switched on.

**Numbers.** Track 192-263 px wide, knob 92-116 px; the flip takes 1-6 f; the scene's colour changes on the flip frame; a
vignette flash peaking at 0.535 coverage in 2 f and settling at 0.32.

**Presets.**
- *Soft relief toggle, off.* A white pill `#FAFAFC` with an outer shadow (blur 24, offset 8) and an inner top highlight; a
  blue knob on the left.
- *On without sliding.* The knob dissolves on the left while the track tints lavender over 5 f; then the track snaps to a
  deep blue `#2031B1` and a white knob fades in on the right; the scene follows on the same frame.
- *Glass toggle.* A 1.5-2 px white outline, a dark transparent fill over a ring of light; it slides in with an overshoot.
- *Slide to answer.* A translucent pill (`#3A3A3A` at 70 %, radius 42), a white 80 px knob with a green phone glyph, a
  serif label in grey with a dark shimmer (`effects.md` `status-shimmer`).

**In / hold / out.** In: a rise on an expo-out. Flip: a 6 f tint and a 1 f snap. Out: the pills and the scene follow the
new state.

**Rich.** The whole frame responding to the flip; subtle relief; no slide (a cut-state flip reads as a decisive switch).

**Cheap.** A phone-style toggle sliding with a bounce while nothing else changes.

```tsx
import React from 'react';
import {AbsoluteFill, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {C} from './items-kit';
export const BigToggle: React.FC<{flipAt: number}> = ({flipAt}) => {
  const f = useCurrentFrame(); const t = f - flipAt;               // flipAt = 884
  const tint = interpolate(t, [0, 5], [0, 1], C); const on = t >= 6;
  const vig = interpolate(t, [6, 8, 10, 12, 14], [0.11, 0.535, 0.42, 0.35, 0.32], C);
  return <>
    <div style={{position: 'absolute', left: 1070, top: 482, width: 192, height: 116, borderRadius: 58,
      background: on ? '#2232B5' : interpolateColors(tint, [0, 1], ['#FAFAFC', '#D9DCF5']),
      boxShadow: on ? 'none' : '8px 8px 24px #D8D9E6, inset 0 2px 0 #fff'}}>
      <div style={{position: 'absolute', top: 12, left: on ? 88 : 12, width: 92, height: 92, borderRadius: '50%',
        background: on ? '#fff' : '#1F2BAD', opacity: on ? Math.min(1, t - 5) : 1 - tint}}/>
    </div>
    {t >= 6 && <AbsoluteFill style={{pointerEvents: 'none', opacity: vig / 0.535,
      background: 'radial-gradient(500px 500px at 0 0,#A2AAE7,transparent),radial-gradient(500px 500px at 100% 100%,#A2AAE7,transparent)'}}/>}
  </>;
};
```

### 16. Numbers that move · `counter`

**What.** A big numeral that counts, or a small live counter inside UI; counts are per-frame table lookups (never timers),
often linear while the camera moves. Counting rules in `animations.md` `counter-cut`.

**Job.** Magnitude and proof (how many users, how much saved).

**Numbers.** Counting 30-40 f (40 f for +5,839 tokens; 32 f for prices); numeral cap 150 px, a 62 px price; tabular
figures always; a linear count under an eased camera.

**Presets.**
- *Numeral in a card.* On a deep green ground, a column of identical rounded-square cards (838 x 838, radius about 198, a
  2 px pale green outline, no fill) each holding one numeral; the column scrolls as the number climbs.
- *Token counter in an editor.* The count grows with each turn card (11,823 -> 17,662 over 40 f) while the headline lands
  on a marker block.
- *Priced table.* Prices count up linearly while the camera slowly pulls back (zoom 1.0 -> 0.919 on a quart-in).
- *Ranking numerals.* Row numerals 1 gold, 2 silver, 3 bronze, then grey serif numerals, rows 122 px apart, built row by
  row from the bottom.
- *Pixel numerals.* A price as a pixel bitmap with 65 px cells, revealed by a mosaic.

**In / hold / out.** In: scroll into view, or cut on. Count: linear, from a table. Out: accelerate away.

**Rich.** Tabular figures that never jitter; a counter inside a real UI; counting synced to a camera move; a numeral given a
container (a giant card) so it is an object.

**Cheap.** A counter in the middle of an empty frame easing out to a round number; proportional digits jittering in width.

```tsx
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C} from './items-kit';
export const Count: React.FC<{from: number; to: number; f0: number; f1: number; fmt?: (n: number) => string}> =
  ({from, to, f0, f1, fmt = (n) => Math.round(n).toLocaleString('fr-FR')}) => {        // "11 823" uses a thin space group
  const f = useCurrentFrame(); const v = interpolate(f, [f0, f1], [from, to], C);         // linear
  return <span style={{fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum"'}}>{fmt(v)}</span>;
};
// Numeral card column: one column of 838 px rounded squares, pitch 909, y from the per-frame table.
const SCROLL = [[0,471],[1,403],[2,351],[3,311],[4,280],[5,256],[6,237],[8,207],[10,186],[14,160],[18,144],[22,130],[24,121],[26,106],[27,92]];
```

### 17. Data graphics that build · `chart`

**What.** One chart that animates its own construction and carries one number: a thick bar shooting in over a grey bar with
a sweep marking the gain; a smooth line drawing in steps under a sentence; a mirrored bar waveform stepping one column per
frame; a row of glowing dots spiking like a voice meter; a waveform in a voice pill; widgets cut on at 107 %; a 10 x 10
grid of squares.

**Job.** The measurable win; also the sound of a voice product made visible.

**Numbers.** A bar shoots in over 30 f with exponential decay (806 -> 1500 px); a line draws over 19 f in 1-frame steps; a
waveform steps one column per frame; spikes live 2-3 f; dot pitch 24-25 px; glow halo 0.06.

**Presets.**
- *Gain bar.* A thick horizontal accent bar with a fully rounded right end and no visible left end (its gradient fades into
  the ground), over a grey bar for the old value; a sweep marks the gain.
- *Line under a sentence.* At night with a strong floor glow, a centred two-line sentence builds word by word; then a
  smooth line chart draws in from the bottom-left in one continuous stroke.
- *Stepping waveform.* 28 vertical bars 45.5 px wide on a fixed grid, each mirrored about the centre line, the heights
  stepping one column per frame.
- *Level-meter dots.* A white pill becomes a 14 px dot that blooms into a row of glowing rounded bars (8 px wide, 10-12 px
  tall, 25 px pitch) that spike like a voice.
- *Voice pill.* 60 bars 3 px wide on a 7 px pitch, heights 8-62 px, in the accent, beside a 64 px play disc and a time
  label.
- *Square grid.* 10 x 10 squares 47 px on a 57.7 px pitch, in the accent, entering translated and scaled 1.06 -> 1.00.

**In / hold / out.** In: shoot in with exponential decay, step, or bloom from a dot. Hold: spikes, glints. Out: collapse
into a pill.

**Rich.** Gradients that fade into the ground (no visible left end); glow on dark; construction steps synced with camera
pushes; one annotated number; small data glints.

**Cheap.** Grid lines, axes and legends everywhere; rainbow series; all bars growing at once on an ease-out; 3D pie charts.

```tsx
// Stepping waveform: heights are a pure function of (frame, column): h(f, c) = H(f - c) + jitter(f, c), where H is the
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
// recorded envelope sampled at "time since this shape entered column 0". Deterministic and exact to the mechanism.
const H = (t: number) => t < 0 ? 0 : 40 + 110 * Math.abs(Math.sin(t * 0.37)) * (0.6 + 0.4 * Math.sin(t * 0.11));
export const StepWave: React.FC = () => {
  const f = useCurrentFrame();
  return <svg width={1276} height={720}>{Array.from({length: 28}, (_, c) => {
    const h = Math.max(2, H(f - c) + (random(`w${f - c}-${c}`) - 0.5) * 24);
    const x = c === 0 ? 0 : 44.5 + 45.5 * (c - 1);
    return <rect key={c} x={x} y={360 - h} width={45.5} height={2 * h} fill={`url(#wg${c % 4})`}/>;
  })}</svg>;
};
// Orange bar with no left end: a div whose background is a stop list taken from its right end.
const barBg = 'linear-gradient(90deg, #000 0, #602307 300px, #80300A 500px, #9D3B0D 700px, #BD450F 900px, #DB5112 1110px, #E75516 1200px)';
```

### 18. Lists, tables, boards that build or reorganise · `data-list`

**What.** A list, table or board whose rows are added from one end, dragged between columns, checked, priced, or dissolved
from cards into a table; the camera usually follows the dragged item.

**Job.** Order out of chaos: "it organises your work".

**Numbers.** A row every 2-8 f; a drag of 18 f, fast, with a pan; a glow swelling over 14-16 f, then holding; rows fading
in over 3-5 f; a carousel stepping one item at a time.

**Presets.**
- *Built from the bottom.* A ranking list built row by row from the bottom (never a scroll over a finished list); rows
  122 px apart with 93 px icons.
- *Board drag.* A card held tilted in its column while being dragged (the only legitimate tilt: in the hand), dragged fast
  into the next column with a pan, landing flat; a glow pool swells under it.
- *Cards to table.* Five list cards get accent check marks one by one; then the card fills fade, the icons fly out and the
  text slides into the table's columns while prices count up.
- *Calendar fill.* Events appear one by one in a day column (sliding in from 40 px left and fading over 5 f); later tasks
  slide in from the right and push the earlier events aside.
- *Format carousel.* A white list card (radius 16) beside a 178 px icon tile; the list scrolls up one item per step.
- *Sheet tag.* A tag dragged by a hand cursor into a cell; coloured cells multiply across the sheet; a scribble marks the
  result.

**In / hold / out.** In: rows from one end, or cut-on rows. Hold: a drag and a glow. Out: dissolve into the next structure.

**Rich.** Official icons, real names and prices, a glow that marks the state change, reorganisation instead of appearance.

**Cheap.** A complete table fading in; zebra rows; tiny unreadable text; a list scrolling with no landing.

```tsx
// Row-by-row from the bottom: row i is visible from at[i]; existing rows shift up one pitch on each arrival (expo-out 6 f).
import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {ez} from './items-kit';
export const BuildUpList: React.FC<{rows: React.ReactNode[]; at: number[]; bottom: number; pitch?: number}> = ({rows, at, bottom, pitch = 122}) => {
  const f = useCurrentFrame();
  return <>{rows.map((r, i) => {
    if (f < at[i]) return null;
    const lift = at.filter((a, j) => j > i && f >= a).reduce((acc, a) => acc + ez(f, a, a + 6, 0, pitch), 0);
    const enter = ez(f, at[i], at[i] + 6, 30, 0);
    return <div key={i} style={{position: 'absolute', left: 0, right: 0, top: bottom - pitch - lift + enter,
      opacity: ez(f, at[i], at[i] + 3, 0, 1, Easing.linear)}}>{r}</div>;
  })}</>;
};
// Glow swell under a dropped card: radial glow behind the card, 0 -> 1 over 14 f, then hold.
const dropGlow = (f: number, at: number, rgb: string) => ({boxShadow: `0 24px 80px rgba(${rgb},${0.55 * ez(f, at, at + 14, 0, 1)})`});
```

### 19. Agent steps and checklists · `checklist-row`

**What.** Rows that appear in order, each with a spinner that resolves into a check; or code or list lines that receive a
coloured bar and a check; or to-do rows typing in parallel.

**Job.** Competence and progress; an accelerating series of checks feels like momentum.

**Numbers.** A row every 5-16 f (accelerating, for example 15, 10, 5 f); a spinner at 30 degrees per frame; spinner to check
in 5-11 f; a bar grows in 4 f; a row fades in over 3 f.

**Presets.**
- *Thinking checklist.* Rows in `#3A3A3A` (about 20 px cap) beside a vertical 2 px `#E5E5E5` rail; each row appears with a
  spinner that turns into a check, the intervals shrinking.
- *Check bars on code.* A horizontal gradient bar behind a code line, from the gutter to about 65 % of the line width;
  green bars on the passing lines, one red line that gets fixed.
- *Parallel to-dos.* Four to-do rows (40 x 40 rounded checkboxes, 2 px outline, 24 px labels) type in parallel at one
  character every 1.5-2 frames, then check off.
- *Agent log.* Rows in an 18 px sans with 18 px line icons on a 1 px timeline, small tag chips right-aligned.
- *Steps under a shimmer.* Rows appear every 6-9 f under a shimmering thinking label.

**In / hold / out.** In: a 3 f fade from grey to ink. Hold: the spinner. Resolve: the check cuts on.

**Rich.** Real step names; an accelerating cadence; one failure that gets fixed; icons on a timeline rail.

**Cheap.** A generic loading label with a spinner; all checks at once; bouncing green ticks.

```tsx
import React from 'react';
import {interpolateColors, useCurrentFrame} from 'remotion';
export const StepRow: React.FC<{label: string; at: number; doneAt: number; y: number}> = ({label, at, doneAt, y}) => {
  const f = useCurrentFrame(); if (f < at) return null;
  const ink = interpolateColors(Math.min(f - at, 3), [0, 3], ['#C8C8C8', '#3A3A3A']);
  return <div style={{position: 'absolute', left: 250, top: y, display: 'flex', alignItems: 'center', gap: 26, font: '400 28px Inter', color: ink}}>
    {f < doneAt
      ? <svg width={36} height={36} style={{transform: `rotate(${(f - at) * 30}deg)`}}><circle cx={18} cy={18} r={14} fill="none"
          stroke="#9A9A9A" strokeWidth={3} strokeDasharray={`${0.75 * 88} 88`} strokeLinecap="round"/></svg>
      : <svg width={36} height={36}><path d="M8 19l7 7 13-15" fill="none" stroke="#3A3A3A" strokeWidth={3} strokeLinecap="round"/></svg>}
    <span>{label}</span>
  </div>;
};
// <StepRow label="Reading the brief" at={0} doneAt={11} y={546}/> ... (16,23) (26,31) (31,36)
```

### 20. Avatars and people discs · `avatar`

**What.** A circular photo or an illustrated mascot: a white circle with the mascot growing between words; a photo circle
with a translucent rim and the name inside, chips orbiting on a ring with depth blur; glass spheres with glossy busts that
orbit each other; a pop-in 0 -> 1.08 -> 1 above a card; header discs on cards; coin avatars flying into slots.

**Job.** Who it is for; the user at the centre of the signals.

**Numbers.** Diameter 54-326 px (a ring hub), up to the full frame; a translucent rim of 12 px; a ring spin decaying 3.8 ->
0.66 degrees per frame; a pop overshoot of 8 %; an orbit half-turn every 50 f.

**Presets.**
- *Avatar ring.* A photo circle (r 163) with a 12 px translucent pink-white rim; the name inside under the face; chips on a
  ring around it, defocused by position (`orbit-rings`).
- *Mascot in the gap.* A small white circle with the mascot appears in a word gap and grows with an accelerating zoom,
  pushing the words apart, until it fills the frame.
- *Glass bubbles.* A glass sphere tinted at its rim, translucent white in the middle, holding a glossy bust; bubbles orbit
  each other.
- *Pop above a card.* The person's photo pops above her ring icon, scale 0 -> 1.08 -> 1 over 8 f, while markers grow
  behind her name (`marker-block`).
- *Header discs.* A 54 px disc with a small verified badge; a 74 px gradient disc (teal -> blue) with white initials.

**In / hold / out.** In: a pop 0 -> 1.08 -> 1 in 8 f, a growth in the gap, or a swing from a tilt. Hold: a ring spin. Out:
a push through.

**Rich.** A real portrait, well cropped; a rim light; the avatar as a hub that organises other items; depth blur by
position.

**Cheap.** Grey silhouette placeholders; initials everywhere; avatars bouncing in a row.

```tsx
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
import {ez} from './items-kit';
export const AvatarRing: React.FC<{src: string; chips: string[]; f0: number}> = ({src, chips, f0}) => {
  const f = useCurrentFrame(); const t = f - f0;                            // f0 = 383
  const w = 3.8 * Math.exp(-Math.max(0, t - 7) * 0.0495) ;                   // 3.8 deg/f at +7 -> 0.66 at +42
  const ang = Array.from({length: Math.max(0, t)}, (_, k) => 3.8 * Math.exp(-Math.max(0, k - 7) * 0.0495)).reduce((a, b) => a + b, 0);
  const tilt = ez(f, f0, f0 + 9, 1, 0);
  return <div style={{position: 'absolute', left: 637, top: 360, transform: `perspective(1600px) rotateX(${45 * tilt}deg) rotateZ(${-20 * tilt}deg)`}}>
    <div style={{position: 'absolute', left: -290, top: -290, width: 580, height: 580, borderRadius: '50%', border: '1.2px solid rgba(255,255,255,.7)'}}/>
    <Img src={staticFile(src)} style={{position: 'absolute', left: -163, top: -163, width: 326, height: 326, borderRadius: '50%',
      boxShadow: '0 0 0 12px rgba(255,230,255,.45)', objectFit: 'cover'}}/>
    {chips.map((c, i) => { const a = ((i * 60 + ang) * Math.PI) / 180;
      return <div key={i} style={{position: 'absolute', left: 290 * Math.cos(a), top: 290 * Math.sin(a), transform: 'translate(-50%,-50%)',
        filter: `blur(${4 * Math.pow(Math.abs(Math.sin(a)), 6)}px)`, background: '#fff', borderRadius: 14, padding: '6px 12px', font: '500 13px Poppins'}}>{c}</div>; })}
  </div>;
};
```

### 21. Photos turned into graphics · `treated-portrait`

**What.** A photo processed in code: luminance -> a glyph grid; luminance -> an animated colour table (a gradient map); a
gradient map with faces kept in true colour inside detection boxes; an edge or contour filter; a ring-dot dither. Colour
recipes in `effects.md` `develop` and `halftone-screens`.

**Job.** "It understands people and data"; the brand colour on any photo.

**Numbers.** Glyph cell 9.9 x 14 px; colour tables of 3 stops; map transitions 2-3 f; a fill wipe of 20 f.

**Presets.**
- *0 / 1 portrait card.* A white card fills with an ASCII portrait in the accent from the bottom up over 30 f (built as a
  glyph grid masked by a vertical gradient).
- *Animated gradient map.* A blurred greyscale portrait -> luminance -> a 3-stop colour table whose stops move per frame
  between sampled palettes.
- *Faces in true colour.* Footage pushed into a gradient map per category while the faces stay true colour inside thin
  white detection boxes, each with a small typed label card.
- *Contour look.* `feColorMatrix` greyscale -> `feConvolveMatrix` edges -> a threshold: dark 3-4 px outlines around light
  silhouettes; small accent dots on heads grow in.
- *Duotone flash.* `feColorMatrix` saturate 0, then `feComponentTransfer` tables from a deep plum to magenta to pink,
  cross-faded per frame; or a 12 px ring-dot dither.

**Motion.** A fill wipe, a per-frame table, a 2-3 f cross-fade.

**Rich.** One palette across every treated picture; a mechanism tied to the product (detection = understanding); animated
maps.

**Cheap.** A CSS hue-rotate on a stock photo; a duotone that kills faces; filters that flicker.

```tsx
// Gradient map with per-frame stops (SVG): luminance -> 3-stop table (dark, mid, light), each stop interpolated from samples.
import React from 'react';
import {Img, staticFile, useCurrentFrame} from 'remotion';
export const GradientMap: React.FC<{src: string; stops: (f: number) => [string, string, string]}> = ({src, stops}) => {
  const f = useCurrentFrame(); const [d, m, l] = stops(f).map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255));
  const tv = (k: number) => `${d[k]} ${m[k]} ${l[k]}`;
  return <><svg width={0} height={0}><filter id="gmap"><feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncR type="table" tableValues={tv(0)}/><feFuncG type="table" tableValues={tv(1)}/><feFuncB type="table" tableValues={tv(2)}/></feComponentTransfer>
  </filter></svg><Img src={staticFile(src)} style={{width: '100%', filter: 'url(#gmap) blur(2px)'}}/></>;
};
// ASCII portrait: precompute the 52x33 luminance grid once (node script on the photo) -> JSON; render <text> per cell.
```

### 22. Footage inside a shape, graded plates · `video-panel`

**What.** A mask (a stadium, a rounded rect, a panel grid) showing a full-frame clip that does not rescale while the window
changes size; or a graded photo or footage plate as a world, with one designed camera move and annotations on top.

**Job.** The real world the product serves; footage means authenticity.

**Numbers.** A window opens over 22 f on an expo-out and closes over 10 f on an expo-in; panel radius 30-50; a plate push of
2-12 % per shot; grade saturation 0.13-1.

**Presets.**
- *Stadium window.* A stadium of fixed height 739 px centred in frame clipping a video; its width grows 944, 1064, 1139,
  1191, 1228, 1255, 1277, 1294, 1308 px ... (an expo-out), the clip itself never scaling.
- *Six panels.* 608 x 343 panels (radius 50) in two rows of three with an outlined pill between the rows; each panel a
  clip in its own gradient map (`treated-portrait`).
- *Windows onto clips.* Panels are `overflow: hidden` windows onto full-frame clips; moving the crossing point resizes the
  windows without rescaling the clips; a zoom-through takes one window to full frame.
- *Black screen over footage.* A black rounded screen (radius 30, a 3 px off-white rim) rises about 30 px over misty
  footage; result cards spin in and pile on it.
- *Plate move.* A photo plate pulls back 1.000 -> 0.888 on a quad-out over 57 f and drifts 20 px left, then holds while the
  lockup carries the motion.

**Motion.** Window widths from a table; plates get one purposeful push or pull per shot.

**Rich.** One grade on every plate; windows whose shape continues the previous element; annotations on footage; the
footage's own cadence kept.

**Cheap.** Full-frame stock video under centred text; mismatched colour casts; a slow zoom on every photo.

```tsx
import React from 'react';
import {AbsoluteFill, OffthreadVideo, staticFile, useCurrentFrame} from 'remotion';
import {tableAt} from './items-kit';
const PILL_W = [[90,944],[91,1064],[92,1139],[93,1191],[94,1228],[96,1277],[98,1308],[100,1329],[104,1353],[108,1365],[112,1371],
  [118,1371],[120,1367],[122,1357],[124,1340],[126,1309],[127,1284],[128,1247],[129,1182]];
export const PillWindow: React.FC<{src: string}> = ({src}) => {
  const f = useCurrentFrame(); const [w] = tableAt(PILL_W, f); const x0 = 956.5 - w / 2;
  return <AbsoluteFill style={{background: '#F5F1E8'}}>
    <div style={{position: 'absolute', left: x0, top: 168, width: w, height: 739, borderRadius: 369.5, overflow: 'hidden'}}>
      <OffthreadVideo src={staticFile(src)} style={{position: 'absolute', left: -x0, top: -168, width: 1920, height: 1080, objectFit: 'cover'}}/>
    </div>
    {[168, 906].map((y) => <div key={y} style={{position: 'absolute', left: 0, right: 0, top: y, height: 1, background: '#7E7A71'}}/>)}
    {[x0, x0 + w].map((x, i) => <div key={i} style={{position: 'absolute', top: 0, bottom: 0, left: x, width: 1, background: '#7E7A71'}}/>)}
  </AbsoluteFill>;
};
```

### 23. App icons and squircles · `app-icon`

**What.** A rounded square (radius about 25-30 % of its size) with the official icon art; animated by size with an
overshoot, by a tilt during the growth, or by content cross-fades.

**Job.** The product's identity as a tappable thing.

**Numbers.** Growth over 13 f to a peak of 131 % of rest, settling over 12 f; radius 22-34 % of the size; a -8 degree tilt
during the growth only.

**Presets.**
- *Grow with overshoot.* A 61 px rounded square (r 16) grows 61, 81, 101, 117, 137, 153, 169, 185, 191, 197, 205, 213,
  217 px ... past its rest size and settles.
- *Collage into the icon.* A collage shrinks on an ease-in into a white rounded square (240 px, radius 54) whose 3 px
  outline walks from cyan to green, holding a thumbnail of the collage; then the official icon.
- *Blueprint fills in.* A picture becomes a white tile with a blue line drawing of the icon, sliding left 13.6 px per
  frame; the real icon fills in under the drawing.
- *Icon tile.* White, radius 12, 178 px, a black 96 px format glyph, four small accent four-point stars at its corners.

**Motion.** A growth with one 31 % overshoot, a fill-in, a shrink-in.

**Rich.** Official icon art; a blueprint or collage becoming the icon; an overshoot on this one landing only.

**Cheap.** A generic gradient squircle with a letter; icons bouncing in a row.

```tsx
import React from 'react';
import {Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {C, tableAt} from './items-kit';
const GROW = [[0,61],[2,101],[4,137],[6,169],[8,191],[10,205],[12,217],[15,217],[17,209],[19,197],[21,185],[23,173],[25,166]];
export const IconPop: React.FC<{src: string; cx: number; cy: number}> = ({src, cx, cy}) => {
  const f = useCurrentFrame(); const [s] = tableAt(GROW, f);
  const rot = interpolate(f, [588, 593, 598, 604], [0, -8, -8, 0], C);
  return <Img src={staticFile(src)} style={{position: 'absolute', left: cx - s / 2, top: cy - s / 2, width: s, height: s,
    borderRadius: s * 0.26, transform: `rotate(${rot}deg)`}}/>;
};
```

### 24. Line icons that draw on · `line-icon`

**What.** A stroke icon (one family, one stroke weight per film, such as Lucide) that appears by drawing its path, by being
born from a collapsing caption, by popping in a stagger on a ghost grid, or that walks a hue path while it scales.

**Job.** The concept named by the line, drawn.

**Numbers.** Stroke 1.6-10 px at 1080 (about 1/12 of the icon box); a draw-on of 6-7 f; a hue walk of 15 f; pop-in stagger
2-3 f with scale 0.6 -> 1.

**Presets.**
- *Text to icon.* A caption runs a heat-out (dark -> gold -> pale over 4 f) and in 2 frames shrinks to a vertical bar that
  becomes the icon.
- *Born from a stroke.* Two pale arrows slide apart about 150 px on an ease-out while fading 0.8 -> 0; a thin stroke at the
  centre becomes the icon (stroke about 10 px), which then walks a hue path.
- *Field icons.* Small folder-plus, plus, hand and brain icons (stroke 1.6-2) in mid greys inside a prompt box.
- *Rail icons.* White line icons with a 3 px stroke along a side rail, one inside a glass chip.

**Motion.** A draw-on in 6 f (`pathLength` 1, dash offset 1 -> 0); a pop-in stagger 2-3 f with 0.6 -> 1 scale.

**Rich.** One icon family and stroke weight; icons born from other elements; draw-on with round caps.

**Cheap.** Mixed icon sets; filled and outline icons mixed; emoji.

```tsx
import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {ez} from './items-kit';
export const DrawIcon: React.FC<{d: string[]; at: number; dur?: number; stroke?: number; color?: string}> = ({d, at, dur = 6, stroke = 3, color = '#111'}) => {
  const f = useCurrentFrame(); const p = ez(f, at, at + dur, 1, 0, Easing.inOut(Easing.quad));
  return <svg viewBox="0 0 24 24" width={70} height={70}>{d.map((p0, i) => <path key={i} d={p0} pathLength={1} strokeDasharray="1 1"
    strokeDashoffset={p} fill="none" stroke={color} strokeWidth={stroke * 24 / 70} strokeLinecap="round" strokeLinejoin="round"/>)}</svg>;
};
// Lucide "upload": ['M12 3v12', 'M7 8l5-5 5 5', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4']  -> <DrawIcon d={...} at={0}/>
```

### 25. Networks, trees and connectors · `node-graph`

**What.** Nodes (chips, cards, thumbnails, dots) joined by lines that draw on (dash offset), with rounded elbows or bezier
curves; the camera often follows the line from node to node. Draw recipes in `animations.md` `stroke-draw`.

**Job.** Integration, flow of data, organisation.

**Numbers.** Lines 1-3 px (white or dark grey); elbow radius 30; 4-10 f per segment; a whip along a connector 6-10 f with
blur.

**Presets.**
- *Role tree.* A thin stem drops from the top edge at the centre and decelerates; a tiny capsule appears at its end and
  unfolds horizontally into a white role card; branches follow.
- *Connector trunks.* 3 px lines leave each stat pill's right end, run horizontally, turn 90 degrees with a radius of 30
  into a vertical trunk, then into the target panel.
- *Chained chips.* Each new chip joined to the previous one by a thin white curve drawing from the old chip to the new one;
  then the chips swing along curved paths into a ring.
- *Dashed graph.* A caption word, video thumbnails (radius 16, no border or shadow), dashed connector curves and small
  10 px square nodes; the layout enters already moving.
- *Map to ring.* Dots fly along a wide map; labels fade; six thick dashes form a ring and close, turning the accent
  segment by segment.

**Motion.** Draw each edge, then pop the nodes; the camera follows.

**Rich.** Lines drawing from source to target in the order of the story; rounded elbows; the camera travelling the graph;
nodes that are real content.

**Cheap.** A static network diagram; random dots and lines (a plexus); straight lines crossing text.

```tsx
import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {ez} from './items-kit';
export const Connector: React.FC<{pts: [number, number][]; at: number; dur: number; r?: number; color?: string; w?: number}> = ({pts, at, dur, r = 30, color = '#3A3D45', w = 3}) => {
  const f = useCurrentFrame();
  // rounded orthogonal path through pts (quadratic corners of radius r)
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [p, c, n] = [pts[i - 1], pts[i], pts[i + 1]];
    const a = [c[0] - Math.sign(c[0] - p[0]) * r, c[1] - Math.sign(c[1] - p[1]) * r];
    const b = [c[0] + Math.sign(n[0] - c[0]) * r, c[1] + Math.sign(n[1] - c[1]) * r];
    d += ` L${a[0]} ${a[1]} Q${c[0]} ${c[1]} ${b[0]} ${b[1]}`;
  }
  d += ` L${pts[pts.length - 1][0]} ${pts[pts.length - 1][1]}`;
  return <svg style={{position: 'absolute', inset: 0}} width={1920} height={1080}><path d={d} pathLength={1} strokeDasharray="1 1"
    strokeDashoffset={ez(f, at, at + dur, 1, 0, Easing.inOut(Easing.cubic))} fill="none" stroke={color} strokeWidth={w} strokeLinecap="round"/></svg>;
};
```

### 26. Coloured blocks behind words · `marker-block`

**What.** A solid rectangle (or two offset rectangles) behind a word or phrase; it extends as the phrase grows, wipes in from
the left, hops between words, or covers a word as a redaction box.

**Job.** The one word that matters. Use one marker style as a film's signature, not on every line.

**Numbers.** Marker height = the cap height x 1.2-1.6; an offset copy d = (19-93, 5-8) px; it extends in one frame per word;
an erase over 24 f.

**Presets.**
- *Two-layer marker.* Two absolutely positioned blocks in the accent, B = A offset by about (57-93, 5-8) px, the word above
  both; A extends when the next word joins; depth with no shadow.
- *Growing marker.* A marker grows behind a name from its left edge over 20 f; a second marker wipes left to right behind
  an address.
- *Highlight flash.* The word is replaced by a solid blue rectangle for one frame, then a white one, then two highlighted
  fragments.
- *Redaction hop.* A box hops from word to word and swaps the line under it.
- *Corner frame.* A tagline inside four corner marker squares over a warm mesh gradient.

**Motion.** Extend on each word's arrival (a cut), ride the camera, erase through a clip window.

**Rich.** A two-layer offset block; markers that extend instead of fading; an erase through a clip window.

**Cheap.** Highlighter swipes on every line; a marker colour unrelated to the brand.

```tsx
import React from 'react';
import {EXPO_IN, ez} from './items-kit';
export const Marker: React.FC<{a: number[]; d: [number, number]; color?: string; children: React.ReactNode}> = ({a, d, color = '#79CD05', children}) => {
  const [x0, y0, x1, y1] = a;
  const box = (dx: number, dy: number) => ({position: 'absolute' as const, left: x0 + dx, top: y0 + dy, width: x1 - x0, height: y1 - y0, background: color});
  return <><div style={box(0, 0)}/><div style={box(d[0], d[1])}/><div style={{position: 'absolute', left: x0 + 14, top: y0, height: y1 - y0,
    display: 'flex', alignItems: 'center', font: '400 60px Inter', color: '#000', whiteSpace: 'nowrap'}}>{children}</div></>;
};
// Erase: wrapper scale ez(f,762,785,1,0.49,EXPO_IN) and clipPath inset with visible width ez(f,762,780,402,87,EXPO_IN), centred.
```

### 27. Handles, brackets, guides · `handles-guides`

**What.** Thin geometry that frames an element: square handles at its corners, L-brackets, corner squares or stars, dashed
guides to the frame edges, hairline tangent guides, detection boxes; they track the element per frame and sometimes snap.

**Job.** Precision, building, "designed with care".

**Numbers.** Lines 1-2 px; 12 px handle squares; dashes 4 / 4; marker squares 6-26 px; brackets tracking per frame.

**Presets.**
- *Bracket roll.* The clip is the bracket box; the old word moves up and out while the next rolls in from below (cap top
  500, 490, 420, 340 px ...), the brackets breathing to the new word's width.
- *Handles and guides.* Square handles or brackets on the box, plus 1 px dashed lines from the box to the frame edges,
  masked under panels.
- *Design canvas.* Thin dashed guides (1 px, dash 4 / gap 4, `#C9C9C9`), one vertical and one horizontal, crossing at a
  small 14 x 14 dark accent square.
- *Selection snap.* The selection box width switches in one frame, with 12 px handles; detection boxes 2 px white with a
  3 px black outline.
- *Tangents and corners.* Hairline guides tangent to a pill; small four-point stars on card corners; 25 px corner squares.

**Motion.** Track the element; snap in 1 f; roll content inside.

**Rich.** Guides that run to the frame edges and move with the element; brackets that breathe with their content; snaps.

**Cheap.** Decorative corner marks on everything; guides aligned to nothing.

```tsx
import React from 'react';
import {DirBlur, tableAt} from './items-kit';
export const Brackets: React.FC<{box: number[]; arm?: number; w?: number; color?: string}> = ({box, arm = 28, w = 3, color = '#EDEDED'}) => {
  const [x0, y0, x1, y1] = box; const c = (x: number, y: number, sx: number, sy: number) =>
    <path d={`M${x} ${y + sy * arm} V${y} H${x + sx * arm}`} fill="none" stroke={color} strokeWidth={w}/>;
  return <svg style={{position: 'absolute', inset: 0}} width={1920} height={1080}>{c(x0, y0, 1, 1)}{c(x1, y0, -1, 1)}{c(x0, y1, 1, -1)}{c(x1, y1, -1, -1)}</svg>;
};
// Word roll clipped to the bracket box: two spans in a div with clipPath inset(y0..y1); old y = tableAt(OLD,f), new y = tableAt(NEW,f),
// plus <DirBlur x={0} y={25}/> on the two fastest frames.
export const Guides: React.FC<{box: number[]}> = ({box}) => { const [x0, y0, x1, y1] = box; const s = {stroke: '#BDBDBD', strokeDasharray: '4 4'};
  return <svg style={{position: 'absolute', inset: 0}} width={1920} height={1080}>
    <line x1={x0} y1={0} x2={x0} y2={1080} {...s}/><line x1={x1} y1={0} x2={x1} y2={1080} {...s}/>
    <line x1={0} y1={y0} x2={1920} y2={y0} {...s}/><line x1={0} y1={y1} x2={1920} y2={y1} {...s}/></svg>; };
```

### 28. Hand-drawn marks · `hand-stroke`

**What.** An SVG path drawn along its length (dash offset from a per-frame head table) with a ragged edge (turbulence
displacement on one side), arrow heads 1-3 f after the shaft, erased from the start; or a signature written like a pen.
Edge recipe in `effects.md` `smear-displace`.

**Job.** Human intent, annotation, "made by people".

**Numbers.** Width 2-75 px; 6-20 f per stroke; an erase of 3-8 f; arrow heads lagging 1-3 f.

**Presets.**
- *Felt marker.* A dry-brush line in a vivid accent, 14-75 px wide (scaling with the world), one ragged edge with flecks;
  drawn from a head table; erased from its start.
- *Signature.* A white handwritten signature written on a frosted glass card like a pen; a second one ends with a dot that
  swells.
- *Pen dot.* A small dark pen dot enters at the left edge and runs up and along a rounded path, leaving a thin line that
  becomes two script letters.
- *Squiggles.* Seeded light-painting squiggles before a logo spin (see `effects.md` `light-trails`).

**Motion.** Draw by a head table; erase from the start.

**Rich.** A real ragged edge on one side only; variable speed along the path; arrow heads after the shaft.

**Cheap.** Uniform SVG strokes at constant speed; squiggles everywhere as decoration.

```tsx
import React from 'react';
import {Easing} from 'remotion';
import {ez, tableAt} from './items-kit';
export const MarkerStroke: React.FC<{d: string; drawn: number; erased: number; w: number; seed: number}> = ({d, drawn, erased, w, seed}) =>
  <svg style={{position: 'absolute', inset: 0}} width={1920} height={1080}>
    <defs><filter id={`rag${seed}`}><feTurbulence type="fractalNoise" baseFrequency="0.08 0.3" numOctaves={2} seed={seed}/>
      <feDisplacementMap in="SourceGraphic" scale={8}/></filter></defs>
    <g filter={`url(#rag${seed})`}><path d={d} pathLength={1} stroke="#13FF93" strokeWidth={w} strokeLinecap="round" fill="none"
      strokeDasharray={`${Math.max(0, drawn - erased)} 1`} strokeDashoffset={-erased}/></g>
  </svg>;
// drawn = tableAt(HEAD, f)[0] (0..1 from a head table); erased = ez(f, e0, e0 + 6, 0, 1, Easing.in(Easing.quad))
```

### 29. Code editors and terminals · `code-panel`

**What.** A dark or light panel with monospace lines; lines type, receive syntax colour after typing, get check bars, show
an error that is fixed; or the panel is built by a mosaic.

**Job.** "It writes and fixes the code."

**Numbers.** A head colour on the last 25 characters (or for 1-4 f); mono 12-18 px; panel radius 8-16.

**Presets.**
- *Typed with a head.* Each line types with its newest 25 characters in the accent and the rest in grey (`<TypedText rate
  head={25} headColor tailColor>`).
- *Deferred syntax colour.* Code types in plain ink and the syntax colours arrive a few frames later; then the copy button
  runs a heat ramp.
- *Checked and fixed.* Check bars on passing lines and one red line fixed (`checklist-row`); a voxel object may fill the
  editor's right half.
- *Word roll.* A scramble resolves into a word inside brackets, then rolls to the next words (`handles-guides`).

**Motion.** Typing tables, colour heads, bars.

**Rich.** Real-looking code for the product; colour arriving after the characters; state changes on lines.

**Cheap.** Code rain; random symbols; unreadable tiny code scrolling.

```tsx
import React from 'react';
import {useCurrentFrame} from 'remotion';
export const TypedText: React.FC<{text: string; start: number; rate: number; head?: number; headColor?: string; tailColor?: string}> =
  ({text, start, rate, head = 25, headColor = '#79CD05', tailColor = '#666666'}) => {
  const f = useCurrentFrame(); const n = Math.max(0, Math.min(text.length, Math.floor((f - start) * rate)));
  return <span style={{font: '400 22px "JetBrains Mono"'}}>{[...text.slice(0, n)].map((ch, i) =>
    <span key={i} style={{color: n - i <= head ? headColor : tailColor}}>{ch}</span>)}</span>;
};
```

### 30. Phones, laptops, browser frames · `device`

**What.** A phone, laptop or browser holding live UI: a flat white phone with no bezel and a soft halo; a rendered phone
turning toward the camera with words passing behind it; a phone's lower half rising with a share sheet; a box laptop with
a hinged lid; a tile growing into a phone; a 3D-tilted phone whose content scrolls.

**Job.** The context of use (mobile, desktop); the handoff moment (share, tap).

**Numbers.** Halo blur about 50 px at 0.55; phone radius 7.5 % of its width; a rise of 8 f with a smear; a turn of 30 f to
frontal.

**Presets.**
- *Flat phone.* A body with a corner radius of 7.5 % of its width, fill `#FDFDFF`, no bezel line, no notch; the screen is
  the body's face; a soft lavender halo `#A3AAE0` below it.
- *Turning phone.* A rendered phone rises and turns toward the camera over about 30 f (an edge, three-quarter, nearly
  frontal) while two huge outlined italic words pass behind it.
- *Share sheet.* A phone's lower half (bottom radius 70, a 6 px black bezel with a 2 px silver rim) rises from the bottom,
  smeared for 2 f, with the share sheet open.
- *Header close-up.* An extreme close-up of the app header, then a fast decelerating pull-back while the phone, slightly
  tilted and leaning back, drifts down-left as its content scrolls.
- *Box laptop.* A three.js box laptop with a hinged lid; a tile that grows into a phone with a spring-loaded snap.

**Motion.** Fly in from below, turn to the camera, or rise and leave accelerating.

**Rich.** A stylised device with no bezel and a coloured halo; words passing behind the device; live UI on the screen.

**Cheap.** A stock phone mockup with a screenshot; device frames in every scene; a tilted static phone.

```tsx
import React from 'react';
export const FlatPhone: React.FC<{x: number; y: number; s: number; children: React.ReactNode}> = ({x, y, s, children}) => {
  const W = 1000 * s, H = 2060 * s, R = 150 * s;
  return <div style={{position: 'absolute', left: x, top: y, width: W, height: H}}>
    <div style={{position: 'absolute', inset: 0, top: 10, borderRadius: R, background: '#A3AAE0', filter: 'blur(50px)', opacity: 0.55}}/>
    <div style={{position: 'absolute', inset: 0, borderRadius: R, background: '#FDFDFF', overflow: 'hidden'}}>{children}</div>
  </div>;
};
```

### 31. Grids of tiles and panels · `tile-grid`

**What.** A ground of hairline cells or glass panels on which content cards sit; the grid lines move with the hero card's
edges, or panels slide in and cards cut on inside them in a set order; partner logos enter a grid with small overshoots.

**Job.** Many capabilities in one system.

**Numbers.** Cells 59.5-132 px; lines 1 px `#E6E6E6`; panel stagger 1-6 f; logos settle over 15 f with a 1-3 % overshoot.

**Presets.**
- *Living tile grid.* Vertical hairlines every 132 px and horizontals every 119-120 px; the hero card is the middle cell,
  and the lines follow its edges as it grows.
- *Glass-grid scenes.* Grid lines at a few fixed positions; panels slide or cut in over 5 f; cards cut on inside them in
  order.
- *Partner logo grid.* Each tile enters at full size, moves on an ease-out path into its cell with a 1-3 % overshoot and
  settles over 15 frames (official logos only).
- *Ghost grid.* A faint grid with icons popping in a stagger and label pills.

**Motion.** Panels cut on in order; tiles land with a 1-3 % overshoot.

**Rich.** The grid as a living structure (lines follow cards); a consistent cell rhythm; real content in every cell.

**Cheap.** A static bento of placeholder boxes; every cell fading in together.

```tsx
// Hairline grid whose column lines snap to the hero card edges each frame (pass the card box from its table).
import React from 'react';
import {spring} from 'remotion';
export const LiveGrid: React.FC<{xs: number[]; ys: number[]}> = ({xs, ys}) => <svg style={{position: 'absolute', inset: 0}} width={1280} height={720}>
  <rect width={1280} height={720} fill="#F9F9F9"/>
  {xs.map((x) => <line key={`x${x}`} x1={x} x2={x} y1={0} y2={720} stroke="#E6E6E6"/>)}
  {ys.map((y) => <line key={`y${y}`} y1={y} y2={y} x1={0} x2={1280} stroke="#E6E6E6"/>)}
</svg>;
// Logo landing with 2 % overshoot over ~15 f: spring({frame:f-at, fps, config:{damping: 14, stiffness: 120, mass: 0.8}})
```

### 32. Pixel blocks and mosaics · `mosaic`

**What.** A grid of square cells switching on and off in a seeded order (a front, rings, a random walk), a nearest-neighbour
downscale of an element (pixelate), or blocks stepping outward around a window. Recipes in `effects.md` `pixel-mosaic`.

**Job.** Digital construction; scene glue.

**Numbers.** Cells 11.75-65 px (house 22, 24, 30 px); wipes 20-55 f; on twos or ones; 2-5 colour tiers.

**Presets.**
- *Canvas mosaic.* One `<canvas>` of 30 px cells (64 x 36 = 2304 cells), deterministic from a matrix; a wipe order
  s = column + 0.42 x row (the top rows lead).
- *Element pixelate.* A nearest-neighbour upscale of a 1/b downscale inside the element box; text binarised at 45 %
  coverage.
- *Diamond reveal.* A photo revealed through square cells in diamond rings from a centre; run backwards to hide it.
- *Mosaic iris.* An annulus of 22 px squares (seeded colours in five tiers) expanding from a disc.
- *Paint trail.* A path-following trail of pixel blocks at 1/16 resolution, upscaled nearest, with age tiers; stepped white
  blocks bursting around a window.
- *Hopping squares.* Four flat squares in four palette colours (46-56 px) hop between positions every 2-3 frames (cuts, no
  tween) and assemble the logo.

**Motion.** A front speed from a table; iris radii per frame.

**Rich.** A front with acceleration; colour tiers at the front; a seeded, deterministic order; an exact cell grid.

**Cheap.** A flickering CSS pixelate filter; random-block glitches.

```tsx
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
export const MosaicWipe: React.FC<{cell: number; cols: number; rows: number; T: (s: number) => number; color: string}> = ({cell, cols, rows, T, color}) => {
  const f = useCurrentFrame(); const ref = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => { const g = ref.current!.getContext('2d')!; g.clearRect(0, 0, cols * cell, rows * cell); g.fillStyle = color;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const s = c + 0.42 * r; const on = T(s) + Math.floor(random(`m${r}-${c}`) * 3);
      if (f >= on) g.fillRect(c * cell, r * cell, cell, cell);
    } }, [f]);
  return <canvas ref={ref} width={cols * cell} height={rows * cell} style={{position: 'absolute', inset: 0}}/>;
};
```

### 33. Dot screens and LED dots · `dot-grid`

**What.** A regular dot lattice (2-3 px dots, 5-24 px pitch) used as a ground texture, as a difference screen clipped to one
layer, as the pixels of an object (an LED cube), or as halftone dither in photo shadows. Recipes in `effects.md`
`halftone-screens`.

**Job.** The texture of a medium (screen, print, signal).

**Numbers.** Dots 2-3 px, pitch 5-24 px, alpha 0.2-0.35; scoped to one named layer.

**Presets.**
- *Difference title.* A dot grid on the stage (normal blend, with pools of light and a swirl) plus a copy in difference
  blend clipped to the title ink only.
- *Pale grid.* 3 px dots on a 24 px pitch at 0.35 over a blurred gradient-mapped photo inside an iris.
- *LED cube.* Round 3 px dots on a 5 px pitch forming coloured faces, glowing 12 px at 40 %.
- *Ring-dot dither.* 12 px rings under a frosted card and in dark areas of footage.
- *Halftone burst.* An accent halftone ring bursting out of a button after the click.

**Motion.** A static lattice under a moving camera; pools of light move.

**Rich.** A deliberate scope; dots that react (pools, a swirl); halftone used for an event (a burst).

**Cheap.** A dot pattern over the whole frame doing nothing.

```tsx
import React from 'react';
const dots = (pitch: number, r: number, color: string) => ({backgroundImage: `radial-gradient(circle, ${color} ${r}px, transparent ${r + 0.6}px)`,
  backgroundSize: `${pitch}px ${pitch}px`});
// Difference copy clipped to the title: render the title as an SVG <clipPath> (or a mask with the text) and inside it a full-frame
// dot layer with mixBlendMode:'difference'; nothing else receives it.
```

### 34. Fields of small things · `particle-field`

**What.** Many small seeded elements whose density, size distribution, colour tiers, region and life are specified (exact
positions do not matter). See `effects.md` `particle-field` for placed, glowing points.

**Job.** The medium (data, signals, space) around the hero.

**Numbers.** Elements 2-24 px; 15-60 of them (or a dense field); a life of 1 f (a glint) to the whole shot; region masks
with a 260 px feather.

**Presets.**
- *Digit field.* A frozen field of tiny "0" and "1" glyphs in columns (cap 11 px, column pitch 17, row pitch 19), ink
  barely above a near-black ground, masked by a feathered ellipse.
- *Data dashes.* Dashes 17-24 px tall rising up the frame off a decode front, about 30 at peak, in three colour tiers.
- *Star field.* 15 white dots that move straight outward from a common centre (the positions zoom; the dots do not grow).
- *Orbiting dashes.* White pixel dashes (21-23 x 12 px) in diagonal chains of 2-5, like motion arcs around a pixel mark
  (radius about 420), one chain added per frame.
- *Speed lines and glints.* Thin speed lines trailing a rolling sphere; thin grey glints flashing at seeded places.

**Motion.** Follow the camera; positions are pure functions of the frame (seeded).

**Rich.** Tied to the hero's motion (smears with it, rises from it); a feathered region; colour tiers; density specs.

**Cheap.** Generic sparkles and confetti; particles drifting with no cause.

```tsx
import React from 'react';
import {random, useCurrentFrame} from 'remotion';
export const StarZoom: React.FC<{n: number; f0: number}> = ({n, f0}) => {
  const f = useCurrentFrame(); const s = 1 + 2.4 * (1 - Math.exp(-(f - f0) / 18));          // fast, then slowing
  return <>{Array.from({length: n}, (_, i) => { const x = (random(`sx${i}`) - 0.5) * 900, y = (random(`sy${i}`) - 0.5) * 500;
    return <div key={i} style={{position: 'absolute', left: 638 + x * s - 5, top: 360 + y * s - 5, width: 10, height: 10, borderRadius: 5,
      background: '#fff', boxShadow: '0 0 6px rgba(255,255,255,.3)'}}/>; })}</>;
};
```

### 35. Circles as actors · `disc-porthole`

**What.** Circles, discs, spheres and blobs that grow, roll, dock, flash or mask; also white outline circles annotating
footage. Iris recipes in `effects.md` `iris`.

**Job.** Focus, opening, connection (a dock), continuity between scenes.

**Numbers.** An iris reaches the full frame in 4 f; spheres 90-400 px; a flash of 3 f (80 / 40 / 0 %); outlines 2 px.

**Presets.**
- *Fast iris.* A circle with a 6 px soft edge cuts open the ground: diameter 808, 1424, 1730, 1898 px, full frame on the
  fifth frame; the next world already moving inside.
- *Porthole.* The pressed send disc becomes a porthole that grows between two words (the type stays, the lines move).
- *Rolling sphere.* A glossy blue sphere (400 px) rolls in fast along the bottom of the frame, stops under the text, washes
  out the letters near it and trails thin speed lines; the camera whips on.
- *Dock.* A striped bar's right end advances 91, 269, 447, 591, 703, 871, 879, 893 px until it touches the sphere, on
  `cubic-bezier(0.25, 0.6, 0.4, 1)`; a flash on contact.
- *Outline on footage.* A white 2 px circle (about 1289 px across) slides to centre on an expo-out over 12 f, then narrows
  symmetrically.
- *Blob hills.* An SVG path made of three sines with per-frame phases, filled with a warm-to-violet gradient and blurred
  18 px.

**Motion.** Iris diameters per frame; a dock with a flash.

**Rich.** The circle continuing the previous element (button -> porthole); soft edges; a flash on contact only.

**Cheap.** Decorative circles in the corners; drifting blobs.

```tsx
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {tableAt} from './items-kit';
const IRIS = [[0,808],[1,1424],[2,1730],[3,1898],[4,2300]];
export const Iris: React.FC<{children: React.ReactNode}> = ({children}) => { const f = useCurrentFrame(); const [d] = tableAt(IRIS, f);
  return <AbsoluteFill style={{WebkitMaskImage: `radial-gradient(circle ${d / 2}px at 958px 538px, #000 calc(100% - 6px), transparent 100%)`}}>{children}</AbsoluteFill>; };
```

### 36. Concentric rings with riders · `orbit-rings`

**What.** Concentric or single rings (1-1.2 px hairlines or dashes) on which chips, dots or bubbles orbit at set angular
speeds, with depth cues on tilted ellipses. Motion in `animations.md` `orbit`.

**Job.** "Works with everything you use."

**Numbers.** Ring radii about 93 px apart; 0.58-3.8 degrees per frame; a slow zoom 0.89 -> 1.017 over 47 f.

**Presets.**
- *Provider orbit.* Concentric hairline circles (1 px `#E8E8E8`) with radii 140, 232, 326, 419, 512, 605 px, zooming
  slowly; official logos ride them at different speeds.
- *Chip ring.* r 290, 1.2 px white at 70 %, spinning 3.8 -> 0.66 degrees per frame; chips blurred 4 px x |sin|^6 of their
  angle (sharp at the sides, soft at the top and bottom).
- *Tilted ellipse.* Radii about 760 x 420, six icon bubbles 110-147 px (the front ones larger), spinning fast at the cut
  and decelerating to a slow turn.
- *Dashed ring closing.* A dashed ring closes and turns the accent segment by segment, then ripples.

**Motion.** A constant angular speed per ring plus a slow zoom.

**Rich.** Different speeds per ring; a slow zoom; official logos riding; depth on tilted rings.

**Cheap.** A single fast-spinning ring of generic icons.

```tsx
import React from 'react';
import {interpolate, useCurrentFrame} from 'remotion';
import {C} from './items-kit';
export const Orbits: React.FC<{radii: number[]; riders: {ring: number; a0: number; w: number}[]}> = ({radii, riders}) => {
  const f = useCurrentFrame(); const z = interpolate(f, [232, 262, 279], [0.89, 1, 1.017], C);
  return <svg width={1280} height={720} style={{position: 'absolute', inset: 0}}>
    {radii.map((r) => <circle key={r} cx={640} cy={360} r={r * z} fill="none" stroke="#E8E8E8"/>)}
    {riders.map((d, i) => { const a = ((d.a0 + d.w * f) * Math.PI) / 180; const r = d.ring * z;
      return <g key={i} transform={`translate(${640 + r * Math.cos(a)} ${360 + r * Math.sin(a)})`}><circle r={13} fill="#fff"/><circle r={2.5} fill="#EF4305"/></g>; })}
  </svg>;
};
```

### 37. Planets and globes · `planet-globe`

**What.** A large sphere seen from close (its limb across the frame) or a small disc; lit with a rim from a sky gradient; it
may spin (a texture scroll) and carry a grid. A photographic Earth is a found, graded asset.

**Job.** Scale, ambition.

**Numbers.** Limb radius 1-4x the frame width; a rim glow in the sky colour; spin = a texture offset of 0.5-2 px per frame.

**Presets.**
- *Sunrise over a planet.* Above a dark spinning planet, a sunrise sky (pink top-left -> soft pink -> peach -> white right);
  the camera keeps tilting up.
- *Small blue dot.* An intro that resolves into the Earth as a small dot (a found asset, graded to the palette).
- *Planet behind type.* A planet as the stage behind kinetic lines.

**Motion.** A camera tilt; a texture scroll.

**Rich.** A lit limb; a slow camera tilt; the planet as a stage for items.

**Cheap.** A spinning clip-art globe with country outlines.

```tsx
import React from 'react';
export const Limb: React.FC<{r: number; cy: number}> = ({r, cy}) => <div style={{position: 'absolute', left: 960 - r, top: cy, width: 2 * r, height: 2 * r,
  borderRadius: '50%', background: 'radial-gradient(circle at 50% 0%, #2A1B3D 0%, #0D0A14 60%)', boxShadow: '0 -6px 40px rgba(248,205,170,.55), inset 0 8px 20px rgba(247,154,154,.5)'}}/>;
```

### 38. Type as an object · `giant-type`

**What.** A word at a 400-1000 px cap that is itself a material (glass, pixels, texture, outline) or is duplicated and
clipped as a graphic; one or two words, held 0.5-1.5 s.

**Job.** The one claim as a monument.

**Numbers.** Cap 150-430 px (font size 210-1000 px); a hold of 11-90 f; one family per film.

**Presets.**
- *Glass letters* about 1000 px with a clipped light sweep (`effects.md` `glass-solid`, `light-sweep`).
- *Letterpress word.* A huge white heavy word with a letterpress texture (cap about 430 px), cut on, held still for 11 f,
  cut off.
- *Clipped copy stack.* 5 x 3 copies of one word, each clipped to a grid cell; the offsets bulge outward, then collapse, and
  the centre word zooms through a letter into the next scene.
- *Pixel text.* A word as a bitmap (cells 11.75-65 px; merge runs into one SVG path with `shape-rendering: crispEdges`),
  its fills showing the sky through.
- *Outlined words behind a device.* Bold italic words (cap about 150) inside white 3 px outline pills travelling behind a
  phone.
- *Giant light line.* A light-weight line at about 210 px typed word by word while the camera tracks and whips along it.

**Motion.** Cut on and hold; slide along; zoom through.

**Rich.** A material on the letters; an action through the letters (a zoom-through, a retouch behind); exact tracking.

**Cheap.** A giant default sans with a fade; text effects with gradients and drop shadows.

```tsx
// Clipped copy stack: 15 copies of one text node, each inside a clip rect of a grid cell, offset outward by bulge(f).
import React from 'react';
export const CopyStack: React.FC<{text: string; cells: number[][]; bulge: number}> = ({text, cells, bulge}) => <>{cells.map(([x0, y0, x1, y1], i) => {
  const cx = (x0 + x1) / 2 - 960, cy = (y0 + y1) / 2 - 540;
  return <div key={i} style={{position: 'absolute', inset: 0, clipPath: `polygon(${x0}px ${y0}px,${x1}px ${y0}px,${x1}px ${y1}px,${x0}px ${y1}px)`}}>
    <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', font: '700 133px "Inter Tight"',
      transform: `translate(${cx * bulge}px, ${cy * bulge}px)`}}>{text}</div></div>; })}</>;
```

### 39. Placeholders that resolve · `skeleton`

**What.** Grey bars or blocks in the shape of the final content; a front sweeps across and leaves the real content behind;
or a shimmer band runs across status text.

**Job.** The product producing.

**Numbers.** A front at about 110 px per frame; a colour band 2 f wide; a shimmer period of 18-20 f.

**Presets.**
- *Skeleton cascade.* A colour band sweeps left to right across the bars at about 110 px per frame: ahead of the front the
  bars are tinted, in the band they turn into the real text, behind it the text settles to ink.
- *Status shimmer.* A light sweep across grey status text every 20 f; or ink shimmering between two accents with pulsing
  dots (period 18 f).
- *Ghost wash.* A pale accent ghost of the text wipes in first, then the black text over it.
- *Blur-in letters.* Each letter at blur 8 px and 40 % opacity, sharpening over 6 f.

**Motion.** A front sweep per frame.

**Rich.** Placeholder geometry identical to the final layout; a coloured front; a staged reveal.

**Cheap.** Grey pulsing boxes, then a cross-fade.

```tsx
// Front sweep: x_front = x0 + 110 * (f - f0). For each bar: x < front-? -> real text; within 60 px band -> amber; ahead -> pink bar.
const barState = (barX: number, f: number, f0: number) => { const front = 120 + 110 * (f - f0); return barX < front - 60 ? 'text' : barX < front ? 'amber' : 'pink'; };
```

### 40. Menus, tooltips, dropdowns · `menu-tooltip`

**What.** A dark or light rounded panel with items, rising from below on an expo-out and highlighting one item; tooltips that
grow into the next scene.

**Job.** The exact action, in context.

**Numbers.** A rise of 6 f on an expo-out; the background blurred 10 px; a highlight over 6 f.

**Presets.**
- *Context menu.* The board blurs 0 -> 10 px over 5 f and darkens about 11 %; then a dark menu rises from below (smeared and
  translucent on its first frame) and lands 6 f later; one item highlights.
- *Tooltip to pane.* A small tooltip grows to fill the pane as the transition into the next scene.
- *Shrinking dropdown.* A dropdown shrinks toward its centre as it closes.

**Motion.** A rise (expo-out, 6 f), a highlight, an exit.

**Rich.** The background blurring and darkening under the menu; an official app icon in the item; a rim light.

**Cheap.** A menu popping with no context.

```tsx
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ez} from './items-kit';
export const ContextMenu: React.FC<{at: number; items: string[]; hi: number}> = ({at, items, hi}) => { const f = useCurrentFrame(); if (f < at) return null;
  const y = ez(f, at, at + 6, 120, 0); const sel = f >= at + 11 && f < at + 17;
  return <div style={{position: 'absolute', left: 462, top: 145 + y, width: 376, borderRadius: 36, background: 'rgba(58,58,60,.96)', padding: 24,
    boxShadow: '12px 12px 40px -10px rgba(220,40,160,.35)'}}>{items.map((t, i) => <div key={i} style={{font: '400 22px Inter', color: '#fff',
    padding: '12px 18px', borderRadius: 12, background: sel && i === hi ? '#0A84FF' : 'transparent'}}>{t}</div>)}</div>; };
```

### 41. Light as an item · `light-objects`

**What.** Additive light shapes bound to items: a thin specular streak sliding along a rim; a coloured glow swelling under a
card when it lands; a radial bloom at a click; an animated conic-gradient border with an outer glow; vertical reeded-glass
strips of a blurred glow layer; a floor glow band that rises with a stack. Light recipes in `effects.md`.

**Job.** Emphasis and material: light says where to look and what just happened.

**Numbers.** Streaks 3 x 170 px; glow pools swelling over 14-16 f; a bloom of 14 f; a conic border 1.6 px + a 28 px blur;
reeded strips 67 px wide (@1280).

**Presets.**
- *Rim streaks.* The reflection of an overhead light in a glass rim: a 3 px core 170 px long (Gaussian, sigma 45 px), a
  10 px glow (`effects.md` `light-sweep`).
- *Glow pools.* A violet glow swells under a dropped card over 14 f and holds; later a mint glow under the next.
- *Click bloom.* See `effects.md` `element-glow`.
- *Glow-border field.* Two nested rounded rects; the outer `conic-gradient(from <angle>deg, ...)` with a 1.6 px ring mask
  and the same gradient blurred behind it.
- *Reeded glass bars.* Soft glow blobs rendered into a layer, cut into vertical strips 67 px wide (@1280); each strip shows
  the blob layer sampled at an offset (like light through fluted glass), the strips rising behind the content.
- *Rising floor band.* A blue band from the bottom rising with a stack; a second band in a lighter blue for the next scene.

**Motion.** Slide along rims; swell over 14 f and hold; bloom over 14 f.

**Rich.** Light bound to an event or a surface (a drop, a click, a rim); additive, small and moving; reeded strips sampled,
not painted.

**Cheap.** Lens flares, light leaks, random bokeh, a glow on everything.

```tsx
// Reeded glass bars from a blob canvas: sample the centre column of each 67 px strip and stretch it.
import React from 'react';
import {useCurrentFrame} from 'remotion';
export const Reeded: React.FC<{blobs: (g: CanvasRenderingContext2D, f: number) => void}> = ({blobs}) => {
  const f = useCurrentFrame(); const src = React.useRef<HTMLCanvasElement>(null), dst = React.useRef<HTMLCanvasElement>(null);
  React.useEffect(() => { const s = src.current!.getContext('2d')!, d = dst.current!.getContext('2d')!;
    s.clearRect(0, 0, 1280, 720); blobs(s, f); d.clearRect(0, 0, 1280, 720);
    for (let x = 0; x < 1280; x += 67) { const w = Math.min(67, 1280 - x); d.drawImage(src.current!, x + w / 2, 0, 1, 720, x, 0, w, 720);
      d.fillStyle = 'rgba(0,0,0,.25)'; d.fillRect(x, 0, 1, 720); d.fillStyle = 'rgba(255,255,255,.08)'; d.fillRect(x + 1, 0, w / 3, 720); }
  }, [f]);
  return <><canvas ref={src} width={1280} height={720} style={{display: 'none'}}/><canvas ref={dst} width={1280} height={720} style={{position: 'absolute', inset: 0}}/></>;
};
```

---

## Picking items for a new film

1. Start from the product's one action (the input becoming the output). Pick the two or three items that carry it on
   screen (for example a `prompt-input` that becomes a `chat-thread`, or a `product-window` under a camera).
2. Add one hero item that makes the film memorable (`hero-3d-object`, `giant-type`, `inline-object`, `card-ring`) and give
   it one designed move that resolves into the brand.
3. Add at most one light item and one texture item that belong to the world (`light-objects`, `dot-grid`, `mosaic`).
4. Close on `logo-lockup` with a move that echoes a shape or colour from earlier in the film.
5. Vary the pick from film to film; never reuse the same hero item twice in a row.
