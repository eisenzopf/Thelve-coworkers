/**
 * The avatar itself.
 *
 * `avatarSVG()` returns a complete, self-contained SVG string. Everything it
 * needs — gradients, clip path, drop shadow — lives inside that one element, so
 * a page can hold any number of them with nothing shared and nothing to set up.
 *
 * Four layers make a flat silhouette read as a solid:
 *
 *   1. a radial form gradient, lit from the upper left;
 *   2. a bounce rim, stroked along the path and clipped to it so only the inner
 *      half shows — this is the layer that actually sells the volume;
 *   3. a thin key rim catching the top edge;
 *   4. a specular that drifts a little as the body floats.
 */

import { SHAPES, PALETTE, shapeById } from "./shapes.js";
import { buildPath } from "./geometry.js";
import { palette } from "./color.js";

/** FNV-1a. Small, fast, and stable across runtimes — which is what matters here. */
function fnv1a(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Names arrive from user data and the result is injected as HTML. */
const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/**
 * Pick a stable shape and hue for a name, so one coworker wears the same face on
 * every surface and across every session without anything being stored.
 *
 * @param {string} name
 * @returns {{ shape: import("./shapes.js").ShapeDef, color: import("./shapes.js").Hue }}
 */
export function avatarFor(name) {
  const h = fnv1a(String(name));
  return {
    shape: SHAPES[h % SHAPES.length],
    // A second, decorrelated slice of the same hash, so shape and hue don't
    // move together and collide in pairs.
    color: PALETTE[(h >>> 9) % PALETTE.length],
  };
}

/**
 * @typedef {object} AvatarOptions
 * @property {string} [name]    derives shape and hue when they aren't given
 * @property {string} [shape]   shape id, e.g. `"bean"`
 * @property {number} [hue]     0–359
 * @property {number} [sat]     0–100
 * @property {number} [lum]     0–100
 * @property {number} [size]    sets width/height attributes; omit and size in CSS
 * @property {boolean} [eyes]   default true
 * @property {boolean} [shadow] default true
 * @property {string} [title]   accessible name; falls back to `name`
 */

/**
 * @param {AvatarOptions} [options]
 * @returns {string} an SVG element as a string
 */
export function avatarSVG(options = {}) {
  const pick = options.name !== undefined ? avatarFor(options.name) : undefined;

  const sp = shapeById(options.shape ?? pick?.shape.id);
  const h = options.hue ?? pick?.color.h ?? 208;
  const s = options.sat ?? (options.hue === undefined ? pick?.color.s : undefined) ?? 78;
  const l = options.lum ?? (options.hue === undefined ? pick?.color.l : undefined) ?? 56;

  const eyes = options.eyes !== false;
  const shadow = options.shadow !== false;

  const c = palette(h, s, l);
  const d = buildPath(sp);

  // Ids are derived from the appearance, not a counter: two identical avatars
  // may share a gradient, and server and client always agree — a counter would
  // break hydration.
  const key = `${sp.id}|${h}|${s}|${l}|${eyes ? 1 : 0}|${shadow ? 1 : 0}`;
  const u = fnv1a(key).toString(36);

  // Seeded off the name so a roster blinks and drifts out of sync.
  const delay = ((fnv1a(options.name ?? key) % 400) / 100).toFixed(2);

  const ex = sp.ex;
  const ey = sp.ey;
  const cx = 50 + (sp.exOff ?? 0);
  const spec = sp.spec ?? 1;

  const label = esc(options.title ?? options.name ?? `${sp.name} avatar`);
  const dims = options.size !== undefined ? ` width="${options.size}" height="${options.size}"` : "";

  return (
    `<svg class="av" viewBox="0 0 100 100"${dims} xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label}">` +
    `<defs>` +
    `<clipPath id="c${u}"><path d="${d}"/></clipPath>` +
    `<radialGradient id="f${u}" cx="34%" cy="25%" r="80%">` +
    `<stop offset="0" stop-color="${c.light}"/>` +
    `<stop offset=".5" stop-color="${c.core}"/>` +
    `<stop offset="1" stop-color="${c.shade}"/></radialGradient>` +
    `<linearGradient id="b${u}" x1="88%" y1="97%" x2="26%" y2="28%">` +
    `<stop offset="0" stop-color="${c.rim}"/>` +
    `<stop offset=".18" stop-color="${c.rim}" stop-opacity=".8"/>` +
    `<stop offset=".52" stop-color="${c.rim}" stop-opacity="0"/></linearGradient>` +
    `<linearGradient id="k${u}" x1="28%" y1="2%" x2="60%" y2="58%">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".6"/>` +
    `<stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<radialGradient id="s${u}">` +
    `<stop offset="0" stop-color="#fff" stop-opacity=".82"/>` +
    `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` +
    (shadow
      ? `<filter id="d${u}" x="-30%" y="-30%" width="160%" height="170%">` +
        `<feDropShadow dx="0" dy="3.5" stdDeviation="3.2" flood-color="${c.cast}" flood-opacity=".34"/></filter>`
      : "") +
    `</defs>` +
    `<g class="av-body" style="animation-delay:-${delay}s"${shadow ? ` filter="url(#d${u})"` : ""}>` +
    `<path d="${d}" fill="url(#f${u})"/>` +
    `<g clip-path="url(#c${u})">` +
    `<path d="${d}" fill="none" stroke="url(#b${u})" stroke-width="16"/>` +
    `<path d="${d}" fill="none" stroke="url(#k${u})" stroke-width="8"/>` +
    `<g class="av-spec" style="animation-delay:-${delay}s" transform="translate(50 52) scale(${spec}) translate(-50 -52)">` +
    `<ellipse cx="34" cy="28" rx="14" ry="9.6" transform="rotate(-28 34 28)" fill="url(#s${u})"/>` +
    `<ellipse cx="29.6" cy="22.4" rx="3.5" ry="2.6" transform="rotate(-28 29.6 22.4)" fill="#fff" opacity=".78"/>` +
    `</g></g>` +
    (eyes
      ? `<g class="av-eyes" style="transform-origin:${cx}px ${ey}px;animation-delay:-${delay}s">` +
        `<ellipse cx="${cx - ex}" cy="${ey}" rx="4.3" ry="5.4" fill="${c.eye}"/>` +
        `<ellipse cx="${cx + ex}" cy="${ey}" rx="4.3" ry="5.4" fill="${c.eye}"/>` +
        `<ellipse cx="${cx - ex - 1.2}" cy="${ey - 2.1}" rx="1.25" ry="1.5" fill="#fff" opacity=".55"/>` +
        `<ellipse cx="${cx + ex - 1.2}" cy="${ey - 2.1}" rx="1.25" ry="1.5" fill="#fff" opacity=".55"/>` +
        `</g>`
      : "") +
    `</g></svg>`
  );
}
