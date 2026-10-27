# The prompt-run template

An 18-20 s demo of a product that does work from a request (an agent, an assistant, a generator), laid over the
Remotion starter by `bash scripts/new-film.sh <dir> --template prompt-run` (template.json lists the files it copies and
the starter acts it removes). Crisp pace, 120 BPM until the track's grid is in; 9 bars, 19 s as written.

**The shape.** One object through many states: what it is among the tools it connects, the request, the click, the
work, the result, the name. Continuity comes from the container (the pill opens the iris, the box is punched into, the
running row becomes the result card), never from a dissolve.

| # | act | shot | in | what happens | the slot |
|---|---|---|---|---|---|
| 1 | `pill` | a pill among the tools | cold open | the label (what it is) is written by a front inside a pill, the tools round it drifting; on the kick the tools leave along their own vectors (quad-in, x1.45, `scatterState`), the label swaps and the pill re-fits it, the rim starts turning; a wind-up widens it 20 % on a cubic-in | `lines.what`, `lines.ask`, `tools` |
| 2 | `ask` | the request box | the iris out of the pill (the signature) | the iris opens big (`irisReveal`) onto a field in the accent's hue that lives under a second; the box pushes in on a circ-out while its width unfolds on a faster track; the line over it is written by a front; the request types fast with a burst on one frame; a creep | `lines.tell`, `request`, `chip` |
| 3 | `click` | the close-up | a punch-in with a blur bridge | the close-up breathes back from x2.44 with a decaying drift; the typing slows; the pointer glides in on an arc, squashes on the click, the send button swells and walks the accent's tints (`swellState`), the pointer spins out (`cursorExit`); an ease-in whip up cut at its fastest frame | |
| 4 | `run` | the product working | the whip carried up | the request rises as the user's bubble; a status line with breathing dots; the steps tick in on an accelerating cadence, each rising inside the stack, checks a beat later, the last still running (`StepList` rise, pending) | `status`, `steps` |
| 5 | `done` | the result | the running row grows into the card | the rest of the run lifts away; the card's content lands; the line over it is written by a front; it goes soft into the lockup | `result`, `lines.done` |
| 6 | `end` | the lockup | out of the defocus | the mark pops, the name rises in, the close settles into focus | the name, `lines.close` |

**What to write.**
- `src/run.ts`: the script (2-7 words a line: what it is, what to ask it, what to do, the result, the close), the tools
  it connects (4-7 glyphs), the request as the user types it (one plain sentence, 72 characters at most), the model
  chip, the status, 3-5 steps (a verb and its object) and the result card. Delete its placeholder lines.
- The product's own screens: `acts/Ask.tsx` and `acts/Run.tsx` draw the kit's `Composer`, `Bubble`, `StepList` and
  `Notice` as the floor; rebuild the product's real request box and run view at film size (every web size x1.9).
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name. The field behind the iris is the
  film's one colour event (declared in `COLOUR`), in the accent's own hue.
- The direction: deal it and retell this floor in its world: its ground and type replace `acts/stage.tsx`.

**Timing.** `src/timeline.ts` places every act on a bar line and every state change as a CUE on the 16th grid; `TYPING`
holds the request's rates and burst, `inkFrames` the front's length (8 frames a word), `STEPS` the rows' onsets. A line
cut before its read fails at import.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): 110-128 BPM with a
clear kick; then `track.py edit`, `grid` and `check`. `src/sync.ts` places the effects from the picture's own frames:
the label, the kick, the wind-up, the iris, the typing, the punch-in, the click and its swell, the whip, the bubble,
each check, the result landing, ONE element at the lockup.
