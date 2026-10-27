# The update template

An 8-20 s update film ("vX is out"), laid over the Remotion starter by
`bash scripts/new-film.sh <dir> --format update` (template.json lists the files it copies and the starter
acts it removes).

**The shape.** The name and the version first (the name over giant numerals cropped by the frame, the last
numeral rolling from the old value to the new: "[Name] [version]" by 3 s), one act per change (2-4), each a product moment: the camera arrives on the
product's surface, the product does the new thing on its beat, and one plain sentence of 2-6 words says the result
the user sees. Then the payoff (the camera pulls back over every change as the version swings back in
front) and the end card (the version recedes into the set; the mark's parts and the name are set before
it). One camera carries the whole film along one strip, so every act line is a velocity seam.

**What to write.**
- `src/update.ts`: the version, the version before it and the changes (`words`: one plain sentence, 2-6
  words, a result the user sees; `moment`: how it is shown). Delete its placeholder lines.
- The product moments: `src/kit` is the floor (a review approved, a reply landing, a figure climbing, a
  budget entry). Rebuild the product's own screens for film (every size x1.9, nothing under 36 px) and
  give each change its real state change on its hit frame.
- The brand: `--brand <kit>` writes the tokens, the logo's parts (`src/brand/logo.ts`) and the name
  (`src/brand/identity.ts`); without a kit, replace the placeholders by hand.
- The direction: deal it with `python3 scripts/deck.py --brief "..." --format update --changes N` and
  retell this floor in its world: its space, light, camera and signature replace the strip.

**Music (the slot every film fills).** An update film is cut to a licensed, human-made, instrumental
track, never effects only (`template.json` → `music`, references/music.md). Pick it first: the dealt
direction lists shortlist tracks in its tempo range (`python3 scripts/deck.py --show`); 116-128 BPM
suits one bar a change. Bring it in with `--music <file>` and its licence flags (or later
`python3 scripts/audio/track.py add`), then `track.py edit --bars N --reveal-bar K --end stop|button|ring`,
`track.py grid` and `track.py check`: `src/music.ts` then carries the track and `b()` follows its bars.

**Timing.** One bar per change at the template's 120 BPM (crisp): 2 changes 12 s, 3 changes 14 s,
4 changes 16 s, each plus a 1 s tail; with the track, its own bars. Sound: `src/sync.ts` places the
effects from the picture's own frames (the numeral locking, each product moment's contact frame, one
text sound per fragment, the moves between acts, the version landing, the lockup); the track carries
the film.
