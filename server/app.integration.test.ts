import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { buildApp } from "./app.js";

let upstream: Server;
let app: Awaited<ReturnType<typeof buildApp>>;
const writes: { path: string; body: any }[] = [];
const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length
    ? JSON.parse(Buffer.concat(chunks).toString("utf8"))
    : null;
};

beforeAll(async () => {
  upstream = createServer(async (request, response) => {
    const url = new URL(request.url!, `http://${request.headers.host}`);
    if (url.pathname === "/session_key")
      return response.end('{"session_key":"session"}');
    if (url.pathname === "/api_version")
      return response.end('{"version":83,"hydrus_version":649}');
    if (url.pathname === "/verify_access_key")
      return response.end(
        '{"basic_permissions":[1,2,3],"permits_everything":false}',
      );
    if (url.pathname === "/get_services")
      return response.end(
        '{"services":{"6c6f63616c2074616773":{"name":"my tags","type":5}}}',
      );
    if (url.pathname === "/add_tags/search_tags")
      return response.end('{"tags":[{"value":"creator:test","count":5}]}');
    if (url.pathname === "/get_files/search_files")
      return response.end('{"file_ids":[9,8]}');
    if (url.pathname === "/get_files/file_metadata")
      return response.end(
        '{"metadata":[{"file_id":9,"hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","size":12,"mime":1,"ext":".jpg","is_inbox":true,"tags":{}}]}',
      );
    if (url.pathname === "/get_files/thumbnail") {
      response.writeHead(200, { "content-type": "image/jpeg" });
      return response.end("thumb");
    }
    if (url.pathname === "/get_files/render") {
      if (
        url.searchParams.get("render_format") !== "1" ||
        url.searchParams.get("render_quality") !== "95"
      ) {
        return response.writeHead(400).end('{"error":"bad render options"}');
      }
      response.writeHead(200, { "content-type": "image/jpeg" });
      return response.end("rendered-jxl");
    }
    if (url.pathname === "/get_files/file") {
      if (request.headers.range === "bytes=99-100") {
        response.writeHead(416, { "content-type": "application/json" });
        return response.end('{"error":"invalid range"}');
      }
      response.writeHead(206, {
        "content-type": "video/mp4",
        "content-range": "bytes 0-3/8",
        "accept-ranges": "bytes",
        "content-length": "4",
      });
      return response.end("abcd");
    }
    if (request.method === "POST") {
      writes.push({ path: url.pathname, body: await readBody(request) });
      return response.end("{}");
    }
    response.writeHead(404).end('{"error":"not found"}');
  });
  await new Promise<void>((resolve) =>
    upstream.listen(0, "127.0.0.1", resolve),
  );
  const address = upstream.address();
  if (!address || typeof address === "string")
    throw new Error("fixture unavailable");
  app = await buildApp(
    {
      HYDRUS_URL: `http://127.0.0.1:${address.port}`,
      HYDRUS_ACCESS_KEY: "f".repeat(64),
      HOST: "127.0.0.1",
      PORT: 47810,
      LOG_LEVEL: "silent",
    },
    { serveStatic: false },
  );
});

afterAll(async () => {
  await app.close();
  await new Promise<void>((resolve, reject) =>
    upstream.close((error) => (error ? reject(error) : resolve())),
  );
});

describe("gateway routes", () => {
  it("reports diagnostic health and strict readiness", async () => {
    const health = await app.inject({ method: "GET", url: "/api/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toMatchObject({
      gateway: "ok",
      hydrus: "ok",
      apiVersion: 83,
    });
    const ready = await app.inject({ method: "GET", url: "/api/ready" });
    expect(ready.statusCode).toBe(200);
    expect(ready.json()).toEqual({ ready: true });
  });

  it("searches tags/files and normalizes bounded metadata", async () => {
    const tags = await app.inject({ method: "GET", url: "/api/tags?q=cre" });
    expect(tags.json().tags[0]).toEqual({ value: "creator:test", count: 5 });
    const search = await app.inject({
      method: "POST",
      url: "/api/search",
      payload: { predicates: ["cat"], sort: 2, ascending: false, limit: 500 },
    });
    expect(search.json()).toEqual({
      fileIds: [9, 8],
      limit: 500,
      limited: false,
    });
    const limited = await app.inject({
      method: "POST",
      url: "/api/search",
      payload: { predicates: [], sort: 2, ascending: false, limit: 2 },
    });
    expect(limited.json()).toMatchObject({ limit: 2, limited: true });
    const metadata = await app.inject({
      method: "POST",
      url: "/api/metadata",
      payload: { fileIds: [9] },
    });
    expect(metadata.json().files[0]).toMatchObject({
      fileId: 9,
      ext: "jpg",
      inbox: true,
    });
  });

  it("streams thumbnails and byte ranges while rejecting invalid ranges", async () => {
    const thumbnail = await app.inject({
      method: "GET",
      url: "/api/media/9/thumbnail",
    });
    expect(thumbnail.statusCode).toBe(200);
    expect(thumbnail.headers["content-type"]).toContain("image/jpeg");
    const rendered = await app.inject({
      method: "GET",
      url: "/api/media/9/render",
    });
    expect(rendered.statusCode).toBe(200);
    expect(rendered.headers["content-type"]).toContain("image/jpeg");
    expect(rendered.body).toBe("rendered-jxl");
    const range = await app.inject({
      method: "GET",
      url: "/api/media/9/file",
      headers: { range: "bytes=0-3" },
    });
    expect(range.statusCode).toBe(206);
    expect(range.headers["content-range"]).toBe("bytes 0-3/8");
    const invalid = await app.inject({
      method: "GET",
      url: "/api/media/9/file",
      headers: { range: "bytes=99-100" },
    });
    expect(invalid.statusCode).toBe(416);
    expect(invalid.json()).toMatchObject({
      code: "HYDRUS_ERROR",
      message: "invalid range",
    });
  });

  it("sends hash-based tag and archive mutations", async () => {
    const hash = "a".repeat(64);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/tags/mutate",
          payload: {
            hash,
            serviceKey: "b".repeat(64),
            add: ["series:test"],
            remove: [],
          },
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: "POST",
          url: "/api/files/state",
          payload: { hashes: [hash], action: "archive" },
        })
      ).statusCode,
    ).toBe(200);
    expect(writes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/add_tags/add_tags",
          body: expect.objectContaining({ hashes: [hash] }),
        }),
        { path: "/add_files/archive_files", body: { hashes: [hash] } },
      ]),
    );
  });
});
