// The last three films' choices for the dealt slots, newest first. new-film.sh writes them from the film history
// (~/.cinetic/film-history.json; scripts/film-diff.mjs --history lists it) and src/deal.ts leaves them out while another
// choice is free, so no two films in a row share a world, a hook, an arrival, an end card or a voice. `hero` (the hero
// shots each recent film played, newest first) weighs those shots down in the name's deal. Empty: a first film.
export const RECENT: Partial<Record<'voice' | 'ground' | 'hook' | 'arrive' | 'end', readonly string[]>> & { hero?: readonly (readonly string[])[]; creative?: readonly (readonly string[])[] } = {};
