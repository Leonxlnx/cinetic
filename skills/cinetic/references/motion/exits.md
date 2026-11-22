# Exits

## Why exits matter more than entrances

Template films design entrances and forget exits: things ease to a stop, hold, and fade, then the next scene fades up.
That is a slideshow. In premium films **the exit is where the cut happens**, so the exit decides how the next shot is
received:

- **The cut lands during the exit, on its fastest frame.** The eye is still travelling when the new shot appears, so the
  brain reads one continuous move instead of two shots.
- **The exit hands speed and direction to the next entrance.** An exit that accelerates left licenses an entrance that
  arrives moving left and decelerates. An exit that slows to zero licenses nothing.
- **The exit says what mattered.** When the losers blur away and the winner stays sharp, or one layer leaves while the
  layer under it stays, the exit is an editorial choice the viewer can feel.
- **Almost nothing should leave on its own.** Objects are carried by the camera, covered by the next
  object, transformed into it, pushed out by it, slid into a slot, retracted into a hero or switched off. A self-contained
  fade-out is the rarest exit, used for 3-4 frames at most.

Rule of thumb: **arrive decelerating, leave accelerating.** Entrances use `ease.out`; exits use `ease.in` or the kit's
`accel` (each frame's step = r x the previous, r = 1.35-1.6) and end at peak speed on a cut, a wipe or a hand-off.
All numbers at 30 fps.

Kit: `accel, at, ease, mix, speedOf, envelope, clamp` from motion; `Words` (`leave`, `leaveAt`, `leaveDur`); `Flash`,
`Push`, `Pixelate` from turns.

---

## 1. Accelerating exits

### 1.1 Peak-speed exit
**What:** the outgoing layer (or the camera) accelerates geometrically and is cut on its fastest frame. The universal exit.
**When:** every carried cut (see `turns.md`); any section end that hands energy forward.
**Numbers:** a pull-back over 7 f: scale 0.977, 0.971, 0.963, 0.950, 0.932, 0.902, 0.857 (each step ~1.5x the last); a push
into a cut: 1.000, 1.020, 1.067, 1.143, 1.248, 1.379, 1.529; a slide: 3, 5, 9, 15, 27, 47, 82 px/f. Blur grows with speed
(2 -> 6 -> 14 px, or a horizontal smear 8, 16, 32, 60 px over the last 4 f for whips).

```tsx
const q = accel(frame, 40, 7, 1.5);               // 0 -> 1, last step the biggest
const s = mix(q, 0.98, 0.857);
const v = Math.abs(s - mix(accel(frame - 1, 40, 7, 1.5), 0.98, 0.857));   // per-frame speed
<AbsoluteFill style={{ transform: `scale(${s})`, filter: `blur(${Math.min(14, v * 300)}px)` }}>{scene}</AbsoluteFill>
// cut at frame 47: the next scene enters already shrinking (momentum entry)
```
**Avoid:** easing the exit out (ending slow); a crossfade after it; motion blur on the slow early frames.

### 1.2 Creep, then burst (velocity-doubling whip)
**What:** the element creeps slowly for ~8 f, then its velocity roughly doubles per frame; the cut lands at 60-90 px/f.
The long creep makes the burst feel like a decision.
**Numbers:** creep 2-3 px/f for 8 f, then 3, 5, 9, 15, 27, 47, 82 px/f (x1.75); sub drop starting ~2 f before the cut;
a shutter click on the cut frame. On a clean white stage no motion blur is needed.

```tsx
const creepX = -2.5 * Math.min(frame - s, 8);
const burst = -[0, 3, 8, 17, 32, 59, 106, 188][clamp(frame - s - 8, 0, 7)];
<div style={{ transform: `translateX(${creepX + burst}px)` }}>{line}</div>
```

### 1.3 Asymmetric whip into a flash
**What:** a reposition whip is asymmetric (12 f build, 7 f stop, `cubic-bezier(0.854,0.06,0.425,0.936)`); the exit whip is
**pure acceleration** (`cubic-bezier(0.23,0,0.72,0.12)`, +245 px over 12 f, last step ~54 px/f) with a stage blur pulse
1, 6, 12, 18 px and +6 % brightness on the last 4 f, then a one-frame flash (see `turns.md`, flash gate).

### 1.4 Shrink into the cut
**What:** a word, a line or a lockup shrinks 5-30 % on an ease-in over 10-20 f and is **cut before it finishes**.
**When:** the most reusable text exit; a film can use it 5-6 times without it becoming a tic because it is nearly
invisible: it just makes every cut land on motion.

```tsx
const s = 1 - 0.11 * at(frame, end - 12, 12, ease.in);   // cut at `end`
```

### 1.5 Lift out the top
**What:** an input bar or card accelerates out of the top edge (-2 -> -10 px/f and faster), no fade, no blur until the last
2 f; hard cut on a low hit. Clean and literal ("it was sent").

### 1.6 Rise and leave (layout passes through)
**What:** a flat composition enters from below, nearly stops, creeps, then **accelerates up and out** with a quad-in; it
reads like a feed scrolling past the camera.
**Numbers:** translateY +260 px -> +3 px at f28 (circ-out `cubic-bezier(0,0.55,0.45,1)`), then quad-in to -156 px at f52
(about -14 px/f at the cut); vertical motion blur only while |v| > 8 px/f.

---

## 2. Carried and covered exits

### 2.1 Carried by the camera
**What:** the element does not animate at all; the camera tilts, pans or pulls away and takes it out of frame, or a
world-level move (a tilt up, a vertical rush) leaves it behind.
**When:** wordmarks after their hold, UI that has done its job, any hero that should not "do" anything on its way out.

```tsx
<Camera keys={[{ f: 0 }, { f: 40 }, { f: 52, y: -520, curve: ease.in }]}>{scene}</Camera>
```

### 2.2 Pushed out by the next element
**What:** the next element enters and physically pushes the old one away: the first toast's top enters at the bottom and
the card above is pushed up on an accelerating curve (centre y 529 -> 443 over 19 f), blurring 8-14 px as it leaves behind
the stack.

### 2.3 Covered (occluded)
**What:** the next object passes in front: two large shapes close like curtains over the hero; a foreground occluder
fills the frame for 3-4 f; a giant word rises in front of the product. Under the cover, swap anything.

### 2.4 Demoted under the next hero
**What:** the old hero shrinks (~25 %) and fades to 40 % over 8 f while the new hero docks over it; it is gone ~10 f later.
The old hero is turned into background before it disappears, so the eye moves on before it notices.

### 2.5 Fly to the edges, become the frame
**What:** at the climax, the film's objects move radially outward (600-900 px over ~25 f, `ease.inOut`) and flatten into
flat shapes docked half off-frame: the exit becomes the lockup's frame. Nothing leaves; everything is re-used.

---

## 3. Make-room and selective exits

### 3.1 Make room
**What:** words drift apart to vacate the centre for what comes next: the left word left at a constant ~13 px/f, the right
word right at ~15 px/f, with a 4-6 px horizontal smear, while the middle word shrinks to 0.87x about its centre. On the
cut, the next shot's words are in the same positions moving the same ways.

### 3.2 One layer leaves, the other stays
**What:** a headline rises (accelerating 4 -> 20 px/f), blurs 0 -> 10 px and fades over 8 f while the input under it stays
sharp, opaque and still, and is hard-cut. The survivor holds the eye across the cut.

```tsx
<Words text="Say what you need" leaveAt={208} leave="blur" leaveDur={8} />
<InputBar t={theme} text="" start={0} />   {/* untouched */}
```

### 3.3 Losers blur out
**What:** in a selection, the unchosen items blur 0 -> 12 px and fade over 7 f (or drop to 25 % brightness and blur 4 -> 10
px) while the winner grows 1.24x and stays sharp. No checkmark needed: growth + isolation is the selection.

### 3.4 Defocus while moving
**What:** a title block accelerates upward (4 -> 18 px/f) while its blur ramps 0.3 -> 12 px over 16 f; **opacity stays 1**:
the lightening is the blur. Often paired with a foreground occluder passing in front.

### 3.5 Recency blur
**What:** in a crowded chat stack, items rising past a threshold blur 0 -> 3-6 px and fade 1 -> 0.38 (or 0) over ~17-20 f;
the avatar and name stay sharp. Exit as a function of age, not of time.

---

## 4. Transforming exits (the object becomes something)

### 4.1 Collapse into the next element
**What:** the chosen card loses its top (moves down 40 px), turns translucent, flattens into a 50 px bar, then becomes the
progress pill of the next beat, arriving larger and lower and settling in 5 f. The choice becomes the progress.

### 4.2 Bloom-morph
**What:** a confirmation line brightens toward white, gains a 20 px glow, its letters squeeze horizontally into a white
blurred bar, which re-forms as a glowing pill: the next action's button. Over ~6 f. The confirmation *becomes* the action.

### 4.3 Retract into the hero
**What:** a bar (a progress line, a flow) slides back into the hero object with an ease-in over 10 f, and the hero grows
~10 % as if it had swallowed it. A low note on the last frame.

### 4.4 Rows vanish top-down
**What:** after a process completes, the block's header turns the accent colour and the rows vanish top-down, one every 2 f.
Crisp; the list collapses into the result.

### 4.5 Corner collapse (minimise)
**What:** the whole scene shrinks toward one corner (scale anchored at that corner), like a window being minimised in a
design tool, revealing the next scene that was already underneath. A small handle square rides the moving corner.
**Numbers:** `transform-origin: 0 0`, scale 1 -> 0.12 over 10 f, `cubic-bezier(0.83,0,0.17,1)`; handle 10 px.

```tsx
const s = mix(at(frame, 0, 10, ease.inOut), 1, 0.12);
<AbsoluteFill>{next}</AbsoluteFill>
<AbsoluteFill style={{ transformOrigin: '0 0', transform: `scale(${s})` }}>{current}</AbsoluteFill>
```

### 4.6 Doors part
**What:** a split layout (caption left, panel right) parts like doors: both halves accelerate off their sides
exponentially (x1.6-2 per frame, peaking ~256 px/f) onto a card that has been peeking from below for ~6 f.

```tsx
const q = accel(frame, s, 8, 1.8);
<div style={{ transform: `translateX(${-1000 * q}px)` }}>{leftHalf}</div>
<div style={{ transform: `translateX(${1000 * q}px)` }}>{rightHalf}</div>
```

### 4.7 Slot exit
**What:** a card slides right **under a fixed vertical clip** (its container's edge never moves), on an ease-in over 8 f
(`cubic-bezier(0.55,0,0.9,0.5)`), revealing the card stacked beneath. It reads as sliding into a slot. Put the whoosh on
the frame it disappears, not on the first.

```tsx
<div style={{ position: 'absolute', left: 0, width: 1300, height: 1080, overflow: 'hidden' }}>
  <div style={{ transform: `translateX(${mix(at(frame, s, 8, ease.in), 0, 700)}px)` }}>{frontCard}</div>
</div>
```

### 4.8 Sink and launch
**What:** on a click, the container sinks out of the bottom with acceleration (last steps 24, 29, 36, 44, 57, 93 px/f) while
the key element (the send button) **launches** up-right on a J-curve: x on a cubic-out (+150 px), y on a cubic-in (-290 px),
diameter 36 -> 62 over 21 f, vertical motion blur 30, 45, 70 px on the last 3 f. They separate: the button is the hero, the
box is discarded. Cut, and let the button's "pixels" fall into the next shot (5.3).

---

## 5. Light, colour and texture exits

### 5.1 Lights out
**What:** a bright world tilts up and out **while dimming to grey** (a multiply layer white -> #808090 -> black over 6 f);
the brightest block at the edge stays lit 2 extra frames (an afterglow band), so it reads as light being switched off, not
a fade to black. A short string stab on the tilt start.

### 5.2 Glow sink
**What:** the floor glow under a line drains away (peak luma 150 -> 45, top edge 600 -> 910 px in 9 f) while the line
pushes in: the ground leaves from under the text.

### 5.3 Heat out, bleach, fade to white
**What:** elements leave by heating (warming through the film's light tints) and then bleaching to the stage white, often
with a 6 px blur on pictures, over 4-8 f; tiles may warm from grey to the light accent over 7 f and bleach over 8 f (a
15 f warm pulse). On white worlds, **chapters end to white, never to black**.

### 5.4 Bloom to white
**What:** tiles and a line glow up 10 % -> 100 % over 7 f (drop-shadow glow + brightness + white overlay) while the line sinks
65 px, then a hard cut to a white page. A glow ramp as an exit, mirroring a glow ramp at the entry.

### 5.5 Mosaic overrun
**What:** the lockup is not faded: it is **eaten** by spawning grid-snapped blocks (a burst every 2-3 f) until the frame is
covered, then a hard cut. Bookends a mosaic opener.

### 5.6 Re-encode
**What:** a decoded word runs its decode backwards (into its cipher) in 6 f and vanishes. For words that entered by decode.

### 5.7 Pixels fall out
**What:** after a hard cut, a few glowing squares (the "pixels" of the object that just left) tumble down-left on **twos**
(each pose held exactly 2 f, positions jumping 30-150 px, sizes changing, two merging), gone by frame 12, while the
background decays from a lifted grey to the stage colour over 15 f. One stepped element inside a smooth film.

```tsx
const fe = Math.floor(frame / 2) * 2;     // on twos
const pose = (i: number) => ({ x: 960 - fe * (18 + i * 9), y: 420 + fe * fe * 1.4 + i * 30, s: 40 - i * 10 });
```

### 5.8 Cut off one by one
**What:** cards on a page vanish one at a time without a fade (one, then two on the next frame, two more 2 f later, then
the last), timed to a push-in. A staggered vanish on the stepped clock.

### 5.9 Grey drain
**What:** before a hard cut to the brightest scene of the film, saturation falls ~40 % and a vertical veil lightens the top
and darkens the bottom over 9 f. The contrast reset makes the next scene land.

---

## 6. Text exits

`Words` supports exits directly: `leave="rise" | "fall"` (masked, staggered at half the build gap), `"blur"` (blur 0 -> 16
px and fade), `"scale"` (to 1.25x with blur and fade), with `leaveAt` and `leaveDur`.

```tsx
<Words text="Fewer tabs" arrive="rise" start={0} leaveAt={40} leave="rise" leaveDur={8} />
```

Use the text exits in this order of preference: shrink into the cut (1.4), one layer leaves (3.2), carried by the camera
(2.1), make room (3.1), defocus while moving (3.4), masked rise out (`leave="rise"`), heat out (5.3), re-encode (5.6).
Never a plain fade of more than 4 f.

---

## 7. Choosing an exit

| Situation | Exit |
|---|---|
| next shot shares a direction or subject | peak-speed exit -> carried cut |
| next shot is "inside" this one | push into the object (see `turns.md`, zoom-through) |
| a choice was made | losers blur out; the winner collapses into the next element |
| a confirmation leads to an action | bloom-morph |
| the element has done its job, the world continues | carried by the camera |
| a chapter ends on a white world | heat out / fade to white in 4-8 f |
| the film moves from day to night or to the lockup | lights out |
| the old hero is replaced | demoted under the next hero |
| a stack or list completes | rows vanish top-down, or pushed out by the next element |
| a split layout | doors part |
| a card reveals a card beneath | slot exit |

Checks before render: every cut in the timeline lands on a frame where something is moving at > 10 px/f or scaling at
> 1.5 %/f; no exit decelerates into a cut; no two consecutive seams use the same exit.

---

## Not in the kit yet (build these by hand from the recipes above)

- **`Exit` wrapper**: a component taking `start`, `dur`, `kind` ("accel-x", "accel-scale", "shrink", "lift", "rise-blur")
  and computing per-frame speed blur automatically (via `speedOf`), so peak-speed exits are one line.
- **`speedBlur(fn, frame, k, max)`**: directional blur amount from the per-frame displacement (the kit has `speedOf` but no
  directional blur; CSS `blur()` is isotropic, so a ghost-copy smear helper is needed for real directional blur).
- **`Doors`**, **`SlotClip`**, **`CornerCollapse`**: small components for the three structural exits.
- **`LightsOut`**: multiply layer + afterglow band + tilt in one component.
- **`MosaicOverrun`**: grid-snapped block spawner that eats a layer (the kit's `Pixelate` is a symmetric transition).
- **`Words` exits**: `heat` (ramp out), `erode`, `reencode`, `shrink` (ease-in scale into a cut) are missing.
- **`RecencyBlur`** for stacks: blur and opacity as a function of an item's age or position.
