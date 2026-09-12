# @thelve/coworkers

Soft-body avatar kit for AI coworker UIs. Plain ESM JavaScript, zero runtime
dependencies, no build step — that constraint is the point of the package, so
don't introduce a bundler, a transpiler or a runtime dep without a reason that
outweighs it. Types are hand-written in `index.d.ts` / `react.d.ts` and must be
updated alongside any API change.

## Commands

```bash
npm test                # node --test, no install required
npm run demo            # http://localhost:5173
npm run contact-sheet   # regenerate docs/cast.svg after changing shapes or hues
```

## Things that are easy to get wrong

- **Harmonic amplitudes.** A harmonic of frequency `k` stays convex only below
  `1/(k²−1)`. Crossing it is deliberate for Clover, Spark and Bean and a bug
  anywhere else — it turns a bulge into a pinch.
- **Shapes are normalised by area, not bounding box** (`TARGET_AREA` in
  `geometry.js`). Changing that makes narrow shapes look smaller than round ones
  in a list. `MAX_EXTENT` then clamps anything that still overruns the viewBox.
- **Gradient ids must stay content-derived.** A counter would break React
  hydration. The animation delay is seeded off the name instead, on purpose.
- **`name` is escaped before it reaches the markup.** The output is injected as
  HTML by consumers, so anything interpolated into the SVG needs `esc()`.
- **`depth` scales opacity, not colour, for `rim`/`cast`/`eye`** — a dimming
  light does not change hue. Only `light` and `shade` collapse onto `core`.
- **Each depth layer has its own curve** (`ramp()` in `avatar.js`), not one
  shared multiplier. The specular starting at 0.25 and the crisp dot at 0.55 are
  what keep the mid-range looking matte rather than like a faded render.
- **Anything that changes the look must join the id key** in `avatarSVG`. Miss
  one and two avatars that should differ will share a gradient.
- **`buildPath` is cached per shape id.** Shape definitions are effectively
  immutable at runtime; mutating one after first render will not take effect.

## Tests

`test/geometry.test.js` re-derives the on-curve points from the emitted path and
checks the invariants directly — everything fits the viewBox, areas match, the
eyes land on the body. If you add a shape, those tests cover it automatically;
add it to `SHAPES` and run `npm test` before eyeballing anything.
