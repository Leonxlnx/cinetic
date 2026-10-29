# Clip match: "make it feel like this clip"

When the user supplies a clip and says "make it like this" or "make it feel like this", the film borrows the clip's
**grammar** (its pace, cut rhythm, curve families, density, camera habits and proportions) and nothing else. The film
keeps its own idea, its own direction, its own devices, its own words, its own colours and its own pictures. The tool
is `scripts/like.py`; the score is `grammar-score.mjs` against the clip's targets; the guard proves the film is not a
recreation.

The clip is used the way cinetic uses everything it carries (its templates, the device book, the type presets, the
house numbers): as a template for structure, grammar, craft and detail level, never as a film to copy. No film is
remade one to one, its shots, layouts or content.

Contents: 1. The rules · 2. Measure · 3. Build inside the direction · 4. Score · 5. The guard · 6. When the user asks
for a copy

## 1. The rules

- **Borrow grammar, never content.** Pace, rhythm, curve families, density, camera habits, ground / ink / accent
  proportions and the blur policy may follow the clip.
- **Never copy** the clip's shots one by one (its shots retold in new words and colours are still its shots), a layout
  frame for frame, any text, a logo, another company's colours (`like.json` records ground tones and proportions, never
  the clip's hues), footage, characters, illustrations or music from the clip.
- **The film keeps its own idea sentence and its own direction** from the deck. The clip shapes the timing and the
  habits inside that direction, never the concept.
- **The guard passes before delivery** (section 5).
- The clip itself stays private: it is never committed, published, cut into the film or shown on screen; `out/` is
  git-ignored.

## 2. Measure

```
python3 scripts/like.py measure <clip> [--out out] [--width 480] [--no-music]
bash scripts/new-film.sh films/x --like <clip>        (measures at scaffold time)
```

It writes `out/like.json` (in `grammar-score.mjs --target` format: the shot band around the clip's median, the spread,
the role mix of the main moves, front-loaded entrances, moves into cuts, density, the hand-over mix, cut sync, the
picture target) and `out/LIKE.md`, the grammar in plain words:

- shot lengths and cut rhythm; cuts on a sound, on a beat and on a downbeat; the tempo;
- camera activity; the curve families of the main moves (front-loaded or symmetric);
- hard, carried, flash, dip and soft hand-overs, and the **picture changes**: the hard cuts plus every new layout made
  without one (a clip that carries its hand-overs changes its picture far more often than it cuts);
- type scale and text share (text read without OCR, confident lines only: a clip of night lights reads as no text,
  and LIKE.md then says to set the type from the direction); density;
- what each picture shows (picture, ui, type or graphic, read from one frame of it: an estimate);
- ground / ink / accent proportions and ground tones; the blur policy.

The outputs name the clip by its hash and length, never its path or file name.

Read `LIKE.md` before the treatment. Write its three or four strongest habits into `TREATMENT.md` under the
direction ("cuts on most downbeats, shots about 0.9 s, every hand-over carried, type at hero size on a third of the
frames"), each as something your film will do in its own world.

## 3. Build inside the direction

Deal the direction as usual (`deck.py`), choose it by the idea, and then let the clip set the tempo and habits:

- pick a track whose tempo sits near the clip's (`references/music.md`); the film's cuts follow its own track;
- set the pace and shot band from `like.json` (keep the picture-change rate with your own hand-overs);
- choose devices that make the same kinds of hand-overs in your direction's world (the device book's
  [cuts and seams](devices/cuts-and-seams.md) and [camera transitions](devices/camera-transitions.md));
- keep the clip's proportions of ground, ink and accent on your own palette.

## 4. Score

```
node scripts/grammar-score.mjs --target out/like.json --cues out/cues.json --layout out/qa/layout-Film.json \
     --look out/qa/look.json --forensics out/qa/forensics.json
```

Each render is scored against the clip's grammar instead of the house grammar; the ship gate's bar is the same
(mean ≥ 80, no dimension under 70, the floors passing). `--print-target` prints the house target for comparison.

## 5. The guard

```
python3 scripts/like.py guard --film out/film.mp4 --clip <clip> --sheet out/qa/like-guard.png [--json out/qa/like-guard.json]
```

It compares frames at the same density (one a second by default, `--every`), each film frame against every clip
frame: a film frame that shares a clip frame's layout (structure overlap ≥ 0.80 with a colour-layout distance ≤ 0.10,
or ≥ 0.90 in any colours) reads as a recreation, so a shot retold in new words and colours fails like a regraded copy.
15 % of the film's frames, or 3 frames in a row, fail it. A film that borrows the grammar in its own layouts sits far
below these numbers. The sheet pairs each film frame with the clip frame it recreates, else its closest layout (red: a
recreation). A failing film changes its layouts (the composition, the framing, the scale of the subject), not its
timing.

## 6. When the user asks for a copy

If the user asks to recreate the clip itself (its layouts, its text, its look shot for shot), say that cinetic borrows
a clip's grammar but does not recreate another film, and offer the grammar route above: the same pace, rhythm,
hand-overs and level of craft, told in the film's own devices, layouts and words. A user's own earlier film is the
exception: its layouts, colours and pictures are theirs, and the guard is then only advisory.
