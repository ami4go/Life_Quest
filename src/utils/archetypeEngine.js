// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — Archetype Detection Engine
// ═══════════════════════════════════════════════════════

import { ARCHETYPES } from './constants';

/**
 * Calculate archetype scores from onboarding answers
 * @param {Array} answers - Array of { questionId, selectedOption }
 * @returns {Object} archetype results
 */
export function calculateArchetypeScores(answers) {
  const scores = {
    procrastinator: 0,
    perfectionist: 0,
    poor_estimator: 0,
    overloaded: 0,
    low_motivation: 0,
  };

  // Sum up weights from selected options
  answers.forEach((answer) => {
    if (answer.selectedOption) {
      const { archetype, weight } = answer.selectedOption;
      scores[archetype] = (scores[archetype] || 0) + weight;
    }
  });

  // Sort archetypes by score
  const sorted = Object.entries(scores)
    .sort(([, a], [, b]) => b - a);

  const primary = sorted[0];
  const secondary = sorted[1];

  // Only assign secondary if it has at least 40% of primary's score
  const hasSecondary = secondary[1] >= primary[1] * 0.4;

  return {
    primary: primary[0],
    secondary: hasSecondary ? secondary[0] : null,
    scores,
    primaryInfo: ARCHETYPES[primary[0]],
    secondaryInfo: hasSecondary ? ARCHETYPES[secondary[0]] : null,
  };
}

/**
 * Get archetype-specific tips for quest management
 */
export function getArchetypeTips(archetypeId) {
  const tips = {
    procrastinator: [
      "Start with the smallest possible action — even 5 minutes counts",
      "Don't think about the full task — just the first step",
      "Use the 2-minute rule: if it takes less than 2 min, do it now",
    ],
    perfectionist: [
      "Done beats perfect — submit the rough draft",
      "Set a timer: when it rings, submit whatever you have",
      "Remember: version 1 doesn't need to be version final",
    ],
    poor_estimator: [
      "Whatever time you think it'll take — add 50%",
      "Break tasks into 30-min blocks to estimate more accurately",
      "Check your AI timeline warning — it knows your patterns",
    ],
    overloaded: [
      "Focus on your top 3 quests today — ignore the rest",
      "Delegate or defer anything that isn't critical this week",
      "Use your AI daily priority — it's picked the best 3 for you",
    ],
    low_motivation: [
      "Reconnect with WHY this goal matters to you personally",
      "Celebrate every small win — your streak is proof of progress",
      "Look at your level-up history — you're further than you think",
    ],
  };
  return tips[archetypeId] || [];
}

/**
 * Get archetype-specific quest adjustments
 */
export function getArchetypeAdjustments(archetypeId) {
  const adjustments = {
    procrastinator: {
      maxQuestDuration: 25, // minutes — keep quests short
      firstQuestDifficulty: 1, // always start with easiest
      bufferMultiplier: 1.0, // no extra buffer needed (issue is starting)
      reminderStyle: 'gentle_nudge',
    },
    perfectionist: {
      maxQuestDuration: 45,
      firstQuestDifficulty: 2,
      bufferMultiplier: 1.0,
      reminderStyle: 'rough_draft_first',
    },
    poor_estimator: {
      maxQuestDuration: 60,
      firstQuestDifficulty: 2,
      bufferMultiplier: 1.5, // 50% extra time buffer
      reminderStyle: 'early_warning',
    },
    overloaded: {
      maxQuestDuration: 45,
      firstQuestDifficulty: 2,
      bufferMultiplier: 1.2,
      reminderStyle: 'priority_focus',
    },
    low_motivation: {
      maxQuestDuration: 30,
      firstQuestDifficulty: 1,
      bufferMultiplier: 1.0,
      reminderStyle: 'milestone_celebration',
    },
  };
  return adjustments[archetypeId] || adjustments.procrastinator;
}
