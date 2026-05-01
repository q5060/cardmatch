import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-12rem)] flex-col justify-center py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgb(196_30_58_/_.06),_transparent_50%)]"
        aria-hidden
      />
      <Suspense fallback={<AuthFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
