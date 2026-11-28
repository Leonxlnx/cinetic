# Worked films

Five complete films made with the kit, one world each. They are older than the skill's current rules: read them for
how the kit is wired (one timeline `T`, one component per section, sound cues on the same frames), not as a standard.
Their look and structure are below the bar (9-16 s, no story, generic UI) and they will be rebuilt or replaced. Start a
film from its story (`references/film-grammar.md`, story) and the motion library (`references/library.md`); take single
kit techniques from these, never their content, order, palettes, marks or lockups. Render one inside this folder
(`node scripts/frames.mjs sheet --film forge`).

What none of them should teach: the typing `burst` (all five), moves placed by animating `left` / `top` (all five),
an entrance used more than twice, and the deprecated `shake`, `Flash` and `Field` ground (`references/kit.md`, Deprecated).

| Film | World | Still a good example of | Do not take from it | Needs fetched first |
|---|---|---|---|---|
| `brief` | cool white, product UI | one `T` with every cue keyed to it, a typed ask with a caret-following camera, a pointer clicking, a velocity-cut chain carrying one morphing box, a dive into a calendar, a log-space flood out of the bar | the `Field` sky ground, rows that move by `top` | the sounds in `src/sfx.ts` (`node scripts/sfx.mjs get <ids>`); `your-breath` |
| `forge` | isometric blocks on warm grey | a timeline on the music's beat grid (`beats`), `Box` worlds under `Camera` keys, a dive into a block face that becomes a terminal, two stepped clocks, a mark built from the object | `shake()` on landings, four `Build` entrances in a row | the sounds; `tech-house-vibes` |
| `fieldnote` | paper and satellite photographs | letters as windows (`TextWindow`), a dive into a letter stroke, `Compare` with a whipped divider, a lockup clipped to the wordmark | the photographs (stock-like pictures as the world break the picture bar), the pill and scrim over a photograph, forced grain | the sounds; NASA earth observations (public domain) in `public/img/` (paths at the top of the film); `sonor-01` |
| `lumen` | oxblood stage, a 3D glass prism (`GLView`) | `GLView` with `softStudio`, a camera riding rays, a live three.js simulation as the answer, a masked exit | `Flash` on the main hit, `shake()`, three identical rises, labels pinned by `left` / `top` | the sounds; `wheres-hope` |
| `inkwell` | warm white paper and navy, Newsreader | a document under a 2D camera, wet ink drying from blue to black, a struck sentence falling, a full stop becoming the drop on the i | the still sentence over hard-cut hosts (both sides of a cut must move), the repeated cut-on entrances, a serif voice without a brand reason | the sounds; `coffee-or-tea` |

Each film has its own bed, chosen for its world and placed with `sfx.mjs fit` (the main hit on a beat where the music
lifts). Never reuse one of these beds in a new film.

| Film | Track | Fetch |
|---|---|---|
| `forge` | confident minimal electronic, cut on its beat grid | `node scripts/sfx.mjs music mixkit-tech-house-vibes-130 --as tech-house-vibes` |
| `brief` | warm electronica that arrives on the reveal | `node scripts/sfx.mjs music mixkit-your-breath-634 --as your-breath` |
| `fieldnote` | cinematic, a quiet opening into a drop on the first picture | `node scripts/sfx.mjs music mixkit-sonor-01-558 --as sonor-01` |
| `lumen` | determined, cinematic, sparse | `node scripts/sfx.mjs music mixkit-wheres-hope-1162 --as wheres-hope` |
| `inkwell` | warm and light, the band enters on the relay | `node scripts/sfx.mjs music mixkit-coffee-or-tea-1168 --as coffee-or-tea` |
