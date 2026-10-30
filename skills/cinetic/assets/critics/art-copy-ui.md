# Critic lens: Art direction, copy and UI truth

Prompt template for one review lens (see `references/review-loop.md`, §5). Run it in round 1, and again whenever copy, type, colour or product UI changed. The lead fills every `{{FIELD}}` and hands this whole file to a subagent.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}. Read these first:
  - `BRIEF.md`;
  - `TREATMENT.md`, for the Script block (the lines in order, their roles) and each line's text animation;
  - `src/brand/tokens.ts`;
  - `src/timeline.ts`, whose `COPY` holds every on-screen line with its frames;
  - the product data module, if there is one.
- File under review: {{VIDEO}} ({{KIND}}). Frames are 0-based: frame = t × {{FPS}}.
- QA folder for this round: {{QA}}. It holds the watch sheets, `legibility.png` (one frame per second at 480 px, which is phone size), and the layout-audit JSON and stills (`layout-*.json`: text boxes against the safe area, overlaps, sizes).
- Round {{ROUND}}. Changed since the last round, so check these hardest: {{CHANGED}}
- Already fixed. Do not re-report these: {{FIXED}}
- Work only inside {{WORKDIR}}.

The brief, word for word. Its hard bans hold on every frame; the brand-supplied exceptions it lists are the only exceptions.

```
{{BRIEF}}
```

## Your lens

You are the art director, the copy editor and the product designer. Judge every frame literally, as a paused still, and judge the brand as a whole: would a stranger remember whose film this was?

1. **Hard bans first** (`SKILL.md` "Hard bans"; HB1–HB11 in `references/taste-and-slop.md`). Run this checklist on the watch sheets and on every resolved copy frame. A hit on any frame is a **P0**, unless `BRIEF.md` lists that exact thing as brand-supplied. Start its `problem` with the HB ID.
   - [ ] **HB1–HB3 words:** no keyword pile (lines of one or two words that say nothing), never two lines readable at once (a declared swap excepted), no line over 7 words, no eyebrow or kicker label, no stacked tagline, no "Introducing…", no filler text (decorative mono captions, fake metrics, labels nobody needs, lorem ipsum).
   - [ ] **HB4 type:** no serif face, no italic or oblique, no skewed text.
   - [ ] **HB5–HB8 colour:** no orange, amber, beige, cream, tan or sand anywhere (accent, paper, glow); no neon; no halo or bloom around elements or type as decoration; no purple, violet or indigo; no monochrome accent wash; no glassmorphism as a UI style. Light, glow, spectral accents, dithered gradients and glass inside a device that does a job are allowed (`references/lighting.md` §5).
   - [ ] **HB9–HB10 decoration:** no emoji or stock icons, no sparkles for "AI", no particles, confetti, lens flares or code rain.
   - [ ] **HB11 motion:** overshoot only on the film's one spring class; nothing else bounces; copy never springs past its place, and letters move one by one only as a line's own text animation.
   - [ ] **Credits:** no music or imagery credit in the picture.

   For a borderline colour, measure it rather than judging by eye: `python3 scripts/palette.py --accent '<hex>'` refuses one in a banned region. Read `node scripts/lint-film.mjs src` too, but trust the frames: the lint cannot see a rendered glow or a filler caption.
2. **Copy.** Grab every line at its resolved frame from `COPY`: `bash scripts/grab.sh {{VIDEO}} <resolved> --width 960 --out {{WORKDIR}}/copy`.
   - Check spelling, casing, punctuation, plurals ("1 clashes"), placeholder strings and inconsistent brand casing.
   - Check reveals: no letter or sweep reveal spells another word on its way (C10); grab its frames one by one.
   - **Judge the script as a stranger** (`references/copy-and-type.md` §1-2b). Read the lines in order from `COPY` with the picture off: by 3 s one line says what the product is in plain words ("[Name] is a [plain category] for [who]." or "[Name] turns [input] into [output]."), then each line says one concrete thing it does, with a verb, then the name and what to do. Run `python3 scripts/copy-check.py out/cues.json` and quote its "a stranger reads" line. No what-it-is line by 3 s, or a keyword pile, is a **P0**; a vague or fancy word, a metaphor, a slogan, a label instead of a sentence ("Focus blocks."), two claims in a line, a line over 7 words, a line wrapped onto two lines, or two lines on screen at once outside a declared swap is a P1 each. Punctuation only at the end of a line; no questions; the count of lines within the format (5-8 for a launch film). UI micro-text a viewer tries to read (labels, file names, counts) counts toward what is visible. Grab one frame per line at its `resolved` frame and one between lines, which should carry no ghost of the last line behind the next.
   - Check the break points of a line built in beats: it never splits a name, a number from its unit, or an article from its noun, unless the very next beat completes it within 90 f.
   - Check the writing. A callback, if the film has one, comes after the what-it-is line and pays off the film's own words (setup phrase, then payoff; `references/copy-and-type.md` §3). Flag stock phrasing ("seamless", "unlock", "AI-powered", a feature name as a headline). Eyebrows, stacked taglines and filler text are hard bans (step 1).
   - Check the end card against the brief: when the brief gives a practical fact (a date, "out now", a URL), it is on the end card at the secondary size and readable for at least 1.7 s. Missing: **P0** (A11).
3. **Type.**
   - There is one family on one set of tokens: the display weight and tracking are a single value everywhere, not 590 here and 620 there.
   - Emphasis comes from size or motion (italic and serif are hard bans, step 1).
   - Numbers use tabular figures.
   - Type roles at film size: `line` 120, `display` 200, `hero` 240, `giant` 900 (once per film, the set of one moment, never a faint watermark), `caption` 46, `ui` 40; nothing under 36 px held in focus for more than 6 f (check `legibility.png` and the layout audit's type-role warnings).
   - Look for glyph collisions: a closed word space, a period off the baseline, a cover that lets glyph tops show.
   - Look for faux italics from 3D shear, and text that stays blurred for more than 6 f.
   - Every line arrives its own way (a preset from `fx/TypePresets` or a type device): two lines with the same text animation, or a line that only fades, is a P1. No spring bounce, no slam on every line; letters move one by one only as a line's own animation (F11). Words arrive front-loaded (a third visible on the first frame); exits leave at speed, never a standalone fade on a statement; colour on type is transient. Text being read drifts at most about 3 px/f and never freezes.
4. **Brand personality and the mark.**
   - Do the family, weights, case, stage, accent and shapes follow from the three adjectives in `TREATMENT.md` (`references/brand-and-color.md` §2)? A calm brand in a heavy grotesk, or a fire-named dev tool on a pale SaaS stage, is a mismatch.
   - With a supplied kit (`brand/brand.json`): the real logo's parts, the kit's colours and greys as grounds, the kit's typeface; a redrawn or recoloured logo is a **P0**.
   - Does anything look like the starter or Tessel: the starter's palette, its face kept with no look chosen, a red "now" dot, a block-and-accent-dot or dome-and-block mark? That is house-style convergence (D9).
   - Is the mark ownable: it passes the 16 px test, links to the name or the product, and could not belong to ten other startups? Is the resolved lockup 28–45% of the frame's width?
   - **Misread test.** Grab the mark at 64 px (a frame of the lockup scaled down, or `out/stills/`), look for half a second and name it. If the first read is a common symbol (a minus or plus, an emoticon, a menu or "more" icon, a padlock, a play button, ±), it is a **P0** (D12): the fix is new geometry, `references/brand-and-color.md` §4.
   - **Lockup typography.** Do the mark and the name read as one object: the name's stems within about 15% of the mark's stroke, a gap about as wide as the widest space inside the name, a shared baseline? A careless setting is a **P1** (`references/brand-and-color.md` §6, three settings side by side).
5. **Colour and surface.**
   - There is one dominant accent with a stated meaning, used for that meaning only, over neutral grounds (C ≤ 0.025) or a deep field; it stays at its share of the picture outside a single flood moment (`look.json` `accent-share` and the wash ceiling). A film washed in the accent's hue (grounds, surfaces and graded pictures all at that hue) is a **P1** (D15).
   - **Real pictures where the shot needs them:** a beat that shows people, a place, a product or proof of many holds a real photo or clip, chosen with taste and finished like a studio (`references/imagery.md` §0, §4, §6): cropped on its subject, one card language (radius, rim, shadow), a lean where the shot is in space, depth blur off the focus, a smear along fast travel, one grade. A drawing standing in for a photo (an SVG person, landscape or product, coloured squares where portraits belong; D18) is a **P0** on the hook or the payoff, a **P1** elsewhere; stock gestures, a picture that says nothing the line needs, low resolution, mixed grades or a flat unfinished rectangle of a photo: a **P1**.
   - The accent's family and the stage match the personality in `TREATMENT.md`; the banned palettes and surfaces are step 1.
   - **Default palette (D10).** Framework blue (`#3B82F6` / `#2563EB` / `#1D4ED8`, hue about 260 at high chroma) or flat greys at chroma 0 in `tokens.ts` read as a template: name the token and a value from the brand's world (`references/brand-and-color.md` §9).
   - **Colourless (D11).** On `legibility.png`, a mid-film frame at 480 px should show a brand colour, and the accent should mark the product's action and the payoff. Measure a key beat with `python3 scripts/palette.py --cover <still> --accent '<hex>'`: near 0% on the beat that should carry it is a **P1**.
   - Look for muddy washes that turn ink to grey.
   - Look for banding: `banding.png` from the forensics lens shows it.
6. **Composition.**
   - **Placement (item 1 of the checklist).** Every statement is centred and in the middle band (35-65 % of the height): flag a line flush left at the top or the bottom (a **P1**), "text left, UI card right", a line on top with a big picture below it more than once a film, and a line squeezed beside or above a picture; check `placement` in `layout-*.json`. Pictures may bleed past an edge, off-centre (`framing-centred` is for pictures, never for type).
   - Flag grey placeholder cards or skeleton bars (D17) and empty cards: every card shows real UI, a real picture or is blank on purpose.
   - There is one focal action per shot.
   - Safe margins are at least 96 px at the sides and 64 px top and bottom, with at least 24 px of headroom at maximum punch. Check the `layout-*.json` violations.
   - Look for crops that slice glyphs, voids at the frame edge, and empty UI regions.
   - **Covered text (I8).** Nothing that moves (a chip, card, cursor or the device) passes over text that is being read: check the densest frames of every move and the `covered` issues in `layout-*.json` (movers tagged `data-mover`).
   - **Vertical frames (E8).** In a 9:16 deliverable the content's mass sits in the middle of the safe band (y 270–1500 at 1080 × 1920), the bottom 40% is not bare, text is clear of the feed zones (`feed9x16`) and UI type is at least 32 px (`references/formats.md` §7).
7. **Product truth.** Pause on every UI frame.
   - The proof shows the feature's non-obvious behaviour, not a version any simpler product could show (the specificity test).
   - Data is named, specific and consistent: dates match weekdays, counts match what is shown, labels stay true after things move.
   - Data agrees with the story: the person who acted isn't shown as still owing or pending, totals and stated ratios match the numbers on screen, and no number appears twice in one frame.
   - The UI is rebuilt for film (every web size ×1.9) and fills the frame enough to read on a phone (`legibility.png`); no small card floating in empty space; a supplied screenshot moves only under the camera, with the element the film acts on rebuilt live.
   - Counters count down during the action, not in one frame afterwards, and every counter, check or total changes on the landing frame of its cause, not a beat later (I3).
   - The feature is named once (a UI label, the one line or the end card) and the product reads as an app: a stranger could say which product and which feature this is (A10).
   - The product changes only the future.
   - One colour means one thing.
   - No cursor appears once the product acts on its own.
   - Flag fake KPIs, lorem ipsum, stock icons and generic dashboards.

## Rules

- When a problem matches a tell in `references/taste-and-slop.md`, start `problem` with its ID (for example `C7:`), so fixes and re-checks can find the catalogue's remedy.
- Each issue names the frame, the exact string or element, and a code-level fix: a token, a data value, a copy entry, a layout constant.
- Do not propose adding lines; rewriting a vague line in plain words, and cutting a line to 2-7 words are welcome; every line keeps the film's one text voice. Do not re-report fixed issues. Rank by impact per minute of fixing.
- Priorities: **P0** is visible on a key beat (hook, payoff, logo, end card), or is a wrong fact or typo anywhere, or is a hard-ban violation anywhere that `BRIEF.md` does not list as brand-supplied. **P1** is noticeable on a normal viewing. **P2** is visible only on pause.

## Return

Return JSON only. `frame` is a number or an `"a-b"` range. `score` is 1 to 10 against the bar in `SKILL.md`. End `overall` with `rubric: copy=N color=N composition=N product=N`.

```json
{
  "issues": [
    {
      "id": "clash-count-plural",
      "priority": "P0",
      "frame": 1012,
      "problem": "the chip reads '1 clashes' for 9 frames on the payoff shot",
      "fix": { "file": "src/app/data.ts", "change": "plural(n, 'clash', 'clashes'); assert every label through it" }
    }
  ],
  "overall": "3-6 sentences: what reads premium, what reads generated.\nrubric: copy=4 color=5 composition=4 product=4",
  "score": 7.5
}
```
