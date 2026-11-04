# audio/music

Every film is cut to music: one licensed, human-made, instrumental track, with the film's sound effects levelled
over it. The track lives here and is git-ignored, and so is everything mixed from it (the soundtrack, the stems,
the decode cache, the renders). What is committed is the record and the derived data, which hold no audio:
`<name>.licence.json` (written by `python3 scripts/audio/track.py add`, with the licence quoted as read on the
item's own page), `<name>.track.json` (`track.py analyze`: tempo, bars, entries, stops, ending, key) and
`edit.json` (`track.py edit`: the film's bars on the track). `licence.template.json` shows the record's fields.
The licences that pass and the whole workflow: `references/music.md`.

## The starter's track

`audio/score.json` already plays `audio/music/track.mp3`, which a starter cannot ship: until a licensed file is
here, `npm run audio` stops with "not found". To add one (or let `new-film.sh --music FILE` do all of it):

1. Find this film's own track in the free catalogs whose licence needs no credit: `node scripts/music.mjs search
   --mood "<the film's mood words>" --bpm <lo-hi> --length <film s>`, then `music.mjs sheet --measure` (audition the
   first three) and `music.mjs get '#n' --to audio/music`, which downloads it and writes its record. Never the last
   film's track (`references/music.md`).
2. A track found elsewhere: copy it here and record it as you download it, `python3 scripts/audio/track.py add
   audio/music/<file> --title ... --artist ... --source ... --page URL --licence "..." --seen-quote "..." --seen-url
   URL`. Then `track.py analyze audio/music/<file>`.
3. Point `audio/score.json` `music.track` and `music.licence` at the file and its record, and set `key` from the
   analysis; `python3 scripts/audio/kit.py tune` puts the kit's tonal roles in that key. `audio/kit.json` is
   already the earshot `launch` kit, whose effects sit at their level over the music.
4. `track.py edit --bars N --reveal-bar K` (the music ends on the track's own final hit, or fades out under the end card), then `track.py grid`: `music.js` gets the track's bars and
   every cue in `timeline.js` follows them.

The demo is two bars and a hold: the mark assembles in bar 1, its contact on the downbeat of bar 2 is the payoff
(`@hit`), and the line lands a beat later as the stop ends. Until the track's grid is written, the timeline runs
on `motion.js`'s own 120 BPM grid.
