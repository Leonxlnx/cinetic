// Fixture. expect: gradient-multihue=2 banned-color=1
export const rainbow = 'linear-gradient(90deg, #EC2A3A, #08965A, #1F86CD)';
export const purpleToBlue = 'linear-gradient(135deg, #6366F1, #3B82F6)'; // #6366F1 is indigo; 17 degrees apart
export const aurora = 'linear-gradient(90deg, #14B8A6, #EBD235)';
export const tonal = 'linear-gradient(180deg, #F5F6F7, #E9EBEE)'; // one hue: passes (low span warns)
