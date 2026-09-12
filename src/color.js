/**
 * The five colours one avatar is lit with.
 *
 * The light rig never changes: a key light from the upper left, a bounce off the
 * lower right, eight per cent ambient. `rim` is the bounce — it is the lightest
 * and most saturated of the set and it is hue-shifted away from the body, which
 * is the single thing that makes a flat silhouette read as a rendered solid.
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
const hsl = (h, s, l) => `hsl(${(((h % 360) + 360) % 360)}, ${r2(clamp(s))}%, ${r2(clamp(l))}%)`;

/**
 * @typedef {object} AvatarPalette
 * @property {string} light  lit face, upper left
 * @property {string} core   body colour at the terminator
 * @property {string} shade  unlit face
 * @property {string} rim    bounce light along the lower-right edge
 * @property {string} eye
 * @property {string} cast   cast shadow, tinted rather than grey
 */

/**
 * @param {number} h  0–359
 * @param {number} s  0–100
 * @param {number} l  0–100
 * @returns {AvatarPalette}
 */
export function palette(h, s, l) {
  return {
    light: hsl(h + 10, s * 0.9, l + 26),
    core: hsl(h, s, l),
    shade: hsl(h - 7, s * 0.95, Math.max(l - 26, 15)),
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
