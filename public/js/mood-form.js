import { requestJson } from "./api.js";

const MOODS = [
  "happy",
  "calm",
  "sad",
  "anxious",
  "angry",
  "tired",
  "focused",
  "overwhelmed"
];

function optionForMood(mood) {
  const option = document.createElement("option");
  option.value = mood;
  option.textContent = mood;
  return option;
}

function populateMoodSelects(form) {
  const moodSelect = form.elements.mood;
  const targetMoodSelect = form.elements.targetMood;

  for (const mood of MOODS) {
    moodSelect.append(optionForMood(mood));
    targetMoodSelect.append(optionForMood(mood));
  }
}

function getSelectedMode(form) {
  return new FormData(form).get("musicMode");
}

function syncTargetMood(form) {
  const targetGroup = form.querySelector("[data-target-mood-group]");
  const targetMood = form.elements.targetMood;
  const isShift = getSelectedMode(form) === "shift";

  targetGroup.hidden = !isShift;
  targetMood.disabled = !isShift;
  targetMood.required = isShift;

  if (!isShift) {
    targetMood.value = "";
  }
}

function formPayload(form) {
  const data = new FormData(form);
  const payload = {
    mood: data.get("mood"),
    intensity: Number(data.get("intensity")),
    energy: Number(data.get("energy")),
    note: data.get("note") || "",
    musicMode: data.get("musicMode")
  };

  const targetMood = data.get("targetMood");
  if (targetMood) {
    payload.targetMood = targetMood;
  }

  return payload;
}

function showMessage(element, message) {
  if (element) {
    element.textContent = message;
  }
}

export function initializeMoodForm({ form, statusElement, onSaved }) {
  if (!form) {
    return;
  }

  const submitButton = form.querySelector?.("button[type='submit']");
  let isSubmitting = false;

  function syncSubmitButton() {
    if (submitButton) {
      submitButton.disabled = isSubmitting;
    }
  }

  populateMoodSelects(form);
  syncTargetMood(form);

  form.addEventListener("change", (event) => {
    if (event.target.name === "musicMode") {
      syncTargetMood(form);
    }
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    syncSubmitButton();
    showMessage(statusElement, "Saving mood entry...");

    try {
      const result = await requestJson("/api/moods", {
        method: "POST",
        body: JSON.stringify(formPayload(form))
      });

      form.reset();
      syncTargetMood(form);
      showMessage(statusElement, "Mood entry saved. Loading music suggestions...");
      try {
        await onSaved?.(result.entry);
      } catch {
        showMessage(statusElement, "Mood entry saved.");
        return;
      }

      if (statusElement?.textContent === "Mood entry saved. Loading music suggestions...") {
        showMessage(statusElement, "Mood entry saved.");
      }
    } catch (error) {
      showMessage(statusElement, error.response?.error?.message || "Mood entry could not be saved.");
    } finally {
      isSubmitting = false;
      syncSubmitButton();
    }
  });
}
