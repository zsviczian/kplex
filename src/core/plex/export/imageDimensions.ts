/** Host-free raster allocation policy. World bounds never enlarge a pixel/memory budget. */
export type CanvasRasterSize = Readonly<{width: number; height: number; scale: number; reduced: boolean}>;
export const CANVAS_IMAGE_LIMITS = {side: 8192, pixels: 8_000_000, elements: 24_000, characters: 16_000_000} as const;

/** Fit one finite scene into the declared raster budget without cropping its geometry. */
export function canvasRasterSize(width: number, height: number, requested = 2, maximumPixels: number = CANVAS_IMAGE_LIMITS.pixels): CanvasRasterSize {
  if (![width, height, requested, maximumPixels].every(Number.isFinite) || width <= 0 || height <= 0 || requested < 0.5 || requested > 3 || maximumPixels < 1) throw new Error("Invalid canvas raster dimensions");
  const scale = Math.min(requested, CANVAS_IMAGE_LIMITS.side / width, CANVAS_IMAGE_LIMITS.side / height, Math.sqrt(maximumPixels / width / height));
  const result = {width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)), scale, reduced: scale < requested - 0.00001};
  if (result.width * result.height > maximumPixels) throw new Error("Canvas raster exceeds pixel budget");
  return result;
}
