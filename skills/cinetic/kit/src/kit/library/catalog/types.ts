// The motion library's catalogue types. The entries live one file a category (catalog/<category>.ts) and are merged
// in catalog/index.ts: the single source of truth for finding a piece and for the section docs (scripts/library-docs.mjs
// writes their tables from it). A reel's segment list (src/films/library/Reel*.tsx) plays the pieces; library-docs.mjs
// --check verifies that every own reel range here matches its segment there.
//
// Find a piece: node scripts/frames.mjs library [--category turn] [--purpose join] [--subject card] [--mood calm]
//               node scripts/frames.mjs library --show DiveInto      (one entry in full, its import, its strip command)
//               node scripts/frames.mjs library --strip DiveInto     (its frames from its reel, in one still)
// Add a piece:  references/library.md#how-to-add-a-piece

/** What kind of piece it is; each category is a folder of src/kit/library and a section file references/library-<category>.md. */
export type Category = 'type' | 'turn' | 'fx' | 'camera' | 'ui' | 'host' | 'object' | 'ground' | 'design';
/** What it does in a film. */
export type Purpose = 'enter' | 'exit' | 'join' | 'emphasis' | 'idle' | 'loop' | 'build';
/** What it acts on. */
export type Subject =
  | 'line'
  | 'word'
  | 'letter'
  | 'number'
  | 'card'
  | 'list'
  | 'window'
  | 'phone'
  | 'photo'
  | 'frame'
  | 'icon'
  | 'logo'
  | 'button'
  | 'pointer'
  | 'control'
  | 'page'
  | 'code'
  | 'canvas'
  | 'shape'
  | 'scene'
  | 'layer'
  | 'mark'
  | 'device'
  | 'pattern'
  | 'texture'
  | 'palette'
  | 'type';
/** The voice it speaks in. */
export type Mood = 'calm' | 'bold' | 'playful' | 'technical' | 'editorial';

export type LibraryEntry = {
  /** The exported component, as a film imports it. */
  name: string;
  category: Category;
  purpose: Purpose[];
  subject: Subject[];
  mood: Mood[];
  /** Its typical length in frames at 30 fps (the move itself; a hold after it is the film's). */
  frames: number;
  /** One line: what it looks like. */
  summary: string;
  /** One line: when to reach for it. */
  use: string;
  /** One line, or empty. */
  caution: string;
  /**
   * Where the reels play it: frames `from`..`to` of the registered film `film`, the same as its segment in that reel's
   * segment list (`from` and `from + dur - 1`). A piece seen inside another piece's segment names it in `shownIn` and
   * gives a range inside that segment.
   */
  reel: { film: string; from: number; to: number; shownIn?: string };
};
