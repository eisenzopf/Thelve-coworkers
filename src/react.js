/**
 * React binding. Optional — `react` is a peer dependency and this module is only
 * loaded if you import `@thelve/coworkers/react`.
 *
 * No JSX, so the package still needs no build step.
 */

import { createElement, useMemo } from "react";
import { avatarSVG } from "./avatar.js";

/**
 * @typedef {import("./avatar.js").AvatarOptions & {
 *   className?: string,
 *   style?: import("react").CSSProperties,
 * }} AvatarProps
 */

/**
 * @param {AvatarProps} props
 */
export function Avatar({
  name, shape, hue, sat, lum, depth, border, borderColor, size, eyes, shadow, title,
  className, style,
}) {
  const html = useMemo(
    () => avatarSVG({ name, shape, hue, sat, lum, depth, border, borderColor, size, eyes, shadow, title }),
    [name, shape, hue, sat, lum, depth, border, borderColor, size, eyes, shadow, title],
  );

  return createElement("span", {
    className,
    style: {
      display: "inline-flex",
      ...(size !== undefined ? { width: size, height: size } : null),
      ...style,
    },
    // The markup is built here from the arguments above; the only value that
    // reaches the DOM unescaped is `name`, which avatarSVG escapes.
    dangerouslySetInnerHTML: { __html: html },
  });
}
