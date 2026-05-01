import { Suspense } from "react";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { AuthFormSkeleton } from "@/components/auth/AuthFormSkeleton";

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-12rem)] flex-col justify-center py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_rgb(45_52_70_/_.06),_transparent_50%)]"
        aria-hidden
      />
      <Suspense fallback={<AuthFormSkeleton />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
