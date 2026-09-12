import test from "node:test";
import assert from "node:assert/strict";
import { SHAPES, PALETTE, avatarSVG, avatarFor, palette, toHex } from "../src/index.js";

test("returns one self-contained svg element", () => {
  const svg = avatarSVG({ name: "Call QA" });
  assert.match(svg, /^<svg /);
  assert.match(svg, /<\/svg>$/);
  assert.equal((svg.match(/<svg/g) ?? []).length, 1);
  assert.ok(!svg.includes("url(#undefined"), "every paint reference resolves");
});

test("a name always picks the same face", () => {
  const a = avatarFor("Simulation Runner");
  const b = avatarFor("Simulation Runner");
  assert.deepEqual(a, b);
  assert.notDeepEqual(avatarFor("Simulation Runner"), avatarFor("Inbox Triage"));
});

test("output is byte-identical between calls, so SSR and the client agree", () => {
  const first = avatarSVG({ name: "Knowledge Sync" });
  avatarSVG({ name: "something else entirely" }); // would bump a counter
  assert.equal(avatarSVG({ name: "Knowledge Sync" }), first);
});

test("ids are namespaced per appearance, so two avatars never cross-paint", () => {
  const ids = (svg) => [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
  const a = ids(avatarSVG({ shape: "orb", hue: 6 }));
  const b = ids(avatarSVG({ shape: "orb", hue: 208 }));
  assert.equal(a.length, 6, "clip, three gradients, one specular, one filter");
  assert.equal(new Set([...a, ...b]).size, a.length + b.length, "no id is shared");
});

test("a name is escaped before it reaches the DOM", () => {
  const svg = avatarSVG({ name: '"><script>alert(1)</script>' });
  assert.ok(!svg.includes("<script>"), "no raw markup survives");
  assert.match(svg, /aria-label="&quot;&gt;&lt;script&gt;/);
});

test("every shape renders in every hue", () => {
  for (const sp of SHAPES) {
    for (const hue of PALETTE) {
      const svg = avatarSVG({ shape: sp.id, hue: hue.h, sat: hue.s, lum: hue.l });
      assert.ok(svg.length > 500, `${sp.id}/${hue.name} produced markup`);
      assert.ok(!svg.includes("NaN"), `${sp.id}/${hue.name} has no NaN`);
    }
  }
});

test("eyes and shadow can be turned off", () => {
  assert.ok(avatarSVG({ shape: "orb" }).includes("av-eyes"));
  assert.ok(!avatarSVG({ shape: "orb", eyes: false }).includes("av-eyes"));
  assert.ok(avatarSVG({ shape: "orb" }).includes("feDropShadow"));
  assert.ok(!avatarSVG({ shape: "orb", shadow: false }).includes("feDropShadow"));
});

test("size sets attributes; omitting it leaves sizing to CSS", () => {
  const openTag = (svg) => svg.slice(0, svg.indexOf(">") + 1);
  assert.match(openTag(avatarSVG({ shape: "orb", size: 40 })), / width="40" height="40"/);
  assert.doesNotMatch(openTag(avatarSVG({ shape: "orb" })), / width=/);
});

test("an explicit hue is not silently paired with a hashed saturation", () => {
  // "this coworker, but purple" should land on a good purple, not on whatever
  // saturation and lightness the name's own hue happened to be tuned for.
  assert.equal(
    avatarSVG({ name: "Call QA", hue: 300 }),
    avatarSVG({ name: "Call QA", hue: 300, sat: 78, lum: 56 }),
  );
  assert.notEqual(avatarSVG({ name: "Call QA" }), avatarSVG({ name: "Call QA", hue: 300 }));
});

test("the palette lights every hue without clipping", () => {
  for (const { h, s, l } of PALETTE) {
    const p = palette(h, s, l);
    for (const [role, value] of Object.entries(p)) {
      assert.match(value, /^hsl\(\d+(\.\d+)?, [\d.]+%, [\d.]+%\)$/, `${role} is a valid hsl()`);
    }
  }
});

test("toHex round-trips the palette to six digits", () => {
  assert.equal(toHex(0, 0, 100), "#FFFFFF");
  assert.equal(toHex(0, 0, 0), "#000000");
  for (const { h, s, l } of PALETTE) assert.match(toHex(h, s, l), /^#[0-9A-F]{6}$/);
});
