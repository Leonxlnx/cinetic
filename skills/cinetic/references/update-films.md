# Update films: "vX is out"

Launch films and update films are the two first-class formats of cinetic. A launch film tells a product's story; an
update film says that a new version exists and shows what changed, fast: each change is **one line and one house scene
in 2-4 s** (the line read in 1.2 s, the scene 3 s at most), understood on the first viewing, then the brand's mark pulls
back into the lockup and the version lands on the bar line; the film is over 2 s after the lockup forms. The scenes come from the scene bank (`src/scenes`: one moment each, 1.5-3 s, filled with the product's
own words, pictures and mark, painted in the film's colours). The update template (`assets/templates/update`) builds
all of it from one file and the film's content; this page is its shape, what you write, what it deals and how to look
at it early.

Contents: 1. The shape · 2. Start · 3. Writing the changes · 4. The scenes · 5. Lines, grounds and colour · 6. Timing ·
7. Sound · 8. Look early, gates and traps

## 1. The shape

| Part | What happens | Length |
|---|---|---|
| Hook | the product's name, already moving on the first frame, lands centred on a clean ground and the version arrives beside it (`pill`: the accent pill lands; `roll`: the old numerals roll up to the new; `tag`: the name slides aside and the version cuts on in the accent) | 1.6 s at most |
| Change × 2-3 | its line alone on the ground of its scene (in and read in 1.2 s), then the scene that proves it (section 4, 3 s at most); a scene that sets the line itself plays alone; a scene that takes over the element the one before hands on follows it on a match cut | 2-4 s each, a typed change 3 s |
| Lockup | mark-pullback: the brand's mark as a solid pulls back from an extreme close-up with a roll (about 1 s), one snap to the lockup assembling; the version lands under it as a pill on the bar line that ends the body; it keeps pushing toward the lens to the last frame | 2 s from the lockup's first frame to the film's last, at least 1 s after the version |

Two changes run 9-12 s, three 12-15 s; the film stays inside 8-20 s. At least one scene of the film is a big one (a press opening a
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
| `show` | `tap` (`action`, `done`, `result`), `type` (the request typed and sent: about 20 characters type in macro-type inside the change's 3 s, a longer one in glass-prompt), `fill` (`list`, or `grid` of photos; a row's `photo` is its toast's face), `count` (from, to, unit (a currency sign leads the figure), on a `picture`), `page` (`doc` from src/content.ts, its heading) |
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

A whole update (Harbor 4.0, a team travel app, 13.4 s): "Harbor" is already landing on the near-black ground on the first
frame, slides aside, and "4.0" cuts on in vermilion (1.4 s). The hook racks out of focus into a white ground where "Book trips
by asking" lands whole (1.1 s); the giant text cursor clicks the input and "Lisbon on Friday" types at macro scale, the
camera on the caret, running on to send, which a real pointer presses (1.8 s). A defocus into the accent field: "Approvals
land in seconds" (1.1 s), then three approvals with the approvers' faces climb into a centred depth stack (1.8 s). "Every
trip costs less" on white dissolves into a Lisbon photo developing from the accent while one large glass card, centred,
counts £420 to £1,180 (2.1 s). The mark pulls back from a close-up (1.1 s), one snap to the lockup, and the 4.0 pill lands
under it on the track's last hit; the film ends 2 s after the lockup formed.

## 4. The scenes

Each change takes the first scene in the film's order (dealt from the name, the last films' scenes late) that films it
(`src/deal.ts` `sceneFit`), the ones its words ask for first; a film with no big scene among its changes gives one change
a big one; where a scene hands on the very element the next scene takes over (macro-type ends on the send button that
porthole-line's pointer presses), the change before takes that scene so the two join on a match cut.

| the change is | scene | what the viewer sees | its line |
|---|---|---|---|
| a press that opens a picture | `porthole-line` (big) | a real pointer presses send at macro scale; the button drains into a porthole holding the picture | giant on two lines, parted round the porthole |
| a press, 2-4 words | `decode-title` (big) | the line decodes out of a swirl of the accent on a dark dot grid; its button flies into the line and a pointer clicks it | decoded |
| a typed request of about 20 characters | `macro-type` (big) | the giant cursor, entered as it nears the field, clicks; the request types at macro scale, the camera on the caret, on to send | on its card |
| a typed request | `glass-prompt` | a dark frosted box rises out of blur with light on its rims; the stage whips aside and the request types in | on its card |
| a list | `toast-stack` | the rows land as notifications (each row's real face) and pile into a depth stack centred on the accent field, the newest sharp in front | on its card |
| a page | `page-fly` (big) | the page rises on a tilted plane out of a dark void; the camera dives onto its headline and travels it | on its card |
| 8+ pictures | `photo-river` (big) | one card pumps through the pictures faster and faster and unfolds into a row receding in depth | on its card |
| a figure on a picture | `photo-counters` | the picture develops from a duotone while one large glass card, centred, counts the figure up and holds it | on its card |
| 3+ products it works with | `orbit-chips` | the partners' official marks fly in as pills and land as chips orbiting the line | on the orbits |

Every press is a real arrow pointer, never a click circle. The scenes run on the plan's clock: a scene given more time
plays a few frames of its held result slower (never frozen), one that hands its element on ends before its own last
press, and one entered late (macro-type, toast-stack) starts on its move already travelling. A scene's subject is the
frame's subject: the toast stack centred and 72 % of the frame wide, the counter card centred and 43 % wide.

## 5. Lines, grounds and colour

- **Text only on a clean ground.** A change's line stands alone on one flat colour: the ground of the scene it leads
  into, so the line and its picture share the frame's colour and the cut keeps it. Never a line over a picture, a blur
  or a busy field; the scenes that set words do so on their own clean grounds.
- **One move, one size, big.** Every line arrives on the film's dealt move (`voice`: `whole`, a focus pull; `chunks`,
  2-3 phrases rising out of their masks; `track`, whole as its tracking closes), never word by word, centred, at the
  dealt size (`set`: a cap of 8 % of the frame, or a statement at 11 %; a line too wide breaks onto two lines before it
  would shrink under 6.5 %), its key words in the accent on about half the lines. It is in and read in 1.2 s.
- **Colours from the brand, else a designed palette.** `src/acts/look.tsx` takes the brand's colours when
  `src/brand/tokens.ts` carries them; until then the film plays the palette dealt for it (`src/deal.ts` PALETTES: a
  near-black or a white ground, one strong accent). Never a tinted wash, never the starter's green, never a scene's own
  demo colours: each scene takes the ground its picture needs (dark, light, the film's base, or the accent as a full
  field) in the film's colours.

## 6. Timing

Every length is `src/deal.ts` LIMITS, and `src/timeline.ts` builds the plan inside them: a lone line in and read in
1.2 s (its move and the pace's read, its cut on the 16th grid inside the 1.2 s), a scene 3 s, a change 4 s, a typed
change 3 s, the hook 1.6 s, the lockup 2 s from its first frame to the film's last with the version at least 1 s before
the end, one snap zoom, the film 8-20 s. A plan outside them throws (FAULTS, with the plan line): grid-check, the Studio
and the render stop and say what to shorten. Never raise a limit to pass: shorten the line or the request, give the scene
less content, or choose another scene (`scene` with `why`). The version lands on the first bar line once the lockup is
read (about half a second after it forms): the bar line that ends the body and carries the track's final hit. When that
bar line is further off, the hook, the scenes with a rest and the pull-back's rest take the time, a little each, inside
their limits; never the cards. One act: the film declares no act boundary the track must land on; the version mark is
its structural cue.

Nothing stands still and nothing cuts bare: the hook and each card push toward the lens at a steady rate from their
first frame, the lockup keeps the pull-back's push; a change the scene before does not carry comes in through a defocus
(what was before racks out of focus with a push, the cut inside the blur, the new ground racks in), and a card's line
dissolves off over its scene's first frames on the shared ground.

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
   is each line big and read at once, does every line stand on a clean ground, is each scene's subject the frame's
   subject, is every press a pointer, are the colours the film's own.
3. The draft with its sound: `bash scripts/render.sh Film out/draft.mp4 --draft` (half size, parts it resumes).

Gates: `npx tsx scripts/grid-check.ts src/timeline.ts`; `python3 scripts/forensics.py out/draft.mp4 --cues
out/cues.json` (its motion floor: under 10 % of the body near-still); `python3 scripts/look-audit.py out/draft.mp4
--look`. Traps: a feature list in text; a line over a picture; a line typed word by word; a change that takes 5 s to
read; a limit raised to pass; a lockup that stands; a request typed longer than about 20 characters into macro-type; a press with a circle instead of
a pointer; the starter's green or a scene's demo colours left in; initials instead of faces; a drawn stand-in for a
real company's mark; a fourth change (a second film); rendering the whole film before looking at the lockup.
