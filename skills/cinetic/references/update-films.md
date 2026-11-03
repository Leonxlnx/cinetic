# Update films: "vX is out"

Launch films and update films are the two first-class formats of cinetic. A launch film tells a product's story; an
update film says that a new version exists and shows what changed, fast: each change is **one line and one house scene
in 2-4 s**, understood on the first viewing, then the brand's mark pulls back into the lockup and the version lands on
the bar line. The scenes come from the scene bank (`src/scenes`: one moment each, 1.5-3 s, filled with the product's
own words, pictures and mark, painted in the film's colours). The update template (`assets/templates/update`) builds
all of it from one file and the film's content; this page is its shape, what you write, what it deals and how to look
at it early.

Contents: 1. The shape · 2. Start · 3. Writing the changes · 4. The scenes · 5. Lines, grounds and colour · 6. Timing ·
7. Sound · 8. Look early, gates and traps

## 1. The shape

| Part | What happens | Length |
|---|---|---|
| Hook | the product's name builds centred on a clean ground and the version arrives beside it (`pill`: the accent pill lands; `roll`: the old numerals roll up to the new; `tag`: the name slides aside and the version cuts on in the accent) | about 1.5 s |
| Change × 2-3 | its line alone on the ground of its scene, then the scene that proves it (section 4); a scene that sets the line itself plays alone; a scene that takes over the element the one before hands on follows it on a match cut | 2-4 s each |
| Lockup | mark-pullback: the brand's mark as a solid pulls back from an extreme close-up with a roll, cuts to the flat mark, the lockup assembles; the version lands under it as a pill on the bar line that ends the body; it keeps creeping toward the lens to the last frame | 2.5 s and the tail (1.5 s or the track's ring-out) |

Two changes run 11-15 s, three stay inside 20 s. At least one scene of the film is a big one (a press opening a
porthole, a request typed at macro scale, a page flown, a row of pictures in depth, a title decoding), and the mark
pull-back is the end of every update film.

## 2. Start

```bash
bash scripts/new-film.sh <dir> --format update --name "<Product>" [--brand <kit>] [--music <file> --record <licence.json>]
cd <dir>
node scripts/content.mjs --brief BRIEF.md --fetch --force   # the people with real faces, pictures, the product's screens
npx tsx scripts/type-deal.ts --seed "<Product>"             # the type pairing (new-film.sh deals one from the name)
```

Then write `src/update.ts` (section 3), the brand (the palette in `src/brand/tokens.ts`, the mark's SVG with named parts
in `src/brand/logo.ts`; a real company's mark is its official file: `node scripts/logos.mjs get <name> --film .`), and
print the plan: `npx tsx -e "import { PLAN_LINE } from './src/timeline'; console.log(PLAN_LINE)"` gives the hook, each
change's card and scene with their seconds, and the lockup. The deal: template.json `deal.print` (the palette, the
hook, the lines' move and size, each change's scene). `PIN` fixes a slot, `SEED` re-deals, a change's `scene` (with
`why`) chooses by hand.

## 3. Writing the changes

`src/update.ts` holds the facts: the version, the one before it, the `session` (the one task the film follows, as a verb
phrase), its `case` (the names and numbers the screens show) and 2-3 changes **in the order the session meets them**.

| field | what it is |
|---|---|
| `words` | one plain sentence of 2-6 words, the result the user sees ("Calls start in one tap"), never a feature name |
| `key` | the words set apart in the accent (on a parted line they open its bottom line) |
| `verb` | the change's verb ('ask', 'join', 'see'): it weighs the scenes whose words it touches |
| `title`, `sub` | the screen's own header, in the product's words |
| `show` | `tap` (`action`, `done`, `result`), `type` (the request typed and sent, up to 40 characters for macro-type), `fill` (`list`, or `grid` of photos), `count` (from, to, unit, on a `picture`), `page` (`doc` from src/content.ts, its heading) |
| `picture` | one real picture the change opens onto: a face (`CONTENT.people[k].photo`), a place, the product's shot |
| `photos` | 8 or more pictures the change is about |
| `logos` | 3 or more products it works with: their official marks (`node scripts/logos.mjs get <name> --film .`) |
| `scene`, `why` | a scene chosen by hand, and what in the change rules the dealt one out |
| `split` | the words on the top line of a line a scene parts |

- **Each change is a state change you can see**: a press and what it opens, a request typed and sent, rows arriving, a
  page made, pictures, a figure. A change that cannot be shown (a fix, a speed-up) shows its consequence: the number
  that changed, the wait that no longer happens.
- **People are real faces or absent**, never initials; one face is one person through the film.
- **Test it muted:** a stranger says what changed after one viewing.

A whole update (Corla 2.6, a calls app, 13.7 s): "Corla" rises out of its mask in near-black on the dealt white ground, slides aside,
and "2.6" cuts on in tangerine. A white ground wipes up and "Book calls by asking" rises word by word alone; a giant pointer turns
into a text cursor, clicks the input and "Call Nora at 4 pm" types at macro scale with the camera on the caret, running
on to the send button. Cut on the button: a real pointer presses it, the button drains into a porthole, Nora's face
rises into it and "Calls start in / one tap" parts round it. The mark pulls back into "Corla"; the 2.6 pill lands under
it on the track's last hit.

## 4. The scenes

Each change takes the first scene in the film's order (dealt from the name, the last films' scenes late) that films it
(`src/deal.ts` `sceneFit`), the ones its words ask for first; a film with no big scene among its changes gives one change
a big one; where a scene hands on the very element the next scene takes over (macro-type ends on the send button that
porthole-line's pointer presses), the change before takes that scene so the two join on a match cut.

| the change is | scene | what the viewer sees | its line |
|---|---|---|---|
| a press that opens a picture | `porthole-line` (big) | a real pointer presses send at macro scale; the button drains into a porthole holding the picture | giant on two lines, parted round the porthole |
| a press, 2-4 words | `decode-title` (big) | the line decodes out of a swirl of the accent on a dark dot grid; its button flies into the line and a pointer clicks it | decoded |
| a typed request | `macro-type` (big) | a giant pointer becomes a text cursor; the request types at macro scale, the camera on the caret, on to send | on its card |
| a typed request | `glass-prompt` | a dark frosted box rises out of blur with light on its rims; the stage whips aside and the request types in | on its card |
| a list | `toast-stack` | the rows land as notifications and pile into a depth stack on the accent field, the newest sharp in front | on its card |
| a page | `page-fly` (big) | the page rises on a tilted plane out of a dark void; the camera dives onto its headline and travels it | on its card |
| 8+ pictures | `photo-river` (big) | one card pumps through the pictures faster and faster and unfolds into a row receding in depth | on its card |
| a figure on a picture | `photo-counters` | the picture develops from a duotone while glass cards count the figure up | on its card |
| 3+ products it works with | `orbit-chips` | the partners' official marks fly in as pills and land as chips orbiting the line | on the orbits |

Every press is a real arrow pointer, never a click circle. The scenes run on the plan's clock: a scene given more time
plays a few frames of its held result slower (never frozen), and one that hands its element on ends before its own last
press.

## 5. Lines, grounds and colour

- **Text only on a clean ground.** A change's line stands alone on one flat colour: the ground of the scene it leads
  into, so the line and its picture share the frame's colour and the cut keeps it. Never a line over a picture, a blur
  or a busy field; the scenes that set words do so on their own clean grounds.
- **One move, one size.** Every line arrives on the film's dealt move (`voice`: build, open, mask), centred, at the
  dealt size (`set`: the sentence line or a statement half again larger), its key words in the accent on about half
  the lines.
- **Colours from the brand, else a designed palette.** `src/acts/look.tsx` takes the brand's colours when
  `src/brand/tokens.ts` carries them; until then the film plays the palette dealt for it (`src/deal.ts` PALETTES: a
  near-black or a white ground, one strong accent). Never a tinted wash, never the starter's green, never a scene's own
  demo colours: each scene takes the ground its picture needs (dark, light, the film's base, or the accent as a full
  field) in the film's colours.

## 6. Timing

The cuts sit on the 16th grid where each part is understood, never stretched to a bar: a card is its line's move plus
the pace's read (about 1.2-1.6 s), a scene its own measured length (1.6-3.2 s). The version lands on the first bar line
once the lockup's name is read: the bar line that ends the body and carries the track's final hit. When that bar line
would leave the lockup waiting more than half a second, the hook, the cards and the scenes with a rest take the time
instead, a little each. One act: the film declares no act boundary the track must land on; the version mark is its
structural cue.

## 7. Sound

An update film is cut to a licensed, human-made, instrumental track (`references/music.md`): `node scripts/music.mjs
search --mood "<the film's mood words>" --bpm 112-128 --length <s>`, `sheet --measure`, `get '#n' --to audio/music`,
then `python3 scripts/audio/track.py fit --end auto` once `update.ts` is written (its final hit on the version mark).
`src/sync.ts` voices each scene's own moments (its meta cues: the press, the porthole opening, the keys, each
notification, the page landing) where the film plays them, one soft text sound per line card a few frames after it is
read, the version's arrival in the hook, the pull-back, the lockup and the version mark; nothing on a start. `npm run
sound` builds and meters it; rebuild it after every timing change.

## 8. Look early, gates and traps

1. The lockup first: `node scripts/frames.mjs end`.
2. A sheet of the whole film: `node scripts/frames.mjs sheet --every 24`. Judge: is each change understood in its 2-4 s,
   does every line stand on a clean ground, is every press a pointer, are the colours the film's own.
3. The draft with its sound: `bash scripts/render.sh Film out/draft.mp4 --draft` (half size, parts it resumes).

Gates: `npx tsx scripts/grid-check.ts src/timeline.ts`; `python3 scripts/forensics.py out/draft.mp4 --cues
out/cues.json`; `python3 scripts/look-audit.py out/draft.mp4 --look`. Traps: a feature list in text; a line over a
picture; a change that takes 5 s to read; a request typed longer than 40 characters; a press with a circle instead of
a pointer; the starter's green or a scene's demo colours left in; initials instead of faces; a drawn stand-in for a
real company's mark; a fourth change (a second film); rendering the whole film before looking at the lockup.
