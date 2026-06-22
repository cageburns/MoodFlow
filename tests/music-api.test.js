import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { createServer } from "node:http";
import Database from "better-sqlite3";
import { createApp } from "../src/app.js";
import { initializeDatabase } from "../src/data/db.js";
import { createMoodRepository } from "../src/data/mood.repository.js";
import { createMoodService } from "../src/services/mood.service.js";
import { createMusicSearchService } from "../src/services/music-search.service.js";
import { createSearchCache } from "../src/utils/search-cache.js";

let db;
let repository;
let moodService;
let server;
let baseUrl;

beforeEach(async () => {
  db = new Database(":memory:");
  initializeDatabase(db);
  repository = createMoodRepository(db);
  moodService = createMoodService(
    repository,
    () => new Date("2026-06-21T12:30:00.000Z")
  );
});

afterEach(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    server = null;
  }

  if (db) {
    db.close();
    db = null;
  }
});

async function startApp(youtubeClient, options = {}) {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    server = null;
  }

  const musicSearchService = createMusicSearchService({
    moodRepository: repository,
    youtubeClient,
    searchCache: options.searchCache || createSearchCache(options.now),
    cacheTtlMs: options.cacheTtlMs || 15 * 60 * 1000
  });
  const app = createApp({ moodService, musicSearchService });
  server = createServer(app);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
}

async function postJson(path, payload) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const body = await response.json();
  return { response, body };
}

async function createMood(payload = {}) {
  const result = moodService.createMoodEntry({
    mood: "anxious",
    intensity: 8,
    energy: 7,
    note: "secret private mood note",
    musicMode: "shift",
    targetMood: "calm",
    ...payload
  });
  return result;
}

function youtubeCandidates() {
  return [
    {
      videoId: "official",
      title: "Calm Song Official Video",
      channelTitle: "ArtistVEVO",
      thumbnailUrl: "https://example.invalid/official.jpg",
      youtubeUrl: "https://www.youtube.com/watch?v=official"
    },
    {
      videoId: "reaction",
      title: "Calm Song Reaction",
      channelTitle: "Reviewer",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=reaction"
    },
    {
      videoId: "topic",
      title: "Calm Song Provided to YouTube",
      channelTitle: "Artist - Topic",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=topic"
    },
    {
      videoId: "duplicate",
      title: "Calm Song Official Audio",
      channelTitle: "Artist",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=duplicate"
    },
    {
      videoId: "duplicate",
      title: "Calm Song Official Video",
      channelTitle: "Artist",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=duplicate"
    },
    {
      videoId: "lyrics",
      title: "Calm Song Lyrics",
      channelTitle: "Artist",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=lyrics"
    },
    {
      videoId: "cover",
      title: "Calm Song Cover",
      channelTitle: "Singer",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=cover"
    },
    {
      videoId: "live",
      title: "Calm Song Live",
      channelTitle: "Artist",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=live"
    },
    {
      videoId: "remix",
      title: "Calm Song Remix",
      channelTitle: "Artist",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=remix"
    },
    {
      videoId: "plain",
      title: "Calm Song",
      channelTitle: "Artist",
      thumbnailUrl: null,
      youtubeUrl: "https://www.youtube.com/watch?v=plain"
    }
  ];
}

function moodCandidate(mood) {
  const titles = {
    anxious: "Anxious Instrumental Official Audio",
    tired: "Tired Mood Music Official Audio",
    angry: "Angry Heavy Metal Official Video"
  };

  return {
    videoId: `${mood}-official`,
    title: titles[mood],
    channelTitle: `${mood} Artist - Topic`,
    thumbnailUrl: null,
    youtubeUrl: `https://www.youtube.com/watch?v=${mood}-official`
  };
}

describe("music suggestions API", () => {
  it("returns up to five ranked suggestions from a saved mood entry", async () => {
    let callCount = 0;
    let seenProfile;
    const mood = await createMood();
    await startApp({
      async search(profile) {
        callCount += 1;
        seenProfile = profile;
        return youtubeCandidates();
      }
    });

    const { response, body } = await postJson("/api/music/suggestions", {
      moodEntryId: mood.id
    });

    assert.equal(response.status, 200);
    assert.equal(callCount, 1);
    assert.equal(body.source, "youtube");
    assert.equal(body.cached, false);
    assert.equal(body.profile.mode, "shift");
    assert.equal(body.profile.currentMood, "anxious");
    assert.equal(body.profile.targetMood, "calm");
    assert.equal(body.suggestions.length, 5);
    assert.equal(body.suggestions.some((item) => item.videoId === "reaction"), false);
    assert.equal(new Set(body.suggestions.map((item) => item.videoId)).size, body.suggestions.length);
    assert.equal(JSON.stringify(seenProfile).includes("secret private mood note"), false);
    assert.equal(JSON.stringify(body).includes("secret private mood note"), false);
    assert.equal("score" in body.suggestions[0], false);
  });

  it("returns suitable match-mode suggestions for anxious, tired, and angry", async () => {
    const cases = [
      {
        mood: "anxious",
        expectedTerms: ["anxious", "tense", "dark ambient", "anxious instrumental"]
      },
      {
        mood: "tired",
        expectedTerms: ["tired", "slow", "low-energy", "tired mood music"]
      },
      {
        mood: "angry",
        expectedTerms: ["angry", "intense", "heavy", "hard rock", "metal"]
      }
    ];

    for (const moodCase of cases) {
      let callCount = 0;
      let seenProfile;
      const mood = await createMood({
        mood: moodCase.mood,
        intensity: 5,
        energy: 5,
        musicMode: "match",
        targetMood: null,
        note: "sensitive note must stay local"
      });
      await startApp({
        async search(profile) {
          callCount += 1;
          seenProfile = profile;
          return [
            moodCandidate(moodCase.mood),
            {
              ...moodCandidate(moodCase.mood),
              videoId: `${moodCase.mood}-reaction`,
              title: `${moodCase.mood} song reaction`
            }
          ];
        }
      });

      const { response, body } = await postJson("/api/music/suggestions", {
        moodEntryId: mood.id
      });

      assert.equal(response.status, 200);
      assert.equal(callCount, 1);
      assert.equal(body.profile.mode, "match");
      assert.equal(body.profile.currentMood, moodCase.mood);
      assert.equal(body.profile.targetMood, null);
      assert.equal(body.suggestions.length, 1);
      assert.equal(body.suggestions[0].videoId, `${moodCase.mood}-official`);
      assert.equal(body.suggestions.some((item) => item.videoId.endsWith("reaction")), false);
      assert.ok(moodCase.expectedTerms.some((term) => seenProfile.queryTerms.includes(term)));
      assert.equal(JSON.stringify(seenProfile).includes("sensitive note"), false);
      assert.equal(JSON.stringify(body).includes("sensitive note"), false);
    }
  });

  it("uses the 15-minute cache for identical successful searches", async () => {
    let now = 1000;
    let callCount = 0;
    const mood = await createMood();
    await startApp({
      async search() {
        callCount += 1;
        return youtubeCandidates();
      }
    }, {
      now: () => now,
      cacheTtlMs: 15 * 60 * 1000
    });

    const first = await postJson("/api/music/suggestions", { moodEntryId: mood.id });
    const second = await postJson("/api/music/suggestions", { moodEntryId: mood.id });
    now += 15 * 60 * 1000 + 1;
    const third = await postJson("/api/music/suggestions", { moodEntryId: mood.id });

    assert.equal(first.body.cached, false);
    assert.equal(second.body.cached, true);
    assert.equal(third.body.cached, false);
    assert.equal(callCount, 2);
  });

  it("returns controlled errors for missing entries and no suitable results", async () => {
    await startApp({
      async search() {
        return [youtubeCandidates()[1]];
      }
    });

    const missing = await postJson("/api/music/suggestions", { moodEntryId: 999 });
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.error.code, "NOT_FOUND");

    const mood = await createMood();
    const empty = await postJson("/api/music/suggestions", { moodEntryId: mood.id });
    assert.equal(empty.response.status, 404);
    assert.equal(empty.body.error.code, "NO_ACCEPTABLE_SUGGESTIONS");
  });

  it("maps YouTube errors into controlled application responses", async () => {
    const mood = await createMood();
    const error = new Error("quota");
    error.code = "YOUTUBE_QUOTA_EXCEEDED";
    error.statusCode = 503;
    error.publicMessage = "Music suggestions are temporarily unavailable because the daily search limit has been reached.";

    await startApp({
      async search() {
        throw error;
      }
    });

    const result = await postJson("/api/music/suggestions", { moodEntryId: mood.id });

    assert.equal(result.response.status, 503);
    assert.equal(result.body.error.code, "YOUTUBE_QUOTA_EXCEEDED");
    assert.equal(JSON.stringify(result.body).includes("quota"), false);
  });

  it("rejects invalid suggestion request payloads before calling YouTube", async () => {
    let callCount = 0;
    await startApp({
      async search() {
        callCount += 1;
        return youtubeCandidates();
      }
    });

    for (const payload of [{}, { moodEntryId: 0 }, { moodEntryId: "abc" }, { moodEntryId: -2 }]) {
      const result = await postJson("/api/music/suggestions", payload);

      assert.equal(result.response.status, 400);
      assert.equal(result.body.error.code, "VALIDATION_ERROR");
      assert.equal(result.body.error.details[0].field, "moodEntryId");
    }

    assert.equal(callCount, 0);
  });

  it("keeps saved mood data available when YouTube is unavailable", async () => {
    const mood = await createMood();
    const error = new Error("upstream failed with private details");
    error.code = "YOUTUBE_UNAVAILABLE";
    error.statusCode = 503;
    error.publicMessage = "Music suggestions are temporarily unavailable.";

    await startApp({
      async search() {
        throw error;
      }
    });

    const suggestionResult = await postJson("/api/music/suggestions", { moodEntryId: mood.id });
    const historyResponse = await fetch(`${baseUrl}/api/moods`);
    const historyBody = await historyResponse.json();

    assert.equal(suggestionResult.response.status, 503);
    assert.equal(suggestionResult.body.error.code, "YOUTUBE_UNAVAILABLE");
    assert.equal(JSON.stringify(suggestionResult.body).includes("private details"), false);
    assert.equal(historyResponse.status, 200);
    assert.equal(historyBody.entries.some((entry) => entry.id === mood.id), true);
  });
});
