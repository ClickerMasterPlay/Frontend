export class BackendError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

type ApiOptions = {
  method?: "GET" | "POST";
  userId?: string | null;
  idempotencyKey?: string;
  body?: unknown;
};

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function readResources(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object") {
    return {};
  }
  const result: Record<string, number> = {};
  for (const [key, amount] of Object.entries(value as Record<string, unknown>)) {
    const number = readNumber(amount, Number.NaN);
    if (key && Number.isFinite(number) && number > 0) {
      result[key] = number;
    }
  }
  return result;
}

export function readGuest(value: Record<string, unknown>): boolean {
  return Boolean(value.isGuest ?? value.guest);
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (options.userId) {
    headers["X-User-Id"] = options.userId;
  }
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new BackendError("NETWORK_ERROR", "Backend is unavailable", 0);
  }

  const text = await response.text();
  const data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    throw new BackendError(
      typeof data.error_code === "string" ? data.error_code : "HTTP_ERROR",
      typeof data.message === "string" ? data.message : response.statusText,
      response.status,
    );
  }
  return data as T;
}

export { readNumber };
