// The logo, parsed into parts for LogoMark, AssembledMark and Lockup. scripts/brand.py writes this file from a
// supplied SVG logo (or records a raster one). Until then the end card draws the template's stand-in: the product's own
// element as a mark (src/product.tsx HERO_MARK: the scaffold's is the result's progress ring closed into a disc with a
// check cut through it, the element the last picture flies into the lockup), or, without one, a letter mark (the name's
// first letter on a lit tile, acts/stage.tsx LetterMark). Never a sparkle, a star or an AI glyph as a placeholder mark:
// an invented brand gets a mark of its own (references/brand-and-color.md), built from its own element, on purpose.
// cinetic:placeholder - the template's stand-in mark: run scripts/brand.py with the brand's SVG, or keep the element mark on purpose and delete this line.
import { type Logo, logoParts, SAMPLE_MARK_SVG } from './Mark';

/** The end card draws the letter mark while this is true (brand.py writes this file without it). */
export const LOGO_STANDIN = true;
export const LOGO_SVG = SAMPLE_MARK_SVG;
export const LOGO = logoParts(LOGO_SVG, { split: 'ids' });
export const LOGO_PARTS = ['A', 'B', 'D'];
export const WORDMARK_SVG: string | null = null;
export const WORDMARK: Logo | null = null;
export const LOGO_RASTER: string | null = null;
