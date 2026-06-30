import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc, setDoc, deleteDoc, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from './AuthContext';
import { PENALTY_CONSTANTS } from '../utils/constants';

const QuestContext = createContext(null);

export function useQuests() {
  const context = useContext(QuestContext);
  if (!context) throw new Error('useQuests must be used within QuestProvider');
  return context;
}

export function QuestProvider({ children }) {
  const { user } = useAuth();
  const [missions, setMissions] = useState([]);
  const [quests, setQuests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to missions
  useEffect(() => {
    if (!user) {
      setMissions([]);
      setQuests([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const missionsQuery = query(
      collection(db, 'missions'),
      where('userId', '==', user.uid)
    );

    const unsubMissions = onSnapshot(missionsQuery, (snapshot) => {
      const missionData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateB - dateA;
      });
      setMissions(missionData);
    }, (error) => {
      console.error('Missions subscription error:', error);
      setLoading(false);
    });

    const questsQuery = query(
      collection(db, 'quests'),
      where('userId', '==', user.uid)
    );

    const unsubQuests = onSnapshot(questsQuery, (snapshot) => {
      const questData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })).sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return dateA - dateB;
      });
      setQuests(questData);
      setLoading(false);
    }, (error) => {
      console.error('Quests subscription error:', error);
      setLoading(false);
    });

    return () => {
      unsubMissions();
      unsubQuests();
    };
  }, [user]);

  // Get quests for a specific mission
  const getQuestsForMission = useCallback(
    (missionId) => quests.filter((q) => q.missionId === missionId),
    [quests]
  );

  // Get active quests (pending or in_progress)
  const activeQuests = quests.filter(
    (q) => q.status === 'pending' || q.status === 'in_progress'
  );

  // Get completed quests
  const completedQuests = quests.filter((q) => q.status === 'completed');

  // Get overdue quests
  const overdueQuests = quests.filter((q) => {
    if (q.status === 'completed' || q.status === 'failed') return false;
    if (!q.deadline) return false;
    const deadline = q.deadline.toDate ? q.deadline.toDate() : new Date(q.deadline);
    return deadline < new Date();
  });

  // Get today's quests
  const todayQuests = quests.filter((q) => {
    if (q.status === 'failed') return false;
    
    const today = new Date();
    
    // If completed today, keep it in the list!
    if (q.status === 'completed') {
      if (!q.completedAt) return false;
      const comp = q.completedAt.toDate ? q.completedAt.toDate() : new Date(q.completedAt);
      return comp.getDate() === today.getDate() && 
             comp.getMonth() === today.getMonth() && 
             comp.getFullYear() === today.getFullYear();
    }

    if (!q.deadline) return true; // No deadline = show today
    const deadline = q.deadline.toDate ? q.deadline.toDate() : new Date(q.deadline);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return deadline < tomorrow;
  });

  // Get boss battles
  const bossBattles = missions.filter((m) => m.isBossBattle);

  const dropQuest = async (questId) => {
    if (!user) return;
    try {
      // 1. Mark quest as dropped
      await updateDoc(doc(db, 'quests', questId), {
        status: 'dropped',
        droppedAt: new Date(),
      });

      // 2. Fetch user to calculate penalty and update badges
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentXP = userData.xp || 0;
        const currentCoins = userData.coins || 0;
        const drops = (userData.tasksDropped || 0) + 1;
        const userBadges = userData.badges || [];

        let newXP = currentXP - PENALTY_CONSTANTS.SOLO_DROP_XP;
        let newCoins = currentCoins - PENALTY_CONSTANTS.SOLO_DROP_COINS;
        
        if (newXP < 0) newXP = 0;
        if (newCoins < 0) newCoins = 0;

        const updates = {
          xp: newXP,
          level: Math.floor(newXP / 1000),
          coins: newCoins,
          tasksDropped: drops,
          perfectStreak: 0, // Reset perfect streak
        };

        // Assign Sloth badge if threshold reached and they don't have it
        if (drops >= PENALTY_CONSTANTS.MAX_DROPS_BEFORE_SLOTH && !userBadges.includes('the_sloth')) {
          updates.badges = [...userBadges, 'the_sloth'];
        }

        await setDoc(userRef, updates, { merge: true });

        // Log the coin penalty so it appears in Rewards history
        if (PENALTY_CONSTANTS.SOLO_DROP_COINS > 0) {
          await addDoc(collection(db, 'coinTransactions'), {
            userId: user.uid,
            amount: -Math.min(currentCoins, PENALTY_CONSTANTS.SOLO_DROP_COINS),
            type: 'spend',
            reason: 'Dropped a quest',
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to drop quest:', err);
      throw err;
    }
  };

  const deleteMission = async (missionId) => {
    if (!user) return;
    try {
      // Soft-delete: mark mission and its quests as deleted
      const questsRef = collection(db, 'quests');
      const q = query(questsRef, where('missionId', '==', missionId));
      const querySnapshot = await getDocs(q);
      
      let aiTaskCount = 0;
      const updatePromises = [];
      querySnapshot.forEach((docSnap) => {
        const questData = docSnap.data();
        if (questData.enableAIEvaluation) aiTaskCount++;
        updatePromises.push(updateDoc(doc(db, 'quests', docSnap.id), {
          status: 'deleted',
          deletedAt: new Date(),
        }));
      });
      await Promise.all(updatePromises);

      // Mark the mission as deleted
      await updateDoc(doc(db, 'missions', missionId), {
        status: 'deleted',
        deletedAt: new Date(),
      });

      // Apply penalties to user
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const totalTasks = querySnapshot.size;
        const xpPenalty = totalTasks * PENALTY_CONSTANTS.SOLO_DROP_XP;
        const coinPenalty = (totalTasks * PENALTY_CONSTANTS.SOLO_DROP_COINS) + (aiTaskCount * 5);
        
        let newXP = Math.max(0, (userData.xp || 0) - xpPenalty);
        let newCoins = Math.max(0, (userData.coins || 0) - coinPenalty);

        await updateDoc(userRef, {
          xp: newXP,
          level: Math.floor(newXP / 1000),
          coins: newCoins,
          tasksDropped: (userData.tasksDropped || 0) + totalTasks,
        });

        // Log the coin penalty so it appears in Rewards history
        if (coinPenalty > 0) {
          await addDoc(collection(db, 'coinTransactions'), {
            userId: user.uid,
            amount: -Math.min(userData.coins || 0, coinPenalty),
            type: 'spend',
            reason: 'Deleted a quest',
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (err) {
      console.error('Failed to delete mission:', err);
    }
  };

  // Penalty info calculator (for UI display before confirming delete)
  const getDeletePenaltyInfo = (missionId) => {
    const missionQuests = quests.filter((q) => q.missionId === missionId && q.status !== 'completed' && q.status !== 'deleted');
    const totalTasks = missionQuests.length;
    const aiTaskCount = missionQuests.filter(q => q.enableAIEvaluation).length;
    const xpLoss = totalTasks * PENALTY_CONSTANTS.SOLO_DROP_XP;
    const coinLoss = (totalTasks * PENALTY_CONSTANTS.SOLO_DROP_COINS) + (aiTaskCount * 5);
    return { totalTasks, aiTaskCount, xpLoss, coinLoss };
  };

  // Dropped/deleted quests for display
  const droppedQuests = quests.filter((q) => q.status === 'dropped' || q.status === 'deleted');

  const value = {
    missions: missions.filter(m => m.status !== 'deleted'),
    allMissions: missions,
    quests: quests.filter(q => q.status !== 'deleted'),
    loading,
    activeQuests: quests.filter(q => q.status === 'pending' || q.status === 'in_progress'),
    completedQuests: quests.filter(q => q.status === 'completed'),
    overdueQuests,
    todayQuests,
    bossBattles,
    droppedQuests,
    getQuestsForMission,
    dropQuest,
    deleteMission,
    getDeletePenaltyInfo,
  };

  return (
    <QuestContext.Provider value={value}>
      {children}
    </QuestContext.Provider>
  );
}

