/**
 * One motion setting, shared by both demo pages.
 *
 * Tuning on the status page is meant to be a real answer, not a toy, so it
 * persists and the gallery picks it up. Stored per viewer in localStorage —
 * which can throw outright in a private window or with site data blocked, so
 * every access is guarded and a failure just falls back to the defaults.
 */

const KEY = "thelve-coworkers:motion";

/** The library's own defaults. Anything equal to these is not worth storing. */
export const DEFAULTS = Object.freeze({ halos: "none", jump: "normal", eye: 1 });

export const JUMP_SECONDS = Object.freeze({ often: "6 s", normal: "12 s", rare: "24 s", never: "never" });

/** @returns {{halos: string, jump: string, eye: number}} */
export function readMotion() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const v = JSON.parse(raw);
    return {
      halos: ["none", "needs", "all"].includes(v.halos) ? v.halos : DEFAULTS.halos,
      jump: Object.keys(JUMP_SECONDS).includes(v.jump) ? v.jump : DEFAULTS.jump,
      eye: Number.isFinite(v.eye) ? Math.min(Math.max(v.eye, 0), 2) : DEFAULTS.eye,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeMotion(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* private window, or site data blocked — the page still works, it just forgets */
  }
}

/** Put the setting onto an element; everything inside it inherits. */
export function applyMotion(el, state = readMotion()) {
  el.dataset.avHalos = state.halos;
  el.dataset.avJump = state.jump;
  el.style.setProperty("--av-eye-rate", state.eye || 1);
  // Rate 0 is an off switch, not a division by zero — and switching it off
  // returns the eyes to their gaze rest position instead of freezing mid-jump.
  if (state.eye === 0) el.dataset.avOff = "eyes";
  else delete el.dataset.avOff;
  return state;
}

/** Fires when another tab changes the setting. */
export function onMotionChange(fn) {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) fn(readMotion());
  });
}

export function summarise(state) {
  const eye = state.eye === 0 ? "eyes off" : `eyes ${state.eye.toFixed(1)}×`;
  return `rings ${state.halos} · jump ${JUMP_SECONDS[state.jump]} · ${eye}`;
}
