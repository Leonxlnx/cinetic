# Formats: when the film is not a launch film

The default path in SKILL.md builds a 20-30 s launch or feature film. Other requests are other formats with their own
length, sections and ending. Set the format in `BRIEF.md` first; it decides which concepts fit (the numbers refer to the
[concept menu](film-grammar.md#concepts)) and how the film may end.

What never changes with the format: one subject and air in every frame, readable or absent text, clean grounds, the
palette rules, carried seams, no cross-fades, no dead holds before the end, legibility sizes and contrast, real marks,
licensed pictures and sound, no generated images.

| Format | Length | Concepts that fit | Ending |
|---|---|---|---|
| Launch or feature film | 10-30 s (a type or number film 10-15 s) | any whose needs the brief meets; one task only when it is literally one flow | lockup at most 2.5 s, claim and lockup at most a fifth of the film (3.5 s under 18 s) |
| Feature update | 8-20 s | 12, 2, 1, 9 | the name small with the CTA, or the product left working |
| Loop | 4-12 s | 15, 2, 6 | none: the last frame is the first |
| Logo sting | 3-5 s (7 at most) | 3, 2, 5 | the mark is the film |
| Vertical teaser | 8-15 s | 3, 6, 7, 9, 16 | the name and a date or CTA |
| Explainer | 45-90 s (30 s short form) | 13, 8, 12, 1 | an end card of 3-4 s with the CTA |
| Brand film | 25-50 s | 14, 4, 6, 3 | a quiet end card of 3-4 s |
| Series opener | 5-20 s | 5, 3, 2 | a still title the episode cuts from |

---

## Loop

A landing-page hero that plays forever beside the page's own headline.
- **Length:** 4-12 s. In panels (concept 15), each cell loops one action on its own period, and every period divides the
  loop's length (a 12 s loop with cells of 3 and 4 s; a 10 s loop with 2 and 5 s), so the whole file repeats cleanly.
- **Sections:** none. One action and its result a cell (a card dragged to done, a list ticked, a prompt typed, a mark
  turning), or one cycle in a single frame that resets through its own shape (the result folds back into the input).
  Cells relay: one cell's last picture is another's first, so the eye wanders.
- **Seamless technique:** render frames 0 to N-1, where frame N would equal frame 0. Every periodic motion uses a period
  that divides N (`Math.sin((2 * Math.PI * f) / N)` or a multiple of it); noise is sampled on a circle
  (`noise(x, y, cos(2πf/N) r, sin(2πf/N) r)`) so it returns to its start. A constant cycle (a rotation, a scroll, a
  conveyor) runs at constant speed across the seam, with no ease-in-out to hesitate on; every move inside the cycle
  still eases. Check by rendering frames N-1, 0 and 1 side by side, and run `frames.mjs check <video> --format loop`:
  it skips the sound, ending and music lines and fails when the last frame differs visibly from the first.
- **Different from a launch:** no hook, no problem, no claim, no lockup, no music; type small and few; legible at half
  size; no flashes and no hard ground cuts (on repeat they read as a glitch).
- **Deliver:** muted H.264 mp4 and a WebM, at most 1080p and about 5 MB, plus a poster frame.

## Logo sting

- **Length:** 3-5 s, 7 at most when it opens a longer video; 4-6 stages; at most one hard cut.
- **Sections:** the primitive (0-0.8 s) > construction (object, geometry, mark, wordmark: 0.5-0.8 s each) > a hold of
  0.5-1.5 s > an optional exit (a smear, a push) or a 1-2 s glimpse of the product.
- **Different:** the mark is the subject from frame 0; no UI beyond that one glimpse; construction lines may be the
  signature; one sound hit and its tail, or silence; motion blur on the fast frames; no second logo in the frame. It may
  end mid-move when it opens a longer video. The invented mark must have an idea (SKILL.md, real marks).
- **Check:** `frames.mjs check <video> --format sting`: no pace gate under 8 s, and the ending may hold.

## Vertical teaser

- **Length:** 8-15 s at 1080x1920 (layout rules in SKILL.md, "Vertical").
- **Sections:** the hook in frame 0 (a word or the object, already moving, readable muted) > 2-4 beats of one idea > a
  tease of the thing (withhold the full product: a glimpse, a silhouette, a number) > the name and a date or the CTA.
- **Different:** captions on, since most watch muted; stacked compositions; lines of 2-3 words; subject and type out of
  the top 12 % and the bottom 20 %; cuts on the beat; the last frame loops cleanly into the first (platforms replay). One
  concept from its list, never a launch film squeezed into a tall frame.

## Feature update

For people who already use the product. The beat table is in [film-grammar.md](film-grammar.md#update-film).
- **Length:** 8-20 s.
- **Sections:** the name and the version by 2 s (the update is the news) > 2-4 changes, each one action and its result
  on the real UI, each result handing to the next > the product left working, or the name small with "Available today"
  or the URL.
- **Different:** no problem act; the name comes first, not last; the version number is the only number animated for its
  own sake; the output-big row is required (the change seen big once).

## Explainer

- **Length:** 45-90 s (a 30 s short form exists); a voice the user supplies, or captions that read as if voiced (about
  130-150 spoken words a minute).
- **Sections:** premise 15-25 % (a question or the pain) > what it is (the name and one line) > how it works in three
  steps on one UI canvas under one camera, typing time hidden inside zooms > proof (a chart, the scale) > one claim > an
  end card of 3-4 s with the CTA.
- **Different:** the words on screen are the words spoken, built word by word; one type build repeated, varied about
  every 20 s so it does not turn mechanical; the demo act runs slower (beats of 3-4 s) than the premise (1-1.5 s), so the
  0.8-1.6 s beat rule applies to the premise only; every zoom starts from a context frame with a landmark both share;
  the music drops for 5-10 s before the main reveal.

## Brand film

A rebrand, a company or a recruiting film.
- **Length:** 25-50 s; 3-6 lines of belief.
- **Sections:** a line over a picture > the identity in the world (signage, print, screens built in code, licensed
  photographs in one grade, or a lit 3D world) > the product at most once > the belief completed > a quiet end card of
  3-4 s, still creeping.
- **Different:** fewer, longer shots (beats of 1.5-3 s); the subtle, unexpected choice beats the busy one; no spectacle
  row is required; the product UI appears once or not at all.

## Series opener

A title for a recurring video (an episode, a podcast, a talk series).
- **Length:** 5-20 s; one camera; the title built from the episode's own material (its object, its words, its place).
- **Ending:** a still title card that the episode cuts from; it is the one format whose last second may hold still.
- **Different:** the same opener plays every episode, so it carries no claim and no date; one music phrase, cut to end
  on its downbeat.
