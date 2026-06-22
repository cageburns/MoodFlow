import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schemaPath = path.join(__dirname, "schema.sql");

export function openDatabase(databasePath) {
  const resolvedPath = path.resolve(databasePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

  const db = new Database(resolvedPath);
  initializeDatabase(db);
  return db;
}

export function initializeDatabase(db) {
  const schema = fs.readFileSync(schemaPath, "utf8");
  db.pragma("foreign_keys = ON");
  db.exec(schema);
  migrateMoodEntries(db);
}

function hasColumn(db, tableName, columnName) {
  return db.prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column) => column.name === columnName);
}

function migrateMoodEntries(db) {
  if (!hasColumn(db, "mood_entries", "user_id")) {
    db.exec("ALTER TABLE mood_entries ADD COLUMN user_id TEXT NOT NULL DEFAULT 'legacy'");
  }

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_mood_entries_user_created
    ON mood_entries (user_id, datetime(created_at), id)
  `);
}
