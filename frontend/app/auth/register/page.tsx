"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import { authApi } from "@/lib/api";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceSubdomain, setWorkspaceSubdomain] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [workspaceNameError, setWorkspaceNameError] = useState("");
  const [workspaceSubdomainError, setWorkspaceSubdomainError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateName = (value: string) => {
    if (!value.trim()) {
      setNameError("Name is required");
      return false;
    }
    if (value.trim().length < 2) {
      setNameError("Name must be at least 2 characters");
      return false;
    }
    setNameError("");
    return true;
  };

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
    if (!/[A-Z]/.test(value)) {
      setPasswordError("Password must contain at least one uppercase letter");
      return false;
    }
    if (!/[a-z]/.test(value)) {
      setPasswordError("Password must contain at least one lowercase letter");
      return false;
    }
    if (!/[0-9]/.test(value)) {
      setPasswordError("Password must contain at least one number");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (value: string) => {
    if (!value) {
      setConfirmPasswordError("Please confirm your password");
      return false;
    }
    if (value !== password) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const validateWorkspaceName = (value: string) => {
    if (!value.trim()) {
      setWorkspaceNameError("Workspace name is required");
      return false;
    }
    if (value.trim().length < 2) {
      setWorkspaceNameError("Workspace name must be at least 2 characters");
      return false;
    }
    setWorkspaceNameError("");
    return true;
  };

  const validateWorkspaceSubdomain = (value: string) => {
    if (!value.trim()) {
      setWorkspaceSubdomainError("Subdomain is required");
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(value)) {
      setWorkspaceSubdomainError("Subdomain can only contain lowercase letters, numbers, and hyphens");
      return false;
    }
    if (value.length < 3) {
      setWorkspaceSubdomainError("Subdomain must be at least 3 characters");
      return false;
    }
    if (value.length > 50) {
      setWorkspaceSubdomainError("Subdomain must be 50 characters or less");
      return false;
    }
    setWorkspaceSubdomainError("");
    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmValid = validateConfirmPassword(confirmPassword);
    const isWorkspaceNameValid = validateWorkspaceName(workspaceName);
    const isWorkspaceSubdomainValid = validateWorkspaceSubdomain(workspaceSubdomain);

    if (
      !isNameValid ||
      !isEmailValid ||
      !isPasswordValid ||
      !isConfirmValid ||
      !isWorkspaceNameValid ||
      !isWorkspaceSubdomainValid
    ) {
      return;
    }

    setIsSubmitting(true);

    try {
      await authApi.register(
        name.trim(),
        email,
        password,
        workspaceName.trim(),
        workspaceSubdomain.trim().toLowerCase()
      );
      toast({ title: "Account created!", description: "Welcome to ResolveAI", variant: "success" });
      router.replace("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast({ title: "Registration failed", description: message, variant: "danger" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
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
            <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
            <p className="mt-2 text-muted-foreground">Start resolving customer issues with AI</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Full Name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (nameError) validateName(e.target.value);
              }}
              onBlur={() => validateName(name)}
              placeholder="John Doe"
              error={nameError || undefined}
              autoComplete="name"
              required
              disabled={isSubmitting}
            />

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
                  if (confirmPasswordError) validateConfirmPassword(confirmPassword);
                }}
                onBlur={() => validatePassword(password)}
                placeholder="••••••••"
                error={passwordError || undefined}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                showToggle
                helperText="At least 8 characters with uppercase, lowercase, and number"
              />
            </div>

            <div className="relative">
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) validateConfirmPassword(e.target.value);
                }}
                onBlur={() => validateConfirmPassword(confirmPassword)}
                placeholder="••••••••"
                error={confirmPasswordError || undefined}
                autoComplete="new-password"
                required
                disabled={isSubmitting}
                showToggle
              />
            </div>

            <div className="border-t border-border pt-6 mt-2">
              <h3 className="text-sm font-medium text-foreground mb-4">Create your workspace</h3>
              <Input
                label="Workspace Name"
                type="text"
                value={workspaceName}
                onChange={(e) => {
                  setWorkspaceName(e.target.value);
                  if (workspaceNameError) validateWorkspaceName(e.target.value);
                }}
                onBlur={() => validateWorkspaceName(workspaceName)}
                placeholder="Acme Corp"
                error={workspaceNameError || undefined}
                autoComplete="organization"
                required
                disabled={isSubmitting}
              />
              <Input
                label="Subdomain"
                type="text"
                value={workspaceSubdomain}
                onChange={(e) => {
                  setWorkspaceSubdomain(e.target.value);
                  if (workspaceSubdomainError) validateWorkspaceSubdomain(e.target.value);
                }}
                onBlur={() => validateWorkspaceSubdomain(workspaceSubdomain)}
                placeholder="acme"
                error={workspaceSubdomainError || undefined}
                autoComplete="off"
                required
                disabled={isSubmitting}
                helperText="Only lowercase letters, numbers, and hyphens. This will be your workspace URL."
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              size="lg"
              loading={isSubmitting}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
              Sign in
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
    </div>
  );
}