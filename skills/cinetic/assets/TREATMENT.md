# TREATMENT: <film name>

<!--
The treatment: copy this file to the project root as TREATMENT.md, fill every <…> and delete the example at the bottom.
It is one page, written in the first 15 minutes, before any build: the script, the picks, the beat plan.
Script rules: references/copy-and-type.md. Picks: references/catalogue.md. The beat grammar: references/formats.md.
For an update film the beats follow references/update-films.md; for a loop or a sting, fill 0, 0b, 2 (2-6 rows) and 4.
-->

**Spec:** `<W>x<H>@<fps>, <length>s, format: <launch | update | …>, audio: licensed track "<title>" (<licence>) + launch kit, <own | fade | hit> ending` · **Engine:** <Remotion | HyperFrames> · **Template:** <launch-simple | …>
**Name:** <the product's name, as written> · **Product:** <what it is and does, in plain words> · **Viewer:** <who watches, and where>
**Assumptions:** <anything you inferred rather than were told> · **Supplied:** <brand kit | clip | pictures | footage | none>

## 0. Direction
`<!-- deck.py --seed <n> --direction <id> -->` (the line `scripts/deck.py` printed; one direction is dealt by default)
- **Direction:** <id and name> · **Palette and type:** <the dealt recipe and settings, or the brand's>
- **Idea sentence:** In this film, <something only this product has> becomes <what the picture does with it>.
- **Competitor test:** with <nearest competitor> in the sentence it <fails, because …>.
- **Core action:** <the input> becomes <the output>, shown literally in the first picture beat (<real footage or a photo of a person giving the input, from `scripts/assets.mjs recipe "<product>"`, then the product's UI>).

## 0b. Script
Plain words a stranger understands with the sound off: what the product is by 3 s, then one concrete thing it does a line, then the name and what to do. 1-5 words a line typically, 2-7 at most, one claim each, one line on screen at a time.

| # | Role | Line | Words | At |
|---|---|---|---|---|
| 1 | what it is | <[Name] turns [input] into [output]. or [Name] is a [plain category] for [who].> | <2–7> | <≤ 1> |
| 2 | does | <one concrete thing it does, with a verb> | <…> | <…> |
| 3 | does | <…> | <…> | <…> |
| 4 | close | <the name and what to do: "[Name] is out now.", a URL> | <…> | <…> |

Checks: `python3 scripts/copy-check.py TREATMENT.md` passes, and its "a stranger reads" summary says what the product is, what it does and what to do.

## 1. Picks (`film.json` devices)
One of each from `references/catalogue.md`, none the last three films' (`film.json` recent; `node scripts/film-diff.mjs` checks):

| Slot | Pick | Why it fits this product |
|---|---|---|
| Text voice | <build | blur | ink | …> (hero accent, at most one per 30 s: <snap | split-around | … | none>) | <…> |
| Emphasis | <colour on the key word (default) | none | the one signature mark> | <…> |
| Moves (2-3) | <…> | <…> |
| Signature | <the one shot people remember> on beat <#> | <…> |
| Seams (2-3) | <exitEnter | textSwap | matchCut | velocityCut | blurThrough | zoomThrough | sharedElement> | <…> |
| Ground family | <nearWhite | blackField | whiteBand | deepPool | softSky | lightDark | gradientField> | <…> |
| End card | <element | badge | word | …> | <…> |
| Other products' marks | <chip-in-line | pills-around | wall | none> | <…> |

## 2. Beat plan
T = a line alone, centred, on the clean ground (0.5-2.3 s); A = the product acting, full frame, no statement over it (1-3.5 s); T+A only where the line names what the picture is doing (at most 40 % of the beats). Each A names the visible change that proves the line before it; a line no A beat proves is cut.

| # | Time | Beat | Line or picture | The visible change (A) | Seam in | Sound |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:01.5 | T | <line 1> | – | – | <the track's intro> |
| 2 | 0:01.5–0:04.0 | A | <the core action> | <input -> output> | <matchCut> | <…> |
| … | | | | | | |
| n | <…> | end | centred lockup built from <the last element>, the one fact under it | – | <sharedElement> | <one hit; the ending rings> |

## 3. Final frame (the poster)
<The centred lockup as a still: the ground, the mark (the brand's own, or built from the film's last element), the name once, the one fact under it.>

## 4. Gate (the item-28 checklist, `assets/critics/director.md`)
- [ ] every statement centred in the middle band; none flush left at the top or bottom; at most one text-top split (a line
  above a picture that fills the rest of the frame)
- [ ] two or more type-only beats; T+A at most 40 % of the beats; the first line by 1 s; every A shows the product doing the thing
- [ ] one text voice; emphasis on at most two lines, colour by default; no box or marker unless it is the signature
- [ ] every hard cut carries a device; at most two ground flips; one exit-then-enter, text-swap or match-cut
- [ ] clean UI, real words, current marks in one presentation; the end card centred, built from the last element, held 2-3 s
- [ ] ground, voice, signature and end card apart from the last three films (`film-diff.mjs`)
- [ ] less text: no text in 15 % of the frames or more; at most two text blocks at once outside a product beat
- [ ] premium, not just clean: depth and motivated light, hero type at 6-9 % of the frame height, the signature lands
- [ ] no hard ban (`SKILL.md`); brand-supplied exceptions listed in `BRIEF.md`

---

# Example: Plumb (fictional; delete this section in your copy)

**Spec:** `1920x1080@30, 22s, format: launch, audio: licensed track (no-credit licence, 104 BPM) + launch kit, own ending` · **Engine:** Remotion · **Template:** launch-simple
**Name:** Plumb · **Product:** a code review tool that finds the few lines in a huge pull request that can break production · **Viewer:** engineers, muted in a feed first

## 0. Direction
- **Direction:** dealt `statement` (the line is the shot, the product answers it full frame) · **Palette and type:** a black field under one soft key, white type, a safety-yellow accent
- **Idea sentence:** In this film, the three lines out of 2,184 that can break production become the only three lit rows of a dark diff.
- **Competitor test:** with a linter in the sentence it fails: a linter lights every warning, not three.
- **Core action:** a 2,184-line diff becomes three lit rows, in the first picture beat (the product's own diff view).

## 0b. Script
| # | Role | Line | Words | At |
|---|---|---|---|---|
| 1 | what it is | Plumb reviews your pull requests. | 5 | 0.3 |
| 2 | does | It reads all 2,184 changed lines. | 6 | 4.0 |
| 3 | does | It flags the lines that can break. | 7 | 8.2 |
| 4 | does | You read three lines, not 2,184. | 6 | 12.6 |
| 5 | close | Try Plumb free at plumb.dev. | 5 | 19.0 |

## 1. Picks
| Slot | Pick | Why |
|---|---|---|
| Text voice | `build`; hero accent `snap` on line 4 | a review reads word by word; the snap lands "not 2,184" |
| Emphasis | colour on "three" (line 4) and "break" (line 3) | two of five lines |
| Moves | `focus-isolate`, `counter`, `push` | the diff narrows to the rows that matter; the count drops |
| Signature | the diff's 2,184 rows dim at once and three stay lit (beat 6) | the product's whole point in one frame |
| Seams | `matchCut` (line into picture), `blurThrough` (picture into line), `sharedElement` (into the end) | the line's last word holds its slot as the diff grows round it |
| Ground family | `blackField` | the lit rows read as light |
| End card | `element`: the last lit row shrinks into the mark's tile | built from the last element |
| Other products' marks | none | |

## 2. Beat plan
| # | Time | Beat | Line or picture | The visible change | Seam in | Sound |
|---|---|---|---|---|---|---|
| 1 | 0:00–0:01.6 | T | Plumb reviews your pull requests. | – | – | the intro |
| 2 | 0:01.6–0:04.0 | A | the pull request streams in | the diff scrolls to its end, the count lands at 2,184 | matchCut | ticks with the scroll |
| 3 | 0:04.0–0:05.4 | T | It reads all 2,184 changed lines. | – | blurThrough | |
| 4 | 0:05.4–0:08.2 | A | the review pass | rows tick from grey to read, the counter climbs | velocityCut | a soft roll |
| 5 | 0:08.2–0:09.6 | T | It flags the lines that can break. | – | blurThrough | |
| 6 | 0:09.6–0:12.6 | A | the signature | 2,181 rows dim, three stay lit in yellow | matchCut | the track's entry |
| 7 | 0:12.6–0:14.2 | T | You read three lines, not 2,184. | – | blurThrough | |
| 8 | 0:14.2–0:18.0 | A | the fix | one lit row's `=` becomes `===`, the row turns calm | matchCut | one click |
| 9 | 0:18.0–0:22.0 | end | the last lit row shrinks into the mark; "plumb" slides out; "Try Plumb free at plumb.dev." | – | sharedElement | one hit; the own ending rings |

## 3. Final frame
The black field under its key, the mark (a lit row folded into a plumb bob) and "plumb" centred a little above the middle, "Try Plumb free at plumb.dev." under it at the caption size.
