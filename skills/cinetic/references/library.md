# The motion library: the default vocabulary

The library is a set of finished animations, measured and built to the bar, that a film takes whole and adapts: type
moves, turns, finishing effects, camera moves, product UI, host screens, objects, grounds and design presets. Pick from
it first; hand-build a move only for what it
lacks, and then build it to the same standard (the motion references in `motion/*.md` have the recipes).

## The categories

Each category has its own folder of `src/kit/library/` (one file a piece, named after it), its own catalogue file
`src/kit/library/catalog/<category>.ts` (one entry a piece: what it does, what it acts on, its mood, its length, where
its reel plays it; `catalog/index.ts` merges them), its own reel (`src/films/library/Reel<Name>.tsx`, a list of
segments) and its own section file with every piece's props, numbers and cautions. So a category's pieces are added
without touching another category's files.

| Category | Folder, catalogue, reel | What is in it | Reference |
|---|---|---|---|
| `type` | `type/`, `catalog/type.ts`, `library-type` | words performed as events: rolls, tracking, words made of tiles or dots, a dive into a letter, words that bounce, stack or sweep, a line typed into a host, clean exits | [library-type.md](library-type.md) |
| `turn` | `turns/`, `catalog/turn.ts`, `library-turns` | joins that carry a real object or picture through the cut and cover the whole frame: a dot reveal, a block burst, a grow iris, a dive into a card, a whip, a shove, a shape match, a glitch cut, a window opening out of its button | [library-turns.md](library-turns.md) |
| `fx` | `fx/`, `catalog/fx.ts`, `library-fx` | finishing layers: a light sweep, bloom on a light source, tracking marks, a dot screen, a channel split on a landing, a morphing box | [library-fx.md](library-fx.md) |
| `camera` | `camera/`, `catalog/camera.ts`, `library-camera` | camera moves as pieces: pushes, pans, dives, parallax, focus pulls | [library-camera.md](library-camera.md) |
| `ui` | `ui/`, `catalog/ui.ts`, `library-ui` | interface pieces designed like a shipped product (notices that pile up, a card fan, a row that opens, a palette that travels to one row, a board drag, a task run, a prompt answered, a chat, a settings card, a crafted pointer) and the design bar every UI in a film meets | [library-ui.md](library-ui.md) |
| `host` | `hosts/`, `catalog/host.ts`, `library-hosts` | faithful rebuilds of the third-party screens films show most (a GitHub pull request, a GitHub Projects column, a VS Code window in both themes) and a design-canvas app chrome | [library-hosts.md](library-hosts.md) |
| `object` | `objects/`, `catalog/object.ts`, `library-objects` | objects and logos: shapes, icons, pictures and marks that move or are built | [library-objects.md](library-objects.md) |
| `ground` | `grounds/`, `catalog/ground.ts`, `library-grounds` | designed backgrounds and how they move | [library-grounds.md](library-grounds.md) |
| `design` | `designs/`, `catalog/design.ts`, `library-designs` | design presets: named looks as typed tokens (palette, grounds, type scale and weights, radii, shadow, stroke, texture) a film spreads into its tokens, each shown on a `DesignSwatch` | [library-designs.md](library-designs.md) |

## Find a piece

`node scripts/frames.mjs library` lists the pieces as a table (name, category, purpose, length, what it looks like).
Filter by `--category` (the first column above), `--purpose` (`enter`, `exit`, `join`, `emphasis`, `idle`, `loop`,
`build`), `--subject` (what it acts on: `line`, `word`, `letter`, `number`, `card`, `list`, `window`, `phone`, `photo`,
`frame`, `icon`, `logo`, `button`, `pointer`, `control`, `page`, `code`, `canvas`, `shape`, `scene`, `layer`, `mark`,
`device`, `pattern`, `texture`, `palette`, `type`) and `--mood` (`calm`, `bold`, `playful`, `technical`, `editorial`); a
filter takes several values joined by commas, `--json` prints the entries.

```
node scripts/frames.mjs library --category turn --mood calm       # a quiet join
node scripts/frames.mjs library --subject card --purpose enter    # a card that arrives
node scripts/frames.mjs library --category type --purpose exit    # a line that leaves cleanly
```

`library --show DiveInto` prints one piece in full: when to reach for it, its caution, its import line, its file, its
section and its reel frames. `library --strip DiveInto` renders its frames from its reel as one still (16 frames).

## How to use it

1. **See it first.** `library --strip <Name>` for one piece; each category's reel plays every piece with its name:
   `node scripts/frames.mjs render --film library-turns` (also `library-type`, `library-fx`, `library-camera`,
   `library-ui`, `library-hosts`, `library-objects`, `library-grounds`, `library-designs`), or `sheet --film library-ui` for a quick look. A project made by `new-film.mjs` has the reels
   registered.
2. **Pick by the story; the library is the default.** In `BEATS.md`'s Devices block, name the library piece behind each
   join, each type move and each UI action (`- join 3: DiveInto into the rota card (carry the subject)`), or write why
   none fits (`- join 5: hand-built, the receipt tears along its own perforation`). A piece earns its place by what the
   story needs at that moment, never because it is in the reel. `frames.mjs check` prints how many catalogued pieces
   the film's source imports and how often each is placed, a LOOK line when it imports none and one when a type or turn
   piece is placed more than twice.
3. **Adapt, do not paste.** Every piece is deterministic by frame and takes its content, colours, sizes and timing as
   props: give it this film's real content (names, data, the product's own surfaces), its palette and its type voice,
   and set its frames from the film's timeline `T`. Turns and UI pieces also take `speed`.
4. **Vary what recurs.** One turn of a kind in a film; a move appears at most twice, and differently the second time
   ([devices](film-grammar.md#devices)).
5. **Check it in place.** A library piece in a film is judged like anything else: strips of its frames, the join test
   ([film-grammar.md](film-grammar.md#the-join-test)), the polish loop ([taste.md](taste.md#5-the-polish-loop)).

Import from the kit like everything else (`import { DiveInto, RowExpand, TrackedType } from '../../kit';`).

## Naming rules

- **A piece** is one exported component named for what it does (`DiveInto`, `NoticePile`, `RollType`), in a file of the
  same name in its category's folder, with one catalogue entry. A small family that only makes sense together may share
  a file; each exported component in it is a piece with its own entry.
- **Helpers** that go with a piece live in its file: lower camel case for functions (`dotRevealEnd`, `pointerAt`),
  upper camel case for types (`TurnBox`, `MailData`). **Parts** (static building blocks: surfaces, pills, avatars, the
  notification card) and helpers two pieces share live in `<folder>/_shared.tsx`; they have no catalogue entry. What
  several categories share (the SVG filters, a move's progress) lives in `library/_shared.tsx`.
- **Props** have the same names everywhere: `at` the first frame, `dur` the length in frames or `speed` (1 the
  measured timing), `seed` for anything random (never `Math.random`), `color` / `ink` / `ground` for the piece's colour,
  the colour on it and the colour behind it, `x` and `y` the centre (by default the frame's centre), `size` the text
  size in px. Older names stay, with the common name beside them: `Pointer` and `GitHubPullRequest` take `at` beside
  `start`, `BlockBurst` takes `color` beside `edge`, `GrowIris` beside `rim`, `WindowOpen` beside `surface`.
- **Any frame size.** A piece reads the frame's size from `useVideoConfig()`, never 1920 x 1080 written in, so it lays
  out right in a vertical film, a sheet and a join image.
- **Every file opens with the same header:** the piece, its category and purpose, what it looks like, its key numbers
  and its caution.

## How to add a piece

A builder adds a piece by touching exactly five files, all of its own category, and nothing else (no shared file, no
registry: every category's folder, catalogue file, reel and doc already exist and are registered):

1. **its piece file**, `src/kit/library/<folder>/<Name>.tsx` (a design preset: `designs/<Name>.ts`);
2. **its folder's `index.ts`**, one export line;
3. **its catalogue file**, `src/kit/library/catalog/<category>.ts`, one entry appended;
4. **its reel's segment list**, `SEGMENTS` in `src/films/library/Reel<Name>.tsx`, one segment appended (with its demo
   beside it in the same file);
5. **its doc**, `references/library-<category>.md`: its hand-written section; `node scripts/library-docs.mjs` writes the
   tables in the same file.

The checklist:

- [ ] **Measured from a strip of the source.** `frames.mjs strip <source.mp4> --at <s> --dur 1.5 --fps 30` over the
      move; write its numbers in frames (lengths, distances, curves, sizes) before writing code.
- [ ] **Built** in its piece file, opening with the header, using the common prop names, its size from
      `useVideoConfig()`, seeded randomness; exported from its folder's `index.ts`. Helpers two of the category's pieces
      share go in `<folder>/_shared.tsx` (the category's own file).
- [ ] **Compared side by side** with the source strip (the same frames, the same scale) until they match.
- [ ] **A reel segment** appended to `SEGMENTS`: `{ name: '<Name>', from: <the last segment's from + dur>, dur: <its
      length>, render: <its demo> }`, the demo with real content.
- [ ] **A catalogue entry** appended to `catalog/<category>.ts`: name, category, purpose, subject, mood, frames, a
      summary, when to use it, its caution, and `reel: { film, from, to }` with the segment's frames (`to = from + dur - 1`).
- [ ] **Its join image clean on every frame** when it crosses a cut (`frames.mjs joins --film <reel> --at <frame>`):
      nothing of the old scene left once the new one has landed, nothing a frame late; and its strip clean
      (`library --strip <Name>`).
- [ ] **`node scripts/library-docs.mjs`** writes its section file's tables; add its hand-written section there (props,
      numbers, caution); `library-docs.mjs --check` (the catalogue, the exports, the segments and the docs agree) and
      `npx tsc --noEmit` pass.

A new subject, purpose or mood value is the one change outside these files: add it to the type in
`src/kit/library/catalog/types.ts` (the check names it).
