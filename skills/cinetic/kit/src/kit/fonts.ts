// Fonts are local packages (no network at render time). Imported once by the kit.
// One voice per film (inter by default, geist or a brand's serif when the brand asks for it); mono for code and data only.
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/inter/opsz-italic.css';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource-variable/newsreader/opsz.css';
import '@fontsource-variable/newsreader/opsz-italic.css';
import '@fontsource-variable/caveat';

export const fonts = {
  /**
   * The voice of nearly every film: statements and UI, in one family. Optical sizing is on, so a large line renders in
   * Inter's display cut. Statements at weight 430-550, sentence case, tracking -0.015 em (80-130 px) to -0.03 em (above).
   */
  inter: 'Inter Variable, Inter, sans-serif',
  /** A tighter, technical grotesk for a developer brand that wants it: then it is the whole voice, never mixed into a line of inter. */
  geist: 'Geist Variable, Geist, sans-serif',
  /** Code and data only (commands, file names, numbers in a terminal), as written: never a statement, never uppercase labels. */
  mono: 'Geist Mono Variable, ui-monospace, monospace',
  /**
   * A serif only with a reason: the brand's own voice is a serif (then every statement is in it, UI stays in inter) or a
   * wordmark. Never a decorative accent by habit. Weight 400-600, tracking 0 to -0.01 em.
   */
  serif: 'Newsreader Variable, Georgia, serif',
  /** Handwriting inside a product only (a sketch on a napkin, a note in a margin). Never for statements. */
  hand: 'Caveat Variable, Caveat, cursive',
} as const;
