# Imagery: real pictures, treated like a studio treats them

A cinetic film is made of type in motion, graphic effects and the product's own UI built in code. When a shot needs
a person, a place, an object, a product or a moment of use, it shows a **real photograph or clip**: the brand's
own, the user's, or a free picture whose licence needs no credit. **Nothing drawn in SVG ever stands in for a
photo**: an egg-shaped head, a grey silhouette, a landscape of flat bands, a product as two rectangles, a card of
coloured squares where portraits should be. Those read as a placeholder the moment they appear. A real picture,
chosen with taste and finished well (cropped on its subject, on a rounded card with a rim and a shadow, leaning in
depth, sharp where the eye goes and soft away from it, smeared along its travel, graded into the film), is what
makes a launch film read as made. The tool is `scripts/assets.mjs` (Node 22, no dependencies, no keys needed for
the keyless sources); the treatments are `src/fx/Pictures.tsx` and `src/fx/Washes.tsx`.

Contents: 0. When a shot needs a real picture · Show the core action · 1. The licence rule and the sources · 2. Where it sits in the
workflow · 3. The route · 4. The studio treatments · 5. The imagery primitives · 6. Chosen or stock · 7. Footage ·
8. Works and archives as the world · 9. The imagery directions · 10. Checks

## 0. When a shot needs a real picture

| The shot shows | It is | Never |
|---|---|---|
| **People**: who the product is for, a face, hands at work, a crowd | real photos or clips of people (`--people`), several when the line is about many | a drawn figure, an avatar circle with initials where a face should be, a silhouette |
| **Places**: where the product is used, a city, a coast, an office, a field | a real photo or clip of that place | flat bands for hills, a gradient pretending to be a sky behind nothing |
| **Objects and products**: the thing itself, its materials, its packaging | the brand's product photos first (`brand.py`), else a real photo of the object | a product drawn as rectangles; an icon blown up to fill the frame |
| **Lifestyle**: the moment of use, the mood of the audience | real photos or footage, chosen for light and one idea | stock gestures (section 6) |
| **Proof**: many users, many creations, a community, a gallery of results | many real photos at once: a river of cards, a masonry wall, a pile | grey or coloured squares standing in for the content |
| **The product's UI** | built in code from the kit (`references/product-ui.md`), real words and numbers | a screenshot zoomed soft; grey bars |
| **An idea a graphic says better** (a flow, a number, a change of state) | a graphic: type, a diagram, a dithered gradient, the product's UI | a stock photo filling the beat because it felt empty |

A picture is used where the shot needs it, not everywhere: a film of 6-8 lines typically shows real pictures on
2-4 beats (an opening world, proof of people, the product in use) and builds the rest in type and UI. A shot that
needs a person and has none is a hole the viewer sees; a shot that needs a diagram and gets a stock photo is filler.

**Show the product when a line claims something about it.** "Its cap counts every sip" over a stock bottle with an
ordinary cap is a claim the picture does not prove, and a viewer feels the gap. A line about what the product's part
does gets the product doing it: the brand's own photos or footage of that part (`brand.py`, the user's files), else a
built render or a close cut of the moment of use followed by the result in the UI (the sip, then the ring ticks up in
the app on the same beat). A stock object stands in for the world round the product, never for the product itself;
when there is no picture of the product, say what the app shows instead and show that.

## Show the core action (the first picture beat)

The first picture beat shows what the product does, literally: the input, then what it becomes. With the sound off,
a viewer names the product from that beat alone. A voice memo app opens on someone speaking into a phone and the words
landing as a note; a waveform alone, the UI alone or an abstract shape says nothing about who speaks or why. Where the
input is human (a voice, a hand writing, a payment, a run, a parcel at the door), it is a real person in real footage,
a photo when no clip fits.

**Find it.** `node scripts/assets.mjs recipe "<the product in your words>"` matches one of 40 inputs (speaking into
a phone, typing on a laptop, a meeting, paying at a counter, a doctor's visit, studying, a train ride ...) and prints the
shot, its framing, the screen that takes the plate and the picks already checked (licences that need no credit),
saved as a results file. `sheet <results> --cell 240`, then `get #n --to public/assets --trim start,seconds`. No
input fits: `search` with the person, the action and the device ("woman speaking into phone").

**Pick the input shot.** The action reads in under a second: lips moving at the phone, fingers on the keys, the card on
the reader. One person, one action, from the side or over the shoulder (hands and profiles beat a face to the lens).
Refuse staged smiles at the camera, white seamless studios, watermarks and readable brands. Use 1.5-3 s of it, graded
with the film's look (`grade`) so the cut to the UI does not jump.

**Bring the output in: pin or cut.** Each pick says which (`screen: pin | cut`).
- *Pin*, when the screen faces the lens and the camera is slow. The product's screen, the same kit component the film
  uses later, drawn at its native size in a div with `transformOrigin: '0 0'` and
  `transform: quadMatrix(w, h, [tl, tr, br, bl])` (`src/fx/KeyLight.tsx`). Read the four corners off stills of the
  trimmed clip (`ffmpeg -ss <t> -i clip.mp4 -frames:v 1`) at its first and last frame, every 0.5 s if the hand moves,
  and interpolate them by frame. Finish it like glass: clip it to the device's corner radius, keep its whites a touch
  under the clip's brightest white, blur it 0.5 px, lay the clip's grain and a faint diagonal reflection over it. A
  thumb across the screen breaks it: choose a shot where nothing crosses, or cut. The plate receives the input in
  sync (the words appear as the lips move, the total lands as the card taps).
- *Cut*, when the screen faces away, moves fast or there is no device (a meeting, a doctor's visit, a parcel). Cut on
  the action to the kit `Phone` or `Laptop` (`src/kit/device.tsx`, the screen as children at `screenBox` size) at the
  same angle and on the same side of the light, the UI already showing what the input became. Or hold the clip in a
  `FootageWindow` beside the device and let one element travel from one to the other. One cut between input and
  output, never a montage.

The line over it names the result, not the gesture ("Say it. It's written."), and the beat holds until the output
has landed.

## 1. The licence rule and the sources

`assets.mjs` takes only licences that need no credit, so **nothing on screen credits a picture**. `get` writes a
private record, `<film>/assets/licences.json` (source, licence as read on its page, the date it was read, author,
page URL, file hash, what was changed), outside `public/`, never shown on screen and never published with the
film. `--allow-credit` adds CC BY and keeps the credit line for the post text (still never on screen). Share-alike,
non-commercial, no-derivatives, Mixkit's restricted licence, Coverr+, AI-generated clips, "no known copyright
restrictions" and anything unknown are refused. Recognisable people, logos, brands and landmarks still need care in
an advertisement whatever the licence (the record notes the limits); someone else's brand never appears in a film.

| Source (keyless) | What it is good for | Licence (read on its own page) |
|---|---|---|
| Burst (Shopify) | people, products, lifestyle, small business, places; up to ~4000 px | Burst Some Rights Reserved: commercial use, no attribution, read per photo |
| ISO Republic | people, places, textures; renditions up to 2048 px, originals 4000-6000 px | CC0, read per photo |
| Coverr | stock video of people, work, cities, nature; 1080p, 6-30 s | Coverr licence for free clips (Coverr+ and AI-generated clips refused) |
| Mixkit | stock video; 720p, 1080p and 4K where the item page offers it (the files as that page names them) | Mixkit free video licence, read per clip with the page's own licence line (restricted items refused) |
| Openverse | an index of CC0 and public-domain photos (StockSnap, rawpixel, the WordPress photo directory, Flickr, museums) | CC0 / public domain marks |
| Wikimedia Commons, NASA | places, science, history, archive photos and video | public domain / CC0 only |
| The Met, Art Institute of Chicago | paintings, prints, maps, objects at 3000-6000 px | CC0 open access |
| Pexels, Unsplash, Pixabay | the largest stock sets, people and lifestyle above all | their own licences; only with a key in the environment (`PEXELS_API_KEY`, `UNSPLASH_ACCESS_KEY`, `PIXABAY_API_KEY`; never printed) |

Left out on purpose: sites that answer a script with a bot check or a login (the tool never works round one).
The user's own photos and footage always come first; drop them in `public/assets/` and record them by hand.

## 2. Where it sits in the workflow

- **Step 0 (brief).** Name what exists: the product's photos, a brand kit's photography, footage the user supplied.
  `--have photos` (or `footage`) tells `deck.py` the film is picture-led.
- **Step 1 (concept).** For each beat of the script, write what the shot shows (section 0). Beats that show people,
  places, products, lifestyle or proof get a real picture; list them before searching.
- **Step 4 (pictures).** Search, sheet, choose, download and grade beside the palette: the grade and the palette are
  one decision. A supplied brand's product photos come in through `brand.py` (`references/brand-kits.md`).
- **Step 6 (build).** Treat and move the pictures with the primitives (sections 4-5) inside the film's camera, each
  on the beat of the line it answers.
- The asset folders live in the film project (`public/assets/`, `public/assets/graded/`, the record in
  `assets/licences.json`), never in the skill.

## 3. The route: inventory, queries, vet, sheet, choose, grade, treat

1. **Inventory.** List the subject's world in its own words: who uses it (their age, trade, place), where, the
   objects they touch, the moment of use, the weather and light. Six to twelve nouns.
2. **Queries.** Name the thing and a viewpoint, not the feeling: `"barista pouring milk close up"`, `"woman reading
   on train"`, `"ceramic mugs on shelf"`, `"city street from above"`. Fewer words find more on the stock sites.
   ```
   node scripts/assets.mjs search "woman portrait window light" --people --fit 4:5 --limit 10
   node scripts/assets.mjs search "hands typing laptop" --kind video --limit 8
   node scripts/assets.mjs search "harbour morning" --no-people --clean --orientation landscape
   ```
3. **Vet.** Every search reads each candidate's thumbnail (on by default, `--no-vet` skips it): people (the
   record's own words, and frontal faces where the Python's OpenCV has a face model), steady text lines or a
   watermark (like.py's text reader), and detail (soft thumbnails sink to the end). `--people` keeps pictures with
   people, `--no-people` drops them, `--clean` drops text, signs, logos and watermarks, `--fit 4:5` keeps pictures
   that still hold `--min-width` px after a crop to that shape (a card's shape), `--min-width` and `--orientation`
   hold resolution and shape. A Coverr or NASA search keeps only hits whose own words carry the query's words.
4. **Sheet.** Always look before choosing: `sheet` builds a contact sheet of the candidates (numbered, source,
   size, length, licence, and P for people, T for text or a logo, soft), and you read the PNG.
   ```
   node scripts/assets.mjs sheet out/assets/woman-portrait-window-light-photo.json
   node scripts/assets.mjs sheet out/assets/hands-typing-laptop-video.json --scan 4     (four frames of each clip)
   ```
5. **Choose.** For light, one idea and a face or subject the eye goes to (section 6). For a river or a wall, 12-24
   pictures of one kind (portraits, or creations, or places) that read as one set; for a single card, the best one.
   ```
   node scripts/assets.mjs get #2,#5,#7 --to public/assets --width 2400
   node scripts/assets.mjs get #3 --to public/assets --res 1080 --trim 2,4     (a clip: keep only the seconds used)
   ```
   `get` prints the line the kit takes, `{ src: staticFile('assets/x.jpg'), w: 2400, h: 1600 }`: add
   `focus: [x, y]` (0..1) on the subject's eyes or the product, so every crop keeps it.
6. **Grade.** One look for the set, so pictures from four sources read as one shoot:
   ```
   node scripts/assets.mjs grade public/assets --accent "#2e8c9e" --out public/assets/graded --aspect none
   node scripts/assets.mjs check public/assets/graded --accent "#2e8c9e"
   ```
   `natural` (the default) keeps each picture's own colour and range and moves black level and contrast a quarter of
   the way toward the set; `matte` lifts blacks and holds colour at 55 %; `silver` is a neutral black and white (an
   archive, a quiet film, the pieces of a collage); `night` puts the median luma near 0.18 and drains warm colours.
   `tint`, `duotone` and `deep` are device looks for one shot, never a film's grade. `check` (which `grade` also
   runs) fails a set under 30 % neutral pixels and a banned colour region (a saturated orange or amber object,
   cream-yellow, a lit violet, neon) on 0.5 % of a frame, and notes frames over half saturated, the accent's hue in
   the pictures, a picture that does not match the set and readable text or logos. Natural tones (skin of every
   shade, hair, wood, sand, navy shadow) are the world's colour and never count as a banned region. Keep stills at
   2400 px on their long side so a push stays sharp; keep footage at its own size.
7. **Treat and move.** Section 4: the card, the lean, the depth, the smear, the appear; section 5 for full-frame
   pictures and footage.

## 4. The studio treatments (`src/fx/Pictures.tsx`, `src/fx/Washes.tsx`)

Pure functions of the frame (`appearState`, `cardFinish`, `arcRiverState`, `wallLayout`, `washField`); house numbers
are px at 1080p and 60 fps frames (`PICTURES`, `WASH`).

| Treatment | What it does | House numbers |
|---|---|---|
| `PhotoCard` | one photo on a card: cover-fit on its focus point, rounded, a 1 px inner rim, a contact and a lift shadow, an optional mat, a lean in 3D, a push inside the card, a grade, an appear, a defocus and a smear | radius 8.5 % of the short side; shadows 0 2 5 / .14 and 0 14 36 / .16 scaled with the card; mat 10 px paper gap and a 2.5 px hairline in the accent mixed 30 % toward paper, shadow .2 with a mat; lean `tilt={{ rx: 18-28 }}` at perspective 1800 |
| `ArcRiver` | a stream of cards along a curve; two on `mirrorPath` arms pass each other like an S around a word | cards 280 x 345 at a pitch of 300 measured along the curve (they part on the straight and close up on the bend), sizes x0.85-1.18, 40 px across and 30 px along of jitter, cards upright, the lower card on top; travel 65 in, 18 cruise, 110 out px per 60 fps frame (fx/Conveyor), the smear at a 300-degree shutter (sigma 0.24 x px a frame), defocus up to 9 px from 30 % to 95 % of the half-diagonal away from the focus |
| `PhotoWall` + `wallLayout` | a masonry wall of photos scrolling up into place, every tile on its own settle (fx/Scroll masonryState), smeared by its own speed | 4 columns, 28 px gaps, odd columns staggered 0.42 of a tile, heights from the photos' shapes held to 0.66-1.5, depth 0.8-1.25, lag by column |
| `InlinePhoto` | a photo card inside a line of type ("Brings [photo] millions of"), the words beside it | card 8 x 7.5 em of the type, words 0.55 em from it at 0.62 of the card's height; a settle on the card; an accent pill under it pops 62 % -> 100 % in 2 f |
| `PhotoFill` | a photo filling any box: a chip growing in a gap (fx/InlineGap items), a phone or laptop screen | cover on the focus point, the push of fx/Photo |
| `FootageWindow` | a muted clip in a rounded window with the card's finish (fx/Footage: the film's clock, speed, freezes, loops) | as PhotoCard; a lean of ry 6-12 and rx 4-8 reads as a screen in space |
| `Wash` | a colour ground with a direction (dithered, never bands): `rise` (paper over the upper third, the tint gathering at the bottom edge on t^1.7 from 32 %), `fall`, `side`, `sky` (deep to a lifted horizon), `corner`, `halo` (a soft light behind the subject), `tilted` (paper over the first third, then an S-shaped ramp to the tint along an edge 8 degrees off vertical; the `tint` ground of fx/Grounds) | tint = the accent mixed 45 % toward paper (`tilted`: 20 %), or the brand's second colour; `tilted` knots 4 / 24 / 81 % of the tint at 34 / 52 / 84 % of the run; motivated light, one direction, no pools inside the frame |

Appear (`appear={{ at, kind }}`): `settle` x1.16 -> 1 with a 6 px defocus over 24 f on M.oversize (a hero card after
a cut); `rise` 6 % of the card's height and a 6 px defocus over 30 f on E.glideOut; `clip` uncovered from its
bottom edge over 26 f on E.softOut while the photo settles x1.12 -> 1 inside (a reveal that feels like a print
being pulled); `flip` edge-on to face over 22 f; `pop` 62 % -> 100 % in 2 f (a pill, a sticker); `fade` 12 f.
Cards of a set arrive 6 f apart (fx/Stack pile for a pile that builds on itself).

How a studio finishes a picture, and what the primitives do for you:

- **Crop on the subject.** Every picture has a focus point; cards, walls and windows crop around it. A face sits in
  the upper third of a portrait card; a product sits where the line points.
- **One card language per film.** One radius, one rim, one shadow, one mat or none. A matted card sits flat on
  paper; an unmatted card lifts off with its shadow.
- **Depth.** The picture the line is about is sharp; pictures away from it soften (ArcRiver `focus`, PhotoWall
  `focus`, PhotoCard `blur`). Nothing in a stream of fast cards is crisp at speed: the smear follows the travel.
- **Lean.** A card or a window that leans back 18-28 degrees (or turns 6-12) reads as an object in space; a flat
  rectangle reads as a slide. One lean per shot, eased in, never wobbling.
- **Ground.** On a light film, paper with a `Wash` from one edge (a rise behind a diagram, a halo behind a hero
  card); on a dark film, ink with a halo or a sky. The ground's colour comes from the brand, the pictures keep theirs.
- **Grade.** The set through one look (`assets.mjs grade`), and in code `grade={photoGrade('natural')}`
  (kit/theme.ts) on every card so a supplied picture and a found one sit together.
- **Inside the product's UI.** A person in a feed, a creator's thumbnail, a result that is a picture: `Avatar src=`,
  `AvatarStack people=[{ src }]`, `sampleWorld(seed, { photos })` (the world's people with real portraits, shown by the
  dense screens and the person tiles), `ContentTile` preview `'photo'`, kit `Notice photo=`, `ProjectPanel photos=`.
  Without a photo the UI shows what a product shows: initials for a person, the file for a picture (`FileThumb`).

**The templates' picture slots.** Each template names where its structure shows people or pictures, in its content
file: `ui-walkthrough` `walk.ts` `photos` (the feed's people in row order, the found items' pictures, the input's own
picture), `prompt-run` `run.ts` `photos` (the faces of the people the work is for, the result's picture),
`capability-reel` `reel.ts` `record.photo`, `social-ad` `ad.ts` `pictures` (photo cards, and two `ArcRiver` streams on
curves in the label's rivers), `update` `changes[].photos` (an approve review's selects), `type-explainer` `picture`
(`kind: 'photo'`). Fill them with real photos found and graded as above; empty, they fall back to the product's own UI
(initials, files, its tiles), never to a drawing.

## 5. The imagery primitives (full frame)

| Primitive | What it does | House numbers (60 fps, 1080p) |
|---|---|---|
| `fx/Photo` | A photo framed on its focus point, a push or drift (room for the move is built into the cover fit), depth slices from hand-drawn polygons that part as the camera moves, a static grade; `photoPoint` pins marks to the picture | push 4-8 % a shot, drift 20-40 px/s, slice depth gain 0.6, nearest slice ≤ 3 % extra travel; a pull-back x1.18 -> 1 on a long circ-out under taglines |
| `fx/TypeMask` | Giant letters cut out of a plate with the picture moving behind them; the push through one stroke until the picture is the world | letters 80-95 % of the frame width, weight 750-800; push ×36 in 40-56 f on `launchIn` |
| `fx/Footage` | A clip on the film's clock: speed (constant or keyed), freezes, loops whose span is a number of beats, framed and graded like a photo | real time for water and people, 0.5 for slow texture; a 24/30 fps clip in a 60 fps film is declared stepped |
| `fx/Montage` | Shots cut on the film's accents with one carried travel through them | shots 0.5-1.0 s, cut speed 9-12 px/f, 3 % push per shot |
| `fx/Cutout` | Cut-outs along hand-drawn mattes, settling like printed paper with a shadow from one key | settle 34 f on `settleOut` from z 120-140 px |
| `fx/Lens` | A loupe that magnifies the same picture about its own centre and glides between details | 300 px across, 2.2×, 40 f per move on `strongInOut` |
| `fx/GradientMap`, `fx/Textures`, `fx/Develop` | A picture mapped onto the film's inks, a photo that develops through a dither, an image developing from a tint to full colour | see the device book: [photos and footage](devices/photos-and-footage.md) |

A full-frame photo behind a line is the line's world (a meadow under "The future of AI agents", a misty forest
office under a product name): the line sits in the picture's quiet third, the photo drifts or pulls back, and the
type takes the picture's light (white on a dusk sky, ink on a pale wall).

## 6. Chosen or stock

What makes a picture read as chosen:

- **One idea per picture.** A single subject, a strong line, a quiet third for type. A face looking into the frame,
  hands doing the one thing the product helps with.
- **One light.** Pictures in a set share a time of day and a colour of light, or are ordered by it on purpose.
- **One grade, one card language.** A set graded together is a shoot; a set left as downloaded is a mood board.
- **Variety inside the set.** A river or a wall mixes close-ups and wider frames, ages, places and colours of
  clothing, so it reads as many people, not one shoot repeated; never the same picture twice in view.
- **A cast that varies across beats.** One muted shoot of one couple in every beat reads as a single stock series.
  Find 2-3 shoots with their own people, places and light, styled with intent (saturated where the film allows), and
  mix photo, the product's UI and footage in a stream. `castPlan(beats, pictures)` (`src/kit/real.ts`) deals each beat
  its own pictures: no shoot or person in more than 2 beats, never the shoot of the beat before. Name a shoot's files
  `<shoot>-<moment>` (`assets.mjs get --name`) and declare who is in them in `public/cast.json`
  (`{"maya-*": {"shoot": "cafe", "people": ["maya"]}}`, `"hero": true` for a film's one protagonist): `data-check.mjs`
  fails the same photograph, or a declared shoot or person, in more than half the beats (2 at least; `--max-beats`),
  and warns on a shoot it reads from the file names.
- **Real resolution.** 2400 px stills for a full frame, 1200 px is plenty for a card; 1080p footage.

What makes it stock, and is refused: handshakes, people pointing at screens or smiling into the lens with nothing
to do, glowing brains and circuit boards, generic city timelapses, sunsets as decoration, a subject stranded in one
corner, mixed grades, and anything with a readable brand or sign.

## 7. Footage

- Coverr and Mixkit clips are 24-30 fps, 1080p, 6-45 s; `get --trim` keeps only the seconds used. Prefer 50/60 fps
  footage for slow motion; at 60 fps a 24 fps clip holds each frame 2-3 output frames (declared stepped).
- Footage is drawn with `<Sequence>` around `<OffthreadVideo>` from a closed-form source frame: any frame renders
  the same in any order (`references/remotion-engine.md`). Always muted; the film's sound is the soundtrack.
- In a window (`FootageWindow`) a clip is an object in the frame; full frame (`fx/Footage`) it is the world. Keep
  the camera alive on top of footage (a push or drift), and carry speed across cuts.
- A speed ramp or a freeze on the music's accent belongs to `fx/FootageRamp` (`references/camera.md`).
- **Thumbnails, filmstrips and reels show distinct moments.** A strip of six frames from one locked-off shot is the same
  still six times at thumbnail size. Sample the film's own footage across its shots and clips: `thumbsFrom(clips, n)`
  deals frames round the clips (neighbours never from one clip), `stripMoments(dur, n, { cuts })` spreads one clip's
  frames over its shots; extract each at its time (`ffmpeg -ss <t>`) or draw it live from the clip. `data-check.mjs`
  fails three numbered frames in a row that are one picture.

## 8. Works and archives as the world

Open-access collections are the richest no-credit material there is: paintings, prints, maps and old photographs at
3000-6000 px, with real surface (brush, paper grain, halftone) that no code draws. Search them with `--kind art`
(the Met, the Art Institute of Chicago) and on Wikimedia Commons for archive photographs. The world is the
collection (one family of works graded together); the name as a window (`TypeMask` with a `Montage` fill); the loupe
(`Lens`); shaped windows that open on archive photographs on the beat. A recognisable modern brand or sign in an
archive photograph is cropped out.

## 9. The imagery directions

`assets/directions/imagery.json` holds nine imagery-led directions in the deck's schema, dealt with `--have photos`
or `footage`: the campaign (a word cut out of the world), cut to the score, the product in its place, the material,
the collage, two worlds, then and now, one long photograph, and the collection. Each carries an `assets` block (what
to list from the subject, the queries, how many pictures, the grade, what to refuse). Even in an imagery-led film
the script leads: one clean line at a time in the film's one text voice, the pictures between them.

## 10. Checks

- `assets.mjs check` on the graded set (neutral share, banned colour regions outside natural tones: skin, hair,
  wood, straw, grass and foliage, pale cool cloth, navy and a dusk sky; saturated frames, accent share, the set's
  match, readable text and logos). A set that tells a day from morning to night takes `--arc`: each picture is
  matched with the pictures of its own light, not with the whole set's lightness.
- **The pictures leave the look audit's palette checks on their own.** The kit's photos and footage carry
  `data-imagery`, `layout-audit.sh` logs their boxes on every audited frame, and `look-audit.py --layout` leaves those
  pixels out, as it does the marks. For a picture drawn without the kit: `look-audit.py --imagery x,y,w,h` (a fixed box) or `--imagery-track
  out/imagery.json` (boxes that move) tells it where photographs are, so their natural colour is not read as designed
  colour and their soft, defocused edges are not read as haze or filler shapes. `pictureTrack(from, to, boxesAt)`
  writes the track from the same state the film draws (`riverBoxes` for an ArcRiver, the masonry boxes for a wall,
  a card's own box), e.g. in a one-off `npx tsx -e` that prints `JSON.stringify(pictureTrack(...))` to
  `out/imagery.json`.
- **The material holds up when paused.** `node scripts/data-check.mjs src` fails a strip of one picture
  (`thumb-repeat`), one photograph in more than half the beats (`photo-repeat`), a shoot or person declared in
  `public/cast.json` in more than half the beats (`cast-repeat`), and the product data a still reveals: weekdays that are not the calendar's, counts that
  are not their lists, a waveform built from the bar index (`references/product-ui.md` §2.1).
- The picture floor (`references/checks.md`) counts real imagery toward edges and colour mass, and graphic effects
  just as well; grey cards and glyphless bars where content should be fail it (skeleton bars), and a drawn figure,
  landscape or product where a photo belongs fails the review (`references/taste-and-slop.md` D18).
- **The stand-ins fail by script too.** `lint-film.mjs` `drawn-figure` (the kit's drawn portraits above 72 px, its drawn
  still life, a component named for a figure that draws SVG) and the layout audit's `drawn-figure` (every figure the
  kit draws, `data-drawn`, larger than a small UI avatar, in the render). The detail pass (`scripts/detail-pair.py`,
  `references/review-loop.md` §2) then sets each picture beat beside its reference at 2x: crop, card language, depth
  blur, smear, lean, grade.
