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
  chartStatusElement: document.querySelector("#chart-status")
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
      ? "Server status: ok"
      : "Server status is unavailable.";
  } catch {
    statusElement.textContent = "Server status is unavailable.";
  }
}

async function loadRecentEntries() {
  await historyController.loadRecent();
}

showHealthStatus();
loadRecentEntries().catch(() => {
  document.querySelector("#history-status").textContent = "Recent entries could not be loaded.";
});

initializeMoodForm({
  form: moodForm,
  statusElement: formStatusElement,
  onSaved: (entry) => {
    suggestionsController.setMoodEntry(entry);
    loadRecentEntries().catch(() => {
      formStatusElement.textContent = "Mood entry saved, but recent entries could not be refreshed.";
    });
  }
});
