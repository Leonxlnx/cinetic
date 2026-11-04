// Fixture for scripts/test/lint-film.test.mjs. expect: camera-shot=5 card-tilt=1
// The depth stage's camera off its shots (errors): a camera built from the frame by hand, a yaw on a sine of the
// frame, a travel on E.linear, a travel that starts before the push has landed, a pull straight back 20 f after a
// push; and a Plane turned at rest (card-tilt). A declared push then a travel the same way, a follow, a still camera
// given as numbers, a plane whose turn is its own move and an array's push() are silent.
import React from 'react';
import { useCurrentFrame } from 'remotion';
import { E } from './anim';
import { camera, follow, macro, Plane, pull, push, Stage3D, travel, wide } from './fx/depth';

const BOX = { x: 1300, y: 700, w: 120, h: 120 };
const good = camera([push(10, macro(BOX), { frames: 60 }), travel(90, [1500, 760, 0], { frames: 60 })]);
const fol = camera([follow(10, (g) => [600 + 4 * g, 540, 0], { frames: 120 })], { base: { target: [600, 540, 0] } });
const lin = camera([travel(0, [1200, 540, 0], { frames: 300, ease: E.linear })]);
const over = camera([push(0, macro(BOX), { frames: 60 }), travel(40, [900, 500, 0], { frames: 60 })]);
const back = camera([push(0, macro(BOX), { frames: 50 }), pull(70, wide(), { frames: 50 })]);
const queue: number[] = [];
queue.push(3);

export const ActDepth: React.FC = () => {
  const f = useCurrentFrame();
  const sway = { target: [960, 540, 0] as const, dist: 2250, yaw: 4 * Math.sin(f / 30), pitch: 0, roll: 0, lens: 50, focus: null, aperture: 36 };
  return (
    <>
      <Stage3D camera={{ target: [960, 540, 0], dist: 2250 - 2 * f, yaw: 0, pitch: 0, roll: 0, lens: 50, focus: null, aperture: 36 }} />
      <Stage3D camera={sway} />
      <Stage3D camera={{ target: [960, 540, 0], dist: 2000, yaw: 6, pitch: 0, roll: 0, lens: 50, focus: null, aperture: 36 }}>
        <Plane box={BOX} rot={{ x: 12, y: -18 }} />
        <Plane box={BOX} move={(g) => ({ ry: 30 * (1 - Math.min(1, g / 40)) })} />
      </Stage3D>
      <Stage3D camera={good} />
      <Stage3D camera={fol} />
      <Stage3D camera={lin} />
      <Stage3D camera={over} />
      <Stage3D camera={back} />
    </>
  );
};
