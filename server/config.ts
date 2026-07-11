import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  HYDRUS_URL: z.string().url().default("http://127.0.0.1:45869"),
  HYDRUS_ACCESS_KEY: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "must be a 64-character Hydrus access key"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().min(1024).max(65535).default(47810),
  APP_URL: z.preprocess(
    (value) => (value === "" ? undefined : value),
    z.string().url().optional(),
  ),
  LOG_LEVEL: z.string().default("info"),
});

export type Config = z.infer<typeof schema>;
export const loadConfig = (): Config => schema.parse(process.env);
