
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/components/ui/toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{ password?: string; confirm_password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(Boolean(session));
      setChecking(false);
    });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const result = resetPasswordSchema.safeParse({
      password,
      confirm_password: confirmPassword,
    });

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      setErrors({
        password: fieldErrors.password?.[0],
        confirm_password: fieldErrors.confirm_password?.[0],
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: result.data.password,
    });

    setLoading(false);

    if (error) {
      showError(error.message);
      return;
    }

    showSuccess("Password updated successfully.");
    router.replace("/dashboard");
    router.refresh();
  }

  if (checking) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
        <div className="h-10 w-64 animate-pulse rounded bg-surface-2" />
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-red-600">
          Invalid link
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
          This reset link has expired
        </h2>
        <p className="mt-4 text-base leading-7 text-text-secondary">
          Request a new password reset link to continue.
        </p>
        <Button size="lg" className="mt-8 w-full" onClick={() => router.push("/forgot-password")}>
          Request new link
        </Button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-brand-600">
        Secure your account
      </p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
        Choose a new password
      </h2>
      <p className="mt-3 text-base leading-7 text-text-secondary">
        Must be at least 6 characters.
      </p>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-medium text-text-primary">
            New password
          </label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              icon={<LockKeyhole className="h-4 w-4" />}
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-text-muted hover:text-text-primary"
              aria-label={showPassword ? "Hide" : "Show"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-text-primary">
            Confirm password
          </label>
          <Input
            id="confirm"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repeat password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirm_password}
            icon={<LockKeyhole className="h-4 w-4" />}
          />
        </div>

        <Button type="submit" size="lg" loading={loading} className="w-full">
          Update password
        </Button>
      </form>
    </div>
  );
}