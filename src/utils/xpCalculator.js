// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — XP Calculator
// ═══════════════════════════════════════════════════════

import {
  XP_BASE_PER_DIFFICULTY,
  XP_ON_TIME_BONUS,
  XP_STREAK_MULTIPLIER,
  XP_BOSS_MULTIPLIER,
  XP_RECOVERY_BONUS,
  XP_MISSED_PENALTY_PER_STAR,
  FOCUS_LOCK_BONUS,
  FOCUS_LOCK_EARLY_BONUS,
  FOCUS_LOCK_PENALTY,
  PROOF_COMPLETION_BONUS,
  PROOF_QUALITY_XP_PER_POINT,
} from './constants';

/**
 * Calculate base XP for a quest based on difficulty
 */
export function getBaseXP(difficulty) {
  return XP_BASE_PER_DIFFICULTY * difficulty;
}

/**
 * Calculate total XP earned for completing a quest
 * @param {Object} params
 * @param {number} params.difficulty - Quest difficulty (1-5)
 * @param {boolean} params.onTime - Completed before deadline
 * @param {boolean} params.early - Completed significantly early
 * @param {boolean} params.focusLocked - Was Focus Lock active
 * @param {boolean} params.isBossBattle - Is this a boss battle
 * @param {number} params.streakDays - Current streak length
 * @param {boolean} params.proofSubmitted - Was proof submitted
 * @param {number} params.proofQuality - AI quality score (1-5)
 * @returns {Object} Detailed XP breakdown
 */
export function calculateQuestXP({
  difficulty,
  onTime = true,
  early = false,
  focusLocked = false,
  isBossBattle = false,
  streakDays = 0,
  proofSubmitted = false,
  proofQuality = 0,
}) {
  const baseXP = getBaseXP(difficulty);
  const breakdown = {
    base: baseXP,
    onTimeBonus: 0,
    focusLockBonus: 0,
    bossMultiplier: 0,
    streakBonus: 0,
    proofBonus: 0,
    qualityBonus: 0,
    total: baseXP,
  };

  // On-time bonus
  if (onTime) {
    breakdown.onTimeBonus = Math.round(baseXP * XP_ON_TIME_BONUS);
  }

  // Focus Lock bonus
  if (focusLocked && onTime) {
    const rate = early ? FOCUS_LOCK_EARLY_BONUS : FOCUS_LOCK_BONUS;
    breakdown.focusLockBonus = Math.round(baseXP * rate);
  }

  // Boss battle multiplier (replaces base, not additive)
  if (isBossBattle) {
    breakdown.bossMultiplier = Math.round(baseXP * (XP_BOSS_MULTIPLIER - 1));
  }

  // Streak multiplier
  if (streakDays > 0) {
    breakdown.streakBonus = Math.round(baseXP * XP_STREAK_MULTIPLIER * Math.min(streakDays, 30));
  }

  // Proof of completion bonus
  if (proofSubmitted) {
    breakdown.proofBonus = Math.round(baseXP * PROOF_COMPLETION_BONUS);
    breakdown.qualityBonus = proofQuality * PROOF_QUALITY_XP_PER_POINT;
  }

  // Calculate total
  breakdown.total =
    breakdown.base +
    breakdown.onTimeBonus +
    breakdown.focusLockBonus +
    breakdown.bossMultiplier +
    breakdown.streakBonus +
    breakdown.proofBonus +
    breakdown.qualityBonus;

  return breakdown;
}

/**
 * Calculate XP penalty for missing a deadline
 */
export function calculateMissedPenalty(difficulty, focusLocked = false) {
  let penalty = XP_MISSED_PENALTY_PER_STAR * difficulty;

  if (focusLocked) {
    const baseXP = getBaseXP(difficulty);
    penalty += Math.round(baseXP * FOCUS_LOCK_PENALTY);
  }

  return -penalty;
}

/**
 * Get recovery XP bonus for returning after absence
 */
export function getRecoveryXP() {
  return XP_RECOVERY_BONUS;
}
