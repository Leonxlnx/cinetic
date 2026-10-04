# Critic lens: Art direction, copy and UI truth

Prompt template for one review lens (see `references/review-loop.md`, §5). Run it in round 1, and again whenever copy, type, colour or product UI changed. The lead fills every `{{FIELD}}` and hands this whole file to a subagent.

## Context

- Film: {{FILM}}, {{SPEC}}. Project root: {{ROOT}}. Read these first:
  - `BRIEF.md`;
  - `TREATMENT.md`, for the copy and the word budget;
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
   - [ ] **HB1–HB3 words:** no eyebrow or kicker label, no stacked tagline, no "Introducing…", never two statements readable at once, no filler text (decorative mono captions, fake metrics, labels nobody needs, lorem ipsum).
   - [ ] **HB4 type:** no serif face, no italic or oblique, no skewed text.
   - [ ] **HB5–HB8 colour:** no orange, amber, beige, cream, tan or sand anywhere (accent, paper, glow); no neon, glow, bloom or halo; no purple, violet or indigo, no purple-to-blue or multi-hue gradient; no glass.
   - [ ] **HB9–HB10 decoration:** no emoji or stock icons, no sparkles for "AI", no particles, confetti, lens flares or code rain.
   - [ ] **HB11 motion:** overshoot only on true landings (an object arriving at a surface or a lock), at most 2 in the film; nothing else bounces.

   For a borderline colour, measure it rather than judging by eye: `python3 scripts/palette.py --accent '<hex>'` refuses one in a banned region. Read `node scripts/lint-film.mjs src` too, but trust the frames: the lint cannot see a rendered glow or a filler caption.
2. **Copy.** Grab every line at its resolved frame from `COPY`: `bash scripts/grab.sh {{VIDEO}} <resolved> --width 960 --out {{WORKDIR}}/copy`.
   - Check spelling, casing, punctuation, plurals ("1 clashes"), placeholder strings and inconsistent brand casing.
   - Check reveals: no letter or sweep reveal spells another word on its way (C10); grab its frames one by one.
   - Check the budget: at most 5 words per line, at most 2 lines, one line on screen at a time, and the film's total within the brief.
   - Check the writing. Lines should pay off the film's own words (setup phrase, then refrain, then resolution). Flag stock phrasing ("seamless", "unlock", "AI-powered", a feature name as a headline). Eyebrows, stacked taglines and filler text are hard bans (step 1).
   - Check the end card against the brief: when the brief gives a practical fact (a date, "out now", a URL), it is on the end card at the secondary size and readable for at least 1.7 s. Missing: **P0** (A11).
3. **Type.**
   - There is one family on one set of tokens: the display weight and tracking are a single value everywhere, not 590 here and 620 there.
   - Emphasis comes from size or motion (italic and serif are hard bans, step 1).
   - Numbers use tabular figures.
   - Statement 88-128 px; secondary 44-56 px; readable UI at least 22 px after camera scale (check `legibility.png`).
   - Look for glyph collisions: a closed word space, a period off the baseline, a cover that lets glyph tops show.
   - Look for faux italics from 3D shear, and text that stays blurred for more than 6 f.
4. **Brand personality and the mark.**
   - Do the family, weights, case, stage, accent and shapes follow from the three adjectives in `TREATMENT.md` (`references/brand-and-color.md` §2)? A calm brand in a heavy grotesk, or a fire-named dev tool on a pale SaaS stage, is a mismatch.
   - Does anything look like the starter or Tessel: the starter's Geist or palette, a red "now" dot, a block-and-accent-dot or dome-and-block mark? That is house-style convergence (D9).
   - Is the mark ownable: it passes the 16 px test, links to the name or the product, and could not belong to ten other startups? Is the resolved lockup 28–45% of the frame's width?
   - **Misread test.** Grab the mark at 64 px (a frame of the lockup scaled down, or `out/stills/`), look for half a second and name it. If the first read is a common symbol (a minus or plus, an emoticon, a menu or "more" icon, a padlock, a play button, ±), it is a **P0** (D12): the fix is new geometry, `references/brand-and-color.md` §4.
   - **Lockup typography.** Do the mark and the name read as one object: the name's stems within about 15% of the mark's stroke, a gap about as wide as the widest space inside the name, a shared baseline? A careless setting is a **P1** (`references/brand-and-color.md` §6, three settings side by side).
5. **Colour and surface.**
   - There is one accent with a stated meaning, used for that meaning only. It covers at most 8% of pixels outside a single flood moment.
   - The accent's family and the stage match the personality in `TREATMENT.md`; the banned palettes and surfaces are step 1.
   - **Default palette (D10).** Framework blue (`#3B82F6` / `#2563EB` / `#1D4ED8`, hue about 260 at high chroma) or flat greys at chroma 0 in `tokens.ts` read as a template: name the token and a value from the brand's world (`references/brand-and-color.md` §9).
   - **Colourless (D11).** On `legibility.png`, a mid-film frame at 480 px should show a brand colour, and the accent should mark the product's action and the payoff. Measure a key beat with `python3 scripts/palette.py --cover <still> --accent '<hex>'`: near 0% on the beat that should carry it is a **P1**.
   - Look for muddy washes that turn ink to grey.
   - Look for banding: `banding.png` from the forensics lens shows it.
6. **Composition.**
   - Flag "text left, UI card right" and centred floating layouts.
   - There is one focal action per shot.
   - Safe margins are at least 96 px at the sides and 64 px top and bottom, with at least 24 px of headroom at maximum punch. Check the `layout-*.json` violations.
   - Look for crops that slice glyphs, voids at the frame edge, and empty UI regions.
   - **Covered text (I8).** Nothing that moves (a chip, card, cursor or the device) passes over text that is being read: check the densest frames of every move and the `covered` issues in `layout-*.json` (movers tagged `data-mover`).
   - **Vertical frames (E8).** In a 9:16 deliverable the content's mass sits in the middle of the safe band (y 270–1500 at 1080 × 1920), the bottom 40% is not bare, text is clear of the feed zones (`feed9x16`) and UI type is at least 32 px (`references/formats.md` §7).
7. **Product truth.** Pause on every UI frame.
   - The proof shows the feature's non-obvious behaviour, not a version any simpler product could show (the specificity test).
   - Data is named, specific and consistent: dates match weekdays, counts match what is shown, labels stay true after things move.
   - Data agrees with the story: the person who acted isn't shown as still owing or pending, totals and stated ratios match the numbers on screen, and no number appears twice in one frame.
   - The UI fills the frame enough to read on a phone (`legibility.png`); no small card floating in empty space.
   - Counters count down during the action, not in one frame afterwards, and every counter, check or total changes on the landing frame of its cause, not a beat later (I3).
   - The feature is named once (a UI label, the one line or the end card) and the product reads as an app: a stranger could say which product and which feature this is (A10).
   - The product changes only the future.
   - One colour means one thing.
   - No cursor appears once the product acts on its own.
   - Flag fake KPIs, lorem ipsum, stock icons and generic dashboards.

## Rules

- When a problem matches a tell in `references/taste-and-slop.md`, start `problem` with its ID (for example `C7:`), so fixes and re-checks can find the catalogue's remedy.
- Each issue names the frame, the exact string or element, and a code-level fix: a token, a data value, a copy entry, a layout constant.
- Do not propose adding text; cutting text is welcome. Do not re-report fixed issues. Rank by impact per minute of fixing.
- Priorities: **P0** is visible on a key beat (hook, payoff, logo, end card), or is a wrong fact or typo anywhere, or is a hard-ban violation anywhere that `BRIEF.md` does not list as brand-supplied. **P1** is noticeable on a normal viewing. **P2** is visible only on pause.

## Return

Return JSON only. `frame` is a number or an `"a-b"` range. `score` is 1 to 10 against top-tier launch films. End `overall` with `rubric: copy=N color=N composition=N product=N`.

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
