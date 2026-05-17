import type { ReactNode } from "react";

type Props = {
  icon?: ReactNode;
  title: string;
  description?: string;
  className?: string;
};

export function EmptyState({ icon, title, description, className = "" }: Props) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      {icon ? <div className="empty-state-icon">{icon}</div> : null}
      <p className="empty-state-title">{title}</p>
      {description ? <p className="empty-state-desc">{description}</p> : null}
    </div>
  );
}
