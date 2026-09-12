/**
 * Shape and colour tables.
 *
 * Every silhouette is a single polar radius function, sampled around the circle:
 *
 *     r(t) = superellipse(t, nTop → nBot) · Π (1 + aᵢ·cos(kᵢ·t + φᵢ)) · taper(t)
 *
 * `nTop`/`nBot` blend the superellipse exponent from the top of the form to the
 * bottom — 2 is a circle, higher flattens the sides, below 2 pinches them into
 * corners. That blend is how Dome gets a flat base without a second path.
 *
 * The harmonics add lobes. A harmonic of frequency k stays convex only while its
 * amplitude is below 1/(k²−1); Clover, Spark and Bean deliberately go past that
 * limit, which is what separates their lobes instead of merely bulging them.
 *
 * `ex` is half the distance between the eyes and `ey` their centre line, both in
 * viewBox units. `exOff` shifts the pair sideways on shapes that aren't
 * left-right symmetric, and `spec` scales the specular highlight on shapes too
 * narrow up top to carry a full-size one.
 *
 * @typedef {Readonly<[number, number, number]>} Harmonic  [frequency, amplitude, phase]
 *
 * @typedef {object} ShapeDef
 * @property {string}   id
 * @property {string}   name
 * @property {number}   nTop
 * @property {number}   nBot
 * @property {number}  [sx]     horizontal scale before normalisation
 * @property {number}  [sy]     vertical scale before normalisation
 * @property {readonly Harmonic[]} [harm]
 * @property {number}  [taper]  widens the base and narrows the crown (Egg)
 * @property {number}   ex
 * @property {number}   ey
 * @property {number}  [exOff]
 * @property {number}  [spec]
 * @property {string}   blurb
 */

/** @type {readonly ShapeDef[]} */
export const SHAPES = Object.freeze([
  { id: "pebble",   name: "Pebble",   nTop: 2.15, nBot: 2.15, sx: 1.05, sy: 0.96, harm: [[2, 0.065, 0.9], [3, 0.04, 2.4]], ex: 9.6,  ey: 56, blurb: "The generalist" },
  { id: "orb",      name: "Orb",      nTop: 2,    nBot: 2,                                                                  ex: 9.6,  ey: 56, blurb: "The classic" },
  { id: "capsule",  name: "Capsule",  nTop: 4.2,  nBot: 4.2,  sx: 0.66, sy: 1.05,                                           ex: 7.6,  ey: 53, blurb: "Tall, narrow, tidy" },
  { id: "squircle", name: "Squircle", nTop: 3.5,  nBot: 3.5,                                                                ex: 10,   ey: 56, blurb: "Sits square" },
  { id: "dome",     name: "Dome",     nTop: 2.2,  nBot: 9,              sy: 0.95,                                           ex: 9.8,  ey: 57, blurb: "Planted, unhurried" },
  { id: "bean",     name: "Bean",     nTop: 2.1,  nBot: 2.1,  sx: 1.02,           harm: [[1, 0.2, 0], [2, -0.22, 0]],       ex: 8.4,  ey: 56, exOff: 3, blurb: "Leans in" },
  { id: "egg",      name: "Egg",      nTop: 2.2,  nBot: 2.5,            sy: 1.03, taper: 0.14,                              ex: 8.8,  ey: 58, blurb: "New on the team" },
  { id: "wedge",    name: "Wedge",    nTop: 2.4,  nBot: 2.4,            sy: 0.98, harm: [[3, 0.18, 4.712]],                 ex: 9.4,  ey: 60, spec: 0.82, blurb: "Points at things" },
  { id: "gem",      name: "Gem",      nTop: 1.5,  nBot: 1.5,            sy: 1.1,                                            ex: 9,    ey: 55, spec: 0.8,  blurb: "Sharp, precise" },
  { id: "barrel",   name: "Barrel",   nTop: 4.4,  nBot: 4.4,  sx: 1.18, sy: 0.7,                                            ex: 11.5, ey: 52, blurb: "Holds a lot" },
  { id: "puff",     name: "Puff",     nTop: 2,    nBot: 2,                        harm: [[3, 0.13, 1.571]],                 ex: 9.6,  ey: 57, blurb: "Light touch" },
  { id: "clover",   name: "Clover",   nTop: 2,    nBot: 2,                        harm: [[4, 0.1, 3.1416]],                 ex: 9.6,  ey: 56, blurb: "Four things at once" },
  { id: "bumper",   name: "Bumper",   nTop: 2,    nBot: 2,                        harm: [[8, 0.055, 0]],                    ex: 9.6,  ey: 56, blurb: "Runs the machinery" },
  { id: "spark",    name: "Spark",    nTop: 2,    nBot: 2,            sy: 1.02,   harm: [[4, 0.2, 0]],                      ex: 8.8,  ey: 55, spec: 0.78, blurb: "Has an idea" },
]);

/**
 * Fourteen hues, hand-balanced so no one of them reads heavier than the rest:
 * lightness drops through the yellows and greens, where the eye reads a given
 * HSL lightness as brighter, and climbs again through the blues and violets.
 *
 * @typedef {object} Hue
 * @property {string} name
 * @property {number} h
 * @property {number} s
 * @property {number} l
 */

/** @type {readonly Hue[]} */
export const PALETTE = Object.freeze([
  { name: "Coral",     h: 6,   s: 84, l: 64 },
  { name: "Tangerine", h: 24,  s: 88, l: 58 },
  { name: "Amber",     h: 41,  s: 90, l: 55 },
  { name: "Citron",    h: 68,  s: 62, l: 50 },
  { name: "Lime",      h: 98,  s: 55, l: 49 },
  { name: "Mint",      h: 150, s: 58, l: 47 },
  { name: "Teal",      h: 174, s: 62, l: 42 },
  { name: "Cyan",      h: 192, s: 72, l: 47 },
  { name: "Azure",     h: 208, s: 82, l: 56 },
  { name: "Blue",      h: 228, s: 78, l: 62 },
  { name: "Indigo",    h: 252, s: 68, l: 64 },
  { name: "Violet",    h: 276, s: 62, l: 64 },
  { name: "Orchid",    h: 306, s: 60, l: 62 },
  { name: "Rose",      h: 336, s: 76, l: 63 },
]);

/** @type {ReadonlyMap<string, ShapeDef>} */
const BY_ID = new Map(SHAPES.map((s) => [s.id, s]));

/**
 * Look up a shape by id, falling back to Pebble for anything unrecognised so a
 * stale id in a database never renders an empty avatar.
 * @param {string} [id]
 * @returns {ShapeDef}
 */
export function shapeById(id) {
  return BY_ID.get(String(id)) ?? SHAPES[0];
}
