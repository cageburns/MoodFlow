import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { errorHandler, notFoundHandler } from "./middleware/error-handler.js";
import { createMoodsRouter } from "./routes/moods.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "..", "public");

export function createApp({ moodService } = {}) {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(express.static(publicDir));

  app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok" });
  });

  if (moodService) {
    app.use("/api/moods", createMoodsRouter(moodService));
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
