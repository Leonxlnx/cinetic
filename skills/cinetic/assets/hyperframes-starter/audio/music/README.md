# audio/music

A film cut to music plays one licensed, human-made, instrumental track, and the track lives here: it is
git-ignored and never committed, and neither is anything mixed from it (the soundtrack, the stems, the
decode cache, the renders). What is committed is the record and the derived data, which hold no audio:
`<name>.licence.json` (written by `python3 scripts/audio/track.py add`, with the licence quoted as read on the
item's own page), `<name>.track.json` (`track.py analyze`: tempo, bars, entries, stops, ending, key) and
`edit.json` (`track.py edit`: the film's bars on the track). `licence.template.json` shows the record's
fields. The licences that pass and the whole workflow: `references/music.md`.
