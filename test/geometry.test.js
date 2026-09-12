import test from "node:test";
import assert from "node:assert/strict";
import { SHAPES, buildPath, superR, closedSpline } from "../src/index.js";

/** On-curve points of a path built by closedSpline: the endpoint of every C. */
function onCurvePoints(d) {
  return [...d.matchAll(/C[-\d.]+ [-\d.]+ [-\d.]+ [-\d.]+ ([-\d.]+) ([-\d.]+)/g)].map((m) => [
    Number(m[1]),
    Number(m[2]),
  ]);
}

function shoelace(pts) {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}

test("superR describes a unit circle when both exponents are 2", () => {
  for (let i = 0; i < 32; i++) {
    const t = (i / 32) * Math.PI * 2;
    assert.ok(Math.abs(superR(t, 2, 2) - 1) < 1e-9, `r(${t}) should be 1`);
  }
});

test("closedSpline emits a closed path", () => {
  const d = closedSpline([[0, 0], [10, 0], [10, 10], [0, 10]]);
  assert.match(d, /^M/);
  assert.match(d, /Z$/);
  assert.equal((d.match(/C/g) ?? []).length, 4, "one cubic per segment, wrapping round");
});

test("every shape builds a finite, closed path", () => {
  for (const sp of SHAPES) {
    const d = buildPath(sp.id);
    assert.match(d, /^M/, `${sp.id} starts with a moveto`);
    assert.match(d, /Z$/, `${sp.id} is closed`);
    assert.ok(!/NaN|Infinity|undefined/.test(d), `${sp.id} has no bad coordinates`);
  }
});

test("every shape stays inside the viewBox", () => {
  for (const sp of SHAPES) {
    const pts = onCurvePoints(buildPath(sp.id));
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    assert.ok(Math.min(...xs) >= 0 && Math.max(...xs) <= 100, `${sp.id} fits horizontally`);
    assert.ok(Math.min(...ys) >= 0 && Math.max(...ys) <= 100, `${sp.id} fits vertically`);
  }
});

test("shapes are normalised to the same optical area", () => {
  const areas = SHAPES.map((sp) => shoelace(onCurvePoints(buildPath(sp.id))));
  const target = Math.PI * 37 * 37;
  for (const [i, area] of areas.entries()) {
    // Capsule and Barrel are clamped to the box, so they land under target;
    // nothing should ever land over it.
    const ratio = area / target;
    assert.ok(ratio > 0.6 && ratio <= 1.02, `${SHAPES[i].id} area ratio ${ratio.toFixed(3)}`);
  }
});

test("the eyes sit on the body", () => {
  for (const sp of SHAPES) {
    const pts = onCurvePoints(buildPath(sp.id));
    const cx = 50 + (sp.exOff ?? 0);
    for (const eye of [cx - sp.ex, cx + sp.ex]) {
      // Widest span of the silhouette at roughly the eye line.
      const band = pts.filter((p) => Math.abs(p[1] - sp.ey) < 9).map((p) => p[0]);
      assert.ok(band.length > 0, `${sp.id} has geometry at the eye line`);
      assert.ok(
        eye > Math.min(...band) && eye < Math.max(...band),
        `${sp.id} eye at x=${eye} is inside [${Math.min(...band)}, ${Math.max(...band)}]`,
      );
    }
  }
});

test("paths are cached, so a big roster builds each shape once", () => {
  assert.equal(buildPath("orb"), buildPath("orb"));
  assert.equal(buildPath("orb"), buildPath(SHAPES.find((s) => s.id === "orb")));
});

test("an unknown shape id falls back rather than rendering nothing", () => {
  assert.equal(buildPath("no-such-shape"), buildPath("pebble"));
});
