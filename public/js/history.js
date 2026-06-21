function formatEntryTime(createdAt) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(createdAt));
}

function describeMode(entry) {
  if (entry.musicMode === "shift") {
    return `shift toward ${entry.targetMood}`;
  }

  return "match current mood";
}

export function renderHistory(entries, container) {
  if (!container) {
    return;
  }

  container.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "No mood entries yet.";
    container.append(empty);
    return;
  }

  for (const entry of entries) {
    const item = document.createElement("article");
    item.className = "history-item";

    const title = document.createElement("h3");
    title.textContent = `${entry.mood} (${entry.intensity}/10)`;

    const meta = document.createElement("p");
    meta.className = "history-meta";
    meta.textContent = `${formatEntryTime(entry.createdAt)} - energy ${entry.energy}/10 - ${describeMode(entry)}`;

    item.append(title, meta);

    if (entry.note) {
      const note = document.createElement("p");
      note.textContent = entry.note;
      item.append(note);
    }

    container.append(item);
  }
}
