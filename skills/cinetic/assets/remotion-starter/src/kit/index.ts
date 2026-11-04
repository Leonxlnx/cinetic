// The product kit: real UI parts built at film size and lit by the house key, showing the film's own content.
// Use it to rebuild the brand's product for the film: pass the brand's own strings, numbers and pictures. A part
// given none draws its empty state and reports kit-empty (gate.tsx: a warning in dev, an error under the ship
// gate); it never falls back to sample content. The kit's samples sit behind sample() (sample.ts), for its gallery
// and tests only, and copy-check.py fails their strings in a film.
// The film's one full-frame product moment (moment.tsx) puts a panel in use at full size on a flat field.
// Real marks of the products it works with (logos.tsx) come from scripts/logos.mjs; generic glyphs from icons.ts.
// A product screen is dense (dense.tsx: 25+ small real strings, one line lifted and readable) and fed by the film's own
// world (data.ts filmWorld); people are crafted portraits (avatars.tsx); ring, wall and ticker nodes are content tiles
// (tiles.tsx) carrying the film's own items.
// A phone or a laptop is a lit object (device.tsx: body, rim, glass and glare, contact shadow, reflection), never an outline.
// The data a paused frame is checked against (real.ts): dates from the film's own day, counts that are their rows,
// waveforms from the track, thumbnails from distinct moments, a cast that varies across beats (scripts/data-check.mjs).
// Macro screens (screens/, imported from './kit/screens'): fifteen dense product screens built for a camera that pushes
// in 3-4x, each exposing its focus boxes, fed by src/content.ts that scripts/content.mjs writes from the brief
// (references/product-ui.md §15).
export * from './avatars';
export * from './data';
export * from './dense';
export * from './flow';
export * from './gate';
export * from './icons';
export * from './logos';
export * from './moment';
export * from './panels';
export * from './parts';
export * from './real';
export * from './sample';
export * from './theme';
export * from './tiles';
export * from './device';
export * from './card';
