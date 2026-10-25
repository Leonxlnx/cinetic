# audio/music

Every film is cut to music: one licensed, human-made, instrumental track, with the film's sound effects levelled
over it. The track lives here and is git-ignored, and so is everything mixed from it (the soundtrack, the stems,
the decode cache, the renders). What is committed is the record and the derived data, which hold no audio:
`<name>.licence.json` (written by `python3 scripts/audio/track.py add`, with the licence quoted as read on the
item's own page), `<name>.track.json` (`track.py analyze`: tempo, bars, entries, stops, ending, key) and
`edit.json` (`track.py edit`: the film's bars on the track). `licence.template.json` shows the record's fields.

## The starter's track

`audio/score.json` already plays `audio/music/track.mp3`, which a starter cannot ship: until a licensed file is
here, `npm run audio` stops with "not found". To add one (or let `new-film.sh --music FILE` do all of it):

1. Choose a track whose licence allows use in a published video with no on-screen credit (`references/music.md`
   lists the licences that pass and how to search). Copy it here.
2. `python3 scripts/audio/track.py add audio/music/<file> --title ... --artist ... --source ... --page URL
   --licence "..." --seen-quote "..." --seen-url URL` writes the record; then `track.py analyze audio/music/<file>`.
3. Point `audio/score.json` `music.track` and `music.licence` at the file and its record, and set `key` from the
   analysis. `python3 scripts/audio/kit.py init --preset launch --force` (earshot 0.4+) swaps the starter's calm kit
   for the launch kit, whose effects sit at their level over the music.
4. `track.py edit --bars 6 --reveal-bar 6 --end stop`, then `track.py grid`: `src/music.ts` gets the track's bars
   and every cue in `src/timeline.ts` follows them.

The demo is planned for a 124 BPM bed: six bars, the dome and the block landing on accents, the name locking as a
stop ends. Until the track's grid is written, the timeline runs on its own 120 BPM grid.
