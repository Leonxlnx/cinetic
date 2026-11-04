# Copy and type

Covers the words (the script, writing a line, good and bad scripts, one line at a time, callback copy, stock
phrasing, string audit) and the letters (choosing and loading the family, type roles at film size, sizing one line,
the text animations, the line system, the type devices, type as the set, reveals that never misspell, measuring and
fitting). Read the copy half at Step 1b, when you write the script, and the type half at Step 2 before writing
`src/brand/tokens.ts`. **A script, one clean line at a time:** the words are short real sentences that tell the
story; each line stands large, frontal and centred on a clean ground, arrives in the film's one text voice, and the
product's picture plays before or after it. Numbers are house defaults at 1920×1080 and 60 fps with normal ranges. A supplied brand voice or
typeface wins over every default here.

**Contents**
1. [The script](#1-the-script)
2. [Writing a line](#2-writing-a-line)
2a. [Good and bad scripts](#2a-good-and-bad-scripts)
2b. [One line at a time](#2b-one-line-at-a-time)
3. [Callback copy](#3-callback-copy)
4. [Stock phrasing to cut](#4-stock-phrasing-to-cut)
5. [String audit](#5-string-audit)
6. [The film's type: a dealt pairing](#6-the-films-type-a-dealt-pairing)
7. [Type roles at film size](#7-type-roles-at-film-size)
8. [The text animations: TypeLine, Words, Chain, Oversize](#8-the-text-animations-typeline-words-chain-oversize)
9. [Type devices](#9-type-devices)
10. [Measuring and fitting text](#10-measuring-and-fitting-text)

---

## 1. The script

A cinetic film is written before it is built: a short script of plain sentences that a stranger understands with
the sound off. **Within 5 seconds the viewer knows what the product is and what it does.** Each sentence is one line
on screen, and each line is one beat of the film. Write it at Step 1b, into the Script block of `TREATMENT.md`, and
run `python3 scripts/copy-check.py TREATMENT.md` before any picture work.

**The launch formula.**
1. **What it is**, as line 1 (or line 2, after one short hook), on screen by 3 s, in plain words:
   "[Name] is a [plain category] for [who]." or "[Name] turns [input] into [output]."
   ("Tessel is a calendar for busy teams." "Plumb turns pull requests into a risk list.")
2. **What it does**, 3-5 lines, each one concrete thing, said with a verb, while the product's UI shows exactly that
   thing on screen ("It moves meetings when plans change." over the meeting card sliding to Thursday).
3. **The close**: the name and what to do ("Tessel is out now." with `tessel.app` under the name).

**The update formula.** "[Name] [version]" first ("Plumb 2.4 is out."), then one line per change, each a result the
user sees ("Approvals take one tap."), then the name and the version on the end card.

| Format | Lines | Words a line | In all |
|---|---|---|---|
| Launch film, 15-45 s | 5-8: what it is, 3-5 things it does, the close | 2-7 (sweet spot 4-6) | about 20-45 |
| Update film, 8-20 s | 4-6: name and version, one per change, the close | 2-6 | about 12-30 |
| Product / feature video | 3-6: what it is, what it does | 2-7 | up to 35 |
| Feature loop | 1-2, must read muted | 2-6 | up to 12 |
| Logo sting | the name + at most 1 | 2-5 | the name + 5 |
| UI walkthrough | what it is, then one per step | 2-7 | |

**Plain words.** Short real sentences, one clean line on screen at a time, 2-7 words a line. No metaphors ("a second
brain", "rocket fuel"), no slogans ("Calendar, reimagined." "Less noise. More focus."), no abstract nouns without a
verb ("Total control."), no fancy words (unleash, seamless, elevate, unlock, the future of: §4). Use the words a
customer would use to tell a friend what the thing does. If a line needs the picture to make sense, it is the
picture's job, not a line.

**Why.** A viewer who does not know the product reads about 3 words a second while watching motion. A clever line
that hides what the product is ("Your week doesn't fit.") spends the one moment when the viewer decides to keep
watching; "Tessel is a calendar for busy teams." spends it on the only thing they need first. Feeling and callbacks
come after the viewer knows what they are looking at.

**What is not a line.** Strings the product itself shows (a typed terminal command, code, a URL, an app label) are
the product talking, not the film: put them in `COPY` with `kind: 'ui'` (and `data-ui` on the element that renders
them), and the checks count them apart. The product's name and the version on the end card are `kind: 'name'`. UI
strings still have to be real, readable and held long enough when the story needs them read.

**The checks.** `copy-check.py` reads the script the way a stranger does and fails on a line over 7 words, a one-word
line, vague or fancy words, metaphors, slogan shapes (an opener, "X, reimagined", a question), a line with no verb or
more than one claim, two lines on screen at once, no product name, and no line that says what the product is by 3 s
(an update film: no name and version by 3 s); it warns when the end lacks the name and what to do. It prints what a
stranger reads: what it is, what it does, what to do. It reads `TREATMENT.md` (the Script table, with an optional `At`
column in seconds), `out/cues.json` or a plain list of lines, and `grid-check.ts` runs it on `COPY` inside its
`script` rule. `grid-check.ts` then measures the timing: every line 2-7 words, two lines on screen at once an error
unless the later one declares a swap (§2b), a sentence set on two lines a warning, and the script's budget: 50 words,
at most 2.4 words a second in any 5 s and 1.6 over the body, a line on screen on up to 85 % of the body, with a
text-free 1.5 s in every 10 s for the product to act.

## 2. Writing a line

**Voice**
- Plain words a customer would say out loud. Nouns, verbs and numbers; cut praise adjectives (fast, powerful,
  smart, beautiful); a number beats an adjective ("Builds finish in 40 seconds.").
- Present tense, active voice, one verb doing the work: "Tessel moves the meeting." The product's name is in the
  what-it-is line and on the end card; between them, "It" is enough.
- One claim a line. "It moves meetings and blocks your mornings." is two lines.
- Sentence case, with a period at the end of a statement; an all-lowercase voice is a brand choice. In a line built
  in beats the period comes only with its last part. No exclamation marks, questions, emoji or suspense ellipses.

**The line test.** Every line must pass all six:
1. A stranger understands it with the sound off, without knowing the product.
2. It names a concrete thing the product does (or what the product is), with a verb.
3. It is one sentence of 2-7 words with one claim: never a keyword, a label or a list.
4. It has no metaphor, slogan shape, praise adjective or fancy word.
5. The product's UI shows exactly that thing while the line is on screen.
6. It will still be true in a year, so no "new" or "introducing". An update film, whose whole job is the news, is
   the one exception: its first line carries the version ("Plumb 2.4 is out.", `references/update-films.md`).

**Generating lines.** List what the product really does, one verb each, from the inventory in `TREATMENT.md` (the
product's objects, its one number, what the user stops doing). Write the what-it-is line three ways (a category,
input into output, the name plus a verb) and keep the one a stranger gets fastest. Pick the 3-5 things the product
can show on screen, one line each. Read the lines aloud in order: with the picture off they must tell a stranger
what this is and why they would use it. Then give each line its text animation (§8), decide what the UI shows while
it is read, and run `copy-check.py`.

## 2a. Good and bad scripts

All products here are invented. Each script is for a 20-35 s launch film unless it says otherwise.

**Bad: clever, but what is it?** A stranger watches 10 s and still does not know the product: the film never says
what it is selling.
> Your week doesn't fit. · Three meetings want one hour. · So the week rearranges itself. · Now your week fits.

**Bad: fancy words.** Every line is landing-page grammar; nothing concrete is said.
> Unleash your team's potential. · Scheduling, reimagined. · Seamless by design. · The future of work is here.

**Bad: a keyword pile.** Nothing is claimed, nothing happens, nothing can be repeated.
> Calendar. · Chaos. · Smart scheduling. · Effortless. · Tessel.

**Bad: a sentence dump.** One line says everything, so nothing lands, and it reads like a landing page.
> Tessel is the AI-powered calendar that automatically resolves conflicts and protects your focus time.

**Good: Tessel, a calendar that moves meetings for you.**

| # | Role | Line | Words |
|---|---|---|---|
| 1 | what it is | Tessel is a calendar for busy teams. | 7 |
| 2 | does (the card slides to Thursday) | It moves meetings when plans change. | 6 |
| 3 | does (three invites become one slot) | It finds one hour that works. | 6 |
| 4 | does (the mornings stay grey, locked) | Your mornings stay free for work. | 6 |
| 5 | close | Tessel is out now. | 4 |

The URL `tessel.app` sits under the name on the end card as `kind: 'ui'`. A stranger reads: a calendar for busy
teams that moves meetings, finds a common hour and keeps mornings free; it is out now.

**Good: Plumb, code review that finds the risky lines in a pull request.**

| # | Role | Line | Words |
|---|---|---|---|
| 1 | what it is | Plumb reviews your pull requests. | 5 |
| 2 | does (the diff scrolls, 2,184 lines) | It reads every changed line. | 5 |
| 3 | does (three lines turn yellow) | It flags the lines that can break. | 7 |
| 4 | does (a note opens on line 1,284) | It explains each risk in plain words. | 7 |
| 5 | close | Try Plumb free today. | 4 |

The picture carries the drama (a plumb bob falls through the diff and stops dead on line 1,284) while the lines say
plainly what the product does. The full treatment is in `assets/TREATMENT.md`.

**Good: an update film, Plumb 2.4 (14 s).**

| # | Role | Line | Words |
|---|---|---|---|
| 1 | name and version | Plumb 2.4 is out. | 4 |
| 2 | change | Approvals take one tap. | 4 |
| 3 | change | Replies land in the thread. | 5 |
| 4 | change | Counts update as you watch. | 5 |
| 5 | close | Update Plumb today. | 3 |

## 2b. One line at a time

- **One clean line on screen at a time.** A line arrives, resolves, is read and leaves (or turns into the next line
  in one move) before the next one arrives. Nothing else to read beside it, except the product's own UI and the end
  card's name.
- **A deliberate swap** is the one exception: the next line takes the old one's place in a single move (an erode,
  where the old word's letters fall away and the new word rises in its slot; a redaction box that hops over the old
  words; a wheel that rolls the keyword; a make-room). Declare it on the incoming line: `swap: '<id of the line it
  replaces>'`.
- **Set it on one line, sized to fit** (§7). Never wrap a sentence onto two lines; a sentence that does not fit at
  72 px is too long: cut words.
- **A line may build in beats.** A sentence can arrive in two or three parts with the picture working between them
  (`chain()` in build mode: "It lands" → the dot falls and lands → "on cue."). It is still one line: grid-check reads
  a build chain as one sentence, and its parts follow the chain rules (each read before the next, 26-90 f of picture
  between them with a cue in it). A replace chain makes each part its own line, so each part must be a sentence; a run
  of single words in one place ("queued" → "built" → "shipped") is a keyword pile.
- **The line says what the picture is doing; the picture proves it.** Write the line around the demo: the line lands,
  the product does exactly that, the next line moves on. The middle of a film may run a few seconds of product story
  with no line at all.
- **Stem and rotating slot.** A list is never a list: the sentence holds and only its last word turns over: "It syncs
  to your phone." → "your laptop." → "the whole team." (the `wheel` preset, `fx/Reels`): one line with a moving slot,
  not three lines, a swap every 60-90 f in calm.
- **An image as a word.** A window opens in the line and the product, an icon or a picture stands in for a word:
  "Nothing stands [the moving picture] still." (`fx/InlineGap`). The image then becomes the next shot.
- **Edit, don't replace.** Keep the anchor and change the tail: "Your notes stay messy." → the last word erodes →
  "findable." (the `erode` preset, a declared swap). The meaning turns on the new word while the eye stays put.
- **One accent, on the keyword.** Emphasis comes from colour or the line's own animation, never from a bounce: the
  keyword lands in the accent and cools to ink, or the payoff keeps it (`highlight`, `develop`, `HueSweep`). Not a new
  colour trick on every line.
- **Text-free picture stretches.** At least one of 90 f or more in every 10 s, where the product acts; the lines take
  up to about 85 % of the body.
- **The read is quiet; the picture is not.** While a line is read, nothing that asks for the eye starts: no new copy,
  no hit, no cut, no fast move across the text (`SALIENCE` `copy`, `hit`, `cut`). Life keeps going: the line's own
  animation finishing, the camera creeping or drifting, light moving on the ground, a carried move decaying, a camera
  move away from the text (`life`, `move`). The music may thin or stop for 0.6-1.75 s right after a key line lands,
  and the reading happens in that quiet.

**Timing.** Frames at 60 fps, `PACE.calm` (`references/motion-tokens.md` §9), for a line drawn with the canonical
reveal; a preset (§8) brings its own frames. With a licensed track the bar is the track's; at 100 BPM a bar is 144 f
(2.4 s), and a line's arrival and read take about a bar.

| Step | Frames | Seconds |
|---|---|---|
| A word's entry (fade 28 f on `E.snapOut`, rise a third of the line box over 22 f on `M.rise`) | 28 f | a third visible on its first frame, 90 % by about 0.22 s |
| Word gap inside a line | 11 f on the reading cadence (a longer word earns a longer gap) | 0.18 s |
| A line of n words resolves | 28 + 11·(n − 1): 39, 50, 61, 72, 83, 94 f for 2-7 words | 0.65-1.6 s |
| Reading hold after it resolves | max(52, 36 + 7 f per word): 52, 57, 64, 71, 78, 85 f for 2-7 words (a line on screen never under 3 words a second, `READ_WPS`) | 0.9-1.4 s |
| A preset line resolves | its own frames (`TYPE_PRESETS`, stretched with `pace`; `typeLineFrames()` gives `resolved`) | |
| Between two lines | the old line's exit (15 f at speed) is over before the next arrives, unless the next declares a swap | 0.25 s |
| The keyword's accent | holds 16 f, cools 12 f linearly | 0.47 s |
| Copy rate (a script) | at most 12 words resolving in any 5 s; at most 1.6 words a second over the body | |

**Before and after.**

| Before | After: one line, and how it arrives |
|---|---|
| "Speed." "Less noise." "Total control." (a keyword pile) | "Your builds never wait on you." (one sentence; `develop`: colour fronts run through it and the keyword keeps the accent longest) |
| "Here is the newest earshot. It turns sound into code." (two sentences on one card) | "Here is the newest earshot." (`assemble`) → the product arrives → "It turns sound into code." (`decode`), one line at a time |
| "Every sound you heard was made by code." landing as one block | the same sentence built word by word on the beat, the last word after a breath (`build`) |
| "Syncs to your phone, your laptop and your whole team." (a list) | "It syncs to your phone." with a rotating slot: "your laptop." → "the whole team." (`wheel`) |
| "Builds go from push to preview in 1.2 s." set small under a chart | "Push to preview in 1.2 s." set big, the number punching in (`punch`) while the figure counts up behind it |
| "Your notes stay messy." then, a card later, "Your notes stay findable." | "Your notes stay messy." → the last word erodes → "findable." (`erode`, a declared swap) |

Write each line in `COPY` (`references/timing-grid.md`): `line()` for a line drawn with the canonical reveal,
`chain()` for a line built in beats, or an entry with the preset's own frames for a `TypeLine` (`in` = its `at`,
`resolved` = `typeLineFrames(spec, metrics).resolved`, `out` = its exit's first frame). `grid-check.ts` then measures
it: `script`, `text-hold`, `copy-concurrent`, `read-first`, `reveal-rate`, `chain-gap`, `chain-beat`, `read-quiet` (by
salience), `word-rate` and `text-share` (`references/checks.md`). A line that comes into focus whole (`FocusWord`,
word mode) declares `reveal: 'focus'`: `reveal-rate` then reads its hold, not a rate per word.

## 3. Callback copy

A callback plants a phrase early and pays it off later, changed by what the film has shown. It comes after the
what-it-is line, never in its place: a stranger first learns what the product is, then hears the echo. Every
line of a callback still passes the line test (§2).

| Mechanism | Setup → payoff | Example |
|---|---|---|
| Same words, new truth | The line returns unchanged; the picture changed its meaning | Plumb: "Looks good to me." (a tired lie at 0:04) → "Looks good to me." (true at 0:22) |
| One word flips | The refrain changes by one word | Tessel: "Your week doesn't fit." → "Everything fits." |
| The digit | A number or time changes by the smallest amount | Hush: 3:12 on the lock screen → "By 3:13, your phone is quiet." |
| The user's words | Text the user typed into the product returns as statements | Tessel: typed "Protect my mornings." → "Mornings stay yours." |
| Grammar rhyme | Lines share one structure, so the difference is the message | Loam: "This pot needs water now." / "This pot can wait now." |
| Tautology as proof | Repetition shows that nothing was touched | Keel: "Spending money stays spending money." |

Rules:
- The payoff reuses at least one content word from the setup, or the viewer won't hear the echo.
- The payoff lands on the payoff beat, which is also the loudest sound in the film.
- The setup holds long enough to be remembered: at least its reading hold, max(52, 36 + 7 f per word), after it resolves.
- Never explain the callback on screen.
- Use one main callback per film, plus at most one echo. More than that becomes a gimmick.

## 4. Stock phrasing to cut

**Hard bans** (`SKILL.md`). These never appear in copy you write, because they are landing-page grammar and the
fastest tells of generated work. `copy-check.py` fails on them (its lists are in the script: vague words,
metaphors, slogan shapes); a word the brand's own voice owns passes with `--allow <word>`, recorded in `BRIEF.md`:
- **eyebrow or kicker labels** above a headline ("NEW FEATURE", "INTRODUCING", "01 / SPEED");
- **stacked taglines**: a tagline over or under a headline, or a second statement under the first;
- **"Introducing…"** in any position. A line that hands over to the product's arrival ("Here is the newest earshot.", then the product) is not this: it is a sentence of the script, it leaves room for the picture, and it never sits as a label over the name;
- **keyword piles**: lines of one or two words that say nothing ("Speed." "Less noise." "Total control."), and runs of single words in one place (§2a);
- **text walls**: two lines readable at once (a declared swap excepted, §2b), paragraphs, bullet lists, a list with blurred neighbours, a line over 7 words, two or three type sizes stacked into one card (a number over a word over a line);
- **random filler text**: decorative mono captions, fake metrics, version strings, coordinates and timestamps nobody reads, labels that name the obvious ("DASHBOARD"), lorem ipsum.

Every word on screen earns its place: it is counted in the §1 budget, held long enough to read (§5), and true on its paused frame. Text inside the product UI follows the same rule: real strings from `data.ts` that the story needs, and nothing added to make a frame look busy.

The rest of this list marks a film as a template too. Cut it on sight unless the brand's own voice uses it.

- **Openers:** Meet, Say hello to, Say goodbye to, Ready to…?, What if…?, Imagine…, One more thing.
- **Claims:** the future of, reimagined, redefined, next-gen, revolutionary, game-changing, like never before, beyond, built different, and more.
- **Verbs:** unleash, unlock, supercharge, streamline, elevate, empower, revolutionize, level up, transform your, harness.
- **Metaphors:** magic, superpower, second brain, rocket fuel, on autopilot, a journey, at your fingertips, a copilot: say the real thing it does.
- **Adjectives:** seamless(ly), effortless(ly), powerful, smart, intelligent, AI-powered, all-in-one, at scale.
- **Nouns:** workflow, productivity, solution, experience, journey.
- **Structures:** a feature name as a headline ("Smart Split"); three-item lists ("Plan. Track. Win.").

## 5. String audit

Run this before every review round. Proofing bugs read as "fake" faster than any motion flaw.

- **Plurals and zero.** Use a helper; zero reads as "No clashes", never "0 clashes".
  ```ts
  export const plural = (n: number, one: string, many: string, none = `No ${many}`) =>
    n === 0 ? none : `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;
  // plural(0,'clash','clashes') → "No clashes"; 1 → "1 clash"; 2184 → "2,184 clashes"
  ```
- **Casing.** The brand name is cased one way everywhere. Statements use sentence case. No ALL-CAPS labels.
- **Punctuation.** Curly apostrophes and quotes (’ “ ”), en dash for ranges (9–5), × for dimensions, no double spaces.
- **Numbers.** One time format, one currency format, thousands separators, and tabular figures (§6).
- **Data.** Dates match weekdays, and counts match the items shown. Assert them in `data.ts` (see `references/product-ui.md`).
- **Names.** Invented, plausible and varied. Never real people or companies, "John Doe", "Acme" or example domains.
- **Source of truth.** Every on-screen string lives in `COPY` (`src/timeline.ts`) or `data.ts`. A string hard-coded inside an act escapes both the audit and the word count.

```bash
# straight apostrophes, "1 things", placeholders
grep -rnP "\w'\w|\b1 [a-z]+s\b|lorem|ipsum|TODO|FIXME|Acme|John Doe|example\.com" src/
```

**Reading time** is owned by `references/timing-grid.md` §9: hold a line max(52, 36 + 7 f per word) after it resolves (3 words → 57 f, 5 → 71 f, 8 → 92 f; a line built in beats counts its full word count), leave 26–90 f of picture between the parts of a line built in beats, keep a script's copy rate at or under 12 words in any 5 s, hold the lockup 1.5–2 s, and keep a URL readable ≥ 1.7 s. A crisp film holds max(36, 28 + 6 f per word). `scripts/grid-check.ts` enforces these from `COPY`.

## 6. The film's type: a dealt pairing

One neutral grotesk on every film reads as the default, and the default reads cheap. A film's type is a **pairing**:
a **voice** for the film's words (every statement, the claim, figures at size, the wordmark: `FONT.text`) and a **text
face** for the product's UI and the captions (`FONT.ui`), plus the mono for code. The starter bundles every face of the
pairings (`public/fonts`, SIL OFL 1.1, licences in `public/fonts/fonts.json` and each folder's `OFL.txt`), so a dealt
pairing renders on the first try, offline, with nothing to fetch.

| Pairing | Voice (`FONT.text`) | Text (`FONT.ui`) | Reads as |
|---|---|---|---|
| `swiss` | Instrument Sans | Inter | crisp Swiss editorial grotesk, exact and quiet |
| `newsroom` | Schibsted Grotesk | Inter | a sturdy newsroom grotesk: firm verticals, open counters |
| `studio` | Host Grotesk | Host Grotesk | contemporary studio grotesk, soft terminals |
| `funnel` | Funnel Display | Funnel Sans | a display grotesk with cut details over its own text cut |
| `wide` | Mona Sans Wide (112.5 %) | Mona Sans | an expanded, confident voice over a normal-width text cut |
| `precise` | Hanken Grotesk | Inter | a neat neo-grotesk, light on its feet |
| `technical` | Geist | Geist (+ Geist Mono) | developer type |
| `geometric` | DM Sans (optical sizes) | DM Sans | round, open, friendly-precise |
| `friendly` | Manrope | Manrope | warm, open, semi-geometric |
| `expressive` | Bricolage Grotesque (optical sizes) | Inter | ink traps and character at display sizes, quiet text below |
| `product` | Inter (display cut) | Inter | the neutral SF-class product type (the fallback) |

```bash
npx tsx scripts/type-deal.ts --seed "<product name>"        # deal: random over the table, the same name the same pairing
npx tsx scripts/type-deal.ts --seed "<name>" --mood technical   # a mood weights the deal (x3); it never decides it
npx tsx scripts/type-deal.ts --pair wide                    # the director's pick
npx tsx scripts/type-deal.ts --list | --check
```

- **Deal it, do not default it.** The deal is random over every pairing (a mood only weights it, `product` is a third as
  likely), and the pairings of the last two films in the history are left out, so two films in a row never share a
  voice. Take the dealt pairing unless the brand supplies a face; say which in `TREATMENT.md`.
- **What it writes.** `FONT.text`, `FONT.ui`, `FONT.mono`, `FACES` (every weight in use, per face) and the six `TYPE`
  roles at the type family's sizes (§7) with the pairing's weights, its optical tracking at each size and its leads;
  the placeholders go. `typeStyle()` sets `ui` and `caption` in the text face, the rest in the voice; the kit's UI sets in
  the text face (`KIT_FONT`). Run it again after `type-family.mjs`, which rewrites `TYPE` to Inter's numbers.
- **Set by size, not by guess** (`src/fx/TypePairs.ts`). `pairStyle(id, role, px)` is one role at any size: the weight
  inside the face's axis, tracking interpolated on log size from four anchors (40, 84, 160, 400 px: small type opens,
  big type tightens, the way a display cut is spaced), line height by size (1.3 at UI sizes, 1.2 a line, 1.05 a
  statement, 0.92 a poster word), kerning and contextual forms on, no synthetic bold or italic.
- **Figures.** `numeralStyle(id, px, { count })`: tabular lining figures for anything that counts or aligns,
  proportional for a static hero number; a face whose tabular set spaces the comma like a figure (Schibsted) sets
  proportional and counts in per-digit slots (`fx/Roll`).
- **The wordmark and anything tight never touch.** `wordmarkStyle(id, px)` sets the end card's name at the pairing's
  wordmark weight, 0.004 em looser than a statement. Pass any tight display word or figure run through
  `safeTrack(text, font, px, track)`: it measures each neighbouring pair's ink gap in the browser and loosens the
  tracking until every gap is 0.012 em or more ("Morrow3.2" and a closed-up "11" are the faults it prevents). Keep a
  real space or a gap of 0.25 em between a name and its version.
- **Brand faces win.** A face the brand supplies goes in with `add-font.mjs` (below) and replaces the voice (and the text
  face, when they were one family); the rest of this section still applies.

### A brand's own face, or a target to match

Premium product type is set in a quiet, exact grotesk at regular to medium weights, tight on display sizes and in
sentence case; the personality comes from size, weight, tracking, colour and motion, not from quirky letterforms. A
rounded, techno, script, condensed or "friendly geometric" face picked for character reads cheap at film size, and
one set at 700 reads heavier still. Beside the pairings, `scripts/faces.json` holds the face set by look (all SIL OFL
1.1, free for commercial use in video, fetched from `@fontsource-variable` by `add-font.mjs`; `node scripts/add-font.mjs
--list` prints it):

| Look | Display / text | Alternates | Weights (text · display calm / bold · wordmark) | For |
|---|---|---|---|---|
| **neutral** (default) | Inter (opsz) / Inter | Geist, Inter Tight | 450 · 500 / 600 · 600 | launch, product and feature films, walkthroughs: the default |
| **tight** | Inter Tight / Inter Tight | Public Sans | 450 · 550 / 650 · 650 | big, firm headline systems set tight, centred or cropped by the frame: ads, teasers, reels on the beat |
| **geometric** | DM Sans (opsz) / DM Sans | Google Sans Flex, Urbanist | 450 · 500 / 600 · 600 | round, open product type: consumer apps, assistants, platforms |
| **friendly** | Manrope / Manrope | Plus Jakarta Sans, DM Sans | 500 · 600 / 700 · 700 | calm, warm brands: care, learning, community, feed ads |
| **technical** | Geist / Geist + Geist Mono | JetBrains Mono | 450 · 500 / 600 · 600 | developer tools, APIs, infrastructure, data |

- **A look, when no pairing fits.** `deck.py` deals a type option per direction and names the face from the set for
  its look; the brand's three adjectives (`references/brand-and-color.md` §2) confirm it. The dealt pairing comes
  first; a look from this table is for a brand that asks for one, said in `TREATMENT.md`. A face outside the set needs a
  reason (a brand face, a target frame) and a `font-match.mjs` ranking against the set first. It is always a clean
  sans, plus a mono if the product needs one, because serif and italic are hard bans when you invent the look. The
  starter's face is marked `// cinetic:placeholder` and `lint-film.mjs` fails until you vendor the film's face or keep
  the starter's on purpose (delete the marker and write the look in `TREATMENT.md`).
- **Each face carries its offsets.** `TYPE`'s house numbers are written for Inter at its display cut. Every other face
  in the set lists `weight_offset` (add it to every `TYPE` weight: Manrope's stems match Inter's 110 units heavier) and
  `offset_em` (add it to every `TYPE` tracking: Inter Tight +0.03, Geist −0.01, Public Sans −0.02), measured with
  `font-match.mjs --like` against Inter at the same x-height. `add-font.mjs` prints both when it vendors a set face.
- **Optical size.** Inter, DM Sans and Google Sans Flex have an optical-size axis: the set vendors their `opsz.css`, and
  with `font-optical-sizing` on auto every film size (32 px and up) takes the display cut, which is tighter and finer
  than the text cut. The plain `index.css` of Inter is the text cut only and sets loose and wide on screen.
- **Setting that reads premium.** Sentence case for every line, capitals only for labels of one or two words (+0.04 to
  +0.08 em). Statements regular to medium (450–500 calm, 600 bold); 650 and up only for a wordmark or one claim on the
  accent. Tracking keeps the face's own fit in the calm family and tightens with size in the bold one (table below).
  Tabular figures for anything that counts or aligns; a single static hero number may take
  `fontVariantNumeric: 'proportional-nums'`. Lead 1.05 display, 1.2 line, 1.3 UI.
- **Why a local variable font:** the axis lets you pick 640 exactly, local files render identically offline, and one
  family makes display, UI and wordmark agree.
- **Compare before you commit.** Render the name and the key statement in the look's main face and one alternate and
  compare the numerals, the "a", "g" and "t", and the width at display size.
- **Match a target by measured width, never by eye.** When there is a target face (a reference frame to match, or a brand face that cannot ship), the closest free face changes from film to film: matched by cap height alone, a stand-in runs 10-26 % too narrow or wide. `scripts/font-match.mjs` sets the test line in every candidate in Remotion's own Chrome, measures each render the way it measures the target (ink width, x-height, ascender, stems) and prints, per face, the weight whose stems match, the size whose x-height matches, the tracking that closes the width and the natural width error, ranked; `--sheet` draws the target over every candidate:

```bash
node scripts/font-match.mjs --crop ref/frame.png --box 400,420,1480,580 --text "plans change but people stay" --sheet out/font-match.png
node scripts/font-match.mjs --like brand/Brand-Medium.otf --text "Ship it on Friday" --fetch   # a brand face's free stand-in
```

  Under 3 % natural width the face fits as it is; up to 10 % it fits with the printed tracking (0.08 em or less); past that try the next face. Candidates are the face set's match pool (`scripts/faces.json`: the set first, then a few more neutral sans; `--pool mono` or `--pool serif` for those stand-ins), looked up in the project (`src/brand/fonts/`, `node_modules/@fontsource-variable/`), files you pass, and with `--fetch` npm-packed into a temp folder; the result says whether the pick is in the set. Vendor the pick with `add-font.mjs`, then write its weight and tracking into every `TYPE` role (the role's own tracking plus the face's fitted offset). Measured: the closest free face changes with the target (DM Sans, Inter, Google Sans Flex, Inter Tight, Manrope and Geist each came out first for one), and one face needed anything from −0.05 to +0.03 em.
- **Vendor it into the project, then load it.** A family ships as local files behind `FontGate`, never fetched at render time. The clean way works whether `node_modules` is the project's own or a folder shared through `new-film.sh --link-modules`, where `npm install <font>` would write into the shared folder and change every film that uses it:

```bash
node scripts/add-font.mjs --list                        # the face set by look, with weights and offsets
node scripts/add-font.mjs manrope                       # a face from the set (the friendly look)
node scripts/add-font.mjs jetbrains-mono                # a mono, only if the product needs one
bash scripts/new-film.sh films/x --link-modules <dir>/node_modules --font manrope   # the same, at scaffold time
node scripts/add-font.mjs inter --add ui                # the product's own UI face beside the film's (FONT.ui)
```

  `--add <key>` keeps the film's family and adds the product's own faces beside it (a UI face, a system notification face): `FONT.<key>` and its `FACES` entry, nothing replaced. The film's words keep one sans; the added faces belong to the rebuilt product UI only.

  `add-font.mjs` runs `npm pack @fontsource-variable/<name>` into a temp folder (nothing is installed), copies the package's CSS (`index.css`, or the file the face set names: `opsz.css` for Inter, DM Sans and Google Sans Flex; `--css <file>` picks another), the upright `.woff2` files it references and the licence into `src/brand/fonts/<name>/`, imports that CSS from `src/brand/fonts.ts` in place of the starter's stand-in, and sets `FONT` and `FACES` in `tokens.ts` to the family, clamping weights to its axis. The package's own category picks the role (a monospace family becomes `FONT.mono`) and refuses serif, display and script families unless you pass `--brand-supplied`. Verified with `@fontsource-variable/manrope` 5.3.0 in a project with a linked `node_modules`: the shared folder unchanged, `tsc` clean, and a rendered still in Manrope. The result for a sans plus a mono, once the weights are chosen:

```ts
// src/brand/fonts.ts: bundled with the film; only FontGate imports this file
import './fonts/manrope/index.css'; // Manrope Variable (text), vendored: scripts/add-font.mjs
import './fonts/jetbrains-mono/index.css'; // JetBrains Mono Variable (mono), vendored: scripts/add-font.mjs

// src/brand/tokens.ts: the CSS family is "<Name> Variable"; FACES lists every weight in use,
// because FontGate waits for exactly these before anything renders or measures
export const FONT = {
  text: '"Manrope Variable", system-ui, sans-serif', // the film's one family; typeStyle and measure.ts read it
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
};
export const FACES = ['560 16px "Manrope Variable"', '610 16px "Manrope Variable"', '400 16px "JetBrains Mono Variable"'];
export const TYPE = { // the calm family of section 7 in this face: faces.json gives Manrope weight +110, tracking -0.005 em
  ui: { size: 40, weight: 560, track: 0.005, lead: 1.3 },
  caption: { size: 46, weight: 560, track: 0.005, lead: 1.3 },
  line: { size: 84, weight: 560, track: -0.005, lead: 1.2 },
  display: { size: 160, weight: 610, track: -0.015, lead: 1.05 },
  hero: { size: 200, weight: 610, track: -0.015, lead: 1.0 },
  giant: { size: 640, weight: 610, track: 0.015, lead: 0.9 },
};
```

  - **By hand** (offline, or a family that is not on npm): download or `npm pack` the package anywhere outside the project, copy its `index.css` and the `files/*-wght-normal.woff2` it references into `src/brand/fonts/<name>/` keeping the relative paths, and import that CSS from `fonts.ts`. For a brand's own `.ttf`, convert it (`fonttools ttLib.woff2 compress Brand.ttf`) and write the `@font-face` yourself, one block per file with the weight range (`font-weight: 100 900` for a variable font).
  - **Own `node_modules`** (a project that ran `npm install` itself): `npm i @fontsource-variable/<name>` and `import '@fontsource-variable/<name>'` in `fonts.ts` is fine too.
  - A weight outside the package's axis silently falls back to the nearest one, so check the range: `add-font.mjs` prints it and clamps `FACES`; the `font-weight` line of the vendored `index.css` has it too (`200 800` for Manrope). In HyperFrames, `add-font.mjs` copies the `.woff2` into `fonts/` and prints the `@font-face` block to paste (`assets/hyperframes-starter/fonts/README.md`).
- **Two weights** from the variable axis, for example 600 for display and 450 for text (plus the face's `weight_offset`). Never animate weight on text that reflows (a chip whose weight changes pushes the rest of the line).
- **Mono** only for code, terminal output or aligned data, unless the brand's voice is a mono (the "raw, mechanical" row). Mono timestamps in a consumer UI read as a developer-tool tell.
- **No serif, no italic.** Both are hard bans when you invent the look, and so is a skew that fakes an italic, because serif or italic "elegance" is what generated work reaches for (condensed display faces for "impact" are the same tell). Personality comes from which sans you pick, its weight, case and tracking; emphasis comes from size or motion. A serif the brand supplies is the exception (`references/brand-and-color.md` §1). The other is an **accent face**: one italic (serif or sans) at the line's size for the payoff word inside a line (`Fits [ ] *anywhere.*`), on one word a line and a few times a film, the line that sets it marked `// cinetic:accent-face <family>` (lint-film accepts italic and serif there).
- **A type voice.** One plain sans throughout reads as a document. Pair the display sans with one accent: the italic accent face on the payoff word, the accent colour on the key word (`your week, sorted.`), or lines that keep the name and swap the verb (`Tessel plans.` → `Tessel moves.`). Statement lines own the frame on their own beat, never a title strip above the UI.
- **One token per role.** If display is 640 / −0.04 em, it is exactly that in every scene. Near-miss values across scenes (620, 640, 660; −0.035, −0.04, −0.045) read as "almost matched".
- **Numerals.** `fontVariantNumeric: 'tabular-nums'` on anything that counts, changes or aligns, so counters don't jitter in width.

**Tracking by family** (the house numbers, written for Inter at its display cut; another face adds its `offset_em` from `scripts/faces.json`, or the offset `font-match.mjs` fits to a target):

| Size at 1080p | Calm | Bold | Leading |
|---|---|---|---|
| ≥ 160 px (display, hero, giant, wordmark) | −0.01 em (a whole giant word +0.02) | −0.035 to −0.045 em | 0.9–1.05 |
| 72–120 px (the sentence line, statements) | 0 em: the face's own fit | −0.03 em | 1.2 calm, 1.05 bold |
| 36–48 px (UI, captions) | +0.01 em | −0.01 em | 1.25–1.3 |
| All caps, small labels only | +0.04 to +0.08 em | +0.04 to +0.08 em | – |

## 7. Type roles at film size

`TYPE` in `src/brand/tokens.ts` (px at 1080p); the layout audit reads cap height as a share of the frame height. The numbers are measured house numbers (`lib/look.ts` `TYPE_LOOK`) and come in two families. **The director picks one per film**: `new-film.sh --type calm|bold` (or the template's `type_family`) writes it as `TYPE_FAMILY`, with that family's numbers in `TYPE` and its weights in `FACES`; `node scripts/type-family.mjs bold` switches a film later (`--check` says whether the tokens are in step):

- **calm** (the default and the usual family: the largest line on screen a 5.9-8.5 % box of the frame height, median 7.8 %): small sentence lines, regular weights, the face's own letter fit at every size, an open lead, 85 % white or more. Explainers, walkthroughs, anything said one sentence at a time.
- **bold** (the punchy one: a 9.3-14.8 % box, median 10.6 %): big semibold lines whose tracking tightens with size. Launch teasers, ads, reels cut on the beat.

| Role | Calm | Bold | Cap height, calm / bold (audit band) | Use |
|---|---|---|---|---|
| `ui` | 40 / 450 / +0.01 | 40 / 500 / −0.01 | 2.7 % (ui: 30 px or more) | product strings rebuilt for film, labels (measured 37-55 px) |
| `caption` | 46 / 450 / +0.01 | 46 / 500 / −0.01 | 3.1 % (caption 2.3-4 %) | captions, the end card's tagline, a URL |
| `line` | 84 / 450 / 0, lead 1.2 | 120 / 600 / −0.03, lead 1.05 | 5.6 % / 8 % (line 4-9 %) | a line of the script, 2-4 words (median 3, rarely past 7) |
| `display` | 160 / 500 / −0.01 | 200 / 600 / −0.035 | 10.7 % / 13.3 % (display 9-14 %) | a short statement (up to about 16 characters), the end card's name |
| `hero` | 200 / 500 / −0.01 | 240 / 600 / −0.04 | 13.3 % (display) / 16 % (hero 14-26 %) | one hero word or number per moment (at least 2× the statement it answers) |
| `giant` | 640 / 500 / +0.02 | 900 / 600 / −0.045 | 42.7 % / 60 % (giant 26-90 %) | the set of one moment: once per film (calm: whole in frame; bold: cropped) |

Size / weight / tracking (em, in the starter's Inter at its display cut). Sentence case everywhere; capitals only on small labels. Two weights per family.

**The audits hold both families.** `layout-audit.sh` (and `look-audit.py`, from its JSON) reads cap height (0.72 em)
against bands that meet, so no role of either family falls between two: caption 2.3-4 %, line 4-9 % (calm 84 px is
5.6 %, fitted down to 66-72 px 4.4-4.8 %; bold 120 px 8 %), display 9-14 % (160-200 px), hero 14-26 % (bold 240 px 16 %,
a claim 16 % or more, a name re-set at a quarter of the frame), giant 26-90 %. Widths: a line 61 % of the frame, a calm
sentence (a line under a 6.5 % cap) 75 %, a display or hero line 84 %. `grammar-score.mjs` re-measures the audit's
boxes on the same bands and counts faults per text, not per audited frame (`--print-target` lists where each role of
both families lands). Resting states only: a line inside a type push in flight is a camera move; a claim on the
accent keeps its own 3 % margin (§8).

- **`TEXT_MIN = 36`.** No text under 36 px is held in focus for more than 6 frames. Smaller text is mush on a phone and
  on every contact sheet: a string under it is out of focus (a far plane), on screen for under 6 f, or set larger
  (`small-text`).
- **`GIANT_MIN = 400`.** A word at 400 px and up is the giant role. It is **the set** of one moment: full ink, lit by the
  key (an extruded face lighter toward the key, sides in shade, one soft cast shadow), cropped by the frame past two
  edges, the camera travelling across it, focus falling off along it. Once per film (`giant-once`). Never a faint
  watermark behind the copy (`giant-watermark`).
- **`UI_FILM = 1.9`, `uiFilm(webPx)`.** Product UI is rebuilt for film, never screenshotted at page size: every size of
  the web design times 1.8-2 (house 1.9), never under `TEXT_MIN` (a 16 px label becomes 36, a 20 px body 38, a 32 px
  figure 61). Frame UI as macro crops and hero planes; the camera does the reading.
- **Airy is size, weight and space, not tracking.** A calm film's sentence line is small (84 px, a 5-6 % cap), regular
  weight, on 85 % white or more, at the face's own letter fit; tracked wide it reads as a title gimmick. Where a
  reference looks tracked out, its face has open spacing: fit the tracking to it (next point), which comes out positive
  for a tight face (Inter Tight about +0.03 em) and near 0 for the set's main faces (Inter, DM Sans).
- **A face that stands in for another is fitted by width, not cap height.** Matching cap height alone leaves words
  10-26 % too narrow or wide, and the line's rhythm goes with it. Pick the face with `scripts/font-match.mjs` (§6),
  which ranks the candidates against a reference crop or a brand face. Inside a film, set 4-6 words of the copy in the face,
  then `fitTracking([{ text, width, size }], weight, family, axes)` (`lib/measure.ts`) returns the em tracking that
  matches the widths and each word's residue: under 3 % the face fits, over 6 % try the next one. Optical-size axes
  change widths 3-5 %: pass them (`axes: "'opsz' 32"`) to `measureTracked` and `fitTracking` both.
- **Sizing one line.** A line of the script sits on one line, 72 px or more, under 84 % of the frame width (a short
  statement under 61 %, `MEASURE`), sized from the real font with `fitSize(text, maxWidth, max, weight, track)`.
  Roughly, at 1920 wide in a sans at about 0.5 em a character: up to 16 characters (2-3 words) at `display` or
  `hero`; up to about 28 characters (3-5 words) at the calm `line` 84 px held under 61 % of the width (the bold 120 px
  holds about 20); longer lines fitted down toward 72 px. Past about 44 characters even 72 px will not hold it on one
  line: cut words, never wrap.
- Keep a ratio of at least 2:1 between a line and anything secondary; a flat scale reads as a slide.
- At most 2 non-UI roles on screen at once; one role per line.
- **The type reads at feed size** (`look-audit.py type-read`, with the layout JSON and the cues): the statement lines and
  the lockup name are 72 px or more (6.7 % of the frame height; the calm `line` is 84, the bold 120), each line reads at 4.5:1 or
  more against the ground right under it (under 3:1 fails, and on a busy ground anything under 4.5:1 fails), and it
  reads frontal: a line seen in perspective or debossed in a relief settles frontal for its read. A caption is never
  a lower-left subtitle over footage by default; it sits on a clean field, or the plate under it is dimmed and
  defocused.
- **One beat where the type is the design** (`type-beat`): at least once per film a line of 72 px or more stands
  large, centred or frontal, on a flat field (no structure around it), read for a second or more, built word by word.
  It is the frame the film is remembered by at feed size.
- Contrast against the ground: statements ≥ 7:1, secondary lines ≥ 3:1 at caption size and up.
- Size the wordmark optically: its cap height about equal to the mark's height, checked in a still.
- For 9:16, re-lay the type rather than cropping the master (`references/formats.md`): keep it out of the top ~14 % and
  bottom ~20%, where the feed UI sits.
- `secondary` (48) stays for acts written against 1.1.

## 8. The text animations: TypeLine, Words, Chain, Oversize

Text animation is the main event of a cinetic film: every line of the script arrives its own way, and no two lines
share an animation. `pick.py` draws one per line (its line track, `--lines`); build each one with a preset, a type
device (§9) or the line system below.

**Two entries: crisp for hero lines, calm for body lines.** When no device is the idea, a line still never appears
in place: its words move while they resolve.

| Entry | What each word does | Use it for |
|---|---|---|
| `crisp` | starts 7 f after the last (6-8 f at 60 fps), fades, rises 0.32 em and sharpens from an 8 px blur (at 1080p) on `E.out` over 26 f: the rise runs on after the word reads | hero lines: the hook, the claim, the promise, a statement |
| `calm` | the calm pace's canonical reveal (28 f on `E.snapOut`, a third of the line box of rise over 22 f on `M.rise`, 11 f apart on the reading cadence, no blur), in a crisp film too | body lines: what it is, how it works, a caption read at speaking pace |

Both are `TypeLine` presets (`preset: 'crisp'`, `'calm'`) and `<Words>` props (`{...crispWords(film)}`,
`{...calmWords(film)}`), so a `Chain` or `Words` line takes the same entry. They are defaults, not devices: they may
repeat across lines, while the devices below stay one per line. **An end card never fades in letter by letter**: its
name and tagline arrive as words or as one piece (`END_CARD_PRESETS`; `endCardPreset(p)` turns a letter-unit preset into
`crisp`), and the name is read whole the first frame it is legible.

**The presets** (`fx/TypePresets`): the two entries and twenty-three one-line animations behind one spec and one renderer. `<TypeLine
spec={{ preset, text, at, out, exit }} frame size>` draws a line from the real font's prefix widths (kerning holds,
every glyph its own transform); `typeLineState()` is the pure state for one frame, `typeLineFrames()` its `resolved`
frame and ticks, `declares()` its stepped runs and seams. `key` picks the keyword (the last word by default), `words`
the values a wheel rolls through, `from` the word an erode replaces, `lead` the words a landing lands together,
`scaleFrom` the scale a landing or a flight starts at, `dot` adds a square full stop in the accent, `pace` stretches
every length of a preset at once.

**A hero line takes a confident preset** (`HERO_PRESETS`: crisp, mask, land, fly, snap, room, glide, fall, open, build,
punch): every word is near-solid ink within a few frames and moves while it lands, and colour, not opacity, marks the
newest word. The soft ones (`SOFT_PRESETS`: typeFocus; `SOFT_EXITS`: blur) read blurred or half-faded for a stretch: a
body line or a product moment at most, never a hero line (`heroPreset(p)` turns them into `crisp`). A write-on behind a
wide soft ramp (the accent fading into the ground ahead of the ink) is fade soup: use `develop` (a crisp 1.1 em edge,
the letters behind it at full strength) or `mask`. `snap` and `room` each spend the film's one declared snap.

| Preset | What the line does | Use it for |
|---|---|---|
| `mask` | each word rises out of a mask on its baseline: a near-linear head that stops dead (8 f), darkening from the mute to the ink; words 8 f apart, the last 2.5x slower | a hero line read at speaking pace; a line over a busy picture |
| `land` | the line cuts in oversized (x1.7) and lands in 34 f, a slight defocus clearing as it lands; with `lead` the first words land and the rest append 12 f apart while the line re-centres; given an accent, it lands in it and cools to ink | the claim, the payoff, the first word of a story |
| `fly` | each word flies in from the lens at x5 and soft and lands touching the last in 14 f; then the spaces open and the accent cools left to right | an opening line, a promise, a line that should feel close |
| `snap` | the words read small; the last word lands with one declared frame of x2.2 on the whole line, a short defocus and a settle | the payoff word, a number |
| `room` | the held words creep, then make room in one declared frame (two thirds of the way), and the last word cuts on in the gap | the word that turns the sentence |
| `glide` | the whole line arrives sliding and slows into a drift while its words resolve left to right, 3.5 f apart | a line that rides a cut at speed or a camera move |
| `fall` | each word drops a short way into place from above, from the mute to the ink, 9 f apart; the last word lands in the accent | a line over a deep, dark product world |
| `develop` | colour fronts run through the set line: the tint reveals it behind a crisp edge, then the accent and the ink, the last word in colour longest | a claim that should glow into place |
| `build` | word by word on the beat (14, 10, 10 f apart, a breath before the last word), each word cut on solid in a tint of the accent, walking to the accent and darkening to ink while the line re-centres | the hook; a line read at speaking pace |
| `typeFocus` | (soft) a big line types (30 characters a second) a little out of focus; focus pulls in early, the keyword turns accent, the camera creeps 4 % | a line the product itself would type; never a hero line |
| `arc` | each letter swings down into its slot on a short arc, 2 f apart | a short, light line |
| `assemble` | letters gather from above and below the baseline and ink as they land; the camera pushes 6 % | an arrival, the product line |
| `decode` | the line opens from its centre behind accent blocks, data dashes streaking out of the middle | a technical claim, once per film |
| `wheel` | the keyword rolls like a picker drum, faster and faster, and lands; the line re-flows round it | the rotating slot: one sentence, several endings |
| `erode` | the old word in the keyword's slot erodes letter by letter while the new word rises in | edit, don't replace (a declared swap) |
| `cycle` | the keyword shuffles weight and width every 6 f, the line stepping larger, then lands | a line about change or choice (a variable face) |
| `punch` | a short line set big: focus snaps in over 6 f and the camera punches in 24 %, then keeps creeping | the payoff, a number |
| `echo` | copies slide out from behind the line on knockout boxes, ring by ring, then the stack contracts | a line about many, or about repeating |
| `open` | each word cuts on soft and in the accent, touching the last; the space opens, the line re-centres with a trail and the accent cools to ink | a crisp statement |
| `highlight` | a soft accent block hops word to word, parks on the keyword and wipes off, leaving it in the accent | a line with one word that matters |
| `slice` | the line arrives cut into 9 horizontal strips that snap together | a hard turn |
| `redact` | a box hops over the old line's words as they change under it, then over the new line's, and is gone | a correction, before and after (a declared swap) |
| `swarm` | every word grows out of depth along a wandering path, leaving fading stamps, then locks | a line about arriving from everywhere |

Exits (`exit` at `out`) leave at speed and are cut on their fastest frame: `cut`, `slide` (sideways on an ease-in, the
last words dropping off right to left), `spread` (the words track apart into a zoom toward the first word), `collapse`
(the tracking collapses toward the centre into the cut), `drop`, `drift` (up and away, never faded), `push`, `split`,
`swarm`, and `dive` (the camera zooms through one glyph until its ink fills the frame and becomes the next shot's
ground: a declared zoom-through seam). `blur` (a defocus and a fade) is soft: a small secondary line only.

```tsx
import { TypeLine } from '../fx/TypePresets';
const c = copy('hook');
<TypeLine spec={{ preset: 'build', text: c.text, at: c.in, out: c.out, exit: 'push' }} frame={frame} /> // set in TYPE.line; role="display", size, weight or track override it
```

Give a preset line's `COPY` entry the frames the preset draws (`resolved` from `typeLineFrames()`), so the checks
read the line as the viewer does (a `TypeLine` carries its spec's `id` as `data-text`, measured over its glyph run). Graphic effects frame it: a dithered gradient field, glass, a spectral edge, a morph
from the last shot, a grid, a loader, the product's UI (`references/devices/INDEX.md`, materials and VFX).

**Type changes size through the camera** (`fx/TypePush`): a line is set once at its role's size and the camera pushes
through it, 1.0 -> 2.2× on `E.cam` over 45-60 f (house 52 f at 60 fps), in log space, following the reading point,
and lets the line cross the frame's edges. It never snaps from one size to another. `wordPoint(text, metrics, cx, cy, w)`
gives a word's centre; give `read` the first word and the keyword, and the push travels from one to the other as it
grows (the first point holds still on the first frame; the last lands a third of the way to the frame's centre, or at
`toward`). After landing it creeps 2 % a second, so the hold is alive. `typePushFrames()` gives its peak and the frame
it has settled (speed under 10 % of the peak): cut or swap after that, never mid-push.

```tsx
const m = measureLine(spec, TYPE.display.size, TYPE.display.weight, TYPE.display.track, FONT.text);
<TypePush push={{ at: 70, read: [wordPoint(spec.text, m, cx, cy, 0), wordPoint(spec.text, m, cx, cy, 2)] }} frame={frame}>
  <TypeLine spec={spec} frame={frame} role="display" metrics={m} />
</TypePush>
```

The layout audit holds the line at rest (before the push) to the safe zone; in flight it is a camera move; landed at
a bleed scale it is a declared bleed and must cross the frame's edge (`bleed: false` makes the landed state a resting
state again, held to the zone).

**The claim on accent** (`fx/TypeClaim`, `<AccentClaim text at frame>`): the launch close's claim set like a poster on
the accent: cap height 16.5 % of the frame height (16 % at the least; Inter 245 px at 1080p), each line centred on the
frame (`justify: 'left'` sets it flush left at a 3 % margin, an editorial poster, never at the top or the bottom),
tracking −0.04 em, weight 600-700, lead 0.98, one to three lines broken at word boundaries (`claimLayout()` brings the
size down toward 16 % before it adds a fourth line), centred on the frame's height (`align` bottom or top only over a
full-bleed picture).
Its words arrive on the crisp entry across the lines; the type is paper or ink on the accent, whichever reads
(`inkOn()`); once built, the block creeps from 1.5 % a second, easing toward 3 %, through its hold. The accent flood is
a declared colour event: list its `declares({ at, hold })` in `src/sync.ts`. Never at a sentence line's size: an
under-scaled claim is the claim of a slide deck.

**Objects inside a line** (`kit/inline.tsx`): the thing a sentence names sits in the sentence, at 1.0 cap height on
the baseline, so type and product share one shot. `InlineObject` is the slot: a real mark (a slug, `scripts/logos.mjs`),
a glyph for a generic action, a chip (a label at half the cap height, never under `TEXT_MIN`: the pill grows round it)
or a small UI piece drawn in code (`{ kind: 'ui', aspect, draw: (cap) => ... }`). Every 48 f the objects roll one slot
up as one strip, gliding 16 f on `E.glideOut`, clipped to the cap box; with chips or UI pieces the line re-flows round each object's width
(`fit: 'each'`), with marks it keeps the widest. `ObjectLine` is the whole sentence with `[]` where the object sits:
its words and the slot arrive as one line on the crisp entry (or `entry: 'calm'`), the slot as a word, the rolls
starting once it has landed, the size fitted to what the layout audit allows it. It is the default for a promise line:

```tsx
<ObjectLine id="promise" text="Notes from [] in thirty seconds" objects={['zoom', 'slack', { kind: 'chip', label: 'Standup', glyph: 'calendar' }]}
  at={c.in} frame={frame} role="display" />
```

`InlineLogo` (`kit/logos.tsx`) is the marks-only form. Marks only for products the film's product really touches.

**The line system.** For a line drawn with the canonical reveal, three primitives share one set of house numbers
(`lib/pace.ts`, `lib/anim.ts`) and the film context (`useFilm()`), so they run the same at any fps and frame size.
Each is a pure state function plus a thin component: `wordState()`, `recentreState()` / `chainState()`,
`oversizeState()`.

**The canonical word reveal** (`Words`, and every word of a `Chain`): a word fades in and rises as one front-loaded
tween: a third of it visible on its first frame, 90 % by about 0.25 s, home by 0.53 s.

| Knob | House | Normal range | Prop |
|---|---|---|---|
| fade | 28 f on `E.snapOut` | 23-32 f | `dur`, `durs[]`, `ease`, `eases[]` |
| rise | 0.33 of the line box | 0.2-0.8 em; bigger reads as a throw | `rise`, `riseUnit: 'line' \| 'em'` |
| rise timing | 25 f on `M.rise` | the fade's own curve for a word that lands as one object | `riseDur`, `riseEase` |
| stagger | 12 f, reading cadence | 8-14 f (crisp 8) | `stagger`, `cadence` |
| blur | none | none on calm type | `blur` |

- Words rise on their own composited layer (`subpixel`), so the last pixel of the rise is as smooth as the first.
- The layout owns the line breaks: `breaks` lists the word indices that start a new row (a launch film's long big
  line takes two rows), never a box width that happens to wrap; `alignItems: 'center'` centres the rows. The line
  keeps its box on every frame but carries its `data-text` tag only while a word of it is on screen.
- `wordFrames()` returns each word's start, end and `settle` (the frame it reads as landed: its drawn rise under the
  fastest hold drift, 90 px/s). One soft text sound per line (per part of a line built in beats) goes on the last word's settle (`chainResolves()`),
  never one per word, and the accent hold counts from it.
- **Cadence:** `'reading'` (house: each gap 0.7-1.4× the stagger by the previous word's length, the line's span
  unchanged), `'even'`, `'accelerate'` (gaps shrink to `accelTo` × the stagger, house 0.5: a payoff, one run per act at
  most), explicit gaps (`ACCEL.rows`, `ACCEL.montage`), `starts[]` (a word pinned to a voice onset).

**Building a line: `Chain` re-centre** (`recentre`):

| Mode | What it does | House | When |
|---|---|---|---|
| `'jump'` (house) | the line moves on the very frame the new word shows, most of the way at once | 22 f on `E.jump`: 42 % in the first frame (normal 55-84 % in the first 30 fps frame, the rest in 3-8 frames) | the default: decisive, never a slide under a word being read |
| `'room'` | the held words creep, jump 60-75 % of the room on one frame, then settle (`LineSnap`'s make-room) | see §9 | a statement whose next word is the point |
| `'slot'` | a jump that opens 12 f early; the new words rise into the open slot | | when the arriving word must not appear next to a moving line |
| `'glide'` | the 1.1 exponential glide | `E.expo` | soft, slow films |

How the arriving words show (`ink`): `'reveal'` (the canonical reveal), `'pop'` (cut on at full ink: pairs with a jump
for a crisp build), `'partial'` (cut on part-inked and filled in over 10 f: type being printed). `chainJumps()` lists
every move for the layout audit (a jump is held to the travel limit, not the reading limit) and the sound.

**Exits that leave at speed** (`exit` on `Words` and `Chain`):

| Mode | Move | Opacity | Use |
|---|---|---|---|
| `'launch'` | accelerates out on `E.launchIn` over 17 f (crisp 14), 1.25 em towards `exitDir` | 1.0 on every frame | into a cut or a mask: cut on its fastest frame (`exitAt`) |
| `'launchFade'` | the same move on `E.buildIn`, 0.6 em | a 10 f fade in the move's last half | no cut follows |
| `'auto'` (pace default) | launch when `exitAt` is given, else launchFade | | |

`exitAt` is the last frame the line is drawn; the next shot starts on `exitAt + 1` (or one frame earlier with
`exitOverlap: 1`). A launch exit declares a `velocity` seam: put it in `SEAMS` and open the next shot carried
(`carriedCut()`, `carryChain()`). `exitOrder`: `'rtl'` / `'ltr'` 2 f apart, `'stagger'` 6 f apart, `'together'`.

**Words at the pace of speech.** A calm explainer builds its line at speaking cadence, not on a stagger rule: give
`starts` (the frames each word is said: gaps of 2-5 f at 30 fps are normal) and `arriveX` (em, one value or one per
word: each word lands 0.1-0.4 em right of its slot and settles home on an exponential, half home in 8 f and 90 % by
`arriveDur`, house 28 f at 60 fps: `settleLeft()`) while the whole line drifts the same way on the same curve so the
finished line is centred. Leave it on a
launch with `exitOrder: 'rtl'` and `exitStagger` of one frame: the words vanish in reverse reading order on the move's
last frames and the cut comes at speed.

**The transient accent.** The newest thing lands in the accent, holds it, then cools to ink linearly: `accentHold` /
`accentCool` (house 18 + 13 f calm, 7 + 13 crisp), `accentSpace` (`'oklab'`, house: the hue holds while the chroma falls; `'srgb'` drifts the hue on the way to ink),
`accentOn` (`'all'`, `'first'`, `'last'`, indices). `Chain` `accent`: `'transient'` (house), `'hold'` (the payoff keeps
it), `'recency'` (1.1), `'none'`. Colour on type is transient: a word that stays accent-coloured is the payoff, once.

**Oversized landing** (`Oversize`, `Words.oversize`, `Chain.oversizeFirst`): instead of scaling up from nothing, the
element cuts in larger and settles to its size, never below: from ×1.6 (normal 1.28-1.9; up to about 2.7 for a first
word that also starts defocused) over 36 f on `M.oversize` (22-56 f); colour accent → ink, home about 12 f before the
scale (`cool: 'sweep'` cools it behind a soft front); `defocus` held until `defocusUntil` (a snap to sharp: a declared
step) or resolving over `defocusDur`. A defocused first word that snaps sharp exactly when the second word lands is
the strongest version: the focus snap is the hit (`OVERSIZE_FIRST`: x2.67, 6 px defocus, settling in 24 f, with
`defocusUntil` on the second word's frame).

**Recipes**
- **A line built in beats:** `Chain` build, two parts, `recentre: 'jump'`, transient accent, reading cadence; the line
  leaves with `exit: 'launch'` into a velocity-carried cut.
- **The payoff:** the last part on `cadence: 'accelerate'` with the accent held on its last word, then a held hero
  word with `Oversize` (`from` 1.6-1.9, sweep cool), its hold kept alive by a camera creep.
- **The printed line:** `Chain` with `ink: 'partial'` and a short jump: a terminal-like build without a caret.
- **The thrown title:** `Words` with `exit: 'launch'`, `exitDir: 'left'`, full opacity, cut on the hit; the next shot
  opens at 0.4-1.4× that speed.

## 9. Type devices

**Emphasis is quiet and one kind** ([type emphasis and dimension](devices/type-emphasis.md)). A film picks ONE
emphasis kind (by default the key words in the accent colour; else weight, scale, swell, outline or sweep) and puts it
on at most 60 % of its lines, on the key words the script names (`keys`, or *marks*: "Brook is a *water bottle*.");
the other lines are plain. `fx/TypeEmphasis` `filmEmphasis` deals it; `<TypeLine>` adds no device of its own. A box, a
marker bar, a pill, an underline or a knockout is never the film's kind: only its one declared signature, on one line
at most. Love is in the build and the size, not in a decoration on every line: one line, centred, on the film's one
voice (§8), big (a line alone at a 9.2 % cap, never under 7 %; the claim 11.2 %), whole or in two or three chunks and
read in 1.2 s at most. One-line statements are the norm (80 % of a film's statements
or more); a two-voice stack (a small lead line over big key words, `StatementLine stack`) at most once a film.
`copy-check.py` reads the marks and suggests a key word for a line without one. Stacks, planes in depth and type behind
the subject: `fx/TypeStack`, `fx/TypeDepth`, `fx/TypeBehind`.

Primitives that do one decisive thing to type each: `LineSnap`, `FocusWord`, `HueSweep`, `Letters`, `MaskRise`,
`Scramble`, `TypeOn`, plus `TypeFx`, `TypeFill`, `TypeMask`, `Knockout`, `Echoes`, `Streak`, `PenStroke` and
`Brackets` (the device book's [type arrivals](devices/type-arrivals.md), [lines, layout and swaps](devices/lines-layout-and-swaps.md)
and [type exits](devices/type-exits.md) families). **One text voice per film:** one entry (a preset of §8 or one of
these devices) for most of the film's lines (half of them or more; the word build with a re-centre is the house voice),
plus at most one contrasting entry per 30 s for the hero line (the last word's snap, a decode, a split round a
picture, a slot roll), chosen for what that line says. A new animation on every line reads as a template. Inside a
line, one device: a line wearing three tricks is a sampler.

- **Make room** (`LineSnap mode="room"`, `makeRoomState`): a held line answers a new word by making room in one frame.
  Creep 0.2-0.4 s (house 0.28 s, 17 % of the distance, speed rising), jump 60-75 % of the distance on one frame
  (house 67.5 %), tail 0.2-0.3 s; the new word cuts on in the open space. The jump frame is declared. In a chain:
  `recentre="room"`.
- **The last word snaps** (`LineSnap mode="snap"`, `scaleSnapState`): on the frame the last word lands, the whole line
  jumps larger in one frame (house ×2.2); the words already read settle about 31 px over 7 frames at 30 fps, a short
  defocus clears (peak 3.1 px, two fixed ladder copies), the new word fades in from 16 % over 5 frames. `origin:
  'right'` keeps the new word's end in place and pushes the read words out past the left edge: the payoff lands big
  and whole. In a chain: `snapLast`.
- **Focus in** (`FocusWord`, `focusState`): `mode="word"`: the word shows soft (house 4.6 px) and slides home from the
  side (55 px on `M.focusSlide` over 7 frames at 30 fps), sharp from the fourth frame. `mode="ui"`: the parts of a
  product string (split on `|`) focus in left to right at 0/+2/+5/+6/+10 frames, contrast snapping in at the end. In a
  chain: `focusIn`.
- **Hue sweep** (`HueSweep`, `sweepColor`): a keyword inks along a colour path: pale, then its colour turns, then it
  darkens through the accent to the ink; 9 frames a word at 30 fps, the right end of the word leading. The house
  default is one hue (the accent's), with the house lightness and chroma trajectories. A path across hues is reserved
  for a supplied brand's own colour stops (`path`); a spectral moment belongs to a spectral device instead
  (`references/lighting.md` §5). In a chain: `sweep`, `sweepOn`.
- **Clipped fills** (`fx/HueSweep`): `clipText(fill)` sets a gradient into the type with the box padded so g, p and y
  keep their descenders (`lint-film clip-text` warns on an unpadded clip); `bandFill()` runs an accent band through
  a giant word (ink | accent | ink, soft edges, the head leading; the cut may come before it finishes);
  `frontFill()` inks a line by a front moving in px, the colour ahead of it a function of the distance (an answer
  written right to left).
- **Letters** (`Letters`, `letterState`, `letterFrames`), for the one word that earns it (a wordmark, a product name,
  the payoff): `build` (the first letter grows from its baseline, the others slide home 2 frames apart and darken from
  a light grey, then the word settles about 9 % smaller as one), `arc` (each letter swings up on a short arc, about
  4 % over), `pop` (each letter cuts on and rises 0.19 em, about 1.4 frames apart). Tracking as a device: `tracking`
  (+0.024 em a gap closing over 10 frames at 30 fps: the word tightens about 3 %), `collapse` (a tracking-collapse
  exit cut on its last frame at speed). Positions come from the real font's prefix widths, so kerning holds.
- **Masked rise** (`MaskRise`): each unit rises near-linearly and **stops** (about 85 % of the rise in its 10 f head,
  most of the rest on the next frame); the last unit takes 2.8× the head, so the payoff word arrives slower; each unit
  darkens from a light grey to the ink.
- **Decode** (`Scramble`, `decodeState`, `titleReveal`): a title opens outward from its centre behind two fronts of
  flat accent blocks (3 frames a glyph at 60 fps); a scramble cycles glyphs of each letter's own class at 10 changes a
  second and locks in order (`'ltr'`, `'random'`, `'centre'`). A title once per film, or a short product string;
  never running copy.
- **Typing** (`TypeOn`, `typeSchedule`, `typeState`): `kind="human"` (30 characters a second in runs, pauses around
  commas, the last word slower, about 24 a second overall), `"field"` (a field filling word by word every 5 frames, the
  new word in the accent for one frame), `"prompt"` (from 5 to 19 characters a second, slower on its last word;
  `ACCEL.typing` gaps into a whip), `"stream"` (machine output, 50-150 a second). Elision (`from`): cut into the
  typing with 50-80 % already typed. `trail`: the newest characters in a colour, ageing to ink over 10 characters.
  Typing is for what the product types; a headline is never typed. Human typing over 45 characters a second warns
  (`typing-rate`).

Wiring into the line system: `Chain` and `Words` take `room` (make room), `snapLast`, `focusIn`, `sweep` and
`edgeMask` (a soft edge for a line that scrolls through the frame, house left 250 px); their `declares()` list the
make-room jumps and the snap as one-frame stepped ranges.

**Type as the set: composing the devices into a film.** A type-led launch still needs a picture.
- **One giant word or figure is architecture** (§7): extruded under the key, cropped past two edges, the camera
  trucking along it, focus falling off along it; the line that lands holds still on its own plane.
- **A decode title sits on a graphic field:** a dithered gradient, a hairline grid, glass over the product's UI, or
  the product's own screen out of focus, pushed in and turned a degree or two behind sharp type; a picture only when
  it carries the idea (`references/imagery.md`). Darken the ground under the title from the key's opposite side
  instead of laying a box under it.
- **Make room and snap on the beat.** The jump frame (`makeRoomState().jumpFrame`) and the snap frame (`snap.at`) are
  one-frame events: put them on accents of the track with a short percussive effect on that exact frame.
- **Type into the product, not onto the frame.** A prompt types into a real field (contact shadow, a cast shadow from
  the key, a submit control that answers the return key) over the subject's world out of focus; the answer arrives as
  a card whose one fact focuses in.
- **The lockup is the film's own device:** end on the object the film has been showing, with the wordmark arriving on
  it, never a mark on a radial glow (`references/brand-kits.md` §7).
- **Sound from the same frames:** every effect's frame comes from the state functions the picture draws
  (`typeSchedule()`, `jumpFrame`, `snap.at`, `letterFrames()`, `titleReveal().end`).

**Reveals never spell another word.** A letter-by-letter or sweep reveal passes through every prefix of the word, and a half-drawn last glyph reads as a different letter (the left half of an "n" is an "r", of an "h" an "l"). If any of those intermediate frames reads as a real word, the viewer sees it: a name that briefly spells a different word on its reveal is a proofing bug on the most important frame of the film. Prefer revealing a name by whole word or with a mask that uncovers it all at once, from behind the mark's edge or on a vertical wipe. When a sweep is the idea, list what it passes through and check those frames:

```ts
// what a left-to-right reveal of `word` shows on its way: every prefix, plus half-drawn last glyphs
const HALF: Record<string, string> = { m: 'n', n: 'r', h: 'l', d: 'c', b: 'l', e: 'c', o: 'c', a: 'c', q: 'c', w: 'v' };
export const revealReads = (word: string): string[] =>
  [...word.toLowerCase()].flatMap((ch, i) => {
    const p = word.toLowerCase().slice(0, i);
    return HALF[ch] ? [p + HALF[ch], p + ch] : [p + ch];
  });
// revealReads('tarn') → t tc ta tar tarr tarn: "tar" is a word, so this sweep needs a different reveal
```
Then make a sheet of every frame of the reveal (`python3 scripts/sheet.py --comp Act3 --from A --to B --every 1 --out out/qa/reveal.png`) and read each one as a stranger would.

## 10. Measuring and fitting text

- **Measure after the fonts load.** `FontGate` delays the render until every face is decoded. Measure only in its children; a measurement taken earlier returns the fallback face's width.
- **The starter's `src/lib/measure.ts`:**
  - `measureTracked(text, size, weight, trackEm, family?)` measures a hidden DOM span with the real family, tracking and tabular figures.
  - `fitSize(text, maxWidth, max, weight, trackEm)` returns the largest size ≤ `max` at which the line fits; width is linear in size at a fixed em tracking, so one measurement is enough.
  - `inkBox(text, size, weight)` returns the glyphs' real ink extents (ascent, descent, left, right) from the font; use it to sit a dot on the baseline or a mark on the cap height instead of guessing from the font size.
  - `baselineOf(size, weight, lead)` is the distance from the top of a CSS line box to its baseline.
- **Measure what you render.** Same family, weight, tracking and numeric variant. `measureTracked` measures tabular figures, and `typeStyle()` renders them, so keep the two together.
- **Ink versus box.**
  - Chromium includes the trailing letter-spacing in the measured width, so with negative tracking a glyph with a small right side bearing can overhang the box by up to |track| × size (about 9 px at 176 px and −0.05 em). Pad covering boxes by about 8 px.
  - Side bearings offset the ink from the box on the left too: in the starter's sans, a 176 px "m" starts 13 px inside its box. Align ink rather than boxes, nudging by a bearing measured in a still.
- **One line, never wrapped.** Put one string per line of the script in `COPY` (one per part for a line built in beats; one per row for a multi-line UI note) and render it as one block sized to fit. Automatic wrapping leaves widows (one word alone on the last line), and HyperFrames bans `<br>`.
- **`@remotion/layout-utils`**, if you use it:
  - `fitText({text, withinWidth, fontFamily, fontWeight, letterSpacing})` returns `{fontSize}`; it measures at 100 px and scales.
  - `fitTextOnNLines({text, maxLines, maxBoxWidth, fontFamily, fontWeight, letterSpacing, maxFontSize})` returns `{fontSize, lines}`. It binary-searches the size and breaks greedily on single spaces, so you don't choose the breaks; prefer hand-set lines for statements.
  - `letterSpacing` is a string (`'-0.05em'`), and `fontFamily` is the loaded family name (`'Schibsted Grotesk Variable'`).
  - **The cache gotcha.** Measurements go into a module-level cache that is never cleared. Its key is text, family, weight, size, letterSpacing, textTransform and additionalStyles, but *not* `fontVariantNumeric`, so a tabular and a proportional measurement of the same string collide. A measurement taken before the font loads is cached with the fallback width for the rest of the render. Call these functions only inside `FontGate`, and pass `validateFontIsLoaded: true`, which throws when the fallback face measures identically (it needs more than 4 distinct characters to tell).
