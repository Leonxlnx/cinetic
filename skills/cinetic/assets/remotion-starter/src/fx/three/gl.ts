// Which GL a page gets, read once: 'gpu' (hardware WebGL), 'software' (SwiftShader, llvmpipe, WARP: three.js at 1080p
// would take seconds a frame) or 'none' (no context at all). Every part in fx/three draws its clean 2D fallback unless
// the tier is 'gpu'; `gl="force"` renders 3D on software GL too (slow, for a check), `gl="fallback"` always draws 2D.
// Node-safe: without a document the tier is 'none'. Pure per machine: the same page always gets the same tier.

export type GlTier = 'gpu' | 'software' | 'none';
/** 'auto' (3D on a GPU, 2D otherwise), 'force' (3D whenever a context exists), 'fallback' (always the 2D drawing). */
export type GlMode = 'auto' | 'force' | 'fallback';

const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|warp/i;
let tier: GlTier | null = null;

/** The page's GL tier, probed once with a throwaway context (released at once). */
export const glTier = (): GlTier => {
  if (tier) return tier;
  if (typeof document === 'undefined') return 'none';
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return (tier = 'none');
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const name = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    const halfFloat = !!(gl as WebGL2RenderingContext).getExtension?.('EXT_color_buffer_float') || !!gl.getExtension('EXT_color_buffer_half_float');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    tier = SOFTWARE.test(name) ? 'software' : halfFloat ? 'gpu' : 'none';
  } catch {
    tier = 'none';
  }
  return tier;
};

/** True when a part draws in 3D under `mode`. */
export const draws3D = (mode: GlMode = 'auto'): boolean => {
  if (mode === 'fallback') return false;
  const t = glTier();
  return mode === 'force' ? t !== 'none' : t === 'gpu';
};
