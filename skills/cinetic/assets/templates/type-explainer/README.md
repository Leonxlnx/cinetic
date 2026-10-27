# The type-explainer template

A 20-30 s explainer told in type on a white page, one short sentence at a time, laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --template type-explainer` (template.json lists the files it copies and the starter
acts it removes). Crisp word pace, 90 BPM until the track's grid is in; 9 bars, 25 s as written.

**The shape.** The name, what it is, the problem, the promise, the picture, how it fits together, its parts, the close.
Pictures and the mark stand in for words, and every transition is made of content (the picture that is a word becomes
the shot; the mark that is a word becomes the hub), with one soft wipe in the whole film.

| # | act | shot | in | what happens | the slot |
|---|---|---|---|---|---|
| 1 | `open` | the name as one giant word, then what it is | cold open | the name drops in decelerating while a band of the accent runs through it; on the mark's frame the name is re-set at 75 % in ink, the mark pops in after it as the next word and both glide left (the gap closes), accelerating into a cut at speed; what it is is said word by word at the pace of speech (uneven onsets, each word landing right of its slot and settling home while the line drifts left), the camera eases in, it leaves right with its words gone last to first | the name, `lines.what` |
| 2 | `pain` | the problem as one beat | a cut at speed, carried right | the whole line in one frame, coming into focus as it drifts 70 px, a real hold, an ease-in exit the same way | `lines.pain` |
| 3 | `promise` | a picture inside the line | a cut at speed | the first half said; the picture opens after it as a small pill under a slow push; the second half is appended and in ONE frame the line re-centres and the push drops back, then the push continues; the pill grows on its own into the cut | `lines.promise` (two halves), `picture` |
| 4 | `picture` | the picture full bleed | the pill becomes the shot (the signature) | a slow push on the picture; the mark pops, the name's letters rise in after it | `picture`, the name |
| 5 | `system` | how it fits together | the one soft wipe, from the right | the first half slides in with the mark standing after it as a word, centred; the second half appended; a push centred on the mark; the words float off and the mark stays | `lines.system` (two halves) |
| 6 | `grid` | the product's parts round its mark | the mark stays: it is the hub | the parts are born round it by distance in one radial wave, their glyphs a beat later; faint cells fade with distance; three labels one a second, each growing out of the edge facing its tile; they gather back into the mark, outer first | `modules` (6-10, the first three labelled) |
| 7 | `end` | the lockup and the close | the gather | the hub steps aside into the lockup's mark, the name sets beside it, the close settles under them from 108 % into focus and holds | `lines.close`, the name |

**What to write.**
- `src/explain.ts`: the script (2-7 words a line, 3-5 read best at this small airy size; the halves of the promise and
  the system line at most 4 words each; plain sentences: the what line says what the product is, the close what to
  do), the product's 6-10 modules with their glyphs, and the picture. Delete its placeholder lines.
- The picture: a photograph of the product in use or the people it is for, in `public/` (`picture.src`); a supplied
  clip reads better still (rebuild `Picture` with `fx/Footage`: a still picture that should move reads as a slide).
  Until then the kit's still life on the mid slate stands in.
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name. The mark is used as a word, so it must
  read at 90 px.
- The direction: deal it and retell this floor in its world: its ground and type replace `acts/stage.tsx`.

**Timing.** `src/timeline.ts` places every act on a bar line (`BEATS`, whole bars) and every state change as a CUE on the
16th grid; `SPEECH` holds the uneven word gaps that make a line read said rather than typed, `APPEND_GAP` the gap of an
appended half. A line that would be cut before its read fails at import: move its exit cue a beat later or shorten the
line. Keep the grammar when you retime: one sentence on screen at a time, cuts at speed, the picture and the mark carry
the seams, the one wipe, holds that keep moving.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): calm and even, 85-105
BPM; then `track.py edit`, `grid` and `check`. `src/sync.ts` places the effects from the picture's own frames: the name
landing, the mark arriving, each line once it is whole, the cuts at speed, the picture opening and growing, the wipe,
every other part born, the labels, the gather, the name, ONE element at the lockup.
