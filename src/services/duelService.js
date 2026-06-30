// ═══════════════════════════════════════════════════════
// LIFEQUEST AI — Duel Service (Firestore)
// Enhanced: Multi-player, custom challenges, AI evaluation
// ═══════════════════════════════════════════════════════

import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, Timestamp, serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { PENALTY_CONSTANTS } from '../utils/constants';

/**
 * Create a new multi-player duel with custom challenges
 */
export async function createDuel({
  creatorId, creatorName, creatorPhoto,
  invitedEmails,
  challenges,
  duelType,
  deadline,
  maxParticipants = 5,
}) {
  // Calculate total HP from all challenges
  const totalHP = challenges.reduce((sum, c) => sum + (c.hp || 100), 0);

  const duelRef = await addDoc(collection(db, 'duels'), {
    // Creator info
    creatorId,
    creatorName,
    creatorPhoto: creatorPhoto || '',

    // Multi-player
    participants: [{
      id: creatorId,
      name: creatorName,
      photo: creatorPhoto || '',
      email: null,
      status: 'accepted',
      completedChallenges: {},
      totalScore: 0,
      joinedAt: Timestamp.now(),
    }],
    invitedEmails: invitedEmails.map(e => e.toLowerCase().trim()),
    maxParticipants,

    // Challenges
    challenges: challenges.map((c, idx) => ({
      id: `challenge_${idx}`,
      title: c.title,
      description: c.description || '',
      category: c.category || 'custom',
      hp: c.hp || 100,
      difficulty: c.difficulty || 3,
      enableAIEvaluation: c.enableAIEvaluation ?? true,
      evaluationCriteria: c.evaluationCriteria || '',
      submissionType: c.submissionType || 'image',
      order: idx,
    })),

    // Duel config
    duelType: duelType || 'custom',
    totalHP,
    deadline: Timestamp.fromDate(new Date(deadline)),
    status: 'pending', // pending → active → completed

    // Results
    winnerId: null,
    winnerName: null,

    // Legacy compatibility fields
    challengerId: creatorId,
    challengerName: creatorName,
    challengerPhoto: creatorPhoto || '',
    opponentEmail: invitedEmails[0] || '',
    questTitle: challenges[0]?.title || 'Custom Duel',
    questDescription: challenges.map(c => c.title).join(', '),
    difficulty: Math.round(challenges.reduce((sum, c) => sum + c.difficulty, 0) / challenges.length),
    xpReward: totalHP,

    createdAt: serverTimestamp(),
  });
  return duelRef.id;
}

/**
 * Join a pending duel (accept invitation)
 */
export async function joinDuel(duelId, userId, userName, userPhoto, userEmail) {
  const duelSnap = await getDoc(doc(db, 'duels', duelId));
  if (!duelSnap.exists()) throw new Error('Duel not found');
  const duel = duelSnap.data();

  // Check if already a participant
  if (duel.participants?.some(p => p.id === userId)) {
    throw new Error('Already joined this duel');
  }

  // Check max participants
  if (duel.participants?.length >= duel.maxParticipants) {
    throw new Error('Duel is full');
  }

  const updatedParticipants = [...(duel.participants || []), {
    id: userId,
    name: userName,
    photo: userPhoto || '',
    email: userEmail?.toLowerCase() || null,
    status: 'accepted',
    completedChallenges: {},
    totalScore: 0,
    joinedAt: Timestamp.now(),
  }];

  // Remove from invited list
  const updatedInvited = (duel.invitedEmails || [])
    .filter(e => e !== userEmail?.toLowerCase());

  const updates = {
    participants: updatedParticipants,
    invitedEmails: updatedInvited,
  };

  // If all invites accepted or at least 2 participants, activate
  if (updatedParticipants.length >= 2) {
    updates.status = 'active';
    // Legacy compat
    updates.opponentId = userId;
    updates.opponentName = userName;
    updates.opponentPhoto = userPhoto || '';
  }

  await updateDoc(doc(db, 'duels', duelId), updates);
}

/**
 * Submit a challenge result within a duel
 */
export async function submitChallengeResult(duelId, userId, challengeId, score, aiEvaluation, submission = null) {
  const duelSnap = await getDoc(doc(db, 'duels', duelId));
  if (!duelSnap.exists()) throw new Error('Duel not found');
  const duel = duelSnap.data();

  const participantIdx = duel.participants.findIndex(p => p.id === userId);
  if (participantIdx === -1) throw new Error('Not a participant');

  const updatedParticipants = [...duel.participants];
  const participant = { ...updatedParticipants[participantIdx] };
  const completedChallenges = { ...(participant.completedChallenges || {}) };
  completedChallenges[challengeId] = {
    score,
    aiEvaluation,
    // Persist a lightweight record of the submission so opponents can see it.
    submission: submission ? { text: submission.text || '', type: submission.type || 'text' } : null,
    completedAt: Timestamp.now(),
  };
  participant.completedChallenges = completedChallenges;
  participant.totalScore = Object.values(completedChallenges)
    .reduce((sum, c) => sum + (c.score || 0), 0);
  updatedParticipants[participantIdx] = participant;

  const updates = { participants: updatedParticipants };

  // Check if all participants completed all challenges
  const totalChallenges = duel.challenges.length;
  const allDone = updatedParticipants.every(
    p => Object.keys(p.completedChallenges || {}).length >= totalChallenges
  );

  if (allDone) {
    // Determine winner by total score
    const winner = updatedParticipants.reduce((best, p) =>
      (p.totalScore > best.totalScore) ? p : best
    );
    updates.winnerId = winner.id;
    updates.winnerName = winner.name;
    updates.status = 'completed';
  }

  await updateDoc(doc(db, 'duels', duelId), updates);
  return updates;
}

// ──────────────────────────────────────────────
// Legacy functions (kept for backward compatibility)
// ──────────────────────────────────────────────

/**
 * Accept a pending duel (legacy 1v1 — wraps joinDuel)
 */
export async function acceptDuel(duelId, userId, userName, userPhoto) {
  // Try new multi-player join first
  try {
    const duelSnap = await getDoc(doc(db, 'duels', duelId));
    if (duelSnap.data()?.participants) {
      return joinDuel(duelId, userId, userName, userPhoto);
    }
  } catch (e) { /* fall through to legacy */ }

  await updateDoc(doc(db, 'duels', duelId), {
    opponentId: userId,
    opponentName: userName,
    opponentPhoto: userPhoto || '',
    status: 'active',
  });
}

/**
 * Decline a pending duel
 */
export async function declineDuel(duelId) {
  await updateDoc(doc(db, 'duels', duelId), {
    status: 'declined',
  });
}

/**
 * Mark your side of the duel as complete (legacy 1v1)
 */
export async function completeDuelSide(duelId, userId) {
  const duelSnap = await getDoc(doc(db, 'duels', duelId));
  if (!duelSnap.exists()) throw new Error('Duel not found');
  const duel = duelSnap.data();

  const isChallenger = duel.challengerId === userId;
  const now = Timestamp.now();

  const updates = {};
  if (isChallenger) {
    updates.challengerCompleted = true;
    updates.challengerCompletedAt = now;
  } else {
    updates.opponentCompleted = true;
    updates.opponentCompletedAt = now;
  }

  // Check if both sides are now done or determine winner
  const otherDone = isChallenger ? duel.opponentCompleted : duel.challengerCompleted;
  if (otherDone) {
    // Both done — determine winner by who finished first
    const otherTime = isChallenger
      ? duel.opponentCompletedAt?.toDate?.() || new Date()
      : duel.challengerCompletedAt?.toDate?.() || new Date();
    const myTime = now.toDate();

    if (myTime <= otherTime) {
      updates.winnerId = userId;
      updates.winnerName = isChallenger ? duel.challengerName : duel.opponentName;
    } else {
      updates.winnerId = isChallenger ? duel.opponentId : duel.challengerId;
      updates.winnerName = isChallenger ? duel.opponentName : duel.challengerName;
    }
    updates.status = 'completed';
  } else {
    // I'm first — I'm the winner so far
    updates.winnerId = userId;
    updates.winnerName = isChallenger ? duel.challengerName : duel.opponentName;
  }

  await updateDoc(doc(db, 'duels', duelId), updates);
  return updates;
}

/**
 * Get all duels for a user (as creator, participant, or invitee)
 */
export async function getUserDuels(userId, userEmail) {
  const duelsRef = collection(db, 'duels');
  const all = new Map();

  try {
    // Query for duels where user is challenger/creator
    const challengerQuery = query(duelsRef, where('challengerId', '==', userId));
    const challengerSnap = await getDocs(challengerQuery);
    challengerSnap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data() }));
  } catch (e) { console.warn('Challenger query failed:', e.message); }

  try {
    // Query for duels where user is opponent (by ID)
    const opponentQuery = query(duelsRef, where('opponentId', '==', userId));
    const opponentSnap = await getDocs(opponentQuery);
    opponentSnap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data() }));
  } catch (e) { console.warn('Opponent query failed:', e.message); }

  try {
    // Query for duels sent to user's email (legacy single opponent field)
    // Use simple single-field query, filter for pending client-side
    const emailQuery = query(duelsRef, where('opponentEmail', '==', userEmail.toLowerCase()));
    const emailSnap = await getDocs(emailQuery);
    emailSnap.docs.forEach(d => {
      const data = d.data();
      if (data.status === 'pending') {
        all.set(d.id, { id: d.id, ...data });
      }
    });
  } catch (e) { console.warn('Email query failed:', e.message); }

  try {
    // Query for duels where user is in invitedEmails (new multi-player system)
    const invitedQuery = query(duelsRef, where('invitedEmails', 'array-contains', userEmail.toLowerCase()));
    const invitedSnap = await getDocs(invitedQuery);
    invitedSnap.docs.forEach(d => all.set(d.id, { id: d.id, ...d.data() }));
  } catch (e) { console.warn('Invited query failed:', e.message); }

  return Array.from(all.values()).sort((a, b) => {
    const dateA = a.createdAt?.toDate?.() || new Date(0);
    const dateB = b.createdAt?.toDate?.() || new Date(0);
    return dateB - dateA;
  });
}

/**
 * Drop a challenge in an active duel
 */
export async function dropDuelChallenge(duelId, userId, challengeId, penalty = null) {
  const duelSnap = await getDoc(doc(db, 'duels', duelId));
  if (!duelSnap.exists()) throw new Error('Duel not found');
  const duel = duelSnap.data();

  const participantIdx = duel.participants.findIndex(p => p.id === userId);
  if (participantIdx === -1) throw new Error('Not a participant');

  const updatedParticipants = [...duel.participants];
  const participant = { ...updatedParticipants[participantIdx] };
  const completedChallenges = { ...(participant.completedChallenges || {}) };

  // Mark as dropped (score = 0, dropped = true)
  completedChallenges[challengeId] = {
    score: 0,
    dropped: true,
    completedAt: Timestamp.now(),
  };

  participant.completedChallenges = completedChallenges;
  updatedParticipants[participantIdx] = participant;

  await updateDoc(doc(db, 'duels', duelId), {
    participants: updatedParticipants
  });

  // Apply the AI-decided penalty (HP=XP + coins), or fall back to the constant.
  const hpLoss = penalty?.hpLoss ?? PENALTY_CONSTANTS.DUEL_DROP_HP;
  const coinLoss = penalty?.coinLoss ?? 0;
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    const drops = (userData.tasksDropped || 0) + 1;
    const userBadges = userData.badges || [];
    const newXP = Math.max(0, (userData.xp || 0) - hpLoss);
    const newCoins = Math.max(0, (userData.coins || 0) - coinLoss);

    const updates = {
      xp: newXP,
      level: Math.floor(newXP / 1000),
      coins: newCoins,
      tasksDropped: drops,
      perfectStreak: 0,
    };

    const newBadges = [...userBadges];
    if (!newBadges.includes('the_ghost')) newBadges.push('the_ghost'); // abandoned a duel
    if (drops >= PENALTY_CONSTANTS.MAX_DROPS_BEFORE_SLOTH && !newBadges.includes('the_sloth')) {
      newBadges.push('the_sloth');
    }
    if (newBadges.length !== userBadges.length) updates.badges = newBadges;

    await updateDoc(userRef, updates);

    // Log the coin penalty so it appears in Rewards history
    if (coinLoss > 0) {
      await addDoc(collection(db, 'coinTransactions'), {
        userId,
        amount: -Math.min(userData.coins || 0, coinLoss),
        type: 'spend',
        reason: 'Dropped a duel challenge',
        createdAt: serverTimestamp(),
      });
    }
  }
  return { hpLoss, coinLoss };
}

