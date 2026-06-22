import { createValidationError, validateHistoryRange } from "./mood.service.js";

const SUMMARY_MODES = new Set(["day", "range"]);

function validateMode(mode) {
  if (!SUMMARY_MODES.has(mode)) {
    throw createValidationError([
      {
        field: "mode",
        message: "Summary mode must be day or range."
      }
    ], "Invalid summary request.");
  }
}

function validateTimeZone(timeZone) {
  const fallback = "UTC";
  const selectedTimeZone = typeof timeZone === "string" && timeZone.trim()
    ? timeZone.trim()
    : fallback;

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: selectedTimeZone }).format(new Date());
    return selectedTimeZone;
  } catch {
    throw createValidationError([
      {
        field: "timeZone",
        message: "timeZone must be a valid IANA time zone."
      }
    ], "Invalid summary request.");
  }
}

function localDateKey(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function localDateLabel(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    dateStyle: "medium"
  }).format(date);
}

function localTimeLabel(date, timeZone) {
  return new Intl.DateTimeFormat(undefined, {
    timeZone,
    timeStyle: "short"
  }).format(date);
}

function roundAverage(value) {
  return Math.round(value * 100) / 100;
}

function summarizeDay(entries, timeZone) {
  return entries.map((entry) => {
    const createdAt = new Date(entry.createdAt);
    return {
      timestamp: entry.createdAt,
      label: localTimeLabel(createdAt, timeZone),
      mood: entry.mood,
      intensity: entry.intensity,
      energy: entry.energy
    };
  });
}

function summarizeRange(entries, timeZone) {
  const grouped = new Map();

  for (const entry of entries) {
    const createdAt = new Date(entry.createdAt);
    const date = localDateKey(createdAt, timeZone);
    const existing = grouped.get(date) || {
      date,
      label: localDateLabel(createdAt, timeZone),
      intensityTotal: 0,
      energyTotal: 0,
      entryCount: 0
    };

    existing.intensityTotal += entry.intensity;
    existing.energyTotal += entry.energy;
    existing.entryCount += 1;
    grouped.set(date, existing);
  }

  return [...grouped.values()]
    .sort((left, right) => left.date.localeCompare(right.date))
    .map((point) => ({
      date: point.date,
      label: point.label,
      averageIntensity: roundAverage(point.intensityTotal / point.entryCount),
      averageEnergy: roundAverage(point.energyTotal / point.entryCount),
      entryCount: point.entryCount
    }));
}

export function createSummaryService(repository) {
  return {
    getMoodSummary({ mode, from, to, timeZone } = {}) {
      validateMode(mode);
      const range = validateHistoryRange({ from, to });
      const selectedTimeZone = validateTimeZone(timeZone);
      const entries = repository.listBetween(range.from, range.to);
      const points = mode === "day"
        ? summarizeDay(entries, selectedTimeZone)
        : summarizeRange(entries, selectedTimeZone);

      return {
        mode,
        from: range.from,
        to: range.to,
        timeZone: selectedTimeZone,
        points
      };
    }
  };
}
