import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  LogIn,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ArrowRight,
  LogOut,
} from 'lucide-react';

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
        msg = 'Invalid email or password. If you are logging in for the first time, click "Create New Account" below.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'An account with this email already exists. Please log in instead.';
      }

      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemo = (chosenRole = 'admin') => {
    const finalName = displayName?.trim() || (chosenRole === 'admin' ? 'Vishal' : 'Sales Executive');
    const finalEmail = email?.trim() || (chosenRole === 'admin' ? 'admin@galaxycomputers.in' : 'sales@galaxycomputers.in');
    loginAsDemo(chosenRole, finalName, finalEmail);
    navigate('/', { replace: true });
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
    <div className="min-h-screen bg-paper-dots flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-paper-white card-hand-lg border-2 border-border p-8 relative">
        {/* Washi tape on top */}
        <div className="washi-tape washi-tape-blue" />

        {/* Brand Banner */}
        <div className="text-center mb-6">
          <div className="inline-block p-2 bg-sticky-yellow border-2 border-border rounded-xl shadow-hand-sm mb-3">
            <img src="/logo.svg" alt="Galaxy Computers" className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-heading font-bold text-foreground">
            Galaxy Computers
          </h1>
          <p className="text-sm font-body text-secondary-accent font-semibold tracking-wider mt-0.5">
            CRM • KANPUR STORE DESK
          </p>
        </div>

        {/* Active Session Notice if already logged in */}
        {user && (
          <div className="p-3 bg-emerald-50 border-2 border-emerald-600 rounded-lg text-xs font-body text-emerald-950 mb-4 flex items-center justify-between">
            <div>
              <div className="font-heading font-bold text-sm text-emerald-900">
                Active Session: {user.displayName || user.email}
              </div>
              <div className="text-emerald-800 text-[11px]">Role: {userProfile?.role || 'admin'}</div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/')}
                className="text-xs py-1 px-2"
              >
                Dashboard <ArrowRight className="w-3 h-3" />
              </Button>
              <button
                type="button"
                onClick={() => logout()}
                className="p-1.5 text-danger hover:bg-red-100 rounded border border-danger/40 text-xs"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Operation Not Allowed Special Help Box */}
        {isOperationNotAllowed && (
          <div className="p-4 bg-amber-50 border-2 border-amber-600 rounded-lg text-xs font-body text-amber-950 mb-4 space-y-2">
            <div className="font-heading font-bold text-sm text-amber-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              Firebase Setup Required: Enable Email/Password
            </div>
            <p className="leading-relaxed">
              Firebase project <strong>galaxycrm-4577f</strong> has not enabled the <strong>Email/Password</strong> sign-in method yet in Firebase Console.
            </p>
            <div className="bg-white p-2.5 rounded border border-amber-300 space-y-1 text-[11px]">
              <div className="font-bold text-foreground">Quick 1-Minute Fix:</div>
              <div>1. Go to <a href="https://console.firebase.google.com/project/galaxycrm-4577f/authentication/providers" target="_blank" rel="noreferrer" className="text-secondary-accent font-bold underline inline-flex items-center gap-0.5">Firebase Authentication Providers <ExternalLink className="w-2.5 h-2.5" /></a></div>
              <div>2. Click <strong>Email/Password</strong> and toggle <strong>Enable</strong>.</div>
              <div>3. Click <strong>Save</strong>.</div>
            </div>
            <div className="pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Sparkles}
                onClick={() => handleInstantDemo('admin')}
                className="w-full text-xs"
              >
                Enter CRM Directly (Demo Admin Mode)
              </Button>
            </div>
          </div>
        )}

        {/* General Error Alert */}
        {errorMessage && !isOperationNotAllowed && (
          <div className="p-3 bg-red-50 border-2 border-danger rounded-lg text-xs font-body text-danger flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
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
            placeholder="e.g. 6387siddhartha@gmail.com"
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
            <div className="p-3 bg-stone-50 border border-border/50 rounded-lg">
              <label className="font-heading font-bold text-xs text-foreground block mb-1">
                Account Role:
              </label>
              <div className="flex gap-4 text-xs font-body">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="role"
                    value="admin"
                    checked={role === 'admin'}
                    onChange={() => setRole('admin')}
                    className="accent-accent"
                  />
                  <span>Administrator (Full Access)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
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
            className="w-full text-base py-2.5 mt-2"
          >
            {loading
              ? 'Connecting to Firebase...'
              : isRegistering
              ? 'Create Authorized Account'
              : 'Sign In to Workspace'}
          </Button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMessage('');
              setIsOperationNotAllowed(false);
            }}
            className="text-xs font-body text-secondary-accent hover:underline font-bold"
          >
            {isRegistering
              ? 'Already have an authorized account? Sign In'
              : 'First time setup? Create New Authorized Account'}
          </button>
        </div>

        {/* Instant Access Mode & Testing Helpers */}
        <div className="mt-6 pt-4 border-t-2 border-dashed border-border/40 space-y-2">
          <div className="flex items-center justify-between text-xs font-heading font-bold text-foreground/70">
            <span>Instant One-Click Access:</span>
            <Sparkles className="w-3.5 h-3.5 text-warning" />
          </div>

          <Button
            type="button"
            variant="sticky"
            size="md"
            onClick={() => handleInstantDemo('admin')}
            className="w-full text-sm font-bold"
          >
            🚀 Launch CRM as Admin ({displayName || 'Vishal'})
          </Button>

          <div className="grid grid-cols-2 gap-2 text-xs font-body pt-1">
            <button
              type="button"
              onClick={() => handleDemoFill('admin@galaxycomputers.in', 'admin')}
              className="p-1.5 bg-stone-50 border border-border/50 rounded hover:bg-sticky-yellow transition-colors text-left"
            >
              <div className="font-bold text-foreground">Fill Admin</div>
              <div className="text-[10px] text-foreground/60 truncate">admin@galaxy...</div>
            </button>
            <button
              type="button"
              onClick={() => handleDemoFill('sales@galaxycomputers.in', 'employee')}
              className="p-1.5 bg-stone-50 border border-border/50 rounded hover:bg-sticky-yellow transition-colors text-left"
            >
              <div className="font-bold text-foreground">Fill Staff</div>
              <div className="text-[10px] text-foreground/60 truncate">sales@galaxy...</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
