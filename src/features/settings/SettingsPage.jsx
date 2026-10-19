import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { toast } from 'sonner';
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
  UserCheck,
  UserX,
  Clock,
  ShieldAlert,
  KeyRound,
  RefreshCw,
} from 'lucide-react';

export function SettingsPage() {
  const navigate = useNavigate();
  const { user, userProfile, isAdmin } = useAuth();

  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [processingUid, setProcessingUid] = useState(null);

  const fetchUsers = async () => {
    if (!isAdmin) return;
    setLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setUsersList(list);
    } catch (e) {
      console.warn('Could not fetch users list:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [isAdmin]);

  const handleUpdateStatus = async (targetUid, newStatus) => {
    setProcessingUid(targetUid);
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      toast.success(`User access updated to ${newStatus}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update user status: ' + err.message);
    } finally {
      setProcessingUid(null);
    }
  };

  const handleUpdateRole = async (targetUid, newRole) => {
    setProcessingUid(targetUid);
    try {
      await updateDoc(doc(db, 'users', targetUid), {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      toast.success(`User role changed to ${newRole}`);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to update role: ' + err.message);
    } finally {
      setProcessingUid(null);
    }
  };

  const pendingCount = usersList.filter(u => u.status === 'pending_approval').length;

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

        {/* Team Members & Staff Access Control (Admin Only) */}
        {isAdmin && (
          <Card className="md:col-span-2 p-6 space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#A3B1C6]/30 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#6C63FF]">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-extrabold text-[#3D4852] flex items-center gap-2">
                    Team Members & Access Approvals
                    {pendingCount > 0 && (
                      <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {pendingCount} Pending
                      </span>
                    )}
                  </h3>
                  <p className="text-xs font-body text-[#6B7280]">
                    Only approved staff members can log in and access Galaxy Computers customer data
                  </p>
                </div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                icon={RefreshCw}
                onClick={fetchUsers}
                disabled={loadingUsers}
              >
                Refresh Staff List
              </Button>
            </div>

            {/* Pending alert banner */}
            {pendingCount > 0 && (
              <div className="p-4 rounded-2xl shadow-neu-pressed bg-[#E0E5EC] border-l-4 border-amber-500 flex items-center gap-3 text-xs font-body text-[#3D4852]">
                <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <strong>{pendingCount} account request(s) awaiting your decision:</strong> Unapproved users cannot see or touch customer leads until you click <em>Approve Access</em>.
                </div>
              </div>
            )}

            {/* Users Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm font-body">
                <thead>
                  <tr className="border-b border-[#A3B1C6]/30 text-xs font-heading font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Staff Member</th>
                    <th className="py-2.5 px-3">Email Address</th>
                    <th className="py-2.5 px-3">Role</th>
                    <th className="py-2.5 px-3">Access Status</th>
                    <th className="py-2.5 px-3 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#A3B1C6]/20">
                  {usersList.map((member) => {
                    const isSelf = member.uid === user?.uid || member.id === user?.uid;
                    const isPending = member.status === 'pending_approval';
                    const isSuspended = member.status === 'suspended';

                    return (
                      <tr key={member.id} className="hover:bg-[#A3B1C6]/10 transition-colors">
                        <td className="py-3 px-3">
                          <div className="font-heading font-bold text-sm text-[#3D4852]">
                            {member.displayName || 'Staff Member'}
                          </div>
                          {isSelf && (
                            <span className="text-[10px] text-[#6C63FF] font-bold">(You)</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-xs text-[#6B7280]">
                          {member.email}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-xl text-xs font-bold font-heading shadow-neu-pressed ${
                              member.role === 'admin' ? 'text-rose-600' : 'text-[#6C63FF]'
                            }`}
                          >
                            {member.role === 'admin' ? '🛡️ Admin' : '👤 Employee'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {isPending ? (
                            <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-xs font-bold flex items-center gap-1 w-fit">
                              <Clock className="w-3.5 h-3.5" /> Pending Approval
                            </span>
                          ) : isSuspended ? (
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200 text-xs font-bold flex items-center gap-1 w-fit">
                              <UserX className="w-3.5 h-3.5" /> Suspended
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 text-xs font-bold flex items-center gap-1 w-fit">
                              <CheckCircle className="w-3.5 h-3.5" /> Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Approve if pending */}
                            {isPending && (
                              <Button
                                variant="primary"
                                size="sm"
                                icon={UserCheck}
                                disabled={processingUid === member.id}
                                onClick={() => handleUpdateStatus(member.id, 'active')}
                                className="text-xs py-1 px-3"
                              >
                                Approve Access
                              </Button>
                            )}

                            {/* Role toggle (cannot toggle self) */}
                            {!isSelf && (
                              <Button
                                variant="secondary"
                                size="sm"
                                disabled={processingUid === member.id}
                                onClick={() =>
                                  handleUpdateRole(
                                    member.id,
                                    member.role === 'admin' ? 'employee' : 'admin'
                                  )
                                }
                                className="text-[11px] py-1 px-2.5"
                              >
                                {member.role === 'admin' ? 'Set as Staff' : 'Promote to Admin'}
                              </Button>
                            )}

                            {/* Suspend / Reactivate */}
                            {!isSelf && (
                              <Button
                                variant={isSuspended ? 'secondary' : 'ghost'}
                                size="sm"
                                disabled={processingUid === member.id}
                                onClick={() =>
                                  handleUpdateStatus(
                                    member.id,
                                    isSuspended ? 'active' : 'suspended'
                                  )
                                }
                                className={`text-[11px] py-1 px-2.5 ${
                                  isSuspended ? 'text-emerald-700' : 'text-rose-600 hover:bg-rose-50'
                                }`}
                              >
                                {isSuspended ? 'Reactivate' : 'Revoke Access'}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
