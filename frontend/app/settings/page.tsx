"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface SettingsState {
  name: string;
  email: string;
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
  isLoading: boolean;
}

interface SettingsError {
  name?: string;
  email?: string;
  password?: string;
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [state, setState] = useState<SettingsState>({
    name: "",
    email: "",
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
    isLoading: false,
  });
  const [errors, setErrors] = useState<SettingsError>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, isLoading: true }));
    setErrors({});

    try {
      // Update profile
      await api.patch("/users/me", {
        name: state.name,
        email: state.email,
      });
      toast({ title: "Success", description: "Profile updated successfully", variant: "success" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update profile";
      setErrors({
        name: message,
        email: message,
      });
    } finally {
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setState((prev) => ({ ...prev, isLoading: true }));
    setErrors({});

    if (state.newPassword !== state.confirmPassword) {
      setErrors({ password: "Passwords do not match" });
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      await api.patch("/users/me/password", {
        oldPassword: state.oldPassword,
        newPassword: state.newPassword,
      });
      toast({ title: "Success", description: "Password updated successfully", variant: "success" });
      setState((prev) => ({
        ...prev,
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
        isLoading: false,
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to update password";
      setErrors({ password: message });
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                name="name"
                type="text"
                placeholder="Name"
                value={state.name}
                onChange={handleChange}
                error={errors.name}
                disabled={state.isLoading}
                required
              />
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={state.email}
                onChange={handleChange}
                error={errors.email}
                disabled={state.isLoading}
                required
              />
              {/* Password Change Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    name="oldPassword"
                    type="password"
                    placeholder="Old Password"
                    value={state.oldPassword}
                    onChange={handleChange}
                    error={errors.password}
                    disabled={state.isLoading}
                    required
                  />
                  <Input
                    name="newPassword"
                    type="password"
                    placeholder="New Password"
                    value={state.newPassword}
                    onChange={handleChange}
                    error={errors.password}
                    disabled={state.isLoading}
                    required
                  />
                  <Input
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm Password"
                    value={state.confirmPassword}
                    onChange={handleChange}
                    error={errors.password}
                    disabled={state.isLoading}
                    required
                  />
                  <Button
                    type="submit"
                    onClick={handlePasswordChange}
                    disabled={state.isLoading}
                    className="w-full mt-4"
                  >
                    {state.isLoading ? "Updating..." : "Update Password"}
                  </Button>
                </CardContent>
              </Card>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
  );
}