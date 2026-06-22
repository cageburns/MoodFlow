import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT = 3000;
const DEFAULT_YOUTUBE_REGION_CODE = "DE";
const DEFAULT_YOUTUBE_RELEVANCE_LANGUAGE = "en";
const DEFAULT_YOUTUBE_CACHE_TTL_MS = 15 * 60 * 1000;
const DEFAULT_YOUTUBE_REQUEST_TIMEOUT_MS = 8000;

function parsePositiveInteger(value, fallback, name) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    const error = new Error(`${name} must be a positive integer.`);
    error.code = "CONFIGURATION_ERROR";
    throw error;
  }

  return parsed;
}

export function loadConfig(env = process.env) {
  const missing = [];

  if (!env.DATABASE_PATH || env.DATABASE_PATH.trim() === "") {
    missing.push("DATABASE_PATH");
  }

  if (missing.length > 0) {
    const error = new Error(
      `Missing required environment configuration: ${missing.join(", ")}. ` +
        "Create a local .env file from .env.example."
    );
    error.code = "CONFIGURATION_ERROR";
    error.missing = missing;
    throw error;
  }

  const port = parsePositiveInteger(env.PORT, DEFAULT_PORT, "PORT");

  return {
    port,
    databasePath: env.DATABASE_PATH,
    youtube: {
      apiKey: env.YOUTUBE_API_KEY || "",
      regionCode: env.YOUTUBE_REGION_CODE || DEFAULT_YOUTUBE_REGION_CODE,
      relevanceLanguage: env.YOUTUBE_RELEVANCE_LANGUAGE || DEFAULT_YOUTUBE_RELEVANCE_LANGUAGE,
      cacheTtlMs: parsePositiveInteger(
        env.YOUTUBE_CACHE_TTL_MS,
        DEFAULT_YOUTUBE_CACHE_TTL_MS,
        "YOUTUBE_CACHE_TTL_MS"
      ),
      requestTimeoutMs: parsePositiveInteger(
        env.YOUTUBE_REQUEST_TIMEOUT_MS,
        DEFAULT_YOUTUBE_REQUEST_TIMEOUT_MS,
        "YOUTUBE_REQUEST_TIMEOUT_MS"
      )
    }
  };
}
