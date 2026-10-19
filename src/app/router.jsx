import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { AllLeadsPage } from '../features/customers/AllLeadsPage';
import { HotLeadsPage, WarmLeadsPage, ColdLeadsPage } from '../features/customers/CategoryLeadsPage';
import { CustomerDetailPage } from '../features/customers/CustomerDetailPage';
import { FollowUpsPage } from '../features/followups/FollowUpsPage';
import { FollowUpCalendarPage } from '../features/followups/FollowUpCalendarPage';
import { CallHistoryPage } from '../features/calls/CallHistoryPage';
import { ImportExportPage } from '../features/imports/ImportExportPage';
import { ReportsPage } from '../features/reports/ReportsPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { LoginPage } from '../features/auth/LoginPage';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';

import { ShieldAlert, RefreshCw, LogOut, Lock } from 'lucide-react';
import { Button } from '../components/ui/Button';

function ProtectedRoute({ children }) {
  const { user, userProfile, loading, refreshProfile, logout } = useAuth();
  const [checking, setChecking] = React.useState(false);

  // If loading and no user yet, display brief skeleton
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-[#E0E5EC] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#E0E5EC] rounded-[32px] shadow-neu-flat p-8 border-0">
          <div className="text-center font-heading font-extrabold text-2xl text-[#3D4852] mb-6">
            Galaxy Computers CRM
          </div>
          <LoadingSkeleton count={3} height="h-12" />
        </div>
      </div>
    );
  }

  // If definitely not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Security Check 1: Account Pending Approval
  if (userProfile && userProfile.status === 'pending_approval') {
    const handleCheckApproval = async () => {
      setChecking(true);
      await refreshProfile();
      setChecking(false);
    };

    return (
      <div className="min-h-screen bg-[#E0E5EC] flex items-center justify-center p-6">
        <div className="w-full max-w-lg bg-[#E0E5EC] rounded-[32px] shadow-neu-flat p-8 sm:p-10 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl shadow-neu-pressed flex items-center justify-center text-amber-500">
            <ShieldAlert className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-extrabold text-[#3D4852]">
              Account Pending Approval
            </h2>
            <p className="text-sm font-body text-[#6B7280] leading-relaxed">
              Your account has been registered, but for security, a <strong>Galaxy Computers Administrator</strong> must approve your access before you can view store customer records.
            </p>
          </div>

          <div className="p-4 rounded-2xl shadow-neu-pressed bg-[#E0E5EC] text-left text-xs font-body space-y-1.5">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Account Email:</span>
              <strong className="text-[#3D4852]">{user?.email}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Current Status:</span>
              <span className="font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                ⏳ Pending Admin Approval
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Designation:</span>
              <span className="text-[#3D4852] font-medium">Sales Executive (Awaiting Activation)</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="primary"
              icon={RefreshCw}
              onClick={handleCheckApproval}
              disabled={checking}
              className="flex-1 justify-center"
            >
              {checking ? 'Checking Status...' : 'Check Approval Status'}
            </Button>
            <Button
              variant="secondary"
              icon={LogOut}
              onClick={logout}
              className="justify-center"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Security Check 2: Account Suspended / Deactivated
  if (userProfile && userProfile.status === 'suspended') {
    return (
      <div className="min-h-screen bg-[#E0E5EC] flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-[#E0E5EC] rounded-[32px] shadow-neu-flat p-8 text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-3xl shadow-neu-pressed flex items-center justify-center text-rose-500">
            <Lock className="w-10 h-10 stroke-[2.2]" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-heading font-extrabold text-[#3D4852]">
              Account Access Suspended
            </h2>
            <p className="text-sm font-body text-[#6B7280]">
              This account has been deactivated by the store administrator. Please contact store management for assistance.
            </p>
          </div>

          <Button
            variant="secondary"
            icon={LogOut}
            onClick={logout}
            className="w-full justify-center"
          >
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return children;
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Authenticated Workspace Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="leads" element={<AllLeadsPage />} />
        <Route path="leads/hot" element={<HotLeadsPage />} />
        <Route path="leads/warm" element={<WarmLeadsPage />} />
        <Route path="leads/cold" element={<ColdLeadsPage />} />
        <Route path="leads/:id" element={<CustomerDetailPage />} />

        {/* Follow-ups */}
        <Route path="followups/today" element={<FollowUpsPage viewType="today" />} />
        <Route path="followups/overdue" element={<FollowUpsPage viewType="overdue" />} />
        <Route path="followups/upcoming" element={<FollowUpsPage viewType="upcoming" />} />
        <Route path="followups/completed" element={<FollowUpsPage viewType="completed" />} />
        <Route path="followups/calendar" element={<FollowUpCalendarPage />} />

        {/* Call History, Tools, Reports, Settings */}
        <Route path="calls" element={<CallHistoryPage />} />
        <Route path="import-export" element={<ImportExportPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
