# Assets: marks, icons, fonts, pictures, footage, sound and music

Everything a film shows or plays is either code, the user's own material, or a file whose licence you have read and
recorded. Keep a `CREDITS.md` in the film folder from the first fetched file.

## Contents
1. Company marks (logos)
2. Interface icons
3. Fonts
4. Photos and footage
5. Sound effects
6. Music
7. CREDITS.md

---

## 1. Company marks

A film about a product that works with other products shows them as they are: the mail app's own mark, the code host's
own mark, the model's own mark. Never redraw one, never stand a generic envelope or spark in for a real logo.

- **The default is the real mark.** `<Brand name="gmail" />` draws the current official file in its own colours from
  `public/logos/` (the index `src/logos.ts` finds it by any of its names: `googlecalendar`, `google-calendar` and
  `Google Calendar` are one mark). The kit ships the 50 or so marks films show most (Google's 2026 Workspace icons, the
  2025 Microsoft 365 icons, Figma, Slack, Linear, Notion, GitHub, the AI labs, the social apps ...), each compared with the
  brand's own current logo; `public/logos/CREDITS.md` lists every one with its source, licence and owner.
- **Any other brand:** `node scripts/logos.mjs get <name...> --film .` (several at once: `get loom miro canva`). It takes the
  newest full-colour file from open collections, in this order: SVG Logos (gilbarbara/logos, CC0, full colour, kept
  current), svgl (MIT, light and dark files), Wikimedia Commons (public domain or CC0 files only), and Simple Icons only as
  the last resort (CC0, one colour). The brand table (`scripts/logo-brands.json`) names each listed brand's current mark and
  the marks and colours it retired, so a retired file is never taken. Source, licence and owner go into
  `public/logos/logos.json` and `CREDITS.md`; nothing else to pass: `<Brand name="loom" />` then draws it.
- **Before the final:** `node scripts/logos.mjs verify` lists every mark the film's code shows that is still a one-colour
  fallback or missing (exit 1); `node scripts/logos.mjs check` flags retired marks, unverified brands and drawn stand-ins.
- **When a mark is missing:**
  - no file in any collection, or only a retired one: download the brand's own SVG from its brand, press or site page and
    run `get <name> --file <svg> --from <where>`; never redraw it, never recolour another file.
  - no vector anywhere (Zoom's "zm" app icon): show the brand's wordmark, which the brand does publish.
  - no mark at all (an OS feature, a sub-app like a health or wallet app): the parent brand's mark with the product's name
    set in type beside it; never draw the icon.
- **Colour and ground:** a full-colour mark always draws in its own colours, whatever `color` says. A mark drawn in black
  (GitHub, Notion, X, Vercel, Apple, OpenAI, Linear) takes its white file on a dark ground: `on="dark"`, or
  `color="white"`. Only a name with no file falls back to Simple Icons' one-colour glyph: black or white by ground for a
  neutral mark, the brand's own hex otherwise; never an invented tint.
- **Tiles:** `<BrandTile name="slack" />` shows a mark the way its app icon looks: a mark that is its own tile (Jira,
  Trello, Stripe, Zapier, Instagram) fills it; every other mark sits on a white tile (Gmail, Calendar, Slack, Figma). Never
  invent a coloured tile for a product that has none.
- **Use marks nominatively:** a logo is its owner's trademark whatever the licence of the file. Show a product's own mark
  only to name that product (what it works with, imports from, runs on), unaltered, and never imply an endorsement or
  partnership the user did not state. One presentation per film (tiles in a row, chips in a line, a wall).

## 2. Interface icons

`<Icon name="Search" />` from Lucide (ISC licence, no attribution needed): https://lucide.dev/icons. Use them inside UI
(rows, buttons, chips, toolbars) at 1.5-2.5 px stroke at film size. Never emoji as icons in product UI.

## 3. Fonts

Bundled (SIL OFL, local, no network): Inter (with optical sizing), Geist, Geist Mono, Newsreader (the serif, with
optical sizing), Caveat. More from Fontsource (`npm install @fontsource/<family>`; nearly all OFL). A brand font the user
supplies goes in `public/fonts/` with an `@font-face` rule. One sans voice per film (Inter unless the brand has its own);
Inter or the brand's UI face for product screens; a serif only when it is the brand's voice or wordmark; mono for code
and data only, never for labels ([type.md](type.md)).

## 4. Photos and footage

Never generated images. In order of preference:
1. The user's screenshots, product photos, team photos, customer footage.
2. Code: UI, type, geometry and light carry most launch films.
3. When the product's input is human (someone speaking, writing, cooking, paying), a licensed clip or photo of a real
   person doing it may make the film human, but only one that passes the picture bar ([imagery.md](motion/imagery.md)):
   no picture beats a stock wallpaper, and a weak one is left out. `node scripts/assets.mjs recipe "<the input>"` finds clips for 40 common inputs
   (`assets.mjs search` and `get` for anything else; with Python, numpy and opencv it also screens thumbnails for people
   and text; without them it says so and still works). Keyless open collections are thin for everyday subjects (food,
   interiors): if nothing fits, build the subject in code (words on shelves, objects as type) rather than force a poor
   picture. Resize with `assets.mjs grade --width 1600` (`get --width` does not shrink every source). Check the framing fits your use (a webcam tile needs someone facing the lens).
4. Licensed stock, downloaded by hand or script and recorded:
   - Unsplash (https://unsplash.com/license): free for commercial use, no attribution required (credit appreciated); not
     for building a competing service, not to sell unaltered copies.
   - Pexels photos and videos (https://www.pexels.com/license/): free for commercial use, no attribution required; do not
     imply endorsement by people shown; not to sell unaltered copies.
   - Mixkit video (https://mixkit.co/license/#videoFree): free stock video for commercial projects.
   Grade every picture into the film's world (one look across all of them), show it with intent (bare cards on paper, a
   window in type, a parallax plate), never as wallpaper behind text.

**Pictures are the film's world, not decoration.** Choose them before the beats are written, from what the story needs:
the same people and the same place through the whole film, one shoot where you can (a collection's photographer often
has a series of one family or one studio). Check every picture's people against the cast: never a different adult or
child standing in for a named character, never a second kitchen for the first. A film uses a photograph only when it
passes the picture bar; when one does and is the world, it gets its own full-frame beats, never as a wallpaper under a
white card or plate (a card or a lockup plate over a photograph is never right). Prints inside UI (an avatar, an
attachment) are the product's content. Credit
every one in `CREDITS.md` (page, author, licence), and write a statement over a busy picture by the
[recipe in type.md](type.md#over-a-busy-photograph).

**The payoff picture is the film's own.** It shows the film's person (the face seen, or a detail seen earlier in the
film) and the product's own object: composite the product's label, tape or screen onto the object when the photograph
lacks it. Never another brand's packaging, sticker or mark in the picture, never a person cut off at the neck by the
crop unless the crop is the idea (an anonymous torso is a stock photo, not a payoff). Check every picture at full size
(`frames.mjs still --frame N --full`) for marks, labels and text that are not the film's, and crop, retouch or replace
the picture when one shows. Every picture shows what its words claim: a dish after the steps contains what the steps
named, a room shown as "after" has the change in it; a picture that contradicts its caption is replaced, not captioned
around.

## 5. Sound effects

`scripts/sfx-catalogue.json` lists recorded effects whose licence allows commercial films without credit (the Mixkit Sound
Effects Free License, https://mixkit.co/license/#sfxFree, and Kenney's CC0 packs), each judged by ear on the job it does
in a film and measured (onset, peak, loudness, decay, pitch) so it lands on the frame. It offers a dry palette only: clicks,
ticks, keys, paper and cloth, muted taps and a cloth swish. Bells, chimes, glass, coins, notification tones,
bubbles, swells, risers, sub booms and trailer hits are in its `rejected` list with the measure that failed, and `get`
refuses them ([sound-design.md](sound-design.md#3-hard-rules)).

```
node scripts/sfx.mjs roles                  # click.hard click.soft key typing paper tick impact shutter whoosh.short whoosh.medium
node scripts/sfx.mjs list click.soft        # strong and plausible picks first
node scripts/sfx.mjs get kenney-interface-click_001 mixkit-2384 ...   # -> public/sfx/* + src/sfx.ts
node scripts/sfx.mjs pick paper 2 --seed <film>       # a different pick per film
```

Other sources, if the catalogue lacks the sound you need (read the licence page and record it):
- Freesound (https://freesound.org): CC0 is free to use; CC BY needs the credit; never CC BY-NC in a commercial film.
- Pixabay sound effects (https://pixabay.com/service/license-summary/): commercial use, no credit; the file may not be
  redistributed on its own, so never commit it.
- Kenney audio packs (https://kenney.nl/assets, CC0) for UI clicks and foley; many of their interface sounds are
  synthesized beeps: measure and listen before you add one.
Whatever the source, the rules of [sound-design.md](sound-design.md#3-hard-rules) hold: nothing pitched, ringing or swelling.
Never rip a sound from a game, an operating system or a brand (notification tones of a known device, a game's UI sounds).

## 6. Music

A launch film needs a licensed bed with a clear pulse (95-128 BPM for most products), modern production, no vocals unless
the brief wants them, and a moment where it "arrives" that you can line up with the first idea.

`scripts/music-shortlist.json` lists licensed tracks that can be fetched by script, each measured: tempo, the second the beat
is established (start the bed there), a 4-second energy profile, mood and what it suits.
```
node scripts/sfx.mjs shortlist --mood "warm quiet family" --energy 2   # ordered by fit; filter by --vibe, --energy, --bpm, --for
node scripts/sfx.mjs music mixkit-tech-house-vibes-130       # -> public/music/bed.mp3 + its licence and credit
node scripts/sfx.mjs music <url> --as bed --page <page you read> --licence cc-by-4.0 --credit "..."   # any other track
```
Moods in the shortlist were tagged from catalogue data. `sfx.mjs music` measures the tempo and the first beat from the
fetched file itself and prints them (use that number for `beats()`, not a rounded one: a grid 1 % off drifts half a beat in
25 s). Then place the track against the picture:
```
node scripts/sfx.mjs analyze public/music/bed.mp3                                  # its sections: the quiet stretch, the lift
node scripts/sfx.mjs fit public/music/bed.mp3 --hit 112 --len 530 --cuts 50,96,187   # the start for this film
```
`fit` lists the starts that put the film's main hit (the reveal, the flood, the name) on a beat, best first: the music lifts
there, there is music under the whole film, the opening is not silence. With `--cuts` it shows which cuts sit off the beat
grid (move a cut a frame or two, or let a sound carry it). For a bed that enters late (`<Music enterAt={f}>`), pass
`--enter f`: the track plays from `startFrom` at that frame, and the printed grid is in the film's frames. Choose the track for the film's world: an editorial paper film and
a dark-stage film should not share a bed. `shortlist --mood "<the film's world in words>"` orders the tracks by fit to
it, ties in an order of this project's own, and puts the worked examples' beds last: never reuse a worked example's
track or the track of your last film. `frames.mjs check` fails a film whose music runs out before it ends.
Licences that work for a published launch film:
- Mixkit Stock Music Free License (https://mixkit.co/license/#musicFree): web, social, ads; no credit needed; never
  redistribute the file or register it with a Content ID service.
- CC BY 4.0 (e.g. Kevin MacLeod / incompetech.com): free with the credit in the composer's form, in the video description.
- Paid libraries (Artlist, Musicbed, Epidemic Sound, Uppbeat Premium): only if the user holds the subscription; their
  licence covers what is published while it is active.
Never synthesized or AI-generated music. Avoid tracks so popular viewers know them.

Cut the music to the film: `startFrom` from `fit` (or at a bar where the beat is already established), cues on its
downbeats where you can (at 120 BPM a beat is 15 frames at 30 fps), a breath (`breaths`) before the reveal, and let it ring out under the end
card rather than stopping dead.

## 7. CREDITS.md

```
node scripts/sfx.mjs credits > CREDITS.md     # sounds, music, pictures and every mark the film draws, with pages and licences
```
then add the fonts (name, OFL) and any photo or footage the script did not fetch (page, author, licence). Deliver it with
the film.
