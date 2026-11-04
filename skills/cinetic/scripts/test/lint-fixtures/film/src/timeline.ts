// Fixture film timeline: a calm 1.2 film with a crisp look and one spring class.
export const FPS = 60;
export const PACE_NAME = 'calm';
export const W = 1920;
export const H = 1080;
export const LOOK = { blur: 'crisp', texture: 'clean', filmType: 'launch', oneTake: false, whiteWorld: false };
export const SPRING_CLASS = 'pill';
const chain = (id: string, mode: string, frags: [string, number][]) => frags.map(([text, at], i) => ({ id: `${id}.${i + 1}`, text, in: at, mode }));
export const COPY = [
  ...chain('long', 'build', [
    ['one two three four five six seven', 0],
    ['eight nine ten eleven twelve thirteen', 120],
    ['fourteen fifteen sixteen seventeen eighteen nineteen twenty', 240],
    ['twenty-one twenty-two twenty-three twenty-four twenty-five twenty-six', 360],
  ]),
  ...chain('short', 'build', [['Built on', 600], ['the beat', 660]]),
];
export const copy = (id: string) => COPY.find((c) => c.id === id)!;
