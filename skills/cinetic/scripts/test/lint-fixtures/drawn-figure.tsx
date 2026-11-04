// Fixture for scripts/test/lint-film.test.mjs. expect: drawn-figure=4 drawn-figure:warn=1
// People, places and products drawn in code where a real photo belongs: a large drawn portrait, an avatar portrait
// with no photo, the kit's drawn still life, a landscape drawn in SVG; a drawn portrait at a size lint cannot read
// warns. Real photos (src), small UI avatars, monograms and a header drawn in SVG pass.
import React from 'react';

declare const U: number;
declare const s: number;
declare const t: unknown;
declare const PortraitMark: React.FC<{ theme: unknown; seed: string; size: number }>;
declare const Avatar: React.FC<{ theme: unknown; i: number; initials: string; size: number; kind?: string; src?: string }>;
declare const Photo: React.FC<{ theme: unknown; w: number; h: number; seed?: number; src?: string }>;

const Mountains: React.FC = () => (
  <svg width={1920} height={1080}>
    <path d="M0 800 L400 500 L800 760 Z" fill="#35383C" />
    <path d="M600 820 L1100 420 L1600 800 Z" fill="#45484C" />
  </svg>
);

export const Bad: React.FC = () => (
  <div>
    <PortraitMark theme={t} seed="ana" size={150 * U} />
    <Avatar theme={t} i={0} initials="AB" size={96 * U} kind="portrait" />
    <Photo theme={t} w={400} h={300} seed={4} />
    <PortraitMark theme={t} seed="ben" size={s} />
    <Mountains />
  </div>
);

const Header: React.FC = () => (
  <svg width={40} height={40}>
    <path d="M4 4 L36 36" stroke="#0D0E10" />
    <path d="M36 4 L4 36" stroke="#0D0E10" />
  </svg>
);

export const Good: React.FC = () => (
  <div>
    <Header />
    <Avatar theme={t} i={1} initials="CD" size={96 * U} kind="portrait" src="assets/graded/ana.jpg" />
    <Avatar theme={t} i={2} initials="EF" size={32} />
    <Avatar theme={t} i={3} initials="GH" size={120} kind="monogram" />
    <PortraitMark theme={t} seed="cy" size={48} />
    <Photo theme={t} w={400} h={300} src="assets/graded/bowl.jpg" />
  </div>
);
