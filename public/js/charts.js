let activeChart = null;

export const MOOD_CHART_VALUES = {
  happy: 8,
  calm: 7,
  focused: 6,
  tired: 5,
  anxious: 4,
  overwhelmed: 3,
  angry: 2,
  sad: 1
};

const MOOD_NAMES_BY_VALUE = Object.fromEntries(
  Object.entries(MOOD_CHART_VALUES).map(([mood, value]) => [value, mood])
);

function setText(element, text) {
  if (element) {
    element.textContent = text;
  }
}

function destroyActiveChart() {
  activeChart?.destroy?.();
  activeChart = null;
}

function chartDataForSummary(summary) {
  if (summary.mode === "range") {
    return {
      labels: summary.points.map((point) => point.label),
      datasets: [
        {
          label: "Average intensity",
          data: summary.points.map((point) => point.averageIntensity),
          borderColor: "#2f6f6d",
          backgroundColor: "rgba(47, 111, 109, 0.16)",
          tension: 0.25
        },
        {
          label: "Average energy",
          data: summary.points.map((point) => point.averageEnergy),
          borderColor: "#8a4f7d",
          backgroundColor: "rgba(138, 79, 125, 0.16)",
          tension: 0.25
        }
      ]
    };
  }

  return {
    labels: summary.points.map((point) => point.label),
    datasets: [
      {
        label: "Intensity",
        data: summary.points.map((point) => point.intensity),
        borderColor: "#2f6f6d",
        backgroundColor: "rgba(47, 111, 109, 0.16)",
        tension: 0.25
      },
      {
        label: "Energy",
        data: summary.points.map((point) => point.energy),
        borderColor: "#8a4f7d",
        backgroundColor: "rgba(138, 79, 125, 0.16)",
        tension: 0.25
      }
    ]
  };
}

function formatEntryDateTime(createdAt) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(createdAt));
}

function moodValue(mood) {
  return MOOD_CHART_VALUES[mood] ?? null;
}

function moodNameForValue(value) {
  return MOOD_NAMES_BY_VALUE[value] || "";
}

export function chartDataForEntries(entries) {
  const sortedEntries = [...entries].sort((left, right) => (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  ));
  const labels = sortedEntries.map((entry) => formatEntryDateTime(entry.createdAt));
  const moodData = sortedEntries.map((entry) => ({
    x: formatEntryDateTime(entry.createdAt),
    y: moodValue(entry.mood),
    mood: entry.mood,
    intensity: entry.intensity,
    energy: entry.energy,
    createdAt: entry.createdAt
  }));

  return {
    labels,
    datasets: [
      {
        label: "Intensity",
        type: "line",
        data: sortedEntries.map((entry) => entry.intensity),
        borderColor: "rgba(47, 111, 109, 0.72)",
        backgroundColor: "rgba(47, 111, 109, 0.10)",
        borderWidth: 1.75,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.25,
        yAxisID: "y",
        order: 1
      },
      {
        label: "Energy",
        type: "line",
        data: sortedEntries.map((entry) => entry.energy),
        borderColor: "rgba(138, 79, 125, 0.62)",
        backgroundColor: "rgba(138, 79, 125, 0.10)",
        borderWidth: 1.5,
        pointRadius: 2,
        pointHoverRadius: 4,
        tension: 0.25,
        yAxisID: "y",
        order: 2
      },
      {
        label: "Actual mood",
        type: "bar",
        data: moodData,
        borderColor: "rgba(91, 95, 151, 0.86)",
        backgroundColor: "rgba(91, 95, 151, 0.42)",
        borderWidth: 1.5,
        borderRadius: 3,
        minBarLength: 6,
        barPercentage: 0.42,
        categoryPercentage: 0.54,
        yAxisID: "mood",
        order: 3
      }
    ]
  };
}

function chartOptionsForEntries(entries) {
  const sortedEntries = [...entries].sort((left, right) => (
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  ));

  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false
    },
    plugins: {
      tooltip: {
        callbacks: {
          title(items) {
            const index = items[0]?.dataIndex ?? 0;
            return sortedEntries[index]
              ? formatEntryDateTime(sortedEntries[index].createdAt)
              : "";
          },
          label(context) {
            const entry = sortedEntries[context.dataIndex];
            if (!entry) {
              return "";
            }

            if (context.dataset.label === "Actual mood") {
              return `Mood: ${entry.mood}`;
            }

            if (context.dataset.label === "Intensity") {
              return `Intensity: ${entry.intensity}/10`;
            }

            if (context.dataset.label === "Energy") {
              return `Energy: ${entry.energy}/10`;
            }

            return "";
          }
        }
      }
    },
    scales: {
      y: {
        min: 0,
        max: 10,
        ticks: {
          stepSize: 1
        }
      },
      mood: {
        position: "right",
        min: 0,
        max: 8,
        grid: {
          drawOnChartArea: false
        },
        ticks: {
          stepSize: 1,
          callback: (value) => (Number(value) === 0 ? "" : moodNameForValue(value))
        }
      }
    }
  };
}

export function renderHistoryChart({
  summary,
  entries,
  canvas,
  statusElement,
  ChartConstructor = globalThis.Chart
} = {}) {
  destroyActiveChart();

  if (!canvas) {
    return null;
  }

  if (entries) {
    if (entries.length === 0) {
      setText(statusElement, "No chart data for this period.");
      return null;
    }

    if (!ChartConstructor) {
      setText(statusElement, "Chart library is unavailable. Text history is still shown.");
      return null;
    }

    setText(statusElement, "Mood, intensity, and energy trend for selected period.");
    activeChart = new ChartConstructor(canvas, {
      type: "bar",
      data: chartDataForEntries(entries),
      options: chartOptionsForEntries(entries)
    });

    return activeChart;
  }

  if (!summary?.points?.length) {
    setText(statusElement, "No chart data for this period.");
    return null;
  }

  if (!ChartConstructor) {
    setText(statusElement, "Chart library is unavailable. Text history is still shown.");
    return null;
  }

  const label = summary.mode === "range"
    ? "Daily average mood trend"
    : "Mood trend for selected day";
  setText(statusElement, label);

  activeChart = new ChartConstructor(canvas, {
    type: "line",
    data: chartDataForSummary(summary),
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "index",
        intersect: false
      },
      scales: {
        y: {
          min: 1,
          max: 10,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });

  return activeChart;
}

export function clearHistoryChart(statusElement) {
  destroyActiveChart();
  setText(statusElement, "Choose a history period to draw a chart.");
}
