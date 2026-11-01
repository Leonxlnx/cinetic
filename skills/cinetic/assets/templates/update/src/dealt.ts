// What the deck dealt for this film: scripts/deck.py writes this file (with out/DIRECTION.md) and src/deal.ts reads it
// first, so the sheet and the film never disagree. null: nothing dealt yet (deal.ts deals from the product's name). Never
// edit it by hand: re-deal with deck.py. The update film takes the deck's world (`deal.ground`: the place it stands in)
// and its hero shots (`hero`, then `heroReserve`: each change takes the first one that can film it); the rest of its
// slots it deals from the name.
export const DEALT: { direction: string; deal: Record<string, string>; creative?: string[]; reserve?: string[]; hero?: string[]; heroReserve?: string[] } | null = null;
