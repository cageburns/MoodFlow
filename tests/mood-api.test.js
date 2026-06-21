import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer } from "node:http";
import Database from "better-sqlite3";
import { createApp } from "../src/app.js";
import { initializeDatabase } from "../src/data/db.js";
import { createMoodRepository } from "../src/data/mood.repository.js";
import { createMoodService } from "../src/services/mood.service.js";

let db;
let server;
let baseUrl;

before(async () => {
  db = new Database(":memory:");
  initializeDatabase(db);
  const repository = createMoodRepository(db);
  const moodService = createMoodService(
    repository,
    () => new Date("2026-06-21T12:30:00.000Z")
  );
  const app = createApp({ moodService });
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  db.close();
});

async function postMood(payload) {
  const response = await fetch(`${baseUrl}/api/moods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  return { response, body };
}

describe("mood API", () => {
  it("saves valid mood entries", async () => {
    const { response, body } = await postMood({
      mood: "anxious",
      intensity: 8,
      energy: 7,
      note: "Busy afternoon",
      musicMode: "shift",
      targetMood: "calm"
    });

    assert.equal(response.status, 201);
    assert.equal(body.entry.mood, "anxious");
    assert.equal(body.entry.targetMood, "calm");
    assert.equal(body.entry.createdAt, "2026-06-21T12:30:00.000Z");
  });

  it("rejects invalid mood entries with validation errors", async () => {
    const { response, body } = await postMood({
      mood: "excited",
      intensity: 4,
      energy: 4,
      musicMode: "match"
    });

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.details[0].field, "mood");
  });

  it("lists recent entries newest first", async () => {
    await postMood({
      mood: "happy",
      intensity: 5,
      energy: 5,
      musicMode: "match"
    });

    const response = await fetch(`${baseUrl}/api/moods`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.entries[0].createdAt, "2026-06-21T12:30:00.000Z");
    assert.ok(body.entries.length >= 2);
  });
});
