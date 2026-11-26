# Library: objects and logos

Shapes, icons, pictures and logos that move or are built: a mark drawn stroke by stroke, an icon that assembles, a
picture that is cut, folded or stacked, a device built from its parts. A company's mark is always its real one
(`<Brand>`); a piece moves it, never redraws it. Each piece lives in `src/kit/library/objects/` (one file a piece, named
after it), with its catalogue entry in `src/kit/library/catalog/object.ts` (`category: 'object'`) and one segment in the
`library-objects` reel (`src/films/library/ReelObjects.tsx`); `frames.mjs library --category object` lists them. Add one
by the checklist in [library.md](library.md#how-to-add-a-piece); the two tables below are written from the catalogue.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

_No pieces yet: the first one adds its catalogue entry, and this table is written from it._

<!-- /library:pieces -->

## In the reel

Every piece's frames in the reel (`--film library-objects`), and the one command that shows just that piece: its frames
in one still (run it in a film project; `render --film library-objects --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

_No reel segments yet._

<!-- /library:reel -->
