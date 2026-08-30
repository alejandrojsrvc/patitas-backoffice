import type { ReactNode } from "react";
import { money } from "../formatters";

export function Info({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="info-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function SummaryItem({
  label,
  value,
  icon,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="summary-item">
      <span className="summary-icon">{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function CostRow({
  label,
  value,
  total,
}: {
  label: string;
  value: string;
  total?: boolean;
}) {
  return (
    <div className={total ? "total" : ""}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  );
}
