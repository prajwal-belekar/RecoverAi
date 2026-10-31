const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
const TOKEN_KEY = "resolveai_access_token";

type ApiErrorPayload = {
  detail?: string | Array<{ msg?: string }>;
};

export type AuthToken = {
  access_token: string;
  token_type: string;
};

export function getApiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(TOKEN_KEY);
}

export function storeToken(token: string): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  window.sessionStorage.removeItem(TOKEN_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((error) => error.msg)
        .filter(Boolean)
        .join(", ");
    }
  } catch {
    // Use the status-based message below when the response is not JSON.
  }

  return `Request failed (${response.status})`;
}
