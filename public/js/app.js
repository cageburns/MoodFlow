import { requestJson } from "./api.js";
import { renderHistory } from "./history.js";
import { initializeMoodForm } from "./mood-form.js";
import { initializePlayer } from "./player.js";
import { initializeSuggestions } from "./suggestions.js";

const statusElement = document.querySelector("#health-status");
const formStatusElement = document.querySelector("#form-status");
const historyListElement = document.querySelector("#history-list");
const moodForm = document.querySelector("#mood-form");
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
  const result = await requestJson("/api/moods");
  renderHistory(result.entries, historyListElement);
}

showHealthStatus();
loadRecentEntries().catch(() => {
  renderHistory([], historyListElement);
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
