/**
 * Screen-space FLIP geometry for an incoming center. The scene owner captures actual rectangles
 * before navigation/camera changes and supplies the new scale. This helper emits temporary Web
 * Animation frames only; it owns no DOM, layout, timers, camera or semantic navigation effects.
 */
import type {MotionPose} from "./motionPose";

export type MotionRect = Readonly<{ left: number; top: number; width: number; height: number }>;

/**
 * Follow a shallow quadratic arc from the old screen rectangle to the exact natural landing.
 * Width/height morph independently, while a small mid-flight lift adds depth without overshoot.
 * Screen deltas are converted once to the destination camera's local coordinate system. An optional
 * center-only collector records these identical samples for paint following; it never changes motion.
 */
export function centerArrivalFrames(previous: MotionRect, current: MotionRect, cameraScale: number, poses?: MotionPose[]): Keyframe[] {
  const scale = Math.max(0.01, cameraScale);
  const dx = (previous.left - current.left) / scale, dy = (previous.top - current.top) / scale;
  const sx = current.width > 0 ? previous.width / current.width : 1;
  const sy = current.height > 0 ? previous.height / current.height : 1;
  const distance = Math.hypot(dx, dy);
  const arc = Math.min(24 / scale, distance * 0.08);
  const nx = distance ? -dy / distance : 0, ny = distance ? dx / distance : 0;
  return [0, 0.35, 0.65, 0.85, 1].map(/** Sample one gentle arc with no retained transform or oscillation. */ progress => {
    const lift = progress === 0 || progress === 1 ? 0 : Math.sin(Math.PI * progress);
    const x = dx * (1 - progress) + nx * arc * lift;
    const y = dy * (1 - progress) + ny * arc * lift;
    const pop = 1 + 0.055 * lift;
    poses?.push({offset: progress, x, y, scaleX: (sx + (1 - sx) * progress) * pop, scaleY: (sy + (1 - sy) * progress) * pop, originX: 0, originY: 0});
    return { offset: progress, transformOrigin: "0 0", transform: `translate(${x}px, ${y}px) scale(${(sx + (1 - sx) * progress) * pop}, ${(sy + (1 - sy) * progress) * pop})`, opacity: 1 };
  });
}
