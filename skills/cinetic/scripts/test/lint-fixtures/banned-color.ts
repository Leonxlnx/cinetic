// Fixture for scripts/test/lint-film.test.mjs. expect: banned-color=13
// Every banned OKLCH region fires; the allowed families (red, green, teal, blue, yellow) and
// neutral or cool papers pass.
export const BANNED = {
  redOrange: '#F2461E', // h 34: vermilion, orange band
  vermilion: '#E14921', // h 35
  orange: '#FFA500', // h 71
  amber: '#FFBF00', // h 84
  brass: '#DBB155', // h 85
  beige: '#F5F0E6', // L 0.96, C 0.014, h 85: a beige paper
  cream: '#FFF8E7', // C 0.024, h 88
  indigo: '#4F46E5', // h 277
  violet: '#7C3AED', // h 293
  neonGreen: '#39FF14', // L 0.87, C 0.29
  cyan: '#00FFFF', // L 0.91, C 0.155
  asRgba: 'rgba(242, 70, 30, 0.5)', // the red-orange again, as rgba
  asOklch: 'oklch(0.72 0.16 60)', // an orange written in OKLCH
};
export const ALLOWED = {
  tesselRed: '#EC2A3A', // h 24
  pureRed: '#FF0000', // h 29
  keelRed: '#C92F33', // h 25
  green: '#08965A',
  sage: '#6FC5A1',
  teal: '#018D87',
  blue: '#1F86CD',
  royalBlue: '#4169E1', // h 266: still blue
  yellow: '#EBD235', // h 100, L 0.86: a yellow on ink, not neon
  coolPaper: '#F5F6F7',
  redTintedPaper: '#F9F6F6',
  ink: '#0D0E10',
  warmInk: '#120E0E',
};
