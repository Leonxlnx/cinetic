# Library: design presets

Named looks as typed token objects (`Design`: palette, grounds, type scale and weights, radii, shadow recipe, stroke,
texture) that a film spreads into its own tokens (`const W = { ...Quiet.palette, radius: Quiet.radii.card }`). A preset
is a piece: `export const Quiet: Design = { ... }` in `designs/Quiet.ts`. Each piece lives in `src/kit/library/designs/`
(one file a piece, named after it), with its catalogue entry in `src/kit/library/catalog/design.ts` (`category:
'design'`) and one segment in the `library-designs` reel (`src/films/library/ReelDesigns.tsx`); `frames.mjs library
--category design` lists them. Add one by the checklist in [library.md](library.md#how-to-add-a-piece); the two tables
below are written from the catalogue.

Its reel segment shows it on a `<DesignSwatch design={Quiet} />` (the preset's ground, a card in its surface, its type
scale in its ink, its palette as chips); `Design` and `DesignSwatch` live in `designs/_shared.tsx`. A preset is a
starting look, never the film's idea: the world still comes from the product ([worlds.md](worlds.md)).

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

_No pieces yet: the first one adds its catalogue entry, and this table is written from it._

<!-- /library:pieces -->

## In the reel

Every piece's frames in the reel (`--film library-designs`), and the one command that shows just that piece: its frames
in one still (run it in a film project; `render --film library-designs --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

_No reel segments yet._

<!-- /library:reel -->
