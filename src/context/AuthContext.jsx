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
    // Ignore JSON parse error
  }
  return null;
}

export function AuthProvider({ children }) {
  const savedDemo = getSavedDemoAuth();
  const [user, setUser] = useState(savedDemo?.demoUser || null);
  const [userProfile, setUserProfile] = useState(savedDemo?.demoProfile || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
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

              const newProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Executive',
                role: isFirstUser ? 'admin' : 'employee',
                status: 'active',
                createdAt: serverTimestamp(),
                lastLoginAt: serverTimestamp(),
              };

              await setDoc(userDocRef, newProfile);
              setUserProfile(newProfile);
            }
          } catch (dbErr) {
            console.warn('Firestore user doc access failed (using fallback profile):', dbErr);
            setUserProfile({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || 'Executive',
              role: 'admin',
              status: 'active',
            });
          }
        } else {
          // If no active Firebase Auth session, check if user is in demo mode!
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

    return () => unsubscribe();
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

      let finalRole = role;
      try {
        const allUsersSnap = await getDocs(collection(db, 'users'));
        if (allUsersSnap.empty) {
          finalRole = 'admin';
        }
      } catch (e) {
        finalRole = 'admin';
      }

      const profileData = {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: displayName || email.split('@')[0],
        role: finalRole,
        status: 'active',
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
        details: { role: finalRole },
        user: cred.user,
      });

      return cred.user;
    } catch (err) {
      setAuthError(err.message);
      throw err;
    }
  };

  // Instant Demo Mode
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
    }
  };

  const isAdmin = userProfile?.role === 'admin' || !userProfile?.role;
  const isEmployee = userProfile?.role === 'employee' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        loading,
        authError,
        isAdmin,
        isEmployee,
        login,
        signup,
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
