export interface ScoreDisplay {
  normalizedScore: number;
  rawScore: number;
  rawMaxScore: number;
  displayText: string;
  rawDisplayText: string;
}

export function toNormalizedScore(rawScore: number, rawMaxScore: number): ScoreDisplay {
  const normalizedScore = rawMaxScore > 0 ? Math.round((rawScore / rawMaxScore) * 100) : 0;

  return {
    normalizedScore,
    rawScore,
    rawMaxScore,
    displayText: `${normalizedScore}/100`,
    rawDisplayText: `${rawScore}/${rawMaxScore}`,
  };
}
