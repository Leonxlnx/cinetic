#!/usr/bin/env node
/**
 * lint-film.mjs: static bans for a cinetic film (Remotion src/ or a HyperFrames project).
 *
 * Catches the code patterns that render wrong or read as generated before anything is rendered:
 *   css-animation     CSS transition/animation, @keyframes, animate-* classes (they do not render
 *                     frame-by-frame: everything must be a function of the frame)
 *   nondeterminism    Math.random, Date.now, performance.now, new Date() (renders must repeat)
 *   will-change-blur  willChange in a file that animates filter: blur() (stale ghost frames)
 *   frame-left-top    left/top/right/bottom driven by the frame (pixel-snapped stairs; use transform)
 *   raw-easing        Easing.bezier / cubic-bezier / Easing.spring|elastic|bounce|back outside lib/anim.ts
 *   spring-config     inline {damping, stiffness} spring configs outside lib/anim.ts (use SPR tokens)
 *   interpolate-clamp interpolate() without extrapolateLeft AND extrapolateRight 'clamp' (it extends)
 *   off-token-color   hex colours not declared in the tokens file; other colour literals (warning)
 *   gradient-low-span opaque gradients spanning < 30 code values (they band in 8 bit; use a dithered PNG)
 *   premount          premountFor is a no-op in renders and ignored with layout="none" (warning)
 *   clip-text         a gradient clipped to text (background-clip: text) on a box with no padding: the clip is the
 *                     element box, so g, p and y lose their descenders at line-height 1 (warning; spread fx/HueSweep
 *                     clipText(), or pad .18em 0 .32em with a -.18em margin)
 *   svg-text          an SVG <text> in an act: under a CSS transform (a camera, a scale, a 3D turn) Remotion's
 *                     Chrome draws it at the wrong size and place (warning; set type as HTML placed by its
 *                     baseline, keep SVG for paths)
 *   inbrowser-blur    CameraMotionBlur / HtmlInCanvasMotionBlur / Trail (8-bit accumulation; use render.sh --blur)
 *   remote-font       font packages or stylesheets fetched over the network (ship local variable fonts)
 *   hf-*              HyperFrames: gsap .from(), repeat: -1, <br>, <audio> without id
 *   stock-plate       (film-wide) a photo world (public/plates/) whose subject (its licence record's title and tags, its
 *                     plate kind, its name) shares no word with BRIEF.md: a mood plate under a film about something else
 *                     reads as random stock (warning; a photo is a world only when it is the story's place, input or people)
 *   placeholder       a `cinetic:placeholder` marker is still in the source: the starter's stand-in
 *                     palette, typeface, mark or name was never replaced (error; the film would look
 *                     like every other starter film). Invent the brand or apply the user's, choose the
 *                     family on purpose, then delete the marker. Markers in HTML/CSS comments count.
 *
 * Text flow (warnings; --strict makes them fail). Calm films arrive as fragments: copy that escapes
 * COPY escapes every timing check, and springs or per-letter tricks on type read as gimmicks.
 *   copy-literal      on-screen text of 2+ words written in an act (JSX text, a {'string'} child,
 *                     a text/label/title/caption/line prop, a words={['...']} list, or one word per
 *                     element in sibling elements that together read 2+ words) instead of read from
 *                     COPY through copy() / chainOf(): grid-check never sees its words, hold or
 *                     fragments.
 *                     Acts are files under an acts/ folder or named Act*, Scene*, Shot*
 *   text-spring       an overshooting spring (spr() with SPR.snap/pop/land/word/detent/micro, or
 *                     spr()'s snap default, or spring() with such a config or none) driving an
 *                     element that carries data-text or a text component (Words, MaskRise, Chain,
 *                     TypeOn, Scramble, Roll), followed through the declarations by name (object
 *                     keys, strings and .property names do not carry it); or any element given an
 *                     overshooting preset as a cfg/config/spring prop whose children are text (JSX
 *                     text, a string, copy(...)): type eases in or rides SPR.calm. Which presets
 *                     overshoot is read from the project's lib/anim.ts (damping < 2*sqrt(k*m))
 *   text-pace         in a calm film (PACE_NAME 'calm' in the nearest timeline.ts), <Words> or
 *                     <MaskRise> given stagger < 10, dur < 29 or outDur < 16 frames (60 fps; a 1.1
 *                     pace: 8, 24, 18): the crisp tempo inside a calm film (pass pace={PACE.crisp})
 *   typing-rate       <TypeOn cps> above 45 (a person types 19-45 a second, house 30) or under 15,
 *                     kind="stream" above 150, or a hand-rolled type-on (.slice(0, n) / substring
 *                     with n growing with the frame, followed through the names it is built from)
 *                     faster than 45 characters a second
 *   per-letter        a string split into letters (.split(''), or [...x] / Array.from(x) where x is
 *                     a string: declared from a string or copy(), typed string, a .text, or named
 *                     text/word/label/title/...) and mapped into animated spans outside fx/ and
 *                     lib/: animate words or whole fragments; the one hero word may keep it
 *                     (// lint-ok: hero word)
 *
 * Grammar (the house motion and look grammar; warnings unless marked error). Acts and other film files;
 * the primitives in fx/ and lib/ are gated by their own curve tests. Roles, deprecated names and spring
 * presets are read from the project's lib/anim.ts (or motion.js), the look from timeline.ts LOOK.
 *   ease-family       error: enter() / leave() / move(), a word's `ease` and any `exitEase` given a
 *                     curve of another role (arrive / reposition / leave); warn: a move under 1 s that
 *                     starts and stops on E.linear (linear is for drift, creep, lmix zooms, colour)
 *   token-drift       a house token in the motion file whose samples at t = .1 ... .9 leave the house
 *                     band at more than 2 points: a retuned curve gets a new name
 *   whip-shape        error: a whip token that peaks before t = .5 (a whip builds long, brakes short)
 *   spring-budget     underdamped springs on 2 element classes (warn), 3 or more (error); a use's class is
 *                     its `// spring: <class>` tag, else its preset (timeline.ts SPRING_CLASS names it)
 *   spring-range      a preset under zeta 0.45 or over 19 % overshoot (swing, drop and wheel excepted)
 *   scale-from-zero   an entrance scaled up from 0 (a tween, spring or mix from ~0): start oversized
 *   fade-exit         a statement fading out over more than 12 f@60 with no move in the same style
 *   linear-opacity    type opacity on E.linear
 *   linear-motion     error: a transform, position, scale, rotation, camera, blur or opacity at a constant rate:
 *                     interpolate() without an easing option, E.linear, a raw frame ratio (frame / n, frame * k) or a
 *                     house scene's raw span() ramp reaching a moving property, or a scale tweened in value space over
 *                     a ratio of 1.6 or more (zoom in log space: zoomAt() or lmix()). Film code, templates and house
 *                     scenes (fx/, lib/ and kit/ keep their own curve tests); a true live rate (a clock, a real-time
 *                     progress bar, a counter's rate, a constant ambient drift) keeps // lint-ok: <reason>
 *   crossfade         error: two full-frame layers dissolving into each other over more than 8 f@60
 *                     (unknown length: warn); a UI dissolve carries data-ui
 *   shutter           SHUTTER in blur.ts outside 120-180 degrees
 *   blur-on-crisp     LOOK.blur 'crisp' and blurred type entrances (a focus-in word: // focus-in)
 *   pure-ink          error: a #000 colour token; warn: a #FFF ground without LOOK.whiteWorld
 *   accent-count      error: a second saturated hue (C >= 0.06) outside a 30-degree band; tokens that
 *                     live in imagery or one product state carry an `imagery` / `ui-state` comment
 *   gradient-shape    gradient stops more than 7 degrees of hue apart (stage light is one hue)
 *   type-role         in an act: a fontSize that is not a TYPE role of either family (lib/look.ts TYPE_LOOK: calm,
 *                     the default, and bold); more than 2 non-UI roles
 *   deprecated-token  a 1.1 easing, spring or type name (kept, with its 1.1 shape): the 1.2 name to use
 *   timeline-constant error: FPS, W, H or COPY imported from the timeline in fx/ or lib/ (lib/film.ts
 *                     excepted): primitives read the film context
 *   gpu-cost          blurs over 40 px, more than 2 blurred layers in a file, an SVG filter animated by
 *                     the frame, backdrop-filter, a 1.2 chain holding more than 24 word layers
 *
 * Continuous motion (warnings; forensics.py's motion gates measure the render). Outside fx/ and lib/:
 *   snap-step         a one-frame snap primitive (HardStep, hardStepState, stepValue, snapBox; SnapZoom,
 *                     snapZoomState; LineSnap, scaleSnapState, makeRoomState, Chain snapLast or recentre
 *                     'room') that src/sync.ts does not declare (its declares()) and the timeline's code
 *                     does not name (comments do not count): glide it (fx/GlideStep, lib/continuity glideValue, glideBox); and more than one
 *                     snap device in the film, declared or not (a film keeps one)
 *   camera-float      an always-on float or drift (errors): the removed float's options (withLocks, lockOn,
 *                     dipAmp, settleAmp, a FloatOpts with seed / amp / omega / push / locks), or a creep over
 *                     0.2 px/f@60 (holdDrift px, glideList drift): the camera is still unless a shot declares a
 *                     move that starts, travels and lands (lib/drift stageMove, lib/camera camPath)
 *   idle-bob          an idle loop on a position, scale or turn (errors): a sine or cosine of the frame (or
 *                     lib/drift breathe) driving a translate, rotate or scale, or a lit panel's sway given as
 *                     an object (fx/Lit, kit devices): UI moves only when it enters, changes state or leaves
 *   card-tilt         a card tilted at rest (errors): a constant tilt={{ x, y }} or tilt: { x, y } (outside an
 *                     entry's from), a constant rotateX(..deg) / rotateY(..deg), a depth item's constant rot, a
 *                     depth-stage Plane's constant rot={{ x, y, z }}: cards face the camera; a 3D turn is a
 *                     declared object move (animated, landing face-on); on the depth stage the camera's angle
 *                     gives the perspective
 *   camera-shot       the depth stage's camera off its declared shots (errors; files importing fx/depth): a
 *                     Stage3D camera={{ ... }} computed from the frame by hand, a shot on E.linear, a move that
 *                     starts before the last one lands, a push straight back into a pull (or the reverse) within
 *                     90 f@60, a camera field (yaw, pitch, roll, dist, lens, fov, target) on a sine of the frame.
 *                     A declared camera([push(...), travel(...)]) passes: each shot starts, travels and lands
 *   drift-toggle      an old sway switched on a condition (`sway={c && {...}}`, `sway={c ? {...} : false}`): its
 *                     offset is not zero on that frame, so the layer jumps; better, drop the sway (idle-bob)
 *   unmount-moving    a layer unmounted (`F < X &&`, `F >= A && F < X &&`, a <Sequence> end) while a tween
 *                     inside it, timed off the same frame, still runs above 10 % of its peak speed (lib/continuity
 *                     landBeforeCut; the curve's speed is read from lib/anim.ts)
 *   even-stagger      a reveal timed `start + i * gap` (or `i * f60x(n)` added to a cue) in an act: items or words on a
 *                     metronome; phrase them (lib/cadence phraseOnsets: grouped, settling or rushing, the same span)
 *   linear-count      a count to a value that runs linear: countSteps or <Roll> on E.linear, countLinear capped at a
 *                     value (Math.min, `to:`), or a hand-rolled Math.round(mix(a, b, prog(f, s, e))) with no ease:
 *                     a count eases out and settles (fx/Roll countTo); countLinear stays for a live rate
 *   move-queue        three or more moves (arrive, reposition or leave tweens of 8 f@60 or more driving a
 *                     transform, a position or the camera) timed off the same frame, queued one after another
 *                     (overlapping less than 30 %) within 3 s: one carrying move, secondaries overlapping
 * * Picture (the frame holds real content at film size; look-audit.py measures the render):
 *   card-content      error: a <Card> with no children, image or blank, or a bento tile with no
 *                     content, image or blank: an empty slab (at render it falls back to kit UI)
 *   small-text        text under 36 px at 1080p (a fontSize, a typeStyle size, a role under the floor):
 *                     held in focus over 6 f it is mush; product UI is rebuilt at x1.8-2 (uiFilm)
 *   giant-watermark   a giant word (TYPE.giant, 400 px and up) at opacity <= 0.29: it is the set, not
 *                     a watermark
 *   giant-once        giant words in more than one act: the set of one moment, once per film
 *   emphasis-share    more than 70 % of the film's script lines (an act's TypeLine, HeroLine, MarkLine, StatementLine,
 *                     ScriptLine, Caption or Line element) given a literal emphasis device, or a filmEmphasis `share`
 *                     over 0.7: a film's emphasis is one kind on at most 60 % of its lines (fx/TypeEmphasis)
 *   emphasis-signature error: a box, marker or underline device (an `emph` or a signature `device`) named in more than
 *                     one place, or two of them in one film: a mark round a word is the film's one declared signature,
 *                     on one line
 *   end-card-template a mark, a wordmark and a tagline centred over a radial gradient: the stock end
 *                     card; build the lockup from the film's own device
 *   filler-plate      every element in frame has a job: a map or Array.from callback that draws only a
 *                     filled, childless box, defocused or faint (plates floating at depth, faint cards round
 *                     a line), or a depth-stack item ({ id, plane }) with no `carries` (fx/DepthStack)
 *   text-estimate     error: a text width guessed from the letter count (`label.length * size * 0.55`, outside kit/,
 *                     lib/ and fx/): the dot, badge or icon placed beside it lands on an edge or under a neighbour;
 *                     flex with a gap (kit/flow Pill, kit/screens RequestPill, a flex row) or lib/measure measureTracked
 *   ui-accent-bar     error: a vertical accent line or bar on a card's edge: a side border (borderLeft, border-left,
 *                     borderInlineStart ...) 2 px or wider or in a saturated colour, an inset shadow painting one side
 *                     (inset 3px 0 0 <colour>), a 1.5-16 px wide bar element 2.5x as tall (or stretched top to bottom)
 *                     filled with the accent or a saturated colour (warn: a colour set by a variable, a neutral stripe
 *                     down a card's edge, a neutral side border or inset side 3 px or wider). Corners and
 *                     frames, hairline dividers in a line token, a chart's or meter's bars (map callbacks), carets, and
 *                     bar elements in fx/ and lib/ are left out. Product UI is simple and aligned
 *                     (references/product-ui.md); look-audit.py ui-accent-bar finds the bar in the render
 *   filler-light      light is motivated and subtle: a baked pool, glow, haze, bloom, bokeh or fog asset
 *                     (staticFile), or ground plates (kind/kinds pools, bars, floor, window) in a file that
 *                     names no light for them (`cinetic:light <what it is>`)
 *
 * Placeholders (errors: a final film shows the product's own words and real pictures, never stand-ins). The word
 * lists live in scripts/placeholders.json (copy-check.py reads the same file; the layout audit checks the render):
 *   placeholder-copy  text that marks itself unfinished in an on-screen place (JSX text, a {'string'} child, a
 *                     text/label/title/caption/line/headline/sub/body/meta/value/placeholder/cta/badge/name prop
 *                     or object key, a line() or chain() string): lorem ipsum, "Placeholder", "Label text", "Your
 *                     text here", a whole string that is only a generic label ("Button", "Caption") or a generic
 *                     noun and a number ("Item 1", "Card 3"). Write the product's real words
 *   bar-text          grey bars or blocks standing in for text: a Skeleton, TextBars, GhostLines, FakeText,
 *                     PlaceholderLines or Bars component, or a map / Array.from callback that draws only rounded,
 *                     filled boxes under 30 px tall at varying widths with no text in them (the "lines of a
 *                     paragraph" stand-in). Set the real strings at film size (kit Text, the product's data);
 *                     a product's own loading skeleton shown on purpose takes // lint-ok: loading state
 *   drawn-figure      a person, place or product drawn in code where a real photo belongs, outside fx/, lib/ and
 *                     kit/: the kit's drawn portraits (PortraitMark, HalftonePortrait, an Avatar or AvatarStack
 *                     with kind portrait or halftone and no src) above 72 px, the kit's drawn still life (a kit
 *                     <Photo theme> with no src), or a component named for a figure (Person, Face, Portrait,
 *                     Figure, Character, Landscape, Mountain, Forest, Tree, Skyline, Building, Bottle, Vase,
 *                     Plant, Flower, Food, Shoe...) that draws SVG shapes. Use a real photo or clip
 *                     (scripts/assets.mjs, fx/Pictures; kit Avatar src) or the product's own UI
 *   logo-chip         a chip, pill, badge or tag whose label is a well-known product's name written as text alone
 *                     ("ChatGPT", "Slack", "Notion", "GitHub", ...), outside fx/, lib/ and kit/: a named integration shows
 *                     its real mark (node scripts/logos.mjs get <name> --film ., then kit LogoChip / InlineLogo /
 *                     AppIcon); a chip that falls back to text until the mark is fetched reads the name from data
 *
 * Hard bans (SKILL.md "Hard bans"): errors whenever you invent the look.
 *   banned-color      any colour (tokens, :root palette, literals, CSS names) in a banned OKLCH region:
 *                       orange/amber  31 <= h < 96, C >= 0.05 (orange, amber, gold, brass, brown, coral)
 *                       beige/cream   31 <= h < 118, L >= 0.70, 0.007 <= C < 0.10 (beige, cream, tan, sand)
 *                       purple        270 <= h < 340, C >= 0.02 (purple, violet, indigo, lavender, magenta)
 *                       neon          C >= 0.27; L >= 0.85 and C >= 0.15; L >= 0.80 and C >= 0.18
 *                                     (yellows, 96 <= h < 118: only L >= 0.91 and C >= 0.15)
 *                     Reds (h >= 340 or h < 31, e.g. #EC2A3A at h 24), greens, teals, blues and yellows pass.
 *   serif             serif faces: @fontsource packages, font-family values, FONT/FACES strings,
 *                     the generic `serif` / `ui-serif`
 *   italic            italic or oblique styles, <i>/<em>, and skew on text (a faux italic; skew
 *                     on a style that also sets type is an error, any other skew a warning)
 *   glass             backdrop-filter (glassmorphism)
 *   glow              a white or coloured box-/text-/drop-shadow with blur, or a coloured radial
 *                     falloff to transparent (glows, halos, bloom); ink shadows are fine. In fx/ and
 *                     lib/ a light field or soft shape declares itself with `cinetic:light <what>` (in
 *                     the file's leading comment or on the line); element halos stay errors everywhere
 *   gradient-multihue gradients across several hues (the generated look)
 *   emoji             emoji and sparkle glyphs in strings or markup
 *   stock-decoration  icon, confetti and particle libraries (stock icons, sparkles, confetti)
 *   star-mark         the film's own mark (src/brand/logo*, mark*, Mark.tsx) drawn as a star or a sparkle (4-8
 *                     even tips over inward dips): a stand-in glyph, never a logo; the brand's own SVG passes
 *
 * Brand-supplied escape: when the user's brand supplies a banned thing (their orange, their serif
 * wordmark), write `cinetic:brand-supplied <what>` in a comment and record it in BRIEF.md.
 *   - in a file's leading comment block (for HTML: an <!-- --> comment before <body>/<template>),
 *     it covers the hard-ban rules in the whole file;
 *   - anywhere else, it covers the hard-ban rules on its own line and the next one.
 * A marker with nothing after it is an error: say what the brand supplied. It also covers the house
 * palette rules pure-ink and gradient-shape; accent-count (one accent family) still applies.
 * Accent face: `cinetic:accent-face <family>` covers italic and serif on its own line and the next: the one
 * italic accent face a film may set on a payoff word (SKILL.md, Hard bans: Type). A marker with no family is an error.
 *
 * Palette: hex colours must appear in the tokens file (Remotion: src/brand/tokens.ts). In a
 * HyperFrames project with no tokens file, the custom properties in the HTML's `:root { }` blocks
 * are the palette, and motion.js is the easing module (raw beziers are allowed there).
 *
 * House scenes: a scene of the scene bank (src/scenes) carries `cinetic:house-scene` in its leading comment; its own
 * colour literals are not checked against the film's tokens (the banned colours still are), and it may animate per
 * character and turn a card in depth like the house primitives (each scene's own test gates it). A film's own scenes
 * in the same folder carry no marker and are linted like any film code.
 * Device palettes: a device in fx/ or lib/ may carry its own stops (a spectral run, a false-colour
 * map, a luminance mask's black and white) with `cinetic:device-palette <job>` in a comment. In the
 * file's leading comment block it covers the whole file; anywhere else it covers its own line and the
 * lines after it up to the next blank line. It covers banned-color and off-token-color only (the film
 * still has one dominant accent); elsewhere the marker is not honoured, and without a job it is an error.
 *
 * Suppress one finding with a reason on the same or previous line:  // lint-ok: <reason>
 * (or <!-- lint-ok: reason --> in HTML). Disable whole rules for a run with --allow rule,...
 *
 * Usage:
 *   node scripts/lint-film.mjs [src] [--tokens src/brand/tokens.ts] [--json] [--strict] [--allow rule,...]
 *     src       file or directory to scan (default: src, or . if there is no src)
 *     --tokens  file whose hex colours are the palette (default: <src>/brand/tokens.ts if present,
 *               else the :root custom properties of the scanned HTML/CSS)
 *     --json    print a JSON report instead of text
 *     --strict  warnings fail too
 * Exit codes: 0 clean (warnings allowed unless --strict), 1 errors found, 2 bad arguments.
 * Tests (in the skill, not copied into films): node scripts/test/lint-film.test.mjs
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';

// ---------------------------------------------------------------------------------- arguments
const argv = process.argv.slice(2);
const opt = { src: null, tokens: null, json: false, strict: false, allow: new Set() };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--json') opt.json = true;
  else if (a === '--strict') opt.strict = true;
  else if (a === '--tokens') opt.tokens = argv[++i];
  else if (a === '--allow') (argv[++i] || '').split(',').filter(Boolean).forEach((r) => opt.allow.add(r.trim()));
  else if (a === '-h' || a === '--help') {
    console.log(readFileSync(new URL(import.meta.url)).toString().split('*/')[0].replace(/^#!.*\n\/\*\*?/, '').replace(/^ \* ?/gm, ''));
    process.exit(0);
  } else if (a.startsWith('-')) {
    console.error(`lint-film: unknown option ${a}`);
    process.exit(2);
  } else if (!opt.src) opt.src = a;
  else {
    console.error(`lint-film: one path only (got ${opt.src} and ${a})`);
    process.exit(2);
  }
}
const root = resolve(opt.src ?? (existsSync('src') ? 'src' : '.'));
if (!existsSync(root)) {
  console.error(`lint-film: ${root} does not exist`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------- files
// vendor: third-party runtimes (a HyperFrames project's gsap.min.js); scripts: the cinetic tooling itself
const SKIP_DIRS = new Set(['node_modules', 'out', 'build', 'dist', '.git', '.remotion', 'renders', '__pycache__', 'vendor', 'scripts']);
const EXTS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.css', '.html', '.htm']);
const files = [];
const walk = (p) => {
  const st = statSync(p);
  if (st.isDirectory()) {
    if (SKIP_DIRS.has(basename(p))) return;
    for (const e of readdirSync(p)) walk(join(p, e));
  } else if (EXTS.has(extname(p)) && !p.endsWith('.d.ts')) files.push(p);
};
walk(root);

const tokensPath = opt.tokens
  ? resolve(opt.tokens)
  : [join(root, 'brand', 'tokens.ts'), join(root, 'src', 'brand', 'tokens.ts')].find((p) => existsSync(p)) ?? null;
if (opt.tokens && !existsSync(tokensPath)) {
  console.error(`lint-film: tokens file ${opt.tokens} not found`);
  process.exit(2);
}
// a tokens file outside the scanned tree is still checked (its colours and faces are the brand)
if (tokensPath && !files.some((f) => resolve(f) === tokensPath)) files.push(tokensPath);

// ---------------------------------------------------------------------------------- colour helpers
const normHex = (h) => {
  let x = h.replace('#', '').toLowerCase();
  if (x.length === 3 || x.length === 4) x = x.split('').map((c) => c + c).join('');
  return '#' + x.slice(0, 6);
};
const HEX_RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const tokenHex = new Set();
const tokenByName = new Map();
if (tokensPath) {
  const t = readFileSync(tokensPath, 'utf8');
  for (const m of t.matchAll(HEX_RE)) tokenHex.add(normHex(m[0]));
  for (const m of t.matchAll(/([A-Za-z_$][\w$-]*)\s*:\s*['"](#[0-9a-fA-F]{3,8})['"]/g)) tokenByName.set(m[1], normHex(m[2]));
  for (const m of t.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})/g)) tokenByName.set(m[1], normHex(m[2]));
}
// HyperFrames (or any project without a tokens file): the :root custom properties are the palette.
const ROOT_BLOCK_RE = /:root\s*\{[^}]*\}/g;
let rootTokens = null; // file(s) the :root palette came from
if (!tokensPath) {
  const from = [];
  for (const f of files.filter((x) => /\.(html?|css)$/.test(x))) {
    const src = readFileSync(f, 'utf8');
    for (const block of src.match(ROOT_BLOCK_RE) ?? []) {
      let found = false;
      for (const m of block.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b/g)) {
        tokenHex.add(normHex(m[2]));
        tokenByName.set(m[1], normHex(m[2]));
        found = true;
      }
      if (found && !from.includes(f)) from.push(f);
    }
  }
  if (from.length) rootTokens = from.map((f) => relative(process.cwd(), f) || f).join(', ') + ' :root';
}
const paletteName = tokensPath ? relative(process.cwd(), tokensPath) : rootTokens;
const rgbOf = (hex) => {
  const x = normHex(hex).slice(1);
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
};
// OKLCH (approximate, enough to tell hues apart)
const oklch = ([r, g, b]) => {
  const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [R, G, B] = [lin(r), lin(g), lin(b)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const Bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(A, Bb), h: ((Math.atan2(Bb, A) * 180) / Math.PI + 360) % 360 };
};
const luma = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

// ---------------------------------------------------------------------------------- hard bans
// The banned OKLCH regions (SKILL.md "Hard bans"; references/brand-and-color.md §8). palette.py
// carries the same numbers: change them in both places.
const YELLOW = [96, 118];
const bannedRegion = ({ L, C, h }) => {
  const neon = h >= YELLOW[0] && h < YELLOW[1] ? L >= 0.91 && C >= 0.15 : (L >= 0.85 && C >= 0.15) || (L >= 0.8 && C >= 0.18);
  if (neon || C >= 0.27) return 'neon (very bright and saturated)';
  if (h >= 31 && h < 118 && L >= 0.7 && C >= 0.007 && C < 0.1) return 'beige/cream (warm, light, low chroma: beige, cream, tan, sand)';
  if (h >= 31 && h < 96 && C >= 0.05) return 'orange/amber (orange, amber, gold, brass, brown, coral)';
  if (h >= 270 && h < 340 && C >= 0.02) return 'purple/violet/indigo';
  return null;
};
// CSS colour names in or near the banned regions (hex values from the CSS spec).
const NAMED = {
  orange: '#ffa500', darkorange: '#ff8c00', orangered: '#ff4500', coral: '#ff7f50', tomato: '#ff6347',
  lightsalmon: '#ffa07a', darksalmon: '#e9967a', sandybrown: '#f4a460', chocolate: '#d2691e', sienna: '#a0522d',
  saddlebrown: '#8b4513', peru: '#cd853f', burlywood: '#deb887', tan: '#d2b48c', wheat: '#f5deb3',
  beige: '#f5f5dc', bisque: '#ffe4c4', blanchedalmond: '#ffebcd', cornsilk: '#fff8dc', antiquewhite: '#faebd7',
  linen: '#faf0e6', oldlace: '#fdf5e6', papayawhip: '#ffefd5', moccasin: '#ffe4b5', navajowhite: '#ffdead',
  peachpuff: '#ffdab9', floralwhite: '#fffaf0', ivory: '#fffff0', lemonchiffon: '#fffacd', khaki: '#f0e68c',
  darkkhaki: '#bdb76b', palegoldenrod: '#eee8aa', gold: '#ffd700', goldenrod: '#daa520', darkgoldenrod: '#b8860b',
  purple: '#800080', violet: '#ee82ee', indigo: '#4b0082', magenta: '#ff00ff', fuchsia: '#ff00ff', orchid: '#da70d6',
  plum: '#dda0dd', thistle: '#d8bfd8', lavender: '#e6e6fa', mediumpurple: '#9370db', rebeccapurple: '#663399',
  blueviolet: '#8a2be2', darkviolet: '#9400d3', darkorchid: '#9932cc', mediumorchid: '#ba55d3', darkmagenta: '#8b008b',
  slateblue: '#6a5acd', darkslateblue: '#483d8b', mediumslateblue: '#7b68ee', lime: '#00ff00', aqua: '#00ffff',
  cyan: '#00ffff', chartreuse: '#7fff00', lawngreen: '#7cfc00', springgreen: '#00ff7f', yellow: '#ffff00',
};
/** {rgb, a} for one colour token: hex, rgb()/rgba(), oklch(), a CSS name; null if unknown. */
const colorOf = (tok) => {
  const t = tok.trim().toLowerCase();
  if (/^#[0-9a-f]{3,8}$/.test(t)) {
    const x = t.slice(1);
    const a = x.length === 8 ? parseInt(x.slice(6), 16) / 255 : x.length === 4 ? parseInt(x[3] + x[3], 16) / 255 : 1;
    return { rgb: rgbOf(t), a };
  }
  let m = t.match(/^rgba?\(([^)]*)\)$/);
  if (m) {
    const v = m[1].split(/[\s,/]+/).filter(Boolean).map((x) => (x.endsWith('%') ? parseFloat(x) * 2.55 : Number(x)));
    if (v.length < 3 || v.slice(0, 3).some(Number.isNaN)) return null;
    return { rgb: v.slice(0, 3), a: v.length > 3 && Number.isFinite(v[3]) ? v[3] : 1 }; // a runtime alpha counts as opaque
  }
  m = t.match(/^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:deg)?\s*(?:\/\s*([\d.]+%?))?\s*\)$/);
  if (m) return { lch: { L: parseFloat(m[1]) / (m[2] ? 100 : 1), C: parseFloat(m[3]), h: parseFloat(m[4]) % 360 }, a: m[5] ? parseFloat(m[5]) / (m[5].endsWith('%') ? 100 : 1) : 1 };
  if (NAMED[t]) return { rgb: rgbOf(NAMED[t]), a: 1 };
  if (t === 'white') return { rgb: [255, 255, 255], a: 1 };
  if (t === 'black') return { rgb: [0, 0, 0], a: 1 };
  return null;
};
const lchOf = (c) => c.lch ?? oklch(c.rgb);
const fmtLch = ({ L, C, h }) => `OKLCH ${L.toFixed(2)} ${C.toFixed(3)} ${Math.round(h)}`;

// Serif faces: generic keywords, any family naming "serif" (not "sans") or "slab", and the common
// serif families by name (system faces and @fontsource packages).
const SERIF_NAMES = [
  'newsreader', 'literata', 'fraunces', 'playfair', 'lora', 'merriweather', 'garamond', 'cormorant', 'crimson',
  'baskerville', 'caslon', 'bodoni', 'didot', 'georgia', 'times', 'cambria', 'palatino', 'book antiqua', 'spectral',
  'alegreya', 'cardo', 'vollkorn', 'gelasio', 'besley', 'petrona', 'brygada', 'domine', 'frank ruhl', 'gloock',
  'piazzolla', 'rasa', 'texturina', 'faustina', 'labrada', 'imbue', 'bitter', 'arvo', 'aleo', 'crete round',
  'noticia', 'old standard', 'prata', 'abril fatface', 'yeseva', 'cinzel', 'marcellus', 'rozha', 'charter',
  'iowan', 'hoefler', 'constantia', 'rockwell', 'tinos', 'gentium', 'goudy', 'unna', 'martel', 'lusitana',
  'manuale', 'eczar', 'amiri', 'mincho', 'young serif', 'instrument serif', 'dm serif', 'bellefair', 'castoro',
];
const isSerifFamily = (name) => {
  const n = name.toLowerCase().replace(/["']/g, '').replace(/[-_]+/g, ' ').replace(/\s+variable$/, '').trim();
  if (!n) return false;
  if (n === 'serif' || n === 'ui serif') return true;
  if (/\bsans\b|\bmono\b|monospace/.test(n)) return false;
  if (/serif|\bslab\b/.test(n)) return true;
  return SERIF_NAMES.some((s) => ` ${n} `.includes(` ${s} `));
};
/** Serif families named in a CSS font list or font shorthand ('600 16px "X Variable", Georgia, serif'). */
const serifIn = (list) =>
  list
    .replace(/^\s*(?:(?:normal|bold|\d{3})\s+)*\d+(?:\.\d+)?(?:px|em|rem|pt)(?:\/[\d.]+\w*)?\s+/, '')
    .split(',')
    .map((x) => x.trim().replace(/^["']|["']$/g, ''))
    .filter((x) => isSerifFamily(x));
const ICON_LIBS = /^(lucide(-react|-static)?|react-icons(\/.*)?|@heroicons\/.*|@tabler\/icons.*|@phosphor-icons\/.*|phosphor-react|@mui\/icons-material.*|@fortawesome\/.*|react-feather|feather-icons|@radix-ui\/react-icons|ionicons|@iconify\/.*|canvas-confetti|react-confetti|react-canvas-confetti|js-confetti|party-js|tsparticles.*|@tsparticles\/.*|react-tsparticles|particles\.js)$/;
const HARD_BANS = new Set(['banned-color', 'serif', 'italic', 'glass', 'glow', 'gradient-multihue', 'emoji', 'stock-decoration', 'star-mark']);

// ---------------------------------------------------------------------------------- source masking
/**
 * Returns the source with comments blanked (same length, newlines kept) so rules never fire on
 * prose like "never use Math.random". Strings are kept. A ' or " only opens a string if it closes
 * on the same line, so apostrophes in JSX text ("doesn't") cannot derail the scan.
 */
const stripComments = (src, html) => {
  const out = src.split('');
  const blank = (a, b) => {
    for (let k = a; k < b; k++) if (out[k] !== '\n') out[k] = ' ';
  };
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const d = src[i + 1];
    if (html && src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i + 4);
      const end = e < 0 ? n : e + 3;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '/' && d === '/') {
      const e = src.indexOf('\n', i);
      const end = e < 0 ? n : e;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === '/' && d === '*') {
      const e = src.indexOf('*/', i + 2);
      const end = e < 0 ? n : e + 2;
      blank(i, end);
      i = end;
      continue;
    }
    if (c === "'" || c === '"') {
      const eol = src.indexOf('\n', i);
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== '\n') j += src[j] === '\\' ? 2 : 1;
      if (j < n && src[j] === c && (eol < 0 || j < eol)) {
        i = j + 1;
        continue;
      }
      i++;
      continue;
    }
    if (c === '`') {
      // skip to the closing backtick, descending into ${ } expressions
      let j = i + 1;
      while (j < n && src[j] !== '`') {
        if (src[j] === '\\') j += 2;
        else if (src[j] === '$' && src[j + 1] === '{') {
          let depth = 1;
          j += 2;
          while (j < n && depth) {
            if (src[j] === '{') depth++;
            else if (src[j] === '}') depth--;
            j++;
          }
        } else j++;
      }
      i = j + 1;
      continue;
    }
    i++;
  }
  return out.join('');
};

/** Text of a balanced (...) group starting at the '(' index. */
const parenGroup = (s, open) => {
  let depth = 0;
  for (let j = open; j < s.length; j++) {
    if (s[j] === '(') depth++;
    else if (s[j] === ')' && --depth === 0) return s.slice(open + 1, j);
  }
  return s.slice(open + 1);
};

// ---------------------------------------------------------------------------------- film context for the text rules
// The nearest timeline.ts (or a HyperFrames motion.js) above the scanned path sets the pace; the
// project's lib/anim.ts (or motion.js) says which SPR presets overshoot.
const findUp = (start, names) => {
  let d = statSync(start).isDirectory() ? start : dirname(start);
  for (let up = 0; up < 4; up++) {
    for (const n of names) if (existsSync(join(d, n))) return join(d, n);
    if (dirname(d) === d) break;
    d = dirname(d);
  }
  return null;
};
const timelineFile = findUp(root, ['timeline.ts', join('src', 'timeline.ts'), 'motion.js']);
const timelineSrc = timelineFile ? readFileSync(timelineFile, 'utf8') : '';
const timelineCode = stripComments(timelineSrc, false); // what the timeline names in code: a comment about fx/Chain declares nothing
const filmPace = timelineSrc.match(/\bPACE_NAME\b[^=\n]*=\s*['"](\w+)['"]/)?.[1] ?? null; // null: written before paces (crisp rules)
const filmFps = Number(timelineSrc.match(/\bconst FPS\s*=\s*(\d+)/)?.[1] ?? 60);
const OVERSHOOT = new Set(['snap', 'pop', 'land', 'word', 'detent', 'micro']); // the shipped presets, if no anim file is found
{
  const anim = findUp(root, [join('lib', 'anim.ts'), join('src', 'lib', 'anim.ts'), 'motion.js']);
  const block = anim ? readFileSync(anim, 'utf8').match(/\bSPR\s*=\s*\{([\s\S]*?)\n\s*\}/)?.[1] : null;
  if (block) {
    OVERSHOOT.clear();
    for (const m of block.matchAll(/^\s*(\w+)\s*:\s*\{([^}]*)\}/gm)) {
      const num = (k, d) => Number(m[2].match(new RegExp(`\\b${k}\\s*:\\s*([\\d.]+)`))?.[1] ?? d);
      if (num('damping', 10) < 2 * Math.sqrt(num('stiffness', 100) * num('mass', 1)) - 1e-9) OVERSHOOT.add(m[1]);
    }
  }
}
// ---------------------------------------------------------------------------------- film context for the grammar rules
// The curve roles, the deprecated names, the spring presets, the look and the type roles come from the
// project's own files (the nearest lib/anim.ts or motion.js, timeline, tokens, blur.ts, lib/pace.ts),
// with the house values as the fallback, so a film that retunes a token is judged by its own file.
const animPath = findUp(root, [join('lib', 'anim.ts'), join('src', 'lib', 'anim.ts'), 'motion.js']);
const animSrc = animPath ? readFileSync(animPath, 'utf8') : '';
const anim12 = /\b(?:tagEase|tag)\(\s*[^\n]*'(?:arrive|reposition|leave|linear)'/.test(animSrc); // a 1.2 motion file (curves carry their role)
const HOUSE_FAMILY = {
  snapOut: 'arrive', glideOut: 'arrive', settleOut: 'arrive', softOut: 'arrive', liftOut: 'arrive', jump: 'arrive',
  stdInOut: 'reposition', strongInOut: 'reposition', whipBuild: 'reposition', anticipate: 'reposition',
  softIn: 'leave', buildIn: 'leave', launchIn: 'leave', linear: 'linear',
  out: 'arrive', outSoft: 'arrive', in: 'leave', exit: 'leave', inOut: 'reposition', smooth: 'reposition', ui: 'reposition',
  cam: 'arrive', glide: 'arrive', rest: 'reposition', contact: 'leave', whip: 'reposition', dolly: 'reposition', type: 'arrive', expo: 'arrive',
};
const HOUSE_E_DEPRECATED = {
  out: 'snapOut', outSoft: 'snapOut', in: 'launchIn', exit: 'buildIn', inOut: 'strongInOut', smooth: 'strongInOut', ui: 'stdInOut',
  cam: 'liftOut', glide: 'liftOut', rest: 'stdInOut', contact: 'buildIn', whip: 'whipBuild', dolly: 'linear',
};
const HOUSE_SPR_DEPRECATED = {
  snap: 'landing', pop: 'containerPop', soft: 'critical', heavy: 'criticalSlow', firm: 'critical', micro: 'criticalFast',
  land: 'landing', word: 'critical', detent: 'criticalFast', calm: 'criticalSlow',
};
// a 1.1 motion file (no roles in it) keeps its own names: only a 1.2 file, or none, has deprecated names
const knowsDeprecated = !animPath || anim12;
/** 'E.snapOut' / 'M.rise' -> { family, deprecated, shape, index } */
const TOK = new Map(Object.entries(HOUSE_FAMILY).map(([k, family]) => [`E.${k}`, { family, deprecated: knowsDeprecated ? (HOUSE_E_DEPRECATED[k] ?? null) : null, shape: null, index: -1 }]));
for (const m of animSrc.matchAll(/^[ \t]*(\w+)\s*:\s*(?:tagEase|tag)\(([^\n]*?),\s*'(arrive|reposition|leave|linear)'\s*,\s*'([^']*)'(?:\s*,\s*'([^']*)')?\s*\)/gm)) {
  const key = m[4].startsWith('M.') ? m[4] : `E.${m[1]}`;
  TOK.set(key, { family: m[3], deprecated: m[5] ?? null, shape: m[2], index: m.index, name: m[1] });
}
const sprDep = animSrc.match(/\bSPR_DEPRECATED\b[^=]*=\s*\{([^}]*)\}/)?.[1];
const SPR_DEP = sprDep ? Object.fromEntries([...sprDep.matchAll(/(\w+)\s*:\s*'(\w+)'/g)].map((m) => [m[1], m[2]])) : knowsDeprecated ? HOUSE_SPR_DEPRECATED : {};
/** Every spring preset of the motion file: zeta and overshoot (share of the travel), with its index. */
const SPRS = new Map();
{
  const at = animSrc.search(/\bSPR\s*=\s*\{/);
  const block = at >= 0 ? animSrc.slice(at).match(/\{([\s\S]*?)\n\s*\}/)?.[1] : null;
  const base = at >= 0 ? at + animSrc.slice(at).indexOf('{') + 1 : 0;
  for (const m of (block ?? '').matchAll(/^\s*(\w+)\s*:\s*\{([^}]*)\}/gm)) {
    const num = (k, d) => Number(m[2].match(new RegExp(`\\b${k}\\s*:\\s*([\\d.]+)`))?.[1] ?? d);
    const zeta = num('damping', 10) / (2 * Math.sqrt(num('stiffness', 100) * num('mass', 1)));
    SPRS.set(m[1], { zeta, overshoot: zeta < 1 ? Math.exp((-zeta * Math.PI) / Math.sqrt(1 - zeta * zeta)) : 0, index: base + m.index });
  }
}
const timelineJs = findUp(root, ['timeline.js']); // a HyperFrames project declares its look in timeline.js
const declSrc = timelineSrc + (timelineJs && timelineJs !== timelineFile ? '\n' + readFileSync(timelineJs, 'utf8') : '');
const lookBlock = declSrc.match(/\bLOOK\b[^=\n]*=\s*\{([^}]*)\}/)?.[1] ?? null;
const LOOK = lookBlock
  ? { blur: lookBlock.match(/\bblur\s*:\s*'(\w+)'/)?.[1] ?? 'crisp', whiteWorld: /\bwhiteWorld\s*:\s*true\b/.test(lookBlock) }
  : null; // a timeline written before the declarations: the look rules stay quiet
const SPRING_CLASS = declSrc.match(/\bSPRING_CLASS\b[^=\n]*=\s*'([^']*)'/)?.[1] ?? null;
const pacePath = findUp(root, [join('lib', 'pace.ts'), join('src', 'lib', 'pace.ts')]);
const pace12 = /\briseUnit\b|\brecentreDur\b/.test(pacePath ? readFileSync(pacePath, 'utf8') : animSrc); // a 1.2 pace (or its HF mirror)
/** Words per chain id, from the timeline's chain('id', 'build' | 'replace', [[text, frame], ...]) calls. */
const CHAIN_WORDS = new Map();
for (const m of timelineSrc.matchAll(/\bchain\(\s*['"]([\w.-]+)['"]\s*,\s*['"](?:build|replace)['"]\s*,\s*\[/g)) {
  let depth = 0;
  let j = m.index + m[0].length - 1;
  for (; j < timelineSrc.length; j++) {
    if (timelineSrc[j] === '[') depth++;
    else if (timelineSrc[j] === ']' && --depth === 0) break;
  }
  const body = timelineSrc.slice(m.index + m[0].length - 1, j + 1);
  const words = [...body.matchAll(/(['"`])((?:(?!\1)[^\n])*)\1/g)].reduce((n, s) => n + (s[2].match(/\S+/g) ?? []).length, 0);
  CHAIN_WORDS.set(m[1], words);
}
// type roles (px at 1080p) from the tokens file, else the house scale (the calm family, lib/look.ts TYPE_LOOK)
const TYPE_SIZES = new Map(Object.entries({ ui: 40, caption: 46, line: 84, display: 160, hero: 200, giant: 640 }));
let TYPE_DEP = { secondary: 'caption' };
if (tokensPath) {
  const t = readFileSync(tokensPath, 'utf8');
  const at = t.search(/\bTYPE\s*=\s*\{/);
  if (at >= 0) {
    const block = t.slice(at).match(/\{([\s\S]*?)\n\s*\};?/)?.[1] ?? '';
    const found = [...block.matchAll(/^\s*(\w+)\s*:\s*\{[^}]*\bsize\s*:\s*([\d.]+)/gm)];
    if (found.length) {
      TYPE_SIZES.clear();
      for (const m of found) TYPE_SIZES.set(m[1], Number(m[2]));
    }
  }
  const dep = t.match(/\bTYPE_DEPRECATED\b[^=]*=\s*\{([^}]*)\}/)?.[1];
  TYPE_DEP = dep ? Object.fromEntries([...dep.matchAll(/(\w+)\s*:\s*'(\w+)'/g)].map((m) => [m[1], m[2]])) : TYPE_SIZES.has('secondary') ? TYPE_DEP : {};
}
// every role size of both type families (lib/look.ts TYPE_LOOK: calm, the default, and bold, the director's pick):
// a fontSize from either is a role size, whichever family the film's tokens hold
const LOOK_SIZES = new Map(); // size -> 'family role'
{
  const lookPath = findUp(root, [join('lib', 'look.ts'), join('src', 'lib', 'look.ts')]);
  const src = lookPath ? stripComments(readFileSync(lookPath, 'utf8'), false) : '';
  const at = src.search(/\bTYPE_LOOK\s*=\s*\{/);
  let fams = [];
  if (at >= 0) {
    const open = src.indexOf('{', at);
    let depth = 0;
    let j = open;
    for (; j < src.length; j++) {
      if (src[j] === '{') depth++;
      else if (src[j] === '}' && --depth === 0) break;
    }
    const body = src.slice(open + 1, j);
    fams = [...body.matchAll(/(\w+)\s*:\s*\{((?:\s*\w+\s*:\s*\{[^}]*\}\s*,?)+)\s*\}/g)].map((m) => [m[1], [...m[2].matchAll(/(\w+)\s*:\s*\{[^}]*\bsize\s*:\s*([\d.]+)/g)].map((r) => [r[1], Number(r[2])])]);
  }
  if (!fams.length)
    fams = [
      ['calm', Object.entries({ ui: 40, caption: 46, line: 84, display: 160, hero: 200, giant: 640 })],
      ['bold', Object.entries({ ui: 40, caption: 46, line: 120, display: 200, hero: 240, giant: 900 })],
    ];
  for (const [fam, roles] of fams) for (const [role, size] of roles) if (!LOOK_SIZES.has(size)) LOOK_SIZES.set(size, `${fam} ${role}`);
}
// what the film declares on purpose: the primitives whose declares() src/sync.ts imports, and the timeline's own text
const syncPath = findUp(root, ['sync.ts', join('src', 'sync.ts')]);
const syncSrc = syncPath ? readFileSync(syncPath, 'utf8') : '';
const SYNC_DECLARES = new Set(
  [...syncSrc.matchAll(/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)].filter((m) => /\bdeclares\b/.test(m[1])).map((m) => m[2].split('/').pop().replace(/\.(tsx?|jsx?|mjs)$/, '')),
);
/** The one-frame snap primitives (snap-step): their uses, the modules whose declares() covers them, and the glide to use instead. */
const SNAP_DEVICES = [
  { name: 'HardStep', mods: ['HardStep'], re: /<HardStep\b|(?<![\w$.])(?:hardStepState|stepValue|snapBox)\s*\(/g, fix: 'fx/GlideStep for a list, lib/continuity glideValue for a value, GlideStep glideBox for a box: 16 f@60 on E.glideOut' },
  { name: 'SnapZoom', mods: ['SnapZoom'], seam: 'snapZoom', re: /<SnapZoom\b|(?<![\w$.])snapZoomState\s*\(/g, fix: 'a push on an arrive curve over 34 f@60 or more (lib/camera camPath)' },
  { name: 'LineSnap', mods: ['LineSnap'], re: /<LineSnap\b|(?<![\w$.])(?:scaleSnapState|makeRoomState)\s*\(/g, fix: 'the line scaled through the camera' },
  // the same device inside a chain: only Chain's declares() covers it (every starter film's sync.ts imports Chain's)
  { name: 'LineSnap', mods: ['Chain'], re: /\bsnapLast\s*[:=]\s*(?!\{?\s*false\b)|\brecentre\s*[:=]\s*\{?\s*['"]room['"]/g, fix: "Chain recentre 'glide'" },
];
const snapUses = []; // uses of snap primitives across the film, for the one-device rule
/** A frame expression as { base, off } (off in film frames): CUE.x, CUE.x + 12, ACT.a.from - f60x(6), 120; else null. */
const frameTerm = (expr) => {
  if (expr === undefined || expr === null) return null;
  let t = String(expr).replace(/\s+/g, '');
  if (/^-?[\d.]+$/.test(t)) return { base: '', off: Number(t) };
  let off = 0;
  for (;;) {
    const m = t.match(/^(.*[^+\-*/(,])([+-])(f60x?\(([\d.]+)\)|[\d.]+)$/);
    if (!m) break;
    const v = m[4] !== undefined ? (Number(m[4]) * filmFps) / 60 : Number(m[3]);
    off += m[2] === '+' ? v : -v;
    t = m[1];
  }
  return /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\[['"]?\w+['"]?\])*$/.test(t) ? { base: t, off } : null;
};
/** The share of its peak speed a tween on `ease` (an E.* token) runs at, at progress t (0..1): read from the curve in lib/anim.ts, else from its role. */
const speedShareAt = (ease, t) => {
  const tok = TOK.get(String(ease ?? '').trim());
  if (!tok) return null;
  const fn = tok.shape ? curveOf(tok.shape) : null;
  if (!fn) return { arrive: t >= 0.6 ? 0.05 : 0.5, reposition: t <= 0.1 || t >= 0.85 ? 0.05 : 0.5, leave: 1, linear: 1 }[tok.family] ?? null;
  const n = 200;
  const v = (x) => Math.abs(fn(Math.min(1, x + 0.5 / n)) - fn(Math.max(0, x - 0.5 / n)));
  let peak = 1e-12;
  for (let k = 0; k <= n; k++) peak = Math.max(peak, v(k / n));
  return v(t) / peak;
};
const blurPath = findUp(root, ['blur.ts', join('src', 'blur.ts')]);
/** A house curve's progress at t = .1 ... .9 must sit in this band (the house curve table) at >= 7 of 9 points. */
const HOUSE_BAND = {
  snapOut: [[0.469, 0.695, 0.802, 0.871, 0.914, 0.94, 0.964, 0.978, 0.989], [0.517, 0.734, 0.837, 0.895, 0.933, 0.959, 0.975, 0.986, 0.995]],
  glideOut: [[0.282, 0.516, 0.669, 0.77, 0.839, 0.895, 0.928, 0.957, 0.98], [0.373, 0.588, 0.736, 0.831, 0.889, 0.932, 0.96, 0.983, 0.995]],
  settleOut: [[0.208, 0.404, 0.549, 0.664, 0.75, 0.824, 0.882, 0.928, 0.967], [0.274, 0.465, 0.61, 0.716, 0.806, 0.871, 0.923, 0.96, 0.985]],
  softOut: [[0.138, 0.276, 0.405, 0.522, 0.617, 0.708, 0.785, 0.857, 0.927], [0.197, 0.364, 0.478, 0.593, 0.687, 0.77, 0.847, 0.919, 0.963]],
  liftOut: [[0.044, 0.244, 0.486, 0.684, 0.8, 0.88, 0.929, 0.96, 0.983], [0.126, 0.339, 0.598, 0.785, 0.879, 0.939, 0.967, 0.985, 0.995]],
  stdInOut: [[0.02, 0.076, 0.232, 0.489, 0.695, 0.837, 0.897, 0.944, 0.975], [0.063, 0.169, 0.358, 0.577, 0.812, 0.909, 0.948, 0.975, 0.992]],
  strongInOut: [[0.012, 0.042, 0.096, 0.221, 0.494, 0.737, 0.856, 0.933, 0.973], [0.036, 0.087, 0.18, 0.331, 0.603, 0.823, 0.92, 0.967, 0.991]],
  whipBuild: [[0.01, 0.029, 0.057, 0.107, 0.195, 0.451, 0.691, 0.839, 0.942], [0.029, 0.07, 0.105, 0.174, 0.336, 0.578, 0.816, 0.944, 0.983]],
  softIn: [[0.03, 0.079, 0.135, 0.205, 0.287, 0.382, 0.505, 0.631, 0.809], [0.069, 0.14, 0.202, 0.274, 0.359, 0.453, 0.585, 0.737, 0.871]],
  buildIn: [[0.01, 0.03, 0.061, 0.104, 0.17, 0.256, 0.371, 0.531, 0.734], [0.026, 0.058, 0.099, 0.157, 0.231, 0.33, 0.441, 0.621, 0.814]],
  launchIn: [[0.005, 0.017, 0.032, 0.059, 0.097, 0.152, 0.231, 0.362, 0.573], [0.018, 0.036, 0.062, 0.091, 0.141, 0.207, 0.309, 0.444, 0.669]],
  anticipate: [[-0.079, -0.053, -0.003, 0.283, 0.477, 0.634, 0.73, 0.803, 0.896], [-0.013, 0.001, 0.104, 0.409, 0.674, 0.798, 0.881, 0.949, 0.982]],
};
/** A curve as a function from its source text: bz/bez(x1, y1, x2, y2), expOut(k), expIn(k), table(NAME), (t) => t. */
const curveOf = (shape) => {
  if (!shape) return null;
  let m = shape.match(/\b(?:bz|bez|bezier)\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
  if (m) {
    const [x1, y1, x2, y2] = m.slice(1).map(Number);
    const at = (a, b, s) => 3 * a * s * (1 - s) ** 2 + 3 * b * s * s * (1 - s) + s ** 3;
    return (t) => {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      let lo = 0;
      let hi = 1;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (at(x1, x2, mid) < t) lo = mid;
        else hi = mid;
      }
      return at(y1, y2, (lo + hi) / 2);
    };
  }
  m = shape.match(/\bexp(Out|In)\(\s*([\d.]+)\s*\)/);
  if (m) {
    const k = Number(m[2]);
    return m[1] === 'Out' ? (t) => (1 - Math.exp(-k * t)) / (1 - Math.exp(-k)) : (t) => (Math.exp(k * t) - 1) / (Math.exp(k) - 1);
  }
  m = shape.match(/\btable\(\s*(\w+)\s*\)/);
  if (m) {
    const arr = animSrc.match(new RegExp(`\\b${m[1]}\\s*=\\s*\\[([^\\]]*)\\]`))?.[1];
    const ys = arr ? arr.split(',').map(Number).filter((v) => Number.isFinite(v)) : [];
    if (ys.length < 3) return null;
    // the monotone cubic of lib/anim.ts table()
    const n = ys.length - 1;
    const h = 1 / n;
    const d = ys.slice(0, -1).map((y, i) => (ys[i + 1] - y) / h);
    const end = (a, b) => {
      const p = a + (a - b) * 0.5;
      return Math.sign(p) !== Math.sign(a) ? 0 : Math.abs(p) > 2 * Math.abs(a) ? 2 * a : p;
    };
    const mm = ys.map((_, i) => {
      if (i === 0) return end(d[0], d[1]);
      if (i === n) return end(d[n - 1], d[n - 2]);
      const a = d[i - 1];
      const b = d[i];
      if (a * b <= 0) return 0;
      return (Math.sign(a) + Math.sign(b)) * Math.min(Math.abs(a), Math.abs(b), Math.abs((a + b) / 2) / 2);
    });
    return (t) => {
      if (t <= 0) return ys[0];
      if (t >= 1) return ys[n];
      const i = Math.min(n - 1, Math.floor(t / h));
      const s = (t - i * h) / h;
      return (2 * s ** 3 - 3 * s * s + 1) * ys[i] + (s ** 3 - 2 * s * s + s) * h * mm[i] + (-2 * s ** 3 + 3 * s * s) * ys[i + 1] + (s ** 3 - s * s) * h * mm[i + 1];
    };
  }
  if (/^\s*\(?\s*(\w+)\s*\)?\s*=>\s*\1\s*$/.test(shape)) return (t) => t;
  return null;
};
/** Where a curve is fastest, as t in 0..1 (sampled). */
const peakT = (fn) => {
  let best = 0;
  let at = 0;
  for (let i = 0; i < 400; i++) {
    const v = (fn((i + 1) / 400) - fn(i / 400)) * 400;
    if (v > best) (best = v), (at = (i + 0.5) / 400);
  }
  return at;
};
const LAYER_BUDGET = 24; // sharp words held on their own composited layers at once (see gpu-cost)
const TEXT_TAGS = /^(Words|MaskRise|Chain|TypeOn|Scramble|Roll)$/;
const twoWords = (t) => (t.match(/[A-Za-z][A-Za-z'’-]*/g) ?? []).length >= 2;
/** Every `const x = ...` declaration of a source as [lhs, rhs, index] (destructuring kept whole). */
const declsOf = (code) => [...code.matchAll(/\b(?:const|let|var)\s+(\{[^}]*\}|\[[^\]]*\]|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*([^;]+?)(?:;|(?=\n\s*(?:const|let|var|return|export|\})))/gs)].map((m) => [m[1], m[2], m.index]);
/**
 * The names an expression reads: string literals, the text of template literals (their ${...}
 * expressions stay), object keys ({ badge: ... }) and .property names are not names it reads, so
 * `const V = { badge: 4 }` never takes on the meaning of a variable called badge elsewhere.
 */
const namesIn = (expr) => {
  let s = '';
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < expr.length && expr[j] !== c) j += expr[j] === '\\' ? 2 : 1;
      s += ' ';
      i = j;
    } else if (c === '`') {
      let j = i + 1;
      while (j < expr.length && expr[j] !== '`') {
        if (expr[j] === '\\') j += 2;
        else if (expr[j] === '$' && expr[j + 1] === '{') {
          let depth = 1;
          let k = j + 2;
          while (k < expr.length && depth) {
            if (expr[k] === '{') depth++;
            else if (expr[k] === '}') depth--;
            k++;
          }
          s += ' ' + expr.slice(j + 2, k - 1) + ' ';
          j = k;
        } else j++;
      }
      s += ' ';
      i = j;
    } else s += c;
  }
  s = s.replace(/([{,]\s*)[A-Za-z_$][\w$]*\s*:(?!:)/g, '$1').replace(/(?<!\.)\.\s*[A-Za-z_$][\w$]*/g, ' ');
  return s.match(/[A-Za-z_$][\w$]*/g) ?? [];
};
/** Grows `set` with every name declared from an expression that reads one already in it. */
const propagate = (decls, set) => {
  for (let pass = 0; pass < 6; pass++) {
    let grew = false;
    for (const [lhs, rhs] of decls) {
      const ids = namesIn(rhs);
      if (!ids.some((id) => set.has(id))) continue;
      for (const name of lhs.match(/[A-Za-z_$][\w$]*/g) ?? []) if (!set.has(name)) (set.add(name), (grew = true));
    }
    if (!grew) break;
  }
  return set;
};
/** The JSX tag that opens at `i` ('<Name ...>'): its name and its full text, braces and strings respected. */
const tagAt = (code, i) => {
  const name = code.slice(i + 1).match(/^[A-Za-z][\w.]*/)?.[0];
  if (!name) return null;
  let depth = 0;
  for (let j = i + 1 + name.length; j < code.length; j++) {
    const c = code[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if ((c === '"' || c === "'") && depth === 0) {
      const e = code.indexOf(c, j + 1);
      if (e < 0) return null;
      j = e;
    } else if (c === '>' && depth === 0 && code[j - 1] !== '=') return { name, text: code.slice(i, j + 1) };
    else if (c === '<' && depth === 0) return null; // not a tag after all (a comparison or a generic)
  }
  return null;
};

/** Top-level comma split of an argument list or object body (brackets, braces, parens and strings respected). */
const splitArgs = (s) => {
  const out = [];
  let depth = 0;
  let start = 0;
  let q = null;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) {
      if (c === '\\') k++;
      else if (c === q) q = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') q = c;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (c === ',' && depth === 0) {
      out.push(s.slice(start, k).trim());
      start = k + 1;
    }
  }
  const last = s.slice(start).trim();
  if (last) out.push(last);
  return out;
};
// ---------------------------------------------------------------------------------- ui-accent-bar
// Product UI is simple and aligned: a card reads by its fill, its type and its real content, never by a vertical accent
// line or bar on its edge. Found statically: a side border (borderLeft / border-left / borderInlineStart ...) 2 px or
// wider, or in a saturated colour; an inset box-shadow that paints one side (inset 3px 0 0 <colour>); a thin bar element
// (1.5-16 px wide, 2.5x as tall or stretched top to bottom) filled with a colour that is not a neutral line token. Left out:
// a corner or frame (the side border with a top or bottom one), hairline dividers in a line token, the bars of a chart or
// meter (drawn in a map callback), carets and cursors, and bar elements inside fx/ and lib/ (house primitives).
const UI_BAR_MSG = "product UI is simple and aligned: a card reads by its fill, its type and its real content (an icon, the real mark, a photo), never a stripe or a pill down its side; take the bar out (look-audit's ui-accent-bar finds it in the render)";
/** The innermost {...} group around index i: [open, close] or null. */
const braceAround = (code, i) => {
  let depth = 0;
  let open = -1;
  for (let j = i; j >= 0; j--) {
    const c = code[j];
    if (c === '}') depth++;
    else if (c === '{' && depth-- === 0) { open = j; break; }
  }
  if (open < 0) return null;
  depth = 0;
  for (let j = open; j < code.length; j++) {
    const c = code[j];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return [open, j];
  }
  return null;
};
/** A colour expression: 'neutral' (a line, mute, ink or ground token, a grey literal), 'accent' (the accent, a brand or state
 * token, a saturated literal) or 'unknown' (a variable). */
const inkKind = (s) => {
  const v = String(s);
  if (/accent|brand|primary|highlight|second\b|signal|success|warn|danger|error|info\b|live|hue|oklch\(|hsl\(/i.test(v)) return 'accent';
  const hex = v.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i);
  const rgb = v.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  const ch = hex ? (hex[1].length === 3 ? [...hex[1]].map((x) => parseInt(x + x, 16)) : [0, 2, 4].map((k) => parseInt(hex[1].slice(k, k + 2), 16))) : rgb ? rgb.slice(1, 4).map(Number) : null;
  if (ch) return Math.max(...ch) - Math.min(...ch) >= 24 ? 'accent' : 'neutral';
  if (/\b(lines?|rules?|divider|border|hair|mute|ink|text|ground|paper|surface|well|raised|gr[ae]y|shade|stroke|transparent|white|black|currentColor)(?![a-z])/i.test(v)) return 'neutral'; // C.line, UI.hair, inkA(0.06)
  return 'unknown';
};
/** The px width a value leads with: '3px solid', `${3}px`, `${(3 * u).toFixed(2)}px`, 4, '4px', 4 * u; null when it is a variable. */
const leadPx = (s) => {
  const v = String(s).trim();
  let m = /^(\d*\.?\d+)(?:\s*\*\s*[\w.]+)?$/.exec(v) ?? /^['"`]\s*(\d*\.?\d+)\s*px/.exec(v) ?? /^`\s*\$\{\s*\(*\s*(\d*\.?\d+)\b/.exec(v) ?? /^-?\s*(\d*\.?\d+)\s*(?:px)?\b/.exec(v);
  return m ? Number(m[1]) : null;
};
const styleEntries = (body) => {
  const map = new Map();
  for (const e of splitArgs(body)) {
    const m = /^\s*['"]?([\w-]+)['"]?\s*:\s*([\s\S]*)$/.exec(e);
    if (m) map.set(m[1], m[2].trim());
  }
  return map;
};
function uiAccentBars(code, report, { isScript, house }) {
  const seen = new Set();
  const say = (i, sev, what) => {
    if (seen.has(i)) return;
    seen.add(i);
    report(i, 'ui-accent-bar', sev, `${what}: ${UI_BAR_MSG}`);
  };
  // 1. a side border (camelCase in scripts, CSS declarations in CSS, HTML and template strings)
  const sides = isScript
    ? /(?<![\w$.-])(border(?:Left|Right|InlineStart|InlineEnd))(Width|Color)?\s*:\s*/g
    : /(?<![\w-])(border-(?:left|right|inline-start|inline-end))(-width|-color)?\s*:\s*/g;
  const cssSides = /(?<![\w-])(border-(?:left|right|inline-start|inline-end))(-width|-color)?\s*:\s*([^;'"`}{]+)/g;
  const checkSide = (i, prop, part, value, group) => {
    if (/(?<![\w-])border(Top|Bottom|Block\w*)?\s*:|(?<![\w-])border(-top|-bottom|-block[\w-]*)?\s*:/.test(group)) return; // a corner or a frame
    const v = value.replace(/[,;]\s*$/, '');
    if (/^['"`]?\s*(none|0(px)?\b|hidden)/.test(v)) return;
    const px = part && /color/i.test(part) ? null : leadPx(v);
    const ink = inkKind(v);
    if (part && /color/i.test(part)) return ink === 'accent' && say(i, 'error', `a side border in ${v.slice(0, 40)} (${prop}${part})`);
    if (ink === 'accent') return say(i, 'error', `a ${px !== null ? `${px} px ` : ''}${prop}${part ?? ''} in the accent or a saturated colour`);
    if (px !== null && px >= 3) return say(i, ink === 'neutral' ? 'warn' : 'error', `a ${px} px ${prop}${part ?? ''} on a card`);
    if (px !== null && px >= 2 && ink === 'unknown') return say(i, 'warn', `a ${px} px ${prop}${part ?? ''} in a colour set by a variable`);
    if (px === null && ink === 'unknown') say(i, 'warn', `a ${prop} of a width set by a variable`);
  };
  if (isScript) {
    for (const m of code.matchAll(sides)) {
      const g = braceAround(code, m.index);
      const body = g ? code.slice(g[0] + 1, g[1]) : '';
      const value = styleEntries(body).get(m[1] + (m[2] ?? '')) ?? code.slice(m.index + m[0].length, m.index + m[0].length + 80);
      checkSide(m.index, m[1], m[2], value, body);
    }
  }
  for (const m of code.matchAll(cssSides)) {
    if (isScript && !/[`'"]/.test(code.slice(Math.max(0, code.lastIndexOf('\n', m.index)), m.index))) continue; // scripts: only CSS inside a string
    const g = braceAround(code, m.index);
    checkSide(m.index, m[1], m[2], m[3], g ? code.slice(g[0] + 1, g[1]) : '');
  }
  // 2. an inset shadow that paints one side: inset 3px 0 0 <colour>, inset -${(4 * u)}px 0 0 ${t.accent}
  for (const m of code.matchAll(/\binset\s+(-?\s*(?:\$\{[^}]*\}|\d*\.?\d+))(?:px)?\s+0(?:px)?\s+0(?:px)?\s+(?:0(?:px)?\s+)?([^,'"`;)]*(?:\$\{[^}]*\}[^,'"`;)]*)?)/g)) {
    const px = leadPx(m[1].replace(/^-\s*/, '').replace(/^\$\{\s*/, '`${'));
    if (px === 0) continue;
    const ink = inkKind(m[2]);
    const what = `an inset shadow painting one side of a card${px !== null ? ` (${px} px)` : ''}`;
    if (ink === 'accent') say(m.index, 'error', what);
    else if (px !== null && px >= 3) say(m.index, 'warn', `${what} in ${ink === 'neutral' ? 'a neutral' : 'a variable'} colour (a divider is a hairline)`);
  }
  // 3. a thin bar element beside a title or down a card's side (not in house primitives, not a chart's or meter's bars)
  if (!isScript || house) return;
  const ranges = [];
  for (const m of code.matchAll(/\.map\s*\(|\bArray\.from\s*\(/g)) {
    const open = code.indexOf('(', m.index + (m[0].startsWith('.') ? 0 : 10));
    if (open >= 0) ranges.push([open, open + parenGroup(code, open).length + 1]);
  }
  const groups = new Set();
  for (const m of code.matchAll(/(?<![\w$.-])width\s*:/g)) {
    const g = braceAround(code, m.index);
    if (!g || groups.has(g[0]) || g[1] - g[0] > 1200) continue;
    groups.add(g[0]);
    if (ranges.some(([a, b]) => g[0] > a && g[0] < b)) continue; // a chart's, meter's or list's repeated marks
    const body = code.slice(g[0] + 1, g[1]);
    const e = styleEntries(body);
    const fill = e.get('background') ?? e.get('backgroundColor') ?? e.get('fill');
    if (!fill || /caret|cursor|tick|needle|playhead|scrub/i.test(body + code.slice(Math.max(0, g[0] - 160), g[0]))) continue;
    if (/^['"]50%['"]$/.test(e.get('borderRadius') ?? '')) continue; // a dot
    const unit = (v) => /^(\d*\.?\d+)\s*\*\s*([\w.]+)$/.exec(String(v ?? '').trim());
    const wv = e.get('width');
    const wn = /^\d*\.?\d+$/.test(wv) ? Number(wv) : unit(wv) ? Number(unit(wv)[1]) : /^['"]\d*\.?\d+px['"]$/.test(wv) ? parseFloat(wv.slice(1)) : null;
    if (wn === null || wn < 1.5 || wn > 16) continue;
    const hv = e.get('height');
    const hn = /^\d*\.?\d+$/.test(hv ?? '') ? Number(hv) : unit(hv) && (!unit(wv) || unit(hv)[2] === unit(wv)[2]) ? Number(unit(hv)[1]) : /^['"]\d*\.?\d+px['"]$/.test(hv ?? '') ? parseFloat(hv.slice(1)) : null;
    const stretched = /^['"]100%['"]$/.test(hv ?? '') || (e.has('top') && e.has('bottom')) || /stretch/.test(e.get('alignSelf') ?? '');
    if (!stretched && !(hn !== null && hn >= 2.5 * wn)) continue;
    const ink = inkKind(fill);
    const edge = stretched && /^0$/.test(e.get('left') ?? e.get('right') ?? '');
    if (ink === 'neutral' && !(edge && wn >= 4)) continue; // a hairline divider, a scrollbar; a neutral stripe down a card's edge still warns
    say(g[0], ink === 'accent' ? 'error' : 'warn', `a ${wn} px wide vertical bar${ink === 'accent' ? ' in the accent' : ink === 'neutral' ? " down a card's edge" : ''} (an accent stripe or pill on a card's edge or before a title)`);
  }
}

/** Every call of one of `names` in a source string: { name, args, index }. */
const callsIn = (s, names) =>
  [...s.matchAll(new RegExp(`(?<![\\w$.])(${names.join('|')})\\s*\\(`, 'g'))].map((m) => ({ name: m[1], args: splitArgs(parenGroup(s, m.index + m[0].length - 1)), index: m.index }));
/** A tween's length in 60 fps frames from its endpoints: two numbers (film frames), or `A + n` / `A + f60(n)` after A. */
const span60 = (a, b) => {
  if (a === undefined || b === undefined) return null;
  const lit = (x) => {
    const t = x.trim();
    const m = t.match(/^f60x?\(\s*([\d.]+)\s*\)$/);
    if (m) return Number(m[1]);
    return /^-?[\d.]+$/.test(t) ? (Number(t) * 60) / filmFps : null;
  };
  const A = /^-?[\d.]+$/.test(a.trim()) ? Number(a) : null;
  const B = /^-?[\d.]+$/.test(b.trim()) ? Number(b) : null;
  if (A !== null && B !== null) return ((B - A) * 60) / filmFps;
  const m = b.trim().match(/^([\s\S]*?)\s*\+\s*(f60x?\(\s*[\d.]+\s*\)|[\d.]+)$/);
  if (m && m[1].replace(/\s+/g, '') === a.trim().replace(/\s+/g, '')) return lit(m[2]);
  return null;
};
/** The tweens in an expression (prog, tw, enter, leave, move, interpolate) as { a, b, from, to, ease, index, neg }. */
const tweensIn = (s) =>
  callsIn(s, ['prog', 'tw', 'enter', 'leave', 'move', 'interpolate']).map((c) => {
    const neg = /(^|[^\w.$])1\s*-\s*\(?\s*$/.test(s.slice(0, c.index)); // 1 - prog(...): the falling half
    if (c.name === 'interpolate') {
      const r = c.args[1]?.match(/^\[([\s\S]*)\]$/);
      const o = c.args[2]?.match(/^\[([\s\S]*)\]$/);
      const rr = r ? splitArgs(r[1]) : [];
      const oo = o ? splitArgs(o[1]) : [];
      return { ...c, neg, a: rr[0], b: rr[rr.length - 1], from: oo[0] ?? '0', to: oo[oo.length - 1] ?? '1', ease: (c.args[3] ?? '').match(/easing\s*:\s*([\w.]+)/)?.[1] ?? '' };
    }
    if (c.name === 'tw') return { ...c, neg, a: c.args[1], b: c.args[2], from: c.args[3] ?? '0', to: c.args[4] ?? '1', ease: c.args[5] ?? 'E.out' };
    const dflt = { enter: 'E.glideOut', leave: 'E.buildIn', move: 'E.strongInOut', prog: 'E.out' }[c.name];
    return { ...c, neg, a: c.args[1], b: c.args[2], from: '0', to: '1', ease: c.args[3] ?? dflt };
  });
/** Inline JSX style objects: { index, body, tag }. */
const styleObjects = (code) =>
  [...code.matchAll(/\bstyle\s*=\s*\{\{/g)].map((m) => {
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let j = open;
    for (; j < code.length; j++) {
      if (code[j] === '{') depth++;
      else if (code[j] === '}' && --depth === 0) break;
    }
    const tagStart = code.lastIndexOf('<', m.index);
    return { index: m.index, body: code.slice(open + 1, j), tag: tagStart >= 0 ? tagAt(code, tagStart) : null };
  });
/** One key's value in an object literal body (top level). */
const keyOf = (body, key) => {
  for (const part of splitArgs(body)) {
    const m = part.match(new RegExp(`^['"]?${key}['"]?\\s*:\\s*([\\s\\S]*)$`));
    if (m) return m[1];
  }
  return null;
};
const isZeroish = (x) => /^\s*(0|0?\.[01]\d*)\s*$/.test(x ?? '');
const isOneish = (x) => /^\s*(1(\.0+)?|0?\.[5-9]\d*)\s*$/.test(x ?? '');

// ---------------------------------------------------------------------------------- lint
const issues = [];
let suppressed = 0;
let brandSupplied = 0;
let accentFace = 0;
// ---------------------------------------------------------------------------------- placeholders (scripts/placeholders.json)
const PLACEHOLDERS = (() => {
  const fallback = { words: ['lorem', 'ipsum', 'dolor sit', 'placeholder', 'label text', 'sample text', 'dummy text', 'text here', 'title here'], labels: ['label', 'text', 'heading', 'subtitle', 'caption', 'button', 'placeholder', 'lorem'], numbered: ['item', 'label', 'text', 'title', 'card'] };
  try {
    const j = JSON.parse(readFileSync(new URL('./placeholders.json', import.meta.url), 'utf8'));
    return { words: j.words ?? fallback.words, labels: j.labels ?? fallback.labels, numbered: j.numbered ?? fallback.numbered };
  } catch {
    return fallback;
  }
})();
const escRe = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
const PH_WORDS = new RegExp(`(?<![\\w-])(${PLACEHOLDERS.words.map(escRe).join('|')})(?![\\w-])`, 'i');
const PH_LABEL = new RegExp(`^\\s*(${PLACEHOLDERS.labels.map(escRe).join('|')})\\s*[.:]?\\s*$`, 'i');
const PH_NUMBERED = new RegExp(`^\\s*(${PLACEHOLDERS.numbered.map(escRe).join('|')})\\s*#?\\d{1,3}\\s*$`, 'i');
/** The placeholder a string shows, or null: a placeholder word anywhere, or the whole string a generic label or a generic noun and a number. */
const placeholderIn = (s) => {
  const t = String(s ?? '').trim();
  if (!t) return null;
  const w = PH_WORDS.exec(t);
  if (w) return w[1];
  if (PH_LABEL.test(t) || PH_NUMBERED.test(t)) return t;
  return null;
};

/**
 * A whole-string all-digit '#NNN' at quote index `q` read as a number label (a pull request, an order, a ticket)
 * rather than a colour: its key names copy (ui, label, text, title, id, number ...), or its array literal holds a
 * string with words in it. A key that names a colour, or no key, keeps it a colour.
 */
const LABEL_KEY = /^(ui|labels?|texts?|titles?|copy|lines?|strings?|names?|ids?|numbers?|nums?|counts?|tags?|prs?|issues?|tickets?|refs?|orders?|items?|rows?|words?|chips?|captions?|status|values?)$/i;
const COLOUR_KEY = /(colou?r|bg|background|fill|stroke|ink|accent|paper|ground|tint|shade|hue|border|shadow|gr[ae]y|black|white|dark|light)/i;
const numberLabel = (code, q) => {
  const before = code.slice(Math.max(0, q - 400), q);
  const key = before.match(/([A-Za-z_$][\w$]*)['"]?\s*[:=]\s*(\[[^\]]*)?$/)?.[1];
  if (key && COLOUR_KEY.test(key)) return false;
  if (key && LABEL_KEY.test(key)) return true;
  // the enclosing array literal, if any: a sibling string with a space or a letter outside hex is copy
  let depth = 0;
  let open = -1;
  for (let k = q - 1; k >= Math.max(0, q - 2000); k--) {
    const c = code[k];
    if (c === ']' || c === ')' || c === '}') depth++;
    else if (c === '[' || c === '(' || c === '{') {
      if (depth === 0) {
        open = c === '[' ? k : -1;
        break;
      }
      depth--;
    }
  }
  if (open < 0) return false;
  const close = code.indexOf(']', q);
  if (close < 0) return false;
  const sibs = [...code.slice(open, close).matchAll(/(['"`])((?:(?!\1)[^\\\n]|\\.)*)\1/g)].map((x) => x[2]);
  return sibs.some((s) => /\s/.test(s.trim()) || /[g-z]/i.test(s.replace(/^#/, '')));
};

/** The points of an SVG path's subpaths (curves sampled at quarter steps), for shape tests. */
const pathPoints = (d) => {
  const toks = String(d).match(/[MmLlHhVvCcSsQqTtAaZz]|-?(?:\d+\.?\d*|\.\d+)(?:e-?\d+)?/g) ?? [];
  const subs = [];
  let pts = [];
  let x = 0, y = 0, sx = 0, sy = 0, cmd = '', k = 0, lc = null;
  const num = () => Number(toks[k++]);
  // a straight edge is sampled too, so a flat end (a plus's arm) reads as two corners, not one tip
  const line = (nx, ny) => {
    for (const t of [0.25, 0.5, 0.75]) pts.push([x + (nx - x) * t, y + (ny - y) * t]);
    pts.push([nx, ny]);
    x = nx;
    y = ny;
  };
  const isNum = () => k < toks.length && !/^[A-Za-z]$/.test(toks[k]);
  const bez = (p) => {
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const u = 1 - t;
      const b = p.length === 4
        ? [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]
        : [u * u * p[0][0] + 2 * u * t * p[1][0] + t * t * p[2][0], u * u * p[0][1] + 2 * u * t * p[1][1] + t * t * p[2][1]];
      pts.push(b);
    }
  };
  while (k < toks.length) {
    if (/^[A-Za-z]$/.test(toks[k])) cmd = toks[k++];
    else if (!cmd) return subs;
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    const ox = rel ? x : 0, oy = rel ? y : 0;
    if (C === 'Z') {
      if (pts.length > 1) {
        line(sx, sy);
        pts.pop(); // the start point is already the first
      }
      if (pts.length) subs.push(pts);
      pts = [];
      x = sx; y = sy; lc = null;
      continue;
    }
    if (!isNum()) { k++; continue; }
    if (C === 'M') {
      if (pts.length) subs.push(pts);
      x = ox + num(); y = oy + num(); sx = x; sy = y; pts = [[x, y]]; lc = null;
      cmd = rel ? 'l' : 'L';
    } else if (C === 'L' || C === 'T') {
      line(ox + num(), oy + num());
      lc = null;
    } else if (C === 'H') {
      line((rel ? x : 0) + num(), y);
      lc = null;
    } else if (C === 'V') {
      line(x, (rel ? y : 0) + num());
      lc = null;
    }
    else if (C === 'C') {
      const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()];
      bez([[x, y], p1, p2, p3]); lc = p2; [x, y] = p3;
    } else if (C === 'S') {
      const p1 = lc ? [2 * x - lc[0], 2 * y - lc[1]] : [x, y];
      const p2 = [ox + num(), oy + num()], p3 = [ox + num(), oy + num()];
      bez([[x, y], p1, p2, p3]); lc = p2; [x, y] = p3;
    } else if (C === 'Q') {
      const p1 = [ox + num(), oy + num()], p2 = [ox + num(), oy + num()];
      bez([[x, y], p1, p2]); lc = null; [x, y] = p2;
    } else if (C === 'A') {
      for (let j = 0; j < 5; j++) num();
      line(ox + num(), oy + num());
      lc = null;
    } else k++;
    if ([x, y].some((v) => !Number.isFinite(v))) return subs;
  }
  if (pts.length) subs.push(pts);
  return subs;
};

/**
 * A star or sparkle outline: 4-8 tips at one radius, evenly spaced round the centre, with the outline falling to
 * under 0.6 of that radius between them (a five-point star, a four-point "AI" sparkle with its inward curves).
 * A plus, a letter, a regular polygon or a gear does not pass all three.
 */
const isStarOutline = (pts) => {
  if (pts.length < 8) return false;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const r = pts.map(([px, py]) => Math.hypot(px - cx, py - cy));
  const R = Math.max(...r);
  if (!(R > 0)) return false;
  const n = r.length;
  const tips = [];
  for (let j = 0; j < n; j++) {
    const a = r[(j - 1 + n) % n], b = r[(j + 1) % n];
    if (r[j] >= 0.8 * R && r[j] >= a && r[j] > b) tips.push(j);
  }
  if (tips.length < 4 || tips.length > 8) return false;
  const tr = tips.map((j) => r[j]);
  const mean = tr.reduce((s, v) => s + v, 0) / tr.length;
  if (Math.sqrt(tr.reduce((s, v) => s + (v - mean) ** 2, 0) / tr.length) > 0.12 * mean) return false;
  const ang = tips.map((j) => Math.atan2(pts[j][1] - cy, pts[j][0] - cx)).sort((p, q) => p - q);
  const gaps = ang.map((v, j) => (j + 1 < ang.length ? ang[j + 1] - v : ang[0] + 2 * Math.PI - v));
  const g = (2 * Math.PI) / gaps.length;
  if (gaps.some((v) => Math.abs(v - g) > 0.2 * g)) return false;
  // between each pair of tips (in path order) the outline dips under 0.6 R
  const order = [...tips].sort((p, q) => p - q);
  for (let t = 0; t < order.length; t++) {
    const a = order[t], b = order[(t + 1) % order.length];
    let lo = Infinity;
    for (let j = (a + 1) % n; j !== b; j = (j + 1) % n) lo = Math.min(lo, r[j]);
    if (!(lo < 0.6 * R)) return false;
  }
  return true;
};

const BRAND_RE = /cinetic:brand-supplied\b/;
const BRAND_REASON_RE = /cinetic:brand-supplied\b[\s:,.;–—-]*[\w"'#(]/;
// house palette rules a supplied brand also overrides (its colours are checked only for contrast and the one-accent rule)
const BRAND_RULES = new Set(['pure-ink', 'gradient-shape']);
// the one italic accent face for a payoff word (SKILL.md Hard bans: Type): covers italic and serif on its line and the next
const ACCENT_RE = /cinetic:accent-face\b/;
const ACCENT_REASON_RE = /cinetic:accent-face\b[\s:,.;–—-]*[\w"'#(]/;
const ACCENT_RULES = new Set(['italic', 'serif']);
const LIGHT_RE = /cinetic:light\b/; // a declared light field or soft shape in fx/ or lib/ (see glow)
// a device's own palette in fx/ or lib/ (spectral runs, false-colour maps, mask stops): see the header
const DEVICE_RE = /cinetic:device-palette\b/;
const DEVICE_REASON_RE = /cinetic:device-palette\b[\s:,.;–—-]*[\w"'#(]/;
const DEVICE_RULES = new Set(['banned-color', 'off-token-color']);
const HOUSE_SCENE_RE = /cinetic:house-scene\b/; // a house scene of the scene bank (src/scenes): see the header
let devicePalette = 0;
const springUses = []; // underdamped spring uses across the film, for spring-budget
const giantUses = []; // act files that set a giant word, for giant-once
const emphMarks = []; // box-type emphasis devices named in film files, for emphasis-signature
const emphLines = { lines: 0, literal: 0, shares: [] }; // script line elements and literal emphases in acts, for emphasis-share

for (const file of files) {
  const raw = readFileSync(file, 'utf8');
  const ext = extname(file);
  const isHtml = ext === '.html' || ext === '.htm';
  const isCss = ext === '.css';
  const isScript = !isHtml && !isCss;
  const rel = relative(process.cwd(), file) || file;
  const norm = file.split(sep).join('/');
  const isAnim = /(^|\/)lib\/anim\.(ts|js|mjs)$/.test(norm) || /(^|\/)motion\.js$/.test(norm);
  const isTokens = tokensPath && resolve(file) === tokensPath;
  const code = isCss ? stripComments(raw, false) : stripComments(raw, isHtml);
  const lines = raw.split('\n');
  const lineStarts = [0];
  for (let k = 0; k < raw.length; k++) if (raw[k] === '\n') lineStarts.push(k + 1);
  const pos = (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 };
  };
  // Brand-supplied escape: a marker in the leading comment block (HTML: before <body>/<template>)
  // covers the file's hard-ban findings; anywhere else it covers its own line and the next.
  const headEnd = isHtml
    ? (() => {
        const k = raw.search(/<(body|template)\b/i);
        return k < 0 ? 0 : k;
      })()
    : Math.max(0, code.search(/\S/));
  const brandFile = isHtml
    ? (raw.slice(0, headEnd).match(/<!--[\s\S]*?-->/g) ?? []).some((c) => BRAND_RE.test(c))
    : BRAND_RE.test(raw.slice(0, headEnd));
  // Device palette: in fx/ or lib/, the leading comment covers the file; a marker elsewhere covers its
  // line through the next blank line (one palette block).
  const inDevice = /(^|\/)(fx|lib)\//.test(norm);
  const deviceFile = inDevice && DEVICE_RE.test(raw.slice(0, headEnd));
  // a house scene (src/scenes, marked cinetic:house-scene in its leading comment) paints its own ground and stops
  // from the palette it is given: its literals are not the film's tokens, but the banned colours still apply
  const houseScene = /(^|\/)scenes\//.test(norm) && HOUSE_SCENE_RE.test(raw.slice(0, headEnd));
  const deviceSpans = [];
  if (inDevice)
    lines.forEach((l, k) => {
      if (!DEVICE_RE.test(l)) return;
      let e = k;
      while (e + 1 < lines.length && lines[e + 1].trim() !== '') e++;
      deviceSpans.push([k + 1, e + 1]);
    });
  const report = (idx, rule, severity, message) => {
    if (opt.allow.has(rule) || [...opt.allow].some((a) => a.endsWith('*') && rule.startsWith(a.slice(0, -1)))) return;
    const { line, col } = pos(idx);
    const here = lines[line - 1] ?? '';
    const prev = lines[line - 2] ?? '';
    if ((DEVICE_RULES.has(rule) && (deviceFile || deviceSpans.some(([a, b]) => line >= a && line <= b))) || (rule === 'off-token-color' && houseScene)) {
      devicePalette++;
      return;
    }
    if (ACCENT_RULES.has(rule) && (ACCENT_RE.test(here) || ACCENT_RE.test(prev))) {
      accentFace++;
      return;
    }
    if ((HARD_BANS.has(rule) || BRAND_RULES.has(rule)) && (brandFile || BRAND_RE.test(here) || BRAND_RE.test(prev))) {
      brandSupplied++;
      return;
    }
    if (/lint-ok\s*:\s*\S/.test(here) || /lint-ok\s*:\s*\S/.test(prev)) {
      suppressed++;
      return;
    }
    if (issues.some((x) => x.file === rel && x.line === line && x.rule === rule && x.message === message)) return;
    issues.push({ file: rel, line, col, rule, severity, message, excerpt: here.trim().slice(0, 140) });
  };
  const each = (re, fn) => {
    for (const m of code.matchAll(re)) fn(m, m.index);
  };

  for (const m of raw.matchAll(/cinetic:brand-supplied\b.*/g))
    if (!BRAND_REASON_RE.test(m[0].replace(/\*\/|-->/g, '')))
      report(m.index, 'brand-supplied', 'error', 'say what the brand supplied after cinetic:brand-supplied (and record it in BRIEF.md)');
  for (const m of raw.matchAll(/cinetic:accent-face\b.*/g))
    if (!ACCENT_REASON_RE.test(m[0].replace(/\*\/|-->/g, '')))
      report(m.index, 'brand-supplied', 'error', 'name the family after cinetic:accent-face (the one italic accent face for a payoff word, SKILL.md Hard bans: Type)');
  for (const m of raw.matchAll(/cinetic:device-palette\b.*/g)) {
    if (!inDevice) report(m.index, 'device-palette', 'warn', 'cinetic:device-palette is honoured only inside fx/ or lib/: keep the device palette in its device file, or put the colours in the tokens with their job');
    else if (!DEVICE_REASON_RE.test(m[0].replace(/\*\/|-->/g, ''))) report(m.index, 'device-palette', 'error', "say the palette's job after cinetic:device-palette (a spectral run, a false-colour map, mask stops)");
  }

  // --- css-animation
  if (!isScript) {
    each(/(?<![\w-])(transition|animation)(-[a-z-]+)?\s*:/g, (m, i) =>
      report(i, 'css-animation', 'error', `CSS ${m[1]} runs on wall-clock time, not the render clock; drive it from the frame`),
    );
  } else {
    // a style key with a literal value: transition: 'opacity 0.3s', animationName: 'spin'
    each(/(?<![\w$.])(transition|animation)([A-Z]\w*)?\s*:\s*['"`]/g, (m, i) =>
      report(i, 'css-animation', 'error', `style ${m[1]}${m[2] ?? ''} runs on wall-clock time, not the render clock; drive it from the frame`),
    );
    // CSS text inside a string or template: 'transition: all 300ms', `animation: spin 2s`
    each(/(?<![\w-])(transition|animation)(-[a-z-]+)?\s*:\s*[^;'"`\n]*?\d*\.?\d+m?s\b/g, (m, i) =>
      report(i, 'css-animation', 'error', `CSS ${m[1]} in a string runs on wall-clock time; drive it from the frame`),
    );
  }
  each(/@keyframes\b/g, (m, i) => report(i, 'css-animation', 'error', '@keyframes do not follow the render clock; animate from the frame'));
  each(/\bclass(?:Name)?\s*=\s*(?:\{\s*)?["'`]([^"'`]*)["'`]/g, (m, i) => {
    const bad = m[1].split(/\s+/).find((c) => /^(animate|transition)(-|$)/.test(c));
    if (bad) report(i, 'css-animation', 'error', `utility class ${bad} animates in real time, not per frame`);
  });

  // --- nondeterminism
  each(/\bMath\.random\s*\(/g, (m, i) => report(i, 'nondeterminism', 'error', 'Math.random differs per render and per tab; use rand(seed) or random(seed)'));
  each(/\b(Date\.now|performance\.now)\s*\(/g, (m, i) => report(i, 'nondeterminism', 'error', `${m[1]} reads wall-clock time; derive everything from the frame`));
  each(/\bnew\s+Date\s*\(\s*\)/g, (m, i) => report(i, 'nondeterminism', 'error', 'new Date() reads wall-clock time; pass a fixed date'));

  // --- will-change-blur
  if (isScript || isCss) {
    const animatedBlur = /blur\(\s*\$\{|blur\(\s*['"`]?\s*\+|blur\([^)]*\$\{/.test(code) || /filter\s*:\s*[^'"`,}\n]*\bblur\b/.test(code);
    if (animatedBlur)
      each(/\b(willChange|will-change)\s*:/g, (m, i) => report(i, 'will-change-blur', 'error', 'will-change in a file that animates blur(): compositor promotion leaves stale ghost frames'));
  }

  // --- frame-left-top: identifiers derived from useCurrentFrame()
  if (isScript) {
    const tainted = new Set(['frame']);
    for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*useCurrentFrame\s*\(/g)) tainted.add(m[1]);
    propagate(declsOf(code), tainted);
    each(/(?<![\w$.-])(left|top|right|bottom|marginLeft|marginTop)\s*:\s*([^,}\n]+)/g, (m, i) => {
      const val = m[2];
      if (/^\s*(number|string|boolean|undefined|null)\b/.test(val)) return; // type annotation
      const ids = (val.match(/[A-Za-z_$][\w$]*/g) ?? []).filter((id) => !/^(Math|px|em|calc)$/.test(id));
      const hitId = ids.find((id) => tainted.has(id));
      if (hitId) report(i, 'frame-left-top', 'error', `${m[1]} follows the frame (via ${hitId}): fractional layout offsets snap to whole pixels; move it into transform: translate()`);
    });
  }

  // --- raw easing / springs outside lib/anim
  if (!isAnim && (isScript || isCss)) {
    each(/\bEasing\.(bezier|spring|elastic|bounce|back|poly|sin|circle|exp|quad|cubic)\s*\(/g, (m, i) =>
      report(i, 'raw-easing', 'error', `Easing.${m[1]} outside lib/anim.ts: add a named token to E (one house motion system)`),
    );
    each(/cubic-bezier\s*\(/g, (m, i) => report(i, 'raw-easing', 'error', 'raw cubic-bezier: use a named easing token'));
    each(/\{[^{}]*\bdamping\s*:[^{}]*\bstiffness\s*:[^{}]*\}|\{[^{}]*\bstiffness\s*:[^{}]*\bdamping\s*:[^{}]*\}/g, (m, i) =>
      report(i, 'spring-config', 'error', 'inline spring config: add a named preset to SPR in lib/anim.ts and use it'),
    );
  }

  // --- interpolate without clamp
  if (isScript) {
    each(/(?<![\w$])interpolate\s*\(/g, (m, i) => {
      const args = parenGroup(code, i + m[0].length - 1);
      const left = /extrapolateLeft\s*:\s*['"]clamp['"]/.test(args);
      const right = /extrapolateRight\s*:\s*['"]clamp['"]/.test(args);
      if (left && right) return;
      if (/\bclamp\b|CLAMP/i.test(args.replace(/['"]clamp['"]/g, ''))) return; // options object from a named constant
      report(i, 'interpolate-clamp', 'error', `interpolate() extends past its range by default (${left ? 'right' : right ? 'left' : 'both sides'} unclamped); use tw()/prog() or clamp both sides`);
    });
  }

  // --- colours
  // the :root blocks of a tokens-less (HyperFrames) project declare the palette
  const rootSpans = !tokensPath && (isHtml || isCss) ? [...raw.matchAll(ROOT_BLOCK_RE)].map((m) => [m.index, m.index + m[0].length]) : [];
  const banColor = (i, lit, c) => {
    if (!c || c.a < 0.02) return;
    const lch = lchOf(c);
    const why = bannedRegion(lch);
    if (why)
      report(i, 'banned-color', 'error', `${lit} is ${why} (${fmtLch(lch)}): a hard ban when you invent the look (references/brand-and-color.md §8). The user's own brand colour? Mark it // cinetic:brand-supplied <what> and record it in BRIEF.md`);
  };
  each(HEX_RE, (m, i) => {
    const prev = code.slice(Math.max(0, i - 5), i);
    if (/url\($/.test(prev) || /&$/.test(prev)) return;
    const q = code[i - 1];
    if (isScript && !/['"`\s:(,]/.test(q)) return;
    if (isHtml && /href\s*=\s*["']$|id\s*=\s*["']$/.test(code.slice(Math.max(0, i - 10), i))) return;
    // "#2187 built", "PR #412": an all-digit #NNN(N) inside running text is a number label. It counts as a
    // colour only as a whole string ('#123') or after a colour property.
    if (isScript && /^#\d{3,4}$/.test(m[0])) {
      const alone = /['"`]/.test(q) && /['"`]/.test(code[i + m[0].length] ?? '');
      const prop = /(colou?r|background|fill|stroke|border|outline|shadow)[\w-]*['"]?\s*[:=][^;\n]{0,40}$/i.test(code.slice(Math.max(0, i - 60), i));
      if (!alone && !prop) return;
      // ui: ['Add order history export', '#482', 'Ferry'], { text: '#482' }: a whole-string number label is
      // the product's own copy (a pull request, an order, a ticket) when its key names copy or its array
      // holds words; a key that names a colour, or none, keeps it a colour
      if (alone && !prop && numberLabel(code, i - 1)) return;
    }
    banColor(i, m[0], colorOf(m[0])); // every colour, the tokens file and the :root palette included
    if (isTokens || rootSpans.some(([a, b]) => i >= a && i < b)) return;
    if (!paletteName) return;
    if (!tokenHex.has(normHex(m[0])))
      report(i, 'off-token-color', 'error', `${m[0]} is not a brand token (${paletteName}); add it there with its job, or use an existing token`);
  });
  each(/\b(rgba?|hsla?|oklch|oklab|lab|lch)\(\s*([^)]*)\)/g, (m, i) => {
    if (/\$\{/.test(m[2])) return; // built from tokens at runtime
    // a helper called on a variable (lab(m.color), rgb(mix(a, b))) in script: code, not a literal
    if (isScript && /^[A-Za-z_$]/.test(m[2]) && !/^(none|from)\b/.test(m[2])) return;
    if (/^(rgba?|oklch)$/.test(m[1])) banColor(i, m[0].slice(0, 40), colorOf(m[0]));
    if (isTokens) return;
    const nums = m[2].split(/[\s,/]+/).filter(Boolean);
    if (/^rgba?$/.test(m[1]) && nums.length >= 3) {
      const rgb = nums.slice(0, 3).map(Number);
      if (rgb.every((v) => v === 0) || rgb.every((v) => v === 255)) return; // black/white shadows and veils
    }
    report(i, 'off-token-color', 'warn', `colour literal ${m[0].slice(0, 40)}: prefer a token (pure black/white alphas for shadows are fine)`);
  });
  // CSS colour names (orange, gold, tan, purple, …) in a colour property or attribute
  each(/(?<![\w$-])(colou?r|background(?:-?color)?|fill|stroke|border(?:-?(?:top|bottom|left|right))?(?:-?color)?|outline(?:-?color)?|stop-?color|caret-?color|accent-?color|--[\w-]+)\s*[:=]\s*([^;\n}]*)/gi, (m, i) => {
    const vals = isScript ? [...m[2].matchAll(/(['"`])([^'"`]*)\1/g)].map((x) => x[2]) : [m[2]];
    for (const v of vals)
      for (const w of v.match(/(?<![\w.$#-])[a-z]+(?![\w-])/gi) ?? [])
        if (NAMED[w.toLowerCase()]) banColor(i, `'${w}'`, colorOf(w));
  });

  // --- serif and italic (hard bans)
  each(/fontStyle\s*:\s*['"`](italic|oblique)|font-style\s*:\s*(italic|oblique)/g, (m, i) =>
    report(i, 'italic', 'error', 'italic/oblique is a hard ban: emphasis comes from size, weight or motion'),
  );
  each(/<(i|em)(\s[^>]*)?>/g, (m, i) => report(i, 'italic', 'error', `<${m[1]}> renders italic (a hard ban); use a weight or size change`));
  // skew fakes an italic on text: an error on a style or rule that also sets type, a warning elsewhere
  each(/\bskew[XY]?\s*(\(|:)/g, (m, i) => {
    let a = i;
    for (let depth = 0; a > 0; a--) {
      if (code[a] === '}') depth++;
      else if (code[a] === '{' && depth-- === 0) break;
    }
    let b = i;
    for (let depth = 0; b < code.length; b++) {
      if (code[b] === '{') depth++;
      else if (code[b] === '}' && depth-- === 0) break;
    }
    const block = code.slice(a, b);
    if (/\bfont(Size|Family|Weight)\b|\bletterSpacing\b|\btypeStyle\s*\(|\bTYPE\.|font-(size|family|weight)|letter-spacing/.test(block))
      report(i, 'italic', 'error', 'skew on type is a faux italic (a hard ban); move it to a shape, or drop it');
    else report(i, 'italic', 'warn', 'skew: fine on a shape (a smear on a whip); on an element that holds text it is a faux italic, a hard ban');
  });
  // tracking so tight the letters touch: at a wordmark's or a line's size an r and an n merge ("Cairnly" reads "Caimly")
  each(/letter-?[sS]pacing\s*:\s*['"`]?\s*(-\d*\.?\d+)\s*em/g, (m, i) => {
    if (Number(m[1]) < -0.05)
      report(i, 'tight-tracking', 'warn', `letterSpacing ${m[1]}em: the letters touch (an r and an n read as an m); giant type holds -0.05em at the tightest, lines and names -0.02em`);
  });
  const serifMsg = (what) => `${what} is a serif face: a hard ban when you invent the look (one clean sans, references/brand-and-color.md §2). The user's own brand face? Mark it // cinetic:brand-supplied <what> and record it in BRIEF.md`;
  each(/@fontsource(?:-variable)?\/([\w-]+)|@remotion\/google-fonts\/([\w-]+)/g, (m, i) => {
    if (isSerifFamily(m[1] ?? m[2])) report(i, 'serif', 'error', serifMsg(m[0]));
  });
  {
    // family lists and font shorthands in strings: FONT, FACES, fontFamily, ctx.font, document.fonts.load
    each(/(['"`])((?:(?!\1)[^\n\\])*)\1/g, (m, i) => {
      const v = m[2];
      const looksLikeFont =
        /(^|,)\s*(serif|sans-serif|monospace|system-ui|ui-serif|ui-sans-serif|ui-monospace|cursive)\s*(,|$)/.test(v) ||
        /^\s*(?:(?:normal|bold|\d{3})\s+)*\d+(?:\.\d+)?(?:px|em|rem|pt)\s+\S/.test(v) ||
        /(^|["'])[A-Z][\w ]* Variable(["']|$)/.test(v) ||
        /(fontFamily|family)\s*:\s*$/.test(code.slice(Math.max(0, i - 24), i));
      if (!looksLikeFont) return;
      const hits = serifIn(v);
      if (hits.length) report(i, 'serif', 'error', serifMsg(hits[0]));
    });
  }
  if (!isScript) {
    each(/font-family\s*:\s*([^;}\n]*)|\bfont\s*:\s*([^;}\n]*)/g, (m, i) => {
      const hits = serifIn(m[1] ?? m[2]);
      if (hits.length) report(i, 'serif', 'error', serifMsg(hits[0]));
    });
  }

  // --- glass and glow (hard bans)
  each(/(?<![\w-])(backdropFilter|WebkitBackdropFilter|(?:-webkit-)?backdrop-filter)\s*:\s*(['"`]?)\s*(\w*)/g, (m, i) => {
    if (m[3] !== 'none') report(i, 'glass', 'error', 'backdrop-filter is glassmorphism (a hard ban): use an opaque surface with one soft shadow (references/brand-and-color.md §11)');
  });
  const resolveColor = (t) => {
    const tok = t.match(/^\$\{\s*(?:[A-Za-z_$][\w$]*\.)?([A-Za-z_$][\w$]*)\s*\}$/) ?? t.match(/^var\(\s*--([\w-]+)\s*\)$/);
    if (tok) return tokenByName.has(tok[1]) ? colorOf(tokenByName.get(tok[1])) : null;
    return colorOf(t);
  };
  const glowLayer = (i, layer) => {
    if (/\binset\b/.test(layer)) return;
    const col = layer.match(/#[0-9a-fA-F]{3,8}\b|(?:rgba?|oklch|hsla?)\([^)]*\)|\$\{[^}]*\}(?!\s*(px|em|rem))|var\(--[\w-]+\)|\b(?:white|[a-z]+)\s*$/);
    if (!col) return;
    const c = resolveColor(col[0].trim());
    if (!c || c.a < 0.02) return;
    const lengths = layer.replace(col[0], ' ').match(/-?(\$\{[^}]*\}|\d*\.?\d+)(px|em|rem)?/g) ?? [];
    const blurTok = lengths[2];
    if (!blurTok) return;
    const blur = /\$\{/.test(blurTok) ? Infinity : parseFloat(blurTok);
    const dark = c.rgb ? Math.max(...c.rgb) <= 48 : lchOf(c).L < 0.3;
    if (!dark && blur >= 4)
      report(i, 'glow', 'error', `a ${lchOf(c).C > 0.04 ? 'coloured' : 'light'} shadow with ${Number.isFinite(blur) ? blur + ' px of ' : ''}blur is a glow or halo (a hard ban): a shadow is the ink colour at 6–12% (lib/look.ts SHADOW.paper: 0 12px 40px at 8%), and on ink use a luminance step plus a 1 px hairline`);
  };
  const splitLayers = (v) => {
    const out = [];
    let depth = 0;
    let start = 0;
    for (let k = 0; k < v.length; k++) {
      if ('({'.includes(v[k])) depth++;
      else if (')}'.includes(v[k])) depth--;
      else if (v[k] === ',' && depth === 0) (out.push(v.slice(start, k)), (start = k + 1));
    }
    out.push(v.slice(start));
    return out;
  };
  each(/(?<![\w-])(boxShadow|textShadow|box-shadow|text-shadow)\s*:\s*/g, (m, i) => {
    const rest = code.slice(i + m[0].length);
    let v;
    if (isScript) {
      const qm = rest.match(/^(['"`])/);
      if (!qm) return;
      const end = rest.indexOf(qm[1], 1);
      v = rest.slice(1, end < 0 ? undefined : end);
    } else v = rest.split(/[;}\n]/)[0];
    for (const layer of splitLayers(v)) glowLayer(i, layer);
  });
  each(/drop-shadow\(/g, (m, i) => glowLayer(i, parenGroup(code, i + m[0].length - 1)));

  // --- gradients
  each(/(repeating-)?(linear|radial|conic)-gradient\s*\(/g, (m, i) => {
    const body = parenGroup(code, i + m[0].length - 1);
    const colors = [];
    let dynamic = false;
    const withTokens = body.replace(/\$\{\s*(?:[A-Za-z_$][\w$]*\.)?([A-Za-z_$][\w$]*)\s*\}/g, (_, name) => {
      if (tokenByName.has(name)) return tokenByName.get(name);
      dynamic = true;
      return '';
    });
    for (const c of withTokens.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(([^)]*)\)|\btransparent\b|var\(--([\w-]+)\)/g)) {
      if (c[0] === 'transparent') colors.push({ rgb: null, a: 0 });
      else if (c[2]) {
        const hex = tokenByName.get(c[2]);
        if (hex) colors.push({ rgb: rgbOf(hex), a: 1 });
        else dynamic = true;
      } else {
        const col = colorOf(c[0]);
        if (col) colors.push(col);
      }
    }
    if (colors.length < 2) return;
    const chromatic = colors.filter((c) => c.rgb && c.a > 0.05).map((c) => oklch(c.rgb)).filter((c) => c.C > 0.04);
    if (chromatic.length >= 2) {
      const hs = chromatic.map((c) => c.h).sort((a, b) => a - b);
      let maxGap = 360 - hs[hs.length - 1] + hs[0];
      for (let k = 1; k < hs.length; k++) maxGap = Math.max(maxGap, hs[k] - hs[k - 1]);
      const spread = 360 - maxGap;
      if (spread > 40) report(i, 'gradient-multihue', 'error', `gradient spans ${Math.round(spread)} degrees of hue: a multi-hue gradient is a hard ban; use one hue (or a tonal field in the palette)`);
    }
    // a gradient that leans across hues reads as two colours: stage light keeps one hue (within 7 degrees)
    {
      const lit = colors.filter((c) => c.rgb && c.a > 0.05).map((c) => oklch(c.rgb)).filter((c) => c.C > 0.03);
      if (lit.length >= 2) {
        const hs = lit.map((c) => c.h).sort((a, b) => a - b);
        let gap = 360 - hs[hs.length - 1] + hs[0];
        for (let k = 1; k < hs.length; k++) gap = Math.max(gap, hs[k] - hs[k - 1]);
        const spread = 360 - gap;
        if (spread > 7 && spread <= 40)
          report(i, 'gradient-shape', 'warn', `gradient stops lean ${Math.round(spread)} degrees of hue apart: light is one hue (keep every chromatic stop within 7 degrees of the accent, or neutral)`);
      }
    }
    // a coloured radial falloff to nothing is a glow. In fx/ and lib/ a declared light field or soft shape
    // (`cinetic:light <what>` in the file's leading comment or on the line) is light, not a halo.
    if (m[2] === 'radial' && chromatic.length && colors.some((c) => c.a <= 0.02) && colors.some((c) => c.rgb && c.a >= 0.08 && oklch(c.rgb).C > 0.04)) {
      const { line } = pos(i);
      const declaredLight = /(^|\/)(fx|lib)\//.test(norm) && (LIGHT_RE.test(raw.slice(0, headEnd)) || LIGHT_RE.test(lines[line - 1] ?? '') || LIGHT_RE.test(lines[line - 2] ?? ''));
      if (!declaredLight)
        report(i, 'glow', 'error', 'a coloured radial falloff to transparent is a glow (a hard ban): light a stage with a one-hue field baked as a dithered PNG (references/brand-and-color.md §12); a light field or soft shape inside fx/ or lib/ declares itself with `cinetic:light <what>`');
    }
    const opaque = colors.filter((c) => c.rgb && c.a >= 0.99);
    if (!dynamic && opaque.length === colors.length && opaque.length >= 2) {
      const ls = opaque.map((c) => luma(c.rgb));
      const span = Math.max(...ls) - Math.min(...ls);
      if (span > 0 && span < 30)
        report(i, 'gradient-low-span', 'warn', `gradient spans only ${span.toFixed(0)} code values: 8-bit CSS gradients band; use a dithered PNG (scripts/dither-gradient.py)`);
    }
  });

  // --- emoji, sparkle glyphs, stock icon / confetti / particle libraries (hard bans)
  each(/\p{Extended_Pictographic}️|\p{Emoji_Presentation}|[✦✧]/gu, (m, i) =>
    report(i, 'emoji', 'error', `${m[0]} is an emoji or sparkle glyph (a hard ban): every image comes from the product's own objects`),
  );
  // --- star-mark: the film's own mark (src/brand/logo*, mark*, Mark.tsx) drawn as a star or a sparkle: a stand-in
  // glyph, never a logo. The brand's own SVG (brand.py writes logo.ts under cinetic:brand-supplied) passes.
  if (/(^|\/)brand\/[^/]*$/.test(norm) && /^(logo|mark)/i.test(basename(file)))
    each(/\bd\s*[:=]\s*\{?\s*(['"`])([MmZzLlHhVvCcSsQqTtAa0-9eE.,\s-]{12,})\1|\bpoints\s*[:=]\s*\{?\s*(['"`])([0-9eE.,\s-]{12,})\3/g, (m, i) => {
      const subs = pathPoints(m[2] != null ? m[2] : `M${m[4]}Z`); // polygon points: a closed path
      if (subs.some((p) => isStarOutline(p.filter((q) => q.length === 2 && q.every(Number.isFinite)))))
        report(i, 'star-mark', 'error', "this mark is a star or a sparkle: a stand-in glyph reads as generic AI, never a logo. Use the brand's own SVG (scripts/brand.py), a mark built from the film's last element, or keep the template's letter mark");
    });
  each(/(?:\bfrom\s+|\bimport\s+|\brequire\s*\(\s*|\bimport\s*\(\s*)(['"])([^'"]+)\1|<script[^>]*\bsrc\s*=\s*(['"])([^'"]+)\3/g, (m, i) => {
    const mod = m[2] ?? m[4];
    if (ICON_LIBS.test(mod) || (m[4] && /confetti|particles|lucide|font-?awesome|feather|ionicons|heroicons|tabler-icons|phosphor/i.test(mod)))
      report(i, 'stock-decoration', 'error', `${mod}: stock icons, sparkles, confetti and particles are a hard ban; draw what the product itself shows`);
  });

  // --- premount (4.0.529: premounting only runs outside renders, and never with layout="none")
  each(/premountFor\s*=/g, (m, i) => {
    const tagStart = code.lastIndexOf('<', i);
    const tagEnd = code.indexOf('>', i);
    const tag = code.slice(tagStart, tagEnd < 0 ? undefined : tagEnd);
    if (/layout\s*=\s*(\{\s*)?['"]none['"]/.test(tag)) report(i, 'premount', 'warn', 'premountFor is silently ignored with layout="none" (and in every render); remove it');
    else report(i, 'premount', 'warn', 'premountFor does nothing in a render (it only hides preview loading); remove it unless the Studio needs it');
  });

  // --- clip-text: a gradient clipped to text is clipped to the element box (descenders cut at line-height 1)
  each(/\b(?:Webkit)?[bB]ackgroundClip\s*:\s*['"]text['"]/g, (m, i) => {
    const open = code.lastIndexOf('{', i);
    const close = code.indexOf('}', i);
    const obj = code.slice(open < 0 ? 0 : open, close < 0 ? undefined : close);
    if (/\bpadding|clipText/.test(obj)) return;
    report(i, 'clip-text', 'warn', 'background-clip: text clips to the element box, so g, p and y lose their descenders at line-height 1: spread clipText() (fx/HueSweep) or pad the box (.18em 0 .32em with a -.18em margin)');
  });
  // --- svg-text: SVG <text> in an act renders at the wrong size and place under CSS transforms
  if (/(^|\/)acts\//.test(norm) || /^(act|scene|shot)(\d|[-_.])/i.test(basename(file)))
    each(/<text[\s>]/g, (m, i) =>
      report(i, 'svg-text', 'warn', "an SVG <text> under a CSS transform (a camera, a scale, a 3D turn) draws at the wrong size and place in the render's Chrome: set the type as HTML placed by its baseline and keep SVG for paths"),
    );

  // --- in-browser motion blur, remote fonts
  each(/\b(CameraMotionBlur|HtmlInCanvasMotionBlur|Trail)\b/g, (m, i) => {
    if (!/@remotion\/motion-blur/.test(code)) return;
    report(i, 'inbrowser-blur', 'warn', `${m[1]} accumulates in 8 bits inside Chromium (rings, tints); render the blur with scripts/render.sh --blur`);
  });
  each(/@remotion\/[\w-]+-fonts\b|@import\s+url\(\s*['"]?https?:|<link[^>]+href\s*=\s*['"]https?:[^'"]*(css|font)/g, (m, i) =>
    report(i, 'remote-font', 'warn', 'fonts fetched at render time: ship local variable fonts (@fontsource-variable/*) behind FontGate'),
  );

  // --- placeholder brand (markers live in comments, so scan the raw source)
  for (const m of raw.matchAll(/cinetic:placeholder\b/g))
    report(
      m.index,
      'placeholder',
      'error',
      "the starter's stand-in brand is still here: choose this film's palette, typeface, mark and name (or apply the user's brand) per references/brand-and-color.md, then delete this marker",
    );

  // --- text flow: copy-literal, text-spring, text-pace, typing-rate, per-letter
  if (isScript) {
    const decls = declsOf(code);
    const isAct = /(^|\/)acts\//.test(norm) || /^(act|scene|shot)(\d|[-_.])/i.test(basename(file));
    const house = /(^|\/)(fx|lib)\//.test(norm) || houseScene; // the house components animate per character on purpose
    const lit = (t) => `"${t.trim().replace(/\s+/g, ' ').slice(0, 40)}"`;
    const copyMsg = (t) => `${lit(t)} is on-screen text written in an act: put it in COPY (timeline.ts line() or chain()) and read it with copy() or chainOf(), so grid-check counts its words, times its hold and catches a sentence arriving at once`;

    if (isAct && /\.(t|j)sx$/.test(file)) {
      each(/(?<![=\-])>([^<>{}();=|&:]*)</g, (m, i) => {
        if (twoWords(m[1])) report(i + 1, 'copy-literal', 'warn', copyMsg(m[1]));
      });
      each(/>\s*\{\s*(['"`])((?:(?!\1)[^\n$])*)\1\s*\}/g, (m, i) => {
        if (twoWords(m[2])) report(i + 1, 'copy-literal', 'warn', copyMsg(m[2]));
      });
      each(/(?<![\w-])(words|lines|fragments)\s*=\s*\{\s*\[([^\]]*)\]/g, (m, i) => {
        const strings = [...m[2].matchAll(/(['"`])((?:(?!\1)[^\n$])*)\1/g)].map((x) => x[2]).join(' ');
        if (twoWords(strings)) report(i, 'copy-literal', 'warn', copyMsg(strings));
      });
      each(/(?<![\w-])(text|label|title|caption|line|headline|subtitle|children)\s*=\s*(?:\{\s*)?(['"`])((?:(?!\2)[^\n$])*)\2/g, (m, i) => {
        if (twoWords(m[3])) report(i, 'copy-literal', 'warn', copyMsg(m[3]));
      });
      // a sentence written one word per element: single-word JSX texts in sibling (or cousin)
      // elements, with only balanced closing and opening tags between them
      const single = [...code.matchAll(/(?<![=\-])>(\s*)([A-Za-z][A-Za-z'’-]*[.,;:!?]?)\s*<\//g)].map((m) => ({ at: m.index + 1 + m[1].length, word: m[2], end: m.index + m[0].length - 2 }));
      const nextWord = (from) => {
        // skip "</a>" and "<b ...>" pairs (balanced) and whitespace; return the index of the next JSX text
        let j = from;
        let depth = 0;
        while (j < code.length) {
          const ws = /^\s*/.exec(code.slice(j, j + 400))[0].length;
          j += ws;
          if (code.startsWith('</', j)) {
            const e = code.indexOf('>', j);
            if (e < 0) return -1;
            depth--;
            j = e + 1;
          } else if (code[j] === '<' && /[A-Za-z]/.test(code[j + 1] ?? '')) {
            const t = tagAt(code, j);
            if (!t) return -1;
            if (!t.text.endsWith('/>')) depth++;
            j += t.text.length;
          } else return depth === 0 ? j : -1;
        }
        return -1;
      };
      for (let k = 0; k < single.length; k++) {
        const run = [single[k]];
        while (true) {
          const last = run[run.length - 1];
          const n = single.find((x) => x.at > last.end);
          if (!n || nextWord(last.end) !== n.at) break;
          run.push(n);
        }
        if (run.length >= 2) {
          const text = run.map((x) => x.word).join(' ');
          if (twoWords(text)) report(run[0].at, 'copy-literal', 'warn', copyMsg(text) + ' (written one word per element)');
          k += run.length - 1;
        }
      }
    }

    // text-spring: values from an overshooting spring, followed through the declarations into a text element
    const aliases = new Set();
    for (const [lhs, rhs] of decls) {
      const a = rhs.trim().match(/^SPR\.(\w+)$/);
      if (a && OVERSHOOT.has(a[1]) && /^[A-Za-z_$][\w$]*$/.test(lhs)) aliases.add(lhs);
    }
    const springy = (expr) => {
      for (const m of expr.matchAll(/\b(spr|spring)\s*\(/g)) {
        const args = parenGroup(expr, m.index + m[0].length - 1);
        const preset = args.match(/SPR\.(\w+)/);
        if (preset) {
          if (OVERSHOOT.has(preset[1])) return true;
          continue;
        }
        if ([...aliases].some((a) => new RegExp(`\\b${a.replace('$', '\\$')}\\b`).test(args))) return true;
        if (m[1] === 'spr' && args.split(',').length <= 2) return true; // spr()'s default is SPR.snap
        if (m[1] === 'spring' && !/\bconfig\b/.test(args)) return true; // Remotion's default spring overshoots
      }
      return false;
    };
    const sprung = propagate(decls, new Set(decls.filter(([, rhs]) => springy(rhs)).flatMap(([lhs]) => lhs.match(/[A-Za-z_$][\w$]*/g) ?? [])));
    // an overshooting preset handed to a component as its spring: cfg={SPR.word}, config={LAND}
    const springProp = (tagText) =>
      [...tagText.matchAll(/\b(?:cfg|config|spring|spr)\s*=\s*\{\s*(?:SPR\.(\w+)|([A-Za-z_$][\w$]*))\s*\}/g)].some((p) => (p[1] ? OVERSHOOT.has(p[1]) : aliases.has(p[2])));
    // the children of the element whose opening tag starts at i: do they put text on screen?
    const textChildren = (tag, i) => {
      if (tag.text.endsWith('/>')) return false;
      const close = code.indexOf(`</${tag.name}>`, i + tag.text.length);
      if (close < 0) return false;
      const inner = code.slice(i + tag.text.length, close);
      if (/\bcopy\s*\(|\{\s*(['"`])[^'"`]*[A-Za-z]/.test(inner)) return true;
      // JSX text: what is left once expressions and tags are removed
      let bare = '';
      let depth = 0;
      for (const ch of inner) {
        if (ch === '{') depth++;
        else if (ch === '}') depth--;
        else if (!depth) bare += ch;
      }
      return /[A-Za-z]{2,}/.test(bare.replace(/<[^>]*>/g, ' '));
    };
    each(/<[A-Za-z][\w.]*/g, (m, i) => {
      const tag = tagAt(code, i);
      if (!tag) return;
      const isText = /\bdata-text\b/.test(tag.text) || TEXT_TAGS.test(tag.name);
      // only the names the tag's props read (not its prop names or strings)
      const ids = isText ? namesIn(tag.text.replace(/^<[\w.]+/, '').replace(/\b[\w-]+\s*=(?=\s*[{'"])/g, ' ')).filter((id) => sprung.has(id)) : [];
      if ((isText && (ids.length || springy(tag.text) || springProp(tag.text))) || (!isText && springProp(tag.text) && textChildren(tag, i)))
        report(i, 'text-spring', 'warn', `an overshooting spring moves text here${ids.length ? ` (via ${ids[0]})` : ''}: a word that bounces into place reads as a gimmick and costs the read; ease it in (Words, Chain) or use SPR.calm`);
    });

    // text-pace: the crisp tempo written into a calm film
    if (filmPace === 'calm') {
      each(/<(Words|MaskRise)\b/g, (m, i) => {
        const tag = tagAt(code, i);
        if (!tag || /pace\s*=\s*\{\s*PACE\.crisp\b/.test(tag.text)) return;
        const num = (prop) => {
          const v = tag.text.match(new RegExp(`\\b${prop}\\s*=\\s*\\{\\s*(?:f60\\(\\s*)?([\\d.]+)`));
          return v ? Number(v[1]) : null;
        };
        // a 1.2 pace: calm words 11 f apart, rising over 28 f, leaving over 15 f (crisp 8 / 23 / 12)
        const hurried = (pace12
          ? [['stagger', 10, 'words land about 11 f apart'], ['dur', 26, 'a word rises over about 28 f'], ['outDur', 14, 'a fragment leaves over about 15 f']]
          : [['stagger', 8, 'words land 10-12 f apart'], ['dur', 24, 'a word rises over 34-40 f'], ['outDur', 18, 'a fragment leaves over 22-24 f']])
          .map(([prop, min, why]) => [prop, num(prop), min, why])
          .filter(([, v, min]) => v !== null && v < min);
        for (const [prop, v, min, why] of hurried)
          report(i, 'text-pace', 'warn', `<${m[1]} ${prop}={${v}}> is the crisp tempo (< ${min} f) in a calm film: ${why}; drop the prop to take the pace's default, or pass pace={PACE.crisp} for a deliberate crisp passage`);
      });
    }

    // typing-rate: <TypeOn cps> and hand-rolled type-ons
    // human typing runs 19-45 chars/s (house 30); a machine stream (kind="stream") up to 150; under 15 it crawls
    each(/<TypeOn\b/g, (m, i) => {
      const tag = tagAt(code, i);
      const cps = tag?.text.match(/\bcps\s*=\s*\{\s*([\d.]+)/);
      if (!cps) return;
      const v = Number(cps[1]);
      const stream = /\bkind\s*=\s*(?:\{\s*)?['"]stream['"]/.test(tag.text);
      if (stream ? v > 150 : v > 45)
        report(i, 'typing-rate', 'warn', stream
          ? `<TypeOn kind="stream" cps={${cps[1]}}> streams faster than 150 chars/s: past that it is a flash, not output`
          : `<TypeOn cps={${cps[1]}}> types faster than a person (19-45 chars/s, house 30); machine output is kind="stream" (50-150)`);
      else if (v < 15) report(i, 'typing-rate', 'warn', `<TypeOn cps={${cps[1]}}> crawls (under 15 chars/s): type at the house 30, or elide the typing with a cut`);
    });
    if (!house) {
      const frameish = new Set(['frame']);
      for (const mm of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*useCurrentFrame\s*\(/g)) frameish.add(mm[1]);
      propagate(decls, frameish);
      // the declaration of a name that is in force at `at`: the nearest one before it (a loop's
      // `let i = 0` is not the `i` another component derives from the frame)
      const declOf = (id, at) => {
        const list = decls.filter(([lhs]) => lhs === id);
        return list.filter(([, , k]) => k < at).pop() ?? list[0];
      };
      // a number a name stands for (const CPS = 3), so `* CPS` counts like `* 3`
      const numOf = (tok, at) => {
        if (/^[\d.]+$/.test(tok)) return Number(tok);
        const d = declOf(tok, at);
        return d && /^\s*[\d.]+\s*$/.test(d[1]) ? Number(d[1]) : null;
      };
      const perFrame = (expr, at, depth = 0) => {
        // characters added per frame by a count expression; null when it does not grow with the frame
        if (depth > 4) return null;
        const id = expr.trim().match(/^[A-Za-z_$][\w$]*$/)?.[0];
        if (id) {
          const d = declOf(id, at);
          return d ? perFrame(d[1], d[2], depth + 1) : frameish.has(id) ? 1 : null;
        }
        const names = namesIn(expr);
        if (!names.some((x) => frameish.has(x))) return null;
        // the count is built from other names (Math.max(0, left), shown + 1): follow each that is
        // declared from the frame, and take the fastest
        const via = names.filter((x) => frameish.has(x) && x !== 'frame' && declOf(x, at)).map((x) => perFrame(x, at, depth + 1)).filter((r) => r !== null);
        const mulTok = expr.match(/\*\s*([\d.]+|[A-Za-z_$][\w$]*)/)?.[1];
        const divTok = expr.match(/\/\s*([\d.]+|[A-Za-z_$][\w$]*)/)?.[1];
        const mul = mulTok !== undefined ? numOf(mulTok, at) : null;
        const div = divTok !== undefined ? numOf(divTok, at) : null;
        const own = mul ? mul : div ? 1 / div : 1;
        return via.length && !mul && !div ? Math.max(...via) : own;
      };
      each(/\.(slice|substring|substr)\s*\(\s*0\s*,/g, (m, i) => {
        const args = parenGroup(code, i + m[0].indexOf('('));
        const rate = perFrame(args.slice(args.indexOf(',') + 1), i);
        if (rate !== null && rate * filmFps > 45)
          report(i, 'typing-rate', 'warn', `a hand-rolled type-on at about ${Math.round(rate * filmFps)} chars/s: over 45 it is faster than a person types; use <TypeOn> (house 30 chars/s, kind="stream" for machine output) and hold the finished string >= 72 f`);
      });
    }

    // per-letter: a string split into letters and mapped into animated spans
    if (!house) {
      // is x (the thing spread or Array.from'd) a string? An array of rows spread is not letters.
      const STRINGY_NAME = /^(text|word|words?Text|label|title|caption|headline|str|string|name|letters)$/i;
      const stringy = (x) => {
        const t = x.replace(/\(\)$/, '');
        if (/\.(text|label|title|caption|headline|name)$/.test(t)) return true;
        const id = t.match(/^[A-Za-z_$][\w$]*$/)?.[0];
        if (!id) return false;
        if (STRINGY_NAME.test(id)) return true;
        if (new RegExp(`\\b${id.replace(/\$/g, '\\$')}\\??\\s*:\\s*string\\b`).test(code)) return true; // typed string
        const d = decls.find(([lhs]) => lhs === id);
        return !!d && /^\s*(['"`]|copy\s*\(|String\s*\(|[\w$.]+\.text\b)/.test(d[1]);
      };
      each(/(\.split\(\s*(['"])\2\s*\)|\[\s*\.\.\.\s*([\w.$]+(?:\(\))?)\s*\]|Array\.from\(\s*([\w.$]+)\s*\))\s*\.map\s*\(/g, (m, i) => {
        const x = m[3] ?? m[4];
        if (x && !stringy(x)) return;
        const body = parenGroup(code, i + m[0].length - 1);
        if (/style\s*=|transform|opacity/.test(body))
          report(i, 'per-letter', 'warn', 'letters animated one by one: animate words or whole fragments (a per-letter rise slows the read and reads as a trick); the one hero word may keep it with // lint-ok: hero word');
      });
    }
  }

  // --- timing phrasing (warnings): staggers on a metronome, counts that run linear. Film files only: the primitives in
  // fx/ and lib/ phrase their own onsets (lib/cadence) and keep linear counters for live rates.
  if (isScript && !/(^|\/)(fx|lib)\//.test(norm)) {
    const actLike = /(^|\/)acts\//.test(norm) || /^(act|scene|shot)(\d|[-_.])/i.test(basename(file));
    const GAP = String.raw`(?:f60x?\(\s*[\d.]+\s*\)|\d+(?:\.\d+)?)`;
    const IDX = String.raw`(?:i|j|k|idx|index)`;
    const stag = new RegExp(String.raw`\+\s*(?:Math\.(?:floor|round)\(\s*)?(?:${GAP}\s*\*\s*${IDX}\b|${IDX}\s*\*\s*${GAP})`, 'g');
    if (actLike)
      each(stag, (m, i) => {
        const { line } = pos(i);
        const here = (lines[line - 1] ?? '').replace(/\/\/.*$/, ''); // the code, not its comment
        if (/\b(W|H|U|px|width|height|pitch|deg|rad|gap\s*\*\s*U|Math\.PI|angle|left|top|x0|y0|dx|dy|noise1?|seed)\b/.test(here.replace(/f60x?\([^)]*\)/g, ''))) return; // a layout, not a time
        if (!/\b(CUE|ACT|BEAT|beat|bt)\b|\bF\s*>=|prog\(|\b(at|on|start|starts|onset|onsets|from|in)\s*[=:,)]|\bconst\s+(at|on|start|onset)\b/.test(here)) return;
        report(i, 'even-stagger', 'warn', 'a reveal on a metronome (start + i x gap): equal spacing reads machine-timed; phrase it with lib/cadence phraseOnsets(start, n, gap, { shape }) (grouped, settling into its accent, or a lead and a rush; the same span)');
      });
    each(/\bcountSteps\s*\([^;]*?\bE\.linear\b/g, (m, i) => report(i, 'linear-count', 'warn', 'a count on E.linear ticks like a machine: count on E.out (fx/Roll countTo, countSteps default), so it slows into its value and settles'));
    each(/<Roll\b[^>]*\bease\s*=\s*\{\s*E\.linear\s*\}/g, (m, i) => report(i, 'linear-count', 'warn', '<Roll ease={E.linear}> ticks like a machine: drop the ease (E.out) so the count slows into its value and settles'));
    each(/\bcountLinear\s*\(/g, (m, i) => {
      const { line } = pos(i);
      const here = lines[line - 1] ?? '';
      if (/Math\.min\s*\(|\bto\s*:/.test(here)) report(i, 'linear-count', 'warn', 'countLinear capped at a value is a count to a value running linear: use fx/Roll countTo (eases out, lands its last value on the end frame and holds); countLinear is for a live rate');
    });
    each(/Math\.(?:round|floor)\(\s*l?mix\(\s*[^,()]+,\s*[^,()]+,\s*prog\(\s*[^,()]+,\s*[^,()]+,\s*[^,()]+\)\s*\)\s*\)/g, (m, i) =>
      report(i, 'linear-count', 'warn', 'a hand-rolled count on a linear prog(): give it an ease-out (fx/Roll countTo), so it slows into its value and settles'));
  }

  // --- grammar: curve roles, springs, exits, look, type roles, GPU cost (1.2)
  {
    const house = /(^|\/)(fx|lib)\//.test(norm) || houseScene; // house primitives and scenes: gated by their own tests
    const isActFile = /(^|\/)acts\//.test(norm) || /^(act|scene|shot)(\d|[-_.])/i.test(basename(file));
    const lineHas = (i, re) => {
      const { line } = pos(i);
      return re.test(lines[line - 1] ?? '') || re.test(lines[line - 2] ?? '');
    };
    const decls = isScript ? declsOf(code) : [];
    const declBefore = (id, at) => {
      const list = decls.filter(([lhs]) => lhs === id);
      return list.filter(([, , k]) => k < at).pop() ?? list[list.length - 1];
    };
    /** An expression with the right-hand side of every name it reads, two levels deep (for following a value). */
    const expand = (expr, at, depth = 2) => {
      if (depth <= 0) return expr;
      let out = expr;
      for (const id of new Set(namesIn(expr))) {
        const d = declBefore(id, at);
        if (d && d[1].length < 600) out += ` ;${id}= ${expand(d[1], d[2], depth - 1)}`;
      }
      return out;
    };
    const famOf = (tok) => TOK.get(tok)?.family ?? null;

    // the motion file itself: house curves keep their shape, whips keep their late peak, springs stay in range
    if (isAnim && resolve(file) === (animPath && resolve(animPath))) {
      for (const [key, t] of TOK) {
        if (t.index < 0) continue;
        const fn = curveOf(t.shape);
        if (!fn) continue;
        const name = key.slice(2);
        const band = key.startsWith('E.') ? HOUSE_BAND[name] : null;
        if (band && !t.deprecated) {
          const out = band[0].filter((lo, k) => {
            const y = fn((k + 1) / 10);
            return y < lo - 1e-3 || y > band[1][k] + 1e-3;
          }).length;
          if (out > 2)
            report(t.index, 'token-drift', 'warn', `${key} leaves the house band at ${out} of 9 points (t = .1 ... .9): a retuned curve is a new curve; give it a new name (keep ${key} the house shape)`);
        }
        if (/whip/i.test(name) && !t.deprecated && t.family === 'reposition') {
          const at = peakT(fn);
          if (at < 0.5)
            report(t.index, 'whip-shape', 'error', `${key} peaks at t = ${at.toFixed(2)}: a whip builds long and brakes short (peak speed at t = .55-.6); a front-loaded "whip" is an arrival`);
        }
      }
      for (const [name, s] of SPRS) {
        if (SPR_DEP[name] || /swing|drop|wheel/i.test(name)) continue;
        if (s.zeta < 0.45 || s.overshoot > 0.19)
          report(s.index, 'spring-range', 'warn', `SPR.${name}: zeta ${s.zeta.toFixed(2)}, ${Math.round(s.overshoot * 100)} % overshoot: the landing class sits at zeta 0.59-0.70 and 4-10 % (a logo swing or a wheel may reach 16-18 %); below zeta 0.45 it wobbles`);
      }
    }

    // the blur shutter
    if (blurPath && resolve(file) === resolve(blurPath)) {
      const m = code.match(/\bSHUTTER\s*=\s*(\d+(?:\.\d+)?)/);
      if (m && (Number(m[1]) < 120 || Number(m[1]) > 180))
        report(m.index, 'shutter', 'warn', `SHUTTER = ${m[1]} degrees: a film camera shutter is 120-180 (house 180); a wider one smears motion into a blur that reads as a filter`);
    }

    // the palette: never pure black ink, one accent family
    {
      const pal = [];
      if (isTokens) for (const m of raw.matchAll(/^[ \t]*['"]?([\w-]+)['"]?\s*:\s*['"](#[0-9a-fA-F]{3,8})['"].*$/gm)) pal.push({ name: m[1], hex: m[2], index: m.index + m[0].indexOf(m[2]), text: m[0] });
      for (const [a, b] of rootSpans) for (const m of raw.slice(a, b).matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\b[^\n]*/g)) pal.push({ name: m[1], hex: m[2], index: a + m.index, text: m[0] });
      for (const p of pal) {
        const hex = normHex(p.hex);
        if (hex === '#000000') report(p.index, 'pure-ink', 'error', `${p.name} is pure #000: ink is tinted (OKLCH L 0.15-0.25, C 0-0.02 toward the accent hue), never pure black`);
        else if (hex === '#ffffff' && /^(paper|ground|bg|background|stage|canvas|base)$/i.test(p.name) && !LOOK?.whiteWorld)
          report(p.index, 'pure-ink', 'warn', `${p.name} is pure #FFF: a light ground is a tinted white (L 0.93-0.99, C <= 0.015 toward a cool accent); pure white is the white-world look (LOOK.whiteWorld)`);
      }
      const sat = pal
        .filter((p) => !/\b(imagery|ui-state)\b/.test(p.text))
        .map((p) => ({ ...p, lch: oklch(rgbOf(p.hex)) }))
        .filter((p) => p.lch.C >= 0.06);
      if (sat.length > 1) {
        const dist = (a, b) => (b - a + 360) % 360;
        let best = [];
        for (const anchor of sat) {
          const members = sat.filter((p) => dist(anchor.lch.h, p.lch.h) <= 30);
          if (members.length > best.length) best = members;
        }
        for (const p of sat.filter((x) => !best.includes(x)))
          report(p.index, 'accent-count', 'error', `${p.name} (${fmtLch(p.lch)}) is a second saturated hue: a film has one accent family (within 30 degrees of hue); colours that only live in imagery or one product state carry an \`imagery\` or \`ui-state\` comment`);
      }
    }

    // GPU cost (warn): what loads the graphics chip on every frame
    each(/blur\(\s*([\d.]+)\s*px/g, (m, i) => {
      if (Number(m[1]) > 40) report(i, 'gpu-cost', 'warn', `a ${m[1]} px blur: over 40 px on a large layer costs the GPU every frame; bake a blurred plate (or stack lib/defocus levels, at most 2 copies)`);
    });
    each(/(?<![\w-])(backdropFilter|WebkitBackdropFilter|(?:-webkit-)?backdrop-filter)\s*:\s*['"`]?\s*(?!none)\w/g, (m, i) =>
      report(i, 'gpu-cost', 'warn', 'backdrop-filter re-blurs everything under the layer every frame; bake the plate'),
    );
    {
      // an SVG filter attribute driven by the frame (props set once are static and cost nothing extra)
      const timed = new Set(['frame']);
      if (isScript) {
        for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*useCurrentFrame\s*\(/g)) timed.add(m[1]);
        propagate(decls, timed);
      }
      each(/<fe[A-Z]\w*\b/g, (m, i) => {
        const tag = tagAt(code, i);
        const live = tag && [...tag.text.matchAll(/\b([\w-]+)\s*=\s*\{([^}]*)\}/g)].find((a) => !/^(in|in2|result|key|ref|id)$/.test(a[1]) && namesIn(a[2]).some((id) => timed.has(id)));
        if (live) report(i, 'gpu-cost', 'warn', `an SVG filter animated by the frame (${tag.name} ${live[1]}): it re-rasterises its layer every frame; animate opacity between static filtered copies, or bake it`);
      });
    }
    if (isScript && !house && !isAnim) {
      const blurred = [...code.matchAll(/\bfilter\s*:[^,}\n]*blur\(/g)].length;
      if (blurred > 2) report(code.search(/\bfilter\s*:[^,}\n]*blur\(/), 'gpu-cost', 'warn', `${blurred} blurred layers in one file: more than 2 blurred copies at once load the GPU; use lib/defocus (2 levels at most) or a baked plate`);
      if (pace12)
        each(/<Chain\b/g, (m, i) => {
          const tag = tagAt(code, i);
          const id = tag?.text.match(/\bchain\s*=\s*(?:\{\s*)?['"]([\w.-]+)['"]/)?.[1];
          const n = id ? CHAIN_WORDS.get(id) : undefined;
          if (n && n > LAYER_BUDGET)
            report(i, 'gpu-cost', 'warn', `chain "${id}" holds ${n} words: each sharp word stays on its own composited layer for the shot (budget ${LAYER_BUDGET}); split the thought into two shots or a replace chain`);
        });
    }

    // linear-motion (error): a moving property on a straight-line ramp. Film code, templates and house scenes;
    // the primitives in fx/, lib/ and kit/ are gated by their own curve tests. A true live rate keeps // lint-ok: <reason>.
    if (isScript && !isAnim && !/(^|\/)(fx|lib|kit)\//.test(norm)) {
      // a ramp handed to a function (a curve, an ease, a sine, a floor, a type-on) is shaped or used there; clamp,
      // min, max and grouping parens pass it through unchanged
      const PASS = /^(?:clamp|clamp01|Math\.min|Math\.max|Math\.abs|min|max|abs|)$/;
      const shaped = (src, i) => {
        let depth = 0;
        for (let k = i - 1; k >= 0 && k > i - 400; k--) {
          const c = src[k];
          if (c === ')' || c === ']') depth++;
          else if (c === '(' || c === '[') {
            if (depth > 0) {
              depth--;
              continue;
            }
            if (c === '[') return false;
            const name = src.slice(Math.max(0, k - 40), k).match(/([\w$.]+|\))\s*$/)?.[1] ?? '';
            if (name === ')') return true; // a curried curve: bezier(...)(x)
            if (/^[A-Za-z_$]/.test(name) && !PASS.test(name)) return true;
          } else if (depth === 0 && (c === ';' || c === '{' || c === '}' || (c === '=' && !/[=!<>]/.test(src[k - 1]) && !/[=>]/.test(src[k + 1])))) return false;
        }
        return false;
      };
      // the frame and the names that are the frame shifted (const lf = frame - start)
      const base = new Set(['frame']);
      for (const m of code.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*useCurrentFrame\s*\(/g)) base.add(m[1]);
      if (/[({,]\s*f\s*[,}:)]/.test(code)) base.add('f');
      if (/\buseClock\s*\(/.test(code)) base.add('t'); // a house scene's clock: frames at 30 fps
      // the frame shifted (any name), or shifted and rescaled to another rate (a clock's name: t60, f60, tw, local)
      const CLOCK_NAME = /^(?:[tfu][\w$]{0,3}|frame[\w$]*|local[\w$]*|clock[\w$]*|time[\w$]*)$/;
      for (let pass = 0; pass < 3; pass++)
        for (const [lhs, rhs] of decls) {
          if (!/^[A-Za-z_$][\w$]*$/.test(lhs)) continue;
          const m = rhs.trim().match(new RegExp(`^\\(?\\s*(${[...base].join('|')})\\s*([-+]\\s*[\\w$.()]+\\s*)?\\)?(\\s*\\*\\s*(?:[1-9][\\d.]*|fps|k|K))?$`));
          if (m && (!m[3] || CLOCK_NAME.test(lhs))) base.add(lhs);
        }
      const B = [...base].map((b) => b.replace(/\$/g, '\\$')).join('|');
      const drivers = [];
      // interpolate() with no easing option, on any input
      for (const c of callsIn(code, ['interpolate'])) if (!/\beasing\s*:/.test(c.args[3] ?? '') && !shaped(code, c.index)) drivers.push({ i: c.index, why: 'interpolate() without an easing option' });
      // a scene's raw 0..1 ramp (span(t, a, b)) used as it comes
      for (const c of callsIn(code, ['span'])) if (!shaped(code, c.index)) drivers.push({ i: c.index, why: 'a raw span() ramp' });
      // E.linear handed to a tween or as an easing
      each(/\bE\.linear\b(?!\s*\()/g, (m, i) => {
        if (/\bstagger\s*\([^()]*$/.test(code.slice(Math.max(0, i - 80), i))) return; // stagger offsets are delays, not motion
        drivers.push({ i, why: 'E.linear' });
      });
      each(/\bE\.linear\s*\(/g, (m, i) => drivers.push({ i, why: 'E.linear' }));
      // a raw frame ratio: frame / n, (frame - a) / n, frame * k
      each(new RegExp(`(?<![\\w$.])\\(?\\s*(?:${B})\\s*(?:-\\s*[\\w$.]+\\s*)?\\)?\\s*(?:\\/(?![/*])|\\*\\s*-?[\\d.])`, 'g'), (m, i0) => {
        const i = i0 + m[0].search(/\S/);
        if (shaped(code, i) || /%\s*$/.test(code.slice(Math.max(0, i - 8), i))) return;
        drivers.push({ i, why: 'a raw frame ratio' });
      });
      if (drivers.length) {
        // the motion sinks: transforms in a template, and style keys / props that move, scale, turn, blur or fade
        const sinks = [];
        for (const m of code.matchAll(/`[^`]*\b(?:translate(?:3d|X|Y|Z)?|scale(?:3d|X|Y)?|rotate(?:3d|X|Y|Z)?|blur|perspective|skew(?:X|Y)?|matrix(?:3d)?)\([^`]*`/g)) sinks.push([m.index, m.index + m[0].length]);
        const KEYS = 'transform|opacity|filter|scale|scaleX|scaleY|rotate|rotateX|rotateY|rotateZ|translate|translateX|translateY|x|y|z|left|top|right|bottom|zoom|blur|tx|ty|dx|dy|pan|tilt|dolly|yaw|pitch|push';
        for (const m of code.matchAll(new RegExp(`(?<![\\w$.-])(?:${KEYS})\\s*(?::(?!:)|=\\s*\\{)`, 'g'))) {
          const s = m.index + m[0].length;
          let depth = 0;
          let j = s;
          for (; j < code.length && j < s + 600; j++) {
            const c = code[j];
            if ('([{'.includes(c)) depth++;
            else if (')]}'.includes(c)) {
              if (depth === 0) break;
              depth--;
            } else if ((c === ',' || c === ';' || c === '\n') && depth === 0) break;
          }
          sinks.push([m.index, j]);
        }
        const inSink = (i) => sinks.some(([a, b]) => i >= a && i < b);
        // the names a sink reads as they are (a name handed to a curve inside the sink is shaped there)
        const sinkNames = new Set();
        for (const [a, b] of sinks) {
          const text = code.slice(a, b);
          for (const m of text.matchAll(/(?<![\w$.])[A-Za-z_$][\w$]*(?![\w$])/g)) if (!shaped(text, m.index)) sinkNames.add(m[0]);
        }
        // follow a driver through the declarations to a sink; an ease or a stepped index on the way ends it
        const declAt = (i) =>
          decls
            .filter(([lhs, rhs, k]) => {
              const s = code.indexOf(rhs, k);
              return s >= 0 && i >= s && i < s + rhs.length && /^[A-Za-z_$][\w$]*$/.test(lhs);
            })
            .sort((a, b) => a[1].length - b[1].length)[0];
        const carries = (name, seen = new Set()) => {
          if (sinkNames.has(name)) return true;
          if (seen.has(name) || seen.size > 40) return false;
          seen.add(name);
          const re = new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}(?![\\w$])`, 'g');
          for (const [lhs, rhs] of decls) {
            if (!/^[A-Za-z_$][\w$]*$/.test(lhs) || lhs === name) continue;
            for (const m of rhs.matchAll(re)) {
              if (shaped(rhs, m.index)) continue;
              if (carries(lhs, seen)) return true;
            }
          }
          return false;
        };
        const seenLine = new Set();
        for (const d of drivers.sort((a, b) => a.i - b.i)) {
          if (d.why === 'a raw frame ratio' && base.has(declAt(d.i)?.[0])) continue; // a clock rescaled (const t60 = (t - cut) * 2)
          const hit = inSink(d.i) || (() => {
            const dc = declAt(d.i);
            return dc && !/^\s*(?:async\s*)?(?:\([^()]*\)|[A-Za-z_$][\w$]*)\s*(?::[^=]+)?=>/.test(dc[1]) ? carries(dc[0]) : false;
          })();
          if (!hit) continue;
          const { line } = pos(d.i);
          if (seenLine.has(line)) continue;
          seenLine.add(line);
          report(d.i, 'linear-motion', 'error', `${d.why} drives a move, a scale, a turn, a blur or a fade at a constant rate: nothing on screen moves linearly. Arrivals expOut / E.snapOut, exits expIn / E.buildIn, travels expInOut, zooms zoomAt() (log space); a true live rate (a clock, a real-time progress bar, a counter's rate, a constant ambient drift) keeps // lint-ok: <reason>`);
        }
        // a scale or zoom tweened in value space over a big ratio: a push in log space looks constant to the eye
        const scaleSinks = [
          ...[...code.matchAll(/\bscale(?:3d|X|Y)?\(\s*\$\{([^}]*)\}/g)].map((m) => [m.index, m[1]]),
          ...[...code.matchAll(/(?<![\w$.-])(?:scale|zoom)\s*(?::(?!:)|=\s*\{)\s*([^,}\n]+)/g)].map((m) => [m.index, m[1]]),
        ];
        for (const [i, e] of scaleSinks) {
          if (/\b(lmix|zoomAt|logMix)\s*\(/.test(e)) continue;
          const full = expand(e, i);
          if (/\b(lmix|zoomAt|logMix)\s*\(/.test(full)) continue;
          const num = (x) => (/^\s*-?[\d.]+\s*$/.test(x ?? '') ? Number(x) : NaN);
          const pairs = [...tweensIn(full).map((t) => [num(t.from), num(t.to)]), ...callsIn(full, ['mix']).map((c) => [num(c.args[0]), num(c.args[1])])];
          const big = pairs.find(([a, b]) => a > 0 && b > 0 && Math.max(a, b) / Math.min(a, b) >= 1.6);
          if (big) report(i, 'linear-motion', 'error', `a scale from ${big[0]} to ${big[1]} tweened in value space: the push eases out on screen long before it ends (each step is a smaller share of the size). Zoom in log space: zoomAt() or lmix(from, to, eased)`);
        }
      }
    }

    if (isScript && !house && !isAnim) {
      // ease-family: enter()/leave()/move() and the arrival/exit props take a curve of their role
      for (const c of callsIn(code, ['enter', 'leave', 'move'])) {
        const tok = c.args.map((a) => a.match(/^((?:E|M)\.\w+)$/)?.[1]).filter(Boolean).pop();
        const want = { enter: 'arrive', leave: 'leave', move: 'reposition' }[c.name];
        const fam = tok && famOf(tok);
        if (fam && fam !== want) report(c.index, 'ease-family', 'error', `${c.name}() takes a ${want} curve and ${tok} is ${fam}: choose the curve by role (arrive: snapOut, glideOut, settleOut, softOut, liftOut; reposition: stdInOut, strongInOut, whipBuild; leave: softIn, buildIn, launchIn)`);
      }
      each(/<(Words|Chain|MaskRise|Oversize)\b/g, (m, i) => {
        const tag = tagAt(code, i);
        for (const p of tag?.text.matchAll(/\b(ease|riseEase)\s*=\s*\{\s*((?:E|M)\.\w+)\s*\}/g) ?? []) {
          const fam = famOf(p[2]);
          if (fam && fam !== 'arrive') report(i, 'ease-family', 'error', `<${m[1]} ${p[1]}={${p[2]}}>: a word arrives on an arrive curve (peak speed on its first frame); ${p[2]} is ${fam}`);
        }
      });
      each(/\b(exitEase|outEase)\s*=\s*\{\s*((?:E|M)\.\w+)\s*\}/g, (m, i) => {
        const fam = famOf(m[2]);
        if (fam && fam !== 'leave') report(i, 'ease-family', 'error', `${m[1]}={${m[2]}}: an exit leaves on a leave curve and is cut at speed; ${m[2]} is ${fam}`);
      });
      // linear on a short move: a translate or scale that starts and stops on E.linear (drift, creep, lmix and colour are linear on purpose)
      const linearShort = (s) => tweensIn(s).find((t) => t.ease === 'E.linear' && (span60(t.a, t.b) ?? Infinity) < 60);
      each(/`[^`]*\b(?:translate(?:3d|X|Y|Z)?|scale(?:X|Y)?|rotate)\([^`]*`/g, (m, i) => {
        for (const e of m[0].matchAll(/\$\{([^}]*)\}/g)) {
          if (/\b(lmix|creep|drift|mixColor|mixRgb|accentFade|pathColor)\s*\(/.test(e[1])) continue;
          const full = expand(e[1], i);
          if (/\b(lmix|creep|drift)\s*\(/.test(full)) continue;
          if (linearShort(full)) {
            report(i, 'ease-family', 'warn', 'a move that starts and stops on E.linear: linear is for drift, creep, log zooms (lmix), counters and colour; an arrival takes an arrive curve, an exit a leave curve');
            break;
          }
        }
      });

      // scale-from-zero: an entrance that grows from (almost) nothing
      // the scale IS a 0 -> 1 value (a bare tween, spring or mix from ~0, or a name holding one); a tween
      // nested in another call (lmix, an offset, a product) is not followed
      const fromZero = (expr, at, depth = 0) => {
        const e = expr.trim().replace(/^\(([\s\S]*)\)$/, '$1').trim();
        if (depth > 3) return false;
        const call = e.match(/^(prog|tw|enter|interpolate|spr|spring|mix)\s*\(/);
        if (call) {
          const inner = parenGroup(e, call[0].length - 1);
          if (call[0].length + inner.length + 1 !== e.length) return false;
          if (call[1] === 'spr' || call[1] === 'spring') return true;
          if (call[1] === 'mix') {
            const a = splitArgs(inner);
            return isZeroish(a[0]) && isOneish(a[1]);
          }
          const t = tweensIn(e)[0];
          return !!t && isZeroish(t.from) && isOneish(t.to);
        }
        const id = e.match(/^[A-Za-z_$][\w$]*$/)?.[0];
        const d = id && declBefore(id, at);
        return d ? fromZero(d[1], d[2], depth + 1) : false;
      };
      const scaleExprs = [
        ...[...code.matchAll(/\bscale(?:X|Y)?\(\s*\$\{([^}]*)\}\s*\)/g)].map((m) => [m.index, m[1]]),
        ...[...code.matchAll(/(?<![\w$.-])scale\s*:\s*([^}\n]+)/g)].map((m) => [m.index, splitArgs(m[1])[0] ?? '']),
      ];
      for (const [i, e] of scaleExprs)
        if (fromZero(e, i)) report(i, 'scale-from-zero', 'warn', 'an entrance that scales up from (almost) nothing reads as a template pop: start oversized at 1.28-1.9x and settle on an arrive curve (fx/Oversize), or pop to 0.4 and finish in 10-16 f');

      // exits, type opacity and crossfades: read off the inline style objects
      const fills = [];
      for (const so of styleObjects(code)) {
        const op = keyOf(so.body, 'opacity');
        const isFill = so.tag && (so.tag.name === 'AbsoluteFill' || /\binset\s*:\s*0\b/.test(so.body)) && !/\bdata-ui\b/.test(so.tag.text);
        const isText = (so.tag && (/\bdata-text\b/.test(so.tag.text) || TEXT_TAGS.test(so.tag.name))) || /\btypeStyle\s*\(|\bfontSize\b/.test(so.body);
        const role = so.body.match(/typeStyle\(\s*'(\w+)'/)?.[1] ?? so.body.match(/\bTYPE\.(\w+)/)?.[1] ?? null;
        if (!op) continue;
        // follow names one level: `opacity: 1 - out` with `const out = prog(...)`
        const tws = tweensIn(op);
        for (const id of new Set(namesIn(op))) {
          const d = declBefore(id, so.index);
          if (!d) continue;
          const negName = new RegExp(`(^|[^\\w.$])1\\s*-\\s*\\(?\\s*${id.replace(/\$/g, '\\$')}\\b`).test(op);
          for (const t of tweensIn(d[1])) tws.push({ ...t, neg: t.neg !== negName });
        }
        const falling = tws.filter((t) => (t.neg ? isZeroish(t.from) && isOneish(t.to) : isOneish(t.from) && isZeroish(t.to)));
        const rising = tws.filter((t) => !falling.includes(t));
        if (isText && role !== 'ui' && role !== 'caption' && !/\bdata-ui\b/.test(so.tag?.text ?? '')) {
          if (tws.some((t) => t.ease === 'E.linear')) report(so.index, 'linear-opacity', 'warn', 'type opacity on E.linear: a word arrives with a third of its change in the first 1/30 s (snapOut) and leaves accelerating (buildIn); a linear ramp reads as a fade');
          const slow = falling.find((t) => (span60(t.a, t.b) ?? 0) > 12);
          if (slow && !keyOf(so.body, 'transform'))
            report(so.index, 'fade-exit', 'warn', `a statement fading out over ${Math.round(span60(slow.a, slow.b))} f@60 with nothing moving: lines leave by accelerating (buildIn or launchIn, cut at speed) or ride the camera; a fade is for small UI (6-12 f)`);
        }
        if (isFill) for (const t of [...falling.map((x) => ({ ...x, dir: -1 })), ...rising.map((x) => ({ ...x, dir: 1 }))]) fills.push({ ...t, at: so.index });
      }
      const seenPair = new Set();
      for (const p of fills)
        for (const q of fills) {
          if (p.dir !== 1 || q.dir !== -1 || p.at === q.at) continue;
          const same = (x, y) => (x ?? '').replace(/\s+/g, '') === (y ?? '').replace(/\s+/g, '');
          if (!same(p.a, q.a) || !same(p.b, q.b)) continue;
          const len = span60(p.a, p.b);
          const key = `${Math.min(p.at, q.at)}:${Math.max(p.at, q.at)}`;
          if (seenPair.has(key) || (len !== null && len <= 8)) continue;
          seenPair.add(key);
          report(Math.max(p.at, q.at), 'crossfade', len === null ? 'warn' : 'error', `two full-frame layers cross-fade${len === null ? '' : ` over ${Math.round(len)} f@60`}: no dissolve between shots; build the seam from what is on screen (a carried move, a morph, a mask, a light event); a dissolve lives only inside UI (6-8 f, data-ui)`);
        }

      // blur-on-crisp: a crisp film's type arrives sharp (a focus-in is a named device: // focus-in)
      if (LOOK?.blur === 'crisp') {
        each(/(?<![\w$.])(blurIn|blurOut)\s*\(/g, (m, i) => {
          if (!lineHas(i, /focus-in/)) report(i, 'blur-on-crisp', 'warn', `${m[1]}() in a crisp film (LOOK.blur 'crisp'): type arrives and leaves sharp; a focus-in word is a device, mark it // focus-in`);
        });
        each(/<(Words|Chain|MaskRise|Oversize)\b/g, (m, i) => {
          const tag = tagAt(code, i);
          const b = tag?.text.match(/\b(?:blur|inkBlur)\s*=\s*\{\s*([\d.]+)/);
          if (b && Number(b[1]) > 0 && !lineHas(i, /focus-in/)) report(i, 'blur-on-crisp', 'warn', `<${m[1]} blur={${b[1]}}> in a crisp film: words arrive sharp; a focus-in is a device, mark it // focus-in`);
        });
        for (const so of styleObjects(code)) {
          const isText = (so.tag && (/\bdata-text\b/.test(so.tag.text) || TEXT_TAGS.test(so.tag.name))) || /\btypeStyle\s*\(|\bfontSize\b/.test(so.body);
          const fl = keyOf(so.body, 'filter');
          if (isText && fl && /blur\(/.test(fl) && /\$\{/.test(fl) && !/\bblur(In|Out)\s*\(/.test(fl) && !lineHas(so.index, /focus-in/))
            report(so.index, 'blur-on-crisp', 'warn', 'animated blur on type in a crisp film: words arrive sharp; a focus-in is a device, mark it // focus-in');
        }
      }

      // spring-budget: collect every underdamped spring use (counted across the film after the scan)
      const springAt = (i, preset) => {
        const { line, col } = pos(i);
        const here = lines[line - 1] ?? '';
        const cls = here.match(/spring(?:-class)?\s*:\s*([\w-]+)/)?.[1] ?? preset;
        const ok = /lint-ok\s*:\s*\S/.test(here) || /lint-ok\s*:\s*\S/.test(lines[line - 2] ?? '');
        springUses.push({ file: rel, line, col, preset, cls, ok, excerpt: here.trim().slice(0, 140) });
      };
      each(/(?<![\w$.])SPR\.(\w+)\b/g, (m, i) => {
        if (OVERSHOOT.has(m[1])) springAt(i, m[1]);
      });
      for (const c of callsIn(code, ['spr'])) if (c.args.length <= 2 && OVERSHOOT.has('snap')) springAt(c.index, 'snap');

      // deprecated-token: 1.1 names keep working; the film should move to the 1.2 vocabulary
      each(/(?<![\w$.])(E|SPR|TYPE)\.(\w+)\b/g, (m, i) => {
        const repl = m[1] === 'E' ? TOK.get(`E.${m[2]}`)?.deprecated : m[1] === 'SPR' ? SPR_DEP[m[2]] : TYPE_DEP[m[2]];
        if (repl) report(i, 'deprecated-token', 'warn', `${m[1]}.${m[2]} is a 1.1 name (it keeps its 1.1 shape); the 1.2 vocabulary has ${m[1]}.${repl}`);
      });
      each(/typeStyle\(\s*['"](\w+)['"]/g, (m, i) => {
        if (TYPE_DEP[m[1]]) report(i, 'deprecated-token', 'warn', `type role '${m[1]}' is a 1.1 role; use '${TYPE_DEP[m[1]]}'`);
      });
    }

    // type-role: sizes come from TYPE roles; one or two non-UI roles per act
    if (isScript && isActFile) {
      const sizes = [...TYPE_SIZES.values(), ...LOOK_SIZES.keys()];
      each(/\bfontSize\s*:\s*([\d.]+)\b(?!\s*[*/]\s*(?![Uu]\b)[\w(])/g, (m, i) => {
        const v = Number(m[1]);
        if (!sizes.some((s) => Math.abs(s - v) <= 0.5))
          report(i, 'type-role', 'warn', `fontSize ${m[1]} is not a type role (${[...TYPE_SIZES].map(([k, s]) => `${k} ${s}`).join(', ')}; or the other family's: ${[...LOOK_SIZES].filter(([sz]) => ![...TYPE_SIZES.values()].includes(sz)).map(([sz, r]) => `${r} ${sz}`).join(', ')}): size changes through the camera, not by restyling`);
      });
      const roles = new Map();
      each(/\btypeStyle\(\s*['"](\w+)['"]|\bTYPE\.(\w+)\b|\brole\s*=\s*(?:\{\s*)?['"](\w+)['"]/g, (m, i) => {
        const r0 = m[1] ?? m[2] ?? m[3];
        const r = TYPE_DEP[r0] ?? r0;
        if (r !== 'ui' && TYPE_SIZES.has(r) && !roles.has(r)) roles.set(r, i);
      });
      if (roles.size > 2)
        report([...roles.values()][2], 'type-role', 'warn', `${roles.size} type roles in one act (${[...roles.keys()].join(', ')}): one size per scene, a hero at least 2x the statement; change size through the camera`);
    }

    // snap-step: a one-frame snap primitive outside fx/ and lib/ is the film's one declared snap, or it glides
    if (isScript && !house && !isTokens) {
      for (const d of SNAP_DEVICES) {
        each(d.re, (m, i) => {
          const declared = d.mods.some((x) => SYNC_DECLARES.has(x) || new RegExp(`\\b${x}\\b`).test(timelineCode)) || (!!d.seam && new RegExp(`kind\\s*:\\s*['"]${d.seam}['"]`).test(timelineCode));
          const { line, col } = pos(i);
          snapUses.push({ device: d.name, file: rel, line, col, excerpt: (lines[line - 1] ?? '').trim().slice(0, 140), ok: lineHas(i, /lint-ok\s*:\s*\S/) });
          if (!declared)
            report(i, 'snap-step', 'warn', `${d.name} changes state in one frame outside a declared snap: beside eased motion a one-frame jump reads as a dropped frame (forensics motion-snap). Glide it (${d.fix}), or make it the film's one snap and declare it (its declares() in src/sync.ts)`);
        });
      }
    }

    // camera-float: an always-on float or drift. The camera is still unless a shot declares a move that starts,
    // travels and lands; the removed float's options do nothing, and a creep over 0.2 px/f@60 is a drift
    if (isScript && !house) {
      each(/(?<![\w$.])(withLocks|lockOn|dipAmp|settleAmp)\s*\(/g, (m, i) =>
        report(i, 'camera-float', 'error', `${m[1]}() belongs to the removed camera float (it does nothing now): delete it. The camera is still unless a shot declares a move that starts, travels and lands (lib/drift stageMove, lib/camera camPath)`));
      each(/:\s*FloatOpts\s*=\s*\{([^{}]*)\}/g, (m, i) => {
        if (/\b(seed|amp|omega|push|locks)\s*:/.test(m[1]))
          report(i, 'camera-float', 'error', 'a FloatOpts with the old float options (seed, amp, omega, push, locks): there is no float; give the stage { moves: [stageMove(at, ...)] } for a declared move, or {} for a still camera');
      });
      const creepMax = 0.2;
      each(/(?<![\w$.])holdDrift\s*\(([^;]*?)\)/g, (m, i) => {
        const px = m[1].match(/\bpx\s*:\s*([\d.]+)/);
        if (px && Number(px[1]) > creepMax)
          report(i, 'camera-float', 'error', `holdDrift at ${px[1]} px/f@60 is a drift, not a creep: a hold may be completely still, a creep stays under ${creepMax} px/f@60 (12 px/s) and goes one way`);
      });
      each(/(?<![\w$.])glideList\s*\(([^;]*?)\)/g, (m, i) => {
        const d = m[1].match(/\bdrift\s*:\s*([\d.]+)/);
        if (d && Number(d[1]) > creepMax) report(i, 'camera-float', 'error', `a list drifting ${d[1]} px/f@60 between its steps: the list rests between its steps (a creep under ${creepMax} px/f@60 at most)`);
      });
    }

    // idle-bob: an idle loop on a position, scale or turn (a card bobbing, a panel swaying, a chip breathing)
    if (isScript && !house) {
      const FRAME_ARG = /\b(F|frame|f|time|sec|seconds|absFrame)\b|\/\s*\(?\s*(fps|FPS)\b|useCurrentFrame/;
      const MOVE_WORDS = /translate|rotate|scale\(|skew|\b(top|left)\s*:/;
      // the name inside a translate / rotate / scale call's ${...}, or as a position property's value
      const POS_USE = (name) => new RegExp(`(translate|rotate|scale|skew)\\w*\\([^)\\n]*\\$\\{[^}]*\\b${name}\\b|\\b(x|y|dx|dy|top|left|rot|tilt|lift)\\s*[:=][^,;}\\n]*\\b${name}\\b`);
      const argAt = (k) => {
        let depth = 1;
        let j = k;
        for (; j < code.length && depth; j++) depth += code[j] === '(' ? 1 : code[j] === ')' ? -1 : 0;
        return code.slice(k, j - 1);
      };
      const stmtOf = (i) => {
        const a = Math.max(code.lastIndexOf(';', i), code.lastIndexOf('\n', i));
        let b = code.indexOf(';', i);
        const nl = code.indexOf('\n', i);
        if (b < 0 || (nl >= 0 && nl < b)) b = nl < 0 ? code.length : nl;
        return code.slice(a + 1, b);
      };
      const loopMsg = 'an idle loop on a position, scale or turn (a periodic function of the frame): UI moves only when it enters, changes state or leaves, never bobbing, breathing or floating while it is held; drop the loop (a hold may be completely still)';
      each(/Math\.(sin|cos)\s*\(|(?<![\w$.])breathe\s*\(/g, (m, i) => {
        const arg = argAt(i + m[0].length);
        if (m[1] && !FRAME_ARG.test(arg)) return; // a one-shot arc (sin(PI * p)) or a geometry angle
        const st = stmtOf(i);
        const named = st.match(/^\s*(?:export\s+)?(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=/);
        if (MOVE_WORDS.test(st) || (named && POS_USE(named[1]).test(code))) report(i, 'idle-bob', 'error', loopMsg);
      });
      const swayMsg = 'a sway given as an object (fx/Lit, kit Phone and Laptop): an idle tilt-and-float loop on a held panel; drop it (panels face the camera and hold still between their moves)';
      each(/\bsway\s*=\s*\{/g, (m, i) => {
        const k = i + m[0].length;
        let depth = 1;
        let j = k;
        for (; j < code.length && depth; j++) depth += code[j] === '{' ? 1 : code[j] === '}' ? -1 : 0;
        if (code.slice(k, j - 1).includes('{')) report(i, 'idle-bob', 'error', swayMsg);
      });
      each(/\bsway\s*:\s*\{/g, (m, i) => report(i, 'idle-bob', 'error', swayMsg));
    }

    // card-tilt: a card tilted at rest. Cards face the camera; a 3D tilt is a declared object move (animated from the
    // frame and landing face-on, or an entry's from)
    if (isScript && !house) {
      const lit = (v) => Math.abs(Number(v)) >= 2;
      const tiltMsg = 'a card tilted at rest (a constant tilt): cards face the camera; a 3D turn is a declared object move (animate it from the frame, landing face-on, or turn it in an entry\'s from)';
      each(/\btilt\s*=\s*\{\{\s*x\s*:\s*(-?[\d.]+)\s*,\s*y\s*:\s*(-?[\d.]+)\s*(?:,\s*z\s*:\s*-?[\d.]+\s*)?\}\}/g, (m, i) => {
        if (lit(m[1]) || lit(m[2])) report(i, 'card-tilt', 'error', tiltMsg);
      });
      each(/\btilt\s*:\s*\{\s*x\s*:\s*(-?[\d.]+)\s*,\s*y\s*:\s*(-?[\d.]+)\s*(?:,\s*z\s*:\s*-?[\d.]+\s*)?\}/g, (m, i) => {
        if (!lit(m[1]) && !lit(m[2])) return;
        if (/\b(from|enterFrom)\s*:\s*\{[^{}]*$/.test(code.slice(Math.max(0, i - 120), i))) return; // an entry's starting pose
        report(i, 'card-tilt', 'error', tiltMsg);
      });
      each(/rotate([XY])\(\s*(-?[\d.]+)\s*deg\s*\)/g, (m, i) => {
        if (lit(m[2])) report(i, 'card-tilt', 'error', `a constant rotate${m[1]}(${m[2]}deg): ${tiltMsg}`);
      });
      each(/\{[^{}]*\bplane\s*:\s*['"](?:far|mid|near)['"][^{}]*\}/g, (m, i) => {
        const r = m[0].match(/\brot\s*:\s*(-?[\d.]+)\s*[,}]/);
        if (r && lit(r[1])) report(i + m[0].indexOf(r[0]), 'card-tilt', 'error', `a depth item rolled ${r[1]} degrees at rest: ${tiltMsg}`);
      });
      // a plane on the depth stage (fx/depth Plane) given a constant turn: the camera gives the perspective
      each(/\brot\s*=\s*\{\{([^{}]*)\}\}/g, (m, i) => {
        const tag = /<([A-Z][\w.]*)\b[^<]*$/.exec(code.slice(Math.max(0, i - 3000), i));
        if (!tag || tag[1] !== 'Plane') return;
        const turned = [...m[1].matchAll(/\b([xyz])\s*:\s*(-?[\d.]+)/g)].filter((v) => lit(v[2]));
        if (turned.length)
          report(i, 'card-tilt', 'error', `a Plane turned ${turned.map((v) => `${v[1]} ${v[2]}`).join(', ')} degrees at rest: ${tiltMsg}. On the depth stage the camera gives the perspective: stand it to one side (wide({ yaw: 24 })) or pitch it over the plane (PageTravel); a turn that lands face-on is the plane's own move`);
      });
    }

    // camera-shot: the depth stage's camera (fx/depth) moves only through declared shots, each one move that starts,
    // travels and lands: never a camera built from the frame by hand, a shot on E.linear, a move that starts before the
    // last one has landed, a move straight back the way the last one went, or a camera field on a loop
    if (isScript && !house && /from\s+['"][^'"]*\/depth(?:\/[\w.]*)?['"]/.test(code)) {
      const how = 'the depth stage\'s camera moves only through declared shots (fx/depth camera([push(...), follow(...), travel(...)]), or a scene: MacroType, PageTravel, FanFocus, PushIn, CraneDown, RiseScene), each one move that starts, travels and lands';
      const FRAME_TERM = /\b(f|F|frame|absFrame|time|sec|seconds|useCurrentFrame|interpolate|spring|spr)\b/;
      const closeAt = (k, open, close) => {
        let depth = 1;
        let j = k;
        for (; j < code.length && depth; j++) depth += code[j] === open ? 1 : code[j] === close ? -1 : 0;
        return j - 1;
      };
      // a camera built from the frame by hand: <Stage3D camera={{ ...a field computed from the frame... }}>
      each(/\bcamera\s*=\s*\{\{/g, (m, i) => {
        const tag = /<([A-Z][\w.]*)\b[^<]*$/.exec(code.slice(Math.max(0, i - 3000), i));
        if (!tag || tag[1] !== 'Stage3D') return;
        const body = code.slice(i + m[0].length, closeAt(i + m[0].length, '{', '}'));
        if (FRAME_TERM.test(body))
          report(i, 'camera-shot', 'error', `a Stage3D camera computed from the frame by hand: ${how}. A still camera given as numbers is fine`);
      });
      // a shot on E.linear: no start, no landing (a drift)
      each(/(?<![\w$.])(push|pull|travel|crane|orbit|whip)\s*\(/g, (m, i) => {
        const k = i + m[0].length;
        const args = code.slice(k, closeAt(k, '(', ')'));
        if (/\bease\s*:\s*E\.linear\b/.test(args))
          report(i, 'camera-shot', 'error', `a ${m[1]} on E.linear has no start and no landing (a drift): ${how}; camera moves ease from rest to rest (E.strongInOut, an arrive token after a cut, E.whipBuild)`);
      });
      // a camera([...]) whose moves overlap or come straight back (numbers written in the call)
      const HOUSE60 = { push: 60, pull: 72, travel: 84, crane: 96, orbit: 90, whip: 28 };
      const num = (s) => (s !== undefined && /^\s*-?[\d.]+\s*$/.test(s) ? Number(s) : null);
      each(/(?<![\w$.])camera\s*\(\s*\[/g, (m, i) => {
        const k = i + m[0].length;
        const arr = code.slice(k, closeAt(k, '[', ']'));
        const moves = [];
        let depth = 0;
        for (let j = 0; j < arr.length; j++) {
          const ch = arr[j];
          if (ch === '(' || ch === '[' || ch === '{') depth++;
          else if (ch === ')' || ch === ']' || ch === '}') depth--;
          if (depth !== 0) continue;
          const call = /^(push|pull|travel|crane|orbit|whip|follow)\s*\(/.exec(arr.slice(j));
          if (!call || /[\w$.]/.test(arr[j - 1] ?? '')) continue;
          const a0 = j + call[0].length;
          let d2 = 1;
          let e = a0;
          for (; e < arr.length && d2; e++) d2 += '([{'.includes(arr[e]) ? 1 : ')]}'.includes(arr[e]) ? -1 : 0;
          const args = arr.slice(a0, e - 1);
          const first = args.split(',')[0];
          const fr = args.match(/\bframes\s*:\s*([\d.]+)\b/);
          const at = num(first);
          const len = fr ? Number(fr[1]) : call[1] in HOUSE60 ? (HOUSE60[call[1]] * filmFps) / 60 : null;
          if (at !== null && len !== null) moves.push({ kind: call[1], at, end: at + len, index: k + j });
          j = e - 1;
        }
        moves.sort((p, q) => p.at - q.at);
        for (let n = 1; n < moves.length; n++) {
          const a = moves[n - 1];
          const b = moves[n];
          if (b.at < a.end - 1e-6)
            report(b.index, 'camera-shot', 'error', `the ${b.kind} at ${b.at} starts before the ${a.kind} at ${a.at} has landed (${a.end}): one move per shot; start it once the last one lands, or make them one move`);
          else if (((a.kind === 'push' && b.kind === 'pull') || (a.kind === 'pull' && b.kind === 'push')) && ((b.at - a.end) * 60) / filmFps < 90)
            report(b.index, 'camera-shot', 'error', `a ${b.kind} ${Math.round(((b.at - a.end) * 60) / filmFps)} f@60 after a ${a.kind} lands goes straight back the way it came: back and forth reads as aimless; carry on in one direction, hold for 1.5 s or more, or cut`);
        }
      });
      // a camera field on a loop (a sine or cosine of the frame): the old float
      each(/Math\.(sin|cos)\s*\(/g, (m, i) => {
        const k = i + m[0].length;
        if (!FRAME_TERM.test(code.slice(k, closeAt(k, '(', ')')))) return;
        const a = Math.max(code.lastIndexOf(';', i), code.lastIndexOf('\n', i), code.lastIndexOf(',', i), code.lastIndexOf('{', i));
        if (/\b(yaw|pitch|roll|dist|lens|fov|target|focus)\s*:\s*$/.test(code.slice(a + 1, i)) || /\b(yaw|pitch|roll|dist|lens|fov)\s*:[^,}\n]*$/.test(code.slice(a + 1, i)))
          report(i, 'camera-shot', 'error', `a camera field on a loop (a sine or cosine of the frame) is the old float: ${how}; a hold may be completely still`);
      });
    }

    // drift-toggle: a living drift (fx/Lit sway, a float, a breath) switched off or on by a condition: its offset is
    // not zero on that frame, so the layer jumps there in one frame (forensics: a jump); fade its amount instead
    if (isScript && !house) {
      each(/\b(sway|drift|float|breath|wobble)\s*=\s*\{(?![{])/g, (m, i) => {
        let depth = 1;
        let j = i + m[0].length;
        for (; j < code.length && depth; j++) depth += code[j] === '{' ? 1 : code[j] === '}' ? -1 : 0;
        const expr = code.slice(i + m[0].length, j - 1);
        const e = expr.replace(/\s+/g, ' ').trim();
        const ternaryOff = /\?/.test(e) && /[?:]\s*(false|null)\b/.test(e);
        const andOff = /&&/.test(e) && !/\?/.test(e);
        if (ternaryOff || andOff)
          report(i, 'drift-toggle', 'warn', `${m[1]}={${e.slice(0, 60)}} switches an old sway on a condition: on that frame its offset is not zero, so the layer jumps in one frame (forensics jump); drop the sway (a panel holds still between its moves)`);
      });
    }

    // unmount-moving: a layer leaves (a guard or a Sequence end) while a tween inside it still runs
    if (isScript && isActFile && !house) {
      const tweenOf = new Map();
      for (const [lhs, rhs] of decls) if (/^[A-Za-z_$][\w$]*$/.test(lhs)) { const t = tweensIn(rhs); if (t.length) tweenOf.set(lhs, t); }
      const closeOf = (open) => {
        let depth = 0;
        for (let j = open; j < code.length; j++) {
          if (code[j] === '{') depth++;
          else if (code[j] === '}' && --depth === 0) return j;
        }
        return code.length;
      };
      const guards = [];
      for (const re of [/\{\s*\(?\s*(?:F|frame)\s*<(=?)\s*([^&|?{}()]+?)\s*\)?\s*&&/g, /\{\s*\(?\s*(?:F|frame)\s*>=?\s*[^&|{}]+?&&\s*(?:F|frame)\s*<(=?)\s*([^&|?{}()]+?)\s*\)?\s*&&/g])
        each(re, (m, i) => guards.push({ index: i, x: m[2], plus: m[1] ? 1 : 0, body: code.slice(i + m[0].length, closeOf(i)) }));
      each(/<Sequence\b/g, (m, i) => {
        const tag = tagAt(code, i);
        const from = tag?.text.match(/\bfrom\s*=\s*\{([^}]+)\}/)?.[1];
        const dur = tag?.text.match(/\bdurationInFrames\s*=\s*\{([^}]+)\}/)?.[1];
        const end = code.indexOf('</Sequence>', i);
        if (from && dur && end > 0) guards.push({ index: i, x: `${from} + ${dur}`, plus: 0, body: code.slice(i, end) });
      });
      for (const g of guards) {
        const X = frameTerm(g.x);
        if (!X) continue;
        const tws = [...tweensIn(g.body), ...[...new Set(namesIn(g.body))].flatMap((n) => tweenOf.get(n) ?? [])];
        for (const t of tws) {
          const A = frameTerm(t.a);
          const B = frameTerm(t.b);
          const x = X.off + g.plus;
          if (!A || !B || A.base !== X.base || B.base !== X.base || !(A.off < x && x < B.off)) continue;
          const share = speedShareAt(t.ease, (x - A.off) / (B.off - A.off));
          if (share !== null && share <= 0.1) continue;
          report(g.index, 'unmount-moving', 'warn', `this layer unmounts on ${g.x.trim()}${g.plus ? ' + 1' : ''} while a tween inside it (${String(t.a).trim()} to ${String(t.b).trim()}${t.ease ? `, ${String(t.ease).trim()}` : ''}) still runs${share === null ? '' : ` at about ${Math.round(share * 100)} % of its peak speed`}: let it land under 10 % first (lib/continuity landBeforeCut) or keep the layer mounted until it has; a move cut mid-ease stops dead (forensics motion-stop)`);
          break;
        }
      }
    }

    // move-queue: three or more moves queued one after another inside 3 s, timed off the same frame
    if (isScript && isActFile && !house) {
      const moveRe = /transform|translate|scale\(|rotate|\b[xyk]\s*:|\bcam\b|camera|\bpan\b|\bzoom\b/;
      const moves = [];
      for (const t of tweensIn(code)) {
        const fam = famOf(String(t.ease).trim()) ?? { enter: 'arrive', leave: 'leave', move: 'reposition' }[t.name] ?? null;
        if (!fam || fam === 'linear') continue;
        const A = frameTerm(t.a);
        const B = frameTerm(t.b);
        if (!A || !B || A.base !== B.base || B.off <= A.off || ((B.off - A.off) * 60) / filmFps < 8) continue;
        const d = decls.find(([l, r, k]) => k <= t.index && t.index <= code.indexOf(r, k) + r.length);
        const name = d && /^[A-Za-z_$][\w$]*$/.test(d[0]) ? d[0] : null;
        const { line } = pos(t.index);
        const drives = moveRe.test(lines[line - 1] ?? '') || (name && lines.some((l) => new RegExp(`(?<![\\w$.])${name.replace(/\$/g, '\\$')}\\b`).test(l) && moveRe.test(l) && !new RegExp(`\\b(?:const|let|var)\\s+${name.replace(/\$/g, '\\$')}\\b`).test(l)));
        if (drives && !moves.some((x) => x.base === A.base && x.a === A.off && x.b === B.off)) moves.push({ base: A.base, a: A.off, b: B.off, index: t.index, text: `${String(t.a).trim()} to ${String(t.b).trim()}` });
      }
      for (const base of new Set(moves.map((x) => x.base))) {
        const group = moves.filter((x) => x.base === base).sort((p, q) => p.a - q.a || p.b - q.b);
        const chain = [group[0]];
        for (const mv of group.slice(1)) {
          const last = chain[chain.length - 1];
          if (mv.a >= last.b - 0.3 * Math.min(mv.b - mv.a, last.b - last.a)) chain.push(mv);
        }
        for (let k = 0; k + 2 < chain.length; k++)
          if (((chain[k + 2].a - chain[k].a) * 60) / filmFps <= 180) {
            report(chain[k + 2].index, 'move-queue', 'warn', `three moves queued one after another inside 3 s (${chain.slice(k, k + 3).map((x) => x.text).join('; ')}): build the 3 s around one carrying move of 48 f@60 or more and overlap the secondaries by 30-50 %, never queue them (forensics motion-density)`);
            break;
          }
      }
    }

    // placeholder-copy: on-screen text that marks itself unfinished (scripts/placeholders.json)
    if (isScript) {
      const ON_SCREEN = 'text|label|title|caption|line|headline|subtitle|sub|body|meta|value|placeholder|cta|badge|name|heading|description|hint|who';
      const flag = (i, s) => {
        const hit = placeholderIn(s);
        if (hit) report(i, 'placeholder-copy', 'error', `"${String(s).trim().slice(0, 48)}" is placeholder text ("${hit}"): a final film shows the product's real words (its own UI strings, names and numbers), never lorem ipsum, "Placeholder", "Label text" or a generic label`);
      };
      if (/\.(t|j)sx$/.test(file)) {
        each(/(?<![=\-])>([^<>{}();=|&]*)</g, (m, i) => flag(i + 1, m[1]));
        each(/>\s*\{\s*(['"`])((?:(?!\1)[^\n$])*)\1\s*\}/g, (m, i) => flag(i + 1, m[2]));
      }
      each(new RegExp(`(?<![\\w-])(?:${ON_SCREEN})\\s*=\\s*(?:\\{\\s*)?(['"\`])((?:(?!\\1)[^\\n$])*)\\1`, 'g'), (m, i) => flag(i, m[2]));
      each(new RegExp(`(?<![\\w$.-])(?:${ON_SCREEN})\\s*:\\s*(['"\`])((?:(?!\\1)[^\\n$])*)\\1`, 'g'), (m, i) => flag(i, m[2]));
      each(/\b(?:line|chain)\s*\(\s*(['"`])[^'"`\n]*\1\s*,\s*(['"`])((?:(?!\2)[^\n$])*)\2/g, (m, i) => flag(i, m[3]));
    }

    // bar-text: grey bars or blocks standing in for text
    if (isScript && !house && !/(^|\/)kit\//.test(norm)) {
      const barMsg = 'grey bars standing in for text: a final film shows the real strings at film size (kit Text, the product\'s own data), never rounded grey blocks for lines of copy; a product\'s own loading skeleton shown on purpose takes // lint-ok: loading state';
      each(/<(Skeleton\w*|TextBars?|LineBars?|Gr[ae]yBars?|GhostLines?|FakeText|PlaceholderLines?|Bars)\b/g, (m, i) => report(i, 'bar-text', 'error', `<${m[1]}>: ${barMsg}`));
      const TEXTY = /data-text\b|\bcopy\s*\(|<(Img|img|svg|path|Words|Chain|MaskRise|TypeOn|Scramble|Roll|Photo|Footage|Video|OffthreadVideo|TypeLine|Text)\b|\{\s*children\s*\}|>\s*[^<>{}\s][^<>{}]*<\/|\{\s*[\w.]*(text|label|title|name|value)\w*\s*\}/i;
      each(/\bArray\.from\s*\(\s*\{\s*length\s*:|\.map\s*\(/g, (m, i) => {
        const open = code.indexOf('(', i + (m[0].startsWith('.') ? 0 : 'Array.from'.length));
        if (open < 0) return;
        const body = parenGroup(code, open);
        if (body.length > 3000 || !/=>/.test(body) || TEXTY.test(body) || /data-(chart|meter)|progress|meter|chart|spark|track|slider|scrub|loader|wave/i.test(body)) return;
        const tags = [...body.matchAll(/<([a-z][\w.]*)\b/g)].map((t) => tagAt(body, t.index)).filter(Boolean);
        const bar = tags.find((t) => {
          if (!/\/\s*>$/.test(t.text) || !/\b(background|backgroundColor)\s*:/.test(t.text) || !/\bborderRadius\s*:/.test(t.text)) return false;
          const hm = /\bheight\s*:\s*([\d.]+)\b/.exec(t.text);
          if (!hm || Number(hm[1]) <= 0 || Number(hm[1]) >= 30) return false;
          const wm = /\bwidth\s*:\s*([^,}]+)/.exec(t.text);
          return !!wm && /%|rand|\[|\bi\b|\bk\b|\bj\b|\*/.test(wm[1]);
        });
        if (bar) report(i, 'bar-text', 'error', `a callback that draws only rounded filled boxes under 30 px tall at varying widths: ${barMsg}`);
      });
    }

    // logo-chip: a named product in a chip is its real mark, never its name alone
    if (isScript && !house && !/(^|\/)kit\//.test(norm)) {
      const BRANDS = new Set(['ChatGPT', 'OpenAI', 'Claude', 'Anthropic', 'Gemini', 'Google Drive', 'Google Docs', 'Google Sheets', 'Gmail', 'YouTube', 'Slack', 'Notion', 'Figma', 'GitHub', 'GitLab', 'Stripe', 'Shopify', 'Jira', 'Trello', 'Asana', 'Salesforce', 'HubSpot', 'Zapier', 'Dropbox', 'Discord', 'Instagram', 'TikTok', 'WhatsApp', 'LinkedIn', 'Spotify', 'Vercel', 'Supabase', 'Webflow', 'Canva', 'Airtable', 'Intercom', 'Zendesk', 'Mailchimp', 'Perplexity', 'Midjourney', 'Photoshop', 'PayPal', 'Twilio', 'Cloudflare', 'MongoDB', 'Hugging Face', 'Microsoft Teams', 'Google Calendar', 'Outlook', 'Excel']);
      each(/<(Chip|Pill|Badge|Tag)\b/g, (m, i) => {
        const tag = tagAt(code, i);
        const label = tag && /\blabel\s*=\s*(?:\{\s*)?(['"`])([^'"`\n]+)\1/.exec(tag.text)?.[2]?.trim();
        if (label && BRANDS.has(label))
          report(i, 'logo-chip', 'error', `a <${m[1]}> that names ${label} in text alone: a product the film names shows its real mark (node scripts/logos.mjs get ${label.toLowerCase().replace(/\s+/g, '-')} --film ., then kit LogoChip / InlineLogo / AppIcon), its colours as published`);
      });
    }

    // drawn-figure: a person, place or product drawn in code where a real photo belongs
    if (isScript && !house && !/(^|\/)kit\//.test(norm)) {
      const figMsg = 'a real photo or clip belongs here (scripts/assets.mjs search --people / --no-people, fx/Pictures PhotoCard, kit Avatar src), or the product\'s own UI: never a person, place or product drawn in code';
      const sizeOf = (tag) => {
        const m = /\bsize\s*=\s*\{([^}]*)\}|\bsize\s*=\s*['"]?(\d+)/.exec(tag);
        if (!m) return null;
        const nums = [...(m[1] ?? m[2] ?? '').matchAll(/(?<![\w.])(\d+(?:\.\d+)?)/g)].map((x) => Number(x[1])).filter((v) => v >= 8);
        return nums.length ? Math.max(...nums) : null;
      };
      const big = (tag, i, what) => {
        const px = sizeOf(tag);
        if (px === null) report(i, 'drawn-figure', 'warn', `${what} drawn in code at a size lint cannot read: above 72 px a drawn face is a drawn person; ${figMsg}`);
        else if (px > 72) report(i, 'drawn-figure', 'error', `${what} drawn in code at ${px} px: ${figMsg}`);
      };
      each(/<(PortraitMark|HalftonePortrait)\b/g, (m, i) => {
        const tag = tagAt(code, i);
        if (tag) big(tag.text, i, `a ${m[1] === 'PortraitMark' ? 'portrait' : 'halftone portrait'}`);
      });
      each(/<(Avatar|AvatarStack)\b/g, (m, i) => {
        const tag = tagAt(code, i);
        if (!tag || /\bsrc\s*=/.test(tag.text) || /\{\s*\.\.\./.test(tag.text)) return;
        const kind = /\bkind\s*=\s*(?:\{\s*)?['"](\w+)['"]/.exec(tag.text)?.[1];
        if (m[1] === 'AvatarStack') {
          if ((kind === 'portrait' || kind === 'halftone') && !/\bsrc\b/.test(tag.text)) big(tag.text, i, 'a stack of portraits');
          return;
        }
        if (kind === 'monogram') return;
        if (kind === 'portrait' || kind === 'halftone' || (sizeOf(tag.text) ?? 0) > 72) big(tag.text, i, 'an avatar portrait');
      });
      each(/<Photo\b/g, (m, i) => {
        const tag = tagAt(code, i);
        if (!tag || !/\btheme\s*=/.test(tag.text) || /\bsrc\s*=/.test(tag.text) || /\{\s*\.\.\./.test(tag.text)) return;
        report(i, 'drawn-figure', 'error', `the kit's drawn still life (a kit <Photo> with no src): ${figMsg}`);
      });
      const starts = [...code.matchAll(/\n(?:export\s+)?(?:const|function)\s+([A-Z][\w$]*)/g)];
      starts.forEach((m, k) => {
        if (!/^(Person|People|Face|Portrait|Figure|Character|Human|Silhouette|Landscape|Mountains?|Hills?|Ridges?|Forest|Trees?|Skyline|Cityscape|Buildings?|Bottle|Vase|Plant|Flower|Food|Dish|Shoe|Sneaker|Car)(?![a-z])/.test(m[1])) return;
        const body = code.slice(m.index, starts[k + 1]?.index ?? code.length);
        if ((body.match(/<(path|ellipse|circle|polygon)\b/g) ?? []).length >= 2 || /<svg\b/.test(body))
          report(m.index + 1, 'drawn-figure', 'error', `${m[1]} draws SVG shapes: ${figMsg}`);
      });
    }

    // card-content: a card or a bento tile shows built UI, a picture, or nothing on purpose (blank): never an empty slab
    if (isScript && !/(^|\/)fx\/Cards\.tsx$/.test(norm) && !/(^|\/)kit\//.test(norm)) {
      each(/<Card\b/g, (m, i) => {
        const tag = tagAt(code, i);
        if (!tag || /\{\s*\.\.\./.test(tag.text) || /\b(image|blank|children)\b\s*(=|\/?>|\s)/.test(tag.text.replace(/^<Card/, ''))) return;
        const selfClosing = /\/\s*>$/.test(tag.text);
        const close = selfClosing ? -1 : code.indexOf('</Card>', i + tag.text.length);
        const inner = close < 0 ? '' : code.slice(i + tag.text.length, close);
        if (selfClosing || !inner.trim())
          report(i, 'card-content', 'error', 'a <Card> with no content draws an empty slab (or, at render, sample kit UI): give it the product\'s own built UI (children), a picture (image), or say blank on purpose; never grey placeholder bars (src/kit has real parts)');
      });
      const tileArrays = [
        ...[...code.matchAll(/\btiles\s*=\s*\{\s*\[/g)].map((m) => m.index + m[0].length - 1),
        ...[...code.matchAll(/:\s*BentoTile\[\]\s*=\s*\[/g)].map((m) => m.index + m[0].length - 1),
      ];
      for (const open of tileArrays) {
        let depth = 0;
        let j = open;
        for (; j < code.length; j++) {
          if (code[j] === '[') depth++;
          else if (code[j] === ']' && --depth === 0) break;
        }
        let at = open + 1;
        for (const el of splitArgs(code.slice(open + 1, j))) {
          const k = code.indexOf(el, at);
          at = k < 0 ? at : k + el.length;
          if (el.startsWith('{') && /\bA\s*:/.test(el) && /\bB\s*:/.test(el) && !/\.\.\./.test(el) && !/\b(content|image|blank)\s*[:,}]/.test(el))
            report(k < 0 ? open : k, 'card-content', 'error', 'a bento tile with no content: give it built UI (content), a picture (image), or blank: true on purpose (src/kit has real parts)');
        }
      }
    }

    // ui-accent-bar: product UI is simple and aligned: no vertical accent line or bar on a card's edge
    if (!isTokens) uiAccentBars(code, report, { isScript, house: /(^|\/)(fx|lib)\//.test(norm) });

    // text-estimate: a text width guessed from the letter count (`label.length * size * 0.55`) places whatever sits
    // beside the text: a status dot lands on a pill's edge, a badge under its neighbour, an icon off its label
    if (isScript && !isTokens && !/(^|\/)(fx|lib|kit)\//.test(norm))
      each(/\.length\s*\*\s*\(?[\w.]+(?:\([^()]*\))?\)?\s*\*\s*0?\.[3-7]\d*\b/g, (m, i) =>
        report(i, 'text-estimate', 'error', "a text width guessed from its letter count: the real width differs by 10-30 % (letters differ, the face's tracking), so whatever stands beside the text lands wrong (a dot on a pill's edge, a label under its neighbour); let the browser lay it out (flex with a gap: kit/flow Pill, kit/screens RequestPill) or measure it (lib/measure measureTracked)"));

    // small-text: text held in focus is 36 px or more at 1080p (UI rebuilt for film: x1.8-2, brand/tokens.ts uiFilm)
    if (isScript && !house && !isTokens) {
      const small = (i, px) =>
        report(i, 'small-text', 'warn', `text at ${px} px: under 36 px (at 1080p) a string held in focus for more than 6 frames is mush on a phone and on every sheet; set it at 36+ (product UI is rebuilt at x1.8-2: uiFilm()), or keep it out of focus or on screen under 6 f (// lint-ok: <why>)`);
      each(/\bfontSize\s*:\s*([\d.]+)\b(?!\s*[*/]\s*(?![Uu]\b)[\w(])/g, (m, i) => {
        if (Number(m[1]) > 0 && Number(m[1]) < 36) small(i, m[1]);
      });
      each(/\btypeStyle\(\s*['"]\w+['"]\s*,\s*([\d.]+)\b(?!\s*[*/]\s*(?![Uu]\b)[\w(])/g, (m, i) => {
        if (Number(m[1]) < 36) small(i, m[1]);
      });
      each(/\b(?:typeStyle\(\s*['"](\w+)['"]\s*\)|TYPE\.(\w+)\.size\b)/g, (m, i) => {
        const r = m[1] ?? m[2];
        if (r !== 'secondary' && TYPE_SIZES.has(r) && TYPE_SIZES.get(r) < 36) small(i, TYPE_SIZES.get(r));
      });
    }
    if (isScript && isTokens) {
      for (const [role, size] of TYPE_SIZES)
        if (size < 36 && role !== 'secondary') {
          const k = code.search(new RegExp(`\\b${role}\\s*:\\s*\\{[^}]*\\bsize\\s*:\\s*${size}\\b`));
          if (k >= 0) report(k, 'small-text', 'warn', `TYPE.${role} is ${size} px: the smallest size held in focus is 36 px at 1080p (house ui 40)`);
        }
    }

    // giant-watermark / giant-once: the giant word (400 px and up) is the set, used once, at full ink
    if (isScript && !house) {
      const giantStyle = (body) => /typeStyle\(\s*['"]giant['"]|\bTYPE\.giant\b/.test(body) || Number(body.match(/\bfontSize\s*:\s*([\d.]+)/)?.[1] ?? 0) >= 400;
      let used = -1;
      for (const so of styleObjects(code)) {
        if (!giantStyle(so.body) && !/\brole\s*=\s*(?:\{\s*)?['"]giant['"]/.test(so.tag?.text ?? '')) continue;
        if (used < 0) used = so.index;
        const op = keyOf(so.body, 'opacity');
        if (op && /^\s*0?\.(0\d*|[0-2]\d*)\s*$/.test(op))
          report(so.index, 'giant-watermark', 'warn', `a giant word at opacity ${op.trim()}: the giant role is the set the camera travels (full ink, cropped by the frame, lit), never a faint watermark behind the copy`);
      }
      each(/\brole\s*=\s*(?:\{\s*)?['"]giant['"]/g, (m, i) => {
        if (used < 0) used = i;
      });
      if (used >= 0 && isActFile) giantUses.push({ file: rel, ...pos(used), excerpt: (lines[pos(used).line - 1] ?? '').trim().slice(0, 140) });
    }

    // emphasis: a box, marker or underline round a word is the film's one signature; one kind on at most 60 % of the lines
    if (isScript && !house) {
      each(/\b(?:emph|device)\s*[:=]\s*\{?\s*['"](box|marker|under)['"]/g, (m, i) => emphMarks.push({ file: rel, ...pos(i), device: m[1], excerpt: (lines[pos(i).line - 1] ?? '').trim().slice(0, 140) }));
      each(/\bfilmEmphasis\s*\([^;]*?\bshare\s*:\s*([\d.]+)/g, (m, i) => {
        if (Number(m[1]) > 0.7) emphLines.shares.push({ file: rel, ...pos(i), share: Number(m[1]), excerpt: (lines[pos(i).line - 1] ?? '').trim().slice(0, 140) });
      });
      if (isActFile) {
        emphLines.lines += [...code.matchAll(/<(?:TypeLine|HeroLine|MarkLine|StatementLine|ScriptLine|Caption|Line)\b/g)].length;
        emphLines.literal += [...code.matchAll(/\bemph\s*[:=]\s*\{?\s*['"](?:weight|accent|scale|swell|marker|box|under|outline|sweep)['"]/g)].length;
      }
    }

    // end-card-template: mark + wordmark + tagline centred over a radial gradient is the stock ending
    if (isScript && !house) {
      const starts = [0, ...[...code.matchAll(/\n(?:export\s+)?(?:const|function)\s+[A-Z][\w$]*/g)].map((m) => m.index), code.length];
      each(/radial-gradient\s*\(/g, (m, i) => {
        let a = 0;
        let b = code.length;
        for (let k = 0; k < starts.length - 1; k++) if (starts[k] <= i && i < starts[k + 1]) [a, b] = [starts[k], starts[k + 1]];
        const region = code.slice(a, b);
        const mark = /<\w*(Mark|Logo|Wordmark|Lockup|Emblem)\b/.test(region);
        const centred = (/alignItems\s*:\s*['"]center['"]/.test(region) && /(justifyContent\s*:\s*['"]center['"]|flexDirection\s*:\s*['"]column['"])/.test(region)) || /textAlign\s*:\s*['"]center['"]/.test(region) || /translate\(\s*-50%/.test(region);
        const texts = (region.match(/<(Words|Chain|MaskRise|Scramble)\b|\btypeStyle\s*\(|\bfontSize\b|\bdata-text\b|\btxt\s*\(/g) ?? []).length;
        if (mark && centred && texts >= 2)
          report(i, 'end-card-template', 'warn', 'a lockup faded in from nowhere over a radial gradient: the stock end card. Build it from the film\'s last element (the last picture\'s element becomes the mark, or the last word the wordmark: references/devices/logo-and-end-card.md), centred and lit by the key; no radial glow behind it');
      });
    }

    // filler-plate / filler-light: every element in frame has a job; light is motivated and subtle
    if (isScript && !house && !isTokens) {
      const CONTENT = /data-(text|logo|ui|icon)\b|\bcopy\s*\(|<(Img|img|svg|path|Words|Chain|MaskRise|TypeOn|Scramble|Roll|Photo|Footage|Video|OffthreadVideo)\b|<\w*(Logo|Icon|Mark|Glyph|Avatar|Portrait|Screen|Row|Text|Tile|Chip|Card|Panel|Line|Label|Number|Count|Chart|UI)\b|\{\s*children\s*\}|\brender\s*\(|>\s*[^<>{}\s][^<>{}]*<\//;
      const BOX = /\b(background|backgroundColor|backgroundImage)\s*:/;
      const FAINT = /\bblur\b|<Defocus\b|\bfilter\s*:|\bopacity\s*[:=]\s*\{?\s*0?\.[0-4]\d*\s*[,}\s]/; // set back: defocused or faint
      // a field of blank boxes: a callback that maps or generates elements and draws only a filled, childless box,
      // defocused or faint (plates at depth); a box in full view is a UI part (a dot, a bar, a connector) and passes
      each(/\bArray\.from\s*\(\s*\{\s*length\s*:|\.map\s*\(/g, (m, i) => {
        const open = code.indexOf('(', i + (m[0].startsWith('.') ? 0 : 'Array.from'.length));
        if (open < 0) return;
        const body = parenGroup(code, open);
        if (body.length > 4000 || !/=>/.test(body) || CONTENT.test(body) || !FAINT.test(body)) return;
        const tags = [...body.matchAll(/<([a-z][\w.]*|AbsoluteFill)\b/g)].map((t) => tagAt(body, t.index)).filter(Boolean);
        const blank = tags.find((t) => /\/\s*>$/.test(t.text) && BOX.test(t.text));
        if (blank)
          report(i, 'filler-plate', 'warn', 'a field of blank boxes: the callback draws a filled box with nothing in it, once per item (plates floating at depth, faint cards, squares around a line). Every element in frame has a job: give each one real content (the product\'s state, a mark, a line, a number) or take the field out (look-audit filler-shape fails them in the render)');
      });
      // a depth stack whose items do not say what they carry (fx/DepthStack carries: ui, text, mark, icon, photo, data)
      each(/\{\s*id\s*:[^{}]*?\bplane\s*:\s*['"](far|mid|near)['"][^{}]*\}/g, (m, i) => {
        if (/\bcarries\s*:/.test(m[0]) || /\.\.\./.test(m[0])) return;
        report(i, 'filler-plate', 'warn', `a depth-stack item on the ${m[1]} plane that does not say what it carries: set carries ('ui', 'text', 'mark', 'icon', 'photo' or 'data') and draw that in its render; a blank tile at depth is filler (fx/DepthStack depthFiller)`);
      });
      // light pools and haze: a baked pool, glow or haze asset, or ground plates no light in the place asks for
      each(/\bstaticFile\s*\(\s*['"`]([^'"`]*\b(pool|haze|glow|bloom|bokeh|orbs?|halo|leak|fog)[^'"`]*)['"`]/gi, (m, i) => {
        if (LIGHT_RE.test(raw)) return;
        report(i, 'filler-light', 'warn', `a baked ${m[2].toLowerCase()} over the ground (${m[1]}): light is motivated and subtle. Use a flat ground or a key gradient from one side (fx/Grounds flat or wash); a light the place really has is named in the file (cinetic:light <what it is>). look-audit ground-haze fails a pool of light behind the content`);
      });
      each(/\bkinds?\s*:\s*(\[[^\]]*\]|['"]\w+['"])/g, (m, i) => {
        const plate = (m[1].match(/['"](pools|bars|floor|window)['"]/g) ?? []).map((x) => x.slice(1, -1));
        if (!plate.length || LIGHT_RE.test(raw)) return;
        report(i, 'filler-light', 'warn', `ground plates (${[...new Set(plate)].join(', ')}) with no light named for them: a ground is clean (fx/Grounds flat or wash); plates are for a place that has that light, named in the file (cinetic:light <a lamp, a lit room, sun through a window>)`);
      });
    }

    // timeline-constant: primitives read fps, size and copy from the film context (lib/film.ts), never the starter's timeline
    if (isScript && house && !/(^|\/)lib\/film\.(ts|tsx|js)$/.test(norm)) {
      each(/\bimport\s+(?!type\b)\{([^}]*)\}\s*from\s*['"]\.\.\/timeline(?:\.ts)?['"]/g, (m, i) => {
        const bad = m[1].split(',').map((x) => x.trim()).filter((x) => x && !/^type\s/.test(x)).map((x) => x.split(/\s+as\s+/)[0]).filter((x) => ['FPS', 'W', 'H', 'COPY'].includes(x));
        if (bad.length) report(i, 'timeline-constant', 'error', `${bad.join(', ')} imported from the timeline in a primitive: a composition at 24 or 30 fps, or a second film in the project, gets the wrong numbers; read useFilm() / the film argument (lib/film.ts)`);
      });
    }
  }

  // --- HyperFrames
  if (isHtml || (isScript && /gsap|timeline\(/.test(code))) {
    each(/\.from\s*\(/g, (m, i) => {
      if (/(Array|Buffer|Object|Set|Map)\.from/.test(code.slice(Math.max(0, i - 7), i + 5))) return;
      report(i, 'hf-from', 'error', 'gsap .from() captures the current DOM state and breaks on seek; use .fromTo()');
    });
    each(/repeat\s*:\s*-1\b/g, (m, i) => report(i, 'hf-repeat', 'error', 'repeat: -1 has no end: seek-driven renders need finite repeats'));
  }
  if (isHtml) {
    each(/<br\s*\/?>/gi, (m, i) => report(i, 'hf-br', 'error', '<br> breaks the line layout rules; use separate line elements'));
    each(/<audio\b[^>]*>/gi, (m, i) => {
      if (!/\bid\s*=/.test(m[0])) report(i, 'hf-audio-id', 'error', '<audio> needs an id');
    });
  }
}

// ---------------------------------------------------------------------------------- film-wide: spring-budget
// One underdamped class per film (timeline.ts SPRING_CLASS): a second class warns, a third fails. A use's
// class is its `// spring: <class>` tag, else its preset; `// lint-ok: <reason>` drops a use.
if (!opt.allow.has('spring-budget')) {
  const live = springUses.filter((u) => !u.ok);
  const classes = [...new Set(live.map((u) => u.cls))];
  if (classes.length > 1) {
    const sev = classes.length >= 3 ? 'error' : 'warn';
    const first = classes[0];
    for (const u of live.filter((x) => x.cls !== first)) {
      const message = `${classes.length} underdamped spring classes in the film (${classes.join(', ')}): one element class may spring${SPRING_CLASS ? ` (SPRING_CLASS '${SPRING_CLASS}')` : ''}; everything else settles critically (SPR.critical*). Tag a use with // spring: <class>`;
      if (!issues.some((x) => x.file === u.file && x.line === u.line && x.rule === 'spring-budget'))
        issues.push({ file: u.file, line: u.line, col: u.col, rule: 'spring-budget', severity: sev, message, excerpt: u.excerpt });
    }
  }
}

// ---------------------------------------------------------------------------------- film-wide: giant-once
// The giant word (400 px and up) is the set of one moment: a second act with its own giant word warns.
if (!opt.allow.has('giant-once') && giantUses.length > 1) {
  for (const u of giantUses.slice(1))
    if (!issues.some((x) => x.file === u.file && x.line === u.line && x.rule === 'giant-once'))
      issues.push({
        file: u.file,
        line: u.line,
        col: u.col,
        rule: 'giant-once',
        severity: 'warn',
        message: `a giant word in ${giantUses.length} acts (${giantUses.map((x) => x.file).join(', ')}): the giant role is the set of one moment, once per film; elsewhere scale changes through the camera`,
        excerpt: u.excerpt,
      });
}

// ---------------------------------------------------------------------------------- film-wide: emphasis
// A mark round a word (box, marker, underline) is the film's one signature on one line; a film's emphasis is one kind on
// at most 60 % of its lines (fx/TypeEmphasis filmEmphasis), so more than 70 % of the lines set by hand warns.
if (!opt.allow.has('emphasis-signature') && emphMarks.length > 1) {
  const kinds = [...new Set(emphMarks.map((u) => u.device))];
  for (const u of emphMarks.slice(1))
    issues.push({ file: u.file, line: u.line, col: u.col, rule: 'emphasis-signature', severity: 'error',
      message: `${emphMarks.length} box-type emphasis marks in the film (${kinds.join(', ')}): a box, marker or underline round a word is the film's one declared signature, on one line (filmEmphasis signature); the other lines take the film's kind (the accent colour) or none`, excerpt: u.excerpt });
}
if (!opt.allow.has('emphasis-share')) {
  for (const u of emphLines.shares)
    issues.push({ file: u.file, line: u.line, col: u.col, rule: 'emphasis-share', severity: 'warn', message: `filmEmphasis share ${u.share} > 0.7: a film's emphasis sits on at most 60 % of its lines (the default)`, excerpt: u.excerpt });
  if (emphLines.lines >= 3 && emphLines.literal / emphLines.lines > 0.7)
    issues.push({ file: '.', line: 1, col: 1, rule: 'emphasis-share', severity: 'warn', message: `${emphLines.literal} of ${emphLines.lines} script lines carry an emphasis device (${Math.round((100 * emphLines.literal) / emphLines.lines)} % > 70 %): one kind on at most 60 % of the lines, the others plain (fx/TypeEmphasis filmEmphasis)`, excerpt: '' });
}

// ---------------------------------------------------------------------------------- film-wide: snap-step (one device)
// A film keeps one snap device (a stepped list, a snap zoom, a line snap), declared; the others glide.
if (!opt.allow.has('snap-step')) {
  const live = snapUses.filter((u) => !u.ok);
  const devices = [...new Set(live.map((u) => u.device))];
  if (devices.length > 1)
    for (const u of live.filter((x) => x.device !== devices[0])) {
      const message = `${devices.length} snap devices in the film (${devices.join(', ')}): a film keeps one, declared; glide the others (fx/GlideStep, lib/continuity glideValue) (forensics motion-snap)`;
      if (!issues.some((x) => x.file === u.file && x.line === u.line && x.rule === 'snap-step' && x.message === message))
        issues.push({ file: u.file, line: u.line, col: u.col, rule: 'snap-step', severity: 'warn', message, excerpt: u.excerpt });
    }
}

// ---------------------------------------------------------------------------------- film-wide: stock-plate
// A photo world belongs to the brief: the product's place, its input, its people. A plate picked by mood (a fern, a night
// city, clouds) under a film about something else reads as random stock. Each world plate (public/plates/, or a record
// item placed there) is read by its words (the licence record's title and tags, else its file name) against BRIEF.md;
// a plate that shares no subject word with the brief warns. Colour, light and photo-craft words do not count.
const PLATE_GENERIC = new Set(('photo image picture stock free background backdrop wallpaper texture pattern abstract macro closeup close up detail '
  + 'view shot top aerial soft blur blurred bokeh defocus defocused light lights lit dark bright night day morning evening sunset sunrise glow '
  + 'white black grey gray green blue teal red pink purple violet yellow orange gold golden silver brown beige cream colour color colourful colorful '
  + 'surface source graded grade plate world soft hard high low wide small large big new old beautiful calm minimal modern the and with for from '
  + 'over under into onto above across its lay lays laying open opened sits sitting').split(/\s+/));
const plateStem = (w) => w.toLowerCase().replace(/(?:ies)$/, 'y').replace(/(?:ing|ed|es|s)$/, '');
const plateWords = (text) => (String(text || '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase().match(/[a-z]{3,}/g) || []).filter((w) => !PLATE_GENERIC.has(w)).map(plateStem);
function stockPlates(filmRoot) {
  const out = [];
  const briefPath = join(filmRoot, 'BRIEF.md');
  const platesDir = join(filmRoot, 'public', 'plates');
  if (!existsSync(briefPath) || !existsSync(platesDir)) return out;
  const brief = new Set(plateWords(readFileSync(briefPath, 'utf8')));
  let rec = [];
  try { rec = JSON.parse(readFileSync(join(filmRoot, 'assets', 'licences.json'), 'utf8')).items || []; } catch { /* no record */ }
  // a plate dealt by kind (assets.mjs plate <kind>) is read by its kind's description in the film's fx/world/worlds.ts
  const kinds = new Map();
  try {
    for (const m of readFileSync(join(filmRoot, 'src', 'fx', 'world', 'worlds.ts'), 'utf8').matchAll(/^\s*(\w+):\s*\{\s*what:\s*'([^']*)'[^\n]*?queries:\s*\[([^\]]*)\]/gm))
      kinds.set(m[1].toLowerCase(), `${m[2]} ${m[3]}`);
  } catch { /* no world module */ }
  const base = (f) => basename(f).replace(/\.[a-z0-9]+$/i, '').replace(/(?:[-_.](?:soft|source|src|graded|grade|dark|light|blur|blurred|sharp|hi|lo|\d+))+$/i, '');
  const groups = new Map();
  for (const f of readdirSync(platesDir)) if (/\.(jpe?g|png|webp|avif|mp4|webm|mov)$/i.test(f)) groups.set(base(f), [...(groups.get(base(f)) || []), f]);
  for (const [stem, files] of groups) {
    const items = rec.filter((it) => it.file && /plates[\\/]/.test(it.file) && base(it.file) === stem);
    const words = [...new Set([...items.flatMap((it) => plateWords(`${it.title || ''} ${(it.tags || []).join(' ')} ${it.query || ''}`)), ...plateWords(stem.replace(/[-_]/g, ' ')),
      ...(items.length ? [] : plateWords(kinds.get(stem.toLowerCase()) || ''))])];
    const title = items.map((it) => it.title).filter(Boolean)[0] || stem;
    if (!words.length) { out.push({ file: `public/plates/${files[0]}`, title, words, why: 'its subject is unknown (no record title or tags, a name without a subject word)' }); continue; }
    if (!words.some((w) => brief.has(w))) out.push({ file: `public/plates/${files[0]}`, title, words, why: `"${title}" (${words.slice(0, 5).join(', ')}) shares no subject word with BRIEF.md` });
  }
  return out;
}
if (!opt.allow.has('stock-plate')) {
  const filmRoot = basename(root) === 'src' ? dirname(root) : root;
  for (const p of stockPlates(filmRoot))
    issues.push({ file: relative(root, join(filmRoot, p.file)).split(sep).join('/'), line: 1, col: 1, rule: 'stock-plate', severity: 'warn',
      message: `a photo world unrelated to the brief: ${p.why}. A photograph is a world only when it is the story's place, input or people (graded, defocused, moved once with a purpose); otherwise stand the film on a built lit ground in the brand hue (fx/world, fx/light, groundsFromAccent) or find the brief's own place (scripts/assets.mjs recipe "<the product's input>")`,
      excerpt: p.title });
}

// ---------------------------------------------------------------------------------- report
const errors = issues.filter((x) => x.severity === 'error').length;
const warnings = issues.length - errors;
const failed = errors > 0 || (opt.strict && warnings > 0);
if (opt.json) {
  console.log(
    JSON.stringify(
      { tool: 'lint-film', root: relative(process.cwd(), root) || '.', tokens: paletteName, files: files.length, errors, warnings, suppressed, brandSupplied, accentFace, devicePalette, pass: !failed, issues },
      null,
      1,
    ),
  );
} else {
  for (const x of issues) console.log(`${x.file}:${x.line}:${x.col}  ${x.severity === 'error' ? 'error' : 'warn '}  ${x.rule}  ${x.message}\n    ${x.excerpt}`);
  if (!paletteName) console.log('note: no tokens file or :root palette found; off-token colours were not checked (pass --tokens)');
  console.log(
    `lint-film: ${files.length} files, ${errors} errors, ${warnings} warnings${suppressed ? `, ${suppressed} suppressed` : ''}${brandSupplied ? `, ${brandSupplied} brand-supplied (list each in BRIEF.md)` : ''}${accentFace ? `, ${accentFace} accent-face` : ''}${devicePalette ? `, ${devicePalette} in device palettes` : ''} -> ${failed ? 'FAIL' : 'pass'}`,
  );
}
process.exit(failed ? 1 : 0);
