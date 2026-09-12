/**
 * The avatar itself.
 *
 * `avatarSVG()` returns a complete, self-contained SVG string. Everything it
 * needs — gradients, clip path, drop shadow — lives inside that one element, so
 * a page can hold any number of them with nothing shared and nothing to set up.
 *
 * Two independent axes control the look:
 *
 *   `depth`  0 → 1   how much the form is modelled. Four layers make a flat
 *                    silhouette read as a solid: a radial form gradient lit from
 *                    the upper left; a bounce rim stroked along the path and
 *                    clipped to it, so only the inner half shows; a thin key rim
 *                    on the top edge; and a specular that lags the body as it
 *                    floats. Each fades on its own curve — the specular goes
 *                    first, because it is the strongest "this is rendered" cue
 *                    and keeping it through the middle just makes mud.
 *
 *   `border` 0 → ~4  an outline, in viewBox units. Stroked at twice the width
 *                    and clipped to the silhouette, so it grows inward only and
 *                    the outer edge never moves at any weight — which is what
 *                    keeps the constant-area normalisation honest.
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

const r2 = (n) => Math.round(n * 100) / 100;
const clamp01 = (v) => Math.max(0, Math.min(1, v));

/** 0 until `from`, then rising linearly to 1 at `to`. Lets each layer fade on its own curve. */
const ramp = (v, from, to) => clamp01((v - from) / (to - from));

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

/** Named stops for the depth axis, for pickers and docs. */
export const DEPTH_STOPS = Object.freeze([
  { name: "Flat", value: 0 },
  { name: "Soft", value: 0.3 },
  { name: "Satin", value: 0.6 },
  { name: "Rendered", value: 1 },
]);

/** Named stops for the border axis, in viewBox units. */
export const BORDER_STOPS = Object.freeze([
  { name: "None", value: 0 },
  { name: "Hairline", value: 0.75 },
  { name: "Light", value: 1.5 },
  { name: "Medium", value: 2.5 },
  { name: "Heavy", value: 4 },
]);

/**
 * @typedef {object} AvatarOptions
 * @property {string} [name]    derives shape and hue when they aren't given
 * @property {string} [shape]   shape id, e.g. `"bean"`
 * @property {number} [hue]     0–359
 * @property {number} [sat]     0–100
 * @property {number} [lum]     0–100
 * @property {number} [depth]   0 flat … 1 fully rendered. Default 1.
 * @property {number} [border]  outline width in viewBox units. Default 0.
 * @property {"contour"|"ink"|string} [borderColor]
 *   `"contour"` (default) derives an ink line from the body colour and stays
 *   self-contained. `"ink"` emits `currentColor`, which is the one setting that
 *   makes an avatar depend on the page — set `color` on an ancestor and it will
 *   follow the theme. Any other value is used as a CSS colour verbatim.
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

  const depth = clamp01(options.depth ?? 1);
  const border = Math.max(0, options.border ?? 0);
  const borderColor = options.borderColor ?? "contour";
  const eyes = options.eyes !== false;
  const shadow = options.shadow !== false && depth > 0;

  const c = palette(h, s, l, depth);
  const d = buildPath(sp);

  // Ids are derived from the appearance, not a counter: two identical avatars
  // may share a gradient, and server and client always agree — a counter would
  // break hydration.
  const key = `${sp.id}|${h}|${s}|${l}|${depth}|${border}|${borderColor}|${eyes ? 1 : 0}|${shadow ? 1 : 0}`;
  const u = fnv1a(key).toString(36);

  // Seeded off the name so a roster blinks and drifts out of sync.
  const delay = ((fnv1a(options.name ?? key) % 400) / 100).toFixed(2);

  // --- depth: each layer on its own curve ---
  const bounceA = depth;
  const keyA = r2(0.6 * depth);
  // The specular is the first thing that reads as "rendered", so it is the first
  // thing to go; the crisp dot arrives later still.
  const specA = r2(0.82 * ramp(depth, 0.25, 1));
  const dotA = r2(0.78 * ramp(depth, 0.55, 1));
  // Gloss is highlight tightness, not opacity: it shrinks as the depth rises.
  const specScale = r2((sp.spec ?? 1) * (1.25 - 0.25 * depth));
  const gradR = r2(88 - 16 * depth);
  const bounceW = r2(10 + 6 * depth);
  const catchA = r2(0.55 * depth);

  const ex = sp.ex;
  const ey = sp.ey;
  const cx = 50 + (sp.exOff ?? 0);

  const paint =
    borderColor === "contour" ? c.contour : borderColor === "ink" ? "currentColor" : borderColor;

  /** Layers that live inside the silhouette clip, in paint order. */
  const clipped = [];
  if (bounceA > 0) clipped.push(`<path d="${d}" fill="none" stroke="url(#b${u})" stroke-width="${bounceW}"/>`);
  if (keyA > 0) clipped.push(`<path d="${d}" fill="none" stroke="url(#k${u})" stroke-width="8"/>`);
  if (specA > 0) {
    clipped.push(
      `<g class="av-spec" style="animation-delay:-${delay}s"` +
        ` transform="translate(50 52) scale(${specScale}) translate(-50 -52)">` +
        `<ellipse cx="34" cy="28" rx="14" ry="9.6" transform="rotate(-28 34 28)" fill="url(#s${u})"/>` +
        (dotA > 0
          ? `<ellipse cx="29.6" cy="22.4" rx="3.5" ry="2.6" transform="rotate(-28 29.6 22.4)" fill="#fff" opacity="${dotA}"/>`
          : "") +
        `</g>`,
    );
  }
  // The contour sits above the shading and below the eyes. Twice the width,
  // clipped: the outer half is discarded so the silhouette never grows.
  if (border > 0) {
    clipped.push(`<path d="${d}" fill="none" stroke="${paint}" stroke-width="${r2(border * 2)}"/>`);
  }

  /** @type {string[]} */
  const defs = [];
  if (clipped.length > 0) defs.push(`<clipPath id="c${u}"><path d="${d}"/></clipPath>`);
  defs.push(
    `<radialGradient id="f${u}" cx="34%" cy="25%" r="${gradR}%">` +
      `<stop offset="0" stop-color="${c.light}"/>` +
      `<stop offset=".5" stop-color="${c.core}"/>` +
      `<stop offset="1" stop-color="${c.shade}"/></radialGradient>`,
  );
  if (bounceA > 0) {
    defs.push(
      `<linearGradient id="b${u}" x1="88%" y1="97%" x2="26%" y2="28%">` +
        `<stop offset="0" stop-color="${c.rim}" stop-opacity="${r2(bounceA)}"/>` +
        `<stop offset=".18" stop-color="${c.rim}" stop-opacity="${r2(0.8 * bounceA)}"/>` +
        `<stop offset=".52" stop-color="${c.rim}" stop-opacity="0"/></linearGradient>`,
    );
  }
  if (keyA > 0) {
    defs.push(
      `<linearGradient id="k${u}" x1="28%" y1="2%" x2="60%" y2="58%">` +
        `<stop offset="0" stop-color="#fff" stop-opacity="${keyA}"/>` +
        `<stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>`,
    );
  }
  if (specA > 0) {
    defs.push(
      `<radialGradient id="s${u}">` +
        `<stop offset="0" stop-color="#fff" stop-opacity="${specA}"/>` +
        `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`,
    );
  }
  if (shadow) {
    defs.push(
      `<filter id="d${u}" x="-30%" y="-30%" width="160%" height="170%">` +
        `<feDropShadow dx="0" dy="${r2(3.5 * depth)}" stdDeviation="${r2(0.8 + 2.4 * depth)}"` +
        ` flood-color="${c.cast}" flood-opacity="${r2(0.34 * depth)}"/></filter>`,
    );
  }

  const label = esc(options.title ?? options.name ?? `${sp.name} avatar`);
  const dims = options.size !== undefined ? ` width="${options.size}" height="${options.size}"` : "";

  return (
    `<svg class="av" viewBox="0 0 100 100"${dims} xmlns="http://www.w3.org/2000/svg"` +
    ` role="img" aria-label="${label}" style="--av-depth:${r2(depth)}">` +
    `<defs>${defs.join("")}</defs>` +
    `<g class="av-body" style="animation-delay:-${delay}s"${shadow ? ` filter="url(#d${u})"` : ""}>` +
    `<path d="${d}" fill="url(#f${u})"/>` +
    (clipped.length > 0 ? `<g clip-path="url(#c${u})">${clipped.join("")}</g>` : "") +
    (eyes
      ? `<g class="av-eyes" style="transform-origin:${cx}px ${ey}px;animation-delay:-${delay}s">` +
        `<ellipse cx="${cx - ex}" cy="${ey}" rx="4.3" ry="5.4" fill="${c.eye}"/>` +
        `<ellipse cx="${cx + ex}" cy="${ey}" rx="4.3" ry="5.4" fill="${c.eye}"/>` +
        (catchA > 0
          ? `<ellipse cx="${cx - ex - 1.2}" cy="${ey - 2.1}" rx="1.25" ry="1.5" fill="#fff" opacity="${catchA}"/>` +
            `<ellipse cx="${cx + ex - 1.2}" cy="${ey - 2.1}" rx="1.25" ry="1.5" fill="#fff" opacity="${catchA}"/>`
          : "") +
        `</g>`
      : "") +
    `</g></svg>`
  );
}
