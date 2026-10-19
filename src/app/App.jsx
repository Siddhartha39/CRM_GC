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
              background: '#E0E5EC',
              color: '#3D4852',
              border: 'none',
              boxShadow: '6px 6px 16px rgba(163, 177, 198, 0.6), -6px -6px 16px rgba(255, 255, 255, 0.8)',
              borderRadius: '20px',
              fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
              fontSize: '0.875rem',
              fontWeight: '600',
            },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
