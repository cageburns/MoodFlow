import dotenv from "dotenv";

dotenv.config();

const DEFAULT_PORT = 3000;

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

  const port = Number.parseInt(env.PORT || `${DEFAULT_PORT}`, 10);

  if (!Number.isInteger(port) || port <= 0) {
    const error = new Error("PORT must be a positive integer.");
    error.code = "CONFIGURATION_ERROR";
    throw error;
  }

  return {
    port,
    databasePath: env.DATABASE_PATH
  };
}
