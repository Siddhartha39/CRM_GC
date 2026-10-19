import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Store,
  ShieldCheck,
  Database,
  CheckCircle,
  FileSpreadsheet,
  Users,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useAuth();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#E0E5EC] rounded-[32px] p-6 shadow-neu-flat flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl shadow-neu-pressed flex items-center justify-center bg-[#E0E5EC] text-[#6C63FF]">
            <Settings className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-[#3D4852]">
              Shop Configuration & Workspace Settings
            </h2>
            <p className="text-sm font-body text-[#6B7280]">
              Manage store profile, Firebase connectivity, and demo sample data
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Profile */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#A3B1C6]/30 pb-3">
            <div className="w-9 h-9 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#6C63FF]">
              <Store className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-heading font-extrabold text-[#3D4852]">
              Store Information
            </h3>
          </div>

          <div className="space-y-3 text-sm font-body">
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Business Name</span>
              <strong className="text-[#3D4852] font-heading font-bold">Galaxy Computers</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Location / City</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#3D4852]">
                <MapPin className="w-4 h-4 text-[#6C63FF]" /> Kanpur, Uttar Pradesh
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Business Timezone</span>
              <span className="font-mono text-xs font-semibold text-[#3D4852]">Asia/Kolkata (IST, UTC+5:30)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#6B7280]">Business Domain</span>
              <span className="text-right text-xs text-[#3D4852] font-medium max-w-[220px]">
                Laptops, Desktops, CCTV, Gaming PCs, Hardware Spares
              </span>
            </div>
          </div>
        </Card>

        {/* User Account & Role */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#A3B1C6]/30 pb-3">
            <div className="w-9 h-9 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#6C63FF]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-heading font-extrabold text-[#3D4852]">
              Authenticated Session
            </h3>
          </div>

          <div className="space-y-3 text-sm font-body">
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">User Email</span>
              <strong className="text-[#3D4852] font-medium">{user?.email || 'Guest User'}</strong>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Display Name</span>
              <span className="font-semibold text-[#3D4852]">{userProfile?.displayName || user?.displayName || 'Executive'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Role</span>
              <span className={`font-heading font-bold px-3 py-1 rounded-xl text-xs shadow-neu-pressed ${
                isAdmin ? 'text-rose-600' : 'text-[#6C63FF]'
              }`}>
                {isAdmin ? '🛡️ Administrator' : '👤 Employee'}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#6B7280]">User UID</span>
              <span className="font-mono text-xs text-[#6B7280]">{user?.uid || '—'}</span>
            </div>
          </div>
        </Card>

        {/* Firebase Architecture Diagnostic */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#A3B1C6]/30 pb-3">
            <div className="w-9 h-9 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#38B2AC]">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-heading font-extrabold text-[#3D4852]">
              Firebase Backend Status
            </h3>
          </div>

          <div className="space-y-3 text-sm font-body">
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Firebase Project ID</span>
              <span className="font-mono font-bold text-[#6C63FF]">galaxycrm-4577f</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Authentication</span>
              <span className="text-[#38B2AC] font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-4 h-4" /> Firebase Auth Active
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#A3B1C6]/20">
              <span className="text-[#6B7280]">Firestore Database</span>
              <span className="text-[#38B2AC] font-bold flex items-center gap-1.5 text-xs">
                <CheckCircle className="w-4 h-4" /> Cloud Firestore Modular SDK
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-[#6B7280]">Security Rules</span>
              <span className="font-mono text-xs text-[#3D4852]">firestore.rules configured</span>
            </div>
          </div>
        </Card>

        {/* Database Management & Quick Actions */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 border-b border-[#A3B1C6]/30 pb-3">
            <div className="w-9 h-9 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#6C63FF]">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-heading font-extrabold text-[#3D4852]">
              Lead Management Actions
            </h3>
          </div>

          <p className="text-xs font-body text-[#6B7280] leading-relaxed">
            Real-time synchronization is active with your Google Cloud Firestore database (<code className="font-mono text-[#3D4852]">galaxycrm-4577f</code>). Manage leads and records directly.
          </p>

          <div className="flex flex-col gap-3 pt-2">
            <Button
              variant="primary"
              icon={Users}
              onClick={() => navigate('/leads')}
              className="w-full justify-center"
            >
              Open Master Customer Database
            </Button>
            <Button
              variant="secondary"
              icon={FileSpreadsheet}
              onClick={() => navigate('/import-export')}
              className="w-full justify-center"
            >
              Bulk Import / Export CSV Leads
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
