import type { ReactNode } from "react";

export function ActionButton({ label, icon, disabled, onClick }: {
  label: string;
  icon: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return <button
    type="button"
    className="excalibrain-icon-button kplex-action-button"
    aria-label={label}
    disabled={disabled}
    onClick={onClick}
  >{icon}</button>;
}
