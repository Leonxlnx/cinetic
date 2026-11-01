// When each hero shot's moments happen inside its beat: one source for the shots (src/hero/shots.tsx) and the sound
// plan (src/sync.ts), so a click is heard on the frame it is seen. Pure numbers of the beat's length and the film's rate
// (frames in the film's fps from the shot's first frame); no React, no content (a typed request fits its window: the
// typing rate follows the text). House numbers are f@60, converted.

/** f@60 to the film's rate (fractional). */
const k60 = (n: number, fps: number) => (n * fps) / 60;

export type HeroTimes = {
  /** the camera's one move: its first frame and its length */
  move: [number, number];
  /** the shot's own moments (typing, a press, arrivals, a landing), frames from its first frame */
  at: Record<string, number>;
  /** frames of each arrival (a stack, a row of cards), when the shot has a sequence */
  seq?: number[];
};

/**
 * The moments of shot `id` in a beat of `dur` frames. `lineWhole`: (over and line shots) the frame the line is whole,
 * from the shot's first frame. Every move starts, travels and lands inside the beat, front-loaded; the last 10 % of the
 * beat is a rest the seam out can carry.
 */
export const heroTimes = (id: string, dur: number, fps: number, lineWhole = 0): HeroTimes => {
  const f = (n: number) => k60(n, fps);
  const end = dur * 0.9;
  switch (id) {
    case 'glass-input': {
      // the glass rises as the line builds; the request types once the line is read; send, a band of light; the push
      // runs from the first frames and lands as the typing ends
      const rise = f(12);
      const land = rise + f(30);
      const type = Math.max(land + f(6), lineWhole + f(8));
      const send = Math.max(type + f(40), end - f(26));
      return { move: [f(4), Math.max(f(60), send - f(4))], at: { rise, land, type, typeEnd: send - f(14), send } };
    }
    case 'macro-type': {
      const type = f(26);
      const send = Math.max(type + f(70), end - f(22));
      return { move: [type - f(26), f(44)], at: { type, typeEnd: send - f(30), point: send - f(26), send } };
    }
    case 'black-glass': {
      // the pane racks in out of the dark (9 f), the camera's push lands, then the request types and sends
      const rack = f(2);
      const type = rack + f(30);
      const send = Math.max(type + f(46), end - f(18));
      return { move: [f(0), Math.min(dur * 0.72, f(110))], at: { rack, sharp: rack + f(10), glint: rack + f(14), type, typeEnd: send - f(12), send } };
    }
    case 'page-fly': {
      const fly = f(0);
      const land = f(30);
      return { move: [land - f(6), Math.max(f(60), end - land)], at: { fly, land, read: end - f(10) } };
    }
    case 'toast-stack': {
      // arrivals front-loaded: a quick run, then a longer gap before the last
      const n = 5;
      const first = f(8);
      const span = Math.max(f(60), dur * 0.62 - first);
      const seq = Array.from({ length: n }, (_, i) => first + span * Math.pow(i / (n - 1), 1.25));
      return { move: [f(0), Math.min(dur * 0.8, f(120))], at: { first, last: seq[n - 1] }, seq };
    }
    case 'fan-focus': {
      const enter = 0;
      const push = Math.min(dur * 0.24, f(40));
      return { move: [push, Math.min(f(84), end - push)], at: { enter, push, land: Math.min(end, push + f(84)) } };
    }
    case 'rise-behind': {
      const rise = Math.max(f(10), lineWhole - f(14));
      return { move: [rise, Math.min(f(90), end - rise)], at: { rise, land: Math.min(end, rise + f(70)) }, seq: [0, 1, 2].map((i) => rise + f(8) * Math.abs(i - 1)) };
    }
    case 'porthole': {
      const open = lineWhole + f(8);
      return { move: [open, f(26)], at: { open, full: open + f(26), soft: dur - f(6) } };
    }
    case 'carousel': {
      const crane = f(0);
      const len = Math.min(dur * 0.62, f(110));
      return { move: [crane, len], at: { crane, land: crane + len, settle: Math.min(end, crane + len + f(12)) } };
    }
    case 'push-press': {
      // the whole screen is read first (a third of the beat), then one push into the button lands as the pointer arrives
      const push = Math.max(f(12), dur * 0.3);
      const len = Math.min(f(62), dur * 0.38);
      const press = Math.min(end - f(10), push + len + f(8));
      return { move: [push, len], at: { push, point: push + len * 0.35, press } };
    }
    case 'logo-3d':
      return { move: [0, f(76)], at: { land: f(76) } };
    default:
      return { move: [0, Math.min(dur, f(60))], at: {} };
  }
};

/** The sound of a hero shot's moments (src/sync.ts adds the beat's start): what the picture does, on its frame. */
export type HeroSound = { f: number; kind: 'click' | 'pop' | 'swell' | 'whoosh' | 'land' | 'key' | 'suck'; weight: number; action: string; id: string; dur?: number; apexFrac?: number; pan?: number };
export const heroSounds = (id: string, dur: number, fps: number, lineWhole = 0): HeroSound[] => {
  const t = heroTimes(id, dur, fps, lineWhole);
  const a = t.at;
  const len = (n: number) => k60(n, fps);
  switch (id) {
    case 'glass-input':
      return [
        { f: a.land, kind: 'pop', weight: 0.4, action: 'card-land', id: 'glass-lands' },
        { f: a.send, kind: 'click', weight: 0.6, action: 'press', id: 'send' },
      ];
    case 'macro-type':
      return [
        { f: t.move[0], kind: 'swell', weight: 0.35, action: 'shape', id: 'macro-push', dur: len(44), apexFrac: 0.8 },
        { f: a.send, kind: 'click', weight: 0.6, action: 'press', id: 'send' },
      ];
    case 'black-glass':
      return [
        { f: a.rack, kind: 'swell', weight: 0.4, action: 'shape', id: 'focus-in', dur: len(30), apexFrac: 0.4 },
        { f: a.send, kind: 'click', weight: 0.6, action: 'press', id: 'send' },
      ];
    case 'page-fly':
      return [
        { f: a.fly, kind: 'whoosh', weight: 0.5, action: 'whip', id: 'page-flies-in', dur: len(30), apexFrac: 0.6 },
        { f: a.land, kind: 'land', weight: 0.45, action: 'card-land', id: 'page-lands' },
      ];
    case 'toast-stack':
      return (t.seq ?? []).map((f, i) => ({ f, kind: 'pop' as const, weight: i === (t.seq ?? []).length - 1 ? 0.55 : 0.4, action: 'appear', id: `toast-${i + 1}`, pan: i % 2 ? 0.12 : -0.12 }));
    case 'fan-focus':
      return [{ f: a.push, kind: 'swell', weight: 0.35, action: 'shape', id: 'fan-push', dur: len(60), apexFrac: 0.7 }];
    case 'rise-behind':
      return [{ f: a.rise, kind: 'swell', weight: 0.45, action: 'shape', id: 'cards-rise', dur: len(50), apexFrac: 0.7 }, { f: a.land, kind: 'land', weight: 0.4, action: 'card-land', id: 'reveal-lands' }];
    case 'porthole':
      return [{ f: a.open, kind: 'pop', weight: 0.5, action: 'appear', id: 'porthole-opens' }];
    case 'carousel':
      return [{ f: a.crane, kind: 'whoosh', weight: 0.5, action: 'whip', id: 'ring-turns', dur: len(40), apexFrac: 0.35 }, { f: a.land, kind: 'land', weight: 0.5, action: 'card-land', id: 'ring-lands' }];
    case 'push-press':
      return [{ f: a.push, kind: 'swell', weight: 0.3, action: 'shape', id: 'push-in', dur: len(50), apexFrac: 0.8 }, { f: a.press, kind: 'click', weight: 0.65, action: 'press', id: 'press' }];
    case 'logo-3d':
      return [{ f: 0, kind: 'swell', weight: 0.5, action: 'shape', id: 'mark-pulls-back', dur: len(80), apexFrac: 0.85 }];
    default:
      return [];
  }
};
