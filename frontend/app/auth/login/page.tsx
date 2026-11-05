"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { authApi, api } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

interface UserProfile {
  id: number;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  workspace_id: number | null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (value: string) => {
    if (!value) {
      setEmailError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setEmailError("Please enter a valid email address");
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (value: string) => {
    if (!value) {
      setPasswordError("Password is required");
      return false;
    }
    if (value.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.login(email, password);
      
      // Fetch user profile to get workspace context
      try {
        const profile = await api.get<UserProfile>("/users/me");
        if (!profile.workspace_id) {
          toast({ title: "No workspace", description: "Please create a workspace first", variant: "warning" });
          router.replace("/auth/register");
          return;
        }
      } catch (profileError) {
        console.error("Failed to fetch user profile:", profileError);
      }
      
      toast({ title: "Welcome back!", variant: "success" });
      router.replace(redirect);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed. Please try again.";
      toast({ title: "Login failed", description: message, variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <div className="flex items-center justify-center gap-3 mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <span className="font-semibold text-xl text-foreground">ResolveAI</span>
      </div>

      <div className="bg-card border border-card-border rounded-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-muted-foreground">Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) validateEmail(e.target.value);
            }}
            onBlur={() => validateEmail(email)}
            placeholder="john@example.com"
            error={emailError || undefined}
            autoComplete="email"
            required
            disabled={isSubmitting}
          />

          <div className="relative">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) validatePassword(e.target.value);
              }}
              onBlur={() => validatePassword(password)}
              placeholder="••••••••"
              error={passwordError || undefined}
              autoComplete="current-password"
              required
              disabled={isSubmitting}
              showToggle
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border bg-input text-primary focus:ring-primary focus:ring-offset-background"
                disabled={isSubmitting}
              />
              <span className="text-sm text-muted-foreground">Remember me</span>
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-primary hover:text-primary-hover transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            loading={isSubmitting}
          >
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:text-primary-hover transition-colors">
            Create one
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
        {" "}and{" "}
        <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
      </p>
    </div>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-center gap-3 mb-8">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="bg-card border border-card-border rounded-2xl p-8 shadow-xl">
        <Skeleton className="h-6 w-3/4 mx-auto mb-2" />
        <Skeleton className="h-4 w-1/2 mx-auto mb-8" />
        <Skeleton className="h-10 w-full mb-5" />
        <Skeleton className="h-10 w-full mb-5" />
        <Skeleton className="h-10 w-full mb-5" />
        <Skeleton className="h-10 w-full mb-5" />
        <Skeleton className="h-12 w-full mb-6" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}