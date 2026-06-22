import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer } from "node:http";
import Database from "better-sqlite3";
import { createApp } from "../src/app.js";
import { initializeDatabase } from "../src/data/db.js";
import { createMoodRepository } from "../src/data/mood.repository.js";
import { createMoodService } from "../src/services/mood.service.js";
import { createSummaryService } from "../src/services/summary.service.js";

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
  const summaryService = createSummaryService(repository);
  const app = createApp({ moodService, summaryService });
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

  it("filters entries by UTC range chronologically", async () => {
    db.prepare(`
      INSERT INTO mood_entries (
        mood, intensity, energy, note, music_mode, target_mood, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run("calm", 3, 2, "", "match", null, "2026-06-22T06:00:00.000Z");

    const params = new URLSearchParams({
      from: "2026-06-22T00:00:00.000Z",
      to: "2026-06-23T00:00:00.000Z"
    });
    const response = await fetch(`${baseUrl}/api/moods?${params.toString()}`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(body.entries.map((entry) => entry.mood), ["calm"]);
  });

  it("returns day and range summaries suitable for charts", async () => {
    const insert = db.prepare(`
      INSERT INTO mood_entries (
        mood, intensity, energy, note, music_mode, target_mood, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    insert.run("calm", 4, 3, "", "match", null, "2026-06-23T09:00:00.000Z");
    insert.run("focused", 8, 7, "", "match", null, "2026-06-23T11:00:00.000Z");

    const dayParams = new URLSearchParams({
      mode: "day",
      from: "2026-06-23T00:00:00.000Z",
      to: "2026-06-24T00:00:00.000Z",
      timeZone: "UTC"
    });
    const dayResponse = await fetch(`${baseUrl}/api/moods/summary?${dayParams.toString()}`);
    const dayBody = await dayResponse.json();

    assert.equal(dayResponse.status, 200);
    assert.equal(dayBody.mode, "day");
    assert.deepEqual(dayBody.points.map((point) => point.intensity), [4, 8]);

    const rangeParams = new URLSearchParams({
      mode: "range",
      from: "2026-06-23T00:00:00.000Z",
      to: "2026-06-24T00:00:00.000Z",
      timeZone: "UTC"
    });
    const rangeResponse = await fetch(`${baseUrl}/api/moods/summary?${rangeParams.toString()}`);
    const rangeBody = await rangeResponse.json();

    assert.equal(rangeResponse.status, 200);
    assert.equal(rangeBody.mode, "range");
    assert.equal(rangeBody.points.length, 1);
    assert.equal(rangeBody.points[0].averageIntensity, 6);
    assert.equal(rangeBody.points[0].averageEnergy, 5);
    assert.equal(rangeBody.points[0].entryCount, 2);
  });

  it("rejects invalid history date ranges", async () => {
    const params = new URLSearchParams({
      from: "2026-06-24T00:00:00.000Z",
      to: "2026-06-23T00:00:00.000Z"
    });
    const response = await fetch(`${baseUrl}/api/moods?${params.toString()}`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.equal(body.error.details[0].field, "to");
  });

  it("rejects invalid summary mode and time zone parameters", async () => {
    const invalidModeParams = new URLSearchParams({
      mode: "week",
      from: "2026-06-23T00:00:00.000Z",
      to: "2026-06-24T00:00:00.000Z",
      timeZone: "UTC"
    });
    const invalidModeResponse = await fetch(`${baseUrl}/api/moods/summary?${invalidModeParams.toString()}`);
    const invalidModeBody = await invalidModeResponse.json();

    assert.equal(invalidModeResponse.status, 400);
    assert.equal(invalidModeBody.error.code, "VALIDATION_ERROR");
    assert.equal(invalidModeBody.error.details[0].field, "mode");

    const invalidTimeZoneParams = new URLSearchParams({
      mode: "day",
      from: "2026-06-23T00:00:00.000Z",
      to: "2026-06-24T00:00:00.000Z",
      timeZone: "Not/AZone"
    });
    const invalidTimeZoneResponse = await fetch(`${baseUrl}/api/moods/summary?${invalidTimeZoneParams.toString()}`);
    const invalidTimeZoneBody = await invalidTimeZoneResponse.json();

    assert.equal(invalidTimeZoneResponse.status, 400);
    assert.equal(invalidTimeZoneBody.error.code, "VALIDATION_ERROR");
    assert.equal(invalidTimeZoneBody.error.details[0].field, "timeZone");
  });
});
