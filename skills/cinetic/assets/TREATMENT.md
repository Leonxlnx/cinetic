# TREATMENT: <film name>

<!--
The treatment template: copy this file to the project root as TREATMENT.md at Step 1, fill every <…>,
and delete the worked example at the bottom. Method: references/concept-and-story.md.
Copy rules: references/copy-and-type.md. Numbers are defaults, not dogma.
For a loop or a sting (the one-page treatment), fill sections 3, 5 (2–8 rows), 6 and 7, and tick section 8.
-->

**Spec:** `<W>x<H>@<fps>, <length>s, <BPM>BPM, audio: <synthesized | none>` · **Format:** <launch film | product video | feature loop | logo sting | UI walkthrough> · **Engine:** <Remotion | HyperFrames>
**Product:** <what it does, in one line> · **Viewer:** <who watches, and where: feed, landing page, keynote>
**Assumptions:** <anything you inferred rather than were told>

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
- **Personality:** <three adjectives> → family <…>, weights <…>, case <…>, stage <light | dark, cool | warm>, corners <…>, motion <crisp … unhurried> (`references/brand-and-color.md` §2)
- **Mark:** <the 6–10 directions on the sheet with their scores; the winner and why> (§4 there)
- **Accent:** <hex, OKLCH> means "<one word>" · **Stage:** <light | dark> · **Luminance plan:** <… → … → …>
- **Signature move:** <a move derived from the mark> at <open, middle, close>
- **Easing characters (about 3):** <tokens from src/lib/anim.ts, each with its job>
- **Sonic signature:** <one tuned sound that opens and closes the film>

## 4. Arc and device path
- **Arc:** hook <bars> → problem <bars> → turn <bar> → proof <bars> → promise <bars> → lockup <bars, incl. tail>
- **Device path:** <link> → <link> → … → the mark (name each seam: relay, morph, flood, drop, …)

## 5. Beat sheet
| # | Bars | Time | Beat | Picture | Copy (words) | Sound | Device |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 0:00–0:02 | hook | <frame 0 is composed and moving> | <…> | <…> | <where it is and what it does> |
| … | | | | | | | |

## 6. Copy
| Line | Words | Where | Callback role |
|---|---|---|---|
| <…> | <n> | <beat #> | <setup / refrain / payoff / —> |
| **Total** | **<n> / <budget>** | | |

Checks: ≤ 5 words per line · ≤ 2 lines per shot · no stock phrasing · every line passes the line test.

## 7. Final frame (the poster)
<Describe it as a still: stage, mark, wordmark, any URL, positions, the camera scale reached by the push. It must contain the mark and the name.>

## 8. Gate
- [ ] logline ≤ 15 words, with no "and" joining two ideas
- [ ] the chosen concept passes ownership, deletion and specificity, with reasons written in §2; the proof shows the non-obvious behaviour
- [ ] word total within budget; ≤ 5 words per line; ≤ 2 lines per shot
- [ ] the device appears in every beat row, and its last link is the mark
- [ ] the final frame contains the mark and the name

---

# Example: Plumb (fictional; delete this section in your copy)

**Spec:** `1920x1080@60, 30s, 120BPM, audio: synthesized` · **Format:** launch film · **Engine:** Remotion
**Product:** code review that finds the few lines in a huge pull request that can break production · **Viewer:** engineers and their leads, muted in a feed first
**Assumptions:** no brand supplied, so name, mark and palette are invented; 1 bar = 2 s = 120 f; 15 bars, with the tail inside the last bar.

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
| World sound | a tick per line scrolled; a weight landing on wood |

## 2. Three concepts
| Lens | Logline | Device | Ownership | Deletion | Specificity | Muted | Poster | Score |
|---|---|---|---|---|---|---|---|---|
| (a) | A brass plumb bob drops through a 2,184-line diff and stops on the bug. | the bob | pass: the bob is the name | pass | pass: it stops on three lines, not on every warning | pass | pass | 13 |
| (b) | A tired reviewer approves 2,184 lines in 40 s; the blur hides an outage. | the blur | fail: any review tool could run it | pass | fail: a linter could claim it | weak | fail | 7 |
| (c) | One unbroken descent through one diff, stopping only three times. | the camera | pass | pass | pass | pass | weak | 11 |

**Chosen:** (a) · **Grafted:** from (c), the grammar: the film is one vertical descent. From (b), the setup line "Looks good to me.", repeated word for word at the end, when it has become true.

## 3. Concept
- **Idea:** Plumb finds the lines that matter.
- **Device:** the brass bob. It is the name made physical, and in the UI it is the gutter marker on a flagged line.
- **Grammar:** everything moves vertically, under gravity, until the lockup; the wordmark's slide is the film's only horizontal move.
- **Logline:** A brass plumb bob drops through a 2,184-line diff and stops on the bug. (14 words)
- **Personality:** exact, calm, weighty → `schibsted-grotesk` at 600 / −0.035 em for display and `jetbrains-mono` for the diff, lowercase wordmark, a dark stage, square corners, motion that falls under gravity and stops dead.
- **Mark:** eight directions (a weighted string, a "p" whose bowl is the bob, a gutter marker, a ruler, a descending line of dots, a stacked-diff block…); the bob that comes to a point won on name link and at 16 px, and the file-block directions failed the house-cliché test.
- **Accent:** `#DBB155`, OKLCH 0.78 0.12 85, means "look here" · **Stage:** dark (brass is only 1.9:1 on paper) · **Luminance plan:** ink throughout, no flood; the turn is carried by silence and the drop.
- **Signature move:** drop-and-stop (`E.contact` into a dead stop with a contact squash) at the turn (bar 5), the second proof (bars 8–9) and the lockup (bar 13).
- **Easing characters:** `contact` for falls, `cam` for the descent and pull-back, `smooth` for dims and fades.
- **Sonic signature:** a low wooden knock tuned to the tonic when the bob lands; first at the turn, last in the lockup.

## 4. Arc and device path
- **Arc:** hook 1 → problem 2–3 → turn 4–5 → proof 6–9 → promise 10–12 → lockup 13–15.
- **Device path:** hangs at the top-right edge (hook) → sways as the scroll brakes → trembles with each keystroke → falls (relay into the one-take descent) → stops as the gutter marker on line 1,284 → lifts and drops twice more → the third mark in the pulled-back column → hangs beside Approve → drops into the mark's bob slot (drop-and-stop).

## 5. Beat sheet
| # | Bars | Time | Beat | Picture | Copy | Sound | Device |
|---|---|---|---|---|---|---|---|
| 1 | 1 | 0:00–0:02 | hook | frame 0: a diff streaming upward at speed, lines smeared, line numbers racing | – | pluck ostinato, a soft tick every 100 lines | hangs at the top-right edge, swaying 2° |
| 2 | 2 | 0:02–0:04 | problem | the scroll brakes at the end of the file; slam | "2,184 lines." (2) | ticks slow with the scroll; bass enters | sways as the scroll brakes |
| 3 | 3 | 0:04–0:06 | problem | the review box; typed; the cursor drifts to Approve | "Looks good to me." (4) | key clicks; the V chord hangs | its line trembles on each keystroke |
| 4 | 4 | 0:06–0:08 | turn | before the click, the bob drops; the camera follows down in one take | – | the line pays out as a falling pitch, then a suck into 15 f of silence | falls, accelerating on `E.contact` |
| 5 | 5 | 0:08–0:10 | turn | a dead stop on line 1,284 with a squash; that line turns brass, everything above dims | – | the drop: the tuned knock plus the full kit | at rest in the gutter |
| 6 | 6–7 | 0:10–0:14 | proof | `if (retries = 0)`; a note unrolls downward from the flagged line; the fix replaces `=` with `===` in place; held 1.5 s | "Assigns instead of compares. Retries never run." (7) | two UI clicks; the chord resolves | holds the line; the note hangs from it |
| 7 | 8–9 | 0:14–0:18 | proof | the descent continues; two more drops on the downbeats (a missing await, an unbounded query); counter "3 of 2,184" | "Three that matter." (3) | two knocks on rising chord tones | drops twice |
| 8 | 10–11 | 0:18–0:22 | promise | pull back in log space to the whole diff as a tall grey column; three brass marks are its only colour | – | pads open, hats drop out | at the third mark |
| 9 | 12 | 0:22–0:24 | promise | the camera rises (its only upward move) to the review box; typed again; Approve clicks on the downbeat of bar 13 | "Looks good to me." (4) | the bar-3 clicks again, now resolving to the tonic; the click is the payoff hit | beside the Approve button |
| 10 | 13–15 | 0:24–0:30 | lockup | the string draws down from the top of frame; the bob drops into its place at the string's end; the wordmark slides out from behind the bob; push 1 → 1.15; resolved from 0:26, tail from 0:28 | "plumb" (1) | the last knock rings; the tail decays to digital silence | becomes the mark's bob |

## 6. Copy
| Line | Words | Where | Callback role |
|---|---|---|---|
| 2,184 lines. | 2 | 2 | setup (the number) |
| Looks good to me. | 4 | 3 | setup (a tired lie) |
| Assigns instead of compares. / Retries never run. | 7 | 6 | UI note on two lines (4 + 3), 28 px after camera scale |
| Three that matter. | 3 | 7 | pays off the number |
| Looks good to me. | 4 | 9 | payoff: the same words, now true |
| plumb | 1 | 10 | wordmark |
| **Total** | **21 / 35** | | |

## 7. Final frame (the poster)
The ink stage. The mark (the string and the brass bob that comes to a point) sits left of the lowercase wordmark "plumb", set in Schibsted Grotesk at 600 / −0.035 em. The lockup spans about 38% of the frame's width, centred on an eye line at y ≈ 520, at 1.15× the scale it had when it resolved. Nothing else is in frame.

## 8. Gate
- [x] logline 14 words, one idea
- [x] ownership, deletion and specificity pass (it ranks and surfaces three lines; a linter would flag them all): delete the proofs (bars 6–9) and the drop plus the second "Looks good to me." still say "it found the problem before approval"; delete the value beats (2–5, 12) and three code fixes with no stakes remain, a tour
- [x] 21 words of a 35-word budget; ≤ 5 words per line (the UI note sets as 4 + 3); ≤ 2 lines per shot
- [x] the device is in every row and ends as the mark (or, in a loop or product video, as the product's finished unit)
- [x] the final frame contains the mark and the name
