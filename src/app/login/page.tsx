import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-12rem)] flex-col justify-center py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,var(--primary)_12%,transparent),_transparent_55%)]"
        aria-hidden
      />
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
