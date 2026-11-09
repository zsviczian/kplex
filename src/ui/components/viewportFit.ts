/**
 * Pure viewport fitting for a caller-owned focal point and finite displayed rectangles. Symmetric
 * extents keep the focus centered even when content is asymmetric. No DOM, graph, timers or host
 * state is acquired; callers own camera application and automatic/manual interaction lifetimes.
 */
export type FitCamera = Readonly<{ x: number; y: number; scale: number }>;
export type FitBounds = Readonly<{ left: number; top: number; right: number; bottom: number }>;

/** Restore saved pan relative to the viewport midpoint, retaining zoom through pane/Sidecar resizing.
 * Older in-memory entries and hidden/invalid dimensions retain their original coordinates. */
export function restoredViewportCamera(camera: FitCamera, previous: Readonly<{width: number; height: number}> | undefined,
  current: Readonly<{width: number; height: number}>): FitCamera {
  if (!previous || ![previous.width, previous.height, current.width, current.height].every(value => Number.isFinite(value) && value > 0)) return {...camera};
  return {...camera, x: camera.x + (current.width - previous.width) / 2, y: camera.y + (current.height - previous.height) / 2};
}

/** Preserve the world point underneath a caller-selected viewport point while changing scale.
 * Manual translation and off-origin geometry remain intact; callers retain platform clamps and
 * automatic/manual camera ownership. Invalid input leaves the current camera unchanged. */
export function zoomedViewportCamera(camera: FitCamera, point: {x: number; y: number}, scale: number): FitCamera {
  if (![camera.x, camera.y, camera.scale, point.x, point.y, scale].every(Number.isFinite) || camera.scale <= 0 || scale <= 0) return {...camera};
  const ratio = scale / camera.scale;
  return {scale, x: point.x - (point.x - camera.x) * ratio, y: point.y - (point.y - camera.y) * ratio};
}

/** Fit all supplied bounds around the focus, retaining the scale ceiling and viewport padding. */
export function centeredViewportFit(width: number, height: number, focus: { x: number; y: number },
  bounds: FitBounds, maxScale: number, padding = 46): FitCamera {
  const extentX = Math.max(1, Math.abs(bounds.left - focus.x), Math.abs(bounds.right - focus.x));
  const extentY = Math.max(1, Math.abs(bounds.top - focus.y), Math.abs(bounds.bottom - focus.y));
  // A fitted camera may go below the manual wheel minimum, so a large editor/scene still fits.
  const scale = Math.min(maxScale, Math.max(1, width - padding * 2) / (extentX * 2),
    Math.max(1, height - padding * 2) / (extentY * 2));
  return { x: width / 2 - focus.x * scale, y: height / 2 - focus.y * scale, scale };
}

/** Compare only camera intent, excluding geometry that may change during native layout. */
export function sameFitCamera(a: FitCamera, b: FitCamera): boolean {
  return a.x === b.x && a.y === b.y && a.scale === b.scale;
}
