import type { ReactNode } from "react";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className = "",
}: Props) {
  return (
    <header className={`space-y-2 ${className}`.trim()}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          {eyebrow ? <p className="page-eyebrow">{eyebrow}</p> : null}
          <h1 className="page-title">{title}</h1>
          {description ? <p className="page-desc">{description}</p> : null}
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  );
}
