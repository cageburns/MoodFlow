import { requestJson } from "./api.js";

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function clearElement(element) {
  element?.replaceChildren();
}

function externalLinkForSuggestion(suggestion) {
  const link = document.createElement("a");
  link.href = suggestion.youtubeUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open on YouTube";
  return link;
}

function suggestionTitle(suggestion) {
  const title = document.createElement("h3");
  title.textContent = suggestion.title;
  return title;
}

function suggestionMeta(suggestion) {
  const meta = document.createElement("p");
  meta.className = "suggestion-meta";
  meta.textContent = suggestion.channelTitle;
  return meta;
}

function suggestionReason(suggestion) {
  const reason = document.createElement("p");
  reason.textContent = suggestion.reason;
  return reason;
}

function renderSuggestionCard(suggestion, isSelected, onSelect) {
  const item = document.createElement("article");
  item.className = isSelected ? "suggestion-card is-selected" : "suggestion-card";

  const playButton = document.createElement("button");
  playButton.type = "button";
  playButton.textContent = isSelected ? "Selected" : "Play";
  playButton.addEventListener("click", () => onSelect(suggestion));

  item.append(
    suggestionTitle(suggestion),
    suggestionMeta(suggestion),
    suggestionReason(suggestion),
    playButton,
    externalLinkForSuggestion(suggestion)
  );

  return item;
}

function renderEmpty(listElement, message) {
  clearElement(listElement);
  const empty = document.createElement("p");
  empty.className = "empty-state";
  empty.textContent = message;
  listElement?.append(empty);
}

function errorMessage(error) {
  return error.response?.error?.message || "Music suggestions are unavailable.";
}

export function initializeSuggestions({
  button,
  listElement,
  statusElement,
  player
} = {}) {
  let moodEntry = null;
  let isLoading = false;
  let suggestions = [];
  let selectedVideoId = null;

  function syncButton() {
    if (button) {
      button.disabled = !moodEntry || isLoading;
    }
  }

  function renderSuggestions() {
    clearElement(listElement);

    if (suggestions.length === 0) {
      renderEmpty(listElement, "No suggestions to show yet.");
      return;
    }

    for (const suggestion of suggestions) {
      listElement?.append(renderSuggestionCard(
        suggestion,
        suggestion.videoId === selectedVideoId,
        (selectedSuggestion) => {
          selectedVideoId = selectedSuggestion.videoId;
          player?.playSuggestion(selectedSuggestion);
          renderSuggestions();
        }
      ));
    }
  }

  async function requestSuggestions() {
    if (!moodEntry || isLoading) {
      return;
    }

    isLoading = true;
    syncButton();
    setText(statusElement, "Requesting music suggestions...");

    try {
      const result = await requestJson("/api/music/suggestions", {
        method: "POST",
        body: JSON.stringify({ moodEntryId: moodEntry.id })
      });

      suggestions = result.suggestions || [];
      selectedVideoId = null;
      player?.clearPlayer?.();
      setText(statusElement, suggestions.length > 0
        ? "Choose a suggestion to play."
        : "No acceptable YouTube suggestions were found.");
      renderSuggestions();
    } catch (error) {
      suggestions = [];
      selectedVideoId = null;
      player?.clearPlayer?.();
      setText(statusElement, errorMessage(error));
      renderEmpty(listElement, errorMessage(error));
    } finally {
      isLoading = false;
      syncButton();
    }
  }

  button?.addEventListener("click", requestSuggestions);
  syncButton();
  renderEmpty(listElement, "Save a mood entry to request music suggestions.");

  return {
    setMoodEntry(entry) {
      moodEntry = entry;
      suggestions = [];
      selectedVideoId = null;
      player?.clearPlayer?.();
      setText(statusElement, "Ready to request music suggestions for the saved mood entry.");
      renderEmpty(listElement, "No suggestions requested yet.");
      syncButton();
    },

    requestSuggestions
  };
}
