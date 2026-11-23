# Worked films

Five complete films made with the kit, one world each. Read one before your first film: they show the kit used the way the
skill intends (one timeline `T`, one component per section, sound cues on the same frames). Take single moves, never
the content or the order: these five share devices (a flood, a relay, a wall) that a new film should choose
from the menus in `references/film-grammar.md`, not repeat. Render one inside this folder (`node scripts/frames.mjs sheet --film forge`).

| Film | World | Moves worth studying | Needs fetched first |
|---|---|---|---|
| `brief` | light paper, product UI | a depth-ladder pile, a full stop that grows into the accent ground, a typed ask, a wall of every update read in one wave, the four results landing giant, the approved plate carried through three hosts | the sounds in `src/sfx.ts` (`node scripts/sfx.mjs get <ids>`); `your-breath` |
| `forge` | isometric blocks on ink | thirty labelled blocks, floor type that faces the camera, a dive into a block's face that is a terminal, a caret-following camera, three ground cuts carried by objects, integrations as surfaces, a counter tower | the sounds |
| `fieldnote` | editorial paper, satellite photographs | a stepped mosaic, letters as windows that change place, a dive into a letter stroke, a scan grid and punch-ins, a before/after, a lockup inside a letter | the sounds; NASA earth observations (public domain) in `public/img/` (see the paths at the top of the film); `sonor-01` |
| `lumen` | dark stage, a 3D glass prism (`GLView`) | the typed question collapsing into a beam, rays (lens-facing ribbons, now `glRay` in the kit) fanning onto three numbers, a flood to a bone ground with a live 3D simulation as the answer, labels pinned to 3D points, the name on an amber flood | the sounds; `wheres-hope` |
| `inkwell` | cream paper, one coral | the claim as the document's own title, the weak sentence struck out and falling while the strong one lands in macro, the sentence lifting off as a plate | the sounds; `coffee-or-tea`; the current Google Docs mark (`node scripts/logos.mjs get google-docs --film .`) |

Each film has its own bed, chosen for its world and placed with `sfx.mjs fit` (the main hit on a beat where the music lifts):

| Film | Track | Fetch |
|---|---|---|
| `forge` | confident minimal electronic, cut on its beat grid | `node scripts/sfx.mjs music mixkit-tech-house-vibes-130 --as tech-house-vibes` |
| `brief` | light paper, product UI | a depth-ladder pile, a full stop that grows into the accent ground, a typed ask, a wall of every update read in one wave, the four results landing giant, the approved plate carried through three hosts | the sounds in `src/sfx.ts` (`node scripts/sfx.mjs get <ids>`); `your-breath` |
| `fieldnote` | editorial paper, satellite photographs | a stepped mosaic, letters as windows that change place, a dive into a letter stroke, a scan grid and punch-ins, a before/after, a lockup inside a letter | the sounds; NASA earth observations (public domain) in `public/img/` (see the paths at the top of the film); `sonor-01` |
| `lumen` | determined, cinematic, sparse | `node scripts/sfx.mjs music mixkit-wheres-hope-1162 --as wheres-hope` |
| `inkwell` | cream paper, one coral | the claim as the document's own title, the weak sentence struck out and falling while the strong one lands in macro, the sentence lifting off as a plate | the sounds; `coffee-or-tea`; the current Google Docs mark (`node scripts/logos.mjs get google-docs --film .`) |
