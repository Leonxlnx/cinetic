// What the deck dealt for this film: scripts/deck.py writes this file with out/DIRECTION.md when it deals a direction
// in this project, and src/deal.ts plays it instead of a deal of its own, so the sheet and the template never
// disagree. null: no direction dealt yet (deal.ts deals from the product's name). Never edit it by hand: re-deal with
// deck.py (--redraw). `deal`: the slots (voice, ground); the rest of what the deck writes is read by its sheet only.
export const DEALT: { direction: string; deal: Record<string, string>; creative?: string[]; reserve?: string[]; hero?: string[]; heroReserve?: string[] } | null = null;
