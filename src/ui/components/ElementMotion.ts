/**
 * Owner-local Web Animation lifetime for direct DOM layout motion. Callers supply geometry and
 * timing; this helper permits one animation per element and never retains finished transforms.
 * A consumer must cancel all motion before measuring replacement geometry and on unload.
 * A host-declined animation leaves layout unchanged and never acquires an owner slot or pose.
 */
import {sampleMotionPose, type MotionPose} from "./motionPose";

export class ElementMotion {
  private readonly animations = new Map<Element, Animation>();
  private readonly poses = new Map<Element, Readonly<{animation: Animation; frames: readonly MotionPose[]}>>();

  /** Replace one effect without retained fill; optional numeric center poses share its exact lifetime. */
  play(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions, poses?: readonly MotionPose[]): Animation | null {
    this.animations.get(element)?.cancel();
    this.animations.delete(element); this.poses.delete(element);
    const animation = element.animate(frames, { ...options, fill: "none" });
    // The native host can decline acquisition despite the DOM declaration's non-null return.
    // Retire the previous owner first; a declined replacement must not retain canceled motion.
    if (!animation) return null;
    this.animations.set(element, animation);
    if (poses) this.poses.set(element, {animation, frames: poses});
    /** Release only this exact animation; a newer effect may already own the same element. */
    const release = (): void => {
      if (this.animations.get(element) === animation) {this.animations.delete(element); this.poses.delete(element);}
    };
    void animation.finished.then(release, release);
    return animation;
  }

  /** Report only this owner’s still-running effects to coordinate arrival with the next cycle. */
  isRunning(element?: Element): boolean { return element ? this.animations.has(element) : this.animations.size > 0; }

  /** Read the exact owned effect's globally eased progress; no transform parsing or layout read. */
  sample(element: Element): MotionPose | null {
    const tracked = this.poses.get(element); if (!tracked || this.animations.get(element) !== tracked.animation) return null;
    const progress = tracked.animation.effect?.getComputedTiming().progress;
    return typeof progress === "number" ? sampleMotionPose(tracked.frames, progress) : null;
  }

  /** Restore actual layout before a new measurement, interrupted gesture or owning-view teardown. */
  cancelAll(): void {
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear(); this.poses.clear();
  }
}
