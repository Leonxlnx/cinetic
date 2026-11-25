# Film grammar: how a film is built

A film is not a list of slides or features. It tells what happens to someone, in beats, where each beat does one job,
each beat hands something to the next, and the pace changes on purpose. This file is the structure layer: the story, the
concepts a film can take, what the sections are, how long they run, how ideas chain, how joins are built, how rhythm and
escalation are shaped, and four worked beat tables you can adapt. Everything is at 30 fps. Motion recipes live in
`motion/*.md` and the [library](library.md); formats other than the launch film in [formats.md](formats.md); this file
decides *what happens when*.

---

## Story

A film tells what happens to someone, not what a product does. A list says "it does A, B and C"; a story says "this
was the situation, then this happened, so now this". Before the concept, write the story in five lines as the first
block of `BEATS.md`:

1. **Who.** One person, one team or one object the viewer follows from the first second (a user with a name and a job,
   a character, the thing being made). For a tool the hero is the person using it or the thing they make, never the
   product's logo.
2. **The want and the cost.** What they want and what it costs them today, as one concrete picture that gets worse (a
   pile that grows, a clock that runs, a counter that climbs). One picture escalating, not three different problems.
3. **The turn.** The moment it changes, at 20-30 % of the film: a "but", a rival who does it differently, the product
   taking over the same object. It lands on the music and is the clearest frame of the film.
4. **The steps.** Three to five things done to the same object after the turn, each a cause and its effect (pressed,
   worked on, changed, handed on). Every step re-uses the result of the one before.
5. **The payoff.** A visible change in the hero's life or world that pays back the cost picture, never a statement alone
   (the evening back, the shelf sold out, the message sent), with one image from the opening that returns changed (the
   empty cell filled, the pile gone, the same question with the other answer).

**Turns are shown, not told.** The turn, the second turn and every claim are an event in a real surface: the product
acting (a reply arrives, a check goes green, the file is written), someone sending or breaking something, the picture
changing. Never a headline alone on an empty frame ("Then the whole page", "On a phone?"), and never the text inside one
card swapped while the card stays. Each step happens in a real surface too: the product, a named integration, the
user's device or place.

Test before building: tell the film aloud in one sentence with "until", "then" and "so" in it. If it is a list joined by
"and", rewrite line 4. A film of 45 s or more adds a second turn at 55-70 % (a new obstacle, a joke, the stakes raised)
and a "many" climax at 80-88 % ([acts](#1-lengths-and-acts)). Every later choice (the concept, the devices, the joins,
the world) is picked to tell this story; a device picked by counting letters, by habit or to satisfy a rule is not a
reason.

Three worked mini-stories on invented products (the products and names are examples; never reuse them):

```
Product: Harbor, a shift-swap app for nurses (30 s)
Who: Maya, a night nurse.
Want and cost: she needs Friday off for her sister's wedding; the paper rota has 40 names, the ward chat 63 unread
  messages, and every "can anyone cover?" scrolls away unanswered while the unread count climbs.
Turn (25 %): she posts the shift once in Harbor; it lights the three colleagues who are free and qualified.
Steps: one accepts; the swap goes to the charge nurse; approved; the rota cell rewrites itself.
Payoff: Friday night, the wedding table card with her name; the Friday cell on the rota, her name crossed out in red
  at the start, now a colleague's name in clean ink.
```

```
Product: Crumb, a pre-order tool for neighbourhood bakeries (45 s)
Who: Jonas, who bakes from 4 am.
Want and cost: he wants to sell out, not throw out; every evening loaves go in the bin, the tally on the bin lid growing
  night after night (12, 19, 31).
Turn (22 %): customers pre-order on their phones overnight; the orders arrive while he sleeps.
Steps: the orders sort into a bake list; the oven timer is set from it; the trays fill to the exact count; names are
  printed on the bags.
Second turn (60 %): a rainy Saturday, orders drop; Crumb suggests a smaller batch and a lunch offer.
Payoff: 1 pm, the last loaf leaves in a customer's hands; the tally on the bin lid is wiped clean.
```

```
Product: Lintel, a code-review agent (20 s feature film)
Who: a developer who wants to ship before the weekend.
Want and cost: Friday 15:10; the pull request has waited three days, the review queue reads 14, the clock in the corner
  of the screen keeps moving.
Turn (30 %): Lintel reviews it in 40 seconds and leaves two fixes in the diff.
Steps: the fixes are accepted; the checks go green one by one; merge.
Payoff: 16:58 on the same clock, "Merged", the laptop lid closes on a sunny window.
```

---

## Concepts

A concept is the form that tells the story: the idea that decides a film's opening, middle and end. Sixteen cover most launch
and brand films; the familiar arc of problem, demo, proof and lockup carries only about one in five, and
"one task, start to finish" is the most common single concept, not the rule. Choose by the procedure in SKILL.md step 3
(after the story) and write it under the story block in `BEATS.md`; the devices then serve the concept instead of
standing in for one.

1. **One task, start to finish.** One real use from the first input to the result out in the world: open on the input
   already being made, a chain of states each handing its object to the next, the result living somewhere real, then
   the name. The core demo gets about half the film. Only when the brief is literally one flow.
2. **The shape that becomes everything.** One primitive from the brand (a square, a stroke, a bar, a dot, a letter)
   turns into every next element with no cut: 6-10 transformations of 0.3-0.8 s, each a claim, ending as the mark.
   Brands with a strong shape; products that bring things into one.
3. **Built from a point.** A dot becomes a line, a shape, a solid, then the mark or the product's first frame, at one
   centre under one camera, in 4-8 stages that speed up. Stings, teasers, models and APIs with nothing on screen yet.
4. **One object, many worlds.** One simple hero object stays near the centre while the world round it changes; each
   world is one benefit, said by something that attaches to the object (a ring, a bar, a box); the object ends as part of
   the mark (section 3.4). Abstract platforms, agents, brand films; best lit in 3D.
5. **One unbroken camera.** The whole film is one move along, around or into one object or surface, with 4-6 stops;
   content arrives into it, light changes instead of cuts, the camera stops on the name. Openers, physical products,
   anything with a place (a desk, a shelf, a map).
6. **One sentence.** The film says one sentence a few words at a time; its key nouns turn into pictures, chips or the
   product, and the picture inside the line becomes the next scene (section 3.2); the last word is the name or the
   promise. Consumer apps, content products, events; with or without UI.
7. **The case.** An argument in 3-5 lines that overturns what the viewer assumes, each line given one performance, with
   one piece of proof; it ends on the call to action, not necessarily a mark. Services, challengers, paid social, 8-20 s.
8. **Before and after.** Two acts in two opposite worlds: the mess, then the same job done with the product. One clear
   device turns it, the same object appears in both, the second world carries the claim. Anything that consolidates,
   cleans or saves time; the one concept where changing worlds is the point.
9. **The number.** One real figure from the brief is the spine: it appears in motion (rolling, being typed, too big for
   the frame), is questioned, is broken into what makes it, and lands as the claim with the mark small. Savings, speed,
   scale, accuracy.
10. **A conversation.** Questions and replies, as type or as chat, between a person and the product or between two
    people it helps; the replies get bigger and better, and the last one is the claim. Assistants, support, tutoring,
    community products.
11. **A day.** Time is the spine: morning to night (or a week, a season), each hour one moment the product handles, the
    ground's light changing with it; night ends on the mark. Calendars, health, family, travel, habits.
12. **One artefact, many verbs.** One plausible thing the user makes (a campaign, a menu, a report), every feature run
    on it as a verb that re-uses the last result, ending out in the world on real surfaces (section 3.5). Editors,
    generators, creative tools.
13. **Map and dive.** Three parts of a platform as objects on a map; the camera dives into each and snaps back; at the
    end they connect and frame the name (section 3.3). Platforms with three pillars, 40-70 s.
14. **Manifesto with pictures.** A few lines of belief over licensed photographs in one grade, the identity applied to
    real surfaces, the product barely shown, a long quiet end card. Rebrands, company and recruiting films.
15. **Four clocks.** A gutterless grid of 2-4 cells, each looping one small action on its own length, cells handing
    pictures to each other; no start and no end. Landing-page heroes, social loops.
16. **Montage on the beat.** 12-20 micro-scenes, one a beat, each a different use and one finished object, one small
    line of type running through them; it ends as the sentence completes and the mark lands on the music's cut. Products
    with many uses, marketplaces, sizzles.

**By claim:** one flow 1; a shape or the brand itself 2, 3; an abstract model or platform 3, 4; a place or a physical
thing 5, 11; content or people 6, 16; the opposite of what people assume 7; order out of a mess 8; something
measurable 9; a dialogue 10; a habit 11; making things 12; three pillars 13; a belief or an identity 14; many uses 15,
16. **By format:** [formats.md](formats.md) lists the concepts each format allows.

**How the product is shown follows the concept:** its UI really used (task, artefact, update and explainer films), its
output or its object (shape, point, object and number films), or its words (sentence, case and manifesto films). UI is
used by a real pointer or by visible state changes.

---

## 1. Lengths and acts

A launch film needs room for a story: 30-45 s by default, up to 60 s. 15-20 s is for teasers, updates and stings, or
when the user asks for it. Specs for every format except the launch film are in [formats.md](formats.md).

| Format | Length | Beats | Typical use |
|---|---|---|---|
| Logo sting | 3-7 s | 4-6 stages | a mark reveal, the head of a longer video |
| Loop | 4-10 s | one cycle a cell | a landing-page hero |
| Update, vertical teaser | 8-20 s | 5-12 | "version N is out", social, "coming soon" |
| Feature film | 20-30 s | 12-20 | one feature with its own small story |
| Launch film | 30-45 s (up to 60 s) | 15-35 | a new product or a major version |
| Brand film | 25-50 s | 15-30 | a rebrand, a company or recruiting film |
| Explainer | 45-90 s | 30-50 | an abstract product that needs a demo act |

A **beat** is one idea the viewer takes in (a word lands, a card rewrites itself, a counter settles). A **shot** is what
lies between two real cuts. Beats run 1.4-2.2 s on average and are joined so well that the viewer remembers "one
continuous camera". Count both when you plan. A beat's length is set by its action (before, during, after:
[action](#action-and-escalation)), not by a cap; one feature is one action and one visible result, and a beat that needs
a sentence to explain is two beats.

**Acts by length** (shares of the film):

| Length | Acts | Turn | Climax | Sections | How the middle stays alive |
|---|---|---|---|---|---|
| ~30 s | the want and the cost 0-20 % / turn and name 20-35 % / the product doing 3-4 things to one object 35-80 % / the "many" climax 80-88 % / mark | 18-30 % | 78-88 % | 12-17, mean 1.8-2.2 s | one artefact carried through every step; a sentence ladder ("from ... into ... onto"); a change of place when the story moves |
| ~45 s | set-up 0-15 % / turn 15-30 % / the process in 4-6 steps 30-65 % / a second turn or a joke 55-70 % / climax 80-90 % / mark | 15-30 %, then 55-70 % | 80-90 % | 19-31, mean 1.5-2.4 s | **a second turn in the middle** (a new obstacle, a joke, "live" and then more proof); the same artefact carried further (made, sold, shipped) |
| ~60 s | the problem 0-25 % / reveal / features / **the problem restated harder** at 45-50 % / features / climax 85 % / mark | 25 %, then about 46 % | 85-88 % | 18-45, mean 1.5-4 s | a hub that recurs (dive into each part, snap back); a change of mode (explainer to live demo); a breakdown in the music |

At every length: the turn at 20-30 %; at 45 s and more a second turn or re-ignition at 55-70 %; the climax at 80-88 % is
the "many" (a wall, a reel, everything connected, the result in the world); the mark in the last 7-12 %; no stretch
longer than about 8 s without a change of place, mode or stakes.

---

## 2. Sections and structures

### Structures

The concept decides the order of a film's sections. There are eleven orders:

| Structure | Section order | Concepts |
|---|---|---|
| Journey | hook on the input > steps > result live > claim > mark | 1, 12 |
| Problem, reveal, features | problem pile > held turn > name > features > proof > mark (the table below) | 1, 8, 13 |
| Name first, then proof | the name in the first 6 s > what it does > breadth > end card | 6, 9, updates |
| Transformation only | primitive > stages > the mark, or an end mid-move | 2, 3 |
| World relay | one object through 6-10 worlds > the mark | 4 |
| Loop or panels | no start, no end | 15 |
| Montage | hook > 12-20 beats > the mark on the music's cut | 16 |
| Argument | provocation > turn > call to action, no mark | 7 |
| Narrated explainer | premise > what it is > how, on one canvas > proof > a long end card | 13, 1 |
| Cold open | a picture whose caption becomes the image, or a date > the offer | 6, 11, 14 |
| Identity reel | thesis > mark > image world > applications > manifesto > mark | 14 |

### Sections of a problem-reveal launch film (one structure of eleven)

| Section | Job | Share of runtime | Length at 30 fps | Enters by | Leaves by |
|---|---|---|---|---|---|
| **Hook** | stop the scroll; show the hero, the cost or the story's object, one thing first | 5-12 % | 45-120 f | first frame already moving | a carried cut or a dive |
| **Problem** | make the cost felt, escalating | 10-20 % | 90-360 f | hard cut on a beat, or the hook's object carried | a held question |
| **Pivot / held question** | the one designed stillness before the answer | 3-5 % | 45-75 f | resolve of the problem device | breath gap, then hit |
| **Reveal** | name and mark, born from the film's own devices | 5-10 % | 45-120 f | lands on the biggest hit so far | grows into the feature map |
| **Features** | 3-5 chapters, each one action and one result | 40-55 % | 75-240 f each | dive, carry, or hub | state change, then carry |
| **Proof** | numbers, real logos, the result in the world | 8-15 % | 60-180 f | from the last feature's result | gathers into the climax |
| **Climax** | everything connects; the fastest or biggest beat | 5-8 % | 45-90 f | assembly, scatter, scale-out | snaps into the lockup |
| **Lockup / CTA** | mark, name, one line, URL; the only true rest | 5-10 % | 45-75 f (2.5 s at most); with the claim at most a fifth of the film (105 f under 18 s) | grows out of an object already on screen | music decays under it |

Rules for this structure:

- **Open on a device, not a company introduction.** The first 2-3 s are motion with an idea in it: a mark that assembles
  from pieces, a seed glyph that opens an iris onto a world, a hairline that becomes a shape. A brand sting under 2 s is
  fine if it *moves into* the film. A static logo card is never fine. Pick the opening from the [menu](#openings).
- **When the concept shows the product, show it or its artefact by 3-5 s** (an input field, a result, a card) unless
  the film is a teaser.
- **The problem act escalates** in pace and in quantity: one thing first, then more, then many, the camera pulling back
  so the count can grow ([escalation](#action-and-escalation)). It ends on **one** held frame of 45-75 f: a single
  unresolved line, an empty field, a number that will not settle.
- **The reveal lands on the biggest audio hit so far**, after a breath gap (see `sound-design.md`).
- **Features are chapters, not slides.** Each enters by a dive, a hub or a carried object; each shows a real state change
  (an Add pill flips to Added, a check lands, a counter settles); each leaves on motion.
- **The centrepiece feature gets the most time** (the one the product exists for: 1.5-2x the others).
- **The climax re-uses the film's own objects**: bring every hub object together, wire them to the product, scatter them
  to the frame edges where they become the lockup's frame.
- **The lockup is the only real rest.** Everything before it moves. The lockup may still creep 3-5 % over its 1.5-2.5 s, then the film ends;
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
(within ~5 px) on both sides of every join.

### 3.5 One invented product carried through every feature (verb ladder)
For a tool (an editor, a generator, a builder), invent one plausible artefact (a campaign, a store, a report) and run every
feature on it: select it, change it, annotate it, ship it, see it in the world. Each verb section re-uses the previous
result, so the demo is one production story with a beginning and an end. Use the client's real domain; never reuse an
artefact from someone else's film.

### 3.6 Recurring word or shape (the rhyme)
A key word returns 2-3 times in new roles (the question, the answer, the outcome). A device that opened the film closes
it (the opening mosaic returns as the end transition; the opening mark replays; the selection grammar converges into the
logo). Bookends tell the viewer "this is the end" without a title card.

### 3.7 Grounds follow the story
A film may stay on one ground. The ground, the colour mode (light or dark) and the accent change only when the story
changes place or state (evening to morning, the problem to the answer, the desk to the city), and then the whole frame
changes at once, covered by one clean turn ([ground changes](#ground-changes)). Never the ground first and the card
after it, never an object that suddenly turns the accent colour, never a cross-dissolve between two grounds of
different tone (the midpoint is mud).

---

## Joins

Every join carries the thing the viewer is watching, large (the object, the sentence being read, the card, the
picture), or it is a hard cut on a musical event. Never a token (a full stop, a small pill, a dot) carried while
everything else changes: the eye sees the colour jump, not the continuation. The best joins are made of the scene's own
stuff and usually carry two things at once (an object and a camera move, a word and a beat). Start from the library's
turns ([library-turns.md](library-turns.md)) and adapt them; build by hand what it lacks
([motion/turns.md](motion/turns.md)).

| Join | How to build it |
|---|---|
| **Carry the subject** | The object the eye is on at the end of A (about a sixth of the frame tall or more) is the object at the start of B, at the same screen spot and within 10 % of its size; the new world assembles under or around it, or arrives while it moves (`MorphBox`, `DiveInto`). |
| **Match on shape** | End A on a silhouette (a phone edge-on, a dark card, a ring, a bar) and start B with a different object of the same silhouette at the same place and size; hold it 4-8 f before it changes (`ShapeMatch`). |
| **The word still being read** | The sentence continues across the cut at the same baseline (the second half arrives on the new picture), or the line stays fixed while what is behind it swaps, or the key word lifts out of the line and becomes the next scene. |
| **Movement through the cut** | Cut on the fastest frame of an accelerating exit (whip, rise, pull-back); B starts moving the same way at the same speed and decelerates; motion blur on both sides; the whole frame moves (`WhipGate`, `Shove`). |
| **Cause and effect** | A ends on the action (a press, a send, a drop); B is its result forming (6-20 f of development) where the action happened (`WindowOpen` from the pressed button into its window, `GrowIris` into a full scene). |
| **Camera into or out of the object** | Dive through a shape until the frame is fully covered, rack focus between two layers over a background that stays, or pull back from a detail until it is one of many (`DiveInto`). |
| **Material bridge** | Only with the film's own texture, and only when it builds the next image (the pile's cells become the next word); never generic noise (`DotReveal`, `BlockBurst`). |
| **Hard cut on the beat** | Right on the story's turn, the second turn and the cut into the mark; elsewhere only on a music event (a kick, a drop, a stop) or a new act in a tour that opens mid-action, and there the join carries the subject wherever it can. Never two in a row. |

Never: a ground colour change around a small object; the ground changing first and the object after it; a flood or iris
that ends before it covers the frame; a light or dark switch without a story reason; a screen flash to hide a cut.

A card whose text drops out while new text rises in, the card staying put, is a token join (the eye sees the same box):
once a film at most. The second time, change the object: a notification arrives, a reply lands, another surface takes
over.

### The join test

A required step before the final: list every join in `BEATS.md` as
`frame | last subject of A | first subject of B | what is carried | class | on a beat?`, then:
1. A join with nothing carried is on a beat and is one of the four allowed hard cuts; otherwise rebuild it.
2. The carried thing is the subject of A's last frame and about a sixth of the frame tall or more; a dot, a full stop or
   a chip is rebuilt.
3. At the switch frame the whole frame is covered (by the object, by motion blur, by the dive): no partial circle, no
   gap, no ground before the object.
4. Every change of ground, colour mode or accent has its story reason written next to it (a new place, a time of day,
   the turn).
5. Two joins of the same class in a row are fine; three in a row is a pattern: vary the third.
6. Every join is exported at real size with `node scripts/frames.mjs joins` (frames J-4 .. J+4, 960 px each, one image a
   join; `--full` for 1920 px cells) before the final and after every fix that touches it, and every cell is clean:
   nothing cut by the frame or its container, no overlapping or overprinted text, no empty slab, no one-frame pop or
   flip of ground, no camera snap, no misaligned parts, nothing leaving before the cut. A join that cannot be made clean
   becomes a simpler one: a hard cut on the beat beats a broken transition.

The film exports its join frames beside `T`, so the command needs no list: `export const JOINS = [T.turn, T.dive,
T.press + 6];` (the first frame of the next scene at each join; plain numbers or fields of a `T` made of plain numbers,
arithmetic allowed). `--at 120,245` overrides it.

---

## 4. Rhythm

### 4.1 The pace curve
Plan the film as a curve of beats per second, not a list (here for the problem-reveal structure; pace is how often
things change and how much the viewer can follow, not how much is in the frame):

```
problem  ████████████  fast, piling up (0.6-0.9 s per beat)
pivot    █             ONE held frame (45-75 f)
reveal   ███           medium, one big hit
features ██████ ████ ██████   medium, each chapter fast-in / readable-hold / fast-out
proof    ████████      faster (accelerating lists, counters)
climax   ██████████    fastest
lockup   ██            slow; the only rest
```

Alternate tension and release: FAST, SLOW, FAST, SLOW, FAST, HOLD. Put a deliberate pause (a breath gap of 6-18 f,
sometimes a held frame) right before the climax and right before the reveal.

### 4.2 Shot and beat lengths (30 fps)
- Pace: a new beat every 0.8-2.2 s (a 30 s film has 15-30 beats). Inside a beat something larger than a caret changes
  at least every 0.5 s (a word joins, a block lands, the crop changes, a value steps), except while something is read.
  A statement or a result may rest for its reading time with idle life (a creep, a breathing light): up to about a
  third of a film's half-seconds may be read like that. The flaw is a hold with nothing to read, and the opposite flaw
  is a beat too fast to follow: a viewer can say what happened in every beat.
- Statement: 30-45 f. Titles are 2-4 words; nothing on screen should need more than 1.5 s to read.
- Reading hold for a line: `words / 3 + 0.5` s minimum (a 9-word line: 105 f). Read it aloud at speed to check.
  At the end the budget wins: the claim with its full reading time, read while its image still moves, then a lockup of
  at most 2.5 s (the claim may stay on as its subline); the claim and the lockup together take at most a fifth of the
  film (3.5 s in a film under 18 s). When they do not fit, shorten the middle or the claim, never the claim's reading
  time, and never pad the middle to earn a longer ending.
- Feature chapter: as long as its action (before, during, after), usually 75-180 f, the centrepiece up to 300 f.
- Genre montages: 9-18 f per shot; holographic texture cuts 2-8 f.
- Transition beats: 6-12 f (they exist, but you should not notice them as beats).
- Lockup: 75 f (2.5 s) at most, from the last move to the last frame; claim and lockup together at most a fifth of the
  film (105 f in a film under 18 s).

### 4.3 Accelerating cadence
Lists, swaps and builds must **compress**, never march. Measured cadences that work:
- build list rows: 9, 9, 9, 7, 5, 4, 3, 3 frames between rows;
- example swaps in a field: 7, 7, 7, 7, 7, 5, 5, 5, 3, 3, 3, 3, 3, 3, 4 frames;
- deck entries alternating front and back every 7-8 frames.
Items the viewer must read stay about 0.15-0.2 s (5-6 f) apart and show at most about five readable steps; past that, the
rest arrives as one compressing run, not more single steps.
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

### 4.6 Holds that are read
No frame holds dead still for more than ~0.6 s. Every element keeps a small life after it settles (idle life): a creep
of 0.5-1 % scale over 20 f, a drift of 0.5-2 px/f, a breathing light, a sheen travelling along an edge, a counter, a
caret. Only the lockup is allowed to freeze, and only after it has crept. Test: no two consecutive frames identical
anywhere except the last second.

**A result is held until it is read** (0.7-1.5 s, longer for a line by its reading time) with idle life, then it becomes
the next object. What may not happen is a hold with nothing to read: an empty field waiting, a finished state that says
nothing new, a camera parked on a frame already understood.

---

## Action and escalation

### Clarity of action
Every action shows before, during and after, so the viewer can tell what happened:
- **Before (8-15 f):** the actor (pointer, finger, character, caret) and the target in one frame; the actor travels to it
  on an arc; the camera may push toward the target.
- **During (1-3 f contact, then 10-30 f of work):** one frame where the target visibly flips state (the button's colour,
  the toggle, the check), then a working state that says what it does in words or a counter ("Reading 3,412
  comments", a percentage, plan lines).
- **After (20-45 f):** the result appears where the action happened, large enough to read (UI text 30 px or more), held
  until it is read, then it becomes the next scene's object. A press is answered by its target.
- **Scrolls and lists** have a reader (a counter or a marker that says what the scroll is) and a stop with a reason (it
  travels to the one row that matters and picks it out). No scroll without both.

### Escalation: one, then more, then many
- An opening shows one thing first, designed with care, alone, large, near and held 1.5-2 s; the second for 0.8-1 s;
  then the cadence compresses (9, 7, 5, 4, 3, 3 f) while the camera pulls back, so the count grows without any single
  frame losing its subject.
- The run ends in a "many" frame that is dense on purpose (a wall, a pile, a reel), then gathers into one object (the
  turn's word, the result, the mark).
- One escalation an act; a film of 30 s or more has two (the problem and the product) or three.

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

## 6. Four worked structures

Frames are at 30 fps. Device names refer to recipes in `motion/*.md`. These are skeletons for four of the concepts
(A: map and dive, B: one sentence, C: one task, D: one object, many worlds): swap in the client's product, nouns and
world; keep the jobs, the proportions and the joins.

### A. Hub and dive (platform launch, 60 s, no voice-over)
Best for: an infrastructure or platform product with three pillars. Worlds: block grid, dark stage, terminal.

| # | f | Beat | Job | Device |
|---|---|---|---|---|
| 1 | 0-45 | a seed device (the mark, a cell, a line) assembles on the stepped clock in near silence | hook | stepped assembly |
| 2 | 45-90 | the device grows into the film's world; the camera dives into one part of it | hook -> problem | zoom-through |
| 3 | 90-200 | the problem in 2-3 short lines set on a surface; each line larger; music enters on the first word | problem | type on a surface |
| 4 | 200-300 | the problem multiplies (tools, costs, requests fan out), cadence quickening, the camera pulling back | problem | momentum entry, accelerating cadence |
| 5 | 300-360 | **held**: one unresolved line or an empty state; a footnote chip types beside it | pivot | the hold |
| 6 | 360-480 | 2-3 questions on one object seen at three distances, hard cuts on beats | problem | framing escalation |
| 7 | 480-600 | breath gap; the product object arrives on the biggest hit; its name resolves | reveal | stepped grow, decode |
| 8 | 600-700 | one-line claim; the three pillars appear along a camera move | feature map | pan reveal |
| 9 | 700-760 | the story moves from the problem to the platform: a dive into the first pillar covers the frame | transition | dive |
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
| 14 | 1440-1477 | the tagline's last word travels into the wordmark | lockup | closing line becomes the mark |

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

A verb-ladder film (concept 12) runs: a fast list hook (one word per full-bleed still, 12-18 f each), promise, name,
3-4 imperative verbs on one invented artefact, a light human beat, the artefact out in the world, lockup. The explainer's
order is in [formats.md](formats.md#explainer).

### Update film

"Version N is out" for people who already use the product: 8-20 s, one beat per change (2-4 changes), no problem act.

| Beat | Frames (30 fps) | What it does |
|---|---|---|
| version mark | 0-36 | the product's mark or name with the version number arriving as an event (an odometer to the new number, the old number pushed out by the new one, a badge stamped on) |
| change 1..n | 60-110 each | one change = one action and its visible result on the real UI: the toggle flips and the thing happens, the list sorts itself, the report draws. A 2-4 word line names it (cut-on or rise), beside or above the UI, never over it |
| hand-offs | inside each change | the result of one change is the start of the next (the synced transaction is the receipt that gets sorted, the sorted receipts become the report's bars) |
| ending | 45-75 | mark, version, one line ("Update now" or what it unlocks), the URL or store badge; or the product left working with the name small |

Rules: show the change, not a feature list; the UI is shown as one calm component at a time (camera at 1.2-1.6x on it);
no intro longer than 1.2 s; the version number is the only number that animates for its own sake. Full spec:
[formats.md](formats.md#feature-update).

---

## Compositions

Tag every row of `BEATS.md` with one of these. No two adjacent rows share a composition and a film uses at least four.
In films of 15 s or more one row also carries the tag `spectacle` (the shot that could never be a slide, 1.5-2.5 s,
chosen from the [spectacle menu](#spectacle); in a continuous concept, the concept itself). In the one-task, number and
one-artefact concepts and in updates, one row carries `output-big` (the product's result in macro or as giant type, key
words 120 px or more; a number is one option, a word, a picture or a state can be the giant output too).

A film may follow one artefact through several real places and steps when the story needs it (the sketch becomes the
card, the code, the merged request); it never shows two unrelated demos. Lengths by format are in section 1.

Every film has one scale jump (a giant word cut small, a dive, a pull-back), and every film that shows UI has a macro
moment; neither has to open the film. A series rotates its compositions: three features, three metrics, two hosts,
each in a different composition (macro, giant type, split, surface), never the same layout three times with the label
swapped. The `output-big` row lands the result before or instead of at UI size (`<Output>` lands the words giant, then
carries them into the UI). Explaining is one claim a shot, set on or along the object, never a column of text beside it.

Every composition has one focal subject and a rich world (SKILL.md quality 7). A frame is calm when the eye knows where
to look, not when it is empty: one thing to read at a time, supported by specific stuff that means something (a licensed
photograph, the product's real surfaces in detail, texture, depth in layers, secondary elements that react to the
subject), which may fill the frame. A statement alone on an empty ground is for a line that must land, not the default
beat.

| Tag | What is in the frame | Typical use |
|---|---|---|
| `full-ui` | the product's UI as one component, large, camera 1.2-1.6x; one edge may leave the frame while the camera follows it | the core action |
| `macro` | one detail at 3-6x: a caret, a button, a number, a row | the moment of the action |
| `giant-type` | 1-3 words at 20-40 % of the frame height, alone, may crop at the frame edge | promise, claim, the result of a turn already shown |
| `type-on-surface` | words laid on an object or plane in perspective (a block's face, a floor, a card) | hooks, chapter titles |
| `ground` | one object or picture fills the frame, by any carrier (`forge`'s beat sheet calls it `flood`) | a join between places |
| `statement` | a line that must land: alone on a flat ground, over a calm area of a picture, or beside its object | a claim that answers what was just shown (the turn itself is an event, [story](#story)) |
| `split` | two grounds or two states side by side (before / after, input / output) | proof, comparison |
| `quantity` | many of a thing (twenty documents, a hundred runs), by any spectacle in the menu (`forge`'s `wall`) | "all of it", scale |
| `panels` | a gutterless grid of 2-4 panels, each on its own clock (`motion/camera.md` 6.6) | the product doing several things at once |
| `object` | one hero object large, lit, turning (a device, a mark, a glass solid, a block) | reveal, climax |
| `surface` | the product's artefact landing inside another product (a message in a chat, a row in a tracker) | integrations |
| `stack` | a depth ladder or pile, tilted, nothing set over it | the problem (too much), history |
| `picture` | a licensed photograph or footage plate as the world, the content the product acts on, or the payoff | a place, a person, the result in the world |

"Caption + centred card" on every row is the template look. If rows read like that, make the card the frame
(`full-ui`), push in on its detail (`macro`), put the caption on the card (`type-on-surface`) or set the moment in a
real picture (`picture`).

---

## Devices

Films that look alike share their concept and their devices, not their content. After the story and the concept line
of `BEATS.md`, write a **Devices** block: one line for each slot your concept has, each picked from the library first
([library.md](library.md)) and the menus below, by what the story needs, not by habit and not by what the examples or
the worked films did. The slots follow the concept:

| Concept family | Slots |
|---|---|
| launch-shaped (one task, the number, before and after, map and dive, one artefact, a conversation, a day) | signature, opening, text arrivals, type treatment, joins, spectacle (15 s or more), output-big where required, integrations, ending |
| continuous (the shape that becomes everything, built from a point, one unbroken camera, one object through many worlds) | signature (the primitive or object), stages or stops, text arrivals, type treatment, the light changes on one ground, ending |
| type-led (one sentence, the case, manifesto) | the sentence, text arrivals, type treatment, joins, the picture inside the line, ending |
| loops and montage (four clocks, montage on the beat) | signature, cells or scenes, relays between them, text arrivals, ending (none for a loop) |

Three short examples for three invented products and three concepts; they share no device with each other, to show
the range, not a pick:

```
Concept: the number, because the brief's one fact is a match to the cent; rejected: one task, before and after
Devices (Tillroll, a bookkeeping app that matches receipts to bank lines; the claim: precision)
- signature: the receipt's torn edge: the hook, a join, the lockup
- opening: drop-in, a crumpled receipt lands and flattens under the camera
- text arrivals: an append that re-centres; masked rise
- type treatment: type set on a surface, every statement printed on receipt paper
- joins: carry the receipt (it stays while the bank line slides under it) | the torn edge | cause and effect, the match
  stamping the line | hard cut on the drop into the matched total
- spectacle: the dive to the detail, down to the one cent it matched, 2 s
- output-big: the matched pair in macro, the two amounts locking together
- integrations: one host used for real, the bank's statement in macro
- lockup: trim-path draw along the torn edge
```

```
Concept: a day, because a firing runs from morning load to evening unload; rejected: the shape that becomes everything, one task
Devices (Kilnsmith, an app that runs a pottery studio's kiln firings; the claim: transformation)
- signature: the kiln's round spy-hole: the hook, a join, the lockup
- opening: blueprint, the firing curve draws on as construction lines and fills
- text arrivals: cut-on words; last-word swap
- type treatment: a heat glow that cools, each key word arriving kiln-orange and cooling to the ink
- joins: the word still being read | dive through the spy-hole into the firing (the story moves inside the kiln) |
  the firing curve stays while morning becomes evening behind it (the story's time changes)
- spectacle: morph chain, one pot through clay, bisque, glaze and fire with no cut, 2.2 s
- output-big: "Ready by 7." giant over the opened kiln
- integrations: none, the brief does not hinge on them
- lockup: quarter-spin, the mark turning up inside the spy-hole
```

```
Concept: montage on the beat, because the brief lists every kind of damage; rejected: before and after, one sentence
Devices (Keepsake, an app that restores old family photos; the claim: any photo, any damage)
- signature: a damaged corner healing: the hook, a join, the output
- opening: fast list hook, one word per scanned photo
- text arrivals: decode from coarse blocks; colour wake
- type treatment: a picture inside the line, the restored photo showing through the key word
- joins: material bridge, the scan's grain building the restored photo | movement through the cut | the healing corner
  carried large | hard cut on the drop into the montage
- spectacle: accelerating montage, twelve restored photos on hard cuts, each framed differently, 1.6 s
- output-big: one restored face filling the frame, the damage gone in one cut
- integrations: a sentence whose slot swaps print services' marks
- lockup: the mark over the last restored photo
```

Rules for the block:
- **One family of moves, varied each time it recurs.** No move repeats identically, and none appears more than twice
  in a film; a move and its own return (a dive and the snap back out) count as one. The signature is the film's one
  visual idea (step 4 of the skill), an object or motif taken from the story or its world ([worlds.md](worlds.md)),
  that returns 3-8 times (the hook, a few joins, the output or the lockup), each time by a different move. Type
  arrivals count as moves: no line arrival (a word cut-on, a rise, one library type piece) is used more than twice, and
  the claim arrives differently from the statements (`frames.mjs check` names a type or turn piece placed more than
  twice, and a `<Words arrive>` repeated on more than two lines).
- **Budget:** one colour flood at most; a wall only when the claim is literally a quantity; two odometers at most;
  masked rise and born tint count among the film's two text arrivals.
- **Joins by class.** Name each join's class ([joins](#joins)); at least two are built from the scene's own objects (its
  cells, its words, its shape), and the [join test](#the-join-test) passes.
- **Not the default chain.** The worked films lean on a flood, a three-host relay, a wall pulled back from and a mark
  gathered out of it. Use one of those only when the story calls for it, never most of them in one film, never in that
  order.
- **Not the examples either.** Never copy an example's sequence. Compare the finished block with each example block and
  worked film; when more than two slots match one of them, re-pick the slots the story cares least about.
- **Pick by the story, with a reason.** Write one reason next to each pick
  (`- joins: ... (the receipt is what she is watching, so it stays)`).

### Type treatment

One per film, repeated on its statements from the hook to the claim ([type.md](type.md#8-few-words-built)): a light
sweep through the line, a heat glow that cools, a decode, a word swap in place, type set on a surface, a picture inside
the line, or the born tint. Take it from the product's object or world (a kiln's heat, a scanner's light, a receipt's
paper). The born tint is one option, not the default.

### Openings

Frame 0 is never empty and already moving; the story decides what is there (the hero, the cost already visible, the
story's object, the first words, the mark in a sting). The opening shows one thing first, designed with care and held
long enough to read, then a second, then more ([escalation](#action-and-escalation)). Pick one:
- **The hero and the cost:** the person or object we follow with the cost already visible (a phone at 18:40 with 63
  unread, a bin lid's tally, a queue counter), in a licensed photograph or the product's detailed UI.
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

### Ground changes

A film may stay on one ground from start to end. The ground, the colour mode and the accent change only when the story
changes place or state, and then the whole frame changes at once under one clean turn that carries the subject
([joins](#joins)); write the story reason next to it in the join test. A ground is a flat clean colour, a real picture or
a bold designed scene, never a faint gradient ([palette rules](worlds.md#palette-rules-all-worlds)). Turns that change
the whole frame at once:
- **Dive** into an object whose inside is the new place (`DiveInto`; `motion/turns.md` 2.3).
- **Iris or grow** from the object the action happened on, ending with every corner covered (`GrowIris`;
  `motion/turns.md` 3).
- **The subject stays, the place changes:** a large subject (the card, the phone, the sentence) holds its spot while the
  new place assembles under it (`motion/turns.md` 9.1).
- **Movement through the cut** (`WhipGate`, `Shove`), or a **material bridge** in the film's own texture (`DotReveal`).
- **Flood from an object** (`Flood` in [kit.md](kit.md)): once in a film at most, and only when it covers the frame.
Never the ground first and the object after it, never an object that suddenly turns the accent, never a colour flip on
a beat with nothing carried, never a flash.

### Spectacle

The one shot that could never be a slide (1.5-2.5 s, the row tagged `spectacle`, in films of 15 s or more). Pick it from
what the product claims; a wall is right only when the claim is literally a quantity. It is usually the "many" climax
at 80-88 % of the film. Count its frames in `T`. One spectacle, not two.

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

Whichever it is, it starts on the artefact the film has carried, large, so it reads, and its widest frame stays graphic:
- the accent is present as shapes you can see on a thumbnail, not a few specks (and still at most about a tenth of the
  frame);
- the smallest label is 28 px or more, and every item is real content;
- a spectacle made of lines (routes, arcs, a network) shows at most about 16 endpoints, each a filled object (a chip, a
  disc, a mark) with its label; the lines may be hairlines, with a filled object riding the one that matters, never a glow;
- never hundreds of tiny pale cells, never a web of hairlines as the whole subject.

### Integrations

Never a row of logo tiles. One form, or none when the brief does not hinge on integrations (`motion/cards-ui.md`
integrations): the artefact followed through real places as part of the story (each host a real act with a real state
change, its screen a faithful, detailed rebuild), an object-lock swap, a sentence whose slot swaps partner marks on the
beat, or one host used for real in macro. A quick tour of hosts that only shows logos takes at most 15 % of the film;
the artefact is the largest text in each host (60 px or more). Other products appear as their real, current,
full-colour marks (`<Brand>`) or as faithful rebuilds of their real screens, never as rough mocks.

### Lockups

The mark is born from what is on screen and, in a launch or feature film, settles within 2.5 s (other formats:
[formats.md](formats.md)). An invented product's mark has an idea (a glyph drawn from the product's object, an
`AppIcon` tile with depth, a custom wordmark), and the lockup varies from film to film: the mark alone, the mark built in
3D then flattened, the wordmark alone, the mark over the last image; never the same glyph, wordmark and small line,
centred, by habit. The letters keep their spacing from the first frame (never spaced wide and pulled together). Pick
the way that suits the signature:
1. **Glyph birth in light:** one glyph every 3 f, each born glowing and cooling to the ink (`motion/text.md` 10).
2. **Trim-path draw:** the mark draws itself while flying in large and blurred, then keeps shrinking (`motion/entrances.md` 5.4).
3. **Quarter-spin:** a hard cut mid-spin; the mark un-rotates from 60-84 deg, settles, creeps 5 % (`motion/entrances.md` 5.1).
4. **Swell and stop:** a hard cut to the ground; the wordmark swells to 1.22x on a long settle under one sheen; the music
   drops out for 0.7 s before the last kick (`motion/text.md` 10).
5. **Scale-jump to tiny:** the claim giant and cropped, then a hard cut to the same words small under the mark
   (`motion/text.md` 10).
6. **Bookend:** the opening device plays again, reversed or completed, and leaves the mark (section 3.6).
7. **Out of a dive or a letter:** the camera snaps out of the object it went into, and that object is the mark
   (`motion/turns.md` 2.5).
8. **Gathered from the film's pieces:** only when the pieces are the signature device (its tiles, its handles, its strokes),
   never a wall that just had a wave (`motion/entrances.md` 5.3, 5.6).
9. **The closing line becomes the mark:** a letter or a word of the claim travels into the mark while the rest of the
   line leaves (`useGlyphBox` in [kit.md](kit.md) finds where it sits); never its punctuation. Not after a dive to a
   giant figure and the accent filling the frame, since that whole chain in every film is a tell ([taste.md](taste.md) 30).
10. **The mark over the payoff:** the mark settles small over the story's last picture (the payoff image), which keeps
    its idle life.

The wordmark's soft scan (`motion/text.md` 10) is a finish beside the mark, not a way for the mark to be born.

- **Never a static logo card, never a fade to blank.** A centred wordmark on a plain ground is the commonest ending of
  all: prefer the mark over the last image, the name as the last word of the sentence, the mark beside the product at
  rest, or the product itself where the format allows.
- **The claim** sits on a flat ground or a calm area of the payoff picture and is fully readable for its reading time
  (when it needs longer, it stays on as the lockup's line); a line of the claim is said once.
- **A name revealed mid-film** is fine when it is the film's turn; then the end is the mark small with the CTA, not a
  second reveal.
- **Explainers, brand films and event promos** end on an end card of up to 4 s, still creeping.
- **The product's own mark** is the user's file or, for an invented product, a mark with an idea (the glyph drawn from
  the product's object is built once in the film). Two or three primitive rectangles are a placeholder, not a mark.

---

## 7. Planning discipline

1. Write the story block ([story](#story)), then the concept line, then the beat list, before any motion.
2. Put every beat in one `timeline.ts` (seconds -> frames once) that drives picture **and** sound cues, so one edit moves
   both. Total duration = sum of sequences minus overlaps.
3. For every join, write its class and what it carries ([the join test](#the-join-test)). "Cut" alone is not an
   answer. No move repeats identically, and none more than twice ([Devices](#devices)).
4. Mark the held frames (at most one per act), the breath gaps and which elements run on the stepped clock.
5. Name the poster frame in `BEATS.md` before building: the one frame you would use as the film's thumbnail. It is a
   crafted image (an object with material and light, a photograph, a figure with a real contrast of scale, the product's
   result at full size), never a centred line on a ground. Build it first, render it as a still and judge it alone; the
   film holds it for 1.5 s or more.
6. Copy: titles 2-4 words, sentence case, real nouns, never lorem; a statement ends without a full stop unless the
   sentence needs one. Render stills per beat and a sheet before a full render; review with `taste.md`, then run the
   [polish loop](taste.md#5-the-polish-loop): the first cut is never the film.
