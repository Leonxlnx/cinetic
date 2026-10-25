# Sound and timing

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

The rules that tie picture to sound: a breath before every reveal, one designed sound per event, one clock per film.

[Every visual event has its own designed sound](#every-visual-event-has-its-own-designed-sound) · [Choose the film's clock: onsets, subdivisions or a seconds grid](#choose-the-film-s-clock-onsets-subdivisions-or-a-seconds-grid) · [No low end until the reveal](#no-low-end-until-the-reveal) · [The music stops for a breath before the reveal](#the-music-stops-for-a-breath-before-the-reveal) · [Captions locked to the voice, picture a frame or two early](#captions-locked-to-the-voice-picture-a-frame-or-two-early) · [Whoosh run into a thud; the swap just before the kick](#whoosh-run-into-a-thud-the-swap-just-before-the-kick) · [A screen-fixed voice waveform under moving shots](#a-screen-fixed-voice-waveform-under-moving-shots)

### Every visual event has its own designed sound

`dv-one-sound-per-event` · workhorse · energy calm · any · primitive: recipe (plain layers)

Each appearance is voiced by one small sound matched to its kind: key ticks on headline words, a stab on the payoff, a shutter click on a bento cut, whooshes on whips, chat pops on bubbles and typing, dings on counters, water drops on reveals, a sub-drop leading a wipe by 3 f; the sound lands within a frame of the picture (often 1 frame early), not snapped to the beat. **When:** Every film with UI. **Avoid:** One sound per word (one per fragment); sounds that do not match the motion's kind.

- **Anatomy:** SFX +9 to +33 dB over the bed; whooshes lead their visual peaks by 2-4 f; risers lead by 0.1-0.2 s.
- **Timing:** Offsets -110 to +80 ms, median about -30 ms.
- **Sound:** This is the sound device.
- **Build:** Recipe: sync.ts cues from each primitive's declared frames (chainResolves, markerFrames, press at, seams).

### Choose the film's clock: onsets, subdivisions or a seconds grid

`dv-rhythm-grid-choice` · workhorse · energy calm · any · primitive: recipe (plain layers)

The edit picks one clock and keeps it: picture events on the drum's onsets rather than the bar grid; every shape event on an 8th-note arpeggio; structural hits on accents while words keep reading cadence; internal rhythms as subdivisions of the beat (letters every 8 f as triplets, every 6 f as 16ths, a 12 fps sprite); cuts on a quarter-second grid; or the voice decides and the edit sits near a tempo grid. **When:** Every film: decide the clock in the treatment. **Avoid:** Snapping words to the beat (words read on their own cadence).

- **Anatomy:** Onset offsets 0-2 f; subdivisions of a 24 f beat at 60 fps; cut grid multiples of 15 f.
- **Timing:** Whole film.
- **Sound:** The music defines the grid.
- **Build:** Recipe: timeline.ts BEAT and the onset list; place structural events on onsets, type on reading cadence.

### No low end until the reveal

`dv-held-drop` · workhorse · energy medium · launch, sting · primitive: recipe (plain layers)

The opening plays over near silence or a light, high bed (soft high clicks on each hard step, an arpeggio with no kick and no bass), and the full-band music enters exactly on the reveal frame and stays. **When:** Every launch film with a construction or build-up act. **Avoid:** Films that open on the product.

- **Anatomy:** Before the drop the bed is high-passed at about 200 Hz and the ticks sit at -45 to -32 dB with centroids at 3.5-7 kHz; at the drop the RMS rises 6-7 dB and the low band goes from about 1 % to about 30 % of the energy, within one frame of the reveal.
- **Timing:** The drop on the reveal frame, typically 4-6 s in.
- **Sound:** This is the sound device.
- **Build:** Timeline: mute the kick and bass stems until the reveal cue and schedule a tick on every hard step before it.

### The music stops for a breath before the reveal

`dv-stop-down-before-reveal` · workhorse · energy medium · any · primitive: recipe (plain layers)

The music drops out (or dips 7-10 dB) for 0.2-0.5 s right before each big transition or reveal, and the reveal lands on the returning hit; long silences (0.65-1.75 s) can sit under holds and before reveals; a background can change on the silence; the film's only hard cut can land on a voice onset inside a drop-out. **When:** Before every big reveal; two to five times per film. **Avoid:** Dips before small events (they lose their power).

- **Anatomy:** Drop to about -33 to -40 LUFS for 18-30 f; the hit on the reveal frame.
- **Timing:** 12-30 f dips; silences 40-105 f.
- **Sound:** This is the sound device: drop-out, then the hit.
- **Build:** Recipe: mark reveals in the timeline; the music ducker cuts the bed for 0.3 s before each.

### Captions locked to the voice, picture a frame or two early

`dv-voice-led-timing` · workhorse · energy calm · any · primitive: recipe (plain layers)

In a voiced film every caption lands within -0.27 to +0.03 s of its spoken word (the final caption cuts on exactly on the word), and the picture leads the voice by 1-4 frames. **When:** Voice-over films. **Avoid:** Captions that trail the voice.

- **Anatomy:** Caption onset = word onset - 2 f at 60 fps (house); cuts follow the voice.
- **Timing:** Leads 2-8 f at 60 fps.
- **Sound:** The voice.
- **Build:** Recipe: Words starts[] from the voice's word onsets minus 2 f.

### Whoosh run into a thud; the swap just before the kick

`dv-hit-placement` · accent · energy medium · any · primitive: recipe (plain layers)

A series of whooshes accompanies a collapse and an exit, then a heavy thud lands on the frame the title's letters land; a word swap is placed about 90 ms before the loudest kick, so the eye gets there first. **When:** Title landings; swaps on strong beats. **Avoid:** Thuds without a visual landing.

- **Anatomy:** Whoosh run about 36 f; thud +9 dB; swap 5 f before the kick at 60 fps.
- **Timing:** Run 36 f; lead 5 f.
- **Sound:** This is the sound device.
- **Build:** Recipe: cue the thud on the landing frame from Letters' letterFrames(); the swap at kick - 5 f.
- **Materials and numbers:** A kick roll builds under a pull-back (five kicks at 0.09-0.18 s intervals) and a bright water-drop sound (a sine sweep 900 -> 1600 Hz over 60 ms, fast decay, a little reverb) lands exactly as the button starts to separate.

### A screen-fixed voice waveform under moving shots

`dv-hud-waveform` · accent · energy calm · feature · primitive: recipe (plain layers)

A thin grey waveform with a tiny two-line caption stays fixed at the bottom centre while the camera whips and zooms underneath; its amplitude rises and falls like live audio and lies flat between phrases. **When:** Voice and call products; a narration cue without words on screen. **Avoid:** Films with captions.

- **Anatomy:** About 60 points across, low contrast (about 30 % white), a new noise phase per frame under an amplitude envelope; outside the camera transform.
- **Timing:** Active while the voice speaks, flat between.
- **Sound:** It follows the voice.
- **Build:** Recipe: an SVG polyline from noise(x, frame) times an envelope, placed outside the camera.
