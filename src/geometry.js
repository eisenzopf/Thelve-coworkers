/**
 * Turning a shape definition into an SVG path.
 *
 * The whole silhouette is one closed cubic spline through points sampled off a
 * polar function. Paths are cached by shape id — they never vary with colour or
 * size, so a roster of a hundred avatars builds fourteen of them at most.
 */

import { shapeById } from "./shapes.js";

const TAU = Math.PI * 2;

/** The optical area every shape is normalised to: a circle of radius 37. */
const TARGET_AREA = Math.PI * 37 * 37;

/** Widest a normalised shape may get before it is scaled back to fit. */
const MAX_EXTENT = 94;

/** @param {number} n */
const r2 = (n) => Math.round(n * 100) / 100;

/**
 * Index a list with wraparound, so a spline can walk off either end.
 * @template T
 * @param {readonly T[]} list
 * @param {number} i
 * @returns {T}
 */
function wrap(list, i) {
  const n = list.length;
  const v = list[((i % n) + n) % n];
  if (v === undefined) throw new RangeError("cannot wrap an empty list");
  return v;
}

/**
 * Radius of a superellipse whose exponent blends from `nTop` at the crown to
 * `nBot` at the base. Blending rather than switching keeps the tangent
 * continuous where the two halves meet.
 *
 * @param {number} t      angle in radians, 0 = right, π/2 = bottom (y grows down)
 * @param {number} nTop
 * @param {number} nBot
 */
export function superR(t, nTop, nBot) {
  const k = 0.5 + 0.5 * Math.sin(t);
  const n = nTop + (nBot - nTop) * k;
  const c = Math.abs(Math.cos(t));
  const s = Math.abs(Math.sin(t));
  return 1 / Math.pow(Math.pow(c, n) + Math.pow(s, n), 1 / n);
}

/**
 * A closed Catmull-Rom spline, emitted as cubic Béziers. The 1/6 factor is the
 * standard uniform Catmull-Rom to Bézier conversion.
 *
 * @param {readonly (readonly [number, number])[]} pts
 * @returns {string} SVG path data
 */
export function closedSpline(pts) {
  const first = wrap(pts, 0);
  const out = [`M${r2(first[0])} ${r2(first[1])}`];
  for (let i = 0; i < pts.length; i++) {
    const a = wrap(pts, i - 1);
    const b = wrap(pts, i);
    const c = wrap(pts, i + 1);
    const d = wrap(pts, i + 2);
    out.push(
      `C${r2(b[0] + (c[0] - a[0]) / 6)} ${r2(b[1] + (c[1] - a[1]) / 6)}` +
        ` ${r2(c[0] - (d[0] - b[0]) / 6)} ${r2(c[1] - (d[1] - b[1]) / 6)}` +
        ` ${r2(c[0])} ${r2(c[1])}`,
    );
  }
  return out.join("") + "Z";
}

/** @type {Map<string, string>} */
const pathCache = new Map();

/**
 * Build the path for a shape, normalised to a constant optical area and centred
 * in the 100 × 100 viewBox. Area normalisation — rather than fitting each
 * silhouette to the box — is what keeps a Spark and an Orb feeling like the same
 * size when they sit next to each other in a list.
 *
 * @param {string | import("./shapes.js").ShapeDef} shape  shape id or definition
 * @returns {string} SVG path data
 */
export function buildPath(shape) {
  const sp = typeof shape === "string" ? shapeById(shape) : shape;
  const cached = pathCache.get(sp.id);
  if (cached !== undefined) return cached;

  // Enough samples to resolve the fastest harmonic: seven per period.
  const maxK = (sp.harm ?? []).reduce((m, h) => Math.max(m, h[0]), 2);
  const steps = Math.max(40, Math.ceil(maxK * 7));

  /** @type {[number, number][]} */
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const t = (i / steps) * TAU;
    let r = superR(t, sp.nTop, sp.nBot);
    for (const [k, amp, phase] of sp.harm ?? []) r *= 1 + amp * Math.cos(k * t + phase);
    const taper = 1 + (sp.taper ?? 0) * Math.sin(t);
    pts.push([r * Math.cos(t) * (sp.sx ?? 1) * taper, r * Math.sin(t) * (sp.sy ?? 1)]);
  }

  // Shoelace area of the sampled polygon.
  let area = 0;
  for (let i = 0; i < steps; i++) {
    const a = wrap(pts, i);
    const b = wrap(pts, i + 1);
    area += a[0] * b[1] - b[0] * a[1];
  }
  area = Math.abs(area) / 2;

  const k = Math.sqrt(TARGET_AREA / area);
  let xs = pts.map((p) => p[0] * k);
  let ys = pts.map((p) => p[1] * k);

  // A very elongated shape can still overrun the box once it has the right area.
  const fit = Math.min(
    MAX_EXTENT / (Math.max(...xs) - Math.min(...xs)),
    MAX_EXTENT / (Math.max(...ys) - Math.min(...ys)),
    1,
  );
  if (fit < 1) {
    xs = xs.map((v) => v * fit);
    ys = ys.map((v) => v * fit);
  }

  // Centre on (50, 52): a shade above centre, leaving room for the cast shadow.
  const ox = 50 - (Math.max(...xs) + Math.min(...xs)) / 2;
  const oy = 52 - (Math.max(...ys) + Math.min(...ys)) / 2;

  const d = closedSpline(xs.map((x, i) => [x + ox, wrap(ys, i) + oy]));
  pathCache.set(sp.id, d);
  return d;
}
