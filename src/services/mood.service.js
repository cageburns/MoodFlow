export const SUPPORTED_MOODS = [
  "happy",
  "calm",
  "sad",
  "anxious",
  "angry",
  "tired",
  "focused",
  "overwhelmed"
];

export const MUSIC_MODES = ["match", "shift"];

const supportedMoodSet = new Set(SUPPORTED_MOODS);
const musicModeSet = new Set(MUSIC_MODES);

export function createValidationError(details, message = "Invalid mood entry.") {
  const error = new Error("Invalid mood entry.");
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.publicMessage = message;
  error.details = details;
  return error;
}

function isIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

export function validateMoodInput(input) {
  const details = [];
  const mood = normalizeOptionalString(input?.mood);
  const musicMode = normalizeOptionalString(input?.musicMode);
  const targetMood = normalizeOptionalString(input?.targetMood);
  const note = input?.note === undefined || input?.note === null
    ? ""
    : String(input.note);
  const intensity = Number(input?.intensity);
  const energy = Number(input?.energy);

  if (!supportedMoodSet.has(mood)) {
    details.push({
      field: "mood",
      message: "Mood must be one of the supported MoodFlow moods."
    });
  }

  if (!isIntegerInRange(intensity, 1, 10)) {
    details.push({
      field: "intensity",
      message: "Intensity must be an integer from 1 to 10."
    });
  }

  if (!isIntegerInRange(energy, 1, 10)) {
    details.push({
      field: "energy",
      message: "Energy must be an integer from 1 to 10."
    });
  }

  if (note.length > 300) {
    details.push({
      field: "note",
      message: "Note must not exceed 300 characters."
    });
  }

  if (!musicModeSet.has(musicMode)) {
    details.push({
      field: "musicMode",
      message: "Music mode must be match or shift."
    });
  }

  if (musicMode === "shift") {
    if (!targetMood) {
      details.push({
        field: "targetMood",
        message: "Target mood is required for shift mode."
      });
    } else if (!supportedMoodSet.has(targetMood)) {
      details.push({
        field: "targetMood",
        message: "Target mood must be one of the supported MoodFlow moods."
      });
    } else if (targetMood === mood) {
      details.push({
        field: "targetMood",
        message: "Target mood must differ from the current mood."
      });
    }
  }

  if (musicMode === "match" && targetMood) {
    details.push({
      field: "targetMood",
      message: "Target mood must not be provided for match mode."
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    mood,
    intensity,
    energy,
    note,
    musicMode,
    targetMood: musicMode === "shift" ? targetMood : null
  };
}

function parseUtcInstant(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    return {
      value: null,
      error: {
        field,
        message: `${field} must be a UTC ISO timestamp.`
      }
    };
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return {
      value: null,
      error: {
        field,
        message: `${field} must be a valid UTC ISO timestamp.`
      }
    };
  }

  return {
    value: parsed.toISOString(),
    error: null
  };
}

export function validateHistoryRange(input = {}) {
  const fromResult = parseUtcInstant(input.from, "from");
  const toResult = parseUtcInstant(input.to, "to");
  const details = [fromResult.error, toResult.error].filter(Boolean);

  if (details.length === 0 && new Date(fromResult.value) >= new Date(toResult.value)) {
    details.push({
      field: "to",
      message: "to must be later than from."
    });
  }

  if (details.length > 0) {
    throw createValidationError(details, "Invalid history date range.");
  }

  return {
    from: fromResult.value,
    to: toResult.value
  };
}

export function createMoodService(repository, now = () => new Date()) {
  return {
    createMoodEntry(input) {
      const entry = validateMoodInput(input);
      return repository.create({
        ...entry,
        createdAt: now().toISOString()
      });
    },

    listRecentMoodEntries(limit) {
      const safeLimit = Number.isInteger(limit) && limit > 0 && limit <= 100
        ? limit
        : 20;
      return repository.listRecent(safeLimit);
    },

    listMoodEntries({ limit, from, to } = {}) {
      if (from !== undefined || to !== undefined) {
        const range = validateHistoryRange({ from, to });
        return repository.listBetween(range.from, range.to);
      }

      return this.listRecentMoodEntries(limit);
    }
  };
}
