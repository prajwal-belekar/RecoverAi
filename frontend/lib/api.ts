import { getStoredToken, getApiError, clearToken, type AuthToken } from "./auth";

export type { AuthToken };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/auth/login";
    }
    throw new Error("Authentication expired. Please log in again.");
  }

  if (!response.ok) {
    const errorMessage = await getApiError(response);
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  options: RequestInit = {}
): Promise<T> {
  const token = getStoredToken();
  const headers: HeadersInit = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: "POST",
    headers,
    body: formData,
  });

  if (response.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/auth/login";
    }
    throw new Error("Authentication expired. Please log in again.");
  }

  if (!response.ok) {
    const errorMessage = await getApiError(response);
    throw new Error(errorMessage);
  }

  return response.json();
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path, { method: "GET" }),
  post: <T>(path: string, data: unknown) => apiRequest<T>(path, { method: "POST", body: JSON.stringify(data) }),
  patch: <T>(path: string, data: unknown) => apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
};

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthToken>("/auth/login", { email, password }),
  register: (name: string, email: string, password: string) =>
    api.post<{ id: number; email: string; name: string }>("/auth/register", { name, email, password }),
  createWorkspace: (name: string, subdomain: string, description?: string) =>
    api.post<{ id: number; name: string; subdomain: string }>("/auth/workspaces", { name, subdomain, description }),
};