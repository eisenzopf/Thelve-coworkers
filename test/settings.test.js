import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULTS, JUMP_SECONDS, readMotion, summarise } from "../demo/motion-settings.js";

// There is no localStorage in Node, which is the same shape of failure as a
// private window or a browser with site data blocked: the page must still work.
test("falls back to the defaults when storage is unavailable", () => {
  assert.deepEqual(readMotion(), { ...DEFAULTS });
});

test("the defaults match what the library does with no attributes", () => {
  assert.equal(DEFAULTS.halos, "none", "rings are opt-in");
  assert.equal(DEFAULTS.jump, "normal");
  assert.equal(DEFAULTS.eye, 1);
});

test("every jump stop has a human label", () => {
  assert.deepEqual(Object.keys(JUMP_SECONDS), ["often", "normal", "rare", "never"]);
});

test("the summary reads as a sentence, including the off case", () => {
  assert.equal(summarise({ halos: "all", jump: "rare", eye: 1.6 }), "rings all · jump 24 s · eyes 1.6×");
  assert.equal(summarise({ halos: "none", jump: "never", eye: 0 }), "rings none · jump never · eyes off");
});
