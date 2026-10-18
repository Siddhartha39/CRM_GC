import React, { useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { AppRouter } from './router';
import { Toaster } from 'sonner';
import { initializeAnalytics } from '../lib/firebase';

export function App() {
  useEffect(() => {
    // Non-blocking Firebase Analytics initialization
    initializeAnalytics().catch((e) => console.warn('Analytics unavailable:', e));
  }, []);

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#ffffff',
              color: '#2d2d2d',
              border: '2px solid #2d2d2d',
              boxShadow: '4px 4px 0 #2d2d2d',
              borderRadius: '10px',
              fontFamily: 'Patrick Hand, cursive, sans-serif',
              fontSize: '1rem',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
