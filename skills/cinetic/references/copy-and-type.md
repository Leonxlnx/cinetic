# Copy and type

Covers the words (the script, writing a line, good and bad scripts, one line at a time, callback copy, stock
phrasing, string audit) and the letters (choosing and loading the family, type roles at film size, sizing one line,
the text animations, the line system, the type devices, type as the set, reveals that never misspell, measuring and
fitting). Read the copy half at Step 1b, when you write the script, and the type half at Step 2 before writing
`src/brand/tokens.ts`. **A script, one clean line at a time:** the words are short real sentences that tell the
story; each line stands large and frontal on a clean ground, arrives with its own text animation, and graphic effects
work around it. Numbers are house defaults at 1920×1080 and 60 fps with normal ranges. A supplied brand voice or
typeface wins over every default here.

**Contents**
1. [The script](#1-the-script)
2. [Writing a line](#2-writing-a-line)
2a. [Good and bad scripts](#2a-good-and-bad-scripts)
2b. [One line at a time](#2b-one-line-at-a-time)
3. [Callback copy](#3-callback-copy)
4. [Stock phrasing to cut](#4-stock-phrasing-to-cut)
5. [String audit](#5-string-audit)
6. [One family, chosen for the brand](#6-one-family-chosen-for-the-brand)
7. [Type roles at film size](#7-type-roles-at-film-size)
8. [The text animations: TypeLine, Words, Chain, Oversize](#8-the-text-animations-typeline-words-chain-oversize)
9. [Type devices](#9-type-devices)
10. [Measuring and fitting text](#10-measuring-and-fitting-text)

---

## 1. The script

A cinetic film is written before it is built: a short script of real sentences, read in order like a story. Each
sentence is one line on screen, and each line is one beat of the film. Write it at Step 1b, into the Script block of
`TREATMENT.md`, before the beat sheet and before any code.

| Format | Lines | Words a line | In all |
|---|---|---|---|
| Launch film, 15-45 s | 6-9 | 3-8 (sweet spot 4-6) | about 25-50 |
| Update film, 8-20 s | 4-6: a hook, one per change, a payoff | 3-6 | about 15-30 |
| Product / feature video | 3-6 | 3-7 | up to 35 |
| Feature loop | 1-2, must read muted | 3-6 | up to 12 |
| Logo sting | the name + at most 1 | 3-5 | the name + 5 |
| UI walkthrough | one per step | 3-8 | |

**The shape.** Read in order, the lines are hook, problem, turn, product, proof, payoff; a 30 s launch film gives
about one line to each and two to the proof. Every line is one of three things:
- a **claim**: something true that the viewer did not know or had not put into words ("Your week doesn't fit.");
- a **turn**: the moment the film changes direction ("So the week rearranges itself.");
- a **payoff**: the line that lands the idea, best as an echo of an earlier one ("Now your week fits.").

**Why sentences.** A keyword pile ("Speed." "Less noise." "Total control.") gives the viewer nothing to repeat; a
sentence carries a claim, and a run of them carries a story. A viewer reads about 3 words a second while watching
motion, so a line of 3-8 words is read in 1-2.5 s and the eye is back on the picture for what follows. Over 8 words a
line turns into a paragraph; under 3 it turns into a label.

**What is not a line.** Strings the product itself shows (a typed terminal command, code, a URL, an app label) are
the product talking, not the film: put them in `COPY` with `kind: 'ui'` (and `data-ui` on the element that renders
them), and the checks count them apart. The product's name and the version on the end card are `kind: 'name'`. UI
strings still have to be real, readable and held long enough when the story needs them read.

**The checks.** `grid-check.ts` reads the script (`script`): every line 3-8 words; a single word is called a keyword
and two words a label; more than half the lines under 3 words is a keyword pile; two lines on screen at once is an
error unless the later one declares a swap (§2b); a sentence set on two lines warns. A film written as a script reads
at the script's budget: 50 words, at most 2.4 words a second in any 5 s and 1.6 over the body, a line on screen on up
to 85 % of the body, with a text-free 1.5 s in every 10 s for the product to act.

## 2. Writing a line

**Voice**
- Use the viewer's words at the moment of pain, not the marketer's. What would they say out loud? ("Looks good to
  me." "Not again.")
- Nouns, verbs and numbers. Cut praise adjectives (fast, powerful, smart, beautiful); a number beats an adjective.
- Present tense, active voice. Make the viewer's world the subject, not the product: "Meetings move over." rather than
  "Tessel moves your meetings." The product's name belongs in one line, the product line.
- Sentence case, with a period at the end of a statement; an all-lowercase voice is a brand choice. In a line built
  in beats the period comes only with its last part. No exclamation marks, questions, emoji or suspense ellipses.

**The line test.** Every line must pass all six:
1. It is true on its own paused frame: the picture agrees with it.
2. A competitor could not say it.
3. It is one sentence of 3-8 words that says something: a claim, a turn or a payoff, never a keyword or a label.
4. It contains no praise adjective.
5. Read aloud, it sounds like a person talking.
6. It will still be true in a year, so no "new", "now with" or "introducing". An update film, whose whole job is the
   news, is the one exception: its hook may carry it ("Plumb 2.4 is out."), handing over to the product
   (`references/update-films.md`).

**Generating lines.** Write 15-20 candidates for each place in the shape, pulling words from the inventory in
`TREATMENT.md` (verbs, the number, the pain scene). Cut with the line test. Read the survivors in order, aloud, on the
beat: the script must tell the story with the picture off. Keep the set whose words echo one another: that echo is
the start of a callback (§3). Then give each line its text animation (§8) and decide what the picture does while it
is read.

## 2a. Good and bad scripts

All products here are invented. Each script is for a 25-35 s launch film unless it says otherwise.

**Bad: a keyword pile.** Nothing is claimed, nothing turns, nothing can be repeated.
> Calendar. · Chaos. · Smart scheduling. · Effortless. · Tessel.

**Bad: labels.** Each line names a feature, none says what it does for anyone.
> Auto-reschedule. · Focus blocks. · Team sync. · Analytics.

**Bad: a sentence dump.** One line says everything, so nothing lands, and it reads like a landing page.
> Tessel is the AI-powered calendar that automatically resolves conflicts and protects your focus time.

**Good: Tessel, a calendar that moves meetings for you.**

| # | Role | Line | Words |
|---|---|---|---|
| 1 | hook | Your week doesn't fit. | 4 |
| 2 | problem | Three meetings want the same hour. | 6 |
| 3 | turn | So the week rearranges itself. | 5 |
| 4 | product | Tessel moves only what can move. | 6 |
| 5 | proof | Forty clashes gone by Monday. | 5 |
| 6 | payoff | Now your week fits. | 4 |

Read in order it is a story, and line 6 pays off line 1 by changing one word.

**Good: Plumb, code review that finds the three lines that can break production.**

| # | Role | Line | Words |
|---|---|---|---|
| 1 | hook | This pull request has 2,184 lines. | 6 |
| 2 | problem | You approve it in forty seconds. | 6 |
| 3 | problem (typed into the review box) | Looks good to me. | 4 |
| 4 | turn | Three of them can break production. | 6 |
| 5 | product | Plumb finds those three first. | 5 |
| 6 | proof | This one assigns instead of compares. | 6 |
| 7 | payoff (typed again) | Looks good to me. | 4 |

The same four words open and close the proof: a tired lie, then the truth.

**Good: an update film, Plumb 2.4 (14 s).**

| # | Role | Line | Words |
|---|---|---|---|
| 1 | hook | Plumb 2.4 is out. | 4 |
| 2 | change | Approvals take one tap. | 4 |
| 3 | change | Replies land in the thread. | 5 |
| 4 | change | Counts update while you watch. | 5 |
| 5 | payoff | Review it before lunch. | 4 |

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
  a build chain as one sentence, and its parts follow the chain rules (each read before the next, 30-90 f of picture
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
| A word's entry (fade 32 f on `E.snapOut`, rise a third of the line box over 25 f on `M.rise`) | 32 f | a third visible on its first frame, 90 % by about 0.25 s |
| Word gap inside a line | 12 f on the reading cadence (a longer word earns a longer gap) | 0.2 s |
| A line of n words resolves | 32 + 12·(n − 1): 56, 68, 80, 92, 104, 116 f for 3-8 words | 0.9-1.9 s |
| Reading hold after it resolves | max(60, 42 + 8 f per word): 66, 74, 82, 90, 98, 106 f for 3-8 words | 1.1-1.8 s |
| A preset line resolves | its own frames (`TYPE_PRESETS`, stretched with `pace`; `typeLineFrames()` gives `resolved`) | |
| Between two lines | the old line's exit (17 f at speed) is over before the next arrives, unless the next declares a swap | 0.28 s |
| The keyword's accent | holds 18 f, cools 13 f linearly | 0.5 s |
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

A callback plants a phrase early and pays it off later, changed by what the film has shown. It is how a short script feels written rather than labelled.

| Mechanism | Setup → payoff | Example |
|---|---|---|
| Same words, new truth | The line returns unchanged; the picture changed its meaning | Plumb: "Looks good to me." (a tired lie at 0:04) → "Looks good to me." (true at 0:22) |
| One word flips | The refrain changes by one word | Tessel: "Your week doesn't fit." → "Everything fits." |
| The digit | A number or time changes by the smallest amount | Hush: "3:12 a.m." → "3:13 a.m." |
| The user's words | Text the user typed into the product returns as statements | Tessel: typed "Protect my mornings." → "Mornings stay yours." |
| Grammar rhyme | Lines share one structure, so the difference is the message | Loam: "18%. Water now." / "42%. Leave it." |
| Tautology as proof | Repetition shows that nothing was touched | Keel: "Spending money stays spending money." |

Rules:
- The payoff reuses at least one content word from the setup, or the viewer won't hear the echo.
- The payoff lands on the payoff beat, which is also the loudest sound in the film.
- The setup holds long enough to be remembered: at least its reading hold, max(60, 42 + 8 f per word), after it resolves.
- Never explain the callback on screen.
- Use one main callback per film, plus at most one echo. More than that becomes a gimmick.

## 4. Stock phrasing to cut

**Hard bans** (`SKILL.md`). These never appear in copy you write, because they are landing-page grammar and the fastest tells of generated work:
- **eyebrow or kicker labels** above a headline ("NEW FEATURE", "INTRODUCING", "01 / SPEED");
- **stacked taglines**: a tagline over or under a headline, or a second statement under the first;
- **"Introducing…"** in any position. A line that hands over to the product's arrival ("Here is the newest earshot.", then the product) is not this: it is a sentence of the script, it leaves room for the picture, and it never sits as a label over the name;
- **keyword piles**: lines of one or two words that say nothing ("Speed." "Less noise." "Total control."), and runs of single words in one place (§2a);
- **text walls**: two lines readable at once (a declared swap excepted, §2b), paragraphs, bullet lists, a list with blurred neighbours, a line over 8 words, two or three type sizes stacked into one card (a number over a word over a line);
- **random filler text**: decorative mono captions, fake metrics, version strings, coordinates and timestamps nobody reads, labels that name the obvious ("DASHBOARD"), lorem ipsum.

Every word on screen earns its place: it is counted in the §1 budget, held long enough to read (§5), and true on its paused frame. Text inside the product UI follows the same rule: real strings from `data.ts` that the story needs, and nothing added to make a frame look busy.

The rest of this list marks a film as a template too. Cut it on sight unless the brand's own voice uses it.

- **Openers:** Meet, Say hello to, Say goodbye to, Ready to…?, What if…?, Imagine…, One more thing.
- **Claims:** the future of, reimagined, redefined, next-gen, revolutionary, game-changing, like never before, and more.
- **Verbs:** unlock, supercharge, streamline, elevate, empower, level up, transform your, harness.
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

**Reading time** is owned by `references/timing-grid.md` §9: hold a line max(60, 42 + 8 f per word) after it resolves (3 words → 66 f, 5 → 82 f, 8 → 106 f; a line built in beats counts its full word count), leave 30–90 f of picture between the parts of a line built in beats, keep a script's copy rate at or under 12 words in any 5 s, hold the lockup 1.5–2 s, and keep a URL readable ≥ 1.7 s. A crisp film holds 36 f + 6 f per word. `scripts/grid-check.ts` enforces these from `COPY`.

## 6. One family, chosen for the brand

- **Choose the family for the brand's personality**, from the table in `references/brand-and-color.md` §2: a humanist sans for a calm brand, a tight grotesk for a fast tool, a rounded sans for a playful one, a neo-grotesk for a premium one. It is always a clean sans, plus a mono if the product needs one, because serif and italic are hard bans when you invent the look. The starter's Geist is a stand-in marked `// cinetic:placeholder`, and `lint-film.mjs` fails until you replace it or keep it on purpose. Why a local variable font: the axis lets you pick 640 exactly, local files render identically offline, and one family makes display, UI and wordmark agree.
- **Compare before you commit.** Render the name and the key statement in two or three candidate sans faces and compare the numerals, the "a", "g" and "t", and the width at display size. The ubiquitous UI default families read as "template" unless you chose them for a reason.
- **Vendor it into the project, then load it.** A family ships as local files behind `FontGate`, never fetched at render time. The clean way works whether `node_modules` is the project's own or a folder shared through `new-film.sh --link-modules`, where `npm install <font>` would write into the shared folder and change every film that uses it:

```bash
node scripts/add-font.mjs manrope                       # a sans from brand-and-color.md §2
node scripts/add-font.mjs jetbrains-mono                # a mono, only if the product needs one
bash scripts/new-film.sh films/x --link-modules <dir>/node_modules --font manrope   # the same, at scaffold time
```

  `add-font.mjs` runs `npm pack @fontsource-variable/<name>` into a temp folder (nothing is installed), copies the package's `index.css`, the upright `.woff2` files it references and the licence into `src/brand/fonts/<name>/`, imports that CSS from `src/brand/fonts.ts` in place of the starter's stand-in, and sets `FONT` and `FACES` in `tokens.ts` to the family, clamping weights to its axis. The package's own category picks the role (a monospace family becomes `FONT.mono`) and refuses serif, display and script families unless you pass `--brand-supplied`. Verified with `@fontsource-variable/manrope` 5.3.0 in a project with a linked `node_modules`: the shared folder unchanged, `tsc` clean, and a rendered still in Manrope. The result for a sans plus a mono, once the weights are chosen:

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
export const FACES = ['450 16px "Manrope Variable"', '640 16px "Manrope Variable"', '400 16px "JetBrains Mono Variable"'];
export const TYPE = { // the roles of section 7, set in this family
  ui: { size: 40, weight: 450, track: -0.01, lead: 1.3 },
  caption: { size: 46, weight: 450, track: -0.01, lead: 1.25 },
  line: { size: 120, weight: 600, track: -0.04, lead: 1.0 },
  display: { size: 200, weight: 640, track: -0.05, lead: 0.95 },
  hero: { size: 240, weight: 640, track: -0.05, lead: 0.95 },
  giant: { size: 900, weight: 700, track: -0.06, lead: 0.9 },
};
```

  - **By hand** (offline, or a family that is not on npm): download or `npm pack` the package anywhere outside the project, copy its `index.css` and the `files/*-wght-normal.woff2` it references into `src/brand/fonts/<name>/` keeping the relative paths, and import that CSS from `fonts.ts`. For a brand's own `.ttf`, convert it (`fonttools ttLib.woff2 compress Brand.ttf`) and write the `@font-face` yourself, one block per file with the weight range (`font-weight: 100 900` for a variable font).
  - **Own `node_modules`** (a project that ran `npm install` itself): `npm i @fontsource-variable/<name>` and `import '@fontsource-variable/<name>'` in `fonts.ts` is fine too.
  - A weight outside the package's axis silently falls back to the nearest one, so check the range: `add-font.mjs` prints it and clamps `FACES`; the `font-weight` line of the vendored `index.css` has it too (`200 800` for Manrope). In HyperFrames, `add-font.mjs` copies the `.woff2` into `fonts/` and prints the `@font-face` block to paste (`assets/hyperframes-starter/fonts/README.md`).
- **Two weights** from the variable axis, for example 640 for display and 450 for text. Never animate weight on text that reflows (a chip whose weight changes pushes the rest of the line).
- **Mono** only for code, terminal output or aligned data, unless the brand's voice is a mono (the "raw, mechanical" row). Mono timestamps in a consumer UI read as a developer-tool tell.
- **No serif, no italic.** Both are hard bans when you invent the look, and so is a skew that fakes an italic, because serif or italic "elegance" is what generated work reaches for (condensed display faces for "impact" are the same tell). Personality comes from which sans you pick, its weight, case and tracking; emphasis comes from size or motion. A serif the brand supplies is the exception (`references/brand-and-color.md` §1).
- **One token per role.** If display is 640 / −0.04 em, it is exactly that in every scene. Near-miss values across scenes (620, 640, 660; −0.035, −0.04, −0.045) read as "almost matched".
- **Numerals.** `fontVariantNumeric: 'tabular-nums'` on anything that counts, changes or aligns, so counters don't jitter in width.

**Tracking tightens as size grows:**

| Size at 1080p | Tracking | Leading |
|---|---|---|
| ≥ 160 px (display, hero, giant, wordmark) | −0.05 to −0.06 em | 0.95 |
| 88–160 px (lines, statements) | −0.04 to −0.05 em | 0.95–1.05 |
| 36–48 px (UI, captions) | −0.01 to 0 em | 1.25–1.4 |
| All caps, if the brand uses them | +0.04 to +0.08 em | – |

## 7. Type roles at film size

`TYPE` in `src/brand/tokens.ts` (px at 1080p); the layout audit reads cap height as a share of the frame height.

| Role | Size | Cap height band | Use |
|---|---|---|---|
| `ui` | 40 | (UI) | product strings rebuilt for film |
| `caption` | 46 | 2.3-4 % | captions, the end card's one line, a URL |
| `line` | 120 | statement band 5-14 % | a line of the script (3-5 words at 120 px; longer lines fitted down to 72 px) |
| `display` | 200 | statement band | a short line (up to about 16 characters), a payoff |
| `hero` | 240 | 14-26 % | one hero word or number per moment (at least 2× the statement it answers) |
| `giant` | 900 | 26-90 % | the set of one moment: once per film |

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
- **Sizing one line.** A line of the script sits on one line, 72 px or more, under 84 % of the frame width (a short
  statement under 61 %, `MEASURE`), sized from the real font with `fitSize(text, maxWidth, max, weight, track)`.
  Roughly, at 1920 wide in a sans at about 0.5 em a character: up to 16 characters (2-3 words) at `display` 200 px or
  `hero` 240; 17-28 characters (3-5 words) at `line` 120 px; 29-40 characters (6-8 words) at 88-100 px. Past about 44
  characters even 72 px will not hold it on one line: cut words, never wrap.
- Keep a ratio of at least 2:1 between a line and anything secondary; a flat scale reads as a slide.
- At most 2 non-UI roles on screen at once; one role per line.
- **The type reads at feed size** (`look-audit.py type-read`, with the layout JSON and the cues): the statement lines and
  the lockup name are 72 px or more (6.7 % of the frame height; the house `line` is 120), each line reads at 4.5:1 or
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

**The presets** (`fx/TypePresets`): sixteen one-line animations behind one spec and one renderer. `<TypeLine
spec={{ preset, text, at, out, exit }} frame size>` draws a line from the real font's prefix widths (kerning holds,
every glyph its own transform); `typeLineState()` is the pure state for one frame, `typeLineFrames()` its `resolved`
frame and ticks, `declares()` its stepped runs and seams. `key` picks the keyword (the last word by default), `words`
the values a wheel rolls through, `from` the word an erode replaces, `dot` adds a square full stop in the accent, `pace`
stretches every length of a preset at once.

| Preset | What the line does | Use it for |
|---|---|---|
| `develop` | colour fronts run through the set line: a pale head reveals it, then a tint, the accent and the ink, the last word in colour longest | a claim that should glow into place |
| `build` | word by word on the beat (14, 10, 10 f apart, a breath before the last word), each word sharpening and darkening from the accent to ink while the line re-centres | the hook; a line read at speaking pace |
| `typeFocus` | a big line types (30 characters a second) out of focus; focus pulls in partway, the keyword turns accent, the camera creeps 4 % | a line the product itself would type |
| `arc` | each letter swings down into its slot on a short arc, 2 f apart | a short, light line |
| `assemble` | letters gather from above and below the baseline and ink as they land; the camera pushes 6 % | an arrival, the product line |
| `decode` | the line opens from its centre behind accent blocks, data dashes streaking out of the middle | a technical claim, once per film |
| `wheel` | the keyword rolls like a picker drum, faster and faster, and lands; the line re-flows round it | the rotating slot: one sentence, several endings |
| `erode` | the old word in the keyword's slot erodes letter by letter while the new word rises in | edit, don't replace (a declared swap) |
| `cycle` | the keyword shuffles weight and width every 6 f, the line stepping larger, then lands | a line about change or choice (a variable face) |
| `punch` | a short line set big: focus snaps in over 6 f and the camera punches in 24 %, then keeps creeping | the payoff, a number |
| `echo` | copies slide out from behind the line on knockout boxes, ring by ring, then the stack contracts | a line about many, or about repeating |
| `open` | each word cuts on touching the last, then the space opens and the line re-centres | a crisp statement |
| `highlight` | a soft accent block hops word to word, parks on the keyword and wipes off, leaving it in the accent | a line with one word that matters |
| `slice` | the line arrives cut into 9 horizontal strips that snap together | a hard turn |
| `redact` | a box hops over the old line's words as they change under it, then over the new line's, and is gone | a correction, before and after (a declared swap) |
| `swarm` | every word grows out of depth along a wandering path, leaving fading stamps, then locks | a line about arriving from everywhere |

Exits (`exit` at `out`): `cut`, `blur`, `drop`, `drift`, `push`, `split`, `swarm`, and `dive` (the camera zooms through
one glyph until its ink fills the frame and becomes the next shot's ground: a declared zoom-through seam).

```tsx
import { TypeLine } from '../fx/TypePresets';
const c = copy('hook');
<TypeLine spec={{ preset: 'build', text: c.text, at: c.in, out: c.out, exit: 'push' }} frame={frame} size={TYPE.line.size * U} />
```

Give a preset line's `COPY` entry the frames the preset draws (`resolved` from `typeLineFrames()`), so the checks
read the line as the viewer does. Graphic effects frame it: a dithered gradient field, glass, a spectral edge, a morph
from the last shot, a grid, a loader, the product's UI (`references/devices/INDEX.md`, materials and VFX).

**The line system.** For a line drawn with the canonical reveal, three primitives share one set of house numbers
(`lib/pace.ts`, `lib/anim.ts`) and the film context (`useFilm()`), so they run the same at any fps and frame size.
Each is a pure state function plus a thin component: `wordState()`, `recentreState()` / `chainState()`,
`oversizeState()`.

**The canonical word reveal** (`Words`, and every word of a `Chain`): a word fades in and rises as one front-loaded
tween: a third of it visible on its first frame, 90 % by about 0.25 s, home by 0.53 s.

| Knob | House | Normal range | Prop |
|---|---|---|---|
| fade | 32 f on `E.snapOut` | 26-36 f | `dur`, `durs[]`, `ease`, `eases[]` |
| rise | 0.33 of the line box | 0.2-0.8 em; bigger reads as a throw | `rise`, `riseUnit: 'line' \| 'em'` |
| rise timing | 25 f on `M.rise` | the fade's own curve for a word that lands as one object | `riseDur`, `riseEase` |
| stagger | 12 f, reading cadence | 8-14 f (crisp 8) | `stagger`, `cadence` |
| blur | none | none on calm type | `blur` |

- Words rise on their own composited layer (`subpixel`), so the last pixel of the rise is as smooth as the first.
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

**The transient accent.** The newest thing lands in the accent, holds it, then cools to ink linearly: `accentHold` /
`accentCool` (house 18 + 13 f calm, 7 + 13 crisp), `accentSpace` (`'srgb'`, or `'oklab'` for even lightness steps),
`accentOn` (`'all'`, `'first'`, `'last'`, indices). `Chain` `accent`: `'transient'` (house), `'hold'` (the payoff keeps
it), `'recency'` (1.1), `'none'`. Colour on type is transient: a word that stays accent-coloured is the payoff, once.

**Oversized landing** (`Oversize`, `Words.oversize`, `Chain.oversizeFirst`): instead of scaling up from nothing, the
element cuts in larger and settles to its size, never below: from ×1.6 (normal 1.28-1.9; up to about 2.7 for a first
word that also starts defocused) over 36 f on `M.oversize` (22-56 f); colour accent → ink, home about 12 f before the
scale (`cool: 'sweep'` cools it behind a soft front); `defocus` held until `defocusUntil` (a snap to sharp: a declared
step) or resolving over `defocusDur`. A defocused first word that snaps sharp exactly when the second word lands is
the strongest version: the focus snap is the hit.

**Recipes**
- **A line built in beats:** `Chain` build, two parts, `recentre: 'jump'`, transient accent, reading cadence; the line
  leaves with `exit: 'launch'` into a velocity-carried cut.
- **The payoff:** the last part on `cadence: 'accelerate'` with the accent held on its last word, then a held hero
  word with `Oversize` (`from` 1.6-1.9, sweep cool), its hold kept alive by a camera creep.
- **The printed line:** `Chain` with `ink: 'partial'` and a short jump: a terminal-like build without a caret.
- **The thrown title:** `Words` with `exit: 'launch'`, `exitDir: 'left'`, full opacity, cut on the hit; the next shot
  opens at 0.4-1.4× that speed.

## 9. Type devices

Primitives that do one decisive thing to type each: `LineSnap`, `FocusWord`, `HueSweep`, `Letters`, `MaskRise`,
`Scramble`, `TypeOn`, plus `TypeFx`, `TypeFill`, `TypeMask`, `Knockout`, `Echoes`, `Streak`, `PenStroke` and
`Brackets` (the device book's [type arrivals](devices/type-arrivals.md), [lines, layout and swaps](devices/lines-layout-and-swaps.md)
and [type exits](devices/type-exits.md) families). **One text animation per line, all different:** a preset (§8) or one
of these devices, chosen for what the line says. Inside a line, one device: a line wearing three tricks is a sampler.

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
