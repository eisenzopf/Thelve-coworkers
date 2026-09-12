import test from "node:test";
import assert from "node:assert/strict";
import { avatarSVG, palette, DEPTH_STOPS } from "../src/index.js";

const formStops = (svg) => [...svg.matchAll(/<stop offset="[^"]*" stop-color="(hsl\([^)]*\))"\/>/g)].map((m) => m[1]);
const attr = (svg, re) => re.exec(svg)?.[1];

test("depth 0 collapses the form gradient onto a single colour", () => {
  const stops = formStops(avatarSVG({ shape: "orb", hue: 208, depth: 0 }));
  assert.equal(stops.length, 3);
  assert.equal(new Set(stops).size, 1, "light, core and shade are the same colour");
});

test("the palette dims without shifting hue", () => {
  // Only light and shade collapse onto core; rim, cast and eye keep their
  // colour and lose opacity instead, which is what a dimming light does.
  for (const role of ["rim", "cast", "eye"]) {
    assert.equal(palette(208, 82, 56, 0)[role], palette(208, 82, 56, 1)[role], role);
  }
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

test("depth is part of the id key, so nothing cross-paints", () => {
  const id = (svg) => /id="f([a-z0-9]+)"/.exec(svg)[1];
  const ids = [0, 0.3, 0.6, 1].map((d) => id(avatarSVG({ shape: "orb", hue: 208, depth: d })));
  assert.equal(new Set(ids).size, 4);
});

test("depth reaches the stylesheet for the specular drift", () => {
  assert.match(avatarSVG({ shape: "orb", depth: 0.6 }), /--av-depth:0\.6/);
});

test("the default render is unchanged", () => {
  // Depth 1 must still be exactly the look the kit shipped with.
  const svg = avatarSVG({ shape: "orb", hue: 208 });
  assert.equal(attr(svg, /stroke="url\(#b[a-z0-9]+\)" stroke-width="([\d.]+)"/), "16");
  assert.equal(attr(svg, /stroke="url\(#k[a-z0-9]+\)" stroke-width="([\d.]+)"/), "8");
  assert.equal(attr(svg, /<radialGradient id="f[a-z0-9]+" cx="34%" cy="25%" r="([\d.]+)%"/), "72");
  assert.match(svg, /<feDropShadow dx="0" dy="3\.5" stdDeviation="3\.2" [^>]*flood-opacity="0\.34"/);
  assert.match(svg, /<stop offset="0" stop-color="#fff" stop-opacity="0\.82"\/>/);
  assert.match(svg, /opacity="0\.78"/);
  assert.match(svg, /scale\(1\)/);
});

test("the named stops span the axis end to end", () => {
  assert.equal(DEPTH_STOPS[0].value, 0);
  assert.equal(DEPTH_STOPS.at(-1).value, 1);
  const values = DEPTH_STOPS.map((d) => d.value);
  assert.deepEqual(values, [...values].sort((a, b) => a - b), "stops are ordered");
});

