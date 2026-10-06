/**
 * Browser-host cooperative CPU continuation. A disposable owning-window MessageChannel posts one
 * event-loop task without a background-clamped zero-delay timer or a microtask-only spin. Every
 * call closes its ports on delivery/failure and retains no queue. Callers still own cancellation,
 * freshness, slice budgets and priority checkpoints; this helper grants no source authority.
 * Unsupported hosts retain the established timer continuation through the supplied window.
 */

/** Only task-dispatch services cross this host utility's boundary, including small test windows. */
type TaskYieldWindow = Pick<Window, "setTimeout"> & { MessageChannel?: typeof MessageChannel };

/**
 * Release one CPU slice to an owning-window event task and dispose both transient ports afterward.
 * @remarks A caller must recheck its lifetime after awaiting; dispatch itself never certifies work.
 * @throws Rejects when channel construction, posting or message delivery fails after port cleanup.
 */
export function yieldToHostTask(ownerWindow: TaskYieldWindow = window): Promise<void> {
  const Channel = ownerWindow.MessageChannel;
  if (!Channel) return new Promise<void>(resolve => ownerWindow.setTimeout(resolve, 0));
  return new Promise<void>((resolve, reject) => {
    let channel: MessageChannel | undefined;
    let settled = false;
    /** Dispose this call's event handlers and both ports before resolving or rejecting its task. */
    const finish = (error?: Error): void => {
      if (settled) return;
      settled = true;
      if (channel) {
        channel.port1.onmessage = null;
        channel.port1.onmessageerror = null;
        channel.port2.onmessage = null;
        channel.port2.onmessageerror = null;
        try { channel.port1.close(); } catch { /* Continue disposing the other port. */ }
        try { channel.port2.close(); } catch { /* Settlement must not retain this continuation. */ }
      }
      if (error === undefined) resolve();
      else reject(error);
    };
    try {
      channel = new Channel();
      channel.port1.onmessage = () => finish();
      channel.port1.onmessageerror = () => finish(new Error("K-Plex task continuation failed"));
      channel.port2.postMessage(0);
    } catch (error) { finish(error instanceof Error ? error : new Error(String(error))); }
  });
}
