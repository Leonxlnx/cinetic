// Fixture. expect: italic=1 brand-supplied=1
export const Payoff = () => (
  <span>
    your week,{' '}
    {/* cinetic:accent-face Instrument Serif, the payoff word */}
    <em style={{ fontStyle: 'italic' }}>sorted.</em>
  </span>
);
export const Line = () => <p style={{ fontStyle: 'italic' }}>a whole italic line: an error</p>;
export const Bare = () => <i>nameless</i>; // cinetic:accent-face
