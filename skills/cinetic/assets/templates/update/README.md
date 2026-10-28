# The update template

A 15-23 s update film ("vX is out"; 2-4 changes at 120 BPM, shorter on a faster track), laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter
acts it removes).

**The shape.** The name and the version first (the name over giant numerals cropped by the frame: "[Name] [version]"
by 3 s), one act per change (2-4), each a product moment: the camera arrives on the product's surface, lit and tilted in
the film's one light (`fx/Lit`), the product does the new thing on its beat, and one plain sentence of 2-6 words says
the result the user sees, on its own confident move (`acts/type.tsx`). Then the payoff, with the version whole, and the
end card with the version, the mark and the name. One camera carries the whole film along one strip, so every act line
is a velocity seam; the film makes one 3D camera move. Each slot deals one of two devices per film from the name
(`src/deal.ts`, template.json "slots"): the stage (slate or paper), the hook (the last numeral rolling from the old
value, or the new version rising out of a mask once the name is read), the turn (a yaw into the second change, or a
pitch over the payoff), the payoff (a pull back over every change as the version swings in, or the last change
receding as the version rises in front) and the end (the version stepping back to the upper right over the lockup, or
settling after the name as one lockup); every line is dealt a move and an exit.

**What to write.**
- `src/update.ts`: the version, the version before it and the changes (`words`: one plain sentence, 2-6
  words, a result the user sees; `moment`: how it is shown; a change that works with another product puts "[]" where
  its real mark sits in the sentence, with `logo`, the mark's slug from `node scripts/logos.mjs get <name> --film .`,
  and `logoName`; an `approve` change's `photos` are the four real pictures its review approves, public/ paths from
  `node scripts/assets.mjs get`, else they show as the files they are). Delete its placeholder lines.
- The product moments: `src/kit` is the floor (a review approved, a reply landing, a figure climbing, a
  budget entry, a dense table whose readable row travels to the row that changed). Rebuild the product's own screens for film (every size x1.9, nothing under 36 px) and
  give each change its real state change on its hit frame.
- The brand: `--brand <kit>` writes the tokens, the logo's parts (`src/brand/logo.ts`) and the name
  (`src/brand/identity.ts`); without a kit, replace the placeholders by hand.
- The direction: deal it with `python3 scripts/deck.py --brief "..." --format update --changes N` and
  retell this floor in its world: its space, light, camera and signature replace the strip.

**Music (the slot every film fills).** An update film is cut to a licensed, human-made, instrumental
track, never effects only (`template.json` → `music`, references/music.md). Find it first, for this
film: `node scripts/music.mjs search --mood "<the film's mood words>" --bpm 116-128 --length <s>` (116-128
BPM suits two bars a change), `sheet --measure`, then `get '#n' --to audio/music` (its licence record
beside it; never the last film's track). Bring it in with `--music <file> --record <licence.json>` (a track
found elsewhere: its licence flags, or later `python3 scripts/audio/track.py add`), then `track.py edit --bars N --reveal-bar K --end stop|button|ring`,
`track.py grid` and `track.py check`: `src/music.ts` then carries the track and `b()` follows its bars.

**Timing.** Two bars per change at the template's 120 BPM (crisp), every act line on a bar line (with the
track, on a downbeat): 2 changes 14 s, 3 changes 18 s, 4 changes 22 s, each plus a 1 s tail; with the track, its own bars. Sound: `src/sync.ts` places the
effects from the picture's own frames (the numeral locking, each product moment's contact frame, one
text sound per fragment, the moves between acts, the version landing, the lockup); the track carries
the film.
