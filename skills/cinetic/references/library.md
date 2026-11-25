# The motion library: the default vocabulary

The library is a set of finished animations, measured and built to the bar, that a film takes whole and adapts: type
moves, turns and finishing effects, and product UI. Pick from it first; hand-build a move only for what it lacks, and
then build it to the same standard (the motion references in `motion/*.md` have the recipes).

## The three sections

| Section | What is in it | Reference |
|---|---|---|
| Type | words performed as events: rolls, tracking, words made of tiles or dots, a dive into a letter, words that bounce, stack or sweep, a line that sits in a host | [library-type.md](library-type.md) |
| Turns and effects | joins that carry a real object or picture through the cut and cover the whole frame (a dot reveal, a block burst, a grow iris, a dive into a card, a whip, a shove, a shape match, a glitch cut) and finishing layers (a light sweep, bloom on a light source, tracking marks, a dot screen, a morphing box) | [library-turns.md](library-turns.md) |
| Product UI | interface pieces designed like a shipped product (notices that pile up, a card fan, a row that opens, a palette that travels to one row, a board drag, a task run, a prompt answered, a chat, a settings card, a crafted pointer) and the design bar every UI in a film meets | [library-ui.md](library-ui.md) |
| Host screens | faithful rebuilds of the third-party screens films show most (a GitHub pull request, a GitHub Projects column, a VS Code window in both themes) and a design-canvas app chrome, each taking the film's content as props | [library-hosts.md](library-hosts.md) |

## How to use it

1. **Watch the reel first.** Each section is a registered film that plays every piece with its name:
   `node scripts/frames.mjs render --film library-turns` (also `library-type`, `library-ui`, `library-hosts`), or
   `node scripts/frames.mjs sheet --film library-ui` for a quick look. A project made by `new-film.mjs` has the reels
   registered. Each section file lists every piece's frames in its reel and the command that shows just that piece.
2. **Pick by the story; the library is the default.** In `BEATS.md`'s Devices block, name the library piece behind each
   join, each type move and each UI action (`- join 3: DiveInto into the rota card (carry the subject)`), or write why
   none fits (`- join 5: hand-built, the receipt tears along its own perforation`). A piece earns its place by what the
   story needs at that moment, never because it is in the reel. `frames.mjs check` prints how many library pieces the
   film's source imports, and a LOOK line when it imports none.
3. **Adapt, do not paste.** Every piece is deterministic by frame and takes its content, colours, sizes and timing as
   props: give it this film's real content (names, data, the product's own surfaces), its palette and its type voice,
   and set its frames from the film's timeline `T`. Turns also take `speed`.
4. **Vary what recurs.** One turn of a kind in a film; a move appears at most twice, and differently the second time
   ([devices](film-grammar.md#devices)).
5. **Check it in place.** A library piece in a film is judged like anything else: strips of its frames, the join test
   ([film-grammar.md](film-grammar.md#the-join-test)), the polish loop ([taste.md](taste.md#5-the-polish-loop)).

Import from the kit like everything else (`import { DiveInto, RowExpand, TrackedType } from '../../kit';`). The section
files carry each piece's props, numbers and cautions; this file only says how to work with them.
