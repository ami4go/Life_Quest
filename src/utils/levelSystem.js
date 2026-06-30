// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — Level & Rank System
// ═══════════════════════════════════════════════════════

import { XP_PER_LEVEL, RANKS } from './constants';

/**
 * Calculate level from total XP
 */
export function getLevelFromXP(totalXP) {
  return Math.floor(totalXP / XP_PER_LEVEL);
}

/**
 * Get XP progress within current level
 */
export function getXPProgress(totalXP) {
  return totalXP % XP_PER_LEVEL;
}

/**
 * Get XP needed for next level
 */
export function getXPToNextLevel(totalXP) {
  return XP_PER_LEVEL - getXPProgress(totalXP);
}

/**
 * Get progress percentage within current level (0-100)
 */
export function getLevelProgressPercent(totalXP) {
  return Math.round((getXPProgress(totalXP) / XP_PER_LEVEL) * 100);
}

/**
 * Get rank for a given level
 */
export function getRankForLevel(level) {
  let currentRank = RANKS[0];
  for (const rank of RANKS) {
    if (level >= rank.level) {
      currentRank = rank;
    } else {
      break;
    }
  }
  return currentRank;
}

/**
 * Get next rank info
 */
export function getNextRank(level) {
  for (const rank of RANKS) {
    if (rank.level > level) {
      return rank;
    }
  }
  return null; // Already at max rank
}

/**
 * Get full level info for display
 */
export function getLevelInfo(totalXP) {
  const level = getLevelFromXP(totalXP);
  const rank = getRankForLevel(level);
  const nextRank = getNextRank(level);
  const progress = getLevelProgressPercent(totalXP);
  const xpInLevel = getXPProgress(totalXP);
  const xpToNext = getXPToNextLevel(totalXP);

  return {
    level,
    rank,
    nextRank,
    progress,
    xpInLevel,
    xpToNext,
    totalXP,
  };
}
