// Local variable fonts, bundled with the film: no network at render time and every weight on
// the axis available. Browser-only (CSS imports), so only FontGate imports this file.
//
// cinetic:placeholder - Inter is the face set's default (the neutral look, scripts/faces.json), not yet a
// choice for this brand. Pick the look (references/copy-and-type.md §6) and vendor its face with
// `node scripts/add-font.mjs <name>`, which imports it here and sets FONT and FACES in tokens.ts; keep Inter
// on purpose (the neutral look) by deleting these lines and writing the look in TREATMENT.md.
// opsz.css: weight and optical size, so every film size (32 px and up) takes Inter's display cut.
import '@fontsource-variable/inter/opsz.css';
import '@fontsource-variable/geist-mono';
