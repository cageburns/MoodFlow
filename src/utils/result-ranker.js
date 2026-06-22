export const RESULT_RANKING_CONFIG = {
  hardRejectTerms: {
    reaction: -Infinity,
    review: -Infinity,
    interview: -Infinity,
    tutorial: -Infinity,
    podcast: -Infinity,
    analysis: -Infinity
  },
  preferenceSignals: {
    "official audio": 40,
    "official video": 40,
    "provided to youtube": 35,
    topic: 18,
    vevo: 18
  },
  penaltySignals: {
    live: -8,
    cover: -18,
    karaoke: -30,
    remix: -8,
    lyrics: -6
  },
  baseScore: 100
};

const htmlEntities = {
  amp: "&",
  apos: "'",
  "#39": "'",
  quot: "\"",
  lt: "<",
  gt: ">"
};

export function decodeHtmlEntities(value) {
  return String(value ?? "").replace(/&([a-zA-Z0-9#]+);/g, (match, entity) => (
    htmlEntities[entity] ?? match
  ));
}

export function normalizeSearchText(value) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, "\"")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsSignal(haystack, signal) {
  return haystack.includes(normalizeSearchText(signal));
}

export function scoreCandidate(candidate) {
  const titleText = normalizeSearchText(candidate.title);
  const channelText = normalizeSearchText(candidate.channelTitle);
  const combined = `${titleText} ${channelText}`;

  for (const term of Object.keys(RESULT_RANKING_CONFIG.hardRejectTerms)) {
    if (containsSignal(combined, term)) {
      return null;
    }
  }

  let score = RESULT_RANKING_CONFIG.baseScore;

  for (const [signal, value] of Object.entries(RESULT_RANKING_CONFIG.preferenceSignals)) {
    if (containsSignal(combined, signal)) {
      score += value;
    }
  }

  for (const [signal, value] of Object.entries(RESULT_RANKING_CONFIG.penaltySignals)) {
    if (containsSignal(titleText, signal)) {
      score += value;
    }
  }

  return score;
}

export function cleanRankAndLimitResults(candidates, limit = 5) {
  const seenVideoIds = new Set();
  const scored = [];

  candidates.forEach((candidate, index) => {
    if (!candidate.videoId || seenVideoIds.has(candidate.videoId)) {
      return;
    }

    seenVideoIds.add(candidate.videoId);
    const score = scoreCandidate(candidate);

    if (score === null) {
      return;
    }

    scored.push({
      ...candidate,
      title: decodeHtmlEntities(candidate.title),
      channelTitle: decodeHtmlEntities(candidate.channelTitle),
      score,
      originalIndex: index
    });
  });

  return scored
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.originalIndex - right.originalIndex;
    })
    .slice(0, limit)
    .map(({ originalIndex, ...result }) => result);
}
