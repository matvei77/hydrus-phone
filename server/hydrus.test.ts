import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { HydrusClient, HydrusError } from "./hydrus.js";

let server: Server | undefined;
afterEach(() => server?.close());
const fixture = async (
  handler: (
    url: URL,
    headers: Record<string, string | string[] | undefined>,
  ) => {
    status?: number;
    headers?: Record<string, string>;
    body: string | Buffer;
    delayMs?: number;
  },
  timeoutMs = 20_000,
) => {
  server = createServer((req, res) => {
    const out = handler(
      new URL(req.url!, `http://${req.headers.host}`),
      req.headers,
    );
    setTimeout(() => {
      res.writeHead(
        out.status ?? 200,
        out.headers ?? { "content-type": "application/json" },
      );
      res.end(out.body);
    }, out.delayMs ?? 0);
  });
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("fixture failed");
  return new HydrusClient(
    {
      HYDRUS_URL: `http://127.0.0.1:${address.port}`,
      HYDRUS_ACCESS_KEY: "a".repeat(64),
      HOST: "127.0.0.1",
      PORT: 47810,
      LOG_LEVEL: "silent",
    },
    timeoutMs,
  );
};

describe("Hydrus client integration", () => {
  it("obtains a session and reuses it for typed JSON requests", async () => {
    let sessions = 0;
    const client = await fixture((url, headers) => {
      if (url.pathname === "/session_key") {
        sessions++;
        expect(headers["hydrus-client-api-access-key"]).toBe("a".repeat(64));
        return { body: '{"session_key":"session"}' };
      }
      expect(headers["hydrus-client-api-session-key"]).toBe("session");
      return { body: '{"version":83,"hydrus_version":649}' };
    });
    expect(await client.request("/api_version")).toMatchObject({ version: 83 });
    expect(sessions).toBe(1);
  });
  it("preserves Range and accepts partial content streams", async () => {
    const client = await fixture((url, headers) => {
      if (url.pathname === "/session_key")
        return { body: '{"session_key":"s"}' };
      expect(headers.range).toBe("bytes=2-5");
      return {
        status: 206,
        headers: {
          "content-range": "bytes 2-5/8",
          "content-type": "video/mp4",
        },
        body: Buffer.from("cdef"),
      };
    });
    const response = await client.stream(
      "/get_files/file",
      { file_id: 1 },
      "bytes=2-5",
    );
    expect(response.status).toBe(206);
    expect(await response.text()).toBe("cdef");
  });
  it("renews an expired session once", async () => {
    let sessions = 0;
    let calls = 0;
    const client = await fixture((url) => {
      if (url.pathname === "/session_key")
        return { body: JSON.stringify({ session_key: `s${++sessions}` }) };
      calls++;
      return calls === 1
        ? { status: 419, body: '{"error":"expired"}' }
        : { body: '{"ok":true}' };
    });
    expect(await client.request("/api_version")).toEqual({ ok: true });
    expect(sessions).toBe(2);
  });
  it("normalizes permission failures", async () => {
    const client = await fixture((url) =>
      url.pathname === "/session_key"
        ? { body: '{"session_key":"s"}' }
        : { status: 403, body: '{"error":"permission missing"}' },
    );
    await expect(client.request("/verify_access_key")).rejects.toMatchObject({
      status: 403,
      code: "HYDRUS_PERMISSION",
      message: "permission missing",
    } satisfies Partial<HydrusError>);
  });
  it("normalizes upstream timeouts", async () => {
    const client = await fixture(
      (url) =>
        url.pathname === "/session_key"
          ? { body: '{"session_key":"s"}' }
          : { body: '{"ok":true}', delayMs: 100 },
      20,
    );
    await expect(client.request("/api_version")).rejects.toMatchObject({
      status: 504,
      code: "HYDRUS_TIMEOUT",
    });
  });
});
