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

- **Fast path:** `<Brand name="figma" />` draws the mark from Simple Icons, which can lag a brand's redesign (it may still
  carry a retired mark) and draws every mark in ONE colour: a multicolour mark (Figma, Slack, Google's apps, Microsoft's)
  needs its official file. For any brand `node scripts/logos.mjs search <name>` shows the current one, and
  `node scripts/logos.mjs check` flags retired marks before the final. The mark from Simple Icons (path data CC0; trademarks belong to their owners)
  in its own colour. `<BrandTile name="figma" />` puts it on an app-icon tile. Names are Simple Icons slugs
  (`github`, `linear`, `notion`, `gmail`, `visualstudiocode` is not one: fetch `visual studio code` with logos.mjs, `googlecalendar`, `claude`, `anthropic`, `figma`, `stripe`, `vercel`, `supabase`,
  `discord`, `zoom`, `jira`, `asana`, `dropbox`, `spotify`, `x`, `youtube`, `perplexity`, `huggingface`, `cursor`, ...).
- **Official files:** some marks are missing from Simple Icons (their owners asked for removal: OpenAI/ChatGPT, Slack,
  Microsoft and its products, AWS, others) and some brands redrew their marks recently. Use
  `node scripts/logos.mjs search <name>` then `node scripts/logos.mjs get <name> --film .`: it takes the newest official mark
  from open collections (or the brand's own press-kit file with `--file`), writes it to `public/logos/`, and records source,
  licence and trademark owner in `public/logos/logos.json`. Then `<Brand name="openai" file="logos/openai.svg" />`.
  `node scripts/logos.mjs check` flags retired marks.
- **No official mark?** Some products have none in any collection (an OS feature, a sub-app like a health or wallet
  app). Use the parent brand's mark with the product's name set in type beside it; never draw the icon.
- **Use marks nominatively:** to show that the product works with them. Never imply an endorsement the user did not state.
- **Presentation:** marks keep their proportions and colours; on a dark ground use the brand's own light version (or
  `color="#fff"` for a mono mark if the brand allows it). One presentation per film (tiles in a row, chips in a line, a wall).

## 2. Interface icons

`<Icon name="Search" />` from Lucide (ISC licence, no attribution needed): https://lucide.dev/icons. Use them inside UI
(rows, buttons, chips, toolbars) at 1.5-2.5 px stroke at film size. Never emoji as icons in product UI.

## 3. Fonts

Bundled (SIL OFL, local, no network): Inter, Geist, Geist Mono, Instrument Serif. More from Fontsource
(`npm install @fontsource/<family>`; nearly all OFL). A brand font the user supplies goes in `public/fonts/` with an
`@font-face` rule. One display face per film; Inter or the brand's UI face for product screens; a mono for labels.

## 4. Photos and footage

Never generated images. In order of preference:
1. The user's screenshots, product photos, team photos, customer footage.
2. Code: UI, type, geometry and light carry most launch films.
3. When the product's input is human (someone speaking, writing, cooking, paying), one licensed clip or photo of a real
   person doing it makes the film human: `node scripts/assets.mjs recipe "<the input>"` finds clips for 40 common inputs
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

## 5. Sound effects

`scripts/sfx-catalogue.json` lists recorded effects whose licence allows commercial films without credit (the Mixkit Sound
Effects Free License, https://mixkit.co/license/#sfxFree), each judged by ear on the job it does in a film and measured
(onset, peak, loudness) so it lands on the frame.

```
node scripts/sfx.mjs roles                  # click.hard click.soft key typing pop whoosh.short whoosh.medium whoosh.long
                                            # reverse riser sub impact lockup notification note paper shutter tick glass
node scripts/sfx.mjs list whoosh.short      # strong and plausible picks first
node scripts/sfx.mjs get mixkit-168 mixkit-2568 ...   # -> public/sfx/*.wav + src/sfx.ts
node scripts/sfx.mjs pick pop 2 --seed <film>         # a different pick per film
```

Other sources, if the catalogue lacks the sound you need (read the licence page and record it):
- Freesound (https://freesound.org): CC0 is free to use; CC BY needs the credit; never CC BY-NC in a commercial film.
- Pixabay sound effects (https://pixabay.com/service/license-summary/): commercial use, no credit; the file may not be
  redistributed on its own, so never commit it.
- Kenney audio packs (https://kenney.nl/assets, CC0) for UI clicks and pops.
Never rip a sound from a game, an operating system or a brand (notification tones of a known device, a game's UI sounds).

## 6. Music

A launch film needs a licensed bed with a clear pulse (95-128 BPM for most products), modern production, no vocals unless
the brief wants them, and a moment where it "arrives" that you can line up with the first idea.

`scripts/music-shortlist.json` lists licensed tracks that can be fetched by script, each measured: tempo, the second the beat
is established (start the bed there), a 4-second energy profile, mood and what it suits.
```
node scripts/sfx.mjs shortlist --energy 3 --bpm 100-125     # filter by --vibe, --energy, --bpm, --for "dev tool"
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
grid (move a cut a frame or two, or let a sound carry it). Choose the track for the film's world: a paper-and-serif film and
a dark-stage film should not share a bed. `frames.mjs check` fails a film whose music runs out before it ends.
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
node scripts/sfx.mjs credits > CREDITS.md     # sounds and music with their pages and licences
```
then add the marks (`public/logos/logos.json`: name, source, licence, owner), fonts (name, OFL) and any photo or footage
(page, author, licence). Deliver it with the film.
