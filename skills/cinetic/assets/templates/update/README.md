# The update template

A 15-25 s update film ("vX is out", 2-4 changes) laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter acts it
removes). The film fills one file, `src/update.ts`; everything else is dealt from the product's name.

**The shape.** The name and the version, centred, as one pair from the first frame. Then ONE card, the product's own
screen, carried through the film: each change shows working on it (a tap and the state it changes to, a list, grid or
week that fills, a before -> after, a figure that rises: `acts/moments.tsx`), and each change has its own beat shape,
never the same twice in a row:

- `after`: the change works, then the element that changed (the pressed button, the block that landed, the row, the last
  bar) grows into the frame's colour field, the line reads on it, and the field closes into the next card. The film's
  one colour event.
- `split`: the line arrives parted round the card, which sits small in the gap between its words (the change before it,
  as it ended); the words leave and the card grows out of the gap as the new screen and works.
- `with`: the card works in the upper 60 % of the frame while its line reads centred under it (once a film).

Then the recap (every change's card in a row, readable for over a second), and the end card built from it: the cards
pile and shrink into the mark in one gesture, the name slides out of the mark, the version lands on the last bar line,
apart from the name.

**The rules it keeps.** The camera never floats: it moves only with the story (a card arriving, reshaping, growing) and
every hold is still. Nothing bobs or breathes, no card rests tilted (the one turn is the dealt `object-turn` arrival,
which lands facing the lens). Lines never sit over a sharp card, never travel sideways (so no line is cut by the frame
as it enters) and leave whole, fading before their travel ends. Another product's mark in a line is its official mark
in the line's own ink.

**The deal** (`src/deal.ts`, seeded by the name; `PIN` a slot or `SEED` to re-deal; the last three films' choices are
left out through `src/recent.ts`): the ground (nine lit, still families from `fx/Grounds`), the hook (`roll`, `rise`
or `badge`), the first card's arrival (`rise`, `open`, or a creative library device from `fx/creative`:
`pixel-assemble`, `shape-morph`, `object-turn`), the order of beat shapes, the recap (`deal` or `rise`), the end
(`stack` or `fold`), the cards' tone (`kit/card`: light, or dealt dark on a dark ground), the field line's setting (the
voice, or the library's `scale-contrast`: its key word huge) and the lines' voice (one move and one whole-line exit).
Print it: the command in template.json `deal.print`.

**What to write.**
- `src/update.ts`: the version and the one before it, and 2-4 changes. Each: `words`, one plain sentence of 2-6 words
  saying the result the user sees (copy-check fails a feature name); `key`, the words its accent lands on (the
  scale-contrast sets the last of them huge); `title` and `sub`, the screen's own header; `show`, the moment that
  proves it (`tap`, `fill` as list, grid or week, `swap`, `count`), in the product's own words; `recap`, the few words
  its recap card shows. A change that works with another product writes "[]" where its mark sits, with `logo` (the
  slug from `node scripts/logos.mjs get <name> --film .`) and `logoName`. Real photos: `node scripts/assets.mjs get`.
- The brand: `--brand <kit>` writes the tokens, the logo's parts (`src/brand/logo.ts`) and the name; the type pairing
  comes from `npx tsx scripts/type-deal.ts --seed "<name>"`. Without a kit, replace the placeholders by hand.

**Music (the slot every film fills).** Cut to a licensed, human-made, instrumental track, never effects only
(template.json `music`). Find it (`node scripts/music.mjs search --mood "<words>" --bpm 112-128`), bring it in with
`--music <file> --record <licence.json>`, and once `update.ts` is written `python3 scripts/audio/track.py fit --end
auto` cuts it to the film's bars (its entry on the recap, its final hit on the version mark).

**Timing.** Every change starts on a downbeat and takes the whole bars its content asks (two at least): its line's read
at the pace, the moment's 1-3.5 s, the result held at least 1.6 s; the slack is shared so no part outstays its read (a
slower field, a longer result, a card working on alone). The recap holds one bar, the version lands on the next bar
line, the tail is the end card's hold. `src/sync.ts` places the sounds on the picture's own frames: every tap, landing,
state change and line, the field's swell, the card's moves as quiet air, the lockup's hit.
