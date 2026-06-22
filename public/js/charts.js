let activeChart = null;

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

export function renderHistoryChart({
  summary,
  canvas,
  statusElement,
  ChartConstructor = globalThis.Chart
} = {}) {
  destroyActiveChart();

  if (!canvas) {
    return null;
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
