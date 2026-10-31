// What the deck dealt for this film: scripts/deck.py writes this file (with out/DIRECTION.md, or alone with --creative)
// and src/deal.ts reads it first, so the sheet and the film never disagree. null: nothing dealt yet (deal.ts deals from
// the product's name). Never edit it by hand: re-deal with deck.py. The update film plays the deck's `creative` devices
// (fx/creative) on its change beats, each on the change it shows best, then the `reserve` in its order where a change
// still has none; from `deal` it takes the ground family (the direction's palette), the rest it deals from the name.
export const DEALT: { direction: string; deal: Record<string, string>; creative?: string[]; reserve?: string[] } | null = null;
