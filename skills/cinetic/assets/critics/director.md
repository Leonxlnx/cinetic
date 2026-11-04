# Critic lens: Director (the one review pass)

The default review of a film is this one pass against the checklist below (`references/review-loop.md` §1). Fill every
`{{FIELD}}` and hand the file to a subagent, or follow it yourself with the sheet open before any code. The other
lenses in this folder (forensics, sound-sync, art-copy-ui, detail, verifier) are optional: run them when the user asks
for a deeper review or a gate keeps failing in their area.

## Context

- Film: {{FILM}}, {{SPEC}} (for example `1920x1080@30, 24 s, 112 BPM`). The product in one line: {{PRODUCT}}
- Project root: {{ROOT}}. Read `BRIEF.md`, `film.json` (the devices this film declares and the last three films'),
  the script (`COPY` in `src/timeline.ts`, or `src/launch.ts` in a launch-simple film) after the sheet, not before.
- File under review: {{VIDEO}} (preview or master). Frame = t x {{FPS}}.
- The contact sheet: {{SHEET}} (`node scripts/frames.mjs sheet`, about 30 labelled tiles over the film), and the gate
  reports in {{QA}} (layout-audit placement, forensics seams, grid-check beats, copy-check, film-diff, logos check).
- Round {{ROUND}}. Changed since the last round: {{CHANGED}}. Already fixed, do not re-report: {{FIXED}}

The brief, word for word:

```
{{BRIEF}}
```

## The pass

1. **The picture alone first.** Read the sheet with the words ignored (cover them with a hand, or read only the
   picture beats). For each picture beat write one line: what the product does in it. A beat that reads "nothing
   happens" or "a screen sits there" gets the product acting in it (a click, a result appearing, an object
   transforming) before any word is added. Target: every picture beat reads at least partly, half of them clearly.
2. **Then the checklist.** Every item is a yes or a no with frames. A no is a P0 on the hook, a picture beat's core
   action, the end card or a hard ban; a P1 elsewhere.

### The checklist

1. **Words in the middle.** Every statement centred, in the middle band of the frame (its centre at 35-65 % of the
   height) for 85 % of the statement time or more; none flush left at the top or the bottom; at most one "text on top,
   picture below"; a line beside, above or below a picture at most once per 30 s. (`layout-audit` placement.)
2. **Line, then picture.** At least two type-only beats (a line alone on the clean ground, 0.5-2.3 s); a line over a
   picture on at most 40 % of the beats, and only where it names what the picture is doing; the first line on screen
   by 1 s; each picture beat shows the product doing the thing its line said (input -> output, before -> after)
   without the line repeating the picture's words; a line that says "every" has the many drawn at once; no picture
   cut off or sitting low under a line (it stands behind it, centred, or after it).
3. **One voice, quiet emphasis.** Every line arrives on the film's one text voice (one contrasting hero entry per 30 s
   at most; its word never touching or covering the word before it, the line centred at every frame of its build);
   emphasis on at most two lines, the key word in the accent colour by default; no box, marker,
   pill or underline unless it is the film's one signature, on one line; one-line statements 80 % or more.
4. **Seams that flow.** Every hard cut carries something (the ground kept, a blur at the seam, an anchor held, the
   motion carried and smeared, an object flying over it); no one-frame swap of one scene for another, no move starting
   at full speed; at most two light-dark ground flips, each a declared colour event; at least one exit-then-enter,
   text-swap or match-cut; no seam kind over 45 % of the scene changes. (`forensics.py --seams`.)
5. **Clean UI.** No vertical accent line beside a card, the left edges of stacked rows within 4 px, no text touching an
   asset or a card's edge, inner padding about 2.4 cap heights and even top to bottom (never under 0.8), a status
   dot with the same air as its label, one control changing its label in place (never two stacked), siblings on one
   baseline (a diagram's nodes, an icon on its label's centre line, clear of a divider), real words in every label (no
   bracket slot, no stand-in number, no kit sample), no title cut with "...", nothing flying over readable words.
6. **Marks.** Other products' marks current (`logos.mjs check` passes), one presentation a film (a chip in the line,
   pills round a centred line, or a wall), never a pill on every line. The end card centred, built from the film's last
   element, held 2-3 s, the name and the fact on one centre line to the last frame, the name once, the one fact under
   it; marks bare beside a held line or in it, never a row of app tiles stacked above it. The logo is the brand's own or built from the film's
   last element: never a sparkle, a star or a generic glyph.
7. **Its own film.** Ground family, voice, signature and end card differ from the last three films (`film-diff.mjs`
   passes); nothing reads as the template replayed or as the last film re-skinned.
8. **Words a stranger reads.** 1-5 words a line typically, 2-7 at most, 0.3-1.5 headline words a second; what the
   product is by 3 s in plain words; no slogan, metaphor or keyword pile (`copy-check.py`).
9. **Less text.** No text in 15 % of the frames or more; at most two text blocks on screen at once outside a product-UI
   beat; no floating chips, counters or captions beside a statement; a statement and a dense UI never hold the frame
   together for more than one beat.
10. **The picture tells it.** With the words covered (step 1), every picture beat at least partly says what the product
    does; the first picture beat shows the core action literally, with a real person giving the input where it is
    human (real footage or a photo, `scripts/assets.mjs recipe`).
11. **Colour.** At least one value change a film (the claim on its colour field, a dark beat on a light ground);
    with a colour-field ground family, at least one line sits on the field; the key word in the accent ink, not a box;
    contrast 4.5:1 once a line has settled; no hard edge in the ground's light (a wedge in a corner).
12. **Premium, not just clean.** Depth and motivated light on the ground and the product (a key light, a rim, a contact
    shadow, two planes moving at different rates); hero type at 6-9 % of the frame height (bigger for the claim); the
    one signature move lands; nothing static for more than about 0.8 s outside the end hold. A flat field with small
    type and a still card is a P1 even when every gate passes.
13. **Time.** The run so far against the budget (`film.json` started; 90 minutes is the target, 120 the ceiling): say
    which fix is worth the time left and which is not.

Then name **the weakest 3 seconds** and why, and the **hard bans** you saw (`SKILL.md` "Hard bans"; any hit is a P0
unless `BRIEF.md` lists it as brand-supplied).

## Rules

- At most 10 changes, ranked by impact per minute of fixing. Every change is concrete: the file, the component or
  constant, the values. "Improve the pacing" is not a fix; `CUE.flyIn: b(5,2) -> b(5,1)` is.
- Never propose adding text; do propose cutting a line, rewriting a vague one in plain words, and giving a still picture
  beat the product's own action.
- Images are expensive: read the sheet, and crop or grab single frames (`node scripts/frames.mjs still <f>`) only to
  confirm a finding.
- Do not list what is fine. Do not re-report fixed issues.

## Return

JSON only. `frame` is a frame number or an `"a-b"` range; `item` is the checklist number (or `ban`, `weakest`).

```json
{
  "pictures": [{ "beat": "a1", "frame": "120-260", "reads": "yes | partly | no", "what": "the memo becomes three tasks" }],
  "checklist": { "1": "yes", "2": "no: 1 type-only beat", "3": "yes", "4": "yes", "5": "yes", "6": "yes", "7": "yes",
                 "8": "yes", "9": "yes", "10": "partly", "11": "n/a", "12": "no", "13": "52 min" },
  "issues": [
    { "id": "short-kebab-id", "item": "2", "priority": "P1", "frame": "300-420",
      "problem": "what the viewer sees and why it hurts", "fix": { "file": "src/launch.ts", "change": "the edit, with values" } }
  ],
  "weakest": "frames and why",
  "overall": "3-5 sentences: what is great, what most holds it back",
  "score": 7.5
}
```
