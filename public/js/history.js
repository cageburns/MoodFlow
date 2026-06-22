import { requestJson } from "./api.js";
import { clearHistoryChart, renderHistoryChart } from "./charts.js";

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

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function dateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localDateStart(dateValue) {
  return new Date(`${dateValue}T00:00:00`);
}

function addLocalDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function localDayRange(dateValue) {
  if (!dateValue) {
    throw new Error("Choose a day to view.");
  }

  const from = localDateStart(dateValue);
  if (Number.isNaN(from.getTime())) {
    throw new Error("Choose a valid day.");
  }

  return {
    from: from.toISOString(),
    to: addLocalDays(from, 1).toISOString()
  };
}

export function localDateRange(fromDateValue, toDateValue) {
  if (!fromDateValue || !toDateValue) {
    throw new Error("Choose a start and end date.");
  }

  const from = localDateStart(fromDateValue);
  const toStart = localDateStart(toDateValue);

  if (Number.isNaN(from.getTime()) || Number.isNaN(toStart.getTime())) {
    throw new Error("Choose a valid date range.");
  }

  if (from > toStart) {
    throw new Error("Start date must be before or equal to end date.");
  }

  return {
    from: from.toISOString(),
    to: addLocalDays(toStart, 1).toISOString()
  };
}

function currentTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function historyQuery(range) {
  const params = new URLSearchParams({
    from: range.from,
    to: range.to
  });
  return `/api/moods?${params.toString()}`;
}

function summaryQuery(mode, range) {
  const params = new URLSearchParams({
    mode,
    from: range.from,
    to: range.to,
    timeZone: currentTimeZone()
  });
  return `/api/moods/summary?${params.toString()}`;
}

function syncControls(form) {
  const mode = new FormData(form).get("historyMode") || "day";
  const dayField = form.querySelector("[data-history-day]");
  const rangeFields = form.querySelector("[data-history-range]");
  const isDay = mode === "day";

  if (dayField) {
    dayField.hidden = !isDay;
  }

  if (rangeFields) {
    rangeFields.hidden = isDay;
  }
}

function selectedRange(form) {
  const data = new FormData(form);
  const mode = data.get("historyMode") || "day";

  if (mode === "range") {
    return {
      mode,
      range: localDateRange(data.get("historyFrom"), data.get("historyTo"))
    };
  }

  return {
    mode: "day",
    range: localDayRange(data.get("historyDay"))
  };
}

export function renderHistory(entries, container, options = {}) {
  if (!container) {
    return;
  }

  container.replaceChildren();

  if (entries.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = options.emptyMessage || "No mood entries yet.";
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

export function initializeHistory({
  form,
  listElement,
  statusElement,
  chartCanvas,
  chartStatusElement,
  ChartConstructor = globalThis.Chart
} = {}) {
  const today = dateInputValue(new Date());

  if (form) {
    form.elements.historyDay.value = today;
    form.elements.historyFrom.value = today;
    form.elements.historyTo.value = today;
    form.addEventListener("change", () => syncControls(form));
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      return loadSelectedPeriod();
    });
    syncControls(form);
  }

  async function loadRecent() {
    setText(statusElement, "Loading recent mood entries...");
    clearHistoryChart(chartStatusElement);
    const result = await requestJson("/api/moods");
    renderHistory(result.entries, listElement);
    setText(statusElement, result.entries.length > 0
      ? "Showing recent mood entries."
      : "No mood entries yet.");
  }

  async function loadSelectedPeriod() {
    if (!form) {
      return;
    }

    let selection;
    try {
      selection = selectedRange(form);
    } catch (error) {
      renderHistory([], listElement, { emptyMessage: error.message });
      clearHistoryChart(chartStatusElement);
      setText(statusElement, error.message);
      return;
    }

    setText(statusElement, "Loading history period...");
    const [historyResult, summary] = await Promise.all([
      requestJson(historyQuery(selection.range)),
      requestJson(summaryQuery(selection.mode, selection.range))
    ]);

    const emptyMessage = "No mood entries in this period.";
    renderHistory(historyResult.entries, listElement, { emptyMessage });
    renderHistoryChart({
      summary,
      canvas: chartCanvas,
      statusElement: chartStatusElement,
      ChartConstructor
    });
    setText(statusElement, historyResult.entries.length > 0
      ? "Showing selected history period."
      : emptyMessage);
  }

  return {
    loadRecent,
    loadSelectedPeriod
  };
}
