// The logo, parsed into parts for LogoMark, AssembledMark and Lockup. scripts/brand.py writes this file from a
// supplied SVG logo (or records a raster one). Until then the end card draws the template's stand-in, a letter mark:
// the name's first letter in the film's face on a lit tile in the hero element's colour (acts/stage.tsx LetterMark),
// the element the last picture carries into the lockup. Never a sparkle, a star or an AI glyph as a placeholder mark:
// an invented brand gets a mark of its own (references/brand-and-color.md) or keeps the letter mark on purpose.
// cinetic:placeholder - the template's stand-in mark: run scripts/brand.py with the brand's SVG, or keep the letter mark on purpose and delete this line.
import { type Logo, logoParts, SAMPLE_MARK_SVG } from './Mark';

/** The end card draws the letter mark while this is true (brand.py writes this file without it). */
export const LOGO_STANDIN = true;
export const LOGO_SVG = SAMPLE_MARK_SVG;
export const LOGO = logoParts(LOGO_SVG, { split: 'ids' });
export const LOGO_PARTS = ['A', 'B', 'D'];
export const WORDMARK_SVG: string | null = null;
export const WORDMARK: Logo | null = null;
export const LOGO_RASTER: string | null = null;
