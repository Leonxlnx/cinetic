# Recorded sound: finding, licensing and placing music and effects

Covers the default soundtrack of a cinetic film: a produced music track and recorded effects, found online for each film, free to use, then edited, levelled and placed on the picture by `scripts/audio/score.py`. Read it at Step 3 (the track sets the tempo) and again at Step 5. `references/sound.md` still decides what the sound must do (how many effects, how loud, the arc, the mix, the gates); this file covers where the sounds come from and how they get into `audio/score.json`.

## Contents
1. [Recorded or synthesized](#1-recorded-or-synthesized)
2. [The workflow](#2-the-workflow)
3. [Licences](#3-licences)
4. [Where to look](#4-where-to-look)
5. [Choosing the music](#5-choosing-the-music)
6. [Editing the track to the picture](#6-editing-the-track-to-the-picture)
7. [Choosing the effects](#7-choosing-the-effects)
8. [score.json: bed and samples](#8-scorejson-bed-and-samples)
9. [The licence record](#9-the-licence-record)
10. [Failure modes](#10-failure-modes)

## 1. Recorded or synthesized

- **Recorded is the default.** A produced track and real recorded effects read as finished work. Pick them with the same restraint the norms ask of any sound (`references/sound.md` §12, §13): the files change, the rules do not.
- **The synth stays** (`references/sound.md` §7) for: no web access, or no free file that fits after a real search (fall back and say so in the delivery note); a brief that asks for generated or tuned sound; the signature tick/tock clock; and as a quiet layer under a recorded bed when the brand needs its own motif.
- **Mixing is fine, per kind.** A recorded bed with the synth's signature tick, or synth music with recorded impacts. Within one kind, one source: every `pop` from the same take set, every click the same voice.
- **What you cannot hear, measure.** Most agents cannot listen. Choose by the source's description and tags, the waveform, the duration and the numbers `track-info.py` and `score.py` print, then tell the user which file you chose and name the runner-up, so they can audition and swap it.

## 2. The workflow

1. **Step 1–2:** pick the personality row (`references/sound.md` §5.5a) and turn it into search terms (§5, §7).
2. **Step 3, before you set the BPM:** find 3–5 candidate tracks, check each licence (§3), download the best two into `audio/music/`, and measure them:
   ```bash
   python3 scripts/audio/track-info.py audio/music/<file> --json out/qa/track.json
   ```
   Keep the one whose tempo, entries, breaks and length fit the beat sheet, and set `BPM` in `src/timeline.ts` from its tempo (§6). Note the track in `TREATMENT.md` with the personality row.
3. **Step 4:** build the picture on the track's bars. After `export-cues.ts`, list the event kinds the film sounds (`out/cues.json`, or the `by_kind` line of the last score report). That list is the shopping list for the effects (§7).
4. **Step 5:** download the effects into `audio/sfx/`, write every file into `audio/SOURCES.md` (§9), fill `bed` and `samples` in `audio/score.json` (§8), run `npm run audio`, and read the report: `recorded`, `masked`, `sfx_levels`, `typing`, the payoff and the LRA. Fix with `gain_db`, another take or another edit point, never by mastering louder.
5. **Step 8:** copy `audio/SOURCES.md` into `out/deliver/`, and put any credit line a licence asks for (§3) into the delivery note, ready to paste under the post.

## 3. Licences

Use a file only when you may put it in a commercial film for free, and you can name its licence.

| OK | Not OK |
|---|---|
| CC0 and public domain | NC (non-commercial): a launch or product film is commercial |
| Pixabay Content License (Pixabay music and sound effects) | ND (no derivatives): putting music under picture counts as adapting it |
| Mixkit's free licence (music and sound effects) | "Free for personal use", "for streaming only", or a licence you cannot find |
| CC BY: allowed, with the credit line it asks for (§9) | "No copyright music" re-uploads on YouTube and other files of unknown origin |

- **Read the licence on the item's own page when you download it.** Licences change, and on aggregator sites they differ from item to item. Write it into `audio/SOURCES.md` at once.
- **Content ID.** Some free tracks are registered with YouTube's Content ID (Pixabay says so on the track's page). For a film headed to YouTube, prefer a track without it, or tell the user before delivery.
- **Never redistribute the raw files.** They stay in the film project's `audio/` folder: never in the skill, a template, a shared repo or a package. Pixabay and Mixkit both forbid passing their files on as they are; using them in a finished film is what they allow.
- **Downloads you may not make.** Download only what opens without an account. When the best file sits behind a login, a captcha, a cart or a "verify you are human" page, give the user the link and the file name and ask them to put the file in `audio/`. Never create an account, sign in, solve a captcha or work around a download gate.

## 4. Where to look

Check each item's licence on its page; this table only says what each source is good for.

| Source | Good for | Licence (typical) | Access |
|---|---|---|---|
| Pixabay Music (`pixabay.com/music`) | the widest pool of produced tracks: electronic, cinematic, ambient, corporate; filters for genre, mood and length | Pixabay Content License | direct download |
| Pixabay Sound Effects (`pixabay.com/sound-effects`) | whooshes, impacts, risers, UI clicks and pops, typing | Pixabay Content License | direct download |
| Mixkit (`mixkit.co/free-stock-music`, `mixkit.co/free-sound-effects`) | a smaller, curated pool: clean UI sounds, transitions, short tracks | Mixkit free licence | direct download |
| Kenney (`kenney.nl/assets`, the audio packs) | clean interface clicks, pops, confirmations and impacts in one consistent set | CC0 | direct zip |
| Freesound (`freesound.org`) | the deepest pool of single effects; filter the search to CC0 or CC BY | per sound | needs a free account: ask the user |
| Free Music Archive (`freemusicarchive.org`) | independent tracks | per track: skip NC and ND | per track |
| Sonniss GDC game audio bundles (`sonniss.com`) | professional effect libraries in large zips | royalty-free (read the bundle's terms) | large downloads: ask the user |

Preference: for music, Pixabay, then Mixkit, then Free Music Archive. For effects, Pixabay and Mixkit, Kenney for interface sounds, then Freesound or Sonniss through the user. A file the user supplies, or a library they own, always wins.

## 5. Choosing the music

**Shape before style.** The track has to carry the measured arc (`references/sound.md` §5.3, §13):
- a soft entry, or an intro you can cut;
- a clear entry (a drop, the beat or the bass arriving) to land on the hero reveal at 30–60% of the runtime;
- a breakdown or stop for the mid-film dip, about 5 LU down;
- an ending, or a clean bar line to stop on as the logo forms.

`track-info.py` lists the entries and breaks: a track with none of either cannot carry a launch film.

**Tempo.** 115–130 BPM (or half-time) for launch films, 80–100 for calm brands, and a beat on whole frames (§6).

**Production.** A modern, finished mix with real low end, instrumental, and the full song (1.5–3 min), not a 30 s preview. No vocal tag, watermark, spoken intro or fade-in longer than a bar.

**Search terms by personality** (the rows of `references/sound.md` §5.5a):

| Personality | Search | Avoid |
|---|---|---|
| Calm, literary, unhurried | minimal piano ambient, soft electronic, felt piano | beats with hats, risers, booms |
| Fast, exact, confident | minimal tech house, modern technology, future garage, deep house minimal | ukulele, whistling, stomp-and-clap |
| Bright, friendly | upbeat electronic pop instrumental, marimba pop, feel-good indie electronic | children's jingles, kazoo |
| Precise, expensive | cinematic minimal, ambient pulse, modern classical electronic | trailer braams, epic orchestral |
| Raw, mechanical | glitch, industrial minimal, percussive electronic | dubstep drops, heavy distortion |
| Warm, kind | acoustic electronic, warm lofi, soft guitar pulse | vinyl crackle that buries the effects |

**Avoid in any film:** generic corporate stock ("inspiring corporate", happy ukulele), trailer hits and braams on a product film, EDM build-ups with vocal chops, and any track famous enough to be recognised.

**Shortlist, then measure.** Read the titles, tags and descriptions; check the duration and waveform; download two; run `track-info.py` on both. Choose on tempo fit, an entry where the drop goes, a break where the dip goes, and enough length for the edit.

## 6. Editing the track to the picture

**Tempo.** The film's BPM equals the track's tempo, or half or double it. `track-info.py --bpm <film BPM>` checks this and exits 2 when it does not fit. A beat must also be a whole number of frames (`references/timing-grid.md` §2). If the track's tempo is not a whole-frame tempo, do one of two things:
- **Stretch the track** by up to 3% to the nearest whole-frame tempo, then measure the new file:
  ```bash
  ffmpeg -i audio/music/track.mp3 -filter:a "atempo=120/123" -ar 48000 audio/music/track-120.wav
  python3 scripts/audio/track-info.py audio/music/track-120.wav --bpm 120
  ```
- **Or keep 60 fps** and snap the cues to the real beat times, as `references/timing-grid.md` §2 describes for supplied music.

**Bar 1 on a downbeat.** The film's bar 1 starts on a downbeat of the track: a first segment's `"from"` is a downbeat time (`first_downbeat` or any of `bar_starts`).

**The drop on the hero reveal.**
```bash
python3 scripts/audio/track-info.py audio/music/<file> --cues out/cues.json --land-at @drop --bpm 120
```
This prints two `bed` values:
- one segment that lands the track's biggest entry on the cue;
- an edit that plays the track from its first downbeat and cuts, on the cue's bar line, to the entry, so a long intro never has to play out.

**Edits.** Cut on bar lines on both sides, never mid-phrase, and only between parts in the same key. A cut into a louder section on the hero frame is the norm. Two or three segments are plenty for a 30 s film.

**Silences and the suck.** `drops` and `silences` in `score.json` act on the music bus, the bed included. An eighth or a quarter of a bar of true silence before the drop works on a recorded track exactly as it does on the synth.

**The mid-film dip.** Prefer a break in the track itself. Otherwise a `"hold"` section dips the bed without adding any synth: `{"bars": [9, 10], "style": "hold", "level": 0.6}` is about 4.4 dB down for two bars.

**The ending.** Stop the bed on the lockup's bar line (`"to"` with `"fade_out": 0.3`–`0.8`), or land the track's own last bar there. Then add one soft resolved element on the wordmark's settle (a chime take on `bell` with `variant: "motif"`, or the synth motif) and the tail (`master.fade`).

**Ducks.** The ducks under hits, the dip under typing and the sidechain all apply to the bed as they do to the synth.

## 7. Choosing the effects

**One palette.** Choose the material of the film's effects once, from the personality row and the track: soft wood and felt, clean digital, or dry mechanical. Then pick every take from it. A recorded take that is brighter, wetter or bigger than the rest reads as a library sound dropped in.

**The shopping list.** One take per sounded kind, and 2–4 takes for kinds that repeat in quick runs (`key`, `pop`, crisp `tick`), so no take plays twice in a row. The UI click is one take for the whole film. Kinds the film does not use need nothing.

| Kind (variant) | Search | Pick | `align`, `root` |
|---|---|---|---|
| `key` | mechanical keyboard single key, keyboard thock | dark and short: no ring, decays in under 10 ms, nothing clacky; cut 4–8 single presses from one recording | onset |
| `click` | mouse click, soft UI click, button click | one bright, very short voice (−20 dB in 6–15 ms); no ping or tail | onset |
| `tick` (`crisp`) | UI tick, short tick, counter tick | tiny and untuned; 3–4 takes | onset |
| `tick`, `tock` (the clock) | wood block, clock tick | usually keep the synth's tuned pair; a wood-block pair works with `root` | onset, root |
| `pop` | soft pop, UI pop, short pluck | rounded, pitched, 30–60 ms; 2 takes | onset, root |
| `snap` | lock snap, latch click, magnetic snap | a crisp contact with a little body | onset |
| `land` | soft thud, wood knock, card on table | dull and short; heavy landings with low end | onset |
| `hit` | deep cinematic impact, warm boom | sub-heavy, no crash or metal; a tail of 0.3–1.3 s | onset or peak |
| `drop` | sub drop, bass impact | often none: let the track's own entry carry the drop, and keep a sub only if that entry lacks low end | onset |
| `whoosh` | soft whoosh, air swoosh, transition whoosh | 0.2–0.8 s, dull and airy, no hiss or zap; stereo is fine | peak |
| `riser` | short riser, tension riser | ends on the arrival with no crash; under 2 bars | peak or end |
| `swell` | reverse swell, soft reverse cymbal | blooms into its peak | peak |
| `suck` | reverse whoosh, suck in | bright to dark into the cut | peak |
| `bell`, `bell` (`motif`) | success chime, soft notification, marimba hit, sonic logo | soft, short, in the film's key; the `motif` take is the logo moment | onset, root |

**Pitched takes.** Pops, chimes, marimba hits and light landings stay in key when you give their recorded note as `root`. `score.py` then shifts each event onto the note the synth would have played (at most an octave either way). Find the note from the file name, or estimate it:
```bash
python3 -c "import sys, numpy as np, librosa; y, sr = librosa.load(sys.argv[1]); f, _, _ = librosa.pyin(y, fmin=80, fmax=2000, sr=sr); print(librosa.hz_to_note(np.nanmedian(f)))" audio/sfx/pop.wav
```

**Preparing a file.** Keep the download as it came. When a file holds several hits, or a long run-up, cut one hit into its own WAV:
```bash
ffmpeg -ss 1.20 -t 0.4 -i audio/sfx/clicks.wav audio/sfx/click-1.wav
```
`score.py` trims leading silence, levels each take and places it. Do not normalise, compress or add reverb yourself.

## 8. score.json: bed and samples

```json
{
  "key": "A minor",
  "sections": [ { "bars": [9, 10], "style": "hold", "level": 0.6 } ],
  "bed": [
    { "file": "music/track-120.wav", "at": 0, "from": 2.0, "to": 16.0 },
    { "file": "music/track-120.wav", "at": "@drop", "from": 64.0, "to": 86.0, "fade_out": 0.6 }
  ],
  "samples": {
    "key": { "files": ["sfx/key-1.wav", "sfx/key-2.wav", "sfx/key-3.wav", "sfx/key-4.wav"] },
    "click": "sfx/click.wav",
    "tick.crisp": ["sfx/tick-1.wav", "sfx/tick-2.wav", "sfx/tick-3.wav"],
    "pop": { "files": ["sfx/pop-1.wav", "sfx/pop-2.wav"], "root": "E5" },
    "whoosh": { "file": "sfx/whoosh.wav", "gain_db": -2 },
    "bell.motif": { "file": "sfx/chime.wav", "root": "A5" }
  },
  "drops": [ { "at": "@drop", "silence": "1/8" } ],
  "payoff": "@drop",
  "master": { "lufs": -14 }
}
```

Paths are relative to the working directory or to the folder that holds `score.json`. `score.py` reads WAV, FLAC and OGG, and MP3 with libsndfile 1.1 or newer; it tells you to convert a file it cannot read.

**`bed`** is a file name, a segment object, or a list of segments of one or more files.

| Field | Meaning |
|---|---|
| `file` | the track |
| `at` | where the segment starts in the film: a frame number or `"@cue"` (as every time in `score.json`) |
| `from`, `to` | seconds into the file (default: from 0 to its end) |
| `gain_db` | the segment's level (default 0) |
| `fade_in`, `fade_out` | seconds (defaults 0.01 and 0.05) |

**`samples`** maps an event kind (`"whoosh"`) or a kind and its variant (`"click.confirm"`, `"tick.crisp"`, `"bell.motif"`) to a file, a list of takes, or an object. The variant entry wins over the kind entry.

| Field | Meaning |
|---|---|
| `file` or `files` | one take, or takes that play in turn |
| `gain_db` | added to the automatic level (default 0) |
| `align` | which point of the take lands on the event's frame: `onset` (the transient; default), `peak` (the loudest 30 ms; default for `whoosh`, `suck`, `riser`, `swell`) or `end` (the last point within 20 dB of the peak) |
| `root` | the note the take was recorded on; the take is then retuned per event to the note the synth would have played |

**Levels and placement.**
- Each take is levelled to where the synthesized voice of its kind would sit: its loudest 6 ms (short sounds) or 50 ms (whooshes, risers, impacts) matches that voice. The per-film levelling of clicks, crisp ticks and typing runs then works as it does for the synth.
- Effects other than whooshes, risers, swells and sucks play in mono near the centre.
- A recorded `hit` or `drop` brings its own room, so no synth reverb send is added.
- `"bell.motif"` plays its take once, in place of the synth motif.
- Without synth `sections` (or with `"hold"` sections only), `chords` may be left out: tuned effects then follow the key's scale. Set `key` from the track (`track-info.py` estimates it) so tuned takes agree with the music.

**The report.** `score.py` prints a `recorded:` line (the bed's segments and how many times each kind played a take) and writes the same as `recorded` in `out/qa/score.json`.

## 9. The licence record

Every downloaded file goes into `audio/SOURCES.md` when you download it:

```markdown
| File | Title | Author | Source | Licence | Credit needed |
|---|---|---|---|---|---|
| music/track-120.wav | Night Drive | Example Artist | https://pixabay.com/music/... | Pixabay Content License | no |
| sfx/whoosh.wav | Soft Whoosh | Example Studio | https://mixkit.co/free-sound-effects/... | Mixkit free licence | no |
| sfx/pop-1.wav | UI Pop 03 | Example Author | https://freesound.org/s/... | CC BY 4.0 | yes: "UI Pop 03 by Example Author (CC BY 4.0)" |
```

Note edits in the File column (`track-120.wav: stretched 2.5% from track.mp3`). At delivery, copy the record to `out/deliver/SOURCES.md` and put every required credit line into the delivery note.

## 10. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `masked:` warnings on effects | the bed is dense where the effect plays | `gain_db` up 2–4 dB, a brighter take, a `hold` section dip, or move the effect to a quieter bar |
| The payoff is not the loudest moment | the track's own peak is elsewhere | land its biggest entry on the drop (`--land-at @drop`), or end the edit before its later peak |
| The drop sounds doubled or muddy | the track's entry and a synth or recorded boom fight | drop the `drop` event's sample and boom, or use a soft sub only |
| The cuts drift off the beat | the track wanders (played live) or the tempo is a non-whole frame | pick a track on a grid; stretch to a whole-frame tempo (§6) |
| Tuned ticks or chimes clash with the track | `key` does not match the track | set `key` to the track's key; give pitched takes their `root` |
| An audible click at an edit | a cut off the bar line, or a fade that is too short | cut on bar lines; `fade_in` 0.01–0.03, `fade_out` 0.05–0.2 |
| A voice tag or a fade-in at the start | a preview file or a watermarked download | the full file from the item's page; a later `from` |
| Every take sounds like a different library | no palette | one material for all effects (§7); re-pick the odd one out |
