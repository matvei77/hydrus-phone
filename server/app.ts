import Fastify from "fastify";
import helmet from "@fastify/helmet";
import compress from "@fastify/compress";
import rateLimit from "@fastify/rate-limit";
import staticPlugin from "@fastify/static";
import { Readable } from "node:stream";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import type { Config } from "./config.js";
import { HydrusClient, HydrusError } from "./hydrus.js";

const searchSchema = z.object({
  predicates: z
    .array(z.union([z.string(), z.array(z.string()).min(2)]))
    .default([]),
  sort: z.number().int().min(0).max(27).default(2),
  ascending: z.boolean().default(false),
  limit: z.number().int().min(1).max(10_000).default(500),
  fileServiceKey: z.string().optional(),
  tagServiceKey: z.string().optional(),
});
const batchSchema = z.object({
  fileIds: z.array(z.number().int().positive()).min(1).max(256),
});
const tagMutationSchema = z
  .object({
    hash: z.string().regex(/^[0-9a-f]{64}$/i),
    serviceKey: z.string().regex(/^[0-9a-f]{64}$/i),
    add: z.array(z.string()).max(100).default([]),
    remove: z.array(z.string()).max(100).default([]),
  })
  .refine((v) => v.add.length + v.remove.length > 0);
const fileMutationSchema = z.object({
  hashes: z
    .array(z.string().regex(/^[0-9a-f]{64}$/i))
    .min(1)
    .max(256),
  action: z.enum(["archive", "unarchive"]),
});

export const isAssetRequest = (url: string) =>
  url.startsWith("/assets/") || /\.[a-z0-9]+(?:\?|$)/i.test(url);

export const normalizeMetadata = (item: any) => {
  const tags = item.tags ?? {};
  const displayTags: Record<string, string[]> = {};
  const storageTags: Record<string, string[]> = {};
  for (const [serviceKey, service] of Object.entries<any>(tags)) {
    displayTags[serviceKey] = [
      ...(service.display_tags?.["0"] ?? []),
      ...(service.display_tags?.["1"] ?? []),
    ];
    storageTags[serviceKey] = [
      ...(service.storage_tags?.["0"] ?? []),
      ...(service.storage_tags?.["1"] ?? []),
    ];
  }
  return {
    fileId: item.file_id,
    hash: item.hash,
    size: item.size,
    mime: item.mime,
    ext: String(item.ext ?? "").replace(/^\./, ""),
    width: item.width ?? null,
    height: item.height ?? null,
    duration: item.duration ?? null,
    numFrames: item.num_frames ?? null,
    hasAudio: item.has_audio ?? false,
    blurhash: item.blurhash ?? null,
    inbox: item.is_inbox ?? false,
    archived: !item.is_inbox,
    filetypeHuman: item.filetype_human ?? item.ext ?? "unknown",
    knownUrls: item.known_urls ?? [],
    ratings: item.ratings ?? {},
    notes: item.notes ?? {},
    timeImported:
      item.time_imported ??
      (item.time_imported_ms ? Math.floor(item.time_imported_ms / 1000) : null),
    modified: item.modified_timestamp ?? null,
    displayTags,
    storageTags,
  };
};

export function buildTagMutationBody(input: z.infer<typeof tagMutationSchema>) {
  const actions: Record<string, string[]> = {};
  if (input.add.length) actions["0"] = input.add;
  if (input.remove.length) actions["1"] = input.remove;
  return {
    hashes: [input.hash],
    service_keys_to_actions_to_tags: { [input.serviceKey]: actions },
    override_previously_deleted_mappings: true,
    create_new_deleted_mappings: false,
  };
}

export async function buildApp(
  config: Config,
  options: { serveStatic?: boolean } = {},
) {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      redact: [
        "req.headers.hydrus-client-api-access-key",
        "req.headers.hydrus-client-api-session-key",
        "req.headers.authorization",
      ],
    },
    bodyLimit: 256 * 1024,
    requestTimeout: 30_000,
  });
  const hydrus = new HydrusClient(config);
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "blob:", "data:"],
        mediaSrc: ["'self'", "blob:"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
      },
    },
  });
  await app.register(compress);
  await app.register(rateLimit, { max: 180, timeWindow: "1 minute" });
  app.addHook("onSend", async (request, reply, payload) => {
    if (
      request.url.startsWith("/api/") &&
      !request.url.includes("/thumbnail")
    ) {
      reply.header("cache-control", "private, no-store");
    }
    return payload;
  });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof z.ZodError)
      return reply.code(400).send({
        code: "INVALID_REQUEST",
        message: "The request contains invalid values.",
        details: error.flatten(),
      });
    if (error instanceof HydrusError)
      return reply
        .code(error.status >= 500 ? error.status : error.status)
        .send({ code: error.code, message: error.message });
    app.log.error(error);
    return reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "The gateway could not complete the request.",
    });
  });

  app.get("/api/health", async () => {
    const started = Date.now();
    try {
      const [version, permissions, services] = await Promise.all([
        hydrus.request<any>("/api_version"),
        hydrus.request<any>("/verify_access_key"),
        hydrus.request<any>("/get_services"),
      ]);
      const all = Object.entries<any>(services.services ?? {}).map(
        ([key, value]) => ({
          key,
          name: value.name,
          type: value.type,
          group:
            value.type === 5
              ? "local_tags"
              : [2, 14, 15, 21].includes(value.type)
                ? "local_files"
                : "other",
        }),
      );
      const requiredPermissions = [1, 2, 3];
      const missingPermissions = requiredPermissions.filter(
        (permission) =>
          !permissions.permits_everything &&
          !permissions.basic_permissions?.includes(permission),
      );
      const extraPermissions = (permissions.basic_permissions ?? []).filter(
        (permission: number) => !requiredPermissions.includes(permission),
      );
      const unsupportedApi = version.version < 83;
      return {
        gateway: "ok",
        hydrus: missingPermissions.length || unsupportedApi ? "error" : "ok",
        version: "0.1.0-rc.5",
        hydrusVersion: version.hydrus_version,
        apiVersion: version.version,
        permissions: permissions.basic_permissions,
        missingPermissions,
        extraPermissions,
        code: unsupportedApi
          ? "HYDRUS_API_UNSUPPORTED"
          : missingPermissions.length
            ? "HYDRUS_PERMISSION"
            : undefined,
        message: unsupportedApi
          ? `Hydrus Client API v${version.version} is unsupported; v83 or newer is required.`
          : missingPermissions.length
            ? `Hydrus Pocket is missing required permissions: ${missingPermissions.join(", ")}.`
            : undefined,
        permitsEverything: permissions.permits_everything,
        services: all,
        appUrl: config.APP_URL ?? null,
        lastSuccess: hydrus.getLastSuccess(),
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      if (error instanceof HydrusError)
        return {
          gateway: "ok",
          hydrus: "error",
          version: "0.1.0-rc.5",
          code: error.code,
          message: error.message,
          lastSuccess: hydrus.getLastSuccess(),
          latencyMs: Date.now() - started,
        };
      throw error;
    }
  });

  app.get("/api/ready", async (_request, reply) => {
    try {
      const [version, permissions] = await Promise.all([
        hydrus.request<any>("/api_version"),
        hydrus.request<any>("/verify_access_key"),
      ]);
      const missingPermissions = [1, 2, 3].filter(
        (permission) =>
          !permissions.permits_everything &&
          !permissions.basic_permissions?.includes(permission),
      );
      if (version.version < 83 || missingPermissions.length) {
        return reply.code(503).send({
          ready: false,
          code:
            version.version < 83
              ? "HYDRUS_API_UNSUPPORTED"
              : "HYDRUS_PERMISSION",
        });
      }
      return { ready: true };
    } catch (error) {
      return reply.code(503).send({
        ready: false,
        code: error instanceof HydrusError ? error.code : "HYDRUS_UNAVAILABLE",
      });
    }
  });

  app.get("/api/tags", async (request) => {
    const query = z
      .object({
        q: z.string().trim().max(200),
        tagServiceKey: z.string().optional(),
        mode: z.enum(["display", "storage"]).default("display"),
      })
      .parse(request.query);
    if (query.q.length < 1) return { tags: [] };
    const result = await hydrus.request<any>("/add_tags/search_tags", {
      query: {
        search: query.q.endsWith("*") ? query.q : `${query.q}*`,
        tag_display_type: query.mode,
        tag_service_key: query.tagServiceKey,
      },
    });
    return {
      tags: (result.tags ?? []).slice(0, 50).map((tag: any) =>
        typeof tag === "string"
          ? { value: tag, count: null }
          : {
              value: tag.value ?? tag.tag,
              count: tag.count ?? tag.counts?.[0] ?? null,
            },
      ),
    };
  });

  app.post("/api/search", async (request) => {
    const input = searchSchema.parse(request.body);
    const predicates = [...input.predicates, `system:limit=${input.limit}`];
    const result = await hydrus.request<any>("/get_files/search_files", {
      query: {
        tags: predicates,
        file_sort_type: input.sort,
        file_sort_asc: input.ascending,
        return_hashes: false,
        file_service_key: input.fileServiceKey,
        tag_service_key: input.tagServiceKey,
      },
    });
    return {
      fileIds: result.file_ids ?? [],
      limit: input.limit,
      limited: (result.file_ids?.length ?? 0) >= input.limit,
    };
  });

  app.post("/api/metadata", async (request) => {
    const input = batchSchema.parse(request.body);
    const result = await hydrus.request<any>("/get_files/file_metadata", {
      query: { file_ids: input.fileIds, only_return_basic_information: false },
    });
    return { files: (result.metadata ?? []).map(normalizeMetadata) };
  });

  const relay = async (request: any, reply: any, path: string) => {
    const params = z
      .object({ fileId: z.coerce.number().int().positive() })
      .parse(request.params);
    const controller = new AbortController();
    request.raw.once("aborted", () => controller.abort());
    reply.raw.once("close", () => controller.abort());
    const response = await hydrus.stream(
      path,
      { file_id: params.fileId },
      request.headers.range,
      controller.signal,
    );
    for (const key of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const value = response.headers.get(key);
      if (value) reply.header(key, value);
    }
    reply.header(
      "cache-control",
      path.includes("thumbnail")
        ? "private, max-age=86400"
        : "private, no-store",
    );
    reply.code(response.status);
    return reply.send(
      response.body ? Readable.fromWeb(response.body as any) : null,
    );
  };
  app.get("/api/media/:fileId/thumbnail", (req, rep) =>
    relay(req, rep, "/get_files/thumbnail"),
  );
  app.get("/api/media/:fileId/file", (req, rep) =>
    relay(req, rep, "/get_files/file"),
  );

  app.post("/api/tags/mutate", async (request) => {
    const input = tagMutationSchema.parse(request.body);
    await hydrus.request("/add_tags/add_tags", {
      method: "POST",
      body: buildTagMutationBody(input),
    });
    return { ok: true };
  });

  app.post("/api/files/state", async (request) => {
    const input = fileMutationSchema.parse(request.body);
    await hydrus.request(`/add_files/${input.action}_files`, {
      method: "POST",
      body: { hashes: input.hashes },
    });
    return { ok: true };
  });

  const clientRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "client",
  );
  const serveStatic = options.serveStatic ?? true;
  if (serveStatic) {
    await app.register(staticPlugin, { root: clientRoot });
  }
  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Unknown application API route.",
      });
    }
    if (isAssetRequest(request.url)) {
      return reply.code(404).type("text/plain").send("Asset not found");
    }
    return serveStatic
      ? reply.sendFile("index.html")
      : reply.code(404).send({ code: "NOT_FOUND" });
  });
  return app;
}
