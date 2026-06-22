import { createRecommendationProfile } from "./recommendation.service.js";
import { cleanRankAndLimitResults } from "../utils/result-ranker.js";

function createPublicError(code, statusCode, publicMessage, details = []) {
  const error = new Error(publicMessage);
  error.code = code;
  error.statusCode = statusCode;
  error.publicMessage = publicMessage;
  error.details = details;
  return error;
}

function publicProfile(profile) {
  return {
    mode: profile.mode,
    currentMood: profile.currentMood,
    targetMood: profile.targetMood,
    profileMood: profile.profileMood,
    reason: profile.reason
  };
}

function cacheKeyForProfile(profile) {
  return JSON.stringify({
    mode: profile.mode,
    currentMood: profile.currentMood,
    targetMood: profile.targetMood,
    intensityBand: profile.intensityBand,
    energyBand: profile.energyBand,
    moodTerms: profile.moodTerms,
    intensityTerms: profile.intensityTerms,
    energyTerms: profile.energyTerms,
    styleTerms: profile.styleTerms,
    queryTerms: profile.queryTerms,
    excludeTerms: profile.excludeTerms
  });
}

function suggestionForResult(result, reason) {
  return {
    videoId: result.videoId,
    title: result.title,
    channelTitle: result.channelTitle,
    thumbnailUrl: result.thumbnailUrl,
    youtubeUrl: result.youtubeUrl,
    reason
  };
}

export function createMusicSearchService({
  moodRepository,
  youtubeClient,
  searchCache,
  cacheTtlMs
}) {
  return {
    async suggestForMoodEntry(moodEntryId) {
      const id = Number(moodEntryId);

      if (!Number.isInteger(id) || id <= 0) {
        throw createPublicError("VALIDATION_ERROR", 400, "Invalid music suggestion request.", [
          {
            field: "moodEntryId",
            message: "Mood entry ID must be a positive integer."
          }
        ]);
      }

      const entry = moodRepository.getById(id);

      if (!entry) {
        throw createPublicError("NOT_FOUND", 404, "Mood entry was not found.");
      }

      const profile = createRecommendationProfile(entry);
      const cacheKey = cacheKeyForProfile(profile);
      const cachedSuggestions = searchCache.get(cacheKey);

      if (cachedSuggestions) {
        return {
          profile: publicProfile(profile),
          suggestions: cachedSuggestions,
          source: "youtube",
          cached: true
        };
      }

      const candidates = await youtubeClient.search(profile);
      const rankedResults = cleanRankAndLimitResults(candidates, 5);

      if (rankedResults.length === 0) {
        throw createPublicError(
          "NO_ACCEPTABLE_SUGGESTIONS",
          404,
          "No suitable YouTube music suggestions were found for this mood entry."
        );
      }

      const suggestions = rankedResults.map((result) => suggestionForResult(result, profile.reason));
      searchCache.set(cacheKey, suggestions, cacheTtlMs);

      return {
        profile: publicProfile(profile),
        suggestions,
        source: "youtube",
        cached: false
      };
    }
  };
}
