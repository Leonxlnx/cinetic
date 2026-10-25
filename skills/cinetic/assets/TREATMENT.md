# TREATMENT: <film name>

<!--
The treatment template: copy this file to the project root as TREATMENT.md at Step 1, fill every <…>,
and delete the worked example at the bottom. Method: references/concept-and-story.md.
Copy rules: references/copy-and-type.md. Numbers are defaults, not dogma.
For a loop or a sting (the one-page treatment), fill sections 0, 3, 3b, 5 (2–8 rows), 6 and 7, and tick section 8.
For an update film, the beat sheet follows the direction's update skeleton (hook, change × 2-4, payoff, end): references/update-films.md.
-->

**Spec:** `<W>x<H>@<fps>, <length>s, pace: <calm | crisp>, format: <launch | update | …>, audio: licensed track "<title>" (<licence>) + launch kit, <stop | button | ring> ending` · **Format:** <launch film | update film | product video | feature loop | logo sting | UI walkthrough> · **Engine:** <Remotion | HyperFrames>
**Product:** <what it does, in one line> · **Viewer:** <who watches, and where: feed, landing page, keynote>
**Assumptions:** <anything you inferred rather than were told>
**Supplied:** <brand kit (brand/brand.json) | a clip to feel like (out/LIKE.md: its three or four strongest habits) | footage | none>

## 0. Direction
`<!-- deck.py --seed <n> --direction <id> -->` (paste the line `scripts/deck.py` printed)
- **Direction:** <id and name> · chosen over <the other two> because <one line>
- **World and light:** <space> · <light kind and how it is built> · **Camera:** <the main animator, life inside a shot> · **Cuts:** <the cut grammar>
- **Palette:** <recipe(s) with ground / ink / accent proportions; mapped onto the brand when a kit was supplied> · **Type:** <the dealt settings>
- **Idea sentence:** In this film, <something only this product has> becomes <the device this direction calls for>.
- **Competitor test:** with <nearest competitor> in the sentence it <fails, because …>.
- **Story shape:** <one of the sixteen> · **Signature shot:** <what happens, with three quantities> on beat <#> · **Lockup kind:** <…>
- **Redraws:** <slot: reason> or "none"

## 1. Inventory
| List | Entries |
|---|---|
| Name | <what it means or evokes: etymology, second meanings, the object it names; what mark or device it suggests> |
| Non-obvious behaviour | Unlike the obvious version, it <…>. |
| Value sentence | Before: <…>. After: <…>. |
| Verbs (10) | <literal → abstract> |
| The product's objects | <its rows, cards, readings, states: the things on its screen> |
| The number | <the quantity that changes: from → to> |
| Pain scene | <time, place, what is on screen at the worst moment> |
| Category clichés (banned here) | <the five images every film in this category uses> |
| The world in pictures | <6–12 nouns for imagery: the place, the weather, the materials, the movement, the tools, the archive> |
| World sound | <what the product's world sounds like> |

## 2. Three concepts
| Lens | Logline (≤ 15 words) | Device | Ownership | Deletion | Specificity | Muted | Poster | Score /15 |
|---|---|---|---|---|---|---|---|---|
| (a) Verb made literal | <…> | <…> | <pass/fail: why> | <…> | <true of a simpler product? why not> | <…> | <…> | <…> |
| (b) Pain made visible | <…> | <…> | <…> | <…> | <…> | <…> | <…> | <…> |
| (c) Formal device | <…> | <…> | <…> | <…> | <…> | <…> | <…> | <…> |

**Chosen:** <lens> · **Grafted:** <the one element taken from each other concept, and where it lives>

## 3. Concept
- **Idea (≤ 8 words):** <what the viewer should believe afterwards>
- **Device:** <the one thing carried through every shot, and why it is owned>
- **Grammar:** <the rule the film's form obeys>
- **Logline (≤ 15 words):** <the film as seen>
- **Personality:** <three adjectives> → sans family <…> (+ mono <…>), weights <…>, case <…>, stage <light | dark, neutral | cool>, corners <…>, motion <crisp … unhurried> (`references/brand-and-color.md` §2)
- **Mark:** <the 6–10 directions on the sheet with their scores; the winner and why> (§4 there)
- **Accent:** <hex, OKLCH> means "<one word>", from <red | green | teal | blue | yellow> (checked with `scripts/palette.py`) · **Stage:** <light | dark> · **Luminance plan:** <… → … → …>
- **Signature shot:** <the dealt signature, retold in this film's objects> on beat <#> (once; an echo only inside the lockup)
- **Spring class:** <the one kind of element that springs, or none> · **Curves by role:** arrive <token>, reposition <token>, leave <token>
- **Music:** <track, artist, source, licence (no credit needed | CC BY credit for the post)>, <tempo>, <the entry used for the reveal>, <the break>, <ending: stop | button | ring> · **Kit:** launch, with <swaps from the personality row>
- **Imagery:** <the 3–8 pictures chosen, their source kinds, the grade> or "none: the subject's world is the product UI"

## 3b. Drawn devices
`<!-- pick.py --seed <n> --format <…> --energy <…> -->` (paste the seed line `scripts/pick.py` printed)

| Pick (id) | Family | Beat # (or "whole film") | How it is adapted to this concept and direction |
|---|---|---|---|
| <id> | <family> | <#> | <the recipe, retold in this film's objects> |

One device per beat (about 1.5–2.5 s), from many families; no two neighbouring beats share a family; a device repeats only when it is the film's identity.

**Rerolls and drops:** <id → new id (at most 2 rerolls per pick), or id dropped: why the draw could not serve this concept> or "none". The story, product truth and one consistent UI language come first; a short film carries a few moves done well.

## 4. Arc and device path
- **Arc:** hook <bars> → problem <bars> → turn <bar> → proof <bars> → promise <bars> → lockup <bars, incl. tail>
- **Device path:** <link> → <link> → … → the mark (name each seam by its kind: velocity, morph, mask, whip, defocus, light, snapZoom, breath, zoomThrough, stepped, wipe, hard; at least 40 % carried)

## 5. Beat sheet
Copy is written as fragments (1–4 words), one at a time; a thought of more than 4 words is a chain with its mode. "Picture beat" is what the picture does between two fragments, or "text-free" for a stretch with no copy (`references/copy-and-type.md` §2b).

| # | Bars | Time | Beat | Picture (light, depth, camera) | Beat device (family) | Copy (fragment, mode) | Picture beat | Sound (track event, effect) | Story device |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 0:00–0:02.4 | hook | <frame 0 is composed and moving> | <id (family)> | <"fragment" (build / replace / one fragment) or –> | <what the product does between fragments, or text-free> | <the track's intro; …> | <where it is and what it does> |
| … | | | | | | | | | |

## 6. Copy
| Chain | Fragment | Words | Mode | Beat # | Picture beat before the next fragment | Callback role |
|---|---|---|---|---|---|---|
| <id> | <…> | <n ≤ 4> | <build / replace / –> | <#> | <30–90 f: what happens> | <setup / refrain / payoff / —> |
| **Total** | | **<n> / <budget>** | | | | |

Checks: every fragment ≤ 4 words · ≤ 8 words visible at once (≤ 5 in replace mode) · no thought of 5+ words lands as one block, and no two lines arrive together · every picture beat is a move the picture makes (a cue in `timeline.ts`), after the earlier fragment has been read · copy on ≤ about 65% of the runtime, with ≥ 1.5 s text-free in every 10 s · no stock phrasing · every line passes the line test.

## 7. Final frame (the poster)
<Describe it as a still: stage, mark, wordmark, any URL, positions, the camera scale reached by the push. It must contain the mark and the name.>

## 8. Gate
- [ ] logline ≤ 15 words, with no "and" joining two ideas
- [ ] the chosen concept passes ownership, deletion and specificity, with reasons written in §2; the proof shows the non-obvious behaviour
- [ ] word total within budget; every fragment ≤ 4 words; ≤ 8 words visible at once (≤ 5 in replace mode); every longer thought is a chain with a picture beat between its fragments (30–90 f after the read, with a cue in it); copy on ≤ about 65% of the runtime
- [ ] the device appears in every beat row, and its last link is the mark
- [ ] every drawn device is placed in §3b (a beat row, or the whole film for colour, texture and pacing picks) or dropped, and every reroll or drop has a written reason; one device per beat, no neighbouring beats from one family
- [ ] the Direction block is filled: the idea sentence passes the competitor test; the signature shot sits on one beat; the beats follow the dealt skeleton; the lockup is the dealt kind
- [ ] the music is chosen and recorded (`track.py add` with `--seen-quote`), and the beat sheet's structure sits on the track's events
- [ ] the final frame contains the mark and the name
- [ ] nothing here breaks a hard ban (`SKILL.md`): no eyebrow, stacked tagline, "Introducing…", sentence dumped at once or filler text; no overshoot or per-letter trick on copy; a sans; one dominant accent over neutral grounds; light, glow, spectral colour and glass only inside devices; no emoji or effects; one spring class; a licensed track, no credits on screen. Brand-supplied exceptions are listed in `BRIEF.md`

---

# Example: Plumb (fictional; delete this section in your copy)

**Spec:** `1920x1080@60, 31s, pace: calm, format: launch, audio: licensed track (no-credit licence, 100 BPM) + launch kit, stop ending` · **Format:** launch film · **Engine:** Remotion
**Product:** code review that finds the few lines in a huge pull request that can break production · **Viewer:** engineers and their leads, muted in a feed first
**Assumptions:** no brand supplied, so name, mark and palette are invented; calm pace (the brand is calm and the brief asks for no energy); the track runs at 100 BPM, so 1 bar = 2.4 s = 144 f; 13 bars, with the tail inside the last bar.
**Supplied:** none.

## 0. Direction
- **Direction:** a one-take descent through one surface · chosen over a lit relief and a collage because a review is a descent through a diff, and one unbroken fall carries the name
- **World and light:** layered 2.5D, the diff as one long surface · a travelling pool of light that follows the bob, plus the raking key on the flagged line · **Camera:** one take, descending; creep on every hold · **Cuts:** none until the lockup; every change hides in the camera
- **Palette:** slate ground (mid slate, neutral), paper type, one accent · **Type:** a calm grotesk at line size, mono for the diff
- **Idea sentence:** In this film, the three lines out of 2,184 that can break production become the three places a falling plumb bob stops.
- **Competitor test:** with a linter in the sentence it fails: a linter stops on every warning, not on three.
- **Story shape:** detail to whole · **Signature shot:** the bob falls 1,900 px through the scrolling diff in 52 f and stops dead on line 1,284, a 6 % squash, the gutter turning yellow, on beat 5 · **Lockup kind:** the device becomes the mark
- **Redraws:** none

## 1. Inventory
| List | Entries |
|---|---|
| Name | a plumb line: a weight on a string that finds true vertical; "to plumb the depths". It hands us the bob as device and mark |
| Non-obvious behaviour | Unlike a linter that flags every line, it ranks the 2,184 changed lines by what can break production and surfaces the three that matter |
| Value sentence | Before: 2,184 changed lines, approved in 40 seconds. After: the three that matter, read first. |
| Verbs | drop, sound, weigh, stop, point, flag, settle, read, trust, approve |
| The product's objects | diff line, gutter, line number, review box, Approve button, the gutter marker on a flagged line |
| The number | 2,184 → 3 |
| Pain scene | 6:40 p.m., a huge pull request, a tired "Looks good to me." |
| Category clichés | green-on-black terminal, code rain, bug icons, shields, rockets |
| The world in pictures | none needed: the diff is the world (a code-only world is right when the product's world is its screen) |
| World sound | a tick per line scrolled; a weight landing on wood |

## 2. Three concepts
| Lens | Logline | Device | Ownership | Deletion | Specificity | Muted | Poster | Score |
|---|---|---|---|---|---|---|---|---|
| (a) | A steel plumb bob drops through a 2,184-line diff and stops on the bug. | the bob | pass: the bob is the name | pass | pass: it stops on three lines, not on every warning | pass | pass | 13 |
| (b) | A tired reviewer approves 2,184 lines in 40 s; the blur hides an outage. | the blur | fail: any review tool could run it | pass | fail: a linter could claim it | weak | fail | 7 |
| (c) | One unbroken descent through one diff, stopping only three times. | the camera | pass | pass | pass | pass | weak | 11 |

**Chosen:** (a) · **Grafted:** from (c), the grammar: the film is one vertical descent. From (b), the setup line "Looks good to me.", repeated word for word at the end, when it has become true.

## 3. Concept
- **Idea:** Plumb finds the lines that matter.
- **Device:** the steel bob. It is the name made physical, and in the UI it is the gutter marker on a flagged line.
- **Grammar:** everything moves vertically, under gravity, until the lockup; the wordmark's slide is the film's only horizontal move.
- **Logline:** A steel plumb bob drops through a 2,184-line diff and stops on the bug. (14 words)
- **Personality:** exact, calm, weighty → `schibsted-grotesk` at 600 / −0.035 em for display and `jetbrains-mono` for the diff, lowercase wordmark, a dark neutral stage, square corners, motion that falls under gravity and stops dead.
- **Mark:** eight directions (a weighted string, a "p" whose bowl is the bob, a gutter marker, a ruler, a descending line of dots, a stacked-diff block…); the bob that comes to a point won on name link and at 16 px, and the file-block directions failed the house-cliché test.
- **Accent:** `#EBD235`, OKLCH 0.86 0.165 100, means "look here", the safety yellow on a builder's level (yellow family; `palette.py` passes it on ink) · **Stage:** dark (the yellow is 12.7:1 on ink and only 1.4:1 on paper) · **Luminance plan:** ink throughout, no flood; the turn is carried by silence and the drop.
- **Signature shot:** the first drop-and-stop (a leave curve into a dead stop with a contact squash) on beat 5; the later drops are smaller echoes, and the lockup's drop is the mark's.
- **Spring class:** none (the bob stops dead) · **Curves by role:** arrive `glideOut`, reposition `strongInOut` for the descent and pull-back, leave `buildIn` into each stop.
- **Music:** a licensed calm instrumental at 100 BPM from a no-credit library, its intro under the hook, its own stop before bar 5, its entry on the stop, its break under the pull-back, a `stop` ending · **Kit:** launch, with a low wooden knock (tuned to the track's key) as the landing role.
- **Imagery:** none: the subject's world is the diff.

## 4. Arc and device path
- **Arc:** hook 1 → problem 2–3 → turn 4–5 → proof 6–9 → promise 10–11 → lockup 12–13.
- **Device path:** hangs at the top-right edge (hook) → sways as the scroll brakes → trembles with each keystroke → falls (relay into the one-take descent) → stops as the gutter marker on line 1,284 → lifts and drops twice more → the third mark in the pulled-back column → hangs beside Approve → drops into the mark's bob slot (drop-and-stop).

## 5. Beat sheet
| # | Bars | Time | Beat | Picture | Copy (fragment, mode) | Picture beat | Sound | Device |
|---|---|---|---|---|---|---|---|---|
| 1 | 1 | 0:00–0:02.4 | hook | frame 0: a diff streaming upward at speed, lines smeared, line numbers racing | rush into a brake (speed and rush) | – | text-free: the scroll carries the hook | the track's intro; a soft tick every 100 lines | hangs at the top-right edge, swaying 2° |
| 2 | 2 | 0:02.4–0:04.8 | problem | the scroll brakes at the end of the file; the count lands oversized and settles | oversized landing (type arrivals) | "2,184 lines." (one fragment) | the braking scroll comes first | ticks slow with the scroll | sways as the scroll brakes |
| 3 | 3 | 0:04.8–0:07.2 | problem | the review box; typed at the human rate, then held; the cursor drifts to Approve | typing, human (UI choreography) | "Looks good to me." (one fragment, typed) | the cursor's slow drift after the last key | key tocks over the bed | its line trembles on each keystroke |
| 4 | 4 | 0:07.2–0:09.6 | turn | before the click, the bob drops; the camera follows down in one take | the fall (camera) | – | text-free: the fall | the track's own stop: 0.3 s of near-silence | falls, accelerating on a leave curve |
| 5 | 5 | 0:09.6–0:12.0 | turn | the signature shot: a dead stop on line 1,284 with a squash; that line's gutter turns yellow, the raking key finds it, everything above dims | the signature shot | – | text-free: the stop | the track's entry on the stop; the tuned knock | at rest in the gutter |
| 6 | 6–7 | 0:12.0–0:16.8 | proof | `if (retries = 0)`; a note unrolls downward from the flagged line; then the fix replaces `=` with `===` in place | edit in place (lines, layout and swaps) | UI note, replace chain: "Assigns, not compares." → "Retries never run." | between the two, the highlight slides to the retry loop below, which greys out; after the second, the fix types in | two UI clicks over the bed | holds the line; the note hangs from it |
| 7 | 8–9 | 0:16.8–0:21.6 | proof | the descent continues; two more drops on the track's accents (a missing await, an unbounded query); counter "3 of 2,184" | a counter that counts like software (data and numbers) | "Three that matter." (one fragment) | the two drops land first, with no text | two knocks in the track's key | drops twice |
| 8 | 10 | 0:21.6–0:24.0 | promise | pull back in log space to the whole diff as a tall grey column; three yellow marks are its only colour; the light pool widens | reversal into the pull (camera) | – | text-free: the pull-back | the track's break | at the third mark |
| 9 | 11 | 0:24.0–0:26.4 | promise | the camera rises (its only upward move) to the review box; typed again; Approve clicks on the downbeat of bar 12 | press: squeeze, hold, snap home (micro-interactions) | "Looks good to me." (one fragment, typed) | the rise to the box comes first | the bar-3 keys again; the click on the track's entry is the payoff | beside the Approve button |
| 10 | 12–13 | 0:26.4–0:31.2 | lockup | the string draws down from the top of frame; the bob drops into its place at the string's end; the wordmark slides out from behind the bob; creep 1 → 1.04 in the end lock; resolved from 0:28, tail from 0:30 | the wordmark slides out of the mark (logo and end card) | "plumb" (wordmark) | the bob's drop before the name | the track stops on the bar line; one knock on the wordmark; the tail decays to digital silence | becomes the mark's bob |

## 6. Copy
| Chain | Fragment | Words | Mode | Beat # | Picture beat before the next fragment | Callback role |
|---|---|---|---|---|---|---|
| – | 2,184 lines. | 2 | one fragment | 2 | – | setup (the number) |
| – | Looks good to me. | 4 | one fragment, typed | 3 | – | setup (a tired lie) |
| note | Assigns, not compares. | 3 | replace (a UI note, 46 px after camera scale) | 6 | 50 f: the highlight slides to the retry loop, which greys out | – |
| note | Retries never run. | 3 | replace | 6 | then the fix types in place | – |
| – | Three that matter. | 3 | one fragment | 7 | – | pays off the number |
| – | Looks good to me. | 4 | one fragment, typed | 9 | – | payoff: the same words, now true |
| – | plumb | 1 | wordmark | 10 | – | wordmark |
| **Total** | | **20 / 25** | | | | |

The first draft set the UI note as one 7-word, two-line block held 1.5 s ("Assigns instead of compares. / Retries never run."): a sentence dump on the proof beat. As a replace chain each half is read alone, and the picture between them shows what the second half says.

## 7. Final frame (the poster)
The slate stage under the travelling pool of light. The mark (the string and the steel bob that comes to a point, both in the paper token) sits left of the lowercase wordmark "plumb", set in Schibsted Grotesk at 600 / −0.035 em, a little left of centre on an eye line at y ≈ 520. The lockup spans about 38% of the frame's width, at 1.04× the scale it had when it resolved, the bob casting a short shadow from the key. Nothing else is in frame.

## 8. Gate
- [x] logline 14 words, one idea
- [x] ownership, deletion and specificity pass (it ranks and surfaces three lines; a linter would flag them all): delete the proofs (bars 6–9) and the drop plus the second "Looks good to me." still say "it found the problem before approval"; delete the value beats (bars 2–5, 11) and three code fixes with no stakes remain, a tour
- [x] 20 words of a 25-word budget; no fragment over 4 words (the UI note is a 3 + 3 replace chain); at most 4 words of copy visible at once; copy on about half the runtime, with text-free stretches at bars 1, 4–5 and 10
- [x] the device is in every row and ends as the mark (or, in a loop or product video, as the product's finished unit)
- [x] the final frame contains the mark and the name
- [x] the Direction block is filled; the idea sentence fails with a linter in it; the signature shot is beat 5 only; the lockup is the dealt kind; one device per beat from nine families
- [x] the track is recorded with its licence quote; its stop and entry carry the turn, its break the pull-back, its stop the lockup
- [x] no hard ban: one sans and a mono, a yellow accent over a neutral slate stage, a steel bob rather than brass, light only as the pool and the key; the bob stops dead with a contact squash and nothing in the film overshoots
