import { initializeHistory } from "./history.js";
import { initializeMoodForm } from "./mood-form.js";
import { initializePlayer } from "./player.js";
import { initializeSuggestions } from "./suggestions.js";

const statusElement = document.querySelector("#health-status");
const formStatusElement = document.querySelector("#form-status");
const moodForm = document.querySelector("#mood-form");
const historyController = initializeHistory({
  form: document.querySelector("#history-controls"),
  listElement: document.querySelector("#history-list"),
  statusElement: document.querySelector("#history-status"),
  chartCanvas: document.querySelector("#history-chart"),
  chartStatusElement: document.querySelector("#chart-status"),
  autoLoad: true,
  onLoadError: () => {
    document.querySelector("#history-status").textContent = "History could not be loaded.";
  }
});
const suggestionsController = initializeSuggestions({
  button: document.querySelector("#suggestions-button"),
  listElement: document.querySelector("#suggestions-list"),
  statusElement: document.querySelector("#suggestions-status"),
  player: initializePlayer({
    container: document.querySelector("#youtube-player"),
    statusElement: document.querySelector("#player-status"),
    selectedElement: document.querySelector("#selected-suggestion")
  })
});

async function showHealthStatus() {
  if (!statusElement) {
    return;
  }

  try {
    const response = await fetch("/api/health");
    statusElement.textContent = response.ok
      ? "App status: online"
      : "App status: offline";
  } catch {
    statusElement.textContent = "App status: offline";
  }
}

async function loadRecentEntries() {
  await historyController.loadRecent();
}

showHealthStatus();

initializeMoodForm({
  form: moodForm,
  statusElement: formStatusElement,
  onSaved: async (entry) => {
    suggestionsController.setMoodEntry(entry);
    const [historyResult] = await Promise.allSettled([
      loadRecentEntries(),
      suggestionsController.requestSuggestions()
    ]);

    if (historyResult.status === "rejected") {
      formStatusElement.textContent = "Mood entry saved, but recent entries could not be refreshed.";
    }
  }
});
