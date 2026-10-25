# Update films: "vX is out"

Launch films and update films are the two first-class formats of cinetic. A launch film tells a product's story in
15-45 s with one signature shot. An update film says that a new version exists and shows what changed, in 8-20 s,
with the same craft: calm fragments, a rich picture, a licensed track, the product doing the new thing. This page is
the shape, the tools and the traps of the update film.

Contents: 1. The shape · 2. The tools · 3. Writing the changes · 4. Picture · 5. Sound · 6. Timing table ·
7. Gates and traps

## 1. The shape

| Beat | What happens | Length (house) |
|---|---|---|
| Hook | the version or the product's mark on frame 0, already moving: giant numerals cropped by the frame with the last numeral rolling from the old value to the new, or the mark in its world | about 1 bar (2 s) |
| Change × 2-4 | each change is a **product moment**: the camera arrives on the product's surface, the product does the new thing on its beat (a review approved, a reply landing, a figure starting to climb), and one fragment of 1-3 words names what was just seen | about 1-1.5 bars each |
| Payoff | the one change that matters most, or all of them seen together (the camera pulls back over every change while the version swings back in front) | about 1 bar |
| End card | the mark and the name, with the version as the one practical fact; built from the film's device, then the one still hold | to a whole bar, plus a 1 s tail |

- **Never a changelog.** A change is never a list row, a bullet or a line of text describing a feature. It is the
  product's real state change on its hit frame, at film size.
- **1-3 words a fragment**, at line size (120 px) or larger; 15 words in all at most. The words name what the
  picture just did ("Reviews, approved." after the approval lands), never what it is about to do.
- **The version is the film's one honest number.** It opens the film or closes it, never both as the same still.
- **Device variety.** Each change gets its own device from a different family (a press, a make-room, a counter, a
  morph into the next change), joined by the film's one camera. Repeating one device for every change reads as a
  template; the device book's "Update change" row in [the index](devices/INDEX.md) lists the first picks.
- **One signature shot**, on the hook, the payoff or the end card, as the dealt direction says.

## 2. The tools

- **Directions.** `python3 scripts/deck.py --brief "<one line>" --format update --changes 3 --options 3` deals three
  directions that make update films. Every direction carries an update skeleton (hook, change, payoff, end); the sheet
  times it for the number of changes (`--changes 2-4`), says how one change hands over to the next, and keeps every
  fragment at 1-3 words. `--format update` implies `--have number` (the version is the honest number).
- **Devices.** `python3 scripts/pick.py --format update --seconds 14` draws the hook, a product moment and the end card
  first, from entries made for update films and from launch, feature and sting entries.
- **The template.** `bash scripts/new-film.sh <dir> --format update [--brand <kit>] [--music <file> ...]` lays the
  update template over the starter: the facts in `src/update.ts` (the version, the one before it, the changes and the
  moment each uses), a timeline that places them on the grid, one camera along one strip so every act line carries
  its speed, and the sound placed from the picture's own frames. It sets the crisp pace at 120 BPM until a track sets
  the tempo. `template.json` has a music slot: the scaffold tells you how to fill it when `--music` is left out.
- **The product.** `src/kit` is the floor for the product moments (`ProjectPanel`, `ChatCard`, `FeedCard`,
  `StatCard`, `ApprovalsCard` and the rest, each with a live state switch). Rebuild the product's own screens for film
  (every web size ×1.9, nothing under 36 px), and give each change its real state change on its hit frame
  (`references/product-ui.md`).
- **The brand.** `--brand <kit>` runs `scripts/brand.py`: tokens, the logo's parts, the name, fonts, screenshots
  (`references/brand-kits.md`).

## 3. Writing the changes

`src/update.ts` holds the facts. For each change write:

- `words`: a product fact in 1-3 words, written after you know what the picture shows ("Replies, threaded.",
  "Budgets live.", "Faster search.").
- `moment`: how it is shown, as one state change you can point at on a frame: a badge flipping to approved, a
  reply bubble landing under its parent, a figure counting from its old value, a search returning before the cursor
  stops.

Then test it like a launch film's proof: would a stranger, watching muted, say the change's own word? Is it
specific to this product's version, or true of any update? If a change cannot be shown as a state change (a
performance gain, a fix), show its consequence: the waiting that no longer happens, the number that changed.

## 4. Picture

- The update film is short, so the world must be established in the hook: the direction's space, light and camera
  are visible from frame 0.
- One camera along one strip (or the direction's own path): every change sits on the same surface, and each act line
  is a velocity seam (the camera's speed carries through the cut).
- Real imagery works here too: the product in its place, the material of its world (`references/imagery.md`).
- The payoff is the widest frame of the film; the end card is not a second payoff. Lockup rules are the launch
  film's (`references/concept-and-story.md`, the end card).

## 5. Sound

Like every cinetic film, an update film is cut to a licensed, human-made, instrumental track
(`references/music.md`). Pick it first: the dealt direction lists shortlist tracks in its tempo range
(`deck.py --show`); 116-128 BPM suits one bar a change. Bring it in with `new-film.sh --music <file>` and its licence
flags (or later `python3 scripts/audio/track.py add`), then `track.py edit --bars N --reveal-bar K --end
stop|button|ring`, `track.py grid` and `track.py check`: `src/music.ts` then carries the track and `b()` follows its
bars. The effects mark the version locking, each change's contact frame, one soft sound per fragment, the moves
between acts, and the one element at the lockup (`references/sound.md`). A short update film often ends on `button`
(the track's own last hit) or `stop`.

## 6. Timing table

At 120 BPM (a 2 s bar), one bar a change:

| Changes | Body | With the tail |
|---|---|---|
| 2 | 12 s | 13 s |
| 3 | 14 s | 15 s |
| 4 | 16 s | 17 s |

With a track, its own bars decide; the shot band for the format is 0.8-1.6 s median (`GRAMMAR.shot.band.update`),
shorter than a launch film's.

## 7. Gates and traps

- `grid-check.ts` and the ship gate apply as for any film; `grammar-score.mjs --format update` reads the update band.
- Traps: a list of features in text; the same device on every change; the version shown twice as the same still;
  the product too small to read (push in until the changed state fills the frame); a music bed added after the cut
  (cut the picture to the track, never the reverse); an end card that sits still for longer than the beat.
