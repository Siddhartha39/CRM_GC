import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, getDocs, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { logAudit } from '../services/auditService';

const AuthContext = createContext(null);

function getSavedDemoAuth() {
  try {
    const saved = localStorage.getItem('galaxy_demo_auth');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    // Ignore parse error
  }
  return null;
}

export function AuthProvider({ children }) {
  const savedDemo = getSavedDemoAuth();
  const [user, setUser] = useState(savedDemo?.demoUser || null);
  const [userProfile, setUserProfile] = useState(savedDemo?.demoProfile || null);
  // If demo session exists, we are already loaded immediately!
  const [loading, setLoading] = useState(!savedDemo);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Strict safety timeout: never stay in loading state for more than 500ms
    const safetyTimer = setTimeout(() => {
      setLoading(false);
    }, 500);

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        clearTimeout(safetyTimer);
        try {
          if (firebaseUser) {
            setUser(firebaseUser);

            // Fetch profile document from Firestore
            try {
              const userDocRef = doc(db, 'users', firebaseUser.uid);
              const snap = await getDoc(userDocRef);

              if (snap.exists()) {
                setUserProfile(snap.data());
              } else {
                const allUsersSnap = await getDocs(collection(db, 'users'));
                const isFirstUser = allUsersSnap.empty;
                const isKnownAdmin = firebaseUser.email === '63387siddhartha@gmail.com' || firebaseUser.email === 'siddhartha@gmail.com';

                const newProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email,
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Executive',
                  role: (isFirstUser || isKnownAdmin) ? 'admin' : 'employee',
                  status: (isFirstUser || isKnownAdmin) ? 'active' : 'pending_approval',
                  createdAt: serverTimestamp(),
                  lastLoginAt: serverTimestamp(),
                };

                await setDoc(userDocRef, newProfile);
                setUserProfile(newProfile);
              }
            } catch (dbErr) {
              setUserProfile({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || 'Executive',
                role: 'employee',
                status: 'pending_approval',
              });
            }
          } else {
            // Check if demo auth is active
            const activeDemo = getSavedDemoAuth();
            if (activeDemo) {
              setUser(activeDemo.demoUser);
              setUserProfile(activeDemo.demoProfile);
            } else {
              setUser(null);
              setUserProfile(null);
            }
          }
        } catch (err) {
          console.error('Error in auth state change:', err);
        } finally {
          setLoading(false);
        }
      });
    } catch (e) {
      console.warn('onAuthStateChanged setup error:', e);
      setLoading(false);
    }

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  // Login
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem('galaxy_demo_auth');
      await logAudit({
        action: 'USER_LOGIN',
        targetType: 'auth',
        targetId: cred.user.uid,
        targetName: email,
        user: cred.user,
      });
      return cred.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Sign up
  const signup = async (email, password, displayName, role = 'employee') => {
    setAuthError(null);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName) {
        await updateProfile(cred.user, { displayName });
      }

      localStorage.removeItem('galaxy_demo_auth');

      let finalRole = 'employee';
      let finalStatus = 'pending_approval';

      const isKnownAdmin = email === '63387siddhartha@gmail.com' || email === 'siddhartha@gmail.com';

      try {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        if (allUsersSnap.empty || isKnownAdmin) {
          finalRole = 'admin';
          finalStatus = 'active';
        }
      } catch (e) {
        if (isKnownAdmin) {
          finalRole = 'admin';
          finalStatus = 'active';
        }
      }

      const profileData = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || email.split('@')[0],
        role: finalRole,
        status: finalStatus,
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      };

      try {
        await setDoc(doc(db, 'users', cred.user.uid), profileData);
      } catch (e) {
        console.warn('Could not save user profile doc in Firestore:', e);
      }

      setUserProfile(profileData);

      await logAudit({
        action: 'USER_REGISTERED',
        targetType: 'auth',
        targetId: cred.user.uid,
        targetName: email,
        details: { role: finalRole, status: finalStatus },
        user: cred.user,
      });

      return cred.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Refresh profile from Firestore
  const refreshProfile = async () => {
    if (!user) return null;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        const data = snap.data();
        setUserProfile(data);
        return data;
      }
    } catch (e) {
      console.warn('Error refreshing profile:', e);
    }
    return userProfile;
  };

  // Instant Demo Mode (Internal development fallback only)
  const loginAsDemo = (demoRole = 'admin', name = 'Vishal', customEmail = 'vishal@galaxycomputers.in') => {
    const demoUser = {
      uid: 'demo-' + demoRole + '-101',
      email: customEmail,
      displayName: name,
    };
    const demoProfile = {
      uid: demoUser.uid,
      email: customEmail,
      displayName: name,
      role: demoRole,
      status: 'active',
    };
    localStorage.setItem('galaxy_demo_auth', JSON.stringify({ demoUser, demoProfile }));
    setUser(demoUser);
    setUserProfile(demoProfile);
    setLoading(false);
  };

  // Logout
  const logout = async () => {
    try {
      localStorage.removeItem('galaxy_demo_auth');
      await logAudit({
        action: 'USER_LOGOUT',
        targetType: 'auth',
        targetId: user?.uid,
        targetName: user?.email,
        user,
      });
      await signOut(auth);
    } catch (err) {
      console.warn('Sign out complete:', err);
    } finally {
      setUser(null);
      setUserProfile(null);
      setLoading(false);
    }
  };

  const isAdmin = userProfile?.role === 'admin' || (!userProfile?.role && (user?.email === '63387siddhartha@gmail.com' || user?.email === 'siddhartha@gmail.com'));
  const isEmployee = userProfile?.role === 'employee' || isAdmin;
  const isApproved = userProfile?.status === 'active';

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        isAdmin,
        isEmployee,
        isApproved,
        login,
        signup,
        refreshProfile,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
