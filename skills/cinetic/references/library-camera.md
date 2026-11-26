# Library: camera moves

Camera moves as finished pieces: a push, a pan, a dive, parallax between layers, a focus pull. Each wraps the scene it
moves and takes `at`, `dur` or `speed` and its distances as props; it reads the frame size from `useVideoConfig()`. Each
piece lives in `src/kit/library/camera/` (one file a piece, named after it), with its catalogue entry in
`src/kit/library/catalog/camera.ts` (`category: 'camera'`) and one segment in the `library-camera` reel
(`src/films/library/ReelCamera.tsx`); `frames.mjs library --category camera` lists them. Add one by the checklist in
[library.md](library.md#how-to-add-a-piece); the two tables below are written from the catalogue.

## At a glance

<!-- library:pieces (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

_No pieces yet: the first one adds its catalogue entry, and this table is written from it._

<!-- /library:pieces -->

## In the reel

Every piece's frames in the reel (`--film library-camera`), and the one command that shows just that piece: its frames
in one still (run it in a film project; `render --film library-camera --range a-b` for the piece in motion).

<!-- library:reel (written by scripts/library-docs.mjs from src/kit/library/catalog/; edit the catalogue, not this table) -->

_No reel segments yet._

<!-- /library:reel -->
