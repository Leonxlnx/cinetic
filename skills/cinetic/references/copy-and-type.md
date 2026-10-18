# Copy and type

Covers the words (budget, voice, fragment chains, callback copy, stock phrasing, string audit) and the letters (choosing and loading the family, scale, tracking, numerals, kinetic-type recipes, reveals that never misspell, measuring and fitting). Read the copy half at Step 1 while writing `TREATMENT.md` and the type half at Step 2 before writing `src/brand/tokens.ts`. Numbers are proven defaults at 1920×1080 and 60 fps, starting points rather than dogma. A supplied brand voice or typeface wins over every default here.

**Contents**
1. [Copy budget](#1-copy-budget)
2. [Writing a line](#2-writing-a-line)
2b. [Fragment chains](#2b-fragment-chains)
3. [Callback copy](#3-callback-copy)
4. [Stock phrasing to cut](#4-stock-phrasing-to-cut)
5. [String audit](#5-string-audit)
6. [One family, chosen for the brand](#6-one-family-chosen-for-the-brand)
7. [Type scale](#7-type-scale)
8. [Kinetic type: one recipe per role](#8-kinetic-type-one-recipe-per-role)
9. [Recipe code](#9-recipe-code)
10. [Measuring and fitting text](#10-measuring-and-fitting-text)

---

## 1. Copy budget

Count every word of the film's own voice: statements, captions, the end-card line. Strings the product itself shows (a typed terminal command, code, a URL, an app label) are not the film talking: put them in `COPY` with `kind: 'ui'` (and `data-ui` on the element that renders them, for `layout-audit.sh`), and the checks count them apart instead of against the budget. They still have to be real, readable and held long enough when the story needs them read, and a frame of nothing but terminal text is still a wall of text. UI texture that is too small or too brief to read costs nothing, but then it can't carry meaning either.

| Format | Words in the film | New per fragment | Visible at once |
|---|---|---|---|
| Launch film, 30 s | aim 15–25, cap 30 | ≤ 4 (about 22 characters) | ≤ 8 in a build chain, ≤ 5 in a replace chain |
| Product / feature video | ≤ 12 | ≤ 4 | ≤ 8 build, ≤ 5 replace |
| Feature loop | ≤ 6, must read muted | ≤ 4 | ≤ 4 |
| Logo sting | the name + ≤ 3 | ≤ 3 | the name + 3 |
| UI walkthrough | ≤ 5 per caption | ≤ 4 | one caption |

A **fragment** is the unit of copy: 1–4 words that arrive together and are read as one glance. A thought longer than that is a **chain** of fragments with picture between them (§2b). "Visible at once" counts every word of film copy readable on one frame; product strings a viewer tries to read (labels, file names, counts) count toward it too, so keep copy and readable UI together under about 14 words on any frame (`grid-check.ts` warns past that).

Why so few: a viewer reads about 3 words per second while also watching motion, and every word you add steals attention from the picture that is meant to carry the idea. A fragment of 2–3 words is read in under a second, so the eye is back on the picture for the beat that follows; a 7-word sentence that lands at once holds the eye for 2–3 s and the picture plays to nobody. Tessel's statements total 15 words across 33 s.

## 2. Writing a line

**Voice**
- Use the viewer's words at the moment of pain, not the marketer's. What would they say out loud? ("Looks good to me." "Not again.")
- Nouns, verbs and numbers. Cut praise adjectives (fast, powerful, smart, beautiful); a number beats an adjective every time.
- Present tense, active voice. Make the viewer's world the subject, not the product: "Meetings move over." rather than "Tessel moves your meetings."
- Sentence case, with a period at the end of a statement; an all-lowercase voice is a brand choice (it often follows a lowercase wordmark). In a chain the period comes only with the sentence's last fragment ("into code."), never mid-chain. The period gives finality and can become a design element (in Tessel it is the device). No exclamation marks, questions, emoji or suspense ellipses.

**The line test.** Every line must pass all six:
1. It is true on its own paused frame: the picture agrees with it.
2. A competitor could not say it.
3. Each fragment has ≤ 4 words; a longer thought is a chain (§2b).
4. It contains no praise adjective.
5. Read aloud, it sounds like a person talking.
6. It will still be true in a year, so no "new", "now with" or "introducing". An update film, whose whole job is the news, is the one exception: one setup fragment may carry it ("here is the newest"), handing over to the product and its name.

**Generating lines.** Write 15–20 candidates per slot quickly, pulling words from the inventory in `TREATMENT.md` (verbs, the number, the pain scene). Cut with the line test. Then read the survivors in order, aloud, on the beat, and keep the set whose words echo one another. That echo is the start of a callback. Then cut each survivor into fragments (§2b) and decide what the picture does between them.

## 2b. Fragment chains

A sentence never lands on screen as one block. It arrives as **fragments** of 1–4 words, one after another, and the picture works between them. In eight frame-measured professional films (a kinetic-type manifesto, three product launches and explainers, a brand-system loop, an event promo, a showreel and a long launch film with voice-over) a beat showed a median of about 2 new words, a fragment stayed fully readable for a median of about 0.8 s, and about half of all beats continued a sentence begun on an earlier beat. The house default keeps that grammar and slows it down: a fragment holds 1.0–1.5 s, and text and the hero action take turns.

**What a fragment is**
- 1–4 words, sweet spot 2–3, about 22 characters at most. It reads as one glance: a subject ("Your week"), a predicate ("doesn't fit."), a setup that wants its payoff ("here is the newest").
- Break at grammar: after the subject, before the object, before the payoff noun, before the name. A fragment may end on a cliffhanger (an article, an adjective, "the newest") only when the very next beat, picture or words, resolves it within 90 f.
- Never split a name, a number from its unit ("2,184 lines"), or an article from its noun, unless the next beat completes it on purpose.
- One type role per chain, one baseline, one centre. Punctuation only on the sentence's last fragment.
- A thought longer than 4 words is a **chain** of 2–4 fragments, 12 words at most. A thought that needs more is two thoughts.

**Build or replace.** Every chain picks one mode (`mode` in `COPY`):

| Mode | What happens | Visible at once | Use it for |
|---|---|---|---|
| **build** | Fragments append to one held line. The line re-centres once per fragment on an exponential glide (`E.expo`, 90% home in about 36 f, no overshoot) that starts just before the new words, so they rise into open space; or the line is laid out at its final width from the start. The newest fragment arrives in the accent and relaxes to ink over 20–30 f. The finished line holds, then clears as a whole over 24 f. | ≤ 8 words on one line (about 45 characters) | a sentence whose halves belong together: setup → payoff, subject → predicate |
| **replace** | Each fragment leaves whole over 24 f, then the next rises in its place on the same centre (`chain()` ends the exit 6 f before the next fragment starts, so two fragments never share the spot), and the eye never travels. | ≤ 5 words | verbs or nouns in a row, a cause → effect run ("queued" → "built" → "shipped"), a sentence too long for one line |

**Recipes.** Each is a pattern measured in the professional films, restated for the calm default.

1. **The animation is the verb.** Write the sentence around the demo: 2–4 words before it, the demo, 1–3 words after. "Now it reads" → [the recording turns into labelled lines] → "who spoke." The words never describe what the picture shows. In one measured launch film the middle of a sentence was 5.5 s of product story with no text at all.
2. **The cliffhanger cut.** End a fragment one step before its payoff and let the picture deliver it: "here is the newest" → the product arrives → "earshot." The pause is the anticipation, and the name lands as its own fragment, in the accent.
3. **Build on a held line.** "Your week" holds, the meetings pile in and overflow it, "doesn't fit." appends. Earlier words never move except for the one re-centre, so the reader keeps their eye position and reads only the new words.
4. **Stem and rotating slot.** A list is never a list. The stem holds and only the last word turns over: "syncs to" | "your phone" → "your laptop" → "the whole team." Swap with a 6–10 f crossfade or a drum roll and re-centre over 15–25 f. Measured slot swaps ran every 0.55–0.85 s; calm swaps run every 60–90 f.
5. **An image as a word.** Open a gap in the line and let the product, an icon or a photo stand in for a word: "from [the phone's screen] to every screen." The image then becomes the next shot (timing in `references/craft-rules.md` §8).
6. **Giant keyword, small continuation.** One word or number at hero size (14–48% of the frame height), then the continuation at the line size in the space beside it: "1.2 s" + "from push to preview". The giant word is felt, the small line is read. At most once per film.
7. **Edit, don't replace.** Keep the anchor and change the tail: "Your notes stay messy." → backspace "messy." → "findable." The meaning turns on the new word while the eye stays put; it is the "one word flips" callback (§3) performed on screen.
8. **A persistent container.** A pill, a pair of brackets or a selection box stays while the words inside it change, so separate fragments read as one thought. Morph the container to each fragment's width (`src/fx/Morph.tsx`); never cross-fade two containers.
9. **One accent, on the newest or the last word.** Emphasis comes from colour, never from a bounce: the newest fragment arrives in the accent and relaxes to ink once it has landed (`<Chain accent="recency">`), or the last fragment of the finished line keeps the accent while the rest relaxes (`accent="hold"`, for the payoff word), or the keyword takes one left-to-right colour sweep over 30–40 f once it is readable. Not a new colour trick on every fragment: by the third card it is a tic.
10. **Text-free picture stretches.** Between runs of text the picture gets stretches with no copy at all: at least one of 90 f or more in every 10 s, and film copy on at most about 65% of the frames. The measured films gave the picture 0.5–6 s without words between their text runs, the ones that carried the story 1.5 s or more.
11. **Quiet after the text completes.** Once a fragment or line has resolved, nothing new starts during its reading hold: the camera drifts, the device breathes, the mix thins. Several measured films dropped the music for 0.6–1.75 s right after a key line completed, and the reading happened in that quiet.

**Timing.** Frames at 60 fps. At 100 BPM a beat is 36 f and a bar 144 f (2.4 s): a fragment's reveal, its read and the picture beat after it take 1–1.5 bars, the natural calm rhythm. The numbers are `PACE.calm` (`references/motion-tokens.md` §6); a crisp film is faster and allows fragments of up to 5 words and 10 visible, but still builds its sentences from fragments.

| Step | Frames | Seconds |
|---|---|---|
| A word's entry (`outSoft`, rise 0.2 em, no blur) | 36 f | 0.6 s; readable from about 10 f |
| Word stagger inside a fragment | 11 f | 0.18 s |
| A fragment of n words resolves | 36 + 11·(n − 1): 36, 47, 58, 69 f | 0.6, 0.8, 1.0, 1.15 s |
| Reading hold after it resolves | max(60, 42 + 8 f per word): 60, 60, 66, 74 f | 1.0, 1.0, 1.1, 1.25 s |
| A build line's hold (its full word count) | 6 words 90 f, 8 words 106 f | 1.5, 1.75 s |
| Picture beat between two fragments of a chain | 30–90 f after the earlier one has been read | 0.5–1.5 s |
| Exit (the whole fragment or line together; in replace mode it ends 6 f before the next fragment rises) | 24 f | 0.4 s |
| Copy rate | ≤ 6 words resolving in any 5 s; ≤ 0.9 words per second film-wide | |

One build chain at 100 BPM, frame by frame:

```
t0 = b(n) − 1    A in: "here is the newest" (4 words)                resolved at t0 + 69
t0 + 69 … 143    A holds 74 f, drifting 0.5 px/f; nothing else starts
b(n+1)           picture beat: the product arrives (one hero move, ≤ 25 px/f, about 50 f); A stays
b(n+1, 2) − 1    B in: "earshot." in the accent, 73 f after A was read, about 20 f after the move settled
  … + 36         B resolved; the whole line holds max(60, 42 + 8·5) = 82 f while the accent relaxes
  … + 118        the line clears together over 24 f; a text-free stretch follows
```

**Before and after.** Original copy, with the picture beat that carries the missing words:

| Before: it lands at once | After: fragments (mode), and the picture between them |
|---|---|
| "Here is the newest earshot. It turns sound into code." (10 words, two sentences on one card) | "here is the newest" → [the product arrives] → "earshot." (build) · 1.5 s with no text: a recording plays · "it turns sound" → [the waveform folds into lines of code] → "into code." (build) |
| "Every sound you heard was made by code." (8 words resolving in 32 f) | "every sound you heard" → [the film's earlier sounds flash back as waveforms] → "was made" → "by code." (replace) |
| "Syncs to your phone, your laptop and your whole team." (a list) | "syncs to" with a rotating slot: "your phone" → "your laptop" → "the whole team." (stem and slot, one per 1–1.5 bars) |
| "Your week doesn't fit." (4 words, but the overflow is the story) | "Your week" → [meetings pile in and overflow the week] → "doesn't fit." (build) |
| "Builds go from push to preview in 1.2 s." (a full sentence) | giant "1.2 s" counting up → "from push to preview" small beside it (giant keyword and continuation) |
| "Your notes stay messy." then, a card later, "Your notes stay findable." | "Your notes stay messy." → backspace → "findable." (edit, don't replace) |

Write a chain in `COPY` with the `chain()` helper (`references/timing-grid.md` §4): it emits one entry per fragment (`<id>.1`, `<id>.2`, …) with its `chain` id and `mode`, timed from the pace. Render it with `<Chain chain="<id>">` from `src/fx/Chain.tsx`, which sets it in the quiet `line` role by default and gives the frame each fragment visibly lands (`chainResolves(id, { size })`, at the size the act sets it at) for its one soft sound. `grid-check.ts` then measures it: `fragment` (words per entry), `copy-concurrent` (words visible on each frame, a leaving fragment until its exit is over), `read-first` (separate lines never arrive together), `reveal-rate` (a fragment dumped faster than 8 f per word), `chain-gap` (each fragment read first, then 30–90 f of picture), `chain-beat` (a cue in that picture beat), `read-quiet` (no cue starts during a read), `word-rate` and `text-share`. In a calm film a missing beat, two lines at once and copy on more than 75% of the body fail.

## 3. Callback copy

A callback plants a phrase early and pays it off later, changed by what the film has shown. It is how a 20-word film feels written rather than labelled.

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
- Use one main chain per film, plus at most one echo. More than that becomes a gimmick.

## 4. Stock phrasing to cut

**Hard bans** (`SKILL.md`). These never appear in copy you write, because they are landing-page grammar and the fastest tells of generated work:
- **eyebrow or kicker labels** above a headline ("NEW FEATURE", "INTRODUCING", "01 / SPEED");
- **stacked taglines**: a tagline over or under a headline, or a second statement under the first;
- **"Introducing…"** in any position. A setup fragment that hands over to the product's arrival ("here is the newest" → the product → its name) is not this: it is half of a chain, it leaves room for the picture, and it never sits as a label over the name;
- **text walls**: more than one statement readable at once, paragraphs, bullet lists, a list with blurred neighbours, a full sentence of 5 or more words arriving as one block (§2b), two or three type sizes stacked into one card (a number over a word over a line);
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

**Reading time** is owned by `references/timing-grid.md` §9: hold a fragment max(60, 42 + 8 f per word) after it resolves (1–2 words → 60 f, 3 → 66 f, 4 → 74 f; a build line counts its full word count: 90 f at 6 words, 106 f at 8), leave 30–90 f of picture between two fragments of a chain, keep the copy rate at or under 6 words in any 5 s, hold the lockup 1.5–2 s, and keep a URL readable ≥ 1.7 s. A crisp film holds 36 f + 6 f per word. `scripts/grid-check.ts` enforces these from `COPY`.

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
export const TYPE = {
  display: { size: 116, weight: 640, track: -0.04, lead: 1.0 },
  secondary: { size: 48, weight: 450, track: -0.02, lead: 1.15 },
  ui: { size: 26, weight: 450, track: -0.01, lead: 1.3 },
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
| ≥ 160 px (payoff, wordmark) | −0.05 to −0.06 em | 0.95 |
| 88–160 px (statements) | −0.04 to −0.05 em | 0.95–1.05 |
| 44–88 px (secondary) | −0.015 to −0.03 em | 1.1–1.2 |
| 22–44 px (UI, captions) | −0.01 to 0 em | 1.3–1.4 |
| All caps, if the brand uses them | +0.04 to +0.08 em | – |

## 7. Type scale

| Role | 16:9 (1920×1080) | 9:16 (1080×1920) | 1:1 (1080×1080) | Weight |
|---|---|---|---|---|
| Emphasis / payoff | 1.5–1.7× the statement (132–218 px) | 1.3–1.5× the statement, fitted to the safe width | 1.4–1.6× | 600 |
| Statement | 88–128 px, ≤ 4 words per fragment | 110–140 px, ≤ 3 words per line, ≤ 2 lines | 80–110 px | 600 |
| Line (build chains, quiet statements) | 48–72 px, ≤ 8 words on one line | 60–80 px, ≤ 4 words per line, ≤ 2 lines | 48–64 px | 500–600 |
| Slam | fit to ~77% of frame width | fit to ~83% (the safe width) | fit to ~84% | 600 |
| Secondary / descriptor, URL | 44–56 px | 60–72 px | 44–52 px | 450–500 |
| Walkthrough caption | 40–48 px | 56–64 px | 40–48 px | 500 |
| Readable UI, after camera scale | ≥ 22 px (28 preferred) | ≥ 32 px | ≥ 28 px | 450–500 |

- Keep a ratio of at least 2:1 between a headline and the secondary line; a flat scale (everything at 48–64 px) reads as a slide.
- **The line role** is for a build chain that will reach 6–8 words: set small, with generous negative space, the way the measured films did (their narrative lines sat at 4.5–9% of the frame height, about 50–95 px at 1080p). Payoff fragments may step up to the statement size. One role per chain.
- Contrast against the ground: statements ≥ 7:1, secondary lines at 44 px and up ≥ 3:1, anything smaller ≥ 4.5:1.
- Size the wordmark optically: set its ascender or cap height about equal to the mark's height, then check it in a still.
- For 9:16, re-lay the type rather than cropping the master: everything but the statement runs about 1.3–1.5× its 16:9 size, because the frame is watched full-screen on a phone. Keep it out of the top ~14% and bottom ~20%, where the feed UI sits; `references/formats.md` §7 has the safe zones and a vertical layout sketch.

## 8. Kinetic type: one recipe per role

Give each text role exactly one reveal system and reuse it. A film has about four roles: statement (a fragment chain), slam, hero word and UI text. Animate words, not letters; the one exception is the hero word. Nothing on type overshoots: words settle on eases or on the critically damped `SPR.calm`, never on `snap`, `pop`, `land` or an unclamped `word` spring. No entry blur by default; text lands sharp.

| Recipe | Role | Numbers | Budget |
|---|---|---|---|
| **Fragment chain** (`src/fx/Chain.tsx`) | statements | one `COPY` entry per fragment, written with `chain()` (§2b); each fragment's words reveal as in the next row. Build: the line re-centres once per fragment on `E.expo` (an exponential glide over 96 f, 90% home in about 36 f) starting 36 f before the new fragment, the newest fragment arrives in the accent and relaxes to ink over 24 f (`accent="recency"`; `"hold"` keeps the payoff in the accent), and the line clears together over 24 f. Replace: each fragment leaves whole over 24 f and has gone 6 f before the next rises on the same centre | the default for every statement |
| **Word reveal** (`src/fx/Words.tsx`) | the words of a fragment | calm (`PACE.calm`, the default): per word over 36 f on `E.outSoft`, 11 f stagger: opacity 0 → 1; `translateY` 0.2 em → 0 through `arrive(p)`; no blur (≤ 4 px through `blurIn` when the brand is soft); the whole fragment exits together over 24 f, opacity on `E.smooth` with a 0.12 em lift on `E.exit`. Crisp (`PACE.crisp`): 26 f on `E.out`, 6–9 f stagger, rise 0.32 em, blur 8 px (4–6 px on body lines) through `blurIn`, clear by 60% of the eased move; per-word exit at half the stagger over 16 f, the move accelerating away on `E.in` (`depart`, `blurOut`) while the opacity fades on `E.smooth` | inside every fragment |
| **Slam** | the problem headline | from `cue − 1` over 15 f on `E.out`: scale 1.2 → 1, blur 22 → 0 px through `blurIn`, opacity 0 → 1; then a slow grow of 1 → 1.05 on `E.smooth` through the hold; width fitted to ~77% of the frame | an accent: at most 1 per film in calm, 1–2 in crisp |
| **Locking words** | the payoff line | two words enter from opposite edges and meet on one baseline. Calm: on `SPR.calm` (16/64/1, critically damped, 97% at 41 f), launched so its 97% frame is the cue, then a push of 1 → 1.03 through the hold. Crisp: on `SPR.word` (20/170/0.9), launched `delayTo(SPR.word, 1)` = 19 f before the cue, each clamped at its lock, with a +1.8% `hitPulse(t, 1, 4)` punch | 1 per film |
| **Tracking collapse** | the hero word | per-glyph spread of +0.6–0.8 em → 0 over 24 f on `E.out` (36 f on `E.outSoft` in calm); colour accent → ink over 20 f | once per film |
| **Drum** | a replace chain, one fragment per bar | lines 0.30–0.42 rad apart on a 500 px drum, `scaleY(cos a)`, masked to one line; one `SPR.detent` (24/380/0.6) roll per bar, reaching the lock in 10 f; 3 ratchet ticks 3 f apart into each detent (crisp); in calm one roll per 2.4 s bar on an ease, without the ratchet | 1 run |
| **Underline → block** | a word that becomes a shape, then the mark | a line 0.1 em thick at baseline + 0.07 em, drawn left to right over 16 f on `E.out`; from +14 f it swells to top = baseline − 0.8 em and height 1.04 em over 12 f; the glyphs melt under it over 10 f | 1 per film |
| **Label roll** | a UI label or counter changing | old label y 0 → −0.6 em over 10 f on `E.in`; new label +0.6 em → 0 over 14 f on `E.out`, overlapping 4 f; digits roll 6–8 f each in tabular figures | as needed |
| **Typed input** | the user's words | calm: about 20 characters/s (`TypeOn`'s default of 3 f per character) on a weighted cadence, then at least 72 f of read hold after the last key; crisp: about 30 characters/s. Each letter arrives in the accent and relaxes to ink over 12 f (`references/product-ui.md`). A headline is never typed | 1 per film |

Why these numbers:
- **Nothing on type overshoots.** Of the eight measured films, only a high-energy showreel let its letters overshoot; the others settled every word with none. A word that bounces reads as a toy, and overshoot closes word spaces (below).
- **Entries are long but read early.** `E.outSoft` puts about 77% of the rise in the first quarter of the move, so a word is readable after about 10 f and settles over the rest. The calm comes from the long tail and the hold, not from a late arrival: the calmest measured explainer reached 90% of each glide at 2.5–3.7× its half-time.
- **A fragment leaves as one unit** because it was read as one glance. Per-word exits ask the eye to read the words again on their way out, and they add motion at the moment the picture should take over.
- **Blur, when it is used, clears early** (`blurIn`, `blurOut` in `src/lib/anim.ts`) because Chromium renders a blur radius in ~0.5 px steps and anything under ~0.75 px fully sharp. A blur that fades with the move's slow tail snaps into focus a few frames after the text has visibly stopped; one that is gone by 60% of the move finishes while the word is still fast and half transparent.
- **The exit fades on its own curve.** Opacity on the exit's `E.in` holds a word near full strength and then drops its last half in 2–3 frames: a pop as each word leaves (per-frame change 0.87 at its peak on a test line, against 0.38 with the fade on `E.smooth`, whose slope is zero at both ends).
- **The rise ends on `arrive`** because the headless shell snaps a text layer's vertical position to whole pixels: an ease-out's last few pixels arrive as 1 px ticks with holds between them. Details in `references/chromium-rendering.md` §15.
- **The slam grows** because a headline frozen through its hold reads as a stalled player. Every reading hold keeps slow life: a 0.3–1 px/f drift or a 1–3% creep (`references/camera.md` §4).
- **Locks never pass the lock** because overshoot closes the word space: Tessel showed "Everythingfits" for 6 f.
- **Underline, never strike-through**, because a line through your own promise crosses it out.
- **The drum masks to one line** because two readable lines at once is a text wall; neighbours show only as unreadable slivers.
- **Letters only for the hero word** because per-letter motion invites misreads mid-reveal (below).

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

`SPR.word` and `SPR.detent` live in the starter's `src/lib/anim.ts`. Add any new preset there with a comment, never inline in an act: the lint treats spring configs in acts as errors.

## 9. Recipe code

Each snippet was type-checked against the starter's `src/lib` and `src/brand` and rendered with Remotion 4.0.529. `f` is the act-local frame, and everything renders inside `<FontGate>` because it measures text.

**Slam**
```tsx
import { blurIn, E, mix, prog, tw } from '../lib/anim';
import { fitSize } from '../lib/measure';
import { C, TYPE, typeStyle } from '../brand/tokens';

export const Slam: React.FC<{ f: number; cue: number; out: number; text: string; width?: number; y?: number }> = ({
  f, cue, out, text, width = 1480, y = 540 }) => {
  const { weight, track } = TYPE.display;
  const size = fitSize(text, width, 480, weight, track);          // the measured line fills `width`
  const s = prog(f, cue - 1, cue + 14, E.out);                    // first new picture on the hit frame
  const k = mix(1.2, 1, s) * tw(f, cue, out, 1, 1.05, E.smooth);  // slam, then a slow grow
  return (
    <div style={{ ...typeStyle('display', size), position: 'absolute', left: 0, top: 0, width: 1920,
      textAlign: 'center', color: C.ink, transformOrigin: '960px 50%',
      transform: `translateY(${y - size / 2}px) scale(${k})`, opacity: s, filter: `blur(${blurIn(s, 22)}px)` }}>
      {text}
    </div>
  );
};
```

**Locking words** (the crisp form; in calm, use `SPR.calm`, launch it `delayTo(SPR.calm, 0.97)` before the cue and drop the punch): the part that matters; place each word by `transform`.
```ts
import { spring } from 'remotion';
import { E, SPR, hitPulse, mix, prog } from '../lib/anim';
import { delayTo } from '../lib/sync';
import { FPS } from '../timeline';

const LEAD = delayTo(SPR.word, 1); // 19 f: export it as a sync constant for the lock sound
// x0: left edge of the locked line; wa: measured width of word A; gap: the word space (~0.24 em)
const s = spring({ frame: f - (cue - LEAD), fps: FPS, config: SPR.word });
const da = Math.min(0, mix(-(x0 + wa + 200), 0, s));                // left word: never past its slot
const db = Math.max(0, mix(1920 - (x0 + wa + gap) + 120, 0, s));     // right word: never past its slot
const k = (1 + 0.018 * hitPulse(f - cue, 1, 4)) * mix(1, 1.03, prog(f, cue, cue + 150, E.linear));
// word A at translate(x0 + da), word B at translate(x0 + wa + gap + db); the wrapper scales by k about the centre
```

**Tracking collapse**: glyphs sit at their *kerned* positions, so the rest pose matches a normal text run.
```tsx
const m = (s: string) => measureTracked(s, size, weight, track);
const chars = [...text];
const at = chars.map((ch, i) => m(chars.slice(0, i + 1).join('')) - m(ch)); // keeps pair kerning
const p = prog(f, start, start + 24, E.out);
const spread = (1 - p) * 0.7 * size;                                     // +0.7 em per letter at the start
const mid = (chars.length - 1) / 2;
const color = mixColor(C.accent, C.ink, prog(f, start + 4, start + 24, E.smooth)); // src/lib/color.ts, OKLab
// each glyph: <span style={{ position:'absolute', left:0, top:0, color,
//   transform:`translate(${x + at[i] + (i - mid) * spread}px, ${y}px)` }}>{chars[i]}</span>
```

**Underline → block**: draw it as an SVG rect so the geometry stays sub-pixel, and clamp every size at 0. `baseY` is the line box's top plus `baselineOf(size, weight, lead)` from `src/lib/measure.ts`.
```tsx
const draw = prog(f, start, start + 16, E.out);
const sw = prog(f, start + 14, start + 26, E.out);
const pad = 8; // negative tracking lets the last glyph's ink overhang the measured width
const top = mix(baseY + 0.07 * em, baseY - 0.8 * em, sw);
const h = Math.max(0, mix(0.1 * em, 1.04 * em, sw));
const glyphs = 1 - prog(f, start + 16, start + 26, E.smooth); // opacity of the word under the block
// <rect x={x - pad} y={top} width={Math.max(0, (w + 2 * pad) * draw)} height={h}
//       rx={Math.max(0, Math.min(h / 2, 0.05 * em + 0.08 * em * sw))} fill={C.ink} />
```
The block can then accelerate into a mark piece and land with a contact squash; that seam is "words become the mark" in `references/transitions.md`.

**Drum**
```tsx
const STEP = 0.42, R = 500; // radians between lines; drum radius in px
const turned = detents.reduce((a, t) => a + spring({ frame: f - t, fps: FPS, config: SPR.detent }), 0);
lines.map((text, i) => {
  const a = Math.max(-1.45, Math.min(1.45, (i - turned) * STEP));
  // translate(x, axisY + R * sin(a) - size / 2) scaleY(cos(a)), transformOrigin '0 50%';
  // parent mask: linear-gradient(transparent axisY-1.5·size, #000 axisY-0.55·size, #000 axisY+0.55·size, transparent axisY+1.5·size)
});
```

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
- **Break lines by hand.** Put one string per fragment in `COPY` (one per line for a multi-line UI note) and render one block per fragment. Automatic wrapping leaves widows (one word alone on the last line), and HyperFrames bans `<br>`.
- **`@remotion/layout-utils`**, if you use it:
  - `fitText({text, withinWidth, fontFamily, fontWeight, letterSpacing})` returns `{fontSize}`; it measures at 100 px and scales.
  - `fitTextOnNLines({text, maxLines, maxBoxWidth, fontFamily, fontWeight, letterSpacing, maxFontSize})` returns `{fontSize, lines}`. It binary-searches the size and breaks greedily on single spaces, so you don't choose the breaks; prefer hand-set lines for statements.
  - `letterSpacing` is a string (`'-0.05em'`), and `fontFamily` is the loaded family name (`'Schibsted Grotesk Variable'`).
  - **The cache gotcha.** Measurements go into a module-level cache that is never cleared. Its key is text, family, weight, size, letterSpacing, textTransform and additionalStyles, but *not* `fontVariantNumeric`, so a tabular and a proportional measurement of the same string collide. A measurement taken before the font loads is cached with the fallback width for the rest of the render. Call these functions only inside `FontGate`, and pass `validateFontIsLoaded: true`, which throws when the fallback face measures identically (it needs more than 4 distinct characters to tell).
