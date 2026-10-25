# Music: the licensed track, from the licence to the cut

Every cinetic film plays one licensed, human-made, instrumental track, edited only at bar lines, with the earshot `launch` kit levelled over it (`references/sound.md`): background music is part of every film, launch or update, long or short. This file covers the track: where it may come from, its licence record, its analysis, the edit, cutting the picture to it, and the credits that travel with the film. Read it at Step 3, before the timeline, and again at Step 8.

cinetic makes no music. The track is chosen, never generated: no synth bed, no AI-generated track, no music assembled from kit sounds. **Prefer licences that need no credit** (Mixkit, Pixabay): nothing on screen ever credits the music, and a film whose track needs no credit line ships cleanest. A CC BY track is the fallback when nothing else fits; its credit goes into the post text or video description, never into the picture.

## Contents
1. [The track comes first](#1-the-track-comes-first)
2. [Licences you may use, and what to refuse](#2-licences-you-may-use-and-what-to-refuse)
3. [Downloading and the licence record](#3-downloading-and-the-licence-record)
4. [Choosing](#4-choosing)
5. [Analysing](#5-analysing)
6. [Editing](#6-editing)
7. [Cutting picture to the music](#7-cutting-picture-to-the-music)
8. [Credits and delivery](#8-credits-and-delivery)
9. [Failure modes](#9-failure-modes)

## 1. The track comes first

At Step 3, before a single act is timed: choose the track, record its licence, analyse it, edit it to the film's bars, and write the film-time grid the timeline imports. The picture is then cut to the music; the music is never re-timed to the picture.

```bash
python3 scripts/audio/track.py add audio/music/deep_urban.mp3 --title "Deep Urban" --artist "Eugenio Mininni" \
    --source Mixkit --page https://mixkit.co/free-stock-music/tech-house/ --licence "Mixkit Stock Music Free License" \
    --seen-quote "…the licence text, as read on the item's own page now…" --seen-url https://mixkit.co/license/ \
    --ai-generated no --vocals no                       # -> audio/music/deep_urban.licence.json
python3 scripts/audio/track.py analyze audio/music/deep_urban.mp3 --profile crisp    # -> deep_urban.track.json
python3 scripts/audio/track.py edit --bars 16 --reveal-bar 7 --end stop              # -> audio/music/edit.json
python3 scripts/audio/track.py grid                  # -> src/music.ts (Remotion) or music.js (HyperFrames)
python3 scripts/audio/track.py check                 # joins, the licence record, nothing from the track in git
```

`bash scripts/new-film.sh <dir> --music <file> …` does the first two steps and sets up the launch kit (`kit.py init --preset launch`); `npm run music` repeats analyze, edit and grid with the settings already saved.

**Gate (Step 3):** the licence record passes (`track.py check`); the downbeat is confident or its phase is set by hand; the reveal bar holds an entry; the ending is `button`, `stop` or `ring`; `grid-check.ts` runs in music mode clean (`music-grid`, `structural-on-music`).

## 2. Licences you may use, and what to refuse

| Source | Licence | Commercial video | Credit | Limits | Download |
|---|---|---|---|---|---|
| Mixkit | Mixkit Stock Music Free License | yes: any web or social platform, ads, video on demand | none needed (a courtesy line) | no TV or radio broadcast, no CD/DVD, no video games; never redistribute the file; never register it with a rights service | the file URL works from a script |
| Pixabay Music | Pixabay Content License | yes | none needed (courtesy: "by X via Pixabay") | never share the file on its own; refuse a track the page marks "AI generated"; prefer tracks not registered with Content ID (keep the certificate of one that is) | the user downloads from the page |
| incompetech (Kevin MacLeod) | CC BY 4.0 | yes | required, in the composer's template | TV/radio ads, or a format where a credit is impossible, need the paid licence; name modifications beyond cutting and splicing | the file URL works from a script |
| Scott Buckley | CC BY 4.0 | yes | required, in the description, not in the video | never re-upload the file on its own | from the page |
| Free Music Archive, Chosic | per track: CC BY or CC0 only | yes, with the credit | copy the page's exact line | refuse NC, ND, SA; an aggregator is never the authority: confirm on the artist's own page | per track |

**Always refused:**
- NonCommercial (a launch film is commercial), NoDerivatives (syncing music to picture is an adaptation), ShareAlike (unless the whole film is released under it);
- personal-use, editorial and custom licences; the free tiers of subscription libraries that allow individual use only; "no copyright music" re-uploads;
- any file the page marks as AI-generated; any track with a lead vocal;
- any licence that cannot be found on the item's own page;
- anything behind a login, a captcha or a cart: give the user the link and the file name instead.

**Never done with a licensed track:** registering the finished film with Content ID or any rights service; handing over the track, the bed stem or the decoded file on its own; presenting the music as the brand's own.

`python3 scripts/audio/credits.py --classify "CC BY 4.0"` shows how a licence text classifies: allowed (`cc0`, `pd`, `cc-by-3.0`, `cc-by-4.0`, `mixkit-music`, `pixabay`), forbidden, or unknown (refused until the item's own page names one of the allowed licences).

## 3. Downloading and the licence record

- Download the full file (not a preview) into the film's `audio/music/`, which is git-ignored together with everything mixed from it: the soundtrack, the stems, the decode cache (`out/cache/music/`), the renders. Only the record, the analysis and the edit are committed (JSON, no audio).
- Record the licence at download time with `track.py add`, never afterwards. `--seen-quote` and `--seen-url` hold a short quote of the licence text as read on the item's own page now, with its URL (`--seen-date` defaults to today): a record without them is unconfirmed, and `track.py check`, `credits.py` and `deliver.sh` refuse it. Never fill them in from memory or from a list.
- Shortlist 2–3 candidates, analyse each, pick one, and name the runner-up in the delivery note so the user can audition and swap it.

The record (`audio/music/<name>.licence.json`; `audio/music/licence.template.json` shows every field):

```json
{"record": 1, "file": "deep_urban.mp3", "sha256": "…", "bytes": 9240540,
 "title": "Deep Urban", "artist": "Eugenio Mininni", "source": "Mixkit",
 "page": "https://mixkit.co/free-stock-music/tech-house/", "file_url": "https://assets.mixkit.co/music/623/623.mp3",
 "licence": "Mixkit Stock Music Free License", "licence_id": "mixkit-music", "licence_url": "https://mixkit.co/license/#musicFree",
 "credit_required": false, "credit": "Music: \"Deep Urban\" by Eugenio Mininni (Mixkit)",
 "content_id": "not registered", "ai_generated": false, "vocals": false, "checked": "2026-10-23", "certificate": null,
 "licence_seen": {"quote": "…", "url": "https://mixkit.co/license/", "date": "2026-10-23"},
 "limits": "web, social, ads and VOD; no broadcast, CD/DVD or games",
 "modifications": "edited at bar lines for the film; levels adjusted"}
```

A CC BY record carries `credit` in the composer's template form; the credits name the modifications. The file's `sha256` must match: a changed file is re-recorded after reading its page again (`track.py add --force`).

`assets/music/shortlist.json` lists free tracks that pass these rules, with their licence, credit line, length, measured tempo, mood and profile, and the date each page was last checked. It is a starting point, not a licence: read the page again every time.

## 4. Choosing

- **Profile and tempo.** The row of the personality table (`references/sound.md` §5.5a) picks the music brief: calm 95–110 BPM with a soft pulse, crisp 120–128 with a clear four-on-the-floor, punchy 124–130. Any tempo works: `src/music.ts` gives `b()` the track's own fractional frames.
- **Structure.** The film needs an entry for the reveal (a bar where a part comes in, ideally after a break or a stop), a break for the mid-film dip, and an ending (`button`, `ring`, or a body that can stop on a bar line). `track.py analyze` lists them.
- **Length.** Longer than the film, so the best bars and a natural ending can both be chosen.
- **Instrumental.** No lead vocal: it fights on-screen text. A track the page calls instrumental can still carry a vocal sample: `listen.py --track` flags possible vocals.
- **Not famous.** Very popular free tracks are recognised by viewers (the shortlist flags them `popular`).
- **No Content ID** where possible, for public uploads: a false claim is a dispute, not a strike, but it costs time.

## 5. Analysing

`track.py analyze FILE [--profile calm|crisp|punchy] [--bpm N] [--phase N]` (numpy, scipy, librosa, ffmpeg; no models, no network) writes `<name>.track.json` and prints the bar table:

- **Tempo:** librosa's beats give a first period; the period and phase whose fold of a fine spectral flux collects the most onset energy over the whole track give the exact tempo; every beat is then measured on its own attack: the drift (RMS and max). Over 12 ms RMS the track wanders (played live): cut to its accents, not its grid. `--bpm` uses a tempo the composer states (the phase is still fitted).
- **Downbeat:** each of the four beat phases is scored by low-band onsets, harmonic change, the level and timbre change across the beat, and the entrances (a part or a kick coming in votes for its beat). `downbeat_confidence` is the gap to the runner-up. **Under 0.5, `analyze` exits 2 and `edit` refuses** until you decide: the note prints both grids and where the biggest entrance lands; read the bar table (the first note, section entrances, chord changes) and rerun with `--phase N`. A four-on-the-floor track often needs this: every beat has a kick.
- **Bars:** every downbeat on its own attack; per bar its loudness (LUFS), low band, onset density, centroid and novelty. **Phrases** (the 4- or 8-bar lattice with the most novelty), **sections** (intro, body, break, peak, outro), **entries** (a bar ≥ 4 dB over the two before with the low band ≥ 6 dB up, or ≥ 2.5 dB with the low band ≥ 12 dB up), **breaks** (a bar ≥ 5 dB down), **stops** (0.15–1 s of near-silence that departs from the bar's own pattern: the track's own stop-downs), **accents** (attacks ≥ 6 dB over the bed of the second before, with their band: `low` kick or sub, `mid` snare, clap or stab, `high` hats), the **ending** (`button`, `ring`, `fade`, `loop`), the **key** (and per section), loudness, true peak and LRA.

Read it before editing: is bar 1 where the music starts (a pickup is fine), does the biggest entry land on a bar line, where are the breaks, how does it end?

## 6. Editing

`track.py edit [TRACK.json] --bars N --reveal-bar K --end button|stop|ring [--start-bar S] [--entry B] [--arc "…"] [--film-t0 0.25] [--gap 0.4] [--map "…"]` arranges the film's bars on the track and writes `audio/music/edit.json` (editable by hand). When the beat sheet needs bars the planner does not choose, `--map "1:2x10,11:59x2"` gives them by hand (film bar:source bar x bars, in film order): the planner is skipped, and the joins, the ending and the film grid are written as usual (a `button` or `ring` map ends on the bar before the final hit). The planner's edit:

- **Arrangement:** a dynamic programme over the film's bars: an energy arc (intro −14, body −6, a dip −10 before the reveal, the peak 0 from the reveal, then a resolve; with a `stop` ending the body holds to the end), a jump cost (how unlike the bar that would naturally follow the target sounds, a loudness step of 3 LU or more, a jump off a phrase start), no key change across a jump, at least 2 bars per segment, at most one splice per 8 film bars, whole bars only.
- **Anchors:** the reveal's film bar holds the chosen entry (`--entry`, by default the biggest entry after a break or a stop); film bar 1 the start bar (`--start-bar`, inside the track's intro); the ending as below.
- **Joins:** the incoming segment starts 8 ms before its downbeat's attack with an 8 ms fade-in that ends on it, so the downbeat's transient comes whole from the incoming bar; the outgoing segment runs on 60 ms with a tail fade (150 ms when it sustains). `track.py check` measures each join on the edited bed: no click (high-frequency energy neither source has there), the incoming attack within ±2 ms of the film downbeat, a loudness step under 3 LU unless it is the entry, no chopped note, no start inside a note. A hard join may hide under a whoosh or a hit only when the picture has a cause there; never add an effect only to hide a splice.
- **Opening:** bar 1's downbeat at `--film-t0` 0–0.45 s, so the first sound arrives early and the hook enters with intent; start inside the track's own intro.
- **Reveal:** the entry on the reveal bar. A stop or break just before it stays: it is the stop-down, and `plan.py` adds nothing there.
- **Mid-film dip:** the track's own break at 40–80% of the runtime, about 5 LU down. Arrangement beats level changes.
- **Endings:**
  - `stop`: the bed ends on the bar line after the body; `--gap` (0.2–0.7 s) of near-silence; then ONE kit element on the wordmark (`drop` or `hit`) and its tail. Use it for a track that ends on a fade.
  - `button`: the track's final hit lands on the bar line after the body, where the wordmark becomes readable; the kit's lockup hit is then carried by the track (one element, not two).
  - `ring`: the track's last chord rings under the end card.
  - Fade only a ring-out, never mid-phrase.

`track.py grid [--fps N] [--out src/music.ts | music.js]` writes the film-time grid: `MUSIC` (`bpm`, `beatS`, `fps`, `t0`, `bars`, `downbeats`, `accents`, `phrases`, `sections`, `entries`, `breaks`, `stops`, `end`), `bar(n, beat, sixteenth)` (the fractional frame of a grid position, following the measured downbeats) and `accentNear(f, tol)`. `timeline.ts` takes `BPM` from it, `b()` rounds `bar()` (every act start, Sequence and CUE stays a whole frame within 0.5 f of the music), and `grid-check.ts` switches to music mode.

## 7. Cutting picture to the music

1. **Structure lands on the music's events.** Act and section changes, the reveal and the ending land on a phrase start, an entry after a break, the end of a stop or the final hit, within ±1 f of the measured attack (not of the arithmetic grid). Mark them `structural: true` in `src/sync.ts` and in the timeline's `STRUCTURAL` list: `grid-check.ts` (`structural-on-music`) and `av-audit.py` (`music_sync`) check them; the reveal, the payoff and the lockup fail when off.
2. **Ordinary cuts land on a sound.** A graphic beat (a colour swap, a caption split, a hard cut into a statement) lands on a strong accent of the track (`MUSIC.accentNear(f)`, `snapToAccent(f, tol)`) or on a designed effect, within one frame. Continuity cuts inside a fast run (photo or UI cuts that carry motion through) may float 50–170 ms off the accents. A near miss reads as a mistake: a hard cut 2–4 f off a strong accent; move it onto the accent or well clear of it. Do not cut on every downbeat: mix in cuts on the 16th before a downbeat, and skip some.
3. **The picture may lead its sound by 1–3 f.** A sound never leads its picture by more than 45 ms, except a role's designed offset.
4. **The biggest reveal comes after a dip:** 0.2–0.5 s of break, stop or stop-down, then the entry on the reveal.
5. **One gesture at a time.** A cut on a strong track accent is carried by the track; designed hits go where the music has nothing, after a stop-down; UI sounds go on discrete state changes.
6. **Energy sets the cut rate.** Calm shots under calm bars, the cut rate rising with the energy: shots around 1.6 s (0.9–2.5 s), fast runs 0.25–1 s, text-led passages 2–3 s.
7. **Big moves peak on an accent:** solve a move's start with `peak()` so its velocity peak lands on one.

## 8. Credits and delivery

`python3 scripts/audio/credits.py` (`npm run credits`; `deliver.sh` runs it for every film with a track) checks the licence record the score names and writes, into `out/deliver/`:

- `CREDITS.md`: title, artist, source, licence and link, and the modifications ("Edited for this film: …"), plus the effects line;
- `CREDITS_description.txt`: the CC BY credits (required) and courtesy lines for the others, ready to paste under the post or into the video description when the user wants one.

Credits never appear in the picture: no on-screen music credit, no end-card line. With a no-credit licence the record and `CREDITS.md` stay with the project as its proof of licence.

It exits 1 when a record is missing, the licence is unknown or forbidden, `licence_seen` is missing, a CC BY track has no credit line, the file changed since it was recorded, or the soundtrack is a `--draft` build; 2 when there is no score report yet. `deliver.sh` refuses the delivery on any of these and never copies a stem, the bed or the decoded track into `out/deliver/`: the music travels only inside the film. The film's page, release notes or post carry the credits.

## 9. Failure modes

| Symptom | Cause | Fix |
|---|---|---|
| `analyze` exits 2: downbeat confidence LOW | every beat sounds alike (four-on-the-floor), or the track opens on a pickup | read the bar table and the note (where the biggest entrance lands), decide, rerun with `--phase N` |
| the track wanders (drift over 12 ms RMS) | played live, rubato | cut to its accents (`accentNear`), not its bar grid |
| the ending is a fade | the track fades out | `--end stop`: end on a bar line, then one element |
| possible vocals (`listen.py --track`) | a vocal sample in an "instrumental" track | check the page; choose another track |
| a later section is louder than the payoff | the edit lands the peak late | `--entry` on the biggest entry, `--arc` with the peak at the reveal, or fewer bars after it |
| a click at a join | the cut is off the attack, or a note sustains across it | `track.py edit` on other bars (`--start-bar`, `--entry`); check the bar table for a fresh attack |
| a key clash across a join | sections in different keys | the edit refuses key changes across a jump; pick another entry |
| a loudness step at a join | the jump lands in a quieter or louder part | the edit penalises steps of 3 LU or more; set `--arc` to keep the body level |
| a Content ID claim on the upload | the track is registered, or a false claim | dispute with the record (page, licence, download date; the certificate for a registered track) |
| credits missing or refused at delivery | no record, no `licence_seen`, no CC BY credit line | `track.py add` again after reading the page; `npm run credits` |
