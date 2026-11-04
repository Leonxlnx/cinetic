// Placeholders the layout audit fails in the render (lib/Audit.tsx): text that marks itself unfinished, grey bars
// standing in for text, and figures the kit draws where a real photo belongs. The word lists are the ones in
// scripts/placeholders.json, which lint-film.mjs (placeholder-copy) and copy-check.py (placeholder, --ui) read;
// scripts/test/placeholder.test.mjs keeps the two equal. Pure and Node-safe, no imports.

/** Matched anywhere in a string, on word boundaries, any case. */
export const PLACEHOLDER_WORDS = ['lorem', 'ipsum', 'dolor sit', 'placeholder', 'label text', 'sample text', 'sample copy', 'dummy text', 'dummy copy', 'text here', 'title here', 'headline here', 'copy here', 'name here', 'your text', 'your title', 'your headline', 'your copy', 'insert text', 'add text', 'type something', 'asdf', 'qwerty', 'foobar', 'john doe', 'jane doe', 'acme inc', 'tbd'] as const;
/** A whole string that is only a generic label. */
export const PLACEHOLDER_LABELS = ['label', 'text', 'heading', 'subheading', 'subtitle', 'caption', 'button', 'placeholder', 'lorem', 'foo', 'baz', 'xxx', 'untitled text'] as const;
/** A generic noun with a number and nothing else (Item 1, Card 3). */
export const PLACEHOLDER_NUMBERED = ['item', 'label', 'text', 'title', 'heading', 'card', 'feature', 'name', 'user', 'product', 'company', 'project', 'person', 'tile', 'image', 'photo', 'line'] as const;

const esc = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
const WORDS = new RegExp(`(?<![\\w-])(${PLACEHOLDER_WORDS.map(esc).join('|')})(?![\\w-])`, 'i');
const LABEL = new RegExp(`^\\s*(${PLACEHOLDER_LABELS.map(esc).join('|')})\\s*[.:]?\\s*$`, 'i');
const NUMBERED = new RegExp(`^\\s*(${PLACEHOLDER_NUMBERED.map(esc).join('|')})\\s*#?\\d{1,3}\\s*$`, 'i');
/** A content slot left in brackets ("[Product]", "[N] minutes"): a template's slot that was never filled. */
export const SLOT = /\[[A-Za-z][^\]\n]{0,40}\]/;

/** The placeholder a string shows (the word, or the whole string), or null. Brackets count with `slots`. Pure. */
export const placeholderIn = (s: string, o: { slots?: boolean } = {}): string | null => {
  const t = String(s ?? '').trim();
  if (!t) return null;
  const w = WORDS.exec(t);
  if (w) return w[1];
  if (LABEL.test(t) || NUMBERED.test(t)) return t;
  if (o.slots) {
    const b = SLOT.exec(t);
    if (b) return b[0];
  }
  return null;
};

/**
 * A grey bar standing in for a line of text (px at 1080p): a box with no text and no children, 4-40 px tall, at least
 * 2.5 times as wide as it is tall, rounded by a quarter of its height or more, filled in a near-neutral colour (OKLCH
 * chroma under 0.05). Two or more in a container that holds no text is the "lines of a paragraph" stand-in.
 */
export const BAR = { minH: 4, maxH: 40, ratio: 2.5, radius: 0.25, chroma: 0.05, cluster: 2 } as const;
export type BarBox = { w: number; h: number; radius: number; rgb: [number, number, number]; alpha: number };

/** OKLCH chroma of an sRGB colour (0..255 channels). Pure. */
export const chromaOf = ([r, g, b]: [number, number, number]) => {
  const lin = (c: number) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return Math.hypot(A, Bb);
};

/** Whether a box reads as a grey text bar, at layout unit U (1 at 1080p). Pure. */
export const isTextBar = (b: BarBox, U = 1): boolean => {
  const h = b.h / U;
  return b.alpha >= 0.3 && h >= BAR.minH && h <= BAR.maxH && b.w >= BAR.ratio * b.h && b.radius >= BAR.radius * b.h - 0.5 && chromaOf(b.rgb) < BAR.chroma;
};

/** The largest a figure the kit draws may show on screen (px at 1080p, its longer side) before it reads as a drawn person, product or place. */
export const DRAWN_MAX = { person: 72, product: 48, place: 48 } as const;
/** Whether a drawn figure of `kind` at w x h (film px) is too large to pass, at layout unit U. Pure. */
export const drawnTooLarge = (kind: string, w: number, h: number, U = 1): boolean => Math.max(w, h) / U > (DRAWN_MAX[kind as keyof typeof DRAWN_MAX] ?? DRAWN_MAX.product);
