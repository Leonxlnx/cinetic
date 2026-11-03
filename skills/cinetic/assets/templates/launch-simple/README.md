# launch-simple: the default launch film, played as a spine

A launch film is ONE sentence played as 3-5 acts: "[Name] [verb 1]s [the case], [verb 2]s it, ...". Each act is one
verb done to ONE case (the request typed, the record, the person: the brief's real words, names and numbers, the same
ones in every act) by ONE element whose form changes from act to act: the word "page" becomes the request pill
becomes the page becomes its Publish button becomes the Live pill becomes the first sign-up becomes the count becomes
the mark. Every scene change hands the element on, so the film never cuts from a line to a card; lines stand alone
only for the promise and the claim; the world is a designed place that takes one step per act; the lockup grows out of
the element's last form. 15-30 s. `new-film.sh` lays these files over the Remotion starter (`--template none` keeps
the starter's own acts). references/spine.md is the grammar; this file is how the template plays it.

## What you write (in this order)

1. **The spine, `src/spine.ts`, first.** Say the film as a chain ("A becomes B becomes C"): every "becomes" is a
   handover the form table knows (lib/spine `FORM_PAIRS`); a film that needs "and also" is two films.
   - `sentence` (8-16 words), `element` (one id), `case` ({ request, result, who, names, numbers }).
   - `acts`: 3-5, each { `verb`, `scenes`, `line?`, `strings`, `world?`, `devices?` }. A scene is { `form`, `name`,
     `beats?` (its weight in the act), `via?` (pin the handover that brings it in), `ui` (every string it shows) }.
     Forms: word, pill, chip, button, card, page, window, list, notice, thread, photo, count, world, mark.
   - Lines: act 1's promise (`place` alone, its key word `*starred*`; `becomes: 'pill'` turns that word into the next
     form), the middle acts' lines `inside` (the product's own words: a status, a label) or `around` (the giant line
     with the element stepping back behind it, then taking the frame again), the claim alone at the end if the film
     needs one. At most four lines; the pictures carry the rest.
   - `BARS` (the body with the lockup: 9-10 bars of the track for 20 s), `ACT_BARS` (whole bars, first 20-32 %,
     last 12-31 %), `CLOSE` (the one fact under the lockup, 2-6 words, only what the brief says).
   - Print the plan: `npx tsx -e "import { PLAN_PRINT } from './src/timeline'; console.log(PLAN_PRINT)"`, and
     `npx tsx scripts/grid-check.ts src/timeline.ts --part spine` (carry share, bare cuts, lines, the case, the end).
2. **The content, `src/content.ts`.** `node scripts/content.mjs --brief BRIEF.md --fetch --force` writes the cast,
   faces, notices and pictures from the brief; keep what is true of the product, and look at every picture before it
   plays (a picture of the brief's own subject or none: never a random stock photo).
3. **The scenes, `src/product.tsx`.** One `SCENE_DRAW` entry per scene name: a house scene from
   `src/acts/scenes.tsx` filled with the case, or a SceneDef of your own (`Draw`, `el`: the element's box on screen,
   `Content`: the element alone for the handover) built from `src/kit/screens`.
4. **The mark.** `scripts/brand.py <kit>` writes `src/brand/logo.ts`; the lockup draws it in one colour on the field.
   An invented brand gets a mark of its own (never a sparkle, a star or a letter that repeats the name).
5. **The deal, the music, the sound.** `deck.py` deals the world and the voice (`src/dealt.ts`); the track is picked
   and fitted to the bars (`music.mjs pick`, `get`, `track.py fit`); `npm run sound` cuts the effects to the picture
   (every handover by its kind, the keys, the press, the notices, the turn's sub drop, one hit on the lockup).

## The house scenes (src/acts/scenes.tsx): the device each verb asks for

| scene | form | verb (lib/spine VERB_DEVICES) | what the viewer sees |
|---|---|---|---|
| `wordScene()` | word | the promise, the claim | the line built word by word (each word born in the accent, rising, draining to ink; the row re-centring front-loaded); once read, its key word glides to the centre as a chip while the other words part, and swells into the next form |
| `promptScene()` | pill | asks, types, tells | macro-type: the request typed into a lit input; the camera pushes to macro on the caret and rides it, pulls back to read the request whole, a pointer presses send with a glow the size of the button |
| `siteScene(spec, 'page')` | page, window | writes, makes, builds | page-fly: the page the product makes writes itself section by section, filmed whole with its toolbar, then one push in toward the toolbar that the button scene carries on to the button (never a pan there and back, the toolbar never cut by the frame) |
| `siteScene(spec, 'button')` | button | publishes, presses | push-press on the same surface: one push onto the product's own button, a pointer presses it |
| `liveScene()` | pill | publishes, ships | the state the press makes in the product's own words (a line inside); a band of light crosses it as it lands, its dot pings once; the world's turn floods out of it |
| `noticeScene()` | notice, list | fills, arrives, notifies | toast-stack: notices drop into the front slot and push the stack back (blur 0 / 2.5 / 3 / 3.5 / 9, brightness 1 / .92 / .85 / .78 / .7, scale .943 a slot); a line around it steps the stack down and soft, then lifts away |
| `countScene()` | count | counts, grows, sells | glass-counter: the many fold into one figure that climbs in cut steps, the faces arriving beside it |
| `lockupScene()` | mark | the end | the mark grows from the point the last form converged to, large and alone (`LOCK.solo`), and pulls back into the lockup as the name slides out from behind it (under the mark), the fact under it, a band of light crossing it once whole; the whole keeps creeping in to the last frame (`LOCK.creep`) while the frame settles out with the ring-out |

Every scene keeps the house habits: one sharp plane; cards are the kit's lit material with the key across them
(`Lit`: 5-7 L* of light across the face, a top rim, an inner shade), facing the camera, never tilted at rest; the
camera makes one purposeful move a scene and that move lands on the scene's end, so a hold is the decaying tail of a
move (never a still frame for more than 0.8 s, never a float or a drift back); a scene's surroundings leave on the
handover's lead and arrive on its landing; its own copy of the element hides while the handover carries it. For more
devices and their numbers (entrances, builds, light sweeps, whips, counters, depth ladders), read
`references/motion-library/` (animations, effects, transitions, camera-type, items, backgrounds, content-pacing,
sound) and build them into a scene of your own.

## What is derived (src/timeline.ts)

- `SPINE_PLAN` (lib/spine planSpine on the track's bars, scenes timed by their `beats`): the contract the checks read.
- `HANDOVER_PLAN`: one handover per scene change (the scene's `via`, else the form table's recipe, the least used one
  first so a film plays several kinds). `acts/stage.tsx` draws each with fx/Handover: the out scene's box at its
  hand-over frame becomes the in scene's, each under its own camera; content never scaled. Same-surface, stay and
  part are drawn by the scenes themselves; every handover still declares its track (`sync.ts` declares, forensics
  `--spine` follows the element in it).
- `LINES`: where each line lives and its frames (whole on the music's 16th); `COPY`, `CUE`, `SEAMS`, `ACT`, `END`.
- The world (`src/world.tsx`): the dealt look (paleSky, nearWhite: a stage lit in the brand's hue with a floor glow;
  electric: the brand's colour field with its rings; blackField, deepField: a dark stage) stepping act by act
  (enter, closer, turn, pull-back: fx/world worldStepMoves, each move landing on its act's end, the planes in
  parallax); the turn floods out of the element into the opposite world (a light stage turns into the brand's field).
  A photograph is a world only of the brief's own subject (`assets.mjs plate`), graded and soft behind the element.

## The checks

`npm run check` (tsc, lint-film, grid-check), `grid-check.ts --part spine`, then on the draft (`render.sh --draft`,
with the sound): `forensics.py out/draft.mp4 --cues out/cues.json --spine` (the element in its box across every
handover, no undeclared swap, no text-then-cards) and `look-audit.py out/draft.mp4 --look` (no flat void, no plain
card slabs).
