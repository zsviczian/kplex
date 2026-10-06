/**
 * Owner-local Web Animation lifetime for direct DOM layout motion. Callers supply geometry and
 * timing; this helper permits one animation per element and never retains finished transforms.
 * A consumer must cancel all motion before measuring replacement geometry and on unload.
 */
export class ElementMotion {
  private readonly animations = new Map<Element, Animation>();

  /** Replace this element's motion without retaining a finished fill or touching unrelated effects. */
  play(element: Element, frames: Keyframe[], options: KeyframeAnimationOptions): Animation {
    this.animations.get(element)?.cancel();
    const animation = element.animate(frames, { ...options, fill: "none" });
    this.animations.set(element, animation);
    /** Release only this exact animation; a newer effect may already own the same element. */
    const release = (): void => {
      if (this.animations.get(element) === animation) this.animations.delete(element);
    };
    void animation.finished.then(release, release);
    return animation;
  }

  /** Restore actual layout before a new measurement, interrupted gesture or owning-view teardown. */
  cancelAll(): void {
    for (const animation of this.animations.values()) animation.cancel();
    this.animations.clear();
  }
}
