"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type Props = {
  href?: string;
  label?: string;
  className?: string;
};

export function BackLink({ href, label = "返回", className = "" }: Props) {
  const router = useRouter();

  if (href) {
    return (
      <Link href={href} className={`back-link ${className}`.trim()}>
        <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
        {label}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className={`back-link cursor-pointer ${className}`.trim()}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      {label}
    </button>
  );
}
