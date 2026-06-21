import { requestJson } from "./api.js";
import { renderHistory } from "./history.js";
import { initializeMoodForm } from "./mood-form.js";

const statusElement = document.querySelector("#health-status");
const formStatusElement = document.querySelector("#form-status");
const historyListElement = document.querySelector("#history-list");
const moodForm = document.querySelector("#mood-form");

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
  onSaved: () => {
    loadRecentEntries().catch(() => {
      formStatusElement.textContent = "Mood entry saved, but recent entries could not be refreshed.";
    });
  }
});
