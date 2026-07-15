"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { showError, showSuccess } from "@/components/ui/toast";

export default function SignupPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm_password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);

  function update(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  async function handleSignup(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const result = signupSchema.safeParse(form);
    if (!result.success) {
      const fe = result.error.flatten().fieldErrors;
      const flat: Record<string, string> = {};
      for (const [key, msgs] of Object.entries(fe)) { if (msgs?.[0]) flat[key] = msgs[0]; }
      setErrors(flat);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: result.data.email,
      password: result.data.password,
      options: {
        data: { full_name: result.data.full_name },
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });
    setLoading(false);

    if (error) { showError(error.message); return; }
    if (data.session) { router.replace("/dashboard"); router.refresh(); return; }

    setOtpSent(true);
    showSuccess("Verification code sent to your email.");
  }

  async function handleVerifyOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.length < 6) { showError("Enter the 6-digit code."); return; }

    setVerifying(true);
    const { data, error } = await supabase.auth.verifyOtp({ email: form.email, token: otp, type: "signup" });
    setVerifying(false);

    if (error) { showError(error.message || "Invalid code."); return; }
    if (data.session) { showSuccess("Account verified!"); router.replace("/dashboard"); router.refresh(); }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/callback` },
    });
    if (error) { setGoogleLoading(false); showError(error.message); }
  }

  if (otpSent) {
    return (
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.1em] text-indigo-300">Verify your email</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Enter verification code</h2>
        <p className="mt-3 text-base leading-7 text-slate-300">We sent a 6-digit code to <strong className="text-white">{form.email}</strong></p>

        <form className="mt-8 space-y-5" onSubmit={handleVerifyOtp} noValidate>
          <Input id="otp" type="text" inputMode="numeric" maxLength={6} autoComplete="one-time-code" aria-label="6-digit verification code" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} className="text-center text-2xl tracking-[0.3em]" />
          <Button type="submit" size="lg" loading={verifying} className="w-full">Verify & continue</Button>
        </form>

        <button type="button" onClick={() => { setOtpSent(false); setOtp(""); }} className="mt-6 text-sm font-medium text-indigo-300 hover:text-indigo-200">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-semibold uppercase tracking-[0.1em] text-indigo-300">Start free</p>
      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Create your account</h2>
      <p className="mt-3 text-base leading-7 text-slate-300">3 free generations. No credit card required.</p>

      <form className="mt-8 space-y-5" onSubmit={handleSignup} noValidate>
        <Field label="Full name" htmlFor="full_name">
          <Input id="full_name" autoComplete="name" placeholder="Your name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} error={errors.full_name} icon={<UserRound className="h-4 w-4" />} />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" type="email" autoComplete="email" placeholder="you@company.com" value={form.email} onChange={(e) => update("email", e.target.value)} error={errors.email} icon={<Mail className="h-4 w-4" />} />
        </Field>
        <Field label="Password" htmlFor="password">
          <div className="relative">
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="At least 6 characters" value={form.password} onChange={(e) => update("password", e.target.value)} error={errors.password} icon={<LockKeyhole className="h-4 w-4" />} className="pr-12" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </Field>
        <Field label="Confirm password" htmlFor="confirm_password">
          <Input id="confirm_password" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Repeat password" value={form.confirm_password} onChange={(e) => update("confirm_password", e.target.value)} error={errors.confirm_password} icon={<LockKeyhole className="h-4 w-4" />} />
        </Field>

        <p className="text-xs leading-5 text-slate-400">
          By creating an account you agree to our <Link href="/legal/terms" className="underline hover:text-white">Terms</Link> and <Link href="/legal/privacy" className="underline hover:text-white">Privacy Policy</Link>.
        </p>

        <Button type="submit" size="lg" loading={loading} className="w-full">Create free account</Button>
      </form>

      <div className="my-7 flex items-center gap-4">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-xs font-medium uppercase tracking-widest text-slate-400">or</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      <Button
        type="button"
        variant="outline"
        size="lg"
        loading={googleLoading}
        onClick={handleGoogleLogin}
        className="w-full border-white/10 bg-white/5 text-white hover:bg-white/10 hover:border-white/20"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z"/></svg>
        Continue with Google
      </Button>

      <p className="mt-8 text-center text-sm text-slate-400">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-indigo-300 hover:text-indigo-200">Sign in</Link>
      </p>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return <div><label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-slate-200">{label}</label>{children}</div>;
}
