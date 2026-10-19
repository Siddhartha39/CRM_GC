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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

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
