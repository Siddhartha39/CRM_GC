import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  LogIn,
  UserPlus,
  AlertCircle,
  Sparkles,
  ArrowRight,
  LogOut,
} from 'lucide-react';

/**
 * Neumorphic Soft UI Login & Workspace Authentication
 */
export function LoginPage() {
  const navigate = useNavigate();
  const { login, signup, loginAsDemo, logout, user, userProfile } = useAuth();

  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isOperationNotAllowed, setIsOperationNotAllowed] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsOperationNotAllowed(false);

    if (!email || !password) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isRegistering) {
        await signup(email, password, displayName, role);
      } else {
        await login(email, password);
      }
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Auth error:', err);
      let msg = err.message;

      if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
        setIsOperationNotAllowed(true);
        msg = 'Email/Password sign-in provider is disabled in your Firebase Console for project galaxycrm-4577f.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = 'Invalid email or password. If you are logging in for the first time, click "Create New Authorized Account" below.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please log in instead.';
      }

      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemo = async (chosenRole = 'admin') => {
    setLoading(true);
    setErrorMessage('');
    try {
      await login('admin@galaxycomputers.in', 'galaxy123');
      navigate('/', { replace: true });
    } catch (err) {
      console.warn('Real login attempt:', err);
      const finalName = displayName?.trim() || (chosenRole === 'admin' ? 'Vishal' : 'Sales Executive');
      const finalEmail = email?.trim() || (chosenRole === 'admin' ? 'admin@galaxycomputers.in' : 'sales@galaxycomputers.in');
      loginAsDemo(chosenRole, finalName, finalEmail);
      navigate('/', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  const handleDemoFill = (demoEmail, demoRole) => {
    setEmail(demoEmail);
    setPassword('galaxy123');
    setDisplayName(demoRole === 'admin' ? 'Vishal' : 'Staff Executive');
    setRole(demoRole);
    setErrorMessage('');
    setIsOperationNotAllowed(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 antialiased">
      <div className="w-full max-w-md bg-background shadow-neu-flat rounded-[32px] p-8 sm:p-10 relative transition-all">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-3xl bg-background shadow-neu-pressed flex items-center justify-center p-3 mb-4 mx-auto animate-neu-float">
            <img src="/logo.svg" alt="Galaxy Computers" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-display font-extrabold text-foreground tracking-tight">
            Galaxy Computers
          </h1>
          <p className="text-xs font-display font-bold text-accent tracking-widest uppercase mt-1">
            CRM • Kanpur Store Desk
          </p>
        </div>

        {/* Active Session Notice if already logged in */}
        {user && (
          <div className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl text-xs font-body mb-6 flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-sm text-foreground">
                Active Session: {user.displayName || user.email}
              </div>
              <div className="text-muted text-[11px]">Role: {userProfile?.role || 'admin'}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/')}
                className="text-xs py-1 px-3"
              >
                Dashboard <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
              <button
                type="button"
                onClick={() => logout()}
                className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat text-danger flex items-center justify-center transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl text-xs font-body text-danger flex items-start gap-2.5 mb-6">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegistering && (
            <Input
              label="Your Full Name"
              required
              placeholder="e.g. Vishal"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          )}

          <Input
            label="Work Email Address"
            type="email"
            required
            placeholder="e.g. admin@galaxycomputers.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            required
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {isRegistering && (
            <div className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl space-y-2">
              <label className="font-display font-bold text-xs uppercase tracking-wider text-muted block">
                Account Role:
              </label>
              <div className="flex gap-4 text-xs font-body">
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="accent-accent"
                  />
                  <span>Administrator</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-foreground">
                  <input
                    type="radio"
                    name="role"
                    value="employee"
                    checked={role === 'employee'}
                    onChange={() => setRole('employee')}
                    className="accent-accent"
                  />
                  <span>Sales Executive</span>
                </label>
              </div>
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            icon={isRegistering ? UserPlus : LogIn}
            disabled={loading}
            className="w-full text-sm font-bold py-3 mt-4"
          >
            {loading
              ? 'Connecting to Firebase...'
              : isRegistering
              ? 'Create Authorized Account'
              : 'Sign In to Workspace'}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMessage('');
              setIsOperationNotAllowed(false);
            }}
            className="text-xs font-body text-accent hover:underline font-bold"
          >
            {isRegistering
              ? 'Already have an authorized account? Sign In'
              : 'First time setup? Create New Authorized Account'}
          </button>
        </div>

        {/* Instant Access Mode */}
        <div className="mt-8 pt-6 border-t border-muted/20 space-y-3">
          <div className="flex items-center justify-between text-xs font-display font-bold uppercase tracking-wider text-muted">
            <span>Instant Quick Access:</span>
            <Sparkles className="w-3.5 h-3.5 text-accent" />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => handleInstantDemo('admin')}
            className="w-full text-xs font-bold"
          >
            🚀 Launch CRM as Admin ({displayName || 'Vishal'})
          </Button>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@galaxycomputers.in', 'admin')}
              className="p-3 bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm rounded-2xl transition-all text-left"
            >
              <div className="font-display font-bold text-xs text-foreground">Fill Admin</div>
              <div className="text-[10px] text-muted truncate">admin@galaxy...</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('sales@galaxycomputers.in', 'employee')}
              className="p-3 bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm rounded-2xl transition-all text-left"
            >
              <div className="font-display font-bold text-xs text-foreground">Fill Staff</div>
              <div className="text-[10px] text-muted truncate">sales@galaxy...</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
