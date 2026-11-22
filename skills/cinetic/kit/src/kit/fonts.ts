// Fonts are local packages (no network at render time). Imported once by the kit.
// Pick ONE display face for the film's voice; Inter for UI; a mono for labels and code.
import '@fontsource-variable/inter';
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
import '@fontsource/instrument-serif/400.css';
import '@fontsource/instrument-serif/400-italic.css';

export const fonts = {
  /** Clean and neutral at every size: UI and most statements. */
  inter: 'Inter Variable, Inter, sans-serif',
  /** A tighter, more technical grotesk: dev tools, AI products. */
  geist: 'Geist Variable, Geist, sans-serif',
  /** Labels, captions, code, data. */
  mono: 'Geist Mono Variable, ui-monospace, monospace',
  /** An editorial serif with a beautiful italic: creative or human products, one accent word. */
  serif: 'Instrument Serif, Georgia, serif',
} as const;
