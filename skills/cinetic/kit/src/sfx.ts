// Written by scripts/sfx.mjs get: the sounds in public/sfx (never committed). Credits: node scripts/sfx.mjs credits
export const sfx = {
  'mixkit-168': { src: 'sfx/mixkit-168.wav', leadMs: 324 }, // whoosh.short: Fast air sweep transition
  'mixkit-175': { src: 'sfx/mixkit-175.wav', leadMs: 460 }, // whoosh.short: Short transition sweep
  'mixkit-1492': { src: 'sfx/mixkit-1492.wav', leadMs: 1088 }, // whoosh.medium: Cinematic whoosh fast transition
  'mixkit-2568': { src: 'sfx/mixkit-2568.wav', leadMs: 0 }, // click.soft: Cool interface click tone
  'mixkit-3124': { src: 'sfx/mixkit-3124.wav', leadMs: 0 }, // click.soft: Modern technology select
  'mixkit-2533': { src: 'sfx/mixkit-2533.wav', leadMs: 2 }, // key: Single key type
  'mixkit-2299': { src: 'sfx/mixkit-2299.wav', leadMs: 3 }, // sub: Short bass hit
  'mixkit-2867': { src: 'sfx/mixkit-2867.wav', leadMs: 0 }, // notification: Confirmation tone
  'mixkit-3000': { src: 'sfx/mixkit-3000.wav', leadMs: 1 }, // pop: Liquid bubble
  'mixkit-784': { src: 'sfx/mixkit-784.wav', leadMs: 258 }, // reverse: Reverse cinematic impact trailer
  'mixkit-790': { src: 'sfx/mixkit-790.wav', leadMs: 2450 }, // riser: Cinematic trailer riser
  'mixkit-2384': { src: 'sfx/mixkit-2384.wav', leadMs: 8 }, // paper: Paper quick slice
  'mixkit-1049': { src: 'sfx/mixkit-1049.wav', leadMs: 8 }, // tick: Retract clock mechanism
} as const;
