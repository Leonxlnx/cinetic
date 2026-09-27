// Local variable fonts, bundled with the film: no network at render time and every weight on
// the axis available. Browser-only (CSS imports), so only FontGate imports this file.
//
// cinetic:placeholder - Geist is the starter's stand-in, not a choice. Pick the family for this
// brand's personality (references/brand-and-color.md §2) and vendor it with
// `node scripts/add-font.mjs <name>`, which imports it here and sets FONT and FACES in tokens.ts
// (references/copy-and-type.md §6). Keep Geist only if you chose it for this brand, and say why.
import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';
