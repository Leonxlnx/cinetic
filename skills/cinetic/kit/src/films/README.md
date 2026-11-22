# Worked films

Five complete films made with the kit, one world each. Read one before your first film: they show the kit used the way the
skill intends (one timeline `T`, one component per section, sound cues on the same frames). Learn the moves, never copy
the content. Render one inside this folder (`node scripts/frames.mjs sheet --film forge`).

| Film | World | Moves worth studying | Needs fetched first |
|---|---|---|---|
| `brief` | light paper, product UI | depth-ladder pile, a full stop that grows into a flood, typing, thinking dots that become the answer card, a pointer that opens a row | the sounds in `src/sfx.ts` (`node scripts/sfx.mjs get <ids>`) |
| `forge` | isometric blocks on ink | thirty labelled blocks, floor type that faces the camera, a dive into a block's face that is a terminal, a caret-following camera, three ground cuts carried by objects, integrations as surfaces, a counter tower | the sounds |
| `fieldnote` | editorial paper, satellite photographs | a stepped mosaic, letters as windows that change place, a dive into a letter stroke, a scan grid and punch-ins, a before/after, a flood from a divider, a lockup inside a letter | the sounds; NASA earth observations (public domain) in `public/img/` (see the paths at the top of the film) |
| `lumen` | dark stage, shaped light, glass | a beam split onto named benchmarks, the name on an amber flood with a light sweep, a real prompt answered under the light with punch-ins | the sounds |
| `inkwell` | soft air, serif voice | a partner's real mark joining a line, a rewrite in macro, the artefact landing inside three real surfaces on a coral flood, a pull-back into a wall that drains into the mark | the sounds; the current Google Docs mark (`node scripts/logos.mjs get google-docs --film .`) |

Music in all five: `public/music/tech-house-vibes.mp3` (`node scripts/sfx.mjs music mixkit-tech-house-vibes-130 --as tech-house-vibes`).
