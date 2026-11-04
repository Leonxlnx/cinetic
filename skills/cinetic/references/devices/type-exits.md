# Type exits

Part of the device book: [INDEX](INDEX.md) has the pick-by-job table, the materials and VFX notes and one line for every device.

Copy leaves with intent: at speed into a cut, in a designed order, eaten by an object, or blurred into silence. A plain fade on the main line is the last resort.

[An object sweeps through and eats the text](#an-object-sweeps-through-and-eats-the-text) · [Type and UI leave by accelerating, cut at speed](#type-and-ui-leave-by-accelerating-cut-at-speed) · [Words or items drop out one by one](#words-or-items-drop-out-one-by-one) · [Exit by accelerating shrink or recede](#exit-by-accelerating-shrink-or-recede) · [Words blur out and vanish](#words-blur-out-and-vanish) · [Words float away; the hub stays](#words-float-away-the-hub-stays) · [Letters collapse to the centre and cut](#letters-collapse-to-the-centre-and-cut) · [Short stepped or accelerating fade-out](#short-stepped-or-accelerating-fade-out)

### An object sweeps through and eats the text

`dv-object-eats-text` · signature · energy medium · launch, feature · primitive: Knockout

Something solid erases the words as it passes: a bar of the word's height sweeps across the keyword; a rule grows from the caret and the letters turn the accent and vanish one by one; a button slides over the line and the word disappears from its leading edge; an app icon slides to centre and the text left of it is clipped into its edge. **When:** Replacing a word with a product action; deleting the old way. **Avoid:** Objects that do not belong to the product.

- **Anatomy:** Clip edge = the object's leading edge; letters 3 f apart; partial letters visible at the edge.
- **Timing:** 8-58 f.
- **Sound:** A whoosh tail.
- **Build:** `<Knockout at from to text x y font mode="clip"|"letters"|"reveal" object="bar"|"rule"|(edgeX) => node accent>` (fx/Knockout): one closed-form edge (24 f on E.softIn) clips the text at the object's leading edge; `letters` removes whole letters as the edge passes their centres (about 3 f apart), each lit in the accent just before it goes; `reveal` writes the line on behind the object.

### Type and UI leave by accelerating, cut at speed

`dv-launch-exit` · workhorse · energy medium · any · primitive: Words

A line, a card, a composer or an arrow does not fade out: after a short (sometimes dead-still) hold it drifts away on an ease-in (x1.3-1.5 a frame) and the shot is cut while it accelerates; an arrow leaves along its own direction in 2 frames; a line can blur and fade only in its last 2 f. **When:** Every exit that leads into a cut. **Avoid:** Fades on their own; exits that settle.

- **Anatomy:** Hold 0.4-0.7 s (or 9 f), then 44-100 px of travel on an ease-in, cut at 8-40 px/f; vertical smear on fast exits.
- **Timing:** 12-40 f; the cut on the fastest frame.
- **Sound:** A kick or drum on the cut (often 1 f to 93 ms before).
- **Build:** Words/Chain exit="launch" with exitAt = the cut; declares a velocity seam.

### Words or items drop out one by one

`dv-ordered-drop-out` · workhorse · energy medium · any · primitive: Words

A line or a set leaves in a designed order: words vanish from the end one frame apart while the line accelerates; words are removed one per frame until one remains; the dim line erases word by word while the big type drifts; chips fall off while words drop right to left; words spread apart and fade from the end while the camera zooms; alternate words drop out, then the rest; list lines slide out top first; image tiles cut off one at a time. **When:** Exits that should read as a build in reverse; leaving one word alone. **Avoid:** All at once (that is a cut, not an exit).

- **Anatomy:** 1-4 f between removals; order right-to-left, alternate, top-first or noun-last; optional drift on an ease-in under it.
- **Timing:** 14-30 f.
- **Sound:** Mouse clicks; a deep boom; clicks on the drop-outs.
- **Build:** Words/Chain exit with exitOrder 'rtl' (2 f apart) or 'stagger'; HardStep for one-per-frame removals.
- **Materials and numbers:** Two more constructions: words defocus out one at a time from the line's end (blur 0 -> 8 px with opacity 1 -> 0 over 16 f, staggered 8-12 f) while the word gaps widen 40 %; or a list turns grey, then each line is cropped away from the left by a hard edge, top lines first, so the left edge forms a staircase (24 f) as the lines fade.

### Exit by accelerating shrink or recede

`dv-shrink-exit` · workhorse · energy medium · any · primitive: Words

A held word or text card leaves by scaling down about its centre on an ease-in (60 % of the shrink in the last 10 %), the pane easing back with it, then a hard cut (or one near-white frame); a tagline recedes and fades in 3 frames; the last word shrinks and dims like it is moving away. **When:** Text cards between scenes; the last word of a section. **Avoid:** Shrinking toward zero (stop at 0.85-0.9 and cut).

- **Anatomy:** Scale 1 -> 0.85-0.9 accelerating; dim 30 % on a decrescendo.
- **Timing:** 20-40 f; 14 px/f at the cut.
- **Sound:** A cut on the voice phrase; a boom or reverse on the decrescendo.
- **Build:** Words exit 'launch' on scale (or a camera push-out on E.buildIn) cut on its last frame.

### Words blur out and vanish

`dv-blur-fade-exit` · accent · energy calm · any · primitive: DefocusCut

Text softens and fades together (blur to about 40 px with opacity on one clock), often followed by exactly one empty frame; or the previous words turn grey and blurred and stay behind the new ones as a ghost. **When:** Calm statements leaving; a line that should feel spoken into silence. **Avoid:** Blur on small UI type.

- **Anatomy:** Blur 8-40 px and opacity together, most of the blur late; one empty frame; ghost variant: grey, blurred, held behind.
- **Timing:** 8-18 f; empty 1 f.
- **Sound:** A level swell before the cut; a quiet breath.
- **Build:** `<DefocusCut out empty={1}>`; the ghost as a RackFocus level kept behind the new line.

### Words float away; the hub stays

`dv-hub-stays` · accent · energy calm · launch, feature · primitive: Words

All the words drift up on an ease-in and disappear, while an icon stays exactly in place and gains a rounded container: it becomes the hub of the next scene. **When:** Turning a statement into the product's centre. **Avoid:** Moving the hub.

- **Anatomy:** Words up 1 -> 12 px/f; the icon fixed; the container grows around it.
- **Timing:** 16-22 f.
- **Sound:** An onset as the container appears.
- **Build:** Words exit 'launch' upward; Morph box around the icon.

### Letters collapse to the centre and cut

`dv-tracking-collapse-exit` · accent · energy high · launch, sting · primitive: Letters

The line contracts toward its centre as its letter spacing collapses, accelerating, and the shot cuts on the fastest frame. **When:** Exiting a title into a hit. **Avoid:** Long words that overlap into a blob.

- **Anatomy:** Tracking collapse on an ease-in.
- **Timing:** 10 f.
- **Sound:** A whoosh.
- **Build:** `<Letters collapse>` (E.buildIn over 5 f at 30 fps, cut on its last frame).

### Short stepped or accelerating fade-out

`dv-short-fade-exit` · accent · energy calm · any · primitive: Words

When a fade is right, it is short and shaped: secondary labels fade out with an accelerating opacity, staggered, as the main element arrives; a phrase goes translucent on one frame and is gone on the next; text fades in five equal steps the frame before a colour beat; a caption fades as the picture fills the frame over it. **When:** Secondary text clearing the stage for the hero; text under a growing picture. **Avoid:** Long linear fades of the main line.

- **Anatomy:** Ease-in opacity over 4-14 f; 2-frame exit; 5 linear steps.
- **Timing:** 4-30 f.
- **Sound:** None; the next element's sound.
- **Build:** Words exit 'launchFade' with a short outDur, or HardStep opacity steps.
