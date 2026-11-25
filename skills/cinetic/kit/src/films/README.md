# Worked films

Five complete films made with the kit, one world each. Read them for how the kit is used (one timeline `T`, one
component per section, sound cues on the same frames), not as a standard: their look and structure are below the bar
(14-16 s, no story, plain frames, generic UI, joins that carry a token while the ground changes colour) and they will be
replaced. All five show the same concept (one task, start to finish). Start a film from its story
(`references/film-grammar.md`, story) and the motion library (`references/library.md`); take single kit techniques
from these, never their content, order, palettes, marks or lockups. Render one inside this folder
(`node scripts/frames.mjs sheet --film forge`).

| Film | World | Moves worth studying | Needs fetched first |
|---|---|---|---|
| `brief` | light paper, product UI | a depth-ladder pile, a typed ask, a wall of every update read in one wave, the four results landing giant, the approved plate carried through three hosts | the sounds in `src/sfx.ts` (`node scripts/sfx.mjs get <ids>`); `your-breath` |
| `forge` | isometric blocks on ink | thirty labelled blocks, floor type that faces the camera, a dive into a block's face that is a terminal, a caret-following camera, integrations as surfaces, a counter tower | the sounds |
| `fieldnote` | editorial paper, satellite photographs | a stepped mosaic, letters as windows that change place, a dive into a letter stroke, a scan grid and punch-ins, a before/after, a lockup inside a letter | the sounds; NASA earth observations (public domain) in `public/img/` (see the paths at the top of the film); `sonor-01` |
| `lumen` | dark stage, a 3D glass prism (`GLView`) | the typed question collapsing into a beam, rays (lens-facing ribbons, now `glRay` in the kit) fanning onto three numbers, a flood to a bone ground with a live 3D simulation as the answer, labels pinned to 3D points, the name on an amber flood | the sounds; `wheres-hope` |
| `inkwell` | cream paper, one coral | the claim as the document's own title, the weak sentence struck out and falling while the strong one lands in macro, the sentence lifting off as a plate | the sounds; `coffee-or-tea`; the current Google Docs mark (`node scripts/logos.mjs get google-docs --film .`) |

Each film has its own bed, chosen for its world and placed with `sfx.mjs fit` (the main hit on a beat where the music lifts):

| Film | Track | Fetch |
|---|---|---|
| `forge` | confident minimal electronic, cut on its beat grid | `node scripts/sfx.mjs music mixkit-tech-house-vibes-130 --as tech-house-vibes` |
| `brief` | warm electronica that arrives on the reveal | `node scripts/sfx.mjs music mixkit-your-breath-634 --as your-breath` |
| `fieldnote` | cinematic, a quiet opening into a drop on the first picture | `node scripts/sfx.mjs music mixkit-sonor-01-558 --as sonor-01` |
| `lumen` | determined, cinematic, sparse | `node scripts/sfx.mjs music mixkit-wheres-hope-1162 --as wheres-hope` |
| `inkwell` | warm and light, the band enters on the relay | `node scripts/sfx.mjs music mixkit-coffee-or-tea-1168 --as coffee-or-tea` |