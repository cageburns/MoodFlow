function toMoodEntry(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    mood: row.mood,
    intensity: row.intensity,
    energy: row.energy,
    note: row.note ?? "",
    musicMode: row.music_mode,
    targetMood: row.target_mood,
    createdAt: row.created_at
  };
}

export function createMoodRepository(db) {
  const insertEntry = db.prepare(`
    INSERT INTO mood_entries (
      mood,
      intensity,
      energy,
      note,
      music_mode,
      target_mood,
      created_at
    )
    VALUES (
      @mood,
      @intensity,
      @energy,
      @note,
      @musicMode,
      @targetMood,
      @createdAt
    )
  `);

  const getById = db.prepare(`
    SELECT id, mood, intensity, energy, note, music_mode, target_mood, created_at
    FROM mood_entries
    WHERE id = ?
  `);

  const listRecent = db.prepare(`
    SELECT id, mood, intensity, energy, note, music_mode, target_mood, created_at
    FROM mood_entries
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ?
  `);

  return {
    create(entry) {
      const result = insertEntry.run(entry);
      return toMoodEntry(getById.get(result.lastInsertRowid));
    },

    listRecent(limit = 20) {
      return listRecent.all(limit).map(toMoodEntry);
    },

    getById(id) {
      return toMoodEntry(getById.get(id));
    }
  };
}
