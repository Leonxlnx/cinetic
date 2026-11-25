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
  'kenney-rpg-footstep05': { src: 'sfx/kenney-rpg-footstep05.ogg', leadMs: 14 }, // impact: RPG Audio: footstep05
  'kenney-rpg-footstep04': { src: 'sfx/kenney-rpg-footstep04.ogg', leadMs: 29 }, // impact: RPG Audio: footstep04
  'kenney-rpg-cloth1': { src: 'sfx/kenney-rpg-cloth1.ogg', leadMs: 131 }, // whoosh.short: RPG Audio: cloth1
  'kenney-rpg-cloth3': { src: 'sfx/kenney-rpg-cloth3.ogg', leadMs: 51 }, // paper: RPG Audio: cloth3
  'kenney-rpg-handlesmallleather': { src: 'sfx/kenney-rpg-handlesmallleather.ogg', leadMs: 71 }, // paper: RPG Audio: handlesmallleather
  'kenney-interface-bong_001': { src: 'sfx/kenney-interface-bong_001.ogg', leadMs: 0 }, // click.soft: Interface Sounds: bong 001
  'kenney-interface-click_001': { src: 'sfx/kenney-interface-click_001.ogg', leadMs: 0 }, // click.soft: Interface Sounds: click 001
  'kenney-interface-click_003': { src: 'sfx/kenney-interface-click_003.ogg', leadMs: 0 }, // click.soft: Interface Sounds: click 003
  'kenney-interface-switch_001': { src: 'sfx/kenney-interface-switch_001.ogg', leadMs: 0 }, // click.soft: Interface Sounds: switch 001
  'kenney-interface-tick_001': { src: 'sfx/kenney-interface-tick_001.ogg', leadMs: 0 }, // tick: Interface Sounds: tick 001
  'mixkit-1491': { src: 'sfx/mixkit-1491.wav', leadMs: 296 }, // whoosh.short: Arrow whoosh
  'mixkit-1487': { src: 'sfx/mixkit-1487.wav', leadMs: 135 }, // whoosh.short: Dagger woosh
  'mixkit-2070': { src: 'sfx/mixkit-2070.wav', leadMs: 1 }, // impact: Light impact on the ground
} as const;
