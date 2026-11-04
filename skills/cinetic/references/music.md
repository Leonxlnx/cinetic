# Music: the licensed track, from the licence to the cut

Every cinetic film plays one licensed, human-made, instrumental track, edited only at bar lines, with real licensed effects from the catalogue (`scripts/audio/sfx.mjs`) placed on the `launch` kit's roles and levelled over it (`references/sound.md`): background music is part of every film, launch or update, long or short. This file covers the track: where it may come from, its licence record, its analysis, the edit, cutting the picture to it, and the credits that travel with the film. Read it at Step 3, before the timeline, and again at Step 8.

cinetic makes no music. The track is chosen, never generated: no synth bed, no AI-generated track, no music assembled from kit sounds. **Prefer licences that need no credit** (Mixkit, Coverr; Pixabay by hand): nothing on screen ever credits the music, and a film whose track needs no credit line ships cleanest. A CC BY track only when the user asks for that one, or when it is clearly better than every no-credit candidate; its credit goes into the post text or video description (the film's credits file), never into the picture.

**It sounds produced, and it ends.** Launch music is modern, beat-driven, confident electronic music (house and tech house grooves, heavy-bass hip hop and trap beats, funk, minimal and indie electronic; 107–140 BPM, most near 120), dense and bass-forward, with a short intro, a full body and one clear lift on the reveal, and it ends on the track's own last hit ringing out (or a short fade under the end card), never on music that stops dead. Never cheesy corporate pop with ukulele and claps, lo-fi hiss, or stock piano.

**Every film its own track.** The track is found for this film's mood and pace, never reused from the last film and never the same few files every time: `scripts/music.mjs` searches free catalogs, keeps a history per user, and downloads the choice with its licence record.

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

At Step 3, before a single act is timed: find the track, record its licence, analyse it, edit it to the film's bars, and write the film-time grid the timeline imports. The picture is then cut to the music; the music is never re-timed to the picture.

```bash
node scripts/music.mjs search --mood "mechanical driving minimal" --bpm 118-128 --length 30   # Mixkit, Coverr, CC0 -> out/music/search.json
#   (with a music library: node scripts/music.mjs pick --mood "precise driving" --bpm 118-128 --length 30)
node scripts/music.mjs sheet --measure              # the first three: mood, tempo, length, energy curve (audition them)
node scripts/music.mjs get '#2' --to audio/music     # -> audio/music/<name>.mp3 + <name>.licence.json
python3 scripts/audio/listen.py --track audio/music/<name>.mp3                       # possible vocals, tempo
python3 scripts/audio/track.py analyze audio/music/<name>.mp3 --profile crisp        # -> <name>.track.json
python3 scripts/audio/track.py fit                   # after the script exists: the edit fitted to the film's beat plan + src/music.ts
#   (HyperFrames, or a film whose timeline counts no BARS: track.py edit --bars 16 --reveal-bar 13, then track.py grid)
python3 scripts/audio/track.py check                 # joins, the ending's decay, the licence record, nothing from the track in git
```

A track found by hand elsewhere is recorded with `track.py add` as you download it (`--title`, `--artist`, `--source`, `--page`, `--licence`, `--seen-quote "…the licence text, as read on the item's own page now…"`, `--seen-url`, `--ai-generated no --vocals no`): the same record `music.mjs get` writes. `bash scripts/new-film.sh <dir> --music <file> …` does the record and the analysis and sets up the launch kit (`kit.py init --preset launch`); `npm run music` repeats analyze, edit and grid with the settings already saved. `analyze` keeps an analysis already made of the same file (sha256) with the same settings, so a second run takes seconds (`--force` makes it again), and `new-film.sh` reuses a `<name>.track.json` lying beside the file it is given. On a busy machine, `new-film.sh --music … --no-analyze` scaffolds without the analysis (the longest step) and prints its command, to run as its own job.

A Mixkit track has no page of its own: the record's `page` is the listing it was found on (a genre or mood page, whose data names the track's licence), and the licence text is read at `https://mixkit.co/license/modal/musicFree/` (the `/license/` page only opens it in a panel): that is the `licence_seen` URL. `music.mjs get` reads that page again before every download and refuses when its sentence has changed.

**Gate (Step 3):** the licence record passes (`track.py check`); the downbeat is confident, confirmed by the biggest low-band entrance, or its phase set by hand; the reveal bar holds an entry; the ending decays (the track's own `button` or `ring`, a `fade` under the end card, or a `hit` that rings; `track.py check` measures it) and the tail holds `MUSIC.end.hold`; `grid-check.ts` runs in music mode clean (`music-grid`, `structural-on-music`).

## 2. Licences you may use, and what to refuse

| Source | Licence | Commercial video | Credit | Limits | Download |
|---|---|---|---|---|---|
| Mixkit | Mixkit Stock Music Free License | yes: any web or social platform, ads, video on demand | none needed (a courtesy line) | no TV or radio broadcast, no CD/DVD, no video games; never remix it into a music-only track, redistribute the file or register it with a rights service | `music.mjs search` / `get` |
| Coverr | Coverr License | yes: commercial and non-commercial | none needed (appreciated) | never compile its items into a similar or competing service or use them to train AI; trademarks in an item need their owner's permission; the free download is the full-length 128 kbps MP3 (the WAV master needs an account) | `music.mjs search` / `get` |
| Pixabay Music | Pixabay Content License | yes | none needed (courtesy: "by X via Pixabay") | never share the file on its own; refuse a track the page marks "AI generated"; prefer tracks not registered with Content ID (keep the certificate of one that is) | the user downloads from the page (pixabay.com answers scripts with a bot check, which the finder never tries to pass; its API serves no music), then `track.py add` |
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
- Audition 3 candidates (`music.mjs sheet --measure`, then listen), pick one, analyse it, and name the runner-up in the delivery note so the user can audition and swap it.

The record (`audio/music/<name>.licence.json`; `audio/music/licence.template.json` shows every field):

```json
{"record": 1, "file": "deep_urban.mp3", "sha256": "…", "bytes": 9240540,
 "title": "Deep Urban", "artist": "Eugenio Mininni", "source": "Mixkit",
 "page": "https://mixkit.co/free-stock-music/tech-house/", "file_url": "https://assets.mixkit.co/music/623/623.mp3",
 "licence": "Mixkit Stock Music Free License", "licence_id": "mixkit-music", "licence_url": "https://mixkit.co/license/#musicFree",
 "credit_required": false, "credit": "Music: \"Deep Urban\" by Eugenio Mininni (Mixkit)",
 "content_id": "not registered", "ai_generated": false, "vocals": false, "checked": "2026-10-23", "certificate": null,
 "licence_seen": {"quote": "…", "url": "https://mixkit.co/license/modal/musicFree/", "date": "2026-10-23"},
 "limits": "web, social, ads and VOD; no broadcast, CD/DVD or games",
 "modifications": "edited at bar lines for the film; levels adjusted"}
```

A CC BY record carries `credit` in the composer's template form; the credits name the modifications. The file's `sha256` must match: a changed file is re-recorded after reading its page again (`track.py add --force`).

`assets/music/shortlist.json` lists free tracks that pass these rules, with their licence, credit line, length, measured tempo, mood and profile, and the date each page was last checked. The example films used them, so the finder ranks them lower: take one only when nothing it finds fits, and read its page again.

## 4. Choosing

`music.mjs search --mood "<words>" --bpm <lo-hi> --length <film s>` reads the catalog pages the words name (a genre such as "tech house", a mood such as "calm" or "driving", an instrument, or the catalog's search for any other word; house words such as "precise" or "punchy" read as the catalog's moods and genres) and ranks the tracks:

- **mood:** the words their tags match (genre and mood count double);
- **length:** never shorter than the film plus its ending; at least 1.5 times the film, so the best bars and a natural ending both fit;
- **tempo:** a tempo measured before (`sheet --measure`, the shortlist), else the genre's usual range, marked estimated; half or double time counts; `track.py analyze` measures the one you keep;
- **energy curve,** read from the catalog's own waveform data without downloading: a break followed by an entry (a place for the reveal) and contrast win, a flat track loses; `sheet` shows the curve as a strip of levels with the intro, the breaks and their entries, and the ending (fade, button or ring);
- **the history** (`~/.cinetic/music-history.json`, or `$CINETIC_HOME`): a track any earlier film used is held back (never offered again), the shortlist's tracks lose ground, and the first track offered is never the one the previous search offered first. `get` records the film's choice; `history` shows it.

**A music library, when you keep one.** `music.mjs pick --mood "<words>" --length <film s> --bpm <lo-hi>` ranks a curated library instead of the catalogs: tracks already chosen as launch-fit, analysed with `track.py` (a clear downbeat grid, sections, a drop or lift for the reveal, the ending's bar and length, cut points) and listened to with earshot (modern for the mood, no voice, no lo-fi hiss, how close it sounds to the house launch sound: `profile.ref_z`), each with its no-credit licence. A track with its own ending (its final hit ringing out) ranks well above one that fades or loops, and closeness to the launch sound counts; earshot's realness (a produced recording, not cheap MIDI) is part of the library's quality mark. Its moods are calm, cinematic, dark, driving, elegant, energetic, playful and uplifting; the brief's words name them ("precise" is driving, "premium" elegant, "bright" uplifting). It ranks by mood (the track's own mood first, a second mood next), length, tempo (half or double time counts), the film's energy (`--energy calm|crisp|punchy`, else the brief's mood words: a punchy track under a calm film loses), the lift for the reveal and the library's quality mark; a launch (`--format launch`, or a launch-simple project's `film.json`) prefers 115-136 BPM when `--bpm` is not given and a tempo outside it loses heavily (146 BPM drum and bass under calm cards is the miss); it spreads the offers across artists (a second track by one artist, or an artist a recent film used, loses ground), holds back every track an earlier film used, and writes the results where `search` does, each with a cut line (the reveal's bar and time, the body, the ending, the key, a `--phase` to analyse with); `sheet` and `get` read them, and `get` takes the library's copy while its sha256 matches, reading the licence again. The library is found at `--library`, `$CINETIC_MUSIC_LIBRARY` or `~/.cinetic/music-library.json` (the file, or `{"link": "<path>"}`); without one, `search` is the route.

Choose among the first three by the film's mood and pace, after listening:

- **Profile and tempo.** The row of the personality table (`references/sound.md` §5.5a) picks the music brief: calm 95–110 BPM with a soft pulse, crisp 120–128 with a clear four-on-the-floor, punchy 124–130. Any tempo works: `src/music.ts` gives `b()` the track's own fractional frames.
- **Structure.** The film needs an entry for the reveal (a bar where a part comes in, ideally after a break or a stop), a break for the mid-film dip, and an ending of its own: a final hit with its ring (`button`, `ring`). A track that fades or loops can still end on a 2–3 s fade under the end card, but one with a real ending is preferred. `track.py analyze` lists them (`ending.final_bar`, `ring_out_s`).
- **Length.** Longer than the film, so the best bars and a natural ending can both be chosen.
- **Instrumental.** No lead vocal: it fights on-screen text. A track the page calls instrumental can still carry a vocal sample: `listen.py --track` flags possible vocals.
- **Not famous.** Very popular free tracks are recognised by viewers (the shortlist flags them `popular`).
- **No Content ID** where possible, for public uploads: a false claim is a dispute, not a strike, but it costs time.

## 5. Analysing

`track.py analyze FILE [--profile calm|crisp|punchy] [--bpm N] [--phase N]` (numpy, scipy, librosa, ffmpeg; no models, no network) writes `<name>.track.json` and prints the bar table:

- **Tempo:** librosa's beats give a first period; the period and phase whose fold of a fine spectral flux collects the most onset energy over the whole track give the exact tempo; every beat is then measured on its own attack: the drift (RMS and max). Over 12 ms RMS the track wanders (played live): cut to its accents, not its grid. `--bpm` uses a tempo the composer states (the phase is still fitted).
- **Downbeat:** each of the four beat phases is scored by low-band onsets, harmonic change, the level and timbre change across the beat, and the entrances (a part or a kick coming in votes for its beat). `downbeat_confidence` is the gap to the runner-up. **Under 0.5, `analyze` exits 2 and `edit` refuses** until you decide: the note prints both grids and where the biggest entrance lands; read the bar table (the first note, section entrances, chord changes) and rerun with `--phase N`. `--phase` with the grid's own phase confirms it in place; another phase re-grids from the measurements the first analysis cached in `out/cache/music/`. Neither runs a second analysis (`--force` does). A four-on-the-floor track often reads low (every beat has a kick): when the biggest low-band entrance (a kick or bass coming in 12 dB or more) lands on the chosen downbeat, the grid stands, `analyze` exits 0 with a note and `edit` warns.
- **Bars:** every downbeat on its own attack; per bar its loudness (LUFS), low band, onset density, centroid and novelty. **Phrases** (the 4- or 8-bar lattice with the most novelty), **sections** (intro, body, break, peak, outro), **entries** (a bar ≥ 4 dB over the two before with the low band ≥ 6 dB up, or ≥ 2.5 dB with the low band ≥ 12 dB up), **breaks** (a bar ≥ 5 dB down), **stops** (0.15–1 s of near-silence that departs from the bar's own pattern: the track's own stop-downs), **accents** (attacks ≥ 6 dB over the bed of the second before, with their band: `low` kick or sub, `mid` snare, clap or stab, `high` hats), the **ending** (`button`, `ring`, `fade`, `loop`), the **key** (and per section), loudness, true peak and LRA.

Read it before editing: is bar 1 where the music starts (a pickup is fine), does the biggest entry land on a bar line, where are the breaks, how does it end?

## 6. Editing

`track.py fit [TRACK.json] [--end auto|own|hit|fade] [--entry B]` is the route once the script is written (launch-simple, and every timeline that exports `BARS`): the music is fitted after the beat plan, never planned beside it. It reads the timeline at the track's tempo (a provisional `src/music.ts`, the ending's tail included), so the film's bars, the lockup's bar and the bars whose downbeat carries a cut come from the script; the edit plays exactly those bars, lands the track's biggest entry on the bar where the end act opens (the lockup), keeps the level steady inside a shot (a step over 4 dB costs except on a cut, so the sections change on the cuts), ends on a hit (its own button or ring, else one ringing kit hit; a fade under the end card only with `--end fade`), writes the grid and checks the film's bars again on it, fitting once more when the ending's tail moved them. A new script or a new track: `npm run music` fits again.

`track.py edit [TRACK.json] --bars N --reveal-bar K --end button|stop|ring [--start-bar S] [--entry B] [--arc "…"] [--film-t0 0.25] [--gap 0.4] [--map "…"]` arranges the film's bars on the track and writes `audio/music/edit.json` (editable by hand). When the beat sheet needs bars the planner does not choose, `--map "1:2x10,11:59x2"` gives them by hand (film bar:source bar x bars, in film order): the planner is skipped, and the joins, the ending and the film grid are written as usual (a `button` or `ring` map ends on the bar before the final hit). The planner's edit:

- **Arrangement:** a dynamic programme over the film's bars: an energy arc (intro −14, body −6, a dip −10 before the reveal, the peak 0 from the reveal, then a resolve; with a `stop` ending the body holds to the end), a jump cost (how unlike the bar that would naturally follow the target sounds, a loudness step of 3 LU or more, a jump off a phrase start), no key change across a jump, at least 2 bars per segment, at most one splice per 8 film bars, whole bars only.
- **Anchors:** the reveal's film bar holds the chosen entry (`--entry`, by default the biggest entry after a break or a stop; a track with no entry at the thresholds gives the reveal its largest loudness step, which `analyze` names and `edit` warns about: listen to it there, or give the reveal a stop before it); film bar 1 the start bar (`--start-bar`, inside the track's intro); the ending as below.
- **Joins:** the incoming segment starts 8 ms before its downbeat's attack with an 8 ms fade-in that ends on it, so the downbeat's transient comes whole from the incoming bar; the outgoing segment runs on 60 ms with a tail fade (150 ms when it sustains). `track.py check` measures each join on the edited bed: no click (high-frequency energy neither source has there), the incoming attack within ±2 ms of the film downbeat, a loudness step under 3 LU unless it is the entry (a step down may also open the break before the reveal, or the last bars of a `button` or `ring` ending), no chopped note, no start inside a note. A hard join may hide under a whoosh or a hit only when the picture has a cause there; never add an effect only to hide a splice.
- **Opening:** bar 1's downbeat at `--film-t0` 0–0.45 s, so the first sound arrives early and the hook enters with intent; start inside the track's own intro. What plays before bar 1 fades in from silence over 80 ms, so the film never cuts into a note on frame 0; `--film-t0 0` opens on bar 1's attack instead.
- **Reveal:** the entry on the reveal bar. A stop or break just before it stays: it is the stop-down, and `plan.py` adds nothing there.
- **Mid-film dip:** the track's own break at 40–80% of the runtime, about 5 LU down. Arrangement beats level changes.
- **Endings: the music never stops dead.** `--end auto` (the default) takes the track's own ending when it has one, else a fade; `track.py check`, `score.py` and `av-audit.py` fail an ending that falls 20 dB inside 150 ms with no decay after it.
  - `own` (`button` or `ring`, from the analysis): the edit closes the body with the track's own final bars, so its final hit lands on the bar line after the body, where the wordmark becomes readable, and rings out; the kit's lockup hit is carried by the track (one element, not two). The tail holds the ring for 1.5–2.5 s (`MUSIC.end.hold`). A late reveal (the film's last bar but one) still gets it: the edit reaches the bar before the final hit through one turnaround bar, so the drop on the reveal resolves into the track's own final hit. The first choice: it is how launch music should end.
  - `fade` (`--fade 2–3`): for a track that fades or loops: the bed plays on past the body and fades out over 2–3 s under the end card, on a near-even curve in dB; the tail holds the fade.
  - `hit`: the bed's downbeat on the bar line after the body sounds whole and is released over 0.5 s under ONE kit element on that bar line (`drop` or `hit`), which `score.py` sends through the hall so it rings 1.5 s or more. `stop`, the old name, now means this: the gap of silence before the element is gone.
  - The picture holds the ending: the templates' tail is at least `MUSIC.end.hold`, so the end card sits on the ring or the fade and the film ends as it decays (dead air under 1 s).

`track.py grid [--fps N] [--out src/music.ts | music.js]` writes the film-time grid: `MUSIC` (`bpm`, `beatS`, `fps`, `t0`, `bars`, `downbeats`, `accents`, `phrases`, `sections`, `entries`, `breaks`, `stops`, `end`: its mode, its frame and `hold`, the frames the picture holds after the body for the ending), `bar(n, beat, sixteenth)` (the fractional frame of a grid position, following the measured downbeats) and `accentNear(f, tol)`. `timeline.ts` takes `BPM` from it, `b()` rounds `bar()` (every act start, Sequence and CUE stays a whole frame within 0.5 f of the music), and `grid-check.ts` switches to music mode.

## 7. Cutting picture to the music

1. **Structure lands on the music's events.** Act and section changes, the reveal and the ending land on a phrase start, an entry after a break, the end of a stop or the final hit, within ±1 f of the measured attack (not of the arithmetic grid). Mark them `structural: true` in `src/sync.ts` and in the timeline's `STRUCTURAL` list: `grid-check.ts` (`structural-on-music`) and `av-audit.py` (`music_sync`) check them; the reveal, the payoff and the lockup fail when off. Every `ACT` start counts as structure, so acts are the film's sections, not its shots: shots that cut on beats or accents inside a section live inside one act (as `CUE`s and `SEAMS`), and only the section change starts a new act.
1b. **The music's level changes ride the cuts.** A section of the track that enters (or drops out) in the middle of a shot reads as a mistake: the edit is fitted to the shots (`track.py fit` keeps the level steady inside a shot and puts the entries on cuts), and `av-audit.py` (`level`) fails a rise of 8 dB or a fall of 10 dB that lands on no picture event (an act change, a declared seam, a cut cue, the reveal), and warns from 5 dB.
2. **Ordinary cuts land on a sound.** A graphic beat (a colour swap, a caption split, a hard cut into a statement) lands on a strong accent of the track (`MUSIC.accentNear(f)`, `snapToAccent(f, tol)`) or on a designed effect, within one frame. Continuity cuts inside a fast run (photo or UI cuts that carry motion through) may float 50–170 ms off the accents. A near miss reads as a mistake: a hard cut 2–4 f off a strong accent; move it onto the accent or well clear of it. Do not cut on every downbeat: mix in cuts on the 16th before a downbeat, and skip some.
3. **The picture may lead its sound by 1–3 f.** A sound never leads its picture by more than 45 ms, except a role's designed offset.
4. **The biggest reveal comes after a dip:** 0.2–0.5 s of break, stop or stop-down, then the entry on the reveal.
5. **One gesture at a time.** A cut on a strong track accent is carried by the track; designed hits go where the music has nothing, after a stop-down; UI sounds go on discrete state changes.
6. **Energy sets the cut rate.** Calm shots under calm bars, the cut rate rising with the energy: shots around 1.4 s (0.8–2.2 s), fast runs 0.25–0.9 s, text-led passages 1.75–2.65 s.
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
| `analyze` exits 2: downbeat confidence LOW | every beat sounds alike (four-on-the-floor), or the track opens on a pickup | read the bar table and the note (where the biggest entrance lands), decide, rerun with `--phase N` (either phase is set without a second analysis) |
| the track wanders (drift over 12 ms RMS) | played live, rubato | cut to its accents (`accentNear`), not its bar grid |
| the ending is a fade | the track fades out | `--end fade`: a 2–3 s fade under the end card (or another track with its own ending) |
| the music stops dead at the end (`av-audit` ending fail) | a bed cut on a bar line, a tail shorter than the ending, a dry final hit | `track.py edit --end own` (or `fade`, `hit`), the tail = `MUSIC.end.hold`, `npm run music` and render again |
| possible vocals (`listen.py --track`) | a vocal sample in an "instrumental" track | check the page; choose another track |
| a later section is louder than the payoff | the edit lands the peak late | `--entry` on the biggest entry, `--arc` with the peak at the reveal, or fewer bars after it |
| a click at a join | the cut is off the attack, or a note sustains across it | `track.py edit` on other bars (`--start-bar`, `--entry`); check the bar table for a fresh attack |
| a key clash across a join | sections in different keys | the edit refuses key changes across a jump; pick another entry |
| a loudness step at a join | the jump lands in a quieter or louder part | the edit penalises steps of 3 LU or more; set `--arc` to keep the body level |
| a Content ID claim on the upload | the track is registered, or a false claim | dispute with the record (page, licence, download date; the certificate for a registered track) |
| credits missing or refused at delivery | no record, no `licence_seen`, no CC BY credit line | `music.mjs get` (or `track.py add`) again after reading the page; `npm run credits` |
| every film sounds alike | the same few tracks, the last film's track | `music.mjs search` (or `pick`) with the film's own mood words and tempo; the history holds back every track an earlier film used |
| `get` refuses: the licence page changed | the sentence read on 2026-10-26 is no longer there | read the page; record the track by hand (`track.py add`) only if it still allows a film |
