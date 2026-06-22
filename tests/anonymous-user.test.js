import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createServer } from "node:http";
import Database from "better-sqlite3";
import { createApp } from "../src/app.js";
import { initializeDatabase } from "../src/data/db.js";
import { createMoodRepository } from "../src/data/mood.repository.js";
import { createMoodService } from "../src/services/mood.service.js";
import { createSummaryService } from "../src/services/summary.service.js";
import { ANONYMOUS_USER_COOKIE } from "../src/middleware/anonymous-user.js";

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

function cookiePair(setCookieHeader) {
  return setCookieHeader.split(";")[0];
}

async function postMood(cookie, mood) {
  const response = await fetch(`${baseUrl}/api/moods`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie
    },
    body: JSON.stringify({
      mood,
      intensity: 5,
      energy: 5,
      musicMode: "match"
    })
  });
  const body = await response.json();
  return { response, body };
}

async function listMoods(cookie) {
  const response = await fetch(`${baseUrl}/api/moods`, {
    headers: { Cookie: cookie }
  });
  const body = await response.json();
  return { response, body };
}

async function daySummary(cookie) {
  const params = new URLSearchParams({
    mode: "day",
    from: "2026-06-21T00:00:00.000Z",
    to: "2026-06-22T00:00:00.000Z",
    timeZone: "UTC"
  });
  const response = await fetch(`${baseUrl}/api/moods/summary?${params.toString()}`, {
    headers: { Cookie: cookie }
  });
  const body = await response.json();
  return { response, body };
}

describe("anonymous user separation", () => {
  it("sets a long-lived HttpOnly anonymous-user cookie on first request", async () => {
    const response = await fetch(`${baseUrl}/api/health`);
    const setCookie = response.headers.get("set-cookie");

    assert.equal(response.status, 200);
    assert.match(setCookie, new RegExp(`^${ANONYMOUS_USER_COOKIE}=`));
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Lax/);
    assert.match(setCookie, /Path=\//);
    assert.match(setCookie, /Max-Age=31536000/);
    assert.equal(/;\s*Secure/i.test(setCookie), false);
  });

  it("reuses the same cookie to show the same browser's entries", async () => {
    const first = await fetch(`${baseUrl}/api/health`);
    const cookie = cookiePair(first.headers.get("set-cookie"));
    const saved = await postMood(cookie, "happy");
    const listed = await listMoods(cookie);

    assert.equal(saved.response.status, 201);
    assert.equal(listed.response.status, 200);
    assert.deepEqual(listed.body.entries.map((entry) => entry.mood), ["happy"]);
  });

  it("keeps different browser cookies from seeing each other's history and summaries", async () => {
    const firstClient = cookiePair((await fetch(`${baseUrl}/api/health`)).headers.get("set-cookie"));
    const secondClient = cookiePair((await fetch(`${baseUrl}/api/health`)).headers.get("set-cookie"));

    await postMood(firstClient, "calm");
    await postMood(secondClient, "angry");

    const firstHistory = await listMoods(firstClient);
    const secondHistory = await listMoods(secondClient);
    const firstSummary = await daySummary(firstClient);
    const secondSummary = await daySummary(secondClient);

    assert.equal(firstHistory.response.status, 200);
    assert.equal(secondHistory.response.status, 200);
    assert.deepEqual(firstHistory.body.entries.map((entry) => entry.mood), ["calm"]);
    assert.deepEqual(secondHistory.body.entries.map((entry) => entry.mood), ["angry"]);
    assert.deepEqual(firstSummary.body.points.map((point) => point.mood), ["calm"]);
    assert.deepEqual(secondSummary.body.points.map((point) => point.mood), ["angry"]);
  });

  it("replaces an invalid anonymous-user cookie with a new valid cookie", async () => {
    const response = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Cookie: `${ANONYMOUS_USER_COOKIE}=not-a-valid-id`
      }
    });
    const setCookie = response.headers.get("set-cookie");

    assert.equal(response.status, 200);
    assert.match(setCookie, new RegExp(`^${ANONYMOUS_USER_COOKIE}=`));
    assert.notEqual(cookiePair(setCookie), `${ANONYMOUS_USER_COOKIE}=not-a-valid-id`);
  });

  it("adds the Secure cookie flag only in production", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    try {
      const response = await fetch(`${baseUrl}/api/health`);
      const setCookie = response.headers.get("set-cookie");

      assert.match(setCookie, /;\s*Secure/i);
    } finally {
      if (originalNodeEnv === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = originalNodeEnv;
      }
    }
  });
});
