CREATE TABLE IF NOT EXISTS mood_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL DEFAULT 'legacy',
  mood TEXT NOT NULL,
  intensity INTEGER NOT NULL CHECK (intensity BETWEEN 1 AND 10),
  energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 10),
  note TEXT NULL CHECK (note IS NULL OR length(note) <= 300),
  music_mode TEXT NOT NULL CHECK (music_mode IN ('match', 'shift')),
  target_mood TEXT NULL,
  created_at TEXT NOT NULL
);
