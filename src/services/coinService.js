// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — Coin Economy Service
// Handles earning, spending, and tracking coins
// ═══════════════════════════════════════════════════════

import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, limit, increment, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  COINS_PER_SCORE, COIN_DIFFICULTY_MULTIPLIER,
  CERTIFICATE_BONUS_COINS, DUEL_WIN_COIN_BONUS, DUEL_PARTICIPATION_COINS
} from '../utils/constants';

/**
 * Calculate coins earned from an AI-evaluated task
 */
export function calculateCoinsFromEvaluation(score, difficulty) {
  const baseCoins = COINS_PER_SCORE[score] || 0;
  const multiplier = COIN_DIFFICULTY_MULTIPLIER[difficulty] || 1;
  return Math.round(baseCoins * multiplier);
}

/**
 * Award coins to a user and log the transaction
 */
export async function awardCoins(userId, amount, reason, metadata = {}) {
  if (amount <= 0) return { newBalance: null, transactionId: null };

  // Update user's coin balance
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    coins: increment(amount),
    totalCoinsEarned: increment(amount),
  });

  // Log transaction
  const txRef = await addDoc(collection(db, 'coinTransactions'), {
    userId,
    amount,
    type: 'earn',
    reason,
    taskId: metadata.taskId || null,
    duelId: metadata.duelId || null,
    category: metadata.category || null,
    score: metadata.score || null,
    createdAt: serverTimestamp(),
  });

  // Get updated balance
  const userSnap = await getDoc(userRef);
  const newBalance = userSnap.data()?.coins || 0;

  return { newBalance, transactionId: txRef.id };
}

/**
 * Spend coins on a store item
 */
export async function spendCoins(userId, amount, itemId, itemName) {
  // Check balance first
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const currentBalance = userSnap.data()?.coins || 0;

  if (currentBalance < amount) {
    throw new Error(`Insufficient coins. Have ${currentBalance}, need ${amount}`);
  }

  // Deduct coins
  await updateDoc(userRef, {
    coins: increment(-amount),
  });

  // Log spend transaction
  await addDoc(collection(db, 'coinTransactions'), {
    userId,
    amount: -amount,
    type: 'spend',
    reason: `Redeemed: ${itemName}`,
    itemId,
    createdAt: serverTimestamp(),
  });

  // Create redemption order
  const orderRef = await addDoc(collection(db, 'redemptions'), {
    userId,
    itemId,
    itemName,
    coinCost: amount,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  return {
    orderId: orderRef.id,
    newBalance: currentBalance - amount,
  };
}

/**
 * Get coin transaction history for a user
 */
export async function getCoinHistory(userId, maxResults = 50) {
  const txQuery = query(
    collection(db, 'coinTransactions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snap = await getDocs(txQuery);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Get user's current coin balance
 */
export async function getCoinBalance(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.data()?.coins || 0;
}

/**
 * Get user's redemption history
 */
export async function getRedemptionHistory(userId) {
  const orderQuery = query(
    collection(db, 'redemptions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );

  const snap = await getDocs(orderQuery);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Award certificate bonus coins.
 * `amount` is AI-significance-scaled (1-500); falls back to the flat constant.
 */
export async function awardCertificateBonus(userId, certificateName, metadata = {}, amount) {
  const coins = amount ?? CERTIFICATE_BONUS_COINS;
  return awardCoins(userId, coins, `Certificate: ${certificateName}`, {
    ...metadata,
    category: 'certificate',
  });
}

/**
 * Award duel completion coins
 */
export async function awardDuelCoins(userId, duelId, isWinner) {
  const amount = isWinner
    ? DUEL_PARTICIPATION_COINS + DUEL_WIN_COIN_BONUS
    : DUEL_PARTICIPATION_COINS;

  const reason = isWinner ? 'Duel Victory' : 'Duel Participation';

  return awardCoins(userId, amount, reason, { duelId });
}
