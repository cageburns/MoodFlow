import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./data/db.js";
import { createMoodRepository } from "./data/mood.repository.js";
import { createYouTubeClient } from "./integrations/youtube.client.js";
import { createMusicSearchService } from "./services/music-search.service.js";
import { createMoodService } from "./services/mood.service.js";
import { createSearchCache } from "./utils/search-cache.js";

let config;

try {
  config = loadConfig();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

const db = openDatabase(config.databasePath);
const moodRepository = createMoodRepository(db);
const moodService = createMoodService(moodRepository);
const youtubeClient = createYouTubeClient({
  apiKey: config.youtube.apiKey,
  regionCode: config.youtube.regionCode,
  relevanceLanguage: config.youtube.relevanceLanguage,
  requestTimeoutMs: config.youtube.requestTimeoutMs
});
const musicSearchService = createMusicSearchService({
  moodRepository,
  youtubeClient,
  searchCache: createSearchCache(),
  cacheTtlMs: config.youtube.cacheTtlMs
});
const app = createApp({ moodService, musicSearchService });

app.listen(config.port, () => {
  console.log(`MoodFlow listening on http://localhost:${config.port}`);
});
