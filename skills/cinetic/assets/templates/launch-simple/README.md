# launch-simple: the default launch film, assembled from the scene bank

A launch film is ONE sentence played as 3-5 acts: "[Name] [verb 1]s [the case], [verb 2]s it, ...". Each act is one
verb done to ONE case (the request typed, the record, the person: the brief's real words, names and numbers, the same
in every act) by ONE element whose form changes from scene to scene. The scenes are house scenes from the bank
(`src/scenes`): each is one moment of 1.5-3 s that shows a point and is understood (the request typed at macro scale,
the page writing itself, send pressed with a pointer, the payments stacking up, a title decoding, the mark born from
two blobs). A film is 8-12 scenes, two big ones at least, about 15-25 s. Each scene runs 1.5-3 s, a scene of your own
too (the lockup 2.5 s at most): the timeline refuses a longer one with an error naming the scene and its length, and
grid-check fails a shot over 3.2 s. Each point is a big line on clean ground, read in 1.2 s, and then its scene; every
scene change hands the element on, so the film never cuts from a line to a card. `new-film.sh` lays
these files over the Remotion starter. references/spine.md is the grammar; this file is how the template plays it.

## What you write (in this order)

1. **The spine, `src/spine.ts`, first.** Say the film as a chain ("A becomes B becomes C"); a film that needs "and
   also" is two films.
   - `sentence` (8-16 words), `element` (one id), `case` ({ request, result, who, names, numbers }).
   - `acts`: 3-5, each { `verb`, `scenes`, `line?`, `strings`, `world?`, `devices?` }. A scene is { `form`, `name`,
     `bank?`, `props?`, `via?`, `ui?` }: `form` the element's form as the scene hands it on (word for a line; a bank
     scene's own: macro-type a button, page-fly a page, toast-stack a notice, decode-title a button, type-flip a word, a
     lockup the mark); leave `bank` out: the deal casts every scene at random (the film's name and the last films seed
     it, its act's verb and big scenes pull it, never one twice, two of the last film's at most); `bank` with `why`
     redraws a dealt slot (the reason is printed in the plan; grid-check fails a redraw without one); `props` its
     content in the case's own words (each scene's props: `src/scenes/<id>.tsx`), left out it fills itself from the
     case, `ui`, the act's line and `src/content.ts`; `ui` every string it shows.
   - Lines: the promise alone on clean ground (act 1, its key word `*starred*`; `becomes: 'pill'` turns that word into
     the next scene's element), once in a middle act a point its key word becomes (`place: 'alone'`, `becomes`), the
     claim alone at the end if the film needs one. A line is 2-7 words, set big (a cap of 9.2 % of the frame, the claim
     11.2 %, never under 7 %: a long line takes two rows), arriving whole (up to four words) or in two or three chunks,
     never typed word by word, and read in 1.2 s at most before its key word becomes the element. The other statements are the scenes' own (a decoding title, a
     two-line statement round a porthole, a type poster): give them the words in `props`.
   - `PICTURES` (the brief's own pictures, public/ paths: a scene that needs pictures is dealt only with them) and
     `CLOSE` (the one fact under the lockup, 2-6 words, only what the brief says).
   - Print the plan: `npx tsx -e "import { PLAN_PRINT } from './src/timeline'; console.log(PLAN_PRINT)"`: the scenes
     with their house scenes and lengths, the median shot (aim at 1.5-2.5 s), the big ones (starred), every handover;
     then `npx tsx scripts/grid-check.ts src/timeline.ts --part spine`.
2. **The content, `src/content.ts`.** `node scripts/content.mjs --brief BRIEF.md --fetch --force` writes what the
   scenes fill themselves with; keep only what is true, and look at every picture before it plays (a picture of the
   brief's own subject or none: never a random stock photo).
3. **The mark.** `scripts/brand.py <kit>` writes `src/brand/logo.ts` and the tokens; the lockup scene draws the mark.
   An invented brand gets a mark of its own (never a sparkle, a star or a letter that repeats the name).
4. **Your one own scene.** 75 % of the picture scenes or more come from the bank, so a film has one scene of its own at
   most: `own: true` with its `seconds` (1.5-3) in the spine, drawn in `src/product.tsx` `OWN`: a SceneDef (`Draw`,
   `el`: the element's box on screen, `Content`: the element alone for the handover) built from `src/kit/screens`
   (grid-check `deal-own` fails a second one, or a drawing the spine does not mark `own`). It runs 1.5-3 s like
   a house scene: a complex moment is cut into two or three scenes, each handed on, never one long animation.
5. **The deal, the music, the sound.** `deck.py` deals the direction (`src/dealt.ts`): it seeds the scene deal and the
   palette, and sets the type pairing; the track is picked and fitted to the bars (`music.mjs pick`, `get`, `track.py
   fit`); `node scripts/audio/sfx.mjs` fetches real licensed effects from the catalogue (a new set each film) and `npm
   run sound` cuts them to the picture, earshot judging the takes and the mix. Every move eases (never linear: zooms in
   log space, pans and travels on exponential curves; `lint-film.mjs` fails linear motion).

## The house scenes (src/bank.ts): what each verb asks for

| verb (lib/spine stem) | house scenes | hands on |
|---|---|---|
| asks, types, tells | `macro-type` (big), `glass-prompt`, `iris-input` (a picture) | button, pill, pill |
| writes, makes, builds | `page-fly` (big), `scan-grid` (pictures) | page, list |
| sends, presses, publishes, books | `decode-title` (big), `porthole-line` (big, a picture), `gloss-orbit` (a hero render), `prism-light` | button, photo, mark, world |
| fills, pays, notifies | `toast-stack`, `key-glow` (big) | notice, world |
| sells, prices, counts | `word-cards` (a price table), `photo-counters` (a picture) | card, count |
| shows, browses | `photo-river`, `ring-dive`, `held-product-word` (pictures) | photo, word |
| connects, syncs | `orbit-chips` (official partner marks) | card |
| a statement (line) | `type-flip` (big), `decode-title` | word, button |
| the lockup | `blobs-to-mark` (big), `line-to-wordmark`, `word-build-badge`, `bar-flood` (big) | mark |

Each scene keeps its own design: its camera, its type, its pointer, its timing. The film keeps ONE ground
(`FILM_GROUND`: the value most of its scenes were designed on, the deal's on a tie) and paints every scene on it
(`paletteOn`: a light scene on the near-black keeps its white surfaces as raised dark ones), with one deliberate change
at most: the film's first colour field (toast-stack's flood), then back (grid-check grounds fails more than two changes).
The palette (`src/palette.ts`: one
accent, the deck's or the brand's, else a house accent dealt by the seed; white; a near-black in the accent's hue; the
accent as the one solid field), so it keeps its contrast with the brand's colour in it: never a tinted wash, never the
scene's demo colours.

## What is derived (src/timeline.ts)

- `CAST`: each scene's house scene (named or dealt), its content, its ground. `BANK_DUR`: its own length.
- The body, fitted as a whole (a dynamic programme over the music's 8ths): every scene inside its band (`SPANS`: a
  house scene 1.5-3 s, at most 5 % faster than its own clock, up to 1.2 x slower and then held, creeping; a line alone read in
  1.2 s; the lockup 2.5 s at most), as near its own length as the music allows, the body on whole bars, each act on its
  downbeat wherever the bands allow (else on the 8th, carried like any change). A scene over its band is refused by
  name (`SCENE_MAX`, `LOCKUP_MAX`; `BARS`, `FIT_K`, `MEDIAN_SHOT`, `LONGEST_SHOT`).
- `SPINE_PLAN` (lib/spine planSpine, retimed on the scenes): the contract the checks read. `HANDOVER_PLAN`: one
  handover per change, dealt per film (`viaOptions`: the form table's recipe first, then a flight, a grow, an iris or a
  porthole from an element in sight, a swell, a converge last): no kind on more than 40 % of the changes (`SEAM_SHARE`;
  a pinned `via` past it is dealt again and the print says so); the element is never left a speck on an empty ground
  (the leaving scene's surroundings go late, the arriving one's come early, a line's parting words stay in sight until
  the cut, a chip landing in a line fades into its word). `acts/stage.tsx` draws it with
  fx/Handover; `acts/bank.tsx` gives each house scene its element as a patch of the scene itself, scaled like a
  picture, cuts the scene's own copy out while it flies, fades its surroundings out under the leaving element and in
  round the arriving one; the ground holds through the change.
- `LINES` (frames, whole on the music's 16th; `fit` the size and rows, `chunks`), `COPY` (a line alone carries `place`,
  `cap`, `chunks` for grid-check lone-line; the fact its `cap`), `CUE`, `SEAMS`, `ACT`, the lockup's `LOCKUP_AT`,
  `NAME_AT`, `FACT_AT` (from the lockup scene's own beats: the fact at a cap of 3.6 % or left out); no settle-out: the
  lockup stays whole and creeping to the last frame (1.5-2.2 s from its mark; grid-check lockup-end, forensics end-blank).
- `GROUND_PLAN` (the grounds as runs), `SUBJECTS`: consecutive scenes about the same picture (a scene's `subject` in
  `src/spine.ts`, a scene of your own too, else its name) are one beat; the timeline refuses one over 4.5 s by name.

## The checks

`npm run check` (tsc, lint-film, grid-check: scene-length, lone-line, seam-variety, lockup-end, grounds, subject-run), `grid-check.ts --part spine`, then
on the draft (`render.sh --draft`, with the sound): `forensics.py out/draft.mp4 --cues out/cues.json` (full: the element
in its box across every handover, no speck at a scene change, no small lone line, no undeclared swap, no text-then-cards,
the motion gates: no still run over 0.8 s before the lockup, no empty frame in the last 0.3 s) and `look-audit.py
out/draft.mp4 --look`. On the draft's sheet: no
line over a busy or blurred picture, every press a pointer, two big scenes, the palette the brand's (never the
starter's green, never a scene's demo colours).
