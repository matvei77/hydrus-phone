import type { Config } from "./config.js";

export class HydrusError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "HYDRUS_ERROR",
  ) {
    super(message);
  }
}

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: HeadersInit;
  signal?: AbortSignal;
  retry?: boolean;
};

export class HydrusClient {
  private sessionKey: string | undefined;
  private lastSuccess: string | undefined;
  constructor(private config: Config) {}

  private url(path: string, query?: Record<string, unknown>) {
    const url = new URL(path, this.config.HYDRUS_URL);
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(
        key,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    }
    return url;
  }

  private async session(signal?: AbortSignal) {
    if (this.sessionKey) return this.sessionKey;
    const response = await fetch(this.url("/session_key"), {
      headers: {
        "Hydrus-Client-API-Access-Key": this.config.HYDRUS_ACCESS_KEY,
      },
      signal,
    });
    if (!response.ok) throw await this.error(response);
    const value = (await response.json()) as { session_key: string };
    this.sessionKey = value.session_key;
    return value.session_key;
  }

  private async error(response: Response) {
    let message = `Hydrus returned HTTP ${response.status}`;
    try {
      const data = (await response.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* non-JSON upstream */
    }
    const code =
      response.status === 401 || response.status === 403
        ? "HYDRUS_PERMISSION"
        : response.status === 419
          ? "HYDRUS_SESSION"
          : "HYDRUS_ERROR";
    return new HydrusError(response.status, message, code);
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(new Error("Hydrus request timed out")),
      20_000,
    );
    const abort = () => controller.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    try {
      const response = await fetch(this.url(path, options.query), {
        method: options.method ?? "GET",
        signal: controller.signal,
        headers: {
          "Hydrus-Client-API-Session-Key": await this.session(
            controller.signal,
          ),
          ...(options.body ? { "content-type": "application/json" } : {}),
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
      if (
        (response.status === 401 || response.status === 419) &&
        options.retry !== false
      ) {
        this.sessionKey = undefined;
        return this.request(path, { ...options, retry: false });
      }
      if (!response.ok) throw await this.error(response);
      this.lastSuccess = new Date().toISOString();
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof HydrusError) throw error;
      if (controller.signal.aborted)
        throw new HydrusError(
          504,
          "Hydrus did not respond before the request timeout.",
          "HYDRUS_TIMEOUT",
        );
      throw new HydrusError(
        503,
        error instanceof Error ? error.message : "Hydrus is unavailable.",
        "HYDRUS_UNAVAILABLE",
      );
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
  }

  async stream(
    path: string,
    query: Record<string, unknown>,
    range?: string,
    signal?: AbortSignal,
  ) {
    const response = await fetch(this.url(path, query), {
      headers: {
        "Hydrus-Client-API-Session-Key": await this.session(signal),
        ...(range ? { range } : {}),
      },
      signal,
    });
    if (!response.ok && response.status !== 206)
      throw await this.error(response);
    this.lastSuccess = new Date().toISOString();
    return response;
  }

  getLastSuccess() {
    return this.lastSuccess;
  }
}
