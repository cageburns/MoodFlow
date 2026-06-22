import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { initializeDatabase } from "../src/data/db.js";
import { createMoodRepository } from "../src/data/mood.repository.js";

function createRepository() {
  const db = new Database(":memory:");
  initializeDatabase(db);
  return {
    db,
    repository: createMoodRepository(db)
  };
}

describe("mood repository", () => {
  it("stores and returns mood entries", () => {
    const { db, repository } = createRepository();

    try {
      const entry = repository.create({
        mood: "happy",
        intensity: 7,
        energy: 8,
        note: "Good morning",
        musicMode: "match",
        targetMood: null,
        createdAt: "2026-06-21T10:00:00.000Z"
      });

      assert.equal(entry.id, 1);
      assert.equal(entry.mood, "happy");
      assert.equal(entry.musicMode, "match");
      assert.equal(entry.createdAt, "2026-06-21T10:00:00.000Z");
    } finally {
      db.close();
    }
  });

  it("lists recent entries newest first", () => {
    const { db, repository } = createRepository();

    try {
      repository.create({
        mood: "calm",
        intensity: 3,
        energy: 2,
        note: "",
        musicMode: "match",
        targetMood: null,
        createdAt: "2026-06-21T09:00:00.000Z"
      });
      repository.create({
        mood: "focused",
        intensity: 6,
        energy: 7,
        note: "",
        musicMode: "match",
        targetMood: null,
        createdAt: "2026-06-21T11:00:00.000Z"
      });

      const entries = repository.listRecent(10);
      assert.deepEqual(entries.map((entry) => entry.mood), ["focused", "calm"]);
    } finally {
      db.close();
    }
  });

  it("lists entries inside a UTC range chronologically", () => {
    const { db, repository } = createRepository();

    try {
      repository.create({
        mood: "calm",
        intensity: 3,
        energy: 2,
        note: "",
        musicMode: "match",
        targetMood: null,
        createdAt: "2026-06-20T23:00:00.000Z"
      });
      repository.create({
        mood: "focused",
        intensity: 6,
        energy: 7,
        note: "",
        musicMode: "match",
        targetMood: null,
        createdAt: "2026-06-21T09:00:00.000Z"
      });
      repository.create({
        mood: "happy",
        intensity: 8,
        energy: 9,
        note: "",
        musicMode: "match",
        targetMood: null,
        createdAt: "2026-06-21T11:00:00.000Z"
      });

      const entries = repository.listBetween(
        "2026-06-21T00:00:00.000Z",
        "2026-06-22T00:00:00.000Z"
      );

      assert.deepEqual(entries.map((entry) => entry.mood), ["focused", "happy"]);
    } finally {
      db.close();
    }
  });
});
