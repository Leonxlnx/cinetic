// Fixture for scripts/test/lint-film.test.mjs. expect: logo-chip=2
// A chip or pill that names a well-known product in text alone fails: the product the film names shows its real mark.
// A chip of the product's own words, a LogoChip with the mark and a chip whose label comes from data pass.
import React from 'react';

declare const Chip: React.FC<{ theme?: unknown; label: string; h: number }>;
declare const Pill: React.FC<{ label: string; h: number }>;
declare const LogoChip: React.FC<{ theme?: unknown; logo: string; label?: string; h: number }>;
declare const source: { name: string };

export const Bad: React.FC = () => (
  <div>
    <Chip label="ChatGPT" h={64} />
    <Pill label="Slack" h={56} />
  </div>
);

export const Good: React.FC = () => (
  <div>
    <Chip label="Weekly report" h={64} />
    <LogoChip logo="slack" label="Slack" h={64} />
    <Chip label={source.name} h={64} />
  </div>
);
