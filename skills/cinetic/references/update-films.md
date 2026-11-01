# Update films: "vX is out"

Launch films and update films are the two first-class formats of cinetic. A launch film tells a product's story with
one signature shot. An update film says that a new version exists and shows what changed: the name and the version,
then each change filmed by a **hero shot** of the product doing the new thing, with one short centred line that says
the result, and the brand's mark pulling back into the lockup with the version. The update template
(`assets/templates/update`) builds all of it from one file and the film's content; this page is its shape, what you
write, what it deals and how to look at it early.

Contents: 1. The shape · 2. Start · 3. Writing the changes · 4. The hero shots · 5. The world and the picture rules ·
6. Sound · 7. Timing · 8. Look early, render in parts · 9. Gates and traps

## 1. The shape

| Beat | What happens | Length |
|---|---|---|
| Name and version | the product's name and the version, centred in the film's world, as one pair from frame 0 (`roll`: the old numerals roll to the new; `rise`: the version rises beside the name; `badge`: a dot lands and grows into the pill carrying it) | 1 bar |
| Change × 2-4 | a hero shot of the change (section 4) arriving on the film's optics, playing its one camera move and its moment, holding its result; and its line, 2-6 words, centred | 2-3 bars each, on half bars |
| End card | the mark as a solid, close up and turning, pulls back and lands on the flat mark; the name slides out of it; the version lands on the last bar line; held to the end | 1.5 bars and the tail (1.5 s or the track's ring-out) |

Each change takes its own shape (`src/deal.ts` SHAPES):

- `show`: the hero shot first; then it goes soft, dims into the world's deep tone and is pushed through a little (a
  focus isolate) while the line lands centred in front of it.
- `lead`: the line first, alone in the world (the shot before goes soft into the world), then the hero shot.
- `split` (once a film at most): the line first, parted round a porthole that opens in its gap with the shot inside (a
  shot of pictures shows its chosen picture there); the words leave and the porthole opens into the frame as the shot
  plays.

A line never follows a line: once a change opens on its picture, the later ones do too. Shots hand over through
optics, never a hard cut: each arrives on the film's `arrive` (racking sharp out of focus, a whip that brakes into the
shot, or a bloom of the world's light that settles; a four-change film alternates two of them) while the shot before
leaves under it, soft. Never "text on top, picture below": the line and the shot take turns in the middle of the
frame.

## 2. Start

```bash
bash scripts/new-film.sh <dir> --format update --name "<Product>" [--brand <kit>] [--music <file> --record <licence.json>]
cd <dir>
node scripts/content.mjs --brief BRIEF.md --fetch --force   # the people with real faces, pictures, the product's screens
npx tsx scripts/type-deal.ts --seed "<Product>"             # the type pairing (new-film.sh deals one from the name)
python3 scripts/deck.py --brief "..." --format update        # optional: deal a direction (the world, the hero shots)
```

Then write `src/update.ts` (section 3), replace the brand placeholders (the palette in `src/brand/tokens.ts`, the mark's
SVG with named parts in `src/brand/logo.ts`), fetch the world's photograph when the deal is a plate world (section 5),
and print the deal (template.json `deal.print`): the world, the hook, the arrival, the shapes, the end, each change's
hero shot and the lines' voice. `PIN` fixes a slot, `SEED` re-deals.

## 3. Writing the changes

`src/update.ts` holds the facts: the version, the one before it, and 2-4 changes. Each change:

| field | what it is |
|---|---|
| `words` | one plain sentence of 2-6 words, the result the user sees ("Join group hikes in one tap"), never a feature name |
| `key` | the words set apart in the accent |
| `title`, `sub` | the screen's own header, in the product's words |
| `show` | `tap` (rows, `action`, `done`, `result`, and `you`: the viewer the tap adds), `type` (the request typed and sent), `fill` (`list`, `grid` of photos or `week`, the `accent` item landing last), `swap` (before, after, a tag), `count` (from, to, unit, bars), `page` (`doc` or `site` from src/content.ts, its heading) |
| `photos` | 5 or more pictures the change is about (a grid of photos gives its own) |
| `logos` | 3 or more products it works with: their official marks (`node scripts/logos.mjs get <name> --film .`) |
| `hero`, `why` | a hero shot chosen by hand, and what in the change rules the dealt one out |
| `logo`, `logoName` | a change that names another product: "[]" in `words` where its mark sits |

- **People are real faces or absent**, never initials: `CONTENT.people[k].photo` from `src/content.ts`. Places and
  things the change is about are photos too (`node scripts/assets.mjs search`, then `get`).
- **The data holds up when paused.** One label per state (the button says "Joined"; nothing repeats it); the viewer's
  own action changes what the screen holds (three people, then you); a count on the screen matches what is on it.
- **Test it muted:** would a stranger say what changed in the same words? If a change cannot be shown as a state change
  (a fix, a speed-up), show its consequence: the number that changed (a count), the waiting that no longer happens.

A whole update (Cairnly 3.2, a trail app, three changes, about 27 s): "See the view before you climb" (six trail
photographs: a ring of them, the porthole holding the chosen view), "Trail reports arrive as they happen" (four reports
with hikers' faces: cards fanned in depth, the camera closing on the one that matters), "Join group hikes in one tap"
(the pointer presses Join hike, it turns to Joined and you join the three already going).

## 4. The hero shots

Each change is filmed by one hero shot (`src/acts/heroes.tsx`; `src/deal.ts` HERO_META, one line each, which deck.py
reads): a designed 3D or light shot of the product's own screen standing in the film's world. Each change takes the
first shot in the film's order (the deck's `hero`, else a seeded, recency-weighted shuffle from the name) that can film
it (`heroFit`), never one another change took while another fits; a film plays at least two different ones.

| the change | hero shot | on screen |
|---|---|---|
| a tap | `push-press` | the change's screen; a chunky pointer travels to its button with the camera following it in (a follow that lands framing the screen's answer, the header above the frame's edge); the press blooms a glow the size of the button and the result lands in frame |
| a typed request | `macro-type` | the input at macro scale (frosted glass over a photograph): a push onto the first characters, a follow of the caret as it types on a human cadence, a travel to send that lands on the press, a glow the size of the button |
| a list | `toast-stack` | the rows drop into the front slot as cards and push the stack back into depth: the front one sharp, each one further back softer (the lens's graded blur ladder), real faces and times; one push that lands as the last drops |
| a list | `fan-focus` | the rows as cards fanned back in depth (fx/depth FanFocus): the camera to one side closes on the card that matters while the focus racks to it |
| 5+ pictures | `carousel` | a ring of the pictures turning in depth; the camera cranes down from above to eye level as the ring slows and lands the chosen one facing the camera; it opens toward the lens as the focus follows; a smear only while it turns fast |
| a picture | `photo-develop` | the picture develops from a duotone in the world's light to full colour while a glass card with what it says rises in front of it and the focus racks to the card; one push that hands over to the line |
| a count | `glass-counter` | the figure in a slab of glass that frosts the world, counting as the camera pushes onto it with the bars rising; it lands with the figure; a band of light crosses the glass |
| a page or a week | `page-fly` | the page (the document or the site from src/content.ts, or the week) lies back in perspective and the camera travels it from the headline to what changed (fx/depth PageTravel), the far edge soft, a light along its near edge |
| a before and an after | `focus-swap` | the screen as it was goes soft, dims and falls back as the screen as it is now rises in front, the focus racking forward onto it and a light running its edge |
| 3+ products | `glass-tiles` | their official marks as milky glass tiles rising on an arc in depth (fx/three GlassTiles: 3D on a GPU, its flat version on software GL) |

Every shot carries the house habits: one focal plane and a graded falloff; one camera move with a job that lands
(declared shots only, so `checkShots`, lint-film `camera-shot` and forensics `camera-wander` read them: `src/sync.ts`
declares each shot's camera); the world behind it, soft and parallaxed; glass as a lens on the world; light sized to
its source and timed (a press, a landing); real content at density; a jump in scale; a smear only on fast moves.

Each hero shot is the change's product moment: the product used, its parts arriving on their beats and its state
changing on the hit. For a screen you build yourself the flat version is the starter's `ProductMoment`
(kit/moment.tsx), timed by `momentPlan`; set it on a `Plane` of the depth stage and give it one of the shot moves.

The end card is a hero shot too (`logo-3d`): the mark as an extruded solid in a gloss finish lit by the world's light,
an extreme close-up already turning, one pull-back that turns it to face the camera and lands it exactly on the flat
mark (97.5 f@60, thirteen 16ths at 120 BPM). On software GL it draws its CSS-3D solid (fx/three `SolidMark`: the mark's
face over slices of its silhouette receding in depth, a light gradient from the key, a soft shadow) unless `MARK_3D.gl`
is 'force'. The version lands as the accent numerals beside the name: the hook's pill never grows a second time.

**The update's own standard.** One still photograph under every scene, cards at rest tilted by a wide lens, hard cuts
between shots and a muddy ghost behind the last line are the faults it guards against; the template keeps:
- the world on the film's path (`acts/World.tsx` `PATH`, fx/world `worldPath`): it enters the place and moves on with every
  shot that arrives, landing after it; no shot draws its own copy of the world (it jumped at every change);
- cards square to the camera at rest (no resting yaw, pitch or roll in any shot's framing), the toast stack on an 85 mm
  lens with its times by slot (newest first, "now" in front);
- a shot leaving falls back (26 px soft, x0.88) and darkens into a dark world before it goes, whipping out ahead of a whip
  arrival; the porthole hands its picture to the shot through a 36 px blur (never a cross-dissolve of two sharp pictures);
- the 'show' line: the shot falls back into the world as the line lands and is gone 22 f@60 later; the line stands on the
  world with its pool (never a full-frame veil over a dimmed card);
- the change lines rotate their move (`LINES.move`), take three sizes (`LINE_SCALE`), the accent on one in three
  (`EMPH_SHARE`); the name is a wordmark in the hook too (`wordmarkAt`, an r before a stem 0.04 em clear);
- a tap's done state stays a solid button in the accent; no ring travels between the faces; the press's glow is clipped
  to the card;
- a face is a person: one photo carries one name through the film, the name content.ts cast with it (update.ts and
  precheck `cast` report it);
- the result held 0.8 s, the slack to the line's read before a still result; whole bars on the film's own grid as with a
  track. Two changes run about 17 s; three about 25 s at 120 BPM, so an 8-20 s update shows two.

## 5. The world and the picture rules

- **One world for the whole film** (fx/world, `references/lighting.md` §8), dealt as the `ground` slot (or the deck's
  world): a built field (nearWhite, paleSky, blackField, deepField, electric) or a photograph (clouds, sky, aerial, sea,
  nightCity, studio, macro). A photograph needs its plate: `node scripts/assets.mjs plate <kind>` saves a sheet; pick
  one for its light and a calm area where the line will sit (a horizon, layered hills, a soft sky; never a busy texture
  that fills the frame), then `--pick <n> --to public/plates --accent '<the accent>'`. The picture check wants 30 %
  neutral pixels: `assets.mjs grade <plate> --chroma 0.7` when it reads as one colour wash. Until the plate is in, a
  built world of the same tone stands in.
- **The product's surfaces follow the world:** light cards over a pale world or a photograph, dark ones on a night world
  or the electric stage; the hero input or pane is glass that frosts the world (fx/light Glass, kit Frost with the soft
  plate as its backdrop).
- **The changed UI fills the frame on its beat:** every hero shot lands with its subject 55-90 % of the frame.
- **Type from the pairing:** every line centred, one move and one exit a film, its key word in the accent; on a
  photograph the lines carry the world's soft type shadow; the end card's name in the pairing's wordmark weight, the
  version apart from it, lighter, in the accent (or in the pill the badge hook made).
- **The camera moves only inside a hero shot** (one declared move that lands) and in the mark's pull-back; every hold
  is still; nothing bobs or breathes; no card rests tilted.

## 6. Sound

An update film is cut to a licensed, human-made, instrumental track (`references/music.md`): `node scripts/music.mjs
search --mood "<the film's mood words>" --bpm 112-128 --length <s>`, `sheet --measure`, `get '#n' --to audio/music`,
then `python3 scripts/audio/track.py fit --end auto` once `update.ts` is written (its entry on the mark's arrival, its
final hit on the version mark). `src/sync.ts` places the effects on each hero shot's own beats: the press and the
answer, the keys and the send, each card dropping, the ring landing, the picture developing, the figure counting and
landing, the page landing, the after rising; one soft text sound per line; the arrivals and camera moves as quiet air.

## 7. Timing

Every change takes whole half bars (two bars at least); the last one squares the film so the lockup lands on a bar
line: the shot's arrival (0.3-0.6 s), its action (a press about 1.4 s, a typed request its own cadence, a stack 0.4 s a
card, a ring's crane about 1.9 s, a page's travel about 2.3 s), its result held (1.0 s when the line follows over it,
1.2 s when the shot ends the change), the line at the pace. At 120 BPM: two changes about 21 s, three about 27 s, four
about 33 s (keep four for a real need).

## 8. Look early, render in parts

A render that runs out of time loses the ending. So:

1. The end card first: `node scripts/frames.mjs end`.
2. Each hero shot as stills: `node scripts/frames.mjs sheet --frames <its h0>-<its hit + 30> --every 6` (the frames:
   `npx tsx -e "import { TIMES } from './src/timeline'; console.log(TIMES)"`). Judge: is the subject sharp and the rest
   on a ladder, does the move land, does the world hold, is anything cut by the frame's edge.
3. The whole film as a draft: `bash scripts/render.sh Film out/draft.mp4 --draft` (half size, parts it resumes), then
   `node scripts/frames.mjs sheet --from out/draft.mp4 --every 36` and one sheet per act at `--every 6`.

## 9. Gates and traps

- `npm run check` (tsc, lint-film, grid-check) and the ship gate apply as for any film; `grammar-score.mjs --format
  update` reads the update band. grid-check warns that a shot beat over 3.5 s runs long: let the slack go to the line.
- Traps: no name in the first 3 s; a feature list in text; a change with `photos` or a grid shown as a list (its hero
  shot cannot show the pictures); initials instead of faces; a label repeated on one card; a count the viewer's action
  should change and does not; a plate world left on its stand-in; a busy plate behind the lines; a music bed added
  after the cut; rendering the whole film before looking at the end card.
