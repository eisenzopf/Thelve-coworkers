import type { CSSProperties, ReactElement } from "react";
import type { AvatarOptions } from "./index.js";

export interface AvatarProps extends AvatarOptions {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

/**
 * Status and motion are CSS, not props — set `data-status` and the `--av-*`
 * custom properties on this element or any ancestor. See `AvatarStatus`.
 */
export declare function Avatar(props: AvatarProps): ReactElement;
