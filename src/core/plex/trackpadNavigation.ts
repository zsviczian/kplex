/** Bounded zoom sensitivity shared by trackpad and touchscreen pinches on the canvas. */
export const TRACKPAD_PINCH_SENSITIVITY = {min: 0.25, max: 10, step: 0.25, default: 5} as const;

/** Use the default for absent or malformed settings and clamp valid saved multipliers. */
export function trackpadPinchSensitivity(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(TRACKPAD_PINCH_SENSITIVITY.min, Math.min(TRACKPAD_PINCH_SENSITIVITY.max, value))
    : TRACKPAD_PINCH_SENSITIVITY.default;
}
