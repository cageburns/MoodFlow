import { MUSIC_MODES, SUPPORTED_MOODS } from "./mood.service.js";

const supportedMoodSet = new Set(SUPPORTED_MOODS);
const musicModeSet = new Set(MUSIC_MODES);

export const RECOMMENDATION_RULES = {
  excludeTerms: ["reaction", "review", "interview", "tutorial", "podcast", "analysis"],
  rankingHints: {
    prefer: ["official audio", "official video", "provided to youtube", "topic", "vevo"],
    deprioritize: ["live", "cover", "karaoke", "remix", "lyrics"]
  },
  moods: {
    happy: {
      moodTerms: ["happy", "bright", "uplifting"],
      styleTerms: ["pop", "feel good"],
      transitionTerms: ["positive", "light"]
    },
    calm: {
      moodTerms: ["calm", "soothing", "peaceful"],
      styleTerms: ["ambient", "gentle"],
      transitionTerms: ["settling", "relaxing"]
    },
    sad: {
      moodTerms: ["sad", "melancholy", "emotional"],
      styleTerms: ["indie", "acoustic"],
      transitionTerms: ["comforting", "reflective"]
    },
    anxious: {
      moodTerms: ["anxious", "tense", "restless"],
      styleTerms: ["atmospheric", "minimal"],
      transitionTerms: ["grounding", "steady"]
    },
    angry: {
      moodTerms: ["angry", "intense", "driving"],
      styleTerms: ["rock", "alternative"],
      transitionTerms: ["release", "focused"]
    },
    tired: {
      moodTerms: ["tired", "low energy", "mellow"],
      styleTerms: ["chill", "downtempo"],
      transitionTerms: ["restorative", "easy"]
    },
    focused: {
      moodTerms: ["focused", "concentration", "flow"],
      styleTerms: ["instrumental", "electronic"],
      transitionTerms: ["clear", "steady"]
    },
    overwhelmed: {
      moodTerms: ["overwhelmed", "busy mind", "pressure"],
      styleTerms: ["ambient", "minimal"],
      transitionTerms: ["spacious", "uncluttered"]
    }
  },
  intensityBands: [
    {
      name: "low",
      min: 1,
      max: 3,
      terms: ["soft", "light"],
      shiftTerms: ["gentle transition"]
    },
    {
      name: "medium",
      min: 4,
      max: 7,
      terms: ["balanced", "steady"],
      shiftTerms: ["gradual transition"]
    },
    {
      name: "high",
      min: 8,
      max: 10,
      terms: ["deep", "strong"],
      shiftTerms: ["grounded transition"]
    }
  ],
  energyBands: [
    {
      name: "low",
      min: 1,
      max: 3,
      terms: ["slow", "low tempo", "gentle"]
    },
    {
      name: "medium",
      min: 4,
      max: 7,
      terms: ["mid tempo", "steady", "balanced"]
    },
    {
      name: "high",
      min: 8,
      max: 10,
      terms: ["upbeat", "energetic", "rhythmic"]
    }
  ]
};

function createRecommendationValidationError(details) {
  const error = new Error("Invalid recommendation input.");
  error.statusCode = 400;
  error.code = "VALIDATION_ERROR";
  error.publicMessage = "Invalid recommendation input.";
  error.details = details;
  return error;
}

function normalizeOptionalString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

function integerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function bandForValue(value, bands) {
  return bands.find((band) => value >= band.min && value <= band.max);
}

function uniqueTerms(terms) {
  return [...new Set(terms.filter(Boolean))];
}

export function validateRecommendationInput(input) {
  const details = [];
  const mood = normalizeOptionalString(input?.mood);
  const mode = normalizeOptionalString(input?.musicMode ?? input?.mode);
  const targetMood = normalizeOptionalString(input?.targetMood);
  const intensity = Number(input?.intensity);
  const energy = Number(input?.energy);

  if (!supportedMoodSet.has(mood)) {
    details.push({
      field: "mood",
      message: "Mood must be one of the supported MoodFlow moods."
    });
  }

  if (!integerInRange(intensity, 1, 10)) {
    details.push({
      field: "intensity",
      message: "Intensity must be an integer from 1 to 10."
    });
  }

  if (!integerInRange(energy, 1, 10)) {
    details.push({
      field: "energy",
      message: "Energy must be an integer from 1 to 10."
    });
  }

  if (!musicModeSet.has(mode)) {
    details.push({
      field: "musicMode",
      message: "Music mode must be match or shift."
    });
  }

  if (mode === "shift") {
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

  if (mode === "match" && targetMood) {
    details.push({
      field: "targetMood",
      message: "Target mood must not be provided for match mode."
    });
  }

  if (details.length > 0) {
    throw createRecommendationValidationError(details);
  }

  return {
    mood,
    intensity,
    energy,
    mode,
    targetMood: mode === "shift" ? targetMood : null
  };
}

export function createRecommendationProfile(input) {
  const entry = validateRecommendationInput(input);
  const sourceMoodRules = RECOMMENDATION_RULES.moods[entry.mood];
  const targetMoodRules = entry.targetMood
    ? RECOMMENDATION_RULES.moods[entry.targetMood]
    : sourceMoodRules;
  const intensityBand = bandForValue(entry.intensity, RECOMMENDATION_RULES.intensityBands);
  const energyBand = bandForValue(entry.energy, RECOMMENDATION_RULES.energyBands);
  const isShift = entry.mode === "shift";

  const moodTerms = isShift
    ? [...targetMoodRules.moodTerms]
    : [...sourceMoodRules.moodTerms];
  const intensityTerms = isShift
    ? [...intensityBand.terms]
    : [...intensityBand.terms];
  const energyTerms = [...energyBand.terms];
  const styleTerms = isShift
    ? uniqueTerms([...targetMoodRules.styleTerms, "music"])
    : uniqueTerms([...sourceMoodRules.styleTerms, "music"]);
  const reason = isShift
    ? `Selected to move from ${entry.mood} toward ${entry.targetMood} with ${intensityBand.name} intensity and ${energyBand.name} energy.`
    : `Selected to match ${entry.mood} with ${intensityBand.name} intensity and ${energyBand.name} energy.`;

  return {
    mode: entry.mode,
    currentMood: entry.mood,
    targetMood: entry.targetMood,
    intensityBand: intensityBand.name,
    energyBand: energyBand.name,
    moodTerms,
    intensityTerms,
    energyTerms,
    styleTerms,
    excludeTerms: [...RECOMMENDATION_RULES.excludeTerms],
    rankingHints: {
      prefer: [...RECOMMENDATION_RULES.rankingHints.prefer],
      deprioritize: [...RECOMMENDATION_RULES.rankingHints.deprioritize]
    },
    reason
  };
}
