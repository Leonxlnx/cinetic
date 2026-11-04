# The prompt-run template

An 18-20 s demo of a product that does work from a request (an agent, an assistant, a generator), laid over the
Remotion starter by `bash scripts/new-film.sh <dir> --template prompt-run` (template.json lists the files it copies and
the starter acts it removes). Crisp pace, bold type (a launch film; calm only when the direction is), 120 BPM until the track's grid is in; 9 bars and a 1.6 s tail as
written.

**The shape.** One object through many states: what it is among the tools it really connects, the request, the send,
the work, the result, the name. Continuity comes from the container (the pill opens the iris or stretches into the box,
the box is punched into, the running row becomes the result card), never from a dissolve. The script's lines land on
the film's dealt voice (`fx/TypePresets` `TypeLine`: `mask`, `land` or `fall`, each leaving at speed on its own exit):
confident hero moves, never a half-faded word soup. The grounds are clean lit pages (`fx/Grounds` `LitGround`, wash or
flat on two page tones, dealt so no ground holds more than two shots: nothing glows behind the words). The tools are
app-icon tiles with their real marks (`kit` `AppIcon`, marks from `scripts/logos.mjs`); the run has the film's one 3D
turn (`lib/camera` `swing3d` or the depth stack's turn), a lit panel (`fx/Lit`) and crafted portraits (`AvatarStack`).

**The deal.** Each act is a slot with two or three devices on the same cues and the same words (`src/deal.ts`,
`template.json` "deal"). `DEAL` picks one per slot from a seed (the product's name, or `SEED`) under its `RULES` (one
colour event per film: the iris's field or the claim's flood), so two films never play one sequence; `PIN` chooses a
device by hand once the direction asks for it. The timeline's seams, cuts and colour event follow the deal.

| # | act | the beat | devices | the slot |
|---|---|---|---|---|
| 0 | the voice | every script line | `mask` (out of a mask on its baseline, leaves dropping), `land` (lands from x1.35, leaves sliding), `fall` (word by word from above, the last in the accent) | |
| 1 | `pill` | the label lands inside a pill among the tools' tiles; it drops out before the kick; on the kick the second label lands and the pill re-fits it, its rim turning; a wind-up | `ring` (the tiles tumble in round the pill, orbit, fly off on the kick), `dock` (they fly into the pill on the kick and dock as a row of marks beside the label), `wall` (on the far plane of a depth stack behind the pill) | `lines.what`, `lines.ask`, `tools` |
| 2 | `ask` | the request box; the line over it; the request types fast, slowing toward its end; the send button arms; a creep; a hard punch-in on the act line | `iris` (the iris out of the pill onto the accent, the field wiping up off the frame, the line knocked out of it), `stretch` (the pill itself stretches into the box, no cut) | `lines.tell`, `request`, `chip` |
| 3 | `click` | the close-up breathes back from x2.44; the typing slows; the send swells; an ease-in whip up cut at its fastest frame | `pointer` (glides in on an arc and clicks), `tap` (a press ring opens from the button's rim) | |
| 4 | `run` | the whip carried up; the request as the user's bubble with the people it is for; the status; the steps gliding in solid, spinners turning to checks, the last still running | `list` (one lit panel the camera swings round to face), `stack` (each step a card in a depth stack, the camera pushing through on a turn), `split` (beside the product's own dense screen, its lens moving to the row each step touches) | `people`, `status`, `steps`, `world` |
| 5 | `done` | the result | `morph` (the running row grows into the result card, the line over it; soft into the lockup), `claim` (the accent rises over the run and the line is the claim on it, the result card under it: the colour event) | `result`, `lines.done` |
| 6 | `end` | the lockup; the close on the voice; about 1.6 s on a creep while the last hit rings | `pop` (the mark lands, the name slides out from behind it), `assemble` (the mark's parts glide in and lock) | the name, `lines.close` |

**What to write.**
- `src/run.ts`: the script (2-7 words a line: what it is, what to ask it, what to do, the result, the close), the tools
  it really connects (4-7: the slug of each real mark, `node scripts/logos.mjs get <name> --film .`, with a glyph for
  any tool without one), the request as the user types it (one plain sentence, 72 characters at most), the model chip,
  the people it is for (2-4 initials), the status, 3-5 steps (a verb and its object), the product's records for the
  split run (`world`, kit/data.ts shape) and the result card. Delete its placeholder lines.
- The faces and the result's picture: `photos.people` are real portraits of the people the work is for, in order
  (`node scripts/assets.mjs search "<person> portrait" --kind photo --people --fit 1:1`, `get`, `grade`); without
  them the stack shows their initials. `photos.result` is the picture the product made when its result is a picture
  (an edited photo, a generated image), shown on the result card. Never a drawn face (lint-film and the layout audit
  fail one).
- The product's own screens: `acts/Ask.tsx` and `acts/Run.tsx` draw the kit's `Composer`, `Bubble`, `AvatarStack`,
  `DenseScreen` and `Notice` as the floor; rebuild the product's real request box and run view at film size (every web
  size x1.9).
- The brand: `--brand <kit>` writes the tokens, the logo's parts and the name; ask for the logo file, never draw one.
- The direction: deal it and retell this floor in its world: its grounds, light and type replace `acts/stage.tsx`.
  The request box stands on the film's one colour ground, the tilted tint (`fx/Grounds` `tint`), the click on the same.

**Timing.** `src/timeline.ts` places every act on a bar line and every state change as a CUE on the 16th grid; each
label is read whole before the next (`what` from the first frame, the kick on beat 4.5); `TYPING` holds the request's
rates, `VOICE60` how long the voice takes to land a line, `STEPS` the rows' onsets. A line cut before its read
fails at import.

**Checks a filled scaffold passes.** `tsc`, `lint-film` (only the brand's and the content file's placeholders left),
`grid-check` (with a 104, 120 or 136 BPM track) and copy-check; on a half-size render, `forensics.py`'s motion gates (the
punch-in is the film's one declared snap zoom; no frozen run; settles of 3.5 f@30 or more; at most 2 primary moves per
3 s). The whip and the wipes are designed cuts: pass them with `--cuts`, printed by
`npx tsx -e "import('./src/timeline.ts').then((t) => console.log((t.CUTS ?? t.default.CUTS).join(',')))"`.

**Music and sound.** Cut to a licensed, human-made, instrumental track (`template.json` -> `music`): 104-136 BPM with a
clear kick; then `track.py edit`, `grid` and `check`. `src/sync.ts` places few effects, in story order: the label, the
kick (one event for all the tools), the way into the box, the typing, the send button arming, the punch-in, the send
(forced: restraint never drops it), the whip, the turn, the checks, the result, ONE element at the lockup.
