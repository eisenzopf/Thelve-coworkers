/** Soft-body avatars for AI coworkers. */

export type Harmonic = readonly [frequency: number, amplitude: number, phase: number];

export interface ShapeDef {
  readonly id: string;
  readonly name: string;
  /** Superellipse exponent at the crown. 2 is a circle; higher flattens. */
  readonly nTop: number;
  /** Superellipse exponent at the base. */
  readonly nBot: number;
  readonly sx?: number;
  readonly sy?: number;
  readonly harm?: readonly Harmonic[];
  readonly taper?: number;
  /** Half the distance between the eyes, in viewBox units. */
  readonly ex: number;
  /** Eye centre line, in viewBox units. */
  readonly ey: number;
  readonly exOff?: number;
  readonly spec?: number;
  readonly blurb: string;
}

export interface Hue {
  readonly name: string;
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

export interface AvatarPalette {
  readonly light: string;
  readonly core: string;
  readonly shade: string;
  readonly rim: string;
  readonly eye: string;
  readonly cast: string;
}

export interface AvatarOptions {
  /** Derives shape and hue when they are not given. */
  name?: string | undefined;
  /** Shape id, e.g. `"bean"`. Unknown ids fall back to `"pebble"`. */
  shape?: string | undefined;
  /** 0–359. Passing this uses the default saturation and lightness unless you also pass `sat`/`lum`. */
  hue?: number | undefined;
  sat?: number | undefined;
  lum?: number | undefined;
  /** Sets width/height attributes. Omit and size the `.av` element in CSS. */
  size?: number | undefined;
  /** Default true. */
  eyes?: boolean | undefined;
  /** Default true. */
  shadow?: boolean | undefined;
  /** Accessible name; falls back to `name`, then to the shape. */
  title?: string | undefined;
}

export declare const SHAPES: readonly ShapeDef[];
export declare const PALETTE: readonly Hue[];

export declare function shapeById(id?: string): ShapeDef;
export declare function superR(t: number, nTop: number, nBot: number): number;
export declare function closedSpline(points: readonly (readonly [number, number])[]): string;
/** SVG path data for a shape, normalised into a 100 × 100 viewBox. Cached per shape. */
export declare function buildPath(shape: string | ShapeDef): string;
export declare function palette(h: number, s: number, l: number): AvatarPalette;
export declare function toHex(h: number, s: number, l: number): string;

/** The stable shape and hue a given name maps to. */
export declare function avatarFor(name: string): { shape: ShapeDef; color: Hue };

/** A complete, self-contained SVG element as a string. */
export declare function avatarSVG(options?: AvatarOptions): string;
