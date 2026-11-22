// The real marks this film shows: written by scripts/logos.mjs from public/logos/logos.json, which keeps each mark's
// source, licence and trademark owner. Do not edit by hand: node scripts/logos.mjs get <name> adds a mark.
// Use one with the kit: <Brand name="<slug>" file={LOGOS['<slug>'].files.mark.src} /> (or .white / .black on dark and light).
export type LogoFile = { src: string; aspect: number };
export type LogoEntry = { name: string; tone: string; tile: string; files: Partial<Record<'mark' | 'markDark' | 'wordmark' | 'wordmarkDark' | 'mono' | 'white' | 'black', LogoFile>> };

export const LOGOS: Record<string, LogoEntry> = {
  "google-docs": { name: "Google Docs", tone: "colour", tile: "none", files: { mark: { src: "logos/google-docs.svg", aspect: 0.727 }, white: { src: "logos/google-docs.white.svg", aspect: 0.727 }, black: { src: "logos/google-docs.black.svg", aspect: 0.727 } } },
};
