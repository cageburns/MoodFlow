import { createApp } from "./app.js";
import { loadConfig } from "./config.js";
import { openDatabase } from "./data/db.js";
import { createMoodRepository } from "./data/mood.repository.js";
import { createMoodService } from "./services/mood.service.js";

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
const app = createApp({ moodService });

app.listen(config.port, () => {
  console.log(`MoodFlow listening on http://localhost:${config.port}`);
});
