// Fixture. expect: serif=7
import '@fontsource-variable/newsreader';
import '@fontsource-variable/playfair-display';
import '@fontsource-variable/inter-tight'; // a sans: passes
export const FONT = {
  text: '"Newsreader Variable", Georgia, serif',
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
};
export const FACES = ['400 16px "Newsreader Variable"', '600 16px "Inter Tight Variable"'];
export const a = { fontFamily: 'Georgia' };
export const b = { fontFamily: '"Roboto Slab Variable"' };
export const c = { fontFamily: '"Libre Caslon Text", serif' };
export const ok = { fontFamily: '"Inter Tight Variable", system-ui, sans-serif' };
export const COPY = [{ id: 'l1', text: 'Times change.' }]; // copy, not a font list: passes
