# Update films: "vX is out"

Launch films and update films are the two first-class formats of cinetic. A launch film tells a product's story with
one signature shot. An update film says that a new version exists and shows what changed, played as a **spine**
(`references/spine.md`): ONE session (one person doing one task that uses each change in turn), the same case (names,
places, numbers) in every act, and ONE element handed on from scene to scene. The version's pill in the hook is that
element; each change is an act whose **hero shot** draws it in that act's form (a picture, a stack of notices, a card
and its button); the last form converges into the brand's mark as a solid, which pulls back into the lockup with the
version. The update template (`assets/templates/update`) builds all of it from one file and the film's content; this
page is its shape, what you write, what it deals and how to look at it early.

Contents: 1. The shape · 2. Start · 3. Writing the session and the changes · 4. The hero shots · 5. The handovers and
the lines · 6. The world and the picture rules · 7. Sound · 8. Timing · 9. Look early, gates and traps

## 1. The shape

| Act | What happens | Length |
|---|---|---|
| Hook | the product's name and the version in its accent pill, centred in the film's world (`roll`: the old numerals roll to the new in the pill; `rise`: the pill rises beside the name; `badge`: a dot lands and grows into the pill). The name leaves as the pill lifts: the pill is the element | 1 bar |
| Change × 2-3 | the element lands in the change's hero shot (section 4) through a handover (section 5) while the shot before falls back soft; the shot plays its one camera move and its moment; its line (2-6 words) meets the element; the held result keeps creeping on the tail of the shot's last move | whole bars, as its content needs |
| Lockup | the last form collapses into a spark; the mark grows from it as a solid, turned; one pull-back lands it exactly on the flat mark; the name slides out; the version lands on the bar line that ends the body; held to the end, still creeping toward the lens | 2 bars and the tail (1.5 s or the track's ring-out) |

The film reads as one sentence: `[Name] [version] [session]: [verb], [verb], [verb]` ("Cairnly 3.2 plans Saturday's hike
on Ridge Loop: see, arrive, join"), and its chain as forms joined by handovers: `pill -grow-> photo -converge-> notice
-grow-> card -same-surface-> button -converge-> mark`. `src/timeline.ts` builds the spine (`SPINE`), plans it on the
music grid (`SPINE_PLAN`, lib/spine `planSpine`) and derives every frame from it: no carry boxes, no seam pins and no
arrival shapes to write by hand. Two changes for an 8-20 s update; three run 20-25 s.

## 2. Start

```bash
bash scripts/new-film.sh <dir> --format update --name "<Product>" [--brand <kit>] [--music <file> --record <licence.json>]
cd <dir>
node scripts/content.mjs --brief BRIEF.md --fetch --force   # the people with real faces, pictures, the product's screens
npx tsx scripts/type-deal.ts --seed "<Product>"             # the type pairing (new-film.sh deals one from the name)
python3 scripts/deck.py --brief "..." --format update        # optional: deal a direction (the world, the hero shots)
```

Then write `src/update.ts` (section 3), replace the brand placeholders (the palette in `src/brand/tokens.ts`, the mark's
SVG with named parts in `src/brand/logo.ts`; a real company's mark is its official file: `node scripts/logos.mjs get
<name> --film .`), and print the deal (template.json `deal.print`): the world, the hook, the placements, the end, each
change's hero shot and the lines' voice. `PIN` fixes a slot, `SEED` re-deals. Print the spine with `npx tsx -e "import {
SPINE_PLAN } from './src/timeline'; import { chainSentence } from './src/lib/spine'; console.log(chainSentence(SPINE_PLAN),
SPINE_PLAN.issues)"`.

## 3. Writing the session and the changes

`src/update.ts` holds the facts: the version, the one before it, the `session` (the one task, as a verb phrase: "plans
Saturday's hike on Ridge Loop"), its `case` (`request`: the record every act touches, as the screens write it; `names`
and `numbers` as they appear on screen) and 2-3 changes **in the order the session meets them**, never by importance.

| field | what it is |
|---|---|
| `words` | one plain sentence of 2-6 words, the result the user sees ("Join group hikes in one tap"), never a feature name |
| `key` | the words set apart in the accent |
| `verb` | the act's verb in the sentence ('see', 'arrive', 'join'): it picks the hero shots that can film it (lib/spine `devicesFor`: types, writes, sends or joins, fills or arrives, chooses, counts, shows pictures, works with) |
| `place` | how its line meets the element, else dealt: `part` (the porthole, once a film) or `head` (over the element) |
| `title`, `sub` | the screen's own header, in the product's words: the case's names and numbers belong here |
| `show` | `tap` (rows, `action`, `done`, `result`, and `you`: the viewer the tap adds), `type` (the request typed and sent), `fill` (`list`, `grid` of photos or `week`, the `accent` item landing last), `swap` (before, after, a tag), `count` (from, to, unit, bars), `page` (`doc` or `site` from src/content.ts, its heading) |
| `photos` | 5 or more pictures the change is about (a grid of photos gives its own) |
| `logos` | 3 or more products it works with: their official marks (`node scripts/logos.mjs get <name> --film .`) |
| `hero`, `why` | a hero shot chosen by hand, and what in the change rules the dealt one out |
| `logo`, `logoName` | a change that names another product: "[]" in `words` where its mark sits |

- **One case, every act.** The same trail, person or file recurs in each change's screen (its title, its rows): grid-check
  `spine-case` and data-check follow `case` through the screens' strings. A change that cannot touch the case belongs
  in another film.
- **People are real faces or absent**, never initials: `CONTENT.people[k].photo` with the name content.ts cast with it.
  One face is one person through the film. Places and things are photos too (`node scripts/assets.mjs search`, `get`).
- **The data holds up when paused.** One label per state (the button says "Joined"; nothing repeats it); the viewer's
  own action changes what the screen holds (three people, then you); a count matches what is on the screen.
- **Test it muted:** would a stranger say what changed, and that it is one session? If a change cannot be shown as a
  state change (a fix, a speed-up), show its consequence: the number that changed, the wait that no longer happens.

A whole update (Cairnly 3.2, a trail app, about 22 s): the session plans Saturday's hike on Ridge Loop. The 3.2 pill
grows into a rounded window in the line "See the view [ ] before you climb" holding the summit photograph; the window
opens into the shot and the photo develops under a glass card (Ridge Loop summit, 12 km · 640 m up). The photo collapses
into a spark from which the first trail report grows; the reports on Ridge Loop stack in depth under "Trail reports
arrive as they happen". The front report opens into Saturday's hike card; the camera rides it to "Join hike", the press
turns it to "Joined" and you join the three already going; the button collapses into the cairn, which pulls back into
"Cairnly 3.2".

## 4. The hero shots

Each change is filmed by one hero shot (`src/acts/heroes.tsx`; `src/deal.ts` HERO_META, one line each, which deck.py
reads): a designed 3D or light shot of the product's own screen standing in the film's world, drawing the element in its
form (`src/timeline.ts` HERO_FORMS). Each change takes the first shot in the film's order (the deck's `hero`, else a
seeded, recency-weighted shuffle from the name) that can film it (`heroFit`), the ones its verb asks for first, never
one another change took while another fits; a film plays at least two different ones.

| the change | hero shot | the element | on screen |
|---|---|---|---|
| a tap | `push-press` | card, then its button | the change's screen; a chunky pointer travels to its button with the camera following it in (the second form reached on the same surface); the press blooms a glow the size of the button and the result lands in frame |
| a typed request | `macro-type` | input, then send | the input at macro scale: a push onto the first characters, a follow of the caret as it types on a human cadence, a travel to send that lands on the press |
| a list | `toast-stack` | the front notice | the rows drop into the front slot as cards and push the stack back into depth on the lens's graded blur ladder, real faces and times; one push that lands as the last drops |
| a list | `fan-focus` | the list | the rows as cards fanned back in depth: the camera to one side closes on the card that matters while the focus racks to it |
| 5+ pictures | `carousel` | the chosen picture | a ring of the pictures turning in depth; the camera cranes down to eye level as the ring lands the chosen one facing the camera |
| a picture | `photo-develop` | the picture | the picture develops from a duotone in the world's light to full colour while a glass card with what it says rises in front of it and the focus racks to the card |
| a count | `glass-counter` | the figure | the figure in a slab of glass, counting as the camera pushes onto it with the bars rising; a band of light crosses the glass on the landing |
| a page or a week | `page-fly` | the page | the page lies back in perspective and the camera travels it from the headline to what changed |
| a before and an after | `focus-swap` | the card | the screen as it was goes soft and falls back as the screen as it is now rises in front, the focus racking onto it |
| 3+ products | `glass-tiles` | the tiles | their official marks as milky glass tiles rising on an arc in depth (fx/three GlassTiles) |

Every shot carries the house habits: one focal plane and a graded falloff; one camera move with a job that lands
(declared, `src/sync.ts` hands each shot's camera to the checks); cards square to the camera at rest; light sized to its
source and timed; real content at density; a jump in scale. A shot whose line rides over its element opens a little wider
with the element low in the frame, leaving the band above it for the line.

Each hero shot is the change's product moment: the product used, its parts arriving on their beats and its state
changing on the hit. For a screen you build yourself the flat version is the starter's `ProductMoment`
(kit/moment.tsx), timed by `momentPlan`; set it on a `Plane` of the depth stage and give it one of the shot moves, and
add its element's box to `heroElement` so the handovers can carry it.

The lockup is a hero shot too (`logo-3d`): the mark as an extruded solid lit by the world's light, grown out of the
converge's spark already turned, one pull-back that faces it to the camera and lands it exactly on the flat mark. On
software GL it draws its CSS-3D solid (fx/three `SolidMark`) unless `MARK_3D.gl` is 'force'. The version lands as accent
numerals beside (or under) the name: the hook's pill never grows a second time.

## 5. The handovers and the lines

**Every change of scene carries the element** (`src/timeline.ts` HANDS; fx/Handover draws them). The element's box,
corner, rim and content travel from where the shot before draws it (under that shot's camera) to where the next shot
draws it (under its camera), its content a window onto each shot's own pixels, never scaled; the shot before falls back
(soft, dimmer, a little smaller) and is gone by the cut, the next one racks in behind the landing element, so two
pictures never cross-dissolve. Each act boundary takes a recipe of its form pair (lib/spine FORM_PAIRS) that the stage
draws, the least used first (grow, fly, swell, shrink); a pair with none goes through a point (converge: the many
collapse into a spark and the next element grows from it); a notice, a photo or a card that opens into the next screen
grows into it; the lockup always grows out of a converge. A two-form shot's second form is reached on its own surface
(the camera rides the card to its button: a same-surface change). `src/sync.ts` declares each handover's box on every
frame, and the porthole's, so forensics `--spine` checks that a crisp element stands where the film says it is.

**Lines meet the element** (`src/deal.ts` PLACES): the hook's line stands alone and becomes the pill; between, no line
stands alone:
- `part` (around, once a film, never on a line carrying a mark): the line builds round a gap, the element flies into it
  as a rounded window holding its shot (a shot of pictures shows its chosen picture, in the world's duotone); the words
  leave and the window opens into the frame, handing its picture to the shot through a blur.
- `head` (inside): the line arrives as the element lands and rides over it in the shot's space, centred above it (or
  under it when the element fills the top); it leaves once read as the shot's action starts.
The parted line is the film's statement (a larger size band); the riding lines are set smaller, as the shot's heading.
The lines rotate their move (`LINES.move`), one whole-line exit a film, the accent on one line in three.

## 6. The world and the picture rules

- **One world for the whole film** (fx/world `WorldSteps`), dealt among the lit dark fields where glass and rims read
  (blackField, deepField, electric). nearWhite, paleSky and the photographs (clouds, sky, aerial, sea, nightCity, studio,
  macro) come by `PIN` when the brief names the place: `node scripts/assets.mjs plate <kind>`, then `--pick <n> --to
  public/plates --accent '<the accent>'`; a plate is graded and stands soft behind the type.
- **The world takes one step per act** on the spine's act cuts (lib/spine world steps: enter, closer, light, pull-back:
  a push that carries the cut and lands, the key climbing, a pool of light rising from the floor), and holds inside an act.
- **Never a still frame:** a held result keeps creeping on the tail of its shot's last move (about 0.07 % a frame at 60
  fps, about the element), the lockup creeps toward the lens to the last frame. Never a float, a bob or an aimless pan;
  no card rests tilted.
- **The product's surfaces follow the world:** dark cards with lit rims on a dark world, glass that frosts the world for
  the hero input or a caption; the changed UI fills the frame on its beat (its subject 55-90 % of the frame).
- **Type from the pairing:** every line centred; the name a wordmark in the hook (tracked so no two letters touch); the
  version apart from the name, lighter, in the accent.

## 7. Sound

An update film is cut to a licensed, human-made, instrumental track (`references/music.md`): `node scripts/music.mjs
search --mood "<the film's mood words>" --bpm 112-128 --length <s>`, `sheet --measure`, `get '#n' --to audio/music`,
then `python3 scripts/audio/track.py fit --end auto` once `update.ts` is written (the track's entry on the lockup's bar,
its final hit on the version mark). `src/sync.ts` cuts the effects to the picture: a handover's air starts 4 f@60 before
its cut and peaks 3 f after it, a converge draws in to its spark and the spark pops, the element's landing sounds on the
frame it lands; each hero shot's own moment on its frames (the press and the answer, the keys and the send, each card
dropping, the picture developing, the figure landing); one text sound per line a few frames after it is read; nothing on
a start. `npm run sound` builds and meters it; rebuild it after every timing change.

## 8. Timing

Acts are whole bars (`actBars`): the element's landing (the handover's house frames, or for a parted line its read and
the window opening), the shot's action (a press about 1.2 s, a typed request its own cadence, a stack 0.4 s a card, a
develop about 1.2 s), its result held (0.75 s; the last change 0.55 s, the converge carries it on), a riding line's read,
the next handover's lead; the last act adds the lockup's two bars. A two-form shot starts its action on the act's middle
beat (where the plan puts its second scene). The cuts sit on the beat; landings follow the handovers' house frames
(OFFGRID says so for the checks).

## 9. Look early, gates and traps

1. The lockup first: `node scripts/frames.mjs end`.
2. A sheet of the whole film: `node scripts/frames.mjs sheet --frames 0-<TOTAL> --every <about TOTAL/20>`; then each
   handover at `--every 2` round its span (`HANDS`: `t0`-`t1`). Judge: does one element read across the cut, is the shot
   before gone by it, does the line sit clear of the element, does every hold still move.
3. The draft with its sound: `bash scripts/render.sh Film out/draft.mp4 --draft` (half size, parts it resumes).

Gates: `npx tsx scripts/grid-check.ts src/timeline.ts --part spine` (one session in 3-4 acts, the element on the scene
changes, the case in the acts, lines placed, the lockup from the last form), then the default run; `python3
scripts/forensics.py out/draft.mp4 --cues out/cues.json --spine` (the element in its box across every handover, no
undeclared swap, no pixel text-then-cards); `python3 scripts/look-audit.py out/draft.mp4 --look` (no flat void, no plain
card slabs). Traps: a feature list in text; changes ordered by importance instead of by the session; a change that does
not touch the case; a change with `photos` shown as a list; initials instead of faces; a label repeated on one card; a
drawn stand-in for a real company's mark; a fourth change (a second film); rendering the whole film before looking at
the lockup.
