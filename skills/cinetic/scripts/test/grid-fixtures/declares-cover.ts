// Fixture for scripts/test/grid-check.test.mjs. expect: declares-cover=4 scene-length=1
// args: --cues declares-cover.cues.json
// What the primitives declare about themselves (cues.json declared.fx) against what the timeline
// declares: a snap zoom's seam and flash are covered; a collage stepping at 16 fps inside a 12 fps
// range, a flick's camera blur in a crisp film with no CAMERA_BLUR, a pop's 2-frame flash and a
// card's morph seam that the timeline never declares are not.
export const FPS = 60;
export const BPM = 100;
export const PACE_NAME = 'calm';
export const TAIL = 60;
export const TOTAL = 576 + TAIL;
export const ACT = { film: { from: 0, dur: TOTAL } };
export const CUE = {
  open: 0, a: 54, b: 108, zoom: 144, c: 207, d: 261, e: 315, f: 369, g: 423, h: 477, i: 531, end: 576,
};
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const SEAMS = [{ at: 144, kind: 'snapZoom', carry: 'scale' }];
export const STEPPED = [{ from: 300, to: 360, fps: 12, id: 'collage' }];
export const FLASHES = [{ f: 144, frames: 1, id: 'zoom-flash' }];
export const CAMERA_BLUR = [];
export const COPY = [];
