// The last three films' choices for the dealt slots, newest first. new-film.sh writes them from the film history
// (~/.cinetic/film-history.json; scripts/film-diff.mjs --history lists it) and src/deal.ts leaves them out while another
// choice is free, so no two films in a row share a ground family, a hook, a first arrival, a recap, an end card or a
// voice. Empty: a first film.
export const RECENT: Partial<Record<'voice' | 'ground' | 'hook' | 'arrive' | 'recap' | 'end', readonly string[]>> = {};
