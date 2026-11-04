// Light and material: glass that frosts the world behind it, rims and sweeps that face the world's key, pools of light,
// type that is itself a light, and a cheap bloom. Inside a <World> (fx/world) every part reads its light from there.
export { Glass, GLASS_LIGHT, glassState, type GlassProps } from './Glass';
export { Bloom, brightPass, GLOW_LIGHT, GlowPool, GlowType, igniteState, poolUrl, type BloomProps, type GlowPoolProps, type GlowTypeProps } from './Glow';
export { LightSweep, RIM_LIGHT, RimLight, rimGradient, type LightSweepProps, type RimLightProps } from './Rim';
export * from './light';
