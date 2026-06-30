import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from '../config/firebase';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubDoc) { unsubDoc(); unsubDoc = null; }

      if (firebaseUser) {
        setUser(firebaseUser);
        const userRef = doc(db, 'users', firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const currentData = userSnap.data();
          // Sync photoURL/displayName if they changed (e.g. Google profile update)
          if (currentData.photoURL !== firebaseUser.photoURL || currentData.displayName !== firebaseUser.displayName) {
            await setDoc(userRef, {
              photoURL: firebaseUser.photoURL || currentData.photoURL || '',
              displayName: firebaseUser.displayName || currentData.displayName || 'Adventurer',
            }, { merge: true });
          }
        } else {
          // Create new user profile
          await setDoc(userRef, {
            displayName: firebaseUser.displayName || 'Adventurer',
            email: firebaseUser.email,
            photoURL: firebaseUser.photoURL || '',
            archetype: null,
            xp: 0,
            level: 0,
            rank: 'Initiate',
            coins: 0,
            totalCoinsEarned: 0,
            tasksDropped: 0,
            perfectStreak: 0,
            onTimeStreak: 0,
            duelWins: 0,
            certificatesUploaded: 0,
            streaks: {
              focus: 0, growth: 0, commitment: 0, recovery: 0,
              shieldAvailable: false, lastActiveDate: null,
            },
            badges: [],
            secretCounters: {},
            onboardingComplete: false,
            createdAt: serverTimestamp(),
          });
        }

        // Live-subscribe to the user doc so XP / coins / badges update everywhere instantly.
        unsubDoc = onSnapshot(userRef, (d) => {
          if (d.exists()) setUserData(d.data());
          setLoading(false);
        }, () => setLoading(false));
      } else {
        setUser(null);
        setUserData(null);
        setLoading(false);
      }
    });

    return () => { if (unsubDoc) unsubDoc(); unsubscribe(); };
  }, []);

  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const updateUserData = async (updates) => {
    if (!user) return;
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, updates, { merge: true });
    setUserData((prev) => ({ ...prev, ...updates }));
  };

  const value = {
    user,
    userData,
    loading,
    loginWithGoogle,
    logout,
    updateUserData,
    isAuthenticated: !!user,
    isOnboarded: userData?.onboardingComplete === true,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
