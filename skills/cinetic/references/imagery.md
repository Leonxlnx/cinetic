# Imagery: real photographs and footage as the film's material

A film drawn entirely in code (cards, bars and shapes on a flat ground) reads as a demo, however good its motion.
Real photographs, footage, textures and archive pictures give a film a world: light that was really there, depth,
grain, places and materials a viewer recognises. In cinetic they are the main material whenever the subject has a
world to show; code-drawn UI and type sit on them as support. This page is the route from a brief to a graded,
moving picture. The tool is `scripts/assets.mjs` (Node 22, no dependencies, no keys needed for the keyless sources).

Contents: 1. The licence rule · 2. Where it sits in the workflow · 3. The route · 4. The imagery primitives ·
5. Premium or stock · 6. Footage · 7. Works and archives as the world · 8. The imagery directions · 9. Checks

## 1. The licence rule

`assets.mjs` only takes licences that need no credit: CC0, public domain (Wikimedia Commons files marked CC0 or
public domain, NASA's library, museum open access at the Met and the Art Institute of Chicago), and the Pexels,
Unsplash, Pixabay and Mixkit free licences. Nothing in the film has to say where a picture came from, so **nothing
on screen credits a picture**. `get` writes a private record, `<film>/assets/licences.json` (source, licence as read
on its page, author, page URL, file hash, what was changed), outside `public/` and never shown on screen; the record
stays with the project and is never published with the film. `--allow-credit` adds CC BY for a film that wants it,
and then the record carries the credit line for the post text (still never on screen). Share-alike, non-commercial,
no-derivatives, Mixkit's restricted licence, "no known copyright restrictions" and anything unknown are refused.
Pictures with recognisable people, logos or brands still need care in an advertisement whatever the licence (the
record notes it); NASA pictures never carry NASA insignia or suggest endorsement.

Keyless sources: Openverse (CC0 and public domain), Wikimedia Commons, NASA images and video, the Art Institute of
Chicago, the Met, Mixkit video. With a key in the environment: `PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`,
`PIXABAY_API_KEY` (keys are never printed).

## 2. Where it sits in the workflow

- **Step 1 (concept).** The inventory names the subject's world; the direction decides how pictures are used (a word
  cut out of the world, a montage on the music, UI drawn into a real place, a collage, a loupe over a collection).
  When the film has no product UI to show, or the brief wants a world, start from the imagery directions (section 8).
- **Step 2 (brand and look).** Search, sheet, choose and grade here, beside the palette: the grade and the palette are
  one decision. A supplied brand's product photos come in through `brand.py` (`references/brand-kits.md`) and are
  graded with the rest.
- **Step 4 (build).** Move the pictures with the imagery primitives (section 4) inside the film's one camera.
- The asset folders live in the film project (`public/assets/`, `public/assets/graded/`, the record in
  `assets/licences.json`), never in the skill.

## 3. The route: inventory, queries, sheet, choose, grade, move

1. **Inventory.** Before searching, list the subject's world in its own words: the place the product is used in,
   the weather and season, the materials its users touch, the movement that place has (water, crowds, traffic,
   wind), the tools, the archive of its trade. A forecast app lists coastlines, surf, tide pools, fog, boats; a
   ceramics shop lists clay, kilns, glaze, hands, shelves. Six to twelve nouns.
2. **Queries.** Each noun with a viewpoint or a medium: `"<place> aerial"`, `"<place> from above"`,
   `"<material> macro"`, `"<movement> top view"`, `"<place> old photograph"`, `"<place> map"`. Name the thing,
   not the feeling: "basalt cliff fog", never "inspiring nature". The imagery directions carry query templates.
   ```
   node scripts/assets.mjs search "rocky coast aerial" --kind video --limit 10
   node scripts/assets.mjs search "basalt" --kind texture --min-width 2400
   node scripts/assets.mjs search "harbour" --kind art          (museum prints and maps)
   ```
3. **Sheet.** Always look before choosing: `sheet` builds a contact sheet of the candidates (numbered, with source,
   size, length and licence), and you read the PNG.
   ```
   node scripts/assets.mjs sheet out/assets/rocky-coast-aerial-video.json
   ```
   For footage, look at more than the poster: `sheet <video results> --scan 4` reads four frames from each clip's
   preview stream before anything is downloaded, and after `get`, `sheet public/assets/sea.mp4 --scan 6` spreads six
   frames across the file so you choose the seconds before trimming.
4. **Choose.** For light, depth and one idea, not for the subject alone (section 5). Three to eight pictures for a
   15 s film. Download only those, trimmed to the seconds you use:
   ```
   node scripts/assets.mjs get #2,#7 --to public/assets --res 1080 --trim 3.5,6
   ```
5. **Grade.** One look for the whole set, so pictures from four sources read as one shoot. `grade` matches
   exposure and colour strength across the set first, then applies the look, crops to 16:9 around a focus point and
   adds a fine grain:
   ```
   node scripts/assets.mjs looks
   node scripts/assets.mjs grade public/assets --accent "#2e8c9e" --focus 0.5,0.45 --out public/assets/graded
   node scripts/assets.mjs sheet public/assets/graded            (check the set reads as one)
   node scripts/assets.mjs check public/assets/graded --accent "#2e8c9e"
   ```
   Looks: `natural` (the default: each picture keeps its own colour, exposure and colour strength matched across the
   set, strong colours held back, a faint cool shadow), `matte` (lifted blacks, colour at 55 %, shadows a step
   toward the accent hue), `silver` (neutral black and white: archives, a quiet film, the pieces of a collage),
   `night` (low key). Three more are **device looks for one shot**, not a film's grade: `tint` (30 % of the
   picture's own colour under a one-hue wash at the accent hue), `duotone` (deep accent-hued shadows to a pale tinted
   white) and `deep` (the picture becomes a colour field). A whole film in a one-hue wash turns into a monochrome
   accent bath; the film's colour should come from the pictures' own colour over neutral grounds, with the accent
   kept for what it means. `check` (which `grade` also runs) holds a graded set to at least 30 % neutral pixels,
   at most 35 % of frames heavily saturated and the accent hue on at most 10 % of the picture. Keep stills at
   2400 px so a push stays sharp; keep footage at its own size (`--aspect none`).
6. **Move.** The motion system moves pictures exactly as it moves type: closed-form state, the house curves,
   carried speed across cuts, a camera that never parks.

## 4. The imagery primitives

| Primitive | What it does | House numbers (60 fps, 1080p) |
|---|---|---|
| `fx/Photo` | A photo framed on its focus point, a push or drift (room for the move is built into the cover fit), depth slices from hand-drawn polygons that part as the camera moves, a static grade; `photoPoint` pins marks to the picture | push 4-8 % a shot, drift 20-40 px/s, slice depth gain 0.6, nearest slice ≤ 3 % extra travel |
| `fx/TypeMask` | Giant letters cut out of a plate with the picture moving behind them; the push through one stroke until the picture is the world | letters 80-95 % of the frame width, weight 750-800; push ×36 in 40-56 f on `launchIn`, the fill only to 1.2×; plate drops at ×18-22 |
| `fx/Footage` | A clip on the film's clock: speed (constant or keyed), freezes, loops whose span is a number of beats, framed and graded like a photo | real time for water and people, 0.5 for slow texture; a 24/30 fps clip in a 60 fps film is declared stepped |
| `fx/Montage` | Shots cut on the film's accents with one carried travel through them (launch into each cut, carry out at 0.7 of the cut speed) | shots 0.5-1.0 s, cut speed 9-12 px/f, residual drift 45 px/s, 3 % push per shot |
| `fx/Cutout` | Cut-outs along hand-drawn mattes, settling like printed paper with a shadow from one key and a contact shadow | settle 34 f on `settleOut` from z 120-140 px, 6-8° of turn, blurs fixed at 3 and 14 px |
| `fx/Lens` | A loupe: a round window that magnifies the same picture about its own centre, glides between details and can come to rest as a counter or a dot of the name, still live | 300 px across, 2.2×, 40 f per move on `strongInOut`, a beat's hold at each stop, 0.75 s home |
| `fx/GradientMap`, `fx/Textures`, `fx/Develop` | A picture mapped onto the film's inks, a photo that develops through a dither, an image developing from a tint to full colour | see the device book: [photos and footage](devices/photos-and-footage.md), [colour and light](devices/colour-and-light.md) |

They compose with everything else: a `Photo` or `Footage` sits inside the anchor camera (`lib/camera.ts`), under a
`Wipe` or `Iris`, behind a `Chain` of fragments; `photoPoint` gives the frame position of any image point on any
frame, so a line, a number or a pinned product state stays glued to a place in the picture as it moves. The device
book's [photos and footage](devices/photos-and-footage.md) and [collage and composition](devices/collage-and-composition.md)
families hold the devices built on these.

## 5. Premium or stock

What makes a picture read as chosen:

- **One idea per picture.** A single subject, a strong line (horizon, waterline, wake, street), a quiet third for
  type. A top-down view of texture (surf, a field, a street from above) works behind type better than a horizon.
- **One light.** Pictures in a film share a time of day, or are ordered by it on purpose. Overcast and blue-hour
  light grade cleanly; noon glare and sunsets fight a grade.
- **One grade.** Every picture through the same look. A set graded together is a shoot; a set left as downloaded is
  a mood board.
- **Scale and travel.** Full frame and past the edges, pushing or drifting, cut on the music. A photo that sits still
  in a box is a slide.
- **The subject's own things.** The product's place, materials and tools, not generic business imagery. A coast app
  shows coasts; it does not show people looking at phones.
- **Real resolution.** 2400 px stills, 1080p footage; a 1024 px picture is a texture or a defocused plane, never a
  sharp full frame.

What makes it stock, and is refused: handshakes, laptops with coffee, people pointing at screens or smiling into the
lens, glowing brains and circuit boards, generic city timelapses (unless the day itself is the idea), sunsets as
decoration, a picture whose subject sits in one corner with nothing to say, mixed grades, and anything with a readable
brand or sign.

## 6. Footage

- Mixkit's free clips are 24-30 fps, 720p and 1080p, 10-45 s; `get --trim` keeps only the seconds used. Prefer
  50/60 fps footage for slow motion; at 60 fps a 24 fps clip holds each frame 2-3 output frames (declared stepped,
  so forensics and the blur sampler treat it as craft).
- Footage is drawn with `<Freeze>` around `<OffthreadVideo>` from a closed-form source frame: any frame renders the
  same in any order, and the cut points are exact (`references/remotion-engine.md`).
- Keep the camera alive on top of footage (a push or drift), and carry speed across cuts; a still clip under a locked
  frame reads as a paused video.
- A speed ramp or a freeze on the music's accent belongs to `fx/FootageRamp` (`references/camera.md`).

## 7. Works and archives as the world

Open-access collections are the richest no-credit material there is: paintings, prints, maps and old photographs at
3000-6000 px, with real surface (brush, paper grain, halftone) that no code draws. Search them with `--kind art`
(the Met, the Art Institute of Chicago) and on Wikimedia Commons for archive photographs (public domain by age or by
government authorship). Four moves turn a collection into a film rather than a slideshow:

- **The world is the collection.** One family of works (one period, one medium, one palette) graded together, so the
  film has a place, not a gallery wall. Pick works for one light and one scale of mark.
- **The name as a window.** The name cut out of a dark wall (`TypeMask`), the works sliding inside the letters
  (`Montage` as the fill), then a push through one stroke into a painting.
- **The loupe.** `Lens` opens on a detail the full frame cannot hold (a face in a crowd, the foam on a painted wave),
  glides to a second detail, and flies home into the name, where it stays a live window.
- **Shaped windows.** Rounded or pill windows that open on archive photographs and close on the beat; a dot grid or
  mosaic that resolves into the picture. The shape is the device; the picture is the content.

Museum pictures of artworks are fine; pictures of people need the same care as any photograph of people in an
advertisement, and a recognisable modern brand or sign in an archive photograph is cropped out.

## 8. The imagery directions

`assets/directions/imagery.json` holds nine imagery-led directions in the deck's schema: the campaign (a word cut out
of the world), cut to the score (a footage montage on the music), the product in its place (UI drawn into real
photographs), the material (macro textures as the set), the collage (cut-out photographs with shadows), two worlds (a
split the product drags), then and now (archive and today on one line), one long photograph, and the collection
(works seen through a loupe, the name as a window onto them). Each carries an `assets` block (what to list from the
subject, the queries, how many pictures, the grade, what to refuse) and an update skeleton. Read the one or two that
fit the brief beside the three directions `deck.py` deals, choose by the idea as usual, and copy the chosen
direction's world, light, camera, signature and lockup into `TREATMENT.md`'s Direction block.

## 9. Checks

- `assets.mjs check` on the graded set (neutral share, saturated frames, accent share).
- `look-audit.py --imagery x,y,w,h` declares the boxes that hold photographs, so natural colour inside a picture
  (sand, rock, skin) is not read as designed colour; it never loosens the checks for the film's own colour.
- The picture floor (`references/checks.md`) counts real imagery toward edges and colour mass: a film whose picture
  is mostly real material passes it easily; a film of grey cards over a flat ground does not.
