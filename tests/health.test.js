import assert from "node:assert/strict";
import { before, after, describe, it } from "node:test";
import { createServer } from "node:http";
import { createApp } from "../src/app.js";
import { loadConfig } from "../src/config.js";

let server;
let baseUrl;

before(async () => {
  const app = createApp();
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("Phase 1 foundation", () => {
  it("returns a healthy JSON response", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body, { status: "ok" });
  });

  it("serves the static home page", async () => {
    const response = await fetch(`${baseUrl}/`);
    const body = await response.text();

    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /text\/html/);
    assert.match(body, /MoodFlow/);
  });

  it("returns the shared JSON error shape for unknown routes", async () => {
    const response = await fetch(`${baseUrl}/missing`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.deepEqual(body, {
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
        details: []
      }
    });
  });

  it("reports missing required environment configuration clearly", () => {
    assert.throws(
      () => loadConfig({ PORT: "3000" }),
      /Missing required environment configuration: DATABASE_PATH/
    );
  });
});
