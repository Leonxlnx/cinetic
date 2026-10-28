# Glass, glow and spectral

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Materials that carry light: frost, refraction and fluted glass, thin-film and foil iridescence, spectral borders and arcs, lens aberration, glows built as core, body and falloff. One dominant spectral or glow accent per film, every soft ramp baked as a dithered plate, no animated blur.

[Coloured dots bleed along a border into one spectral ring](#coloured-dots-bleed-along-a-border-into-one-spectral-ring) · [Soap-bubble glass with thin-film rainbow bands](#soap-bubble-glass-with-thin-film-rainbow-bands) · [Caustic light switches on inside an object](#caustic-light-switches-on-inside-an-object) · [A fluid swirl of light floods the dark frame and settles](#a-fluid-swirl-of-light-floods-the-dark-frame-and-settles) · [A word seen through fluted glass, sliced into refracted strips](#a-word-seen-through-fluted-glass-sliced-into-refracted-strips) · [Radial lens chromatic aberration on light lines](#radial-lens-chromatic-aberration-on-light-lines) · [A tile lights from beneath and spills onto its neighbours](#a-tile-lights-from-beneath-and-spills-onto-its-neighbours) · [Holographic foil icons with frosted inner tiles](#holographic-foil-icons-with-frosted-inner-tiles) · [A window floats inside radial light streaks](#a-window-floats-inside-radial-light-streaks) · [Frosted glass tiles with rainbow prism rims](#frosted-glass-tiles-with-rainbow-prism-rims) · [Frosted panel over a living plate](#frosted-panel-over-a-living-plate) · [Glass objects refract the world behind them, then turn opaque](#glass-objects-refract-the-world-behind-them-then-turn-opaque) · [Rainbow arcs, prism beams and auras composited into plates](#rainbow-arcs-prism-beams-and-auras-composited-into-plates)

### Coloured dots bleed along a border into one spectral ring

`dv-spectral-border-bleed` · signature · energy medium · launch, feature · primitive: BorderBleed

A black pill border carries a few small coloured dots, each matching an integration or a category; colour leaks out of every dot along the border in both directions until the segments meet and the border is one continuous spectral ring, the dots shrinking as they empty, and the ring then turns slowly. **When:** Integrations, works-with-everything, a many-source product; one moment. **Avoid:** Single-source products; next to another spectral accent.

- **Anatomy:** Stroke 3 px, radius 20 px; per dot a gradient segment along the perimeter whose half-length grows from 0 to 25 % of the perimeter on an in-out; outside the segments the stroke stays ink with a soft mix; dots 9 -> 3 px losing 40 % saturation; the ring then rotates about 3 deg/f.
- **Timing:** Leak 12 f, dots absorbed on the next kick (with the label swap), ring turns 60 f.
- **Sound:** The label swap and the ring's completion on one kick.
- **Build:** `<BorderBleed w h r dots={[{ pos, color }]} at leak={12} absorb turn={960} glow>` (fx/BorderBleed): each dot leaks to the midpoints with its neighbours on E.stdInOut; the border is 160 segments coloured by an OKLab mix of the neighbouring dots with an 8 % feathered lead, so hues meet without a grey seam; dots 9 -> 3 px, absorbed on `absorb`; borderBleedFrames() gives the leak, close and absorb cues.
- **Materials and numbers:** Segment ends feather over about 8 % of the perimeter; neighbouring hues meet without a grey seam (order the dots by hue around the shape).
- **Conditions:** the film's one spectral accent.

### Soap-bubble glass with thin-film rainbow bands

`dv-thin-film-dome` · signature · energy calm · launch · primitive: Glass

A character or product sits under a clear glass dome that shimmers like a soap bubble: broad concentric pastel rainbow bands follow its curvature, strongest near the rim and fading at the crown, and the world behind is slightly desaturated and bent. **When:** A hero object that should feel protected, new or magical; airy pastel worlds. **Avoid:** Dark, technical films.

- **Anatomy:** Five band hues (pink, peach, mint, lilac, sky), each 6-10 % of the radius wide, 25-40 % opacity, soft 20 px edges; a white fresnel rim at about 0.6 at grazing angles; the background inside desaturated about 30 % and shifted 2-4 % radially.
- **Timing:** Present for the shot; the bands drift 1-2 % a second with the camera.
- **Sound:** An airy pad.
- **Build:** `<Glass mode="thin-film" circle x y w h backdrop={layer}>` (fx/Glass): the backdrop copy scaled 1.03 and desaturated inside the dome; concentric bands computed from thin-film interference (thickness 0.2-1.3 um, thinner at the crown, thicker toward the bottom: 4-5 bands) baked once, turned 1.5 deg/s in screen blend and strongest at the rim; a white fresnel rim and a window highlight. filmThickness() and thinFilmColour() are pure.
- **Conditions:** the film's one spectral accent.

### Caustic light switches on inside an object

`dv-caustic-switch-on` · signature · energy calm · launch, sting · primitive: LightField

A caustic light band appears on the inner faces of a prism-like object and brightens, its top edge glinting: light becomes the event. **When:** A 3D hero object in a calm opener. **Avoid:** A second spectral accent in the same film.

- **Anatomy:** Band on the inner faces, brightening (tau about 4 f); edge glint.
- **Timing:** 60 f.
- **Sound:** A caustic shimmer 83 ms before the switch.
- **Build:** LightField pools clipped to the object's faces, glowRise on the switch. 3D: a transmission material (roughness 0.35, IOR 1.5, dispersion 5, thickness 2) under an HDR strip light. 2D: a clipPath per face, a blurred spectral stripe (stdDeviation 12) and edges stroked twice with 1 px offsets.
- **Materials and numbers:** Glass construction: faces are not one material (two frosted grey faces with soft light gradients, one nearly clear face showing the dark interior), an inner-edge rainbow about 60 px wide hugging one edge (a warm brown -> mauve -> cyan -> white), and a caustic band with a pale warm core, a warmer body, a magenta-red left border and a cyan right border, blurred about 25 px. Edges stay 1 px light lines doubled by 1 px green and pink offsets at 50 %. The light switches on in about 10 f, holds with micro drift, then the camera dives into it.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform; the film's one spectral accent.

### A fluid swirl of light floods the dark frame and settles

`dv-liquid-light-swirl` · signature · energy medium · launch, sting · primitive: GradientField (swirl)

On an empty dark frame a fluid wave of light rolls in from one corner, a white-hot area followed by curling arms of a pale tint and the accent like ink in water lit from behind, and within half a second it calms into the slow drifting colour field that holds the logo or the line. **When:** A section opener or the frame before the logo on a dark film. **Avoid:** More than once; light grounds.

- **Anatomy:** Three soft blobs (white, a pale tint, the accent) blurred 80-150 px, rotating about a corner pivot from 60 to 0 deg through a low-frequency displacement (scale 120 -> 0); peak mean luma about 4x the ground; settles into 3-4 drifting blobs.
- **Timing:** 30-36 f from dark to the settled field.
- **Sound:** A whoosh or swell; the line lands after it.
- **Build:** `<GradientField mode="swirl" stops={[ground, deep, accent, tint, white]} swirl={{ at, dur60: 34 }} centre={[0, 1]}>` (fx/Gradients): the light front grows from the corner on E.glideOut with curling arms riding on it (a turn that unwinds as it settles); the hot core is the last thing to fade and the settled field keeps drifting. Computed per frame and dithered with blue noise, so the dark ramp never bands; gradientFieldFrames() gives the start and settle cues.
- **Materials and numbers:** White hotspot, pale tint, accent, deep ground; the hotspot sits in the corner the swirl comes from and is the last thing to fade.

### A word seen through fluted glass, sliced into refracted strips

`dv-fluted-glass-type` · signature · energy medium · launch, sting · primitive: Glass

The logo or a word sits behind reeded glass: it is broken into vertical bands, each a sideways-shifted, softened slice, so it flickers between sliced and legible while it moves; then the bands clear and the word is sharp. **When:** A logo or a word reveal on a dark, lit ground; a clarity beat. **Avoid:** Long lines; flat light grounds.

- **Anatomy:** Stripes 40-60 px; per stripe a sawtooth displacement of up to 15-25 px with a lens ramp inside each stripe; edges softened about 4 px; strength 1 -> 0 over 28 f.
- **Timing:** 28 f.
- **Sound:** A whoosh on the logo's move.
- **Build:** `<Glass mode="flute" x y w h stripe={46} at dur60={28} backdrop={word}>` (fx/Glass): one strip per reed, each a copy squeezed about its own centre and shifted sideways, under a baked shading plate per reed; the level clears 1 -> 0 on E.settleOut and the strips meet exactly at 0, so the word lands sharp with no seam (`reverse` slices it in). Only transforms move; fluteStrip() is pure. `squeeze` and `shift` (0.55 and 0.4) set how far each reed's copy narrows and slides: over type, lower both until no letter reads twice in a still.

### Radial lens chromatic aberration on light lines

`dv-chromatic-fringe` · accent · energy medium · launch, sting · primitive: Fringe

A red fringe on one side and cyan on the other of silhouettes and caption edges, present on every graphic frame as a fixed offset. Two flavours: a radial lens aberration over the whole graphic layer, so every thin luminous line is three lines (warm toward the frame centre, a green core, blue outside) with a split that grows with distance from the centre; or a lateral split on 3D edges that makes hard lines read as cut glass catching light. **When:** A graphic, glitch-flavoured world. **Avoid:** Clean UI films.

- **Anatomy:** Static offset of two tinted copies. Radial: channel scale about 1.8 % of the radius each way (red 0.982, blue 1.018 about the frame centre), so a line at r 450 px carries about 28 px of red-green-blue cross-section plus a wide soft blue glow outside (sigma about 20 px) and a warm haze inside; lines near the centre lose their fringe (a spiral loses it as it tightens). Lateral: 1-1.5 px each side (a warm line one side, cyan the other) round a white core, larger toward the frame edge, with a neutral grey glow.
- **Timing:** Static.
- **Sound:** None.
- **Build:** `<Fringe mode="radial" amount={0.006}>{the graphic layer with its ground}</Fringe>` once over all graphics (fx/Fringe), or `mode="lateral"` at 2.5 px for glass edges; fringeForSpeed() splits only on the fastest frames of a move.
- **Materials and numbers:** Static optical property: it animates only because things move through radius. Build it once as a layer over all graphics, never per element.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** gradients baked as dithered plates and moved by transform; the film's one spectral accent.

### A tile lights from beneath and spills onto its neighbours

`dv-under-light-spill` · accent · energy medium · launch, feature · primitive: FloorGlow

When a key or tile lights, the light is not contained in it: a deep accent glow fills the tile and a white-hot spot sits on one edge, washing over the gap and half the next tile as if a light were under the keyboard; the dark tiles round it pick it up. **When:** Keyboard, grid and tile UIs on dark grounds; choosing one option. **Avoid:** Light grounds.

- **Anatomy:** Tile near-black, radius 24 px, 1 px top inner highlight; light: a near-white core (r about 60 px) at the tile's edge, an accent body (r about 220 px), falloff to transparent; a floor glow along the bottom third; it grows about 2.5x over 14 f.
- **Timing:** Bloom 14 f, then holds with the camera move.
- **Sound:** VO.
- **Build:** `<FloorGlow x y w h tones={[accent, second]} core={[0.5, 0.2]} at>` (fx/Glow) at the lit tile's edge: a baked, dithered radial plate (a near-white core off-centre toward the next tile, the accent body, a second tone in the falloff) in screen blend, growing 0.4 -> 1 in 14 f on E.snapOut; floorState() is pure.
- **Materials and numbers:** Glow anatomy: core, body and falloff, three stops, never a uniform halo; the core sits off-centre on the edge nearest the next tile.

### Holographic foil icons with frosted inner tiles

`dv-holographic-icons` · accent · energy calm · launch, feature · primitive: Foil

Feature or integration icons are rounded squares whose surface swirls with pastel holographic foil (a cool rim, warm, pink and lilac sheen) under a smaller frosted-white tile that carries a plain white glyph; each icon's foil is turned to its own angle, so the grid shimmers as one family. **When:** A grid of features or integrations that must read premium and related; light grounds. **Avoid:** Dark grounds; brand icons that must keep their own colours.

- **Anatomy:** Base conic gradient (rim hue -> warm -> pink -> lilac -> rim hue) blurred about 6 px inside the shape; inner tile inset 16 %, radius 20 %, white at 75 % with a 1 px white rim; glyph white with a 10 % grey shadow; icon about 80 px at radius 22 %; the foil angle differs per icon.
- **Timing:** Develop 28 f (saturation pale to full while the focus clears), then hold.
- **Sound:** Small pops on the arrivals.
- **Build:** `<Foil x y size angle hues develop={{ at, dur60: 28 }}>{glyph}</Foil>` (fx/Spectral): one baked, dithered conic foil plate turned to the icon's own angle under a squircle (radius 0.27 of the size), a sheen band that slides with the angle, an edge shade and an inner frosted tile (0.56) for the glyph; develop cross-fades a grey copy away. The default hues are the cool foil run (FOIL_COOL); a brand passes its own.
- **Materials and numbers:** Example stops teal #2FA39A, peach #F2C1A6, pink #EBA3B9, lilac #C9C3EE; the foil is the film's one spectral accent.
- **Conditions:** the film's one spectral accent.

### A window floats inside radial light streaks

`dv-radial-light-streaks` · accent · energy medium · launch · primitive: RadialStreaks

The final product window floats on black with a thin coloured rim light, and around it broad light streaks radiate from the frame centre (a warm one, a white one, a cool one, a deep one) separated by black gaps, bending past the corners like light leaking round the window. **When:** The last product frame of a dark launch film, after a glass or light act. **Avoid:** Light grounds; the middle of a UI demo.

- **Anatomy:** Rim 1.5 px plus a 4 px blur at about 60 % in a tint of the accent; streaks 200-400 px long, blurred 20-40 px, radial from the centre, hidden behind the window by a radial mask (transparent to 70 % of the closest side); drift outward about 1.5 px/f while the window pulls back 6 %.
- **Timing:** 30-40 f to the end.
- **Sound:** The last strong kicks.
- **Build:** `<RadialStreaks cx cy stops={streakStops([...])} inner={0.32} drift={0.012}>` (fx/Glow): a conic plate of hard colour stops and black gaps baked and dithered once, blurred at one fixed level, hollowed by a baked radial mask and scaled outward 1.2 % a second; the window's rim light is its own box-shadow.
- **Materials and numbers:** Conic stops e.g. warm 0-6 %, gap to 10 %, white 18 %, gap 24 %, cool 33 %, gap 40 %, deep 52 %; the window pure white.
- **Conditions:** the film's one spectral accent.

### Frosted glass tiles with rainbow prism rims

`dv-prism-rim-glass-tiles` · accent · energy calm · launch · primitive: SpectralRim + Glass

Icons orbit inside thick frosted-glass squircles whose edges glow with thin rainbow fringes (one hue on the lit side, its opposite on the other) like light split by a glass edge, while the icon inside stays crisp; out-of-focus tiles become pastel rainbow smudges. **When:** An integrations orbit or icon cloud in a light, airy world. **Avoid:** Dark grounds; flat UI.

- **Anatomy:** Tile 140 px, radius 36; frost white at 35 % over a 14 px backdrop blur; a 6-10 px rim of a conic spectrum whose order follows the light direction; bokeh tiles blurred 12-25 px keeping their colours.
- **Timing:** A continuous orbit; the dispersion turns as each tile turns.
- **Sound:** None of its own.
- **Build:** `<Glass mode="frost" ...>` for the tile and `<SpectralRim x y w h r width={2} angle={tileRotation}>` (fx/Spectral) on top: a baked conic spectrum masked to a 2 px ring and turned by transform with the tile (one hue on the lit side, its opposite across), with a wider blurred copy behind it as the light it throws.
- **Conditions:** the film's one spectral accent.

### Frosted panel over a living plate

`dv-frosted-panel-over-plate` · accent · energy calm · launch, feature · primitive: Glass

A card shows the same moving footage behind it, heavily blurred and slightly brightened, while the plate outside stays sharp; the material the camera dived into becomes the UI's background; an app window floats on warm light; a frosted card rises with a solid offset twin behind it. **When:** Brands with a glass language. **Avoid:** Frost as a default card style; more than one glass language per film.

- **Anatomy:** Backdrop blur about 25 px inside the card; twin offset 45 px right, 60 px down.
- **Timing:** Continuous with the plate; rise 30 f expo-out.
- **Sound:** A whip whoosh.
- **Build:** `<Glass mode="frost" x y w h r at backdrop={plate}>{content}</Glass>` (fx/Glass): the plate drawn again inside the card at one blur level (22 px), brightened and a little more saturated, a 14 % veil, fine grain, a 1.5 px light top edge and a soft inner bottom shadow; the card rises 30 f on E.glideOut while the copy stays put, so the frost always shows what is behind it now.
- **Materials and numbers:** Frost construction: where a card overlaps the headline the letters show through as soft dimmed shapes (backdrop blur 8-12 px, letters at 40-50 % luma, no refraction offset), the card's rim stays crisp and its soft shadow darkens the letters just above it; a frosted bar over a halftone sky averages the dots into soft colour because its blur exceeds the dot pitch (blur 24 px, white at 22 %, a 1.5 px bright top edge, an inner shadow at the bottom). The ground behind a composer can be the same glass heavily defocused (blur 60-90 px) with pastel caustic patches and a faint rainbow arc at 8 % for 8 f, drifting against the camera.
- **Material layer:** no primitive yet for the material; until there is one, build it from the recipe above.
- **Conditions:** glass as a material with real frost or refraction, not a default card style; the film's one spectral accent.

### Glass objects refract the world behind them, then turn opaque

`dv-refracting-glass-sphere` · accent · energy medium · launch, sting · primitive: Glass

Dark glass spheres fly in, and for their first frames the background shows through them, darkened, magnified and bent (grid lines and a light line displaced inside, a slight colour split on the bright lines); as they land they turn opaque. **When:** A 3D or glass act; objects that frame a hero. **Avoid:** Flat UI films.

- **Anatomy:** Inside the circle: the backdrop scaled 1.1-1.2x about the sphere's centre, blurred 2-4 px, brightness 0.25, a 2 px channel split on bright lines; a caustic radial gradient from the accent at 80 % to transparent over 30 % of the radius; the refracted copy's opacity 1 -> 0 over the landing.
- **Timing:** Clear 6 f, half 2 f, nearly opaque by 10 f more, overlapping the landing overshoot.
- **Sound:** Bubble pops on the landing, leading the picture by about 30 ms.
- **Build:** `<Glass mode="refract" circle x y w h at caustic={accent} backdrop={layer}>` (fx/Glass): the backdrop magnified 1.15, blurred 3 px at 25 % brightness, its red and blue copies scaled apart (a radial colour split on bright lines), a caustic on the far side and a rim; clear for 6 f from `at`, half 2 f later, nearly opaque 10 f after that (glassState()).
- **Materials and numbers:** Magnification 1.15, blur 3 px, brightness 0.25, caustic in the accent at 0.8.

### Rainbow arcs, prism beams and auras composited into plates

`dv-painted-light-plates` · accent · energy calm · launch · primitive: recipe (plain layers)

Generated or photographic plates carry light painted into them: a full spectral arc over a figure, a broad warm prism beam falling through the body, a soft aura behind the head, a horizontal spectral band across a face, floating double-exposed shapes and a local glow that fades slowly around the feet, all grained together with the plate. **When:** An imaging or generation brand whose plates are the hero; slow holds. **Avoid:** Product UI; documentary footage.

- **Anatomy:** Arc: a seven-stop spectrum stroke about 60 px wide, blur 6 px, screen at 0.6. Beam: transparent -> warm at 0.55 -> transparent over about 240 px. Aura: radial, about 260 px. Spectral band: about 20 % of the frame tall, screen at 0.45, blur 12 px. Local glow: radial about 150 px fading 0.8 -> 0.1 over a 240 f hold. Grain about 4 % over everything.
- **Timing:** Static in the plate; the camera push moves everything together; local glows fade across the hold.
- **Sound:** None of its own.
- **Build:** Recipe: SVG and CSS overlays in screen blend over a Photo, plus one grain layer; bake each spectrum as a dithered PNG.
- **Materials and numbers:** Arc stops outer to inner: red, coral, a thin yellow, a thin green, sky, violet, fading into the sky colour; double exposures at 45 % in lighten.
- **Conditions:** the film's one spectral accent.
