// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — Badge Service
// Antidote redemption (cancel bad badges) + secret AI badges
// ═══════════════════════════════════════════════════════

import { doc, getDoc, updateDoc, increment, arrayUnion, serverTimestamp, addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ANTIDOTE_BADGES, SECRET_BADGES, BAD_BADGES, NOTIF_TYPES } from '../utils/constants';
import { pushNotification } from './notificationService';

/**
 * Derive the live stats antidote requirements are checked against.
 */
export function getAntidoteProgress(userData) {
  return {
    perfectStreak: userData?.perfectStreak || 0,
    onTimeStreak: userData?.onTimeStreak || 0,
    duelWins: userData?.duelWins || 0,
  };
}

/**
 * Can the user redeem this antidote right now?
 */
export function canRedeemAntidote(userData, antidote) {
  if (!userData || !antidote) return false;
  const badges = userData.badges || [];
  if (!badges.includes(antidote.cancels)) return false;     // must hold the bad badge
  if (badges.includes(antidote.id)) return false;           // not already redeemed
  const progress = getAntidoteProgress(userData);
  const have = progress[antidote.requirement.type] || 0;
  if (have < antidote.requirement.value) return false;      // requirement met
  if ((userData.coins || 0) < antidote.costCoins) return false; // can afford
  return true;
}

/**
 * Redeem an antidote: spend coins, remove the bad badge, grant the antidote badge.
 */
export async function redeemAntidote(userId, userData, antidoteId) {
  const antidote = ANTIDOTE_BADGES[antidoteId];
  if (!antidote) throw new Error('Unknown antidote');
  if (!canRedeemAntidote(userData, antidote)) throw new Error('Requirements not met');

  const userRef = doc(db, 'users', userId);
  const newBadges = (userData.badges || [])
    .filter((b) => b !== antidote.cancels)   // remove bad badge
    .concat(antidote.id);                     // grant antidote

  await updateDoc(userRef, {
    badges: newBadges,
    coins: increment(-antidote.costCoins),
  });

  // Log the coin spend so it shows in Rewards history
  await addDoc(collection(db, 'coinTransactions'), {
    userId,
    amount: -antidote.costCoins,
    type: 'spend',
    reason: `Antidote: ${antidote.name}`,
    createdAt: serverTimestamp(),
  });

  const bad = BAD_BADGES[antidote.cancels];
  await pushNotification(userId, {
    type: NOTIF_TYPES.BADGE,
    title: `${antidote.icon} ${antidote.name} earned!`,
    body: `You cancelled "${bad?.name || 'a penalty badge'}". Record cleared.`,
    icon: antidote.icon,
    meta: { badgeId: antidote.id },
  });

  return { newBadges, coinsSpent: antidote.costCoins };
}

/**
 * Award a secret badge with HP (XP) + coin boosts. No-op if already owned.
 */
export async function awardSecretBadge(userId, userData, badgeId) {
  const badge = SECRET_BADGES[badgeId];
  if (!badge) return false;
  const badges = userData?.badges || [];
  if (badges.includes(badge.id)) return false;

  const userRef = doc(db, 'users', userId);
  const newXP = (userData?.xp || 0) + (badge.hpBoost || 0);
  await updateDoc(userRef, {
    badges: arrayUnion(badge.id),
    xp: newXP,
    level: Math.floor(newXP / 1000),
    coins: increment(badge.coinBoost || 0),
    totalCoinsEarned: increment(badge.coinBoost || 0),
  });

  if (badge.coinBoost) {
    await addDoc(collection(db, 'coinTransactions'), {
      userId, amount: badge.coinBoost, type: 'earn',
      reason: `Secret badge: ${badge.name}`, createdAt: serverTimestamp(),
    });
  }

  await pushNotification(userId, {
    type: NOTIF_TYPES.BADGE,
    title: `🤫 Secret badge unlocked: ${badge.icon} ${badge.name}`,
    body: `The AI noticed your grind. +${badge.hpBoost} HP and +${badge.coinBoost} coins awarded.`,
    icon: badge.icon,
    meta: { badgeId: badge.id, secret: true },
  });
  return true;
}

/**
 * Inspect a verified certificate and, if the user has quietly racked up enough
 * off-platform achievements, award the matching secret badge.
 *
 * eventType comes from aiService.verifyCertificate (hackathon|competition|course|...).
 * Counters are stored on the user doc under secretCounters.
 */
export async function trackSecretAchievement(userId, eventType) {
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return null;
  const userData = snap.data();
  const counters = { ...(userData.secretCounters || {}) };

  let badgeToAward = null;
  if (eventType === 'hackathon') {
    counters.hackathon = (counters.hackathon || 0) + 1;
    if (counters.hackathon >= SECRET_BADGES.hackathon_phantom.threshold) badgeToAward = 'hackathon_phantom';
  } else if (eventType === 'competition') {
    counters.competition = (counters.competition || 0) + 1;
    if (counters.competition >= SECRET_BADGES.contest_crusher.threshold) badgeToAward = 'contest_crusher';
  }
  counters.total = (counters.total || 0) + 1;
  if (!badgeToAward && counters.total >= SECRET_BADGES.certified_legend.threshold) {
    badgeToAward = 'certified_legend';
  }

  await updateDoc(userRef, { secretCounters: counters });

  if (badgeToAward) {
    const fresh = (await getDoc(userRef)).data();
    await awardSecretBadge(userId, fresh, badgeToAward);
    return badgeToAward;
  }
  return null;
}
