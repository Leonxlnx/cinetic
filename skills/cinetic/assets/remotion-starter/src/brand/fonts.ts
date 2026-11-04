// Local variable fonts, bundled with the film: no network at render time and every weight on
// the axis available. Browser-only (CSS imports and a style element), so only FontGate imports this file.
//
// cinetic:placeholder - Inter is the face set's default, the starter's stand-in, not a choice: deal the film's
// pairing with `npx tsx scripts/type-deal.ts --seed "<product name>"` (fx/TypePairs: a voice for the film's words and
// a text face for UI and captions, from the faces bundled in public/fonts), which writes FONT, FACES and TYPE in
// tokens.ts and deletes these lines; a brand's own face goes in with `node scripts/add-font.mjs <name>`.
// opsz.css: weight and optical size, so every film size (32 px and up) takes Inter's display cut.
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/geist-mono';
import { staticFile } from 'remotion';
import { fontFaceCss } from '../fx/TypePairs';

// The bundled faces (public/fonts, SIL OFL 1.1, licences in public/fonts/fonts.json): one @font-face per face and
// subset. A face downloads only when a line uses it, so registering all of them costs nothing at render time.
if (typeof document !== 'undefined' && !document.getElementById('cinetic-faces')) {
  const el = document.createElement('style');
  el.id = 'cinetic-faces';
  el.textContent = fontFaceCss((p) => staticFile(p));
  document.head.appendChild(el);
}
