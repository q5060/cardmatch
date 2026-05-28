import type { ReactNode } from "react";

type Props = {
  variant: "error" | "success";
  children: ReactNode;
  className?: string;
  role?: "alert" | "status";
};

export function Alert({
  variant,
  children,
  className = "",
  role = variant === "error" ? "alert" : "status",
}: Props) {
  const base = variant === "error" ? "alert-error" : "alert-success";
  return (
    <p className={`${base} ${className}`.trim()} role={role}>
      {children}
    </p>
  );
}
