// The product's scenes: one entry per scene name in src/spine.ts, each a house scene from src/acts/scenes.tsx (the form
// and the device its act's verb asks for) filled with the product's OWN content: the case's request, the page it makes,
// the people who answer, the figure, the mark. src/content.ts holds that content (node scripts/content.mjs --brief
// BRIEF.md --fetch --force writes it from the brief: read it and keep only what is true of the product). A scene the
// house set does not draw: write a SceneDef of your own beside these (Draw, el: the element's box on screen, Content:
// the element alone for the handover), built from src/kit/screens.
//
// Rules every scene keeps (the checks read them): the element is the brightest, sharpest thing in its frame; cards are
// the kit's lit material or glass, facing the camera, never a plain slab, never tilted at rest; every string is the
// product's real words (src/spine.ts `ui` lists them); a real company in a picture shows its official mark
// (node scripts/logos.mjs get <id>: public/logos, drawn by kit/logos), never a drawn look-alike; photographs only of the
// brief's own subject (the page's hero picture, a person's face), never a random stock picture.
import React from 'react';
import { C } from './brand/tokens';
import { LogoMark } from './brand/Mark';
import * as BRAND_LOGO from './brand/logo';
import { CONTENT } from './content';
import { countScene, liveScene, lockupScene, noticeScene, promptScene, type SceneDef, siteScene, wordScene } from './acts/scenes';
import { IDENTITY } from './brand/identity';
import { CLOSE, SPINE } from './spine';

/** The mark on the lockup: the brand's logo (scripts/brand.py writes src/brand/logo.ts), drawn in one colour on the field; until then the product's own element as a mark (a disc with the accent's check), never a sparkle or a letter that repeats the name. */
export const HERO_MARK = (size: number, color: string): React.ReactNode =>
  (BRAND_LOGO as { LOGO_STANDIN?: boolean }).LOGO_STANDIN === true ? (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r="44" fill={color} />
      <path d="M30 52 L45 66 L72 36" fill="none" stroke={C.accent} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <LogoMark logo={BRAND_LOGO.LOGO} size={size} fill={() => color} />
  );
const ownMark = (BRAND_LOGO as { LOGO_STANDIN?: boolean }).LOGO_STANDIN === true ? undefined : (size: number) => <LogoMark logo={BRAND_LOGO.LOGO} size={size} />;

const site = CONTENT.site ?? { url: 'example.com', brand: IDENTITY.name, cta: 'Get started', headline: CONTENT.doc.title, lead: CONTENT.doc.lead };

// cinetic:placeholder - the template's stand-in scenes: give each scene of src/spine.ts the product's own content, then delete this line.
export const SCENE_DRAW: Record<string, SceneDef> = {
  promise: wordScene(),
  ask: promptScene({ text: SPINE.case.request, placeholder: CONTENT.prompt.placeholder, model: CONTENT.prompt.model }),
  result: siteScene({ site, toolbar: { status: 'Draft', action: 'Publish' } }, 'page'),
  press: siteScene({ site, toolbar: { status: 'Draft', action: 'Publish' } }, 'button'),
  live: liveScene({ words: `Live at ${site.url}`, strong: 'Live' }),
  arrivals: noticeScene({ items: CONTENT.notices.items.slice(0, 5), ownMark }),
  count: countScene({ title: site.headline, label: 'joined', from: 5, to: 128, faces: CONTENT.people.slice(1, 6).map((p) => ({ name: p.name, photo: p.photo })) }),
  lockup: lockupScene({ name: IDENTITY.name, fact: CLOSE, mark: HERO_MARK }),
};
