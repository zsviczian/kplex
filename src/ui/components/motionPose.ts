/** Numeric counterparts of owned Web Animation frames; no DOM measurements or transform parsing. */
export type MotionPose = Readonly<{offset: number; x: number; y: number; scaleX: number; scaleY: number; originX: number; originY: number}>;

/** Interpolate the same sampled keyframes using the animation effect's already-eased progress. */
export function sampleMotionPose(poses: readonly MotionPose[], progress: number): MotionPose | null {
  if (!poses.length || !Number.isFinite(progress)) return null;
  const p = Math.max(0, Math.min(1, progress));
  if (poses.length === 1) return poses[0];
  for (let index = 1; index < poses.length; index++) {
    const end = poses[index], start = poses[index - 1];
    if (p > end.offset && index < poses.length - 1) continue;
    const ratio = end.offset > start.offset ? (p - start.offset) / (end.offset - start.offset) : 1;
    /** Interpolate one numeric component of the exact sampled transform pair. */
    const lerp = (first: number, last: number): number => first + (last - first) * ratio;
    return {offset: p, x: lerp(start.x, end.x), y: lerp(start.y, end.y), scaleX: lerp(start.scaleX, end.scaleX),
      scaleY: lerp(start.scaleY, end.scaleY), originX: lerp(start.originX, end.originX), originY: lerp(start.originY, end.originY)};
  }
  return null;
}
