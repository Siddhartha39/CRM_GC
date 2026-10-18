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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Fetch profile document from Firestore
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);

          if (snap.exists()) {
            setUserProfile(snap.data());
          } else {
            // First time login for this user or missing doc
            // Check if there are ANY users yet; if not, promote first user to admin!
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
        } else {
          setUser(null);
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Error in auth state change:', err);
        // Fallback profile if Firestore user doc fails temporarily
        if (firebaseUser) {
          setUserProfile({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || 'Executive',
            role: 'employee',
            status: 'active',
          });
        }
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

      // Check if first user in DB
      let finalRole = role;
      const allUsersSnap = await getDocs(collection(db, 'users'));
      if (allUsersSnap.empty) {
        finalRole = 'admin'; // First user is automatically Admin
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

      await setDoc(doc(db, 'users', cred.user.uid), profileData);
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

  // Quick demo / emergency access mode (bypasses Auth when Email/Password provider isn't toggled yet)
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
    setUser(demoUser);
    setUserProfile(demoProfile);
    localStorage.setItem('galaxy_demo_auth', JSON.stringify({ demoUser, demoProfile }));
  };

  // Restore demo auth on boot if present
  useEffect(() => {
    const saved = localStorage.getItem('galaxy_demo_auth');
    if (saved && !user) {
      try {
        const { demoUser, demoProfile } = JSON.parse(saved);
        setUser(demoUser);
        setUserProfile(demoProfile);
      } catch (e) {
        localStorage.removeItem('galaxy_demo_auth');
      }
    }
  }, []);

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
      setUser(null);
      setUserProfile(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
      setUserProfile(null);
    }
  };

  const isAdmin = userProfile?.role === 'admin';
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
