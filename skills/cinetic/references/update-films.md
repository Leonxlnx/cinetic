# Update films: "vX is out"

Launch films and update films are the two first-class formats of cinetic. A launch film tells a product's story in
15-45 s with one signature shot. An update film says that a new version exists and shows what changed, in 8-20 s,
with the same craft: a short script told one clean line at a time, each line with its own text animation, graphic
effects around it, a licensed track, the product doing the new thing. This page is the shape, the tools and the traps
of the update film.

Contents: 1. The shape · 2. The tools · 3. Writing the changes · 4. Picture · 5. Sound · 6. Timing table ·
7. Gates and traps

## 1. The shape

| Beat | What happens | Length (house) |
|---|---|---|
| Name and version | the product's name and the version on frame 0, already moving: the name over giant numerals cropped by the frame, the last numeral rolling from the old value to the new, or the mark in its world; the first line says both ("Plumb 2.4 is out.") by 3 s | about 1 bar (2 s) |
| Change × 2-4 | each change is **one sentence and its moment**: the camera arrives on the product's surface, the product does the new thing on its beat (a review approved, a reply landing, a figure starting to climb), and one short sentence of 2-6 words says the result the user sees | two bars each (every act line on a downbeat) |
| Payoff | the one change that matters most, or all of them seen together (the camera pulls back over every change while the version swings back in front) | about 1 bar |
| End card | the mark and the name, with the version as the one practical fact; built from the film's device, then the one still hold | to a whole bar, plus a 1 s tail |

- **Never a changelog.** A change is never a list row, a bullet or a line of text describing a feature. It is the
  product's real state change on its hit frame, at film size.
- **The formula:** "[Name] [version]" first, then one line per change, each a result the user sees, then the name
  and the version on the end card. 4-6 lines in all, 2-6 words each, plain words, one line on screen at a time, at
  72 px or more. A change's line says what the picture just did ("Approvals take one tap." as the approval lands),
  never what it is about to do, never a feature name ("Smart Approvals."), never a fancy word ("Approvals,
  reimagined."). `python3 scripts/copy-check.py TREATMENT.md --format update` checks it.
- **The version is the film's one honest number.** It opens the film or closes it, never both as the same still.
- **Device variety.** Each change gets its own device from a different family (a press, a make-room, a counter, a
  morph into the next change) and its line its own text animation, joined by the film's one camera. Repeating one device for every change reads as a
  template; the device book's "Update change" row in [the index](devices/INDEX.md) lists the first picks.
- **One signature shot**, on the hook, the payoff or the end card, as the dealt direction says.

## 2. The tools

- **Directions.** `python3 scripts/deck.py --brief "<one line>" --format update --changes 3 --options 3` deals three
  directions that make update films. Every direction carries an update skeleton (hook, change, payoff, end); the sheet
  times it for the number of changes (`--changes 2-4`), says how one change hands over to the next, and asks for one
  short sentence per change. `--format update` implies `--have number` (the version is the honest number).
- **Devices.** `python3 scripts/pick.py --format update --seconds 14` draws one text animation per line (`--lines`,
  4-6 by default) and, for the picture, the hook, a product moment and the end card first, from entries made for update films and from launch, feature and sting entries. It reads the dealt sheet
  (`out/direction.json`) for the format, length and `--have`; typing, caret and cursor devices come only with
  `--have input` (the product is used by typing or pointing), UI devices only with `ui`.
- **The template.** `bash scripts/new-film.sh <dir> --format update [--brand <kit>] [--music <file> ...]` lays the
  update template over the starter: the facts in `src/update.ts` (the version, the one before it, each change as one
  sentence and the moment it uses), a timeline that places them on the grid, one camera along one strip so every act line carries
  its speed, and the sound placed from the picture's own frames. It sets the crisp pace at 120 BPM until a track sets
  the tempo. `template.json` has a music slot: the scaffold tells you how to fill it when `--music` is left out.
- **The product.** `src/kit` is the floor for the product moments (`ProjectPanel`, `ChatCard`, `FeedCard`,
  `StatCard`, `ApprovalsCard` and the rest, each with a live state switch). Rebuild the product's own screens for film
  (every web size ×1.9, nothing under 36 px), and give each change its real state change on its hit frame
  (`references/product-ui.md`). The full-frame moment below is built with `ProductMoment` and `momentPlan`.
- **The brand.** `--brand <kit>` runs `scripts/brand.py`: tokens, the logo's parts, the name, fonts, screenshots
  (`references/brand-kits.md`).

## The full-frame product moment (every launch and update film)

Every film shows the product used once at full size: its own interface filling the frame on a flat field, not a
stand-in for it (a tile grid, a thin curve on a photo, grey bars) and not a small card in a world. A viewer who
never saw the product should see what it does from this one moment, muted.

- **Picture.** The window at about 88 × 80 % of the frame (`MOMENT`), centred on one flat colour (the kit theme's
  ground: no relief, footage or plate behind it); the camera locks or creeps under 3 % for the read.
- **The product's own UI and data.** The real screens rebuilt at film size from the product's data module: its
  strings, numbers, names and pictures (the sample products only until the real ones exist).
- **Parts on beats.** Three or more parts enter one after another on the grid at about two starts a second
  (window, list, chart, button...), each cut on whole at full ink and sliding home (`entering()`); while one part
  arrives the one before is still settling, so two things move at once.
- **The real state change on the hit frame.** One thing the product does changes state on a beat: a badge flips
  to approved, a reply lands, a figure starts to climb, a search returns. Typing or a pointer only when the product
  is used that way.
- **In the beat sheet** this beat answers one question: which real UI state changes here, on which frame.

```tsx
import { momentPlan, ProductMoment, entering, ProjectPanel } from '../kit';
const plan = momentPlan({ start: CUE.product, parts: ['window', 'selects', 'count', 'button'], beat: BEAT }, film);
<ProductMoment frame={frame} plan={plan}>
  {(s, box) => <ProjectPanel frame={frame} w={box.w} h={box.h} doneAt={plan.hit} style={entering(s.t('window'))} />}
</ProductMoment>
```

`momentPlan` places the entrances on the beat, half beat or two beats nearest half a second, the state change one
step after the last entrance (or on `hit`) and a 36 f hold after it; `momentState` gives each part's entrance and
`done` from the hit frame on. In an update film each change is a smaller product moment on the shared surface;
the payoff or one change is the full-frame one.

## 3. Writing the changes

`src/update.ts` holds the facts. Write each change as **one sentence and its moment**:

| `words`: one sentence, 2-6 words | `moment`: the state change on its hit frame |
|---|---|
| "Approvals take one tap." | the review badge flips to approved under one press |
| "Replies land in the thread." | a reply bubble lands under its parent, the thread re-flowing |
| "Budgets update as you spend." | a new entry drops in and the remaining figure counts down |
| "Search answers before you stop typing." | the results arrive while the caret is still moving |

**A whole update script (Plumb 2.4, 14 s).**

| # | Role | Line | Words |
|---|---|---|---|
| 1 | name and version | Plumb 2.4 is out. | 4 |
| 2 | change | Approvals take one tap. | 4 |
| 3 | change | Replies land in the thread. | 5 |
| 4 | change | Counts update as you watch. | 5 |
| 5 | close | Update Plumb today. | 3 |

- `words`: written after you know what the picture shows; it says what the viewer just saw, in a person's words. At
  the template's 120 BPM a change's two bars hold a line of 2-6 words read in full, at any track from 100 to 140 BPM. `update.ts` refuses anything outside 2-6 words.
- `moment`: one state change you can point at on a frame, never a list row or a bullet.

Then test it like a launch film's lines: would a stranger, watching muted, say what changed in the same words? Is it
specific to this product's version, or true of any update? If a change cannot be shown as a state change (a
performance gain, a fix), show its consequence: the waiting that no longer happens, the number that changed.

## 4. Picture

- The update film is short, so the world must be established in the hook: the direction's space, light and camera
  are visible from frame 0.
- One camera along one strip (or the direction's own path): every change sits on the same surface, and each act line
  is a velocity seam (the camera's speed carries through the cut).
- Pictures only as an accent: the product's own screens first; a found picture only when it carries a change
  (`references/imagery.md` §0).
- The payoff is the widest frame of the film; the end card is not a second payoff. Lockup rules are the launch
  film's (`references/concept-and-story.md`, the end card).

## 5. Sound

Like every cinetic film, an update film is cut to a licensed, human-made, instrumental track
(`references/music.md`). Find it first, for this film: `node scripts/music.mjs search --mood "<the film's mood
words>" --bpm 118-132 --length <s>` (118-132 BPM suits two bars a change), `sheet --measure`, then `get '#n' --to
audio/music` (its licence record beside it; never the last film's track). Bring it in with `new-film.sh --music
<file> --record <licence.json>` (or a track found elsewhere with `python3 scripts/audio/track.py add`), then `track.py edit --bars N --reveal-bar K --end
stop|button|ring`, `track.py grid` and `track.py check`: `src/music.ts` then carries the track and `b()` follows its
bars. The effects mark the version locking, each change's contact frame, one soft sound per line, the moves
between acts, and the one element at the lockup (`references/sound.md`). A short update film often ends on `button`
(the track's own last hit) or `stop`.

## 6. Timing table

At 120 BPM (a 2 s bar), two bars a change, every act line on a bar line (with the track, on a downbeat):

| Changes | Body | With the tail |
|---|---|---|
| 2 | 14 s | 15 s |
| 3 | 18 s | 19 s |
| 4 | 22 s | 23 s |

With a track, its own bars decide; the shot band for the format is 0.7-1.4 s median (`GRAMMAR.shot.band.update`),
shorter than a launch film's.

## 7. Gates and traps

- `grid-check.ts` and the ship gate apply as for any film; `grammar-score.mjs --format update` reads the update band.
- Traps: no name in the first 3 s (a version number alone does not say which product); a list of features in text, or a keyword per change instead of a sentence; the same device or the same text
  animation on every change; the version shown twice as the same still;
  the product too small to read (push in until the changed state fills the frame); a music bed added after the cut
  (cut the picture to the track, never the reverse); an end card that sits still for longer than the beat.
