import type { CSSProperties, ReactElement } from "react";
import type { AvatarOptions } from "./index.js";

export interface AvatarProps extends AvatarOptions {
  className?: string | undefined;
  style?: CSSProperties | undefined;
}

export declare function Avatar(props: AvatarProps): ReactElement;
