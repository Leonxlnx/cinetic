# Type emphasis and dimension: lines that are not flat

A line set in one size, one weight and one colour, every word treated the same, small on a plain ground and never
touching the picture, reads flat however well it fades in. Studio statement lines almost always set one part apart:
the key word heavier or bigger or in the accent, a bar behind it, a word that is a picture, a second line twice the
size of the first, type standing in the space of the shot. This family is the house's set of those devices: pure
functions of the frame, measured numbers (`lib/look.ts` `EMPHASIS_LOOK`, `STACK_LOOK`), drawn by `<TypeLine>` on any
of its presets.

**The rule: every hero line takes at least one emphasis device**, on its key words, and no two lines in a row take the
same one. `<TypeLine>` gives a hero line (a confident preset in the line, display or hero role) that names none the
`weight` device; a template deals the rest per line from the film's seed (`fx/TypeEmphasis` `dealLineEmphasis`); a body
line, a caption, the name on the end card and a piece of a line set in parts take none (`emph: false`).

**The key words.** Write them between asterisks in a line (`"Brook is a *water bottle*."`: the marks leave the text) or
name them as plain words beside the script line (a template's `keys`: `{ what: '[ideas]' }`, found with `keysOf`); with
neither, the line's last word. Pick the words that carry the claim (the output, the number, the result), never the
product's name. `copy-check.py` names a key word for a line that has none.

## In the line (`spec.emph`, `fx/TypeEmphasis`)

| Device | What it does | House numbers (60 fps) | Width |
|---|---|---|---|
| `weight` | the key words at the family's emphasis weight in the accent (the default) | calm 450 -> 650, bold 600 -> 800; tracking tightens by what the weight adds, at most 0.06 em | held |
| `accent` | the key words rest in the accent (colour alone, the quietest) | the preset's own colour path, landing in the accent | held |
| `scale` | the key words one step up the type scale, on the line's baseline, at the emphasis weight | calm x1.5 (84 -> 126 px), bold x1.35 (120 -> 162) | grows: refit with `emphasisFitSize` |
| `swell` | scale, grown in after the line lands; the other words slide apart and the line re-centres | 22 f on E.glideOut, 4 f after the key word lands | grows |
| `marker` | an accent bar wipes on behind the key words and knocks them out to the ground; the line opens room for it | 1.12 em tall, centre 0.36 em over the baseline, 0.14 em side pad, corners 0.12 of its height, 10 f on E.snapOut | opens room |
| `box` | the inverted box: the line's ink behind the key words, the words in the ground colour | 1.42 em tall, 0.4 em pad, square | opens room |
| `under` | a rule draws under the key words, which take the emphasis weight | 0.075 em thick, 0.13 em under the baseline, 12 f | held |
| `outline` | the key words arrive as an outline and fill left to right once landed, resting in the accent | 0.022 em stroke, 16 f, a 0.06 em edge | held |
| `sweep` | the accent crosses the key words left to right once the line lands, and stays | 22 f, a 0.5 em soft front | held |

The colour of a device follows the preset's own path (a word cut on in a tint, cooling from the accent, rising from
the mute) and lands in the device's colour: the preset runs again with that colour as its ink. The slot presets
(`wheel`, `erode`, `cycle`) take the colour devices only. A line placed by a measured width (a label in a pill, a close
beside a mark) takes a device that holds the width (`dealLineEmphasis` `fixed`).

## Two lines, stacks and editorial layouts (`fx/TypeStack`)

- **StatementLine**: a hero statement of four words or more as two lines, the words before the key words small (0.62 of
  the size) over the key words big (calm x1.7, bold x1.45, fitted under 78 % of the frame), centred or flush left,
  baseline to baseline 1.04. "Brook is a" over "water bottle.". The templates set their opener this way.
- **TypeStack**: 2-3 lines of one sentence, each with its own size, weight, preset and emphasis. `left` flush left at
  4 % of the frame width (measured 2.9-4.6 %), `stair` each line starting a third of the way along the one above,
  `centre`, `right`; lines start 14 f apart; the last line carries the emphasis (the emphasis weight in the accent at the
  same size). `aside` hangs a caption beside the giant line, its first cap line on the giant's (giant plus small).
- A layout that sets lines flush left uses `align: 'left'` on the spec, never a centre computed from a measured width:
  the re-centring presets then hold the edge, and a device that changes the width cannot push the line off its margin.

## Type in depth and type that touches the picture

- **TypePlanes** (`fx/TypeDepth`): lines on planes at depth the camera travels past (perspective 1400 px, a 12 degree
  turn, defocus by distance from the focus plane at fixed radii, a fade as a plane passes the lens, a creep after the
  move). The read plane lands sharp and frontal.
- **TypeBehind** (`fx/TypeBehind`): the line between the picture and the subject cut out of it along a traced matte (the
  person or the product stands in front of the words); `front` passes a card over the line; `ride` moves picture, line
  and cut-out as one. The subject covers at most a line's ends or its gaps while it is read.
- **A word that becomes a picture**: the object or photo stands in the line at cap height (`kit/inline` ObjectLine and
  InlineObject, `fx/Pictures` InlinePhoto, `fx/InlineGap`), the line re-flowing round it.
- **Kinetic reflow when a word is replaced**: `wheel` and `erode` re-flow the line round the new word; `swell`, `marker`
  and `box` re-flow it as they play.

## Checks

`scripts/test/type-emphasis.test.mjs` holds the numbers. In review, look for a hero line with no device on it, the same
device on two lines in a row, a device on the product's name, a key word that is not the claim, and a mark or a rule
touching the next word.
