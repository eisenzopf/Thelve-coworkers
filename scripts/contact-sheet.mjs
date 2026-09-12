/** Regenerates docs/cast.svg — the strip of all fourteen shapes used in the
    README. Also the simplest proof the library runs with no DOM at all. */

import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SHAPES, PALETTE, avatarSVG } from "../src/index.js";

const CELL = 100;
const GAP = 8;
const width = SHAPES.length * (CELL + GAP) - GAP;

const cells = SHAPES.map((shape, i) => {
  const hue = PALETTE[i % PALETTE.length];
  const inner = avatarSVG({ shape: shape.id, hue: hue.h, sat: hue.s, lum: hue.l })
    // The nested <svg> carries the placement; drop the outer element's own attrs.
    .replace(/^<svg[^>]*>/, `<svg x="${i * (CELL + GAP)}" y="0" width="${CELL}" height="${CELL}" viewBox="0 0 100 100" overflow="visible">`);
  return inner;
}).join("");

const sheet =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${CELL}" width="${width}" height="${CELL}" role="img" aria-label="The fourteen Coworker Cast shapes">` +
  cells +
  `</svg>\n`;

await writeFile(fileURLToPath(new URL("../docs/cast.svg", import.meta.url)), sheet);
console.log(`docs/cast.svg — ${SHAPES.length} shapes, ${sheet.length} bytes`);
