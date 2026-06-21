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

function createValidationError(details) {
  const error = new Error("Invalid mood entry.");
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.publicMessage = "Invalid mood entry.";
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
    }
  };
}
