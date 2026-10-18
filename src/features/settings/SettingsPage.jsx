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
      <div className="p-4 bg-paper-white card-hand border-2 border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sticky-yellow border-2 border-border rounded-lg shadow-hand-sm">
            <Settings className="w-6 h-6 text-foreground stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Shop Configuration & Workspace Settings
            </h2>
            <p className="text-sm font-body text-foreground/70">
              Manage store profile, Firebase connectivity, and demo sample data
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Store Profile */}
        <Card className="border-2 border-border p-5 space-y-3" tape={true}>
          <div className="flex items-center gap-2 border-b-2 border-dashed border-border/40 pb-2">
            <Store className="w-5 h-5 text-secondary-accent" />
            <h3 className="text-xl font-heading font-bold text-foreground">
              Store Information
            </h3>
          </div>

          <div className="space-y-2 text-sm font-body">
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Business Name</span>
              <strong className="text-foreground">Galaxy Computers</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Location / City</span>
              <span className="flex items-center gap-1 font-bold">
                <MapPin className="w-3.5 h-3.5 text-secondary-accent" /> Kanpur, Uttar Pradesh
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Business Timezone</span>
              <span className="font-mono font-bold">Asia/Kolkata (IST, UTC+5:30)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Business Domain</span>
              <span>Laptops, Desktops, CCTV, Gaming PCs, Hardware Spares</span>
            </div>
          </div>
        </Card>

        {/* User Account & Role */}
        <Card className="border-2 border-border p-5 space-y-3" tape={true}>
          <div className="flex items-center gap-2 border-b-2 border-dashed border-border/40 pb-2">
            <ShieldCheck className="w-5 h-5 text-accent" />
            <h3 className="text-xl font-heading font-bold text-foreground">
              Authenticated Session
            </h3>
          </div>

          <div className="space-y-2 text-sm font-body">
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">User Email</span>
              <strong className="text-foreground">{user?.email || 'Guest User'}</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Display Name</span>
              <span>{userProfile?.displayName || user?.displayName || 'Executive'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Role</span>
              <span className={`font-bold px-2 py-0.5 rounded border text-xs ${
                isAdmin ? 'bg-red-50 text-danger border-danger' : 'bg-blue-50 text-secondary-accent border-secondary-accent'
              }`}>
                {isAdmin ? '🛡️ Administrator' : '👤 Employee'}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">User UID</span>
              <span className="font-mono text-xs text-foreground/70">{user?.uid || '—'}</span>
            </div>
          </div>
        </Card>

        {/* Firebase Architecture Diagnostic */}
        <Card className="border-2 border-border p-5 space-y-3">
          <div className="flex items-center gap-2 border-b-2 border-dashed border-border/40 pb-2">
            <Database className="w-5 h-5 text-secondary-accent" />
            <h3 className="text-xl font-heading font-bold text-foreground">
              Firebase Backend Status
            </h3>
          </div>

          <div className="space-y-2 text-sm font-body">
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Firebase Project ID</span>
              <span className="font-mono font-bold text-secondary-accent">galaxycrm-4577f</span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Authentication</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Firebase Auth Active
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Firestore Database</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> Cloud Firestore Modular SDK
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-border/20">
              <span className="text-foreground/60">Security Rules</span>
              <span className="font-mono text-xs">firestore.rules configured</span>
            </div>
          </div>
        </Card>

        {/* Database Management & Quick Actions */}
        <Card className="border-2 border-border p-5 space-y-3 bg-paper-white" tape={true}>
          <div className="flex items-center gap-2 border-b-2 border-dashed border-border/40 pb-2">
            <Database className="w-5 h-5 text-secondary-accent" />
            <h3 className="text-xl font-heading font-bold text-foreground">
              Lead Management Actions
            </h3>
          </div>

          <p className="text-xs font-body text-foreground/80 leading-relaxed">
            Real-time synchronization is active with your Google Cloud Firestore database (`galaxycrm-4577f`). Manage leads and records directly.
          </p>

          <div className="flex flex-col gap-2 pt-1">
            <Button
              variant="primary"
              icon={Users}
              onClick={() => navigate('/leads')}
              className="w-full justify-center"
            >
              Open Master Customer Database
            </Button>
            <Button
              variant="outline"
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
