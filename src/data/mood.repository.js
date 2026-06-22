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
      user_id,
      mood,
      intensity,
      energy,
      note,
      music_mode,
      target_mood,
      created_at
    )
    VALUES (
      @userId,
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
    WHERE id = ? AND user_id = ?
  `);

  const listRecent = db.prepare(`
    SELECT id, mood, intensity, energy, note, music_mode, target_mood, created_at
    FROM mood_entries
    WHERE user_id = ?
    ORDER BY datetime(created_at) DESC, id DESC
    LIMIT ?
  `);

  const listBetween = db.prepare(`
    SELECT id, mood, intensity, energy, note, music_mode, target_mood, created_at
    FROM mood_entries
    WHERE user_id = ? AND created_at >= ? AND created_at < ?
    ORDER BY datetime(created_at) ASC, id ASC
  `);

  return {
    create(entry) {
      const result = insertEntry.run(entry);
      return toMoodEntry(getById.get(result.lastInsertRowid, entry.userId));
    },

    listRecent(userId, limit = 20) {
      return listRecent.all(userId, limit).map(toMoodEntry);
    },

    listBetween(userId, from, to) {
      return listBetween.all(userId, from, to).map(toMoodEntry);
    },

    getById(id, userId) {
      return toMoodEntry(getById.get(id, userId));
    }
  };
}
