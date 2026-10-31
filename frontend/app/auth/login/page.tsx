"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthToken, getApiError, getApiUrl, storeToken } from "../../../lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(getApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? ""),
          password: String(formData.get("password") ?? ""),
        }),
      });

      if (!response.ok) {
        throw new Error(await getApiError(response));
      }

      const token = (await response.json()) as AuthToken;
      storeToken(token.access_token);
      router.replace("/dashboard");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Login failed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background p-6 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h2 className="text-2xl font-bold text-indigo-900 mb-6 text-center">
          Log In
        </h2>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 dark:bg-gray-700 dark:text-white"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm py-2.5 px-3 dark:bg-gray-700 dark:text-white"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600"
          >
            {isSubmitting ? "Logging In..." : "Log In"}
          </button>

          {error && (
            <p role="alert" className="text-center text-sm text-red-600">
              {error}
            </p>
          )}

          <p className="text-center text-sm text-zinc-500">
            Don't have an account?{" "}
            <a
              href="/auth/register"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}