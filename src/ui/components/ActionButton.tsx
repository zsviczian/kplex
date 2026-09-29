/**
 * Provides a host-free K-Plex icon button with caller-owned label, icon and action. The owning
 * document supplies scoped CSS tokens; no graph policy, host lookup or persistent state is acquired.
 */
import type { ReactNode } from "react";

/** Render a non-submitting accessible button; native disabled behavior suppresses its action. */
export function ActionButton({ label, icon, disabled, onClick }: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return <button
    type="button"
    className="kplex-icon-button kplex-action-button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >{icon}</button>;
}
