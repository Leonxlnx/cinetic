// The kit's useTextWidth, with a longer delayRender timeout: in a 36-frame sheet of a film with 3D views, the GL cells
// hold the main thread long enough that the kit's default 28 s timeout fires before the fonts promise resolves.
// (Kit wish: let useTextWidth take a timeout, or default it higher.)
import React from 'react';
import { continueRender, delayRender } from 'remotion';

export const useTextWidthSlow = (text: string, style: React.CSSProperties, timeout = 240000) => {
  const [w, setW] = React.useState(0);
  const [handle] = React.useState(() => delayRender('measure text (lumen)', { timeoutInMilliseconds: timeout }));
  const key = JSON.stringify([text, style.fontFamily, style.fontSize, style.fontWeight, style.letterSpacing, style.fontStyle]);
  React.useLayoutEffect(() => {
    let alive = true;
    document.fonts.ready.then(() => {
      if (!alive) return;
      const el = document.createElement('span');
      Object.assign(el.style, { position: 'absolute', visibility: 'hidden', whiteSpace: 'pre', left: '-9999px', top: '0' });
      for (const [k, v] of Object.entries(style)) (el.style as unknown as Record<string, string>)[k] = typeof v === 'number' && k !== 'fontWeight' && k !== 'lineHeight' ? `${v}px` : String(v);
      el.textContent = text;
      document.body.appendChild(el);
      setW(el.offsetWidth);
      el.remove();
      continueRender(handle);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, handle]);
  return w;
};
