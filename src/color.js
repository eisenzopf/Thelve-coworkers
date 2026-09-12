/**
 * The colours one avatar is lit with.
 *
 * The light rig never changes direction: a key light from the upper left, a
 * bounce off the lower right, eight per cent ambient. What `depth` changes is
 * how far `light` and `shade` travel from `core` — at depth 0 they collapse onto
 * it and the form gradient becomes a flat fill.
 *
 * `rim`, `eye` and `cast` keep their colour at every depth; it is their opacity
 * that the renderer scales, which is what a light actually does when it dims.
 */

/** @param {number} v */
const clamp = (v) => Math.max(0, Math.min(100, v));

/** @param {number} n */
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string} a comma-form `hsl()`, which pastes into design tools cleanly
 */
const hsl = (h, s, l) =>
  `hsl(${(((Math.round(h) % 360) + 360) % 360)}, ${r2(clamp(s))}%, ${r2(clamp(l))}%)`;

/**
 * @typedef {object} AvatarPalette
 * @property {string} light   lit face, upper left
 * @property {string} core    body colour at the terminator
 * @property {string} shade   unlit face
 * @property {string} rim     bounce light along the lower-right edge
 * @property {string} eye
 * @property {string} cast    cast shadow, tinted rather than grey
 */

/**
 * @param {number} h      0–359
 * @param {number} s      0–100
 * @param {number} l      0–100
 * @param {number} [depth] 0 = flat fill, 1 = full modelling
 * @returns {AvatarPalette}
 */
export function palette(h, s, l, depth = 1) {
  const d = Math.max(0, Math.min(1, depth));
  return {
    light: hsl(h + 10 * d, s * (1 - 0.1 * d), l + 26 * d),
    core: hsl(h, s, l),
    // The floor has to be written this way round: at depth 0 the shade must land
    // exactly on core, even for a body colour darker than the floor itself.
    shade: hsl(h - 7 * d, s * (1 - 0.05 * d), Math.max(l - 26 * d, Math.min(l, 15))),
    rim: hsl(h + 15, s * 1.06, Math.min(l + 22, 86)),
    eye: hsl(h + 4, s * 0.5, Math.max(l - 43, 11)),
    cast: hsl(h - 4, s * 0.7, Math.max(l - 34, 14)),
  };
}

/**
 * HSL to hex, for showing a swatch value in a UI.
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string} `#RRGGBB`
 */
export function toHex(h, s, l) {
  const a = (clamp(s) * Math.min(clamp(l), 100 - clamp(l))) / 10000;
  const k = (n) => (n + h / 30) % 12;
  const ch = (n) =>
    Math.round(255 * (clamp(l) / 100 - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return "#" + [ch(0), ch(8), ch(4)].map((v) => v.toString(16).padStart(2, "0")).join("").toUpperCase();
}
