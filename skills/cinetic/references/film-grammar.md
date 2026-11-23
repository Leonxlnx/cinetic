# Film grammar: how a 20-60 s launch film is built

A launch, feature or update film is not a list of slides. It is one argument told in beats, where each beat does one
job, each beat hands something to the next, and the pace changes on purpose. This file is the structure layer: what the
sections are, how long they run, how ideas chain, how rhythm is shaped, and four proven beat tables you can adapt.
Everything is at 30 fps. Motion recipes live in `motion/*.md`; this file decides *what happens when*.

---

## 1. Lengths and what they can hold

| Format | Length | Beats | Holds | Typical use |
|---|---|---|---|---|
| Sting / teaser | 6-15 s | 5-9 | 1 | social, "coming soon", a single feature |
| Feature film | 20-35 s | 10-20 | 2 | one feature or update, landing-page hero |
| Launch film | 40-60 s | 25-45 | 3-4 | a new product or a major version |
| Explainer launch | 60-90 s | 35-50 | 4-5 | an abstract product that needs a demo act |

A **beat** is one idea the viewer takes in (a word lands, a card rewrites itself, a counter settles). A **shot** is what
lies between two real cuts. Good films have short beats and long felt shots: beats of 1.4-2.7 s on average, but cuts that
are carried so well that the viewer remembers "one continuous camera". Count both when you plan.

One feature = one action = one visible result. If a beat needs a sentence to explain, it is two beats.

---

## 2. Sections and their jobs

| Section | Job | Share of runtime | Length at 30 fps | Enters by | Leaves by |
|---|---|---|---|---|---|
| **Hook** | stop the scroll; show a device, a question or the product's artefact | 5-12 % | 45-120 f | first frame already moving | a carried cut or a dive |
| **Problem** | make the pain felt, escalating density | 10-20 % | 90-360 f | hard cut on a beat or ground-colour change | a held question |
| **Pivot / held question** | the one designed stillness before the answer | 3-5 % | 45-75 f | resolve of the problem device | breath gap, then hit |
| **Reveal** | name and mark, born from the film's own devices | 5-10 % | 45-120 f | lands on the biggest hit so far | grows into the feature map |
| **Features** | 3-5 chapters, each one action and one result | 40-55 % | 75-240 f each | dive, carry, or hub | state change, then carry |
| **Proof** | numbers, real logos, the result in the world | 8-15 % | 60-180 f | from the last feature's result | gathers into the climax |
| **Climax** | everything connects; densest or biggest beat | 5-8 % | 45-90 f | assembly, scatter, scale-out | snaps into the lockup |
| **Lockup / CTA** | mark, name, one line, URL; the only true rest | 5-8 % | 45-60 f | grows out of an object already on screen | music decays under it |

Rules that hold across all good films:

- **Open on a device, not a company introduction.** The first 2-3 s are motion with an idea in it: a mark that assembles
  from pieces, a word built in hot colour, a seed glyph that opens an iris onto a world, a hairline that becomes a
  shape. A brand sting under 2 s is fine if it *moves into* the film (it grows, dives, or becomes the first object).
  A static logo card is never fine. Pick the opening from the menu in [Devices](#openings); a macro pull-back is one entry
  among nine, not the default, and the film's scale jump does not have to happen in its first second.
- **Show the product or its artefact by 3-5 s** (an input field, a result, a card) unless the film is a teaser.
- **The problem act escalates.** Words literally pile up, sizes grow (each new word ~1.4x the last), cadence quickens
  (~0.8 s per beat), and it ends on **one** held frame of 45-75 f: a single unresolved line, an empty field, a number that will not settle.
  That hold is the only static frame in the first half, which is why it lands.
- **The reveal lands on the biggest audio hit so far**, after a breath gap (see `sound-design.md`).
- **Features are chapters, not slides.** Each enters by a dive, a hub or a carried object; each shows a real state change
  (an Add pill flips to Added, a check lands, a counter settles); each leaves on motion.
- **The centrepiece feature gets the most time** (the one the product exists for: 1.5-2x the others).
- **The climax re-uses the film's own objects**: bring every hub object together, wire them to the product, scatter them
  to the frame edges where they become the lockup's frame.
- **The lockup is the only real rest.** Everything before it moves. The lockup may still creep 3-5 % over its 2 s, then the film ends;
  the music decays, and the last 0.5-1 s is silence or near silence.
- **CTA is one line**: a URL or "Available today", cut on (no fade) 20-40 f after the mark settles.

---

## 3. How ideas chain

The single biggest difference between a premium launch film and a template is that **every beat is caused by the one
before it**. Pick at least two of these chaining devices per film.

### 3.1 Shared element (the object becomes the next beat)
The element that matters in beat N physically becomes the element of beat N+1. A highlighted item in a feed becomes the
insight pill of the next beat. The selected option collapses into the progress bar. A confirmation line blooms into the next
button. A caption collapses into the icon of the action it names. A send button drains and becomes the window the
answer appears in. The viewer reads cause and effect without being told. Recipes: `motion/turns.md` (object hand-off).

### 3.2 Sentence relay (the line carries across cuts)
A sentence is split across shots: the outer words keep their positions and directions across a hard cut while the middle
word is replaced by the thing it describes (a word becomes a picture). Or the last word of shot A is the first word of
shot B on a new ground (carried word). The line is the thread; grounds, sizes and colours may all change.

### 3.3 Recurring hub (chapters)
A map of N objects, one per feature (N = 3 is ideal, 4 maximum), that recurs at the start of each chapter. Each time,
the camera centres a different object and **dives into it**: its interior becomes the chapter's ground. The way out is a
snap zoom-out back to the hub. For the climax the hub reassembles with the product wired into every object. This is how
a 60 s, five-feature film feels like one place instead of a deck. Recipe: `motion/turns.md` (hub and dive).

### 3.4 Hero relay (one through-line object)
One simple, instantly recognisable shape (a disc, a sphere, a rounded tile, a cursor, the product mark) sits at or near
frame centre in every scene and is *re-meant* by what attaches to it: a selection box, a progress bar docking into it, a
loading ring around it, an avatar inside it, finally the logo built from it. Keep its screen position and radius identical
(within ~5 px) on both sides of every seam.

### 3.5 One invented product carried through every feature (verb ladder)
For a tool (an editor, a generator, a builder), invent one plausible artefact (a campaign, a store, a report) and run every
feature on it: select it, change it, annotate it, ship it, see it in the world. Each verb section re-uses the previous
result, so the demo is one production story with a beginning and an end. Use the client's real domain; never reuse an
artefact from someone else's film.

### 3.6 Recurring word or shape (the rhyme)
A key word returns 2-3 times in new roles (the question, the answer, the outcome). A device that opened the film closes
it (the opening mosaic returns as the end transition; the opening mark replays; the selection grammar converges into the
logo). Bookends tell the viewer "this is the end" without a title card.

### 3.7 Colour script (grounds as act markers)
Give each act its own ground and change it **on a beat**: e.g. a saturated product colour for "the product working", a
dark stage for "input / system", white for statements and the lockup. A full-frame ground change is itself a section
marker; nothing else is needed. Never cross-dissolve between two grounds of different tone (the midpoint is mud).

---

## 4. Rhythm

### 4.1 The density curve
Plan the film as a curve of beats per second, not a list:

```
problem  ████████████  fast, piling up (0.6-0.9 s per beat)
pivot    █             ONE held frame (45-75 f)
reveal   ███           medium, one big hit
features ██████ ████ ██████   medium, each chapter fast-in / readable-hold / fast-out
proof    ████████      faster (accelerating lists, counters)
climax   ██████████    densest
lockup   ██            slow; the only rest
```

Alternate tension and release: FAST, SLOW, FAST, SLOW, FAST, HOLD. Put a deliberate pause (a breath gap of 6-18 f,
sometimes a held frame) right before the climax and right before the reveal.

### 4.2 Shot and beat lengths (30 fps)
- Statement or title card: 30-45 f. Titles are 2-4 words; nothing on screen should need more than 1.5 s to read.
- Reading hold for a line: `words / 3 + 0.5` s minimum (a 9-word line: 105 f). Read it aloud at speed to check.
  At the end the budget wins: a claim of four words or fewer, read while its image still moves, then a lockup of 1.2-2 s
  with the claim staying as its subline. If the claim needs longer, shorten the claim, never lengthen the ending.
- Feature chapter: 75-150 f, centrepiece up to 240 f.
- Genre/flash montages: 9-18 f per shot; holographic texture cuts 2-8 f.
- Transition beats: 6-12 f (they exist, but you should not notice them as beats).
- Lockup: 45-60 f in all, from the last move to the last frame.

### 4.3 Accelerating cadence
Lists, swaps and builds must **compress**, never march. Measured cadences that work:
- build list rows: 9, 9, 9, 7, 5, 4, 3, 3 frames between rows;
- example swaps in a field: 7, 7, 7, 7, 7, 5, 5, 5, 3, 3, 3, 3, 3, 3, 4 frames;
- deck entries alternating front and back every 7-8 frames.
The kit's `stagger(i, base)` compresses with `pow(i, 0.82)`; for a stronger ramp, hand-write the interval array.
Decelerating cadence is the counterpart for emphasis: a colour wave across a word that *slows* letter by letter (2, 2,
2, 2, 3, 4, 4, 4 f) makes the last letters feel weighty; holding back the final word of a line by ~14 f is the punch.

### 4.4 Designed silences
- A near-silent opener (1-3 s) that "earns" the music: the bed enters on the first word, not on frame 0.
- Breath gaps: the bed drops 10-20 dB for 6-18 f before each act's hit.
- A breakdown in long films: the beat stops for 5-10 s in the middle under the most intimate beat, so the drop that ends
  it lands hard.
- The end: a 0.4-0.7 s drop-out before the final kick, or a hard stop of the music and 2-3.5 s of silent hold.

### 4.5 Cut on motion
Hard cuts land **while something moves**: on the fastest frame of an accelerating exit, never after a settle. A cut after
a dead stop reads as "next slide". The only cut that may land on stillness is the one into the lockup, and even there the
mark is usually mid-settle.

### 4.6 Nothing holds
Every element keeps a residual motion after it settles: a creep of 0.5-1 % scale over 20 f, a drift of 0.5-2 px/f, a
breathing glow, a scrolling stripe, a counter, a caret. Only the lockup is allowed to freeze, and only after it has crept.
Test: no two consecutive frames identical anywhere except the last second.

---

## 5. Two clocks

One of the most useful ideas in motion craft: **digital things step, physical things ease.**

- **Smooth clock (every frame):** the camera, footage, light, objects with mass. Eased with `ease.out` / `ease.inOut`, springs.
- **Stepped clock (on twos or threes):** pixels, mosaics, cell growth, voxels, the mark assembling, scramble glyphs,
  handles, a spinner rotating 45 deg per frame, sprites (2-3 f per cel), stop-motion paper (5 f per step = 6 fps).

Put both in one shot: a stepped mosaic under a smooth push, a paper collage on 6 fps steps under a smooth zoom. The
contrast is what makes code-built imagery read as crafted. Implementation: evaluate the stepped elements on
`fe = Math.floor(frame / 2) * 2` (on twos) or `Math.floor(frame / 5) * 5` (6 fps), and the camera on `frame`.

When the brand is editorial or handmade, you may run **all graphics** on twos (15 fps) and keep only photos/footage on
every frame. When the brand is glass and light, run everything on ones and keep a single stepped element (falling pixels,
a spinner) as a hand-made accent.

---

## 6. Four proven structures

Frames are at 30 fps. Device names refer to recipes in `motion/*.md`. These are skeletons: swap in the client's
product, nouns and world; keep the jobs, the proportions and the seams.

### A. Hub and dive (platform launch, 60 s, no voice-over)
Best for: an infrastructure or platform product with three pillars. Worlds: block grid, dark stage, terminal.

| # | f | Beat | Job | Device |
|---|---|---|---|---|
| 1 | 0-45 | a seed device (the mark, a cell, a line) assembles on the stepped clock in near silence | hook | stepped assembly |
| 2 | 45-90 | the device grows into the film's world; the camera dives into one part of it | hook -> problem | zoom-through |
| 3 | 90-200 | the problem in 2-3 short lines set on a surface; each line larger; music enters on the first word | problem | type on a surface |
| 4 | 200-300 | the problem multiplies (tools, costs, requests fan out), cadence quickening; ground cuts on beats | problem | momentum entry, accelerating cadence |
| 5 | 300-360 | **held**: one unresolved line or an empty state; a footnote chip types beside it | pivot | the hold |
| 6 | 360-480 | 2-3 questions on one object seen at three distances, hard cuts on beats | problem | framing escalation |
| 7 | 480-600 | breath gap; the product object arrives on the biggest hit; its name resolves | reveal | stepped grow, decode |
| 8 | 600-700 | one-line claim; the three pillars appear along a camera move | feature map | pan reveal |
| 9 | 700-760 | the ground changes tone by a tile flood or a change of projection | transition | tile flood, dimension swing |
| 10 | 760-860 | **the hub**: three objects with labels, drifting | map | hub |
| 11 | 860-1250 | dive into object 1: its interior is the chapter; real UI, flat and large, with state changes | feature 1 | hub dive |
| 12 | 1250-1500 | snap back to the hub; dive into object 2 | feature 2 | snap zoom-out, hub dive |
| 13 | 1500-1780 | object 3 in macro; live events stream into it | feature 3, proof | push into macro |
| 14 | 1780-1880 | the hub reassembles; the product connects to all three; they fly to the frame edges | climax | fly to edges |
| 15 | 1880-1940 | lockup framed by the flattened objects | lockup | cut-on letters |
| 16 | 1940-2040 | the opening device returns as the end transition; URL decodes; music decays to silence | CTA, bookend | rhyme |

### B. Sentence relay (consumer spot, 15 s)
Best for: a product whose content is pictures, places or people. Worlds: ink on white, editorial paper.

| # | f | Beat | Job | Device |
|---|---|---|---|---|
| 1 | 0-30 | a short question builds word by word; each word arrives hot and cools; the line re-centres | hook | born tint, re-centre |
| 2 | 30-38 | the words drift apart, making room in the middle | hook | make-room exit |
| 3 | 38-75 | cut: the sentence continues, but its key noun is now a picture; more pictures multiply from it | the product appears inside the sentence | word becomes picture, deck |
| 4 | 75-120 | a full-bleed plate breathes out; the mark arrives mid-motion and settles | brand moment | carried entry |
| 5 | 120-200 | the scale claim: a layout passes through the frame and leaves accelerating | feature: scale | direction carry |
| 6 | 200-270 | the variety claim: a stream of content decelerates, cruises, then accelerates into streaks | feature: variety | speed carry |
| 7 | 270-360 | a calm plate; three 2-word benefits, one per second | benefit | counter-zoom phrase |
| 8 | 360-450 | lockup; it keeps growing ~5 % to the last frame | lockup | creep |

### C. UI chain (feature launch, 45 s, with voice-over)
Best for: an AI product with a real flow: input, processing, result, action. Worlds: product colour / dark stage / white.

| # | f | Beat | Job | Device |
|---|---|---|---|---|
| 1 | 0-16 | a 2-3 word title snaps to full size on one frame | hook | cut inside text |
| 2 | 16-47 | the user's starting thing, big and in perspective, rises; pulls back accelerating | setup | perspective rise, carried cut |
| 3 | 47-150 | the same thing, flat and smaller, rewrites itself into the product; checklist rows tick | reveal | one container many identities, punch-in |
| 4 | 136-182 | proof stacks up under it | proof | depth ladder |
| 5 | 182-217 | a panel wipes up carrying the claim | claim | carrier wipe |
| 6 | 217-320 | input: a value typed with a human cadence; a press | how 1 | realistic typing, press |
| 7 | 320-450 | processing: results materialise in the brand tint; a counter climbs by cuts | how 2 | develop, cut counter |
| 8 | 450-490 | the important item becomes the next beat's object | insight | highlight-to-object |
| 9 | 490-560 | options; one is chosen; it collapses into the progress element | decision | select-focus-collapse |
| 10 | 560-790 | the result builds; a list accelerates | creation | accelerating cadence |
| 11 | 790-1000 | the result goes live; a confirmation becomes the next action | features | bloom-morph |
| 12 | 1000-1300 | more proof; the product proposes the next step on its own | proof, climax | notification expand |
| 13 | 1300-1440 | tagline in giant type, one key word recoloured | tagline | giant type, colour wave |
| 14 | 1440-1477 | wordmark assembles, then black | lockup | spaced cut-on |

### D. Hero relay (brand or agent film, 35-45 s, very few cuts)
Best for: a personal, creative or calm product. Worlds: soft air, dark stage with glass.

| # | f | Beat | Job | Device |
|---|---|---|---|---|
| 1 | 0-55 | the category line in cut-on words; it re-lays out to two lines | hook | cut-on stack |
| 2 | 55-120 | the camera moves; a foreground occluder passes; the world changes behind it | world | occluder wipe |
| 3 | 120-200 | the product metaphor as an object with satellites; orbit; focus by depth | metaphor | orbit |
| 4 | 200-280 | the hero shape is born and becomes the anchor of the interface | pivot | object hand-off |
| 5 | 280-560 | the core interaction: ask, think, answer | feature | thinking-to-answer morph |
| 6 | 560-700 | push into the input; the cursor lands; typing with a following camera | interaction | zoom-through, caret follow |
| 7 | 700-860 | the action: the pressed control becomes the window for the payoff | action -> payoff | button-to-window |
| 8 | 860-1060 | the window returns to the interface; result; an iris opens under the UI onto the world | proof | iris under UI |
| 9 | 1060-1160 | the brand promise flies through the lens and settles | promise | type fly-through |
| 10 | 1160-1260 | the mark draws on during its own entrance, settles, keeps shrinking | lockup | trim-path draw |

### Variants worth knowing
- **Verb ladder (40-50 s):** a fast list hook (one word per full-bleed still, 12-18 f each) -> promise -> name -> claim ->
  3-4 imperative verbs run on one invented artefact -> a light, human beat -> the artefact out in the world (pull-backs)
  -> what is next -> lockup. Hard cuts every 9-30 f; a 5-10 s breakdown before the drop.
- **Captioned explainer + lens-only demo (60-90 s):** captions echo the voice-over word by word; the demo act is one UI
  canvas under one camera, with typing time hidden inside whip cuts; a scale-out finale that reveals many instances of
  the product at once; the music stops dead before a silent end card.

### Update film

"Version N is out" for people who already use the product: 8-20 s, one beat per change (2-4 changes), no problem act.

| Beat | Frames (30 fps) | What it does |
|---|---|---|
| version mark | 0-36 | the product's mark or name with the version number arriving as an event (an odometer to the new number, the old number pushed out by the new one, a badge stamped on) |
| change 1..n | 60-110 each | one change = one action and its visible result on the real UI: the toggle flips and the thing happens, the list sorts itself, the report draws. A 2-4 word line names it (cut-on or rise), on clean ground beside or above the UI, never over it |
| hand-offs | inside each change | the result of one change is the start of the next (the synced transaction is the receipt that gets sorted, the sorted receipts become the report's bars) |
| lockup | 45-75 | mark, version, one line ("Update now" or what it unlocks), the URL or store badge |

Rules: show the change, not a feature list; the UI is shown flat and large (one component at a time, camera at 1.2-1.6x on
it); no intro longer than 1.2 s; the version number is the only number that animates for its own sake.

---

## Compositions

Tag every row of `BEATS.md` with one of these. No two adjacent rows share a composition; a film uses at least four, and
exactly one row also carries the tag `spectacle` (the shot that could never be a slide, 1.5-2.5 s, chosen from the
[spectacle menu](#spectacle)), and one row carries `output-big` (the product's result in macro or as giant type, key words
120 px or more; a number is one option, a word, a picture or a state can be the giant output too).

Length by format (shorter is nearly always better): update film 8-18 s, teaser 10-15 s, feature film 15-22 s, launch film
20-30 s. A film runs long when it shows a second full demo: show the core action once, end to end, and any other input
as a 1-2 s variation of the same shot.

| Tag | What fills the frame | Typical use |
|---|---|---|
| `full-ui` | the product's UI edge to edge, cropped by the frame, camera 1.2-1.6x | the core action |
| `macro` | one detail at 3-6x: a caret, a button, a number, a row | the moment of the action |
| `giant-type` | 1-3 words at 20-40 % of the frame height, often cropped or bleeding off | promise, claim, a turn |
| `type-on-surface` | words laid on an object or plane in perspective (a block's face, a floor, a card) | hooks, chapter titles |
| `ground` | one colour or one object fills the frame, by any carrier (`forge`'s beat sheet calls it `flood`) | turns between acts |
| `split` | two grounds or two states side by side (before / after, input / output) | proof, comparison |
| `quantity` | many of a thing (twenty documents, a hundred runs), by any spectacle in the menu (`forge`'s `wall`) | "all of it", scale |
| `panels` | a gutterless grid of 2-4 panels, each on its own clock (`motion/camera.md` 6.6) | the product doing several things at once |
| `object` | one hero object large, lit, turning (a device, a mark, a glass solid, a block) | reveal, climax |
| `surface` | the product's artefact landing inside another product (a message in a chat, a row in a tracker) | integrations |
| `stack` | a depth ladder or pile, tilted, filling the frame | the problem (too much), history |

"Caption + centred card" is not a composition: it is the template look. If a row reads like that, make the card the frame
(`full-ui`), push in on its detail (`macro`) or put the caption on the card (`type-on-surface`).

---

## Devices

Films that look alike share their devices, not their content. Before the rows of `BEATS.md`, write a **Devices** block:
one line per slot, each picked from the menus below by what this product claims, not by habit and not by what the worked
films did.

```
Devices (Ferry, moves files between clouds; the claim: speed)
- signature: the file's folded corner, 5 uses: the hook, two seams, the integration swap, the lockup
- opening: cut-on stack of the category line, the fold turning on its full stop
- text arrivals: cut-on words; last-word swap
- seams: 1-2 velocity cut (right) | 2-3 morph, fold -> progress chip | 3-4 colour-flip cut with a size step (ground cut 1)
  | 4-5 dive into the chip | 5-6 fold (signature) | 6-7 ground swap under the moving file (ground cut 2) | 7-8 flash-hidden swap
- spectacle: cascade, 32 folders tipping into the drive, 1.8 s
- output-big: "4.2 GB in 9 s." giant, the digits stepping by cuts
- integrations: object-lock swap, the file fixed while six clouds swap behind it
- lockup: bookend, the fold closes over the last file and the corner is the mark
```

Rules for the block:
- **No device twice in a film, except the signature.** The signature is the film's one visual idea (step 3 of the skill),
  taken from its world's list in [worlds.md](worlds.md) or made from the product's object, and used 3-8 times: in the hook,
  on up to three seams, in the output or the lockup. Every other device (a seam, the opening, the spectacle, the lockup)
  appears once; the two text arrival styles are the exception, since they set every line.
- **Budget:** one colour flood at most; a wall only when the claim is literally a quantity; one relay at most, with two
  hosts; two odometers at most; masked rise and born tint count among the film's two text arrivals.
- **At least two seams from the less obvious families:** a velocity cut, a morph, an iris from one of the film's shapes, a
  push, tiles, a pixel bridge, a last-word swap, a scale-jump cut, a flash-hidden swap, a ground swap under a layer that stays.
- **Not the default chain.** The worked films lean on a flood, a three-host relay, a wall pulled back from and a mark
  gathered out of it. Use one of those only when the brief calls for it, never most of them in one film, never in that order.
- **Ties:** when several options fit equally, count the letters of the product's name and count that far through those
  options, wrapping round, so two different products land on different choices.

### Openings

Frame 0 is never empty and already moving. Pick one:
- **Macro pull-back:** one detail at 3-6x pulls back in log space to the whole product (`motion/camera.md` 5.5). Only when
  that detail is the story.
- **Cut-on stack:** the category line in cut-on words, re-laid out to two lines (`motion/text.md` 1.1).
- **Hot question:** a short question builds word by word in born tint and re-centres (`motion/text.md` 1.2, 2.1).
- **Fast list hook:** one word per full-bleed still, 12-18 f each, hard cuts on hits (`motion/imagery.md` 8.1).
- **Drop-in:** the product's object falls into frame and lands with weight (`motion/turns.md` 5.1, `motion/camera.md` 7.3).
- **Four clocks:** panels of the product working, each on its own loop (`motion/camera.md` 6.6).
- **Giant cropped word:** one word at 40-60 % of the frame height pans through (`motion/text.md` 8.2).
- **Point to object:** a dot is born and becomes the first object (`motion/entrances.md` 1.3, `motion/turns.md` 5.8).
- **Blueprint:** the product's UI draws on as construction lines and fills (`motion/entrances.md` 1.9).

### Seams and ground cuts

Every seam names its device; `motion/turns.md` section 0 picks it by how the two beats relate. Neighbouring seams never
share one. The film's two ground cuts use two different devices:
- **Iris** from one of the film's shapes (`motion/turns.md` 3).
- **Ground swap under a layer that stays:** the line, the product or the pointer holds while the ground cuts on the beat
  (`motion/turns.md` 9.1).
- **Colour-flip cut with a size step** on the downbeat (`motion/turns.md` 9.2).
- **Flash-hidden swap** (`motion/turns.md` 6).
- **Push** between same-tone grounds (`motion/turns.md` 7.1), **pixel bridge** (4.3), **tiles** or a tile flood (4.1-4.2).
- **Dive** whose inside is the new ground (`motion/turns.md` 2.3).
- **Flood from an object** (`Flood` in [kit.md](kit.md)): once per film at most.

### Spectacle

The one shot that could never be a slide (1.5-2.5 s, the row tagged `spectacle`). Pick it from what the product claims; a
wall is right only when the claim is literally a quantity.

| The product claims | Spectacle | What the shot is |
|---|---|---|
| quantity ("all of it", "every PR") | a wall, pulled back from | many real items, about 40 in view at the widest, one event crossing them (`motion/cards-ui.md` wall) |
| speed, automation | cascade | one action ripples through 20-40 objects in a chain, 4 f apart at first and accelerating, the camera riding the front (`motion/camera.md` 8.1) |
| variety ("anything you ask") | accelerating montage | 10-16 full-bleed examples on hard cuts at 7, 7, 5, 5, 4, 3, 3 f, each in a different composition (`motion/camera.md` 8.2) |
| works everywhere | object-lock swap | the artefact fixed at frame centre while 5-7 host worlds swap behind it at 4-6 f each (`motion/cards-ui.md` object-lock swap) |
| reach, in the world | scale-out finale | the product on 4-6 real surfaces, each shot a pull-back to 0.42-0.83 (`motion/camera.md` 3.3) |
| transformation | morph chain | one element becomes 5-8 things in a row with no cut (`motion/turns.md` 5.8) |
| a model, an engine | hero object in light | a lit 3D object, a beam splitting, or a tunnel of replicas the camera flies through (`motion/camera.md` 8.3) |
| places, pictures | imagery in type | letters as windows, the picture inside changing every 4-8 f (`motion/text.md` 7.1) |
| precision | the dive to the detail | three hard-cut steps (x4, x16, x64) down to the one digit, pixel or line it got right (`motion/camera.md` 8.4) |
| a platform with pillars | hub and dive | three objects visited by dives, snapping back to the hub between them (`motion/turns.md` 10) |
| a bold claim | type spectacle | a marquee pair or a giant type pan crossing the frame, the product held between the lines (`motion/text.md` 8.1-8.2) |

Whichever it is, it starts on the artefact the film has carried, large, so it reads, and its widest frame stays graphic.

### Integrations

Never a row of logo tiles. One form, or none when the brief does not hinge on integrations (`motion/cards-ui.md`
integrations): a relay with two hosts, an object-lock swap, a sentence whose slot swaps partner marks on the beat, or one
host used for real in macro.

### Lockups

The mark is born from what is on screen and settles within 2 s. Pick the way that suits the signature:
1. **Spaced cut-on:** letters cut on one per frame at +30 % letter-spacing, the gaps close in 4 f, the mark's parts slide
   together (`motion/text.md` 10).
2. **Glyph birth in light:** one glyph every 3 f, each born glowing and cooling to the ink (`motion/text.md` 10).
3. **Trim-path draw:** the mark draws itself while flying in large and blurred, then keeps shrinking (`motion/entrances.md` 5.4).
4. **Quarter-spin:** a hard cut mid-spin; the mark un-rotates from 60-84 deg, settles, creeps 5 % (`motion/entrances.md` 5.1).
5. **Swell and stop:** a hard cut to the ground; the wordmark swells to 1.22x on a long settle under one sheen; the music
   drops out for 0.7 s before the last kick (`motion/text.md` 10).
6. **Scale-jump to tiny:** the claim giant and cropped, then a hard cut to the same words small under the mark
   (`motion/text.md` 10).
7. **Bookend:** the opening device plays again, reversed or completed, and leaves the mark (section 3.6).
8. **Out of a dive or a letter:** the camera snaps out of the object it went into, and that object is the mark
   (`motion/turns.md` 2.5).
9. **Gathered from the film's pieces:** only when the pieces are the signature device (its tiles, its handles, its strokes),
   never a wall that just had a wave (`motion/entrances.md` 5.3, 5.6).

The wordmark's soft scan (`motion/text.md` 10) is a finish beside the mark, not a way for the mark to be born.

---

## 7. Planning discipline

1. Write the argument in one sentence, then the beat list, before any motion.
2. Put every beat in one `timeline.ts` (seconds -> frames once) that drives picture **and** sound cues, so one edit moves
   both. Total duration = sum of sequences minus overlaps.
3. For every seam, write how it is carried: velocity, object, word, light, or ground on a beat. "Cut" alone is not an
   answer. If two neighbouring seams use the same device, change one; across the film, only the signature repeats
   ([Devices](#devices)).
4. Mark the held frames (at most one per act) and the breath gaps.
5. Mark which elements run on the stepped clock.
6. Copy: titles 2-4 words, sentence case, real nouns (real file names, real numbers, real
   integrations), never lorem.
7. Render stills per beat and a contact sheet before a full render; review with `taste.md`.
