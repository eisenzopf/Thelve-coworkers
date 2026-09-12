import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { avatarSVG, phaseFor } from "../src/index.js";

const CSS = readFileSync(new URL("../src/avatar.css", import.meta.url), "utf8");
const ROSTER = ["Call QA", "Simulation Runner", "Knowledge Sync", "Release Notes", "Inbox Triage", "Pipeline Watch"];

test("a name always lands on the same phase", () => {
  assert.equal(phaseFor("Call QA"), phaseFor("Call QA"));
  assert.notEqual(phaseFor("Call QA"), phaseFor("Inbox Triage"));
});

test("phases are a fraction of a cycle, not a number of seconds", () => {
  // This is the whole point: a fraction rescales with whatever duration it is
  // applied to, so turning the motion rate up cannot slide a roster back into
  // step. An absolute delay would.
  for (const n of ROSTER) {
    const p = phaseFor(n);
    assert.ok(p >= 0 && p < 1, `${n} -> ${p} is within one cycle`);
  }
});

test("a realistic roster spreads across the cycle", () => {
  const phases = ROSTER.map(phaseFor).sort((a, b) => a - b);
  assert.equal(new Set(phases).size, phases.length, "no two coworkers share a phase");
  const worst = Math.min(...phases.slice(1).map((p, i) => p - phases[i]));
  assert.ok(worst > 0.04, `closest pair is ${worst.toFixed(3)} apart: ${phases.join(", ")}`);
});

test("an explicit phase spreads a known roster exactly", () => {
  // Hashing is stable but stateless, so it cannot guarantee spacing: among a
  // dozen names the closest pair lands around 1/n² apart. A caller that knows
  // the whole roster can space it by index instead.
  const spread = ROSTER.map((name, i) =>
    /--av-phase:([\d.]+)/.exec(avatarSVG({ name, phase: i / ROSTER.length }))[1]);
  assert.deepEqual(spread.map(Number), [0, 0.167, 0.333, 0.5, 0.667, 0.833].map((v, i) => i / ROSTER.length));
  assert.equal(new Set(spread).size, ROSTER.length);
});

test("the SVG carries the phase and no baked-in delay", () => {
  const svg = avatarSVG({ name: "Call QA" });
  assert.match(svg, /--av-phase:[\d.]+/);
  assert.ok(!svg.includes("animation-delay"), "timing belongs to the stylesheet");
});

test("the eyes get their own group to look with", () => {
  // Gaze and scanning drive `transform`; the blink drives scaleY. One element
  // cannot run both, so .av-look wraps .av-eyes.
  const svg = avatarSVG({ name: "Call QA" });
  const look = svg.indexOf('class="av-look"');
  const eyes = svg.indexOf('class="av-eyes"');
  assert.ok(look !== -1 && eyes > look, ".av-look wraps .av-eyes");
  assert.equal((svg.match(/<g[ >]/g) ?? []).length, (svg.match(/<\/g>/g) ?? []).length, "groups balance");
});

test("rings are opt-in, and take their colour from the page", () => {
  const svg = avatarSVG({ name: "Call QA" });
  assert.match(svg, /<circle class="av-halo"[^>]*stroke="currentColor"/);
  assert.match(CSS, /\.av-halo\s*\{[^}]*display:\s*none/, "hidden by default");
  // Nothing shows a ring until a container asks for one.
  const shown = CSS.match(/\[data-av-halos="(all|needs)"\][^,{]*\.av-halo/g) ?? [];
  assert.ok(shown.length >= 3, "all and needs-only both opt in");
  assert.ok(!/^\[data-status="(working|needs)"\] \.av-halo \{[^}]*display: block/m.test(CSS),
    "status alone never turns a ring on");
});

test("the jump keeps its speed and only changes how often it happens", () => {
  // Scaling the cycle would stretch the jump itself. Each interval instead gets
  // keyframes whose percentages put the same 660 ms of movement in a longer gap.
  const found = [...CSS.matchAll(/@keyframes av-(hop|squash)-(\d+) \{([\s\S]*?)\n\}/g)];
  assert.ok(found.length === 6, `three intervals x two tracks, got ${found.length}`);
  for (const [, track, secs, body] of found) {
    const stops = [...body.matchAll(/^\s*([\d.]+)%/gm)].map((m) => Number(m[1])).filter((v) => v < 100);
    const active = (Math.max(...stops) / 100) * Number(secs);
    assert.ok(Math.abs(active - 0.66) < 0.005,
      `av-${track}-${secs}: active window is ${active.toFixed(3)}s, expected 0.66s`);
  }
});

test("the interval stops are ordered, with an off switch", () => {
  for (const [name, secs] of [["often", 6], ["normal", 12], ["rare", 24]]) {
    const rule = new RegExp(`\\[data-av-jump="${name}"\\][^{]*\\{[^}]*--av-cycle: ${secs}s`);
    if (name !== "normal") assert.match(CSS, rule, `${name} is ${secs}s`);
  }
  assert.match(CSS, /\[data-av-jump="never"\] \[data-status="needs"\] \.av-body \{ animation: none/);
});

test("the lean tracks the eye rate, not a body rate", () => {
  // The lean exists only to follow the gaze. On a separate tempo the head would
  // stop turning with the eyes, which is the whole effect.
  const lean = /\[data-status="working"\] \.av-body \{([\s\S]*?)\n\}/.exec(CSS)[1];
  assert.match(lean, /--av-cycle-lean: calc\(8\.5s \/ var\(--av-eye-rate/);
  const scan = /\[data-status="working"\] \.av-look \{([\s\S]*?)\n\}/.exec(CSS)[1];
  assert.match(scan, /--av-cycle: calc\(8\.5s \/ var\(--av-eye-rate/);
});

test("--av-body-rate is gone; ambient drift is not a knob", () => {
  assert.ok(!CSS.includes("--av-body-rate"), "no leftover body-rate references");
});

test("every animated rule also sets a phase-derived delay", () => {
  // The bug this guards: a rule that sets `animation` without a delay puts every
  // coworker on that animation in lockstep.
  const rules = CSS.split("}").filter((r) => /\banimation:\s*av-/.test(r));
  assert.ok(rules.length >= 8, `found ${rules.length} animated rules`);
  for (const r of rules) {
    const sel = r.split("{")[0].trim().replace(/\s+/g, " ");
    if (/animation:\s*none/.test(r)) continue;
    assert.match(r, /animation-delay:\s*calc\(var\(--av-phase/, `${sel} offsets by phase`);
  }
});

test("every animated rule reads its rate where it is used", () => {
  // --av-cycle declared at :root would bake in the rate there; declared on the
  // element that uses it, an override on any ancestor still works.
  for (const r of CSS.split("}").filter((x) => /--av-cycle:/.test(x))) {
    assert.match(r, /animation:/, "the cycle is declared beside the animation that uses it");
  }
});

test("reduced motion keeps the rings but stops the movement", () => {
  const block = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(CSS);
  assert.ok(block, "there is a reduced-motion block");
  assert.match(block[1], /animation: none !important/);
  assert.ok(!/display:\s*none/.test(block[1]), "the ring survives — motion is never the only channel");
});

test("the three statuses differ in ring form, not only colour", () => {
  const working = /\[data-status="working"\] \.av-halo \{([\s\S]*?)\}/.exec(CSS)[1];
  const needs = /\[data-status="needs"\] \.av-halo \{([\s\S]*?)\}/.exec(CSS)[1];
  assert.match(working, /stroke-dasharray/, "working is dashed");
  assert.ok(!/stroke-dasharray/.test(needs), "needs-you is solid");
  assert.match(CSS, /\[data-status="idle"\] \.av-halo \{ display: none/, "idle has no ring");
});
