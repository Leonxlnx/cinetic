# launch-simple: the default launch film, assembled from the scene bank

A launch film is ONE sentence played as 3-5 acts: "[Name] [verb 1]s [the case], [verb 2]s it, ...". Each act is one
verb done to ONE case (the request typed, the record, the person: the brief's real words, names and numbers, the same
in every act) by ONE element whose form changes from scene to scene. The scenes are house scenes from the bank
(`src/scenes`): each is one moment of 1.5-3 s that shows a point and is understood (the request typed at macro scale,
the page writing itself, send pressed with a pointer, the payments stacking up, a title decoding, the mark born from
two blobs). A film is 8-12 scenes, two big ones at least, about 15-25 s. Each point is a line on clean ground and then
its scene; every scene change hands the element on, so the film never cuts from a line to a card. `new-film.sh` lays
these files over the Remotion starter. references/spine.md is the grammar; this file is how the template plays it.

## What you write (in this order)

1. **The spine, `src/spine.ts`, first.** Say the film as a chain ("A becomes B becomes C"); a film that needs "and
   also" is two films.
   - `sentence` (8-16 words), `element` (one id), `case` ({ request, result, who, names, numbers }).
   - `acts`: 3-5, each { `verb`, `scenes`, `line?`, `strings`, `world?`, `devices?` }. A scene is { `form`, `name`,
     `bank?`, `props?`, `via?`, `ui?` }: `form` the element's form as the scene hands it on (word for a line; a bank
     scene's own: macro-type a button, page-fly a page, toast-stack a notice, decode-title a button, type-flip a word, a
     lockup the mark); `bank` the house scene, or leave it out and let the deal pick one by the act's verb; `props` its
     content in the case's own words (each scene's props: `src/scenes/<id>.tsx`), left out it fills itself from the
     case, `ui`, the act's line and `src/content.ts`; `ui` every string it shows.
   - Lines: the promise alone on clean ground (act 1, its key word `*starred*`; `becomes: 'pill'` turns that word into
     the next scene's element), once in a middle act a point its key word becomes (`place: 'alone'`, `becomes`), the
     claim alone at the end if the film needs one. The other statements are the scenes' own (a decoding title, a
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
4. **A scene the bank lacks.** `src/product.tsx` `OWN`: a SceneDef (`Draw`, `el`: the element's box on screen,
   `Content`: the element alone for the handover) built from `src/kit/screens`, named in the spine.
5. **The deal, the music, the sound.** `deck.py` deals the direction (`src/dealt.ts`): it seeds the scene deal and the
   palette, and sets the type pairing; the track is picked and fitted to the bars (`music.mjs pick`, `get`, `track.py
   fit`); `npm run sound` cuts the effects to the picture.

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

Each scene keeps its own design: its camera, its type, its pointer, its timing. The template paints it on the value
its source was designed on (`ground`: light, dark or the accent field) in the film's palette (`src/palette.ts`: one
accent, the deck's or the brand's, else a house accent dealt by the seed; white; a near-black in the accent's hue; the
accent as the one solid field), so it keeps its contrast with the brand's colour in it: never a tinted wash, never the
scene's demo colours.

## What is derived (src/timeline.ts)

- `CAST`: each scene's house scene (named or dealt), its content, its ground. `BANK_DUR`: its own length.
- The body: every scene at its own length, eased 0.9-1.1 so each change lands on the track's 8th; the lockup plays at
  its own speed and holds, creeping, to the bar line that ends the body (`BARS`, `FIT_K`, `MEDIAN_SHOT`).
- `SPINE_PLAN` (lib/spine planSpine, retimed on the scenes): the contract the checks read. `HANDOVER_PLAN`: one
  handover per change, pinned to a kind the stage draws: the form table's drawn recipe; into a scene that opens on its
  own picture, the way the element becomes that screen (a button drains into a porthole, a pill or a page opens an
  iris, anything with a face grows into it); else a converge through a point. `acts/stage.tsx` draws it with
  fx/Handover; `acts/bank.tsx` gives each house scene its element as a patch of the scene itself, scaled like a
  picture, cuts the scene's own copy out while it flies, fades its surroundings out under the leaving element and in
  round the arriving one; the ground holds through the change.
- `LINES` (frames, whole on the music's 16th), `COPY`, `CUE`, `SEAMS`, `ACT`, the lockup's `LOCKUP_AT`, `NAME_AT`,
  `FACT_AT` (from the lockup scene's own beats), the settle-out into its ground with the music's ring-out.

## The checks

`npm run check` (tsc, lint-film, grid-check), `grid-check.ts --part spine`, then on the draft (`render.sh --draft`,
with the sound): `forensics.py out/draft.mp4 --cues out/cues.json --spine` (the element in its box across every
handover, no undeclared swap, no text-then-cards) and `look-audit.py out/draft.mp4 --look`. On the draft's sheet: no
line over a busy or blurred picture, every press a pointer, two big scenes, the palette the brand's (never the
starter's green, never a scene's demo colours).
