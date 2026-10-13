#!/usr/bin/env python3
"""
track-info.py: tempo, bar grid, energy and entries of a music track, to edit it to a film's grid.

Usage (from the project root):
  python3 scripts/audio/track-info.py audio/music/track.mp3 [--json out/qa/track.json]
      [--bpm 120] [--cues out/cues.json --land-at @drop | --fps 60 --land-at 840] [--entry N] [--film 30]

Prints the track's length, loudness (integrated LUFS) and an estimated key; its tempo and the time
of its first downbeat; a bar grid (the start of every bar); the loudness of each bar; the entries
(bars at least 4 dB louder than both bars before them: a drop, a re-entry) and the breaks (at least
5 dB down). The film's BPM must equal the track's (or half or double it): --bpm checks it.

With --land-at (a film frame, or "@cue" looked up in --cues) it prints two "bed" values for
audio/score.json that put an entry (by default the biggest; --entry N picks one) on that frame:
  one segment:  the track runs from the point that lands its entry there;
  an edit:      the track plays from its first downbeat on frame 0, then cuts on that bar line to
                its entry, so a long intro does not have to play out.
As everywhere in score.json, "at" is a film frame or "@cue"; "from" and "to" are seconds into the file.
--film S (the film's length in seconds; read from --cues when given) warns when the track ends early.

Needs librosa and pyloudnorm (the skill's Python requirements). Tempo and downbeats are estimates:
read them against the bar energies, and check the edit by ear and with av-audit.py.
Exit codes: 0 analysed; 1 unreadable file or no beat found; 2 the film's BPM does not fit the track.
"""
import argparse
import json
import os
import sys

import numpy as np

KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']
# Krumhansl-Kessler key profiles
MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


def estimate_key(chroma):
    """The best-correlating major or minor key for a mean chroma vector, with its correlation."""
    best = (-2.0, 'C', 'major')
    for k in range(12):
        for prof, mode in ((MAJOR, 'major'), (MINOR, 'minor')):
            r = float(np.corrcoef(chroma, np.roll(prof, k))[0, 1])
            if r > best[0]:
                best = (r, KEYS[k], mode)
    return best


def analyse(path):
    import librosa
    import soundfile as sf
    sr = 22050
    hop = 512
    y, _ = librosa.load(path, sr=sr, mono=True)
    if len(y) < sr:
        raise ValueError('the track is shorter than a second')
    info = dict(file=path, seconds=round(len(y) / sr, 3))
    try:
        import pyloudnorm as pyln
        x, sr0 = sf.read(path, always_2d=True)
        info['lufs'] = round(float(pyln.Meter(sr0).integrated_loudness(x)), 2)
    except Exception:  # noqa: BLE001 - loudness is a nice-to-have (MP3 needs libsndfile 1.1+)
        info['lufs'] = None

    onset = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset, sr=sr, hop_length=hop, start_bpm=120, units='time')
    tempo = float(np.atleast_1d(tempo)[0])
    if len(beats) < 8:
        raise ValueError('no steady beat found (fewer than 8 beats): pick a track with a clear pulse')
    # the beat period from the tracked beats themselves (more precise than the tempo estimate)
    period = float(np.median(np.diff(beats)))
    tempo = 60.0 / period
    # downbeats: the beat phase (of 4) that carries the most low end (kick, bass entries)
    spec = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    low = spec[freqs < 150].sum(axis=0)
    times = librosa.frames_to_time(np.arange(spec.shape[1]), sr=sr, hop_length=hop)
    at_beat = np.interp(beats, times, low)
    phase = int(np.argmax([at_beat[k::4].mean() for k in range(4)]))
    first = float(beats[phase])
    # a regular bar grid from the first downbeat (tracks for films are on a click; drift shows in the energies)
    bar = 4 * period
    starts = np.arange(first, len(y) / sr - bar * 0.5, bar)
    rms = []
    for a in starts:
        seg = y[int(a * sr):int((a + bar) * sr)]
        rms.append(20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-9))
    rms = np.array(rms)
    entries, breaks = [], []
    for i in range(1, len(rms)):
        jump = rms[i] - max(rms[max(0, i - 2):i])
        if jump >= 4:
            entries.append(dict(bar=i + 1, t=round(float(starts[i]), 3), jump_db=round(float(jump), 1)))
        drop = rms[i] - rms[i - 1]
        if drop <= -5:
            breaks.append(dict(bar=i + 1, t=round(float(starts[i]), 3), drop_db=round(float(drop), 1)))
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop).mean(axis=1)
    r, key, mode = estimate_key(chroma)
    info.update(bpm=round(tempo, 2), beat_s=round(period, 4), first_downbeat=round(first, 3), bars=len(starts),
                bar_starts=[round(float(a), 3) for a in starts], bar_db=[round(float(v), 1) for v in rms],
                loudest_bar=int(np.argmax(rms)) + 1 if len(rms) else None, entries=entries, breaks=breaks,
                key=f'{key} {mode}', key_confidence=round(r, 2))
    return info


def land(info, t_film, at, fps, entry=None, film=None):
    """Bed values that put an entry of the track on film time t_film (seconds); `at` is how score.json
    names that moment (a frame number or "@cue")."""
    if not info['entries']:
        return None, ['no entry (a bar 4 dB over the two before it) to land: use "at"/"from" by hand on a bar line']
    if entry is None:
        e = max(info['entries'], key=lambda x: x['jump_db'])
    else:
        e = next((x for x in info['entries'] if x['bar'] == entry), None)
        if e is None:
            return None, [f'no entry at bar {entry}; entries are at bars {[x["bar"] for x in info["entries"]]}']
    notes = []
    single = dict(file=info['file'], at=int(round(max(0.0, t_film - e['t']) * fps)), **{'from': round(max(0.0, e['t'] - t_film), 3)})
    edit = None
    d0 = info['first_downbeat']
    if e['t'] - d0 > t_film + 1e-3:  # the intro is longer than the film's way to the drop: cut on the bar line
        edit = [dict(file=info['file'], at=0, **{'from': d0, 'to': round(d0 + t_film, 3)}),
                dict(file=info['file'], at=at, **{'from': e['t']})]
    if single['at'] > 0 and not edit:
        notes.append(f'the track would start {single["at"] / fps:.1f} s into the film, with no music before it: land a later entry '
                     '(--entry), pick a track with a longer intro, or let a quiet synth intro carry the opening')
    if film:
        left = info['seconds'] - e['t']
        if left < film - t_film:
            notes.append(f'the track ends {film - t_film - left:.1f} s before the film does: end on its own ending, or pick a longer track')
    return dict(entry=e, single=single, edit=edit), notes


def main(argv=None):
    ap = argparse.ArgumentParser(description='Tempo, bars and entries of a music track, to edit it to a film.')
    ap.add_argument('track')
    ap.add_argument('--json', help='write the analysis here')
    ap.add_argument('--bpm', type=float, help="the film's BPM (src/timeline.ts): checked against the track")
    ap.add_argument('--land-at', help='film frame where the entry should land, or "@cue" (needs --cues)')
    ap.add_argument('--cues', help='out/cues.json: cue frames, fps and the film length')
    ap.add_argument('--fps', type=float, default=60.0, help='film frame rate when --cues is not given (default 60)')
    ap.add_argument('--entry', type=int, help='land this entry bar instead of the biggest one')
    ap.add_argument('--film', type=float, help="the film's length in seconds (default: from --cues)")
    a = ap.parse_args(argv)
    try:
        info = analyse(a.track)
    except Exception as err:  # noqa: BLE001
        print(f'track-info.py: {err}', file=sys.stderr)
        return 1
    status = 0
    print(f"{os.path.basename(a.track)}: {info['seconds']} s, {info['bpm']} BPM (beat {info['beat_s']} s), first downbeat "
          f"{info['first_downbeat']} s, {info['bars']} bars, key {info['key']} (r {info['key_confidence']}), "
          f"{info['lufs']} LUFS")
    print('  bar dB: ' + ' '.join(f'{i + 1}:{v:.0f}' for i, v in enumerate(info['bar_db'])))
    print('  entries: ' + (', '.join(f"bar {e['bar']} at {e['t']} s (+{e['jump_db']} dB)" for e in info['entries']) or 'none'))
    print('  breaks: ' + (', '.join(f"bar {b['bar']} at {b['t']} s ({b['drop_db']} dB)" for b in info['breaks']) or 'none'))
    if a.bpm:
        ratios = [info['bpm'] / a.bpm * k for k in (0.5, 1, 2)]
        off = min(abs(r - 1) for r in ratios)
        info['film_bpm'] = a.bpm
        if off > 0.01:
            print(f"  BPM: the film runs at {a.bpm:g}, the track at {info['bpm']:g} ({off * 100:.1f}% off): set the "
                  f"film's BPM to the track's (src/timeline.ts), or pick another track")
            status = 2
        else:
            print(f"  BPM: the film's {a.bpm:g} fits the track ({off * 100:.2f}% off)")
    if a.land_at is not None:
        fps, film, at = a.fps, a.film, a.land_at
        if a.cues:
            c = json.load(open(a.cues))
            fps = float(c.get('fps', fps))
            film = film or (c['total'] / fps if 'total' in c else None)
        if str(at).startswith('@'):
            if not a.cues or at[1:] not in c.get('cue', {}):
                print(f'track-info.py: {at} needs --cues with that cue', file=sys.stderr)
                return 1
            frame = float(np.atleast_1d(c['cue'][at[1:]])[0])
        else:
            frame = float(at)
            at = int(frame) if frame == int(frame) else frame
        res, notes = land(info, frame / fps, at, fps, a.entry, film)
        info['land'] = res
        if res:
            e = res['entry']
            print(f"  land bar {e['bar']} ({e['t']} s, +{e['jump_db']} dB) on {a.land_at} ({frame / fps:.3f} s):")
            print('    one segment: "bed": ' + json.dumps(res['single']))
            if res['edit']:
                print('    edit:        "bed": ' + json.dumps(res['edit']))
        for n_ in notes:
            print('  note: ' + n_)
    if a.json:
        os.makedirs(os.path.dirname(os.path.abspath(a.json)), exist_ok=True)
        json.dump(info, open(a.json, 'w'), indent=1)
    return status


if __name__ == '__main__':
    sys.exit(main())
