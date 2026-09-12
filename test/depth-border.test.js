import test from "node:test";
import assert from "node:assert/strict";
import { avatarSVG, palette, DEPTH_STOPS, BORDER_STOPS } from "../src/index.js";

const formStops = (svg) => [...svg.matchAll(/<stop offset="[^"]*" stop-color="(hsl\([^)]*\))"\/>/g)].map((m) => m[1]);
const fillPath = (svg) => /<path d="([^"]+)" fill="url\(#f/.exec(svg)?.[1];
const attr = (svg, re) => re.exec(svg)?.[1];

test("depth 0 collapses the form gradient onto a single colour", () => {
  const stops = formStops(avatarSVG({ shape: "orb", hue: 208, depth: 0 }));
  assert.equal(stops.length, 3);
  assert.equal(new Set(stops).size, 1, "light, core and shade are the same colour");
});

test("depth 0 emits nothing but the fill and the eyes", () => {
  const flat = avatarSVG({ shape: "orb", depth: 0 });
  for (const layer of ["av-spec", "feDropShadow", 'id="b', 'id="k', 'id="s', "clipPath"]) {
    assert.ok(!flat.includes(layer), `${layer} is absent at depth 0`);
  }
  assert.ok(flat.includes("av-eyes"), "the eyes are identity, not shading");
  assert.ok(flat.length < 2500, `flat output stays small (${flat.length} bytes)`);
});

test("the tonal spread widens monotonically with depth", () => {
  const spread = (d) => {
    const [light, , shade] = formStops(avatarSVG({ shape: "orb", hue: 208, depth: d })).map((c) =>
      Number(/,\s*([\d.]+)%\)$/.exec(c)[1]),
    );
    return light - shade;
  };
  const values = [0, 0.25, 0.5, 0.75, 1].map(spread);
  assert.equal(values[0], 0);
  for (let i = 1; i < values.length; i++) {
    assert.ok(values[i] > values[i - 1], `spread grows at step ${i}: ${values.join(" < ")}`);
  }
});

test("each layer fades on its own curve", () => {
  // The specular is the strongest "this is rendered" cue, so it goes first;
  // the crisp dot arrives later still. Keeping either through the middle of the
  // slider is what makes the mid-range look like mud rather than a matte finish.
  assert.ok(!avatarSVG({ shape: "orb", depth: 0.2 }).includes("av-spec"), "no specular at 0.2");
  assert.ok(avatarSVG({ shape: "orb", depth: 0.5 }).includes("av-spec"), "specular by 0.5");
  assert.ok(!avatarSVG({ shape: "orb", depth: 0.5 }).includes('rx="3.5"'), "no crisp dot at 0.5");
  assert.ok(avatarSVG({ shape: "orb", depth: 0.8 }).includes('rx="3.5"'), "crisp dot by 0.8");
});

test("gloss is highlight tightness, not opacity", () => {
  const scale = (d) => Number(/scale\(([\d.]+)\)/.exec(avatarSVG({ shape: "orb", depth: d }))[1]);
  assert.ok(scale(1) < scale(0.6), "the highlight tightens as depth rises");
});

test("the border never moves the silhouette", () => {
  const base = fillPath(avatarSVG({ shape: "spark" }));
  for (const { value } of BORDER_STOPS) {
    assert.equal(fillPath(avatarSVG({ shape: "spark", border: value })), base, `border ${value}`);
  }
});

test("the border is stroked at twice its width and clipped inward", () => {
  const svg = avatarSVG({ shape: "orb", hue: 208, border: 2.5 });
  const contour = /<path d="[^"]+" fill="none" stroke="(hsl\([^)]*\))" stroke-width="([\d.]+)"\/><\/g>/.exec(svg);
  assert.ok(contour, "the contour is the last layer inside the clip group");
  assert.equal(contour[2], "5", "2.5 units of visible line needs a 5-unit centred stroke");
});

test("border 0 draws no contour", () => {
  assert.ok(!/stroke="hsl[^"]*" stroke-width/.test(avatarSVG({ shape: "orb", border: 0 })));
});

test("borderColor picks between self-contained and theme-following", () => {
  assert.ok(avatarSVG({ shape: "orb", border: 2 }).includes('stroke="hsl('), "contour is self-contained");
  assert.ok(avatarSVG({ shape: "orb", border: 2, borderColor: "ink" }).includes('stroke="currentColor"'));
  assert.ok(avatarSVG({ shape: "orb", border: 2, borderColor: "#ff0066" }).includes('stroke="#ff0066"'));
});

test("depth and border are independent axes", () => {
  // All four corners of the 2×2 render, and none of them collide.
  const corners = [
    { depth: 0, border: 0 },
    { depth: 0, border: 2.5 },
    { depth: 1, border: 0 },
    { depth: 1, border: 2.5 },
  ].map((o) => avatarSVG({ shape: "pebble", hue: 208, ...o }));
  assert.equal(new Set(corners).size, 4, "each corner is a distinct render");
});

test("both axes are part of the id key, so nothing cross-paints", () => {
  const id = (svg) => /id="f([a-z0-9]+)"/.exec(svg)[1];
  const ids = [
    avatarSVG({ shape: "orb", hue: 208 }),
    avatarSVG({ shape: "orb", hue: 208, depth: 0.5 }),
    avatarSVG({ shape: "orb", hue: 208, border: 2 }),
    avatarSVG({ shape: "orb", hue: 208, border: 2, borderColor: "ink" }),
  ].map(id);
  assert.equal(new Set(ids).size, 4);
});

test("depth reaches the stylesheet for the specular drift", () => {
  assert.match(avatarSVG({ shape: "orb", depth: 0.6 }), /style="--av-depth:0\.6"/);
});

test("the default render is unchanged", () => {
  // Depth 1 with no border must still be exactly the look the kit shipped with.
  const svg = avatarSVG({ shape: "orb", hue: 208 });
  assert.equal(attr(svg, /stroke="url\(#b[a-z0-9]+\)" stroke-width="([\d.]+)"/), "16");
  assert.equal(attr(svg, /stroke="url\(#k[a-z0-9]+\)" stroke-width="([\d.]+)"/), "8");
  assert.equal(attr(svg, /<radialGradient id="f[a-z0-9]+" cx="34%" cy="25%" r="([\d.]+)%"/), "72");
  assert.match(svg, /<feDropShadow dx="0" dy="3\.5" stdDeviation="3\.2" [^>]*flood-opacity="0\.34"/);
  assert.match(svg, /<stop offset="0" stop-color="#fff" stop-opacity="0\.82"\/>/);
  assert.match(svg, /opacity="0\.78"/);
  assert.match(svg, /scale\(1\)/);
});

test("the named stops span each axis end to end", () => {
  assert.equal(DEPTH_STOPS[0].value, 0);
  assert.equal(DEPTH_STOPS.at(-1).value, 1);
  assert.equal(BORDER_STOPS[0].value, 0);
  for (const stops of [DEPTH_STOPS, BORDER_STOPS]) {
    const values = stops.map((s) => s.value);
    assert.deepEqual(values, [...values].sort((a, b) => a - b), "stops are ordered");
  }
});

test("contour is independent of depth", () => {
  const contour = (d) => /stroke="(hsl\([^)]*\))" stroke-width="4"/.exec(avatarSVG({ shape: "orb", hue: 208, depth: d, border: 2 }))[1];
  assert.equal(contour(0), contour(1), "the outline does not fade with the shading");
});

test("palette exposes a contour role at every depth", () => {
  for (const d of [0, 0.5, 1]) {
    assert.match(palette(208, 82, 56, d).contour, /^hsl\(\d+, [\d.]+%, [\d.]+%\)$/);
  }
});
