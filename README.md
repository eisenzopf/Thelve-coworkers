# @thelve/coworkers

Soft-body avatars for AI coworkers. Fourteen shapes, fourteen hues, one inline
SVG each — no dependencies, no build step, no image assets.

<img src="docs/cast.svg" alt="The fourteen shapes: Pebble, Orb, Capsule, Squircle, Dome, Bean, Egg, Wedge, Gem, Barrel, Puff, Clover, Bumper, Spark" width="100%">

A roster of AI agents needs faces that are told apart at a glance. Colour alone
stops working the moment two of them sit next to each other in a 32 px list, or
overlap in a face pile, or land next to someone's colour-blindness. Different
*silhouettes* keep working at every size, which is the whole idea here: shape
carries identity, colour carries warmth.

## Install

```bash
npm i @thelve/coworkers
```

## Use

```js
import { avatarSVG } from "@thelve/coworkers";
import "@thelve/coworkers/avatar.css";   // optional: idle float, blink

el.innerHTML = avatarSVG({ name: "Call QA" });
```

`name` is hashed into a shape and a hue, so one coworker wears the same face on
every surface, in every session, with nothing stored anywhere.

In React:

```jsx
import { Avatar } from "@thelve/coworkers/react";
import "@thelve/coworkers/avatar.css";

<Avatar name={coworker.name} size={36} />
```

Override anything:

```js
avatarSVG({ shape: "bean", hue: 174, size: 96 })
avatarSVG({ name: "Inbox Triage", eyes: false, shadow: false })
avatarSVG({ name: "Release Notes", hue: 300 })   // same coworker, different colour
```

## Two axes: `depth` and `border`

How rendered the avatars look is a dial, not a fixed style.

```js
avatarSVG({ name: "Call QA", depth: 0 })                    // flat silhouette
avatarSVG({ name: "Call QA", depth: 0, border: 2.5 })       // sticker
avatarSVG({ name: "Call QA" })                              // rendered (default)
avatarSVG({ name: "Call QA", border: 1.5 })                 // rendered, with a contour
```

**`depth`** `0 … 1`, default `1`. Drives all six shading layers at once, each on
its own curve. Flat is not "3D turned down" — at `0` the form gradient collapses
to a solid fill and every other layer is dropped entirely, giving you a clean
designed mark (and a 2 KB SVG instead of 8 KB). Two rules shape the middle: the
specular fades out first, because it is the strongest "this is rendered" cue and
carrying it through the middle just makes mud; and gloss is highlight
*tightness*, not opacity, so the highlight shrinks and brightens as depth rises
rather than merely getting more opaque. Named stops are in `DEPTH_STOPS` —
Flat · Soft · Satin · Rendered.

**`border`** `0 … ~4`, default `0`, in viewBox units, so it scales with the
avatar. Stroked at twice the width and clipped to the silhouette, which makes it
an *inside* stroke: the outer edge never moves at any weight, so a bordered
avatar is exactly the same size as an unbordered one beside it in a list. Named
stops are in `BORDER_STOPS` — None · Hairline · Light · Medium · Heavy.

**`borderColor`** is `"contour"` by default, an ink line derived from the body
colour — self-contained and good on any ground. `"ink"` emits `currentColor`
instead, for the true cartoon outline; that is the one setting that makes an
avatar depend on its page, so set `color` on an ancestor and it follows the
theme. Any other value is used as a CSS colour verbatim.

The two axes are independent, and all four corners are places worth landing:

|  | `border: 0` | `border: 2.5` |
|---|---|---|
| **`depth: 0`** | flat silhouette mark | sticker / cartoon |
| **`depth: 1`** | the default render | render with a contour — useful on busy or photographic backgrounds |

Below about 20 px a hairline border is a fraction of a device pixel and will
shimmer or vanish, and high depth muddies a small silhouette. Both are worth a
size check rather than magic auto-behaviour.

The returned SVG carries no width or height unless you pass `size` — size the
`.av` element in CSS and it scales cleanly from 16 px to whatever you need.

## API

| Export | |
|---|---|
| `avatarSVG(options?)` | A complete, self-contained SVG element as a string. |
| `avatarFor(name)` | The `{ shape, color }` a name maps to, without rendering. |
| `SHAPES` | The fourteen shape definitions. |
| `PALETTE` | The fourteen hues, with names. |
| `buildPath(shape)` | Path data for one silhouette, normalised into a 100 × 100 box. Cached. |
| `palette(h, s, l, depth?)` | The seven colours one avatar is lit with. |
| `DEPTH_STOPS` / `BORDER_STOPS` | Named stops for building pickers. |
| `toHex(h, s, l)` | For showing a swatch value in a UI. |
| `shapeById(id)` | Lookup, falling back to Pebble on an unknown id. |

**`AvatarOptions`** — `name`, `shape`, `hue`, `sat`, `lum`, `depth`, `border`,
`borderColor`, `size`, `eyes`, `shadow`, `title`. Types ship in `index.d.ts`.

## The cast

| | | | |
|---|---|---|---|
| **Pebble** the generalist | **Orb** the classic | **Capsule** tall, narrow, tidy | **Squircle** sits square |
| **Dome** planted, unhurried | **Bean** leans in | **Egg** new on the team | **Wedge** points at things |
| **Gem** sharp, precise | **Barrel** holds a lot | **Puff** light touch | **Clover** four things at once |
| **Bumper** runs the machinery | **Spark** has an idea | | |

Hues: Coral, Tangerine, Amber, Citron, Lime, Mint, Teal, Cyan, Azure, Blue,
Indigo, Violet, Orchid, Rose.

## How it works

**One polar function per shape.** A silhouette is
`r(t) = superellipse(t, nTop → nBot) · Π (1 + aᵢ·cos(kᵢ·t + φᵢ))`, sampled and
closed with a Catmull-Rom spline. Blending the superellipse exponent from crown
to base is how Dome gets a flat bottom without a second path; the harmonics add
the lobes. A harmonic stays convex only while its amplitude is below
`1/(k²−1)` — Clover, Spark and Bean deliberately cross that line, which is what
separates their lobes instead of merely bulging them.

**Constant optical area, not a constant bounding box.** Every shape is scaled so
the area it encloses is the same, then clamped if it would overrun the box. That
is why a Spark and an Orb feel like the same size sitting next to each other.

**Four layers make it read as a solid.** A radial form gradient lit from the
upper left; a bounce rim stroked along the path and clipped to it, so only the
inner half shows; a thin key rim on the top edge; a specular that lags the body
as it floats. The bounce is the layer that does the work — it is the lightest,
most saturated colour in the set and it is hue-shifted away from the body.
`depth` scales all four; the light never changes direction, only intensity.

**Ids are derived from the appearance, not a counter**, so server and client
always agree and hydration never mismatches. The blink and float are seeded off
the name instead, so a roster drifts out of sync rather than pulsing in unison.

## Develop

```bash
npm run demo            # gallery + inspector at http://localhost:5173
npm test                # node's built-in runner, no install needed
npm run contact-sheet   # regenerate docs/cast.svg
```

The demo imports straight from `src/`, so it is a real consumer of the library
rather than a copy of it.

```
src/
  shapes.js      shape + hue tables
  geometry.js    polar function → SVG path, with a per-shape cache
  color.js       the light rig
  avatar.js      avatarSVG(), avatarFor()
  avatar.css     idle float, specular drift, blink (optional)
  react.js       optional React binding, no JSX
demo/index.html  gallery, inspector, roster
```
