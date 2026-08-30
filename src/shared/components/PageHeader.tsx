import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  back?: () => void;
}) {
  return (
    <div className="page-header">
      <div className="title-row">
        {back && (
          <button className="back-button" onClick={back}>
            <ArrowLeft size={19} />
          </button>
        )}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  );
}
