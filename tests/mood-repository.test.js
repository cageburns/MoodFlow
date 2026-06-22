import assert from "node:assert/strict";
import { describe, it } from "node:test";
import Database from "better-sqlite3";
import { initializeDatabase } from "../src/data/db.js";
import { createMoodRepository } from "../src/data/mood.repository.js";

const USER_ID = "00000000-0000-4000-8000-000000000001";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000002";

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
        userId: USER_ID,
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
        userId: USER_ID,
        createdAt: "2026-06-21T09:00:00.000Z"
      });
      repository.create({
        mood: "focused",
        intensity: 6,
        energy: 7,
        note: "",
        musicMode: "match",
        targetMood: null,
        userId: USER_ID,
        createdAt: "2026-06-21T11:00:00.000Z"
      });

      const entries = repository.listRecent(USER_ID, 10);
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
        userId: USER_ID,
        createdAt: "2026-06-20T23:00:00.000Z"
      });
      repository.create({
        mood: "focused",
        intensity: 6,
        energy: 7,
        note: "",
        musicMode: "match",
        targetMood: null,
        userId: USER_ID,
        createdAt: "2026-06-21T09:00:00.000Z"
      });
      repository.create({
        mood: "happy",
        intensity: 8,
        energy: 9,
        note: "",
        musicMode: "match",
        targetMood: null,
        userId: USER_ID,
        createdAt: "2026-06-21T11:00:00.000Z"
      });

      const entries = repository.listBetween(
        USER_ID,
        "2026-06-21T00:00:00.000Z",
        "2026-06-22T00:00:00.000Z"
      );

      assert.deepEqual(entries.map((entry) => entry.mood), ["focused", "happy"]);
    } finally {
      db.close();
    }
  });

  it("isolates entries by anonymous user", () => {
    const { db, repository } = createRepository();

    try {
      const firstUserEntry = repository.create({
        mood: "calm",
        intensity: 3,
        energy: 2,
        note: "",
        musicMode: "match",
        targetMood: null,
        userId: USER_ID,
        createdAt: "2026-06-21T09:00:00.000Z"
      });
      repository.create({
        mood: "focused",
        intensity: 6,
        energy: 7,
        note: "",
        musicMode: "match",
        targetMood: null,
        userId: OTHER_USER_ID,
        createdAt: "2026-06-21T10:00:00.000Z"
      });

      assert.deepEqual(repository.listRecent(USER_ID, 10).map((entry) => entry.mood), ["calm"]);
      assert.deepEqual(repository.listRecent(OTHER_USER_ID, 10).map((entry) => entry.mood), ["focused"]);
      assert.equal(repository.getById(firstUserEntry.id, OTHER_USER_ID), null);
    } finally {
      db.close();
    }
  });

  it("migrates existing databases with a legacy user value", () => {
    const db = new Database(":memory:");

    try {
      db.exec(`
        CREATE TABLE mood_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          mood TEXT NOT NULL,
          intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 10),
          energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 10),
          note TEXT NULL CHECK (note IS NULL OR length(note) <= 300),
          music_mode TEXT NOT NULL CHECK (music_mode IN ('match', 'shift')),
          target_mood TEXT NULL,
          created_at TEXT NOT NULL
        );
        INSERT INTO mood_entries (
          mood, intensity, energy, note, music_mode, target_mood, created_at
        )
        VALUES ('happy', 7, 8, '', 'match', NULL, '2026-06-21T10:00:00.000Z');
      `);

      initializeDatabase(db);
      const columns = db.prepare("PRAGMA table_info(mood_entries)").all();
      const row = db.prepare("SELECT user_id FROM mood_entries WHERE id = 1").get();

      assert.equal(columns.some((column) => column.name === "user_id"), true);
      assert.equal(row.user_id, "legacy");
    } finally {
      db.close();
    }
  });
});
