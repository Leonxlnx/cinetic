# The motion library: the default vocabulary

The library is a set of finished animations, measured and built to the bar, that a film takes whole and adapts: type
moves, turns, finishing effects, camera moves, product UI, host screens, objects, grounds and design presets. Pick from
it first; hand-build a move only for what it
lacks, and then build it to the same standard (the motion references in `motion/*.md` have the recipes).

## The categories

Each category has its own folder of `src/kit/library/` (one file a piece, named after it), its own catalogue file
`src/kit/library/catalog/<category>.ts` (one entry a piece: what it does, what it acts on, its mood, its length, where
its reel plays it; `catalog/index.ts` merges them), its own reel (`src/films/library/Reel<Name>.tsx`, a list of
segments) and its own section file with every piece's props, numbers and cautions. So a category's pieces are added
without touching another category's files.

| Category | Folder, catalogue, reel | What is in it | Reference |
|---|---|---|---|
| `type` | `type/`, `catalog/type.ts`, `library-type` | words performed as events: rolls, tracking, words made of tiles or dots, a dive into a letter, words that bounce, stack or sweep, a line typed into a host, clean exits | [library-type.md](library-type.md) |
| `turn` | `turns/`, `catalog/turn.ts`, `library-turns` | joins that carry a real object or picture through the cut and cover the whole frame: a dot reveal, a block burst, a grow iris, a dive into a card, a whip, a shove, a shape match, a glitch cut, a window opening out of its button | [library-turns.md](library-turns.md) |
| `fx` | `fx/`, `catalog/fx.ts`, `library-fx` | finishing layers: a light sweep, bloom on a light source, tracking marks, a dot screen, a channel split on a landing, a morphing box | [library-fx.md](library-fx.md) |
| `camera` | `camera/`, `catalog/camera.ts`, `library-camera` | camera moves as pieces: pushes, pans, dives, parallax, focus pulls | [library-camera.md](library-camera.md) |
| `ui` | `ui/`, `catalog/ui.ts`, `library-ui` | interface pieces designed like a shipped product (notices that pile up, a card fan, a row that opens, a palette that travels to one row, a board drag, a task run, a prompt answered, a chat, a settings card, a crafted pointer) and the design bar every UI in a film meets | [library-ui.md](library-ui.md) |
| `host` | `hosts/`, `catalog/host.ts`, `library-hosts` | faithful rebuilds of the third-party screens films show most (a GitHub pull request, a GitHub Projects column, a VS Code window in both themes) and a design-canvas app chrome | [library-hosts.md](library-hosts.md) |
| `object` | `objects/`, `catalog/object.ts`, `library-objects` | objects and logos: shapes, icons, pictures and marks that move or are built | [library-objects.md](library-objects.md) |
| `ground` | `grounds/`, `catalog/ground.ts`, `library-grounds` | designed backgrounds and how they move | [library-grounds.md](library-grounds.md) |
| `design` | `designs/`, `catalog/design.ts`, `library-designs` | design presets: named looks as typed tokens (palette, grounds, type scale and weights, radii, shadow, stroke, texture) a film spreads into its tokens, each shown on a `DesignSwatch` | [library-designs.md](library-designs.md) |

## Find a piece

`node scripts/frames.mjs library` lists the pieces as a table (name, category, purpose, length, what it looks like).
Filter by `--category` (the first column above), `--purpose` (`enter`, `exit`, `join`, `emphasis`, `idle`, `loop`,
`build`), `--subject` (what it acts on: `line`, `word`, `letter`, `number`, `card`, `list`, `window`, `phone`, `photo`,
`frame`, `icon`, `logo`, `button`, `pointer`, `control`, `page`, `code`, `canvas`, `shape`, `scene`, `layer`, `mark`,
`device`, `pattern`, `texture`, `palette`, `type`) and `--mood` (`calm`, `bold`, `playful`, `technical`, `editorial`); a
filter takes several values joined by commas, `--json` prints the entries.

```
node scripts/frames.mjs library --category turn --mood calm       # a quiet join
node scripts/frames.mjs library --subject card --purpose enter    # a card that arrives
node scripts/frames.mjs library --category type --purpose exit    # a line that leaves cleanly
```

`library --show DiveInto` prints one piece in full: when to reach for it, its caution, its import line, its props
(required and optional, read from the types, so a prop name is never a guess), its file, its section and its reel
frames. `library --strip DiveInto` renders its frames from its reel as one still (16 frames).

## How to use it

1. **See it first.** `library --strip <Name>` for one piece; each category's reel plays every piece with its name:
   `node scripts/frames.mjs render --film library-turns` (also `library-type`, `library-fx`, `library-camera`,
   `library-ui`, `library-hosts`, `library-objects`, `library-grounds`, `library-designs`), or `sheet --film library-ui` for a quick look. A project made by `new-film.mjs` has the reels
   registered.
2. **Pick by the story; the library is the default.** In `BEATS.md`'s Devices block, name the library piece behind each
   join, each type move and each UI action (`- join 3: DiveInto into the rota card (carry the subject)`), or write why
   none fits (`- join 5: hand-built, the receipt tears along its own perforation`). A piece earns its place by what the
   story needs at that moment, never because it is in the reel. `frames.mjs check` prints how many catalogued pieces
   the film's source imports and how often each is placed, a LOOK line when it imports none and one when a type or turn
   piece is placed more than twice.
3. **Adapt, do not paste.** Every piece is deterministic by frame and takes its content, colours, sizes and timing as
   props: give it this film's real content (names, data, the product's own surfaces), its palette and its type voice,
   and set its frames from the film's timeline `T`. Turns and UI pieces also take `speed`.
4. **Vary what recurs.** One turn of a kind in a film; a move appears at most twice, and differently the second time
   ([devices](film-grammar.md#devices)).
5. **Check it in place.** A library piece in a film is judged like anything else: strips of its frames, the join test
   ([film-grammar.md](film-grammar.md#the-join-test)), the polish loop ([taste.md](taste.md#5-the-polish-loop)).

Import from the kit like everything else (`import { DiveInto, RowExpand, TrackedType } from '../../kit';`).

## Naming rules

- **A piece** is one exported component named for what it does (`DiveInto`, `NoticePile`, `RollType`), in a file of the
  same name in its category's folder, with one catalogue entry. A small family that only makes sense together may share
  a file; each exported component in it is a piece with its own entry.
- **Helpers** that go with a piece live in its file: lower camel case for functions (`dotRevealEnd`, `pointerAt`),
  upper camel case for types (`TurnBox`, `MailData`). **Parts** (static building blocks: surfaces, pills, avatars, the
  notification card) and helpers two pieces share live in `<folder>/_shared.tsx`; they have no catalogue entry. What
  several categories share (the SVG filters, a move's progress) lives in `library/_shared.tsx`.
- **Props** have the same names everywhere: `at` the first frame, `dur` the length in frames or `speed` (1 the
  measured timing), `seed` for anything random (never `Math.random`), `color` / `ink` / `ground` for the piece's colour,
  the colour on it and the colour behind it, `x` and `y` the centre (by default the frame's centre), `size` the text
  size in px. Older names stay, with the common name beside them: `Pointer` and `GitHubPullRequest` take `at` beside
  `start`, `BlockBurst` takes `color` beside `edge`, `GrowIris` beside `rim`, `WindowOpen` beside `surface`.
- **Any frame size.** A piece reads the frame's size from `useVideoConfig()`, never 1920 x 1080 written in, so it lays
  out right in a vertical film, a sheet and a join image.
- **Every file opens with the same header:** the piece, its category and purpose, what it looks like, its key numbers
  and its caution.

## Pick by job

Start from what the beat must do, not from a reel. Find the job below, then the cell: each names a few pieces and how
they differ; `library --show <Name>` gives the rest, `library --strip <Name>` shows it. Two pieces from one cell in one
film is usually one too many. A caution says how sure a piece is ("checked on stills only", "compared once only",
"checked at half size only"): strip such a piece at full size in place before you rely on it. No piece has yet been
checked in a vertical frame; strip it in the film's own format.

### Opening a film

| Opens on | Pieces |
|---|---|
| the product | `PullTilt` (close on a card's corner, pulls back and swings: the surface as an object); `DotCaret` (a dot becomes the caret of a search field: the moment before a request); `PhoneDrop` (a phone drops in with a notice: a mobile product); `HandleGather` (a name picked out with selection handles: a design or agent tool); `HostType` (one statement typed while the product cuts round it) |
| a statement | `InkLine` (word by word on the voice, calm); `WeightLine` (word by word with weight, bold); `CornerLine` (one framed line, the film's thesis); `CaretFollow` (the one prompt, typed giant); `GiantTruck` (a giant line already passing after a cut) |
| an object | `WireTetra` (abstract: an idea taking form on near-black); `MarkDolly` (extreme close on the mark as a solid, pulling back); `BlobMerge` (two soft blobs become one: a round mark); `CubeSplit` (a cube splits into a pixel mark: blocks, data); `SquareTunnel` (out of a square on screen into depth) |
| a picture | `TilePop` (many photos at once, two-tone to colour); `BentoFly` (tiles brake into a bento grid on a cut); `PhotoPlate` (one photograph as the world, outlines drawn on it); `SplitWord` (a word split round a picture); `RackFocus` (the picture arrives soft and snaps sharp) |

### A statement that must land

| Mood | Pieces |
|---|---|
| calm | `RiseLine` (the clean default, word by word from a mask); `InkLine` (words tinted then inked on the voice); `BlurSweep` (focuses in left to right: spoken, slow, once); `GradientPass` (a colour front lights the line: a closing line) |
| bold | `WeightLine` (big blurred words dropping to size); `ScaleJump` (one word hits giant before its sentence); `BarStack` (three lines, one reversed on a bar); `TileWord` (the turn of the argument, full width); `LightWord` (a year or a number on a wall of lights, once) |
| playful | `DropWord` (heavy lowercase letters bounce in with characters); `ArcToss` (one word tossed on curves); `StepWhip` (words jump in stepped on 12 fps); `FaceCycle` (a pixel face, a serif, then the sans); `GatherLine` (scattered words gather into the line) |
| technical | `ScrambleType` (wrong glyphs lock into the word); `DotWord` (dot-matrix LEDs, typed); `RandomFill` (letters in shuffled order); `TrackedType` (each letter in a tracking box); `TokenBlocks` (code as blocks becoming words) |
| editorial | `CornerLine` (framed by four corner marks); `OutlineFill` (a title drawn as a contour, then filled); `GiantTruck` (the camera trucks along a giant cropped line); `SplitWord` (a word split round a picture); `LightStreak` (a caption born from a streak over footage) |

### Words that arrive, leave, change or are marked

| Job | Pieces |
|---|---|
| arrive | `RiseLine` (the default); `TypeHead` (typed, a coloured head running with the caret); `WordTicker` (a running ticker keeping the last words); `GatherLine` (pieces gather into the line); `HingeWord` (one word flips up in a slot) |
| leave | `CutAway` (whole words cut away from one end); `SlideOff` (slides off smearing, into a shot moving the same way); `BlockOut` (a block of the line's width covers it or snaps shut); `ClipExit` (an object crosses and clips the letters); `EatSquares` (a name eaten into a row of squares that lead on) |
| change in place | `LetterRewrite` (letters go, the next word rises in); `HingeWord` (tips back, the next flips up); `ScrambleType` (with brackets, rolls to the next word); `StampHop` (a turn: a box hops along the line, new words under it) |
| marked | `MarkPhrase` (a highlight or an underline behind a phrase); `BlobKnock` (a blurred blob under a bold line, letters turn white); `GlyphSheen` (light through a huge payoff word); `TagSlap` (label tags slap on a word); `PenMarks` (a hand loop, ring or arrow at one thing) |
| pictures inside the line | `InlineChip` (one picture chip opens in the sentence); `PartStack` (a cluster of small pictures in a slot); `DealtStack` (photo cards dealt into the gap, fanning up); `SlotSwap` (one card cutting faster and faster, new sizes); `ChipBloom` (a turn: the chip opens to the next scene) |

### A join, by what it carries

The join classes are in [film-grammar.md](film-grammar.md#joins); every turn's `use` starts with what it carries.

| Carries | Pieces |
|---|---|
| the object | `DiveInto` (the camera into a card, window or picture); `FaceDive` (through one face of a diagram that holds the next scene); `ChipBloom` (a picture chip in a sentence opens to the frame); `MorphBox` (one surface changes shape: pill, card, window); `DotReveal` (the next scene swells as dots out of a small object) |
| the press (cause and effect) | `WindowOpen` (the pressed button grows into its window); `GrowIris` (a button or card grows into the scene it promises); `SendLaunch` (send, then the app window leads in on a dark cut); `BlockBurst` (an icon bursts into its world in square cells) |
| the line being read | `DotIris` (opens from the gap between two words); `CrossFall` (the next title lands where the line was read); `StampHop` (only the words change under a hopping box); `StepTear` (the paper tears in steps, a word a step); `PushApart` (the line prises open onto the object) |
| a shape | `ShapeMatch` (the same shape in both scenes travels); `CollapsePill` (a row becomes the pill of the job it starts); `LensIris` (two discs close and open a lens); `SquareTunnel` (a square on screen becomes rings, then the ground); `PlateSqueeze` (a colour field squeezes into the app icon plate) |
| a colour field | `PixelStair` (the next ground arrives as cells in the old picture's tints); `FrameCollapse` (the frame shrinks to a panel on the brand field); `BlockOut` (a block of the line's width covers the frame); `TiltLift` (the next ground floods up behind a rising card); `PixelIris` (a ring of pixels onto a brand scene) |
| the motion | `VelocityCut` (the speed doubles each frame, the next brakes); `WhipGate` (a whip with a two-frame gate, one ground tone); `Shove` (the old scene shoved off in bands); `SlideOff` (a line slides off into a shot moving the same way); `TiltScroll` (a page rushes up into the cut) |
| a held layer | `TileFlood` (the objects stay while the ground floods); `ExposureRamp` (the same world brightens under a moving camera); `FloorTilt` (the ground under a line tilts into a floor); `PullReveal` (the thing stays as the camera pulls back to its world) |
| nothing: a hard cut on the music | `GlitchCut` (the picture breaks for a few frames, once); `Interleave` (old and new alternate on single frames, the old scene's own material); `StampHop` (box hops on the beats); `BackdropSwap` (the backdrop hard-cuts every five frames under a held phone) |

### Showing the product at work

| Action | Pieces |
|---|---|
| typing | `TypeHead` (typed with a coloured head); `CaretCam` (cuts into the bar and follows the caret); `HostType` (one statement typed across many hosts); `TokenBlocks` (code grown as blocks); `VSCodeWindow` (code written in a real editor) |
| sending | `PromptAnswer` (sent, the text travels to its bubble, an answer grows); `SendLaunch` (the send launches the next window); `ChatThread` (a conversation in its window); `PhoneDrop` (a reply sent on a phone); `RingBurst` (the one press, a ring of dots) |
| a list | `PickList` (a palette travels to one row); `TaskRun` (rows with a spinner closing to a check); `RowCool` (a log whose verbs cool to ink); `FeedRush` (a feed rushes and lands on one row); `StepList` (a stepped carousel of kinds) |
| a card opening | `RowExpand` (a row opens into its message); `BannerPop` (a banner grows out of its icon); `CardFan` (a card fans out its siblings); `WindowOpen` (a press opens a window); `MorphBox` (a pill becomes a card becomes a window) |
| a state change | `ActionMorph` (a button becomes its progress bar and a check); `ToggleSwitch` (one switch); `ValueSlider` (one value dragged); `SettingsCard` (three controls in turn); `GitHubPullRequest` (checks finish, the merge turns it purple) |
| a pointer action | `Pointer` (the default for any press, drag or hover); `Cursor3D` (an extruded cursor in a soft 3D world); `FileDrop` (carries a file in on a pendulum); `BoardDrag` (lifts a card into another column); `SelectFrame` (drags a selection open on a canvas) |
| many things at once | `NoticePile` (one notice, then more, faster); `CalendarWave` (a week fills in a wave); `SkeletonSweep` (bars swept into a whole answer); `LinkPanel` (sources flow into one panel); `FractalPull` (one process becomes a field of many) |
| the product working | `ShimmerText` (a status line with a passing band); `StepScan` (a grid read row by row); `CellStack` (a loader with character); `DotWave` (a voice or a signal as a level meter) |

### Other products and integrations

| Job | Pieces |
|---|---|
| integrations said in a line | `HubPill` (words append into a pill, a tool tile each); `ChipRoll` (a chip in the sentence rolls through the tools) |
| a whole set of tools | `GhostFill` (ghost slots take colours round a mark); `OrbitRing` (tiles ride an ellipse round the product); `SpiralFan` (cards fan out of one thing on a spiral); `DepthField` (chips at depth gather round a centre); `PillBurst` (too many tools, then all falling: the problem beat) |
| their real screens | `GitHubPullRequest`, `GitHubIssueColumn`, `GitHubIssueCard`, `VSCodeWindow`, `VSCodeNotice` (faithful rebuilds); `CanvasChrome` with `DotCanvas` for the product's own canvas |

### A number

`RollType` (the last digit rolls in whole steps: a year, a version); `StatCount` (glass stat cards counting over a
picture: the cost or the scale); `LightWord` (one number on a wall of lights, loud, once); `FeedRush` (a reading counter
races while a feed rushes); `LinkPanel` (totals count up from the sources).

### Pictures

| Job | Pieces |
|---|---|
| many at once | `TilePop` (tiles pop on, then a ribbon); `BentoFly` (tiles brake into a grid on a cut); `BlockPrint` (a collage prints itself, pastel blocks to photos); `DiagonalStream` (two bands of cards behind a word); `CurlRing` (a row curls into a spinning ring) |
| one picture, treated | `PhotoPlate` (full bleed, outlines drawn on, a re-grade); `SliceShift` (cut into bands that slip down); `GradeResolve` (a gradient map cell by cell: the product reading pictures); `PixelatePortrait` (breaks into a pixel mark); `RackFocus` (soft to sharp) |
| one product, many places or works | `BackdropSwap` (a held phone, the world cutting behind it); `FourUp` (four panels on their own loops); `RowTrack` (the camera tracks a row of works) |

### An object or a 3D solid

| Job | Pieces |
|---|---|
| a solid | `MarkDolly` (the mark as an extruded solid, pulling back); `WireTetra` (a wire tetrahedron filling with glass); `CubeSplit` (an isometric cube into a pixel mark); `Cursor3D` (an extruded cursor); `PullTilt` (a flat card turned in perspective) |
| a flat object that builds | `DotRing` (dots fly into a ring: a connection made); `BlobMerge` (blobs merge into a mark); `CellStack` (cells into a loader); `DotWave` (a dot opens into a level meter) |
| things held round a centre | `OrbitRing` (an ellipse of tiles, front and back); `CardDrift` (cards drifting outward at depths, quiet); `DepthField` (chips arrive, drift and fly out on a push); `SpiralFan` (a deck fanned on a spinning spiral) |

### A camera move

| Move | Pieces |
|---|---|
| in | `DiveInto` (a turn: into the object); `CaretCam` (cuts into the bar, follows the caret); `RackFocus` (a soft arrival snaps sharp under a slow push); `LensBulge` (the section seen through one lens) |
| back | `PullReveal` (one hard pull to the whole); `PullTilt` (pulls back and swings round a card); `MarkDolly` (off the solid mark); `PlanetPull` (a grid floor into a planet); `FractalPull` (one grid into a field of many) |
| along | `RowTrack` (sideways along a row, slowing); `TiltScroll` (a tilted page scrolls past); `GiantTruck` (along a giant line); `CaretFollow` (holds the caret of a giant prompt) |
| into a place | `FloorTilt` (the ground tilts into a floor seen from above); `IsoFloor` (a poster field tilts to isometric); `ExposureRamp` (the dark world turns to the light one) |

### A finishing effect

| Kind | Pieces |
|---|---|
| light | `LightSweep` (a band crosses a surface once); `GlyphSheen` (light through a huge word); `Bloom` (a light source glows on dark); `GlowBars` (a coloured glow through reeded glass behind one thing) |
| impact | `ChromaHit` (channels split two frames on a landing); `RingBurst` (a halftone ring off a press); `BackdropFocus` (the scene softens behind an arrival) |
| a screen or a hand | `DotScreen` (through LED dots or a halftone); `LensBulge` (one barrel lens over a section); `Stepped` (on twos, stop-motion steps, grain); `FrostEdge` (a frosted band over a scrolling column) |
| analytic | `TrackOverlay` (tracking boxes over a moving object); `CornerHunt` (a viewfinder hunting round a phrase); `PenMarks` (a hand mark at one thing); `DriftField` (many small signals gathering) |

### A ground and a look

A design preset is the look; its `groundPiece` is the ground that goes with it and its `moves` the pieces whose motion
fits ([library-designs.md](library-designs.md)).

| Preset | Ground | Type moves and pieces that fit |
|---|---|---|
| `Drafting` | `HairlineGrid` | `MarkPhrase`, `SelectFrame`, `BlockBurst`, `CornerLine` |
| `Blockprint` | `IsoFloor` | `TileWord`, `CubeSplit`, `BlockBurst`, `EatSquares` |
| `Nightdesk` | `TechGrid` | `ScrambleType`, `TrackOverlay`, `GlitchCut`, `RandomFill` |
| `Ember` | `PlanetRim` | `RiseLine`, `Bloom`, `ChipBloom`, `GlowBars` |
| `Gallery` | `PhotoPlate` | `DealtStack`, `GrowIris`, `BlobMerge`, `InlineChip` |
| `Quiet` | `GhostWord` (or a flat stage) | `InkLine`, `ScaleJump`, `PromptAnswer`, `PartStack` |
| `Cream` | `OrbitLines` | `RiseLine`, `Pointer`, `WindowOpen`, `TypeHead` |
| `Folio` | `HairlineGrid` (a fine grid) | `ScaleJump`, `FaceCycle`, `SelectFrame`, `OutlineFill` |
| `Pixel` | `DotLattice` or `HalftoneField` | `DotWord`, `LightWord`, `DotScreen`, `DotReveal` |
| `Sketchbook` | `CuttingMat` | `DealtStack`, `TilePop`, `Stepped`, `PenMarks` |
| `Cobalt` | `CobaltArcs` | `NoticePile`, `FeedRush`, `VelocityCut`, `StatCount` |
| `Frost` | `PhotoPlate` | `PromptAnswer`, `WindowOpen`, `GrowIris`, `BackdropFocus` |
| `Tray` | a flat grey void | `GhostFill`, `TilePop`, `LockupType`, `HingeWord` |
| `Shout` | `HairlineGrid` (a graph grid) | `ScaleJump`, `BarStack`, `PushApart`, `TagSlap` |

### The spectacle

The shot that could never be a slide ([film-grammar.md](film-grammar.md#spectacle)), started on the artefact the film
has carried: `SquareTunnel` (out of a square into rings of depth); `PlanetPull` (a floor becomes a planet under a strong
sky); `SpiralFan` (everything the product reaches bursts out on a spiral); `CurlRing` (pictures curl into a ring that
implodes); `DotDive` (a letter becomes a field of dots the camera flies through).

### The lockup

| Ending on | Pieces |
|---|---|
| a mark, then its name | `LockupType` (the default: the name letter by letter beside the mark); `TumbleLockup` (a coloured app tile, letters tumbling: consumer apps); `ConstructType` (the name typed into a box with handles: tools) |
| a mark that is built | `MarkCondense` (out of its blueprint); `PixelMark` (cells assembling by trial); `CubeSplit` (from a cube); `BlobMerge` (from two blobs); `MarkDolly` (off the solid) |
| a carried field or picture | `PlateSqueeze` (the brand field squeezes into the icon plate); `PixelatePortrait` (a photograph into a pixel mark); `PixelIris` (a ring of pixels onto the wordmark); `PlanetRim` (a planet rim under the name) |

### Near neighbours across categories

Six builders made these categories apart, so some pieces do nearly the same thing. Use one of a pair, never both in a
film, and pick by this:

| Pieces | Which to use when |
|---|---|
| `CaretFollow` (type) / `CaretCam` (camera) | `CaretFollow`: the prompt is the shot: typed giant from the start, the line's start leaving the frame; `CaretCam`: the prompt starts in the product's own small bar and the view must snap back to it |
| `FloorTilt` (camera) / `IsoFloor` (ground) | `FloorTilt`: a line's flat ground becomes a floor in perspective, seen from above and turned; `IsoFloor`: a poster-colour section (`Blockprint`) needs an isometric floor with flat tiles, no perspective |
| `PushApart` (type) / `DotIris` (turn) | `PushApart`: the gap in the line opens onto the product's object, shown whole; `DotIris`: the gap opens onto a whole next scene, the line carried into it |
| `InlineChip` (type) / `ChipBloom` (turn) / `SlotSwap` (object) | `InlineChip`: the chip stays in the sentence; `ChipBloom`: the chip's picture becomes the next scene; `SlotSwap`: the slot's pictures are the proof, cut faster and faster |
| `PartStack` (type) / `DealtStack` (object) | `PartStack`: a loose cluster of small pictures in the line; `DealtStack`: cards dealt one on another, fanning up and pushing the words |
| `TrackedType` (type) / `TrackOverlay` (fx) | `TrackedType`: the word itself is the tracked subject; `TrackOverlay`: the tracking lies over a moving picture or object |
| `DotWord` (type) / `DotScreen` (fx) / `DotLattice` (ground) | `DotWord`: a short word typed in dot matrix; `DotScreen`: any word or picture seen through dots; `DotLattice`: the ground itself is the screen material |
| `FrameCollapse` (turn) / `PlateSqueeze` (object) | `FrameCollapse`: a chapter closes: the frame shrinks to a panel, its line still readable; `PlateSqueeze`: the brand field squeezes into the app icon for the lockup |
| `GrowIris` (turn) / `PixelIris` (object) / `DotIris` (turn) | `GrowIris`: a smooth shape grows from the pressed thing; `PixelIris`: a pixel ring onto a brand scene, digital; `DotIris`: a dot opening by a constant ratio from a point in a line |
| `MorphBox` (fx) / `CollapsePill` (turn) / `ActionMorph` (ui) | `MorphBox`: one surface grows through stages into a window; `CollapsePill`: a row collapses into the pill of its job; `ActionMorph`: a button becomes its own progress bar |
| `DepthField` (camera) / `CardDrift` (object) / `OrbitRing` (object) | `DepthField`: chips arrive, drift and leave on a push; `CardDrift`: a quiet field drifting outward while a line holds; `OrbitRing`: tiles orbit one centre object |
| `PlanetPull` (camera) / `PlanetRim` (ground) | `PlanetPull`: the move: a floor pulls back into a planet; `PlanetRim`: the held ground: a rim rising under a name |
| `StepScan` (fx) / `CellStack` (object) | `StepScan`: a small grid read row by row beside a line; `CellStack`: cells building into a loader under a line |
| `CornerHunt` (fx) / `CornerLine` (type) / `SelectFrame` (ui) / `HandleGather` (ui) | `CornerHunt`: corners hunting round a held phrase; `CornerLine`: corners framing one line as it builds; `SelectFrame`: a selection dragged open on a canvas; `HandleGather`: handles locking round a typed name |
| `RackFocus` (camera) / `BackdropFocus` (fx) | `RackFocus`: the subject itself comes into focus; `BackdropFocus`: the scene behind softens under an arrival |
| `GlowBars` (fx) / `PlanetRim` (ground) | `GlowBars`: a coloured glow behind one held thing; `PlanetRim`: a warm rim under a name on black |
| `TaskRun` (ui) / `RowCool` (ui) | `TaskRun`: steps checked off in a card; `RowCool`: a log whose verbs show each step's kind |
| `BlockOut` (type) / `StampHop` (turn) | `BlockOut`: a block of the line covers the frame or snaps shut: an exit; `StampHop`: a box hops along the line and swaps its words |

## How to add a piece

A builder adds a piece by touching exactly five files, all of its own category, and nothing else (no shared file, no
registry: every category's folder, catalogue file, reel and doc already exist and are registered):

1. **its piece file**, `src/kit/library/<folder>/<Name>.tsx` (a design preset: `designs/<Name>.ts`);
2. **its folder's `index.ts`**, one export line;
3. **its catalogue file**, `src/kit/library/catalog/<category>.ts`, one entry appended;
4. **its reel's segment list**, `SEGMENTS` in `src/films/library/Reel<Name>.tsx`, one segment appended (with its demo
   beside it in the same file);
5. **its doc**, `references/library-<category>.md`: its hand-written section; `node scripts/library-docs.mjs` writes the
   tables in the same file.

The checklist:

- [ ] **Measured from a strip of the source.** `frames.mjs strip <source.mp4> --at <s> --dur 1.5 --fps 30` over the
      move; write its numbers in frames (lengths, distances, curves, sizes) before writing code.
- [ ] **Built** in its piece file, opening with the header, using the common prop names, its size from
      `useVideoConfig()`, seeded randomness; exported from its folder's `index.ts`. Helpers two of the category's pieces
      share go in `<folder>/_shared.tsx` (the category's own file).
- [ ] **Compared side by side** with the source strip (the same frames, the same scale) until they match.
- [ ] **A reel segment** appended to `SEGMENTS`: `{ name: '<Name>', from: <the last segment's from + dur>, dur: <its
      length>, render: <its demo> }`, the demo with real content.
- [ ] **A catalogue entry** appended to `catalog/<category>.ts`: name, category, purpose, subject, mood, frames, a
      summary, when to use it, its caution, and `reel: { film, from, to }` with the segment's frames (`to = from + dur - 1`).
- [ ] **Its join image clean on every frame** when it crosses a cut (`frames.mjs joins --film <reel> --at <frame>`):
      nothing of the old scene left once the new one has landed, nothing a frame late; and its strip clean
      (`library --strip <Name>`).
- [ ] **`node scripts/library-docs.mjs`** writes its section file's tables; add its hand-written section there (props,
      numbers, caution, one usage line in a `tsx` block); `library-docs.mjs --check` (the catalogue, the exports, the
      segments and the docs agree), `library-props.mjs --check` (every prop a usage line names exists) and
      `npx tsc --noEmit` pass.

A new subject, purpose or mood value is the one change outside these files: add it to the type in
`src/kit/library/catalog/types.ts` (the check names it).
