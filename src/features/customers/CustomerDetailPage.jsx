import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LeadCategoryBadge, LeadStatusBadge, FollowUpStatusBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CallModal } from '../calls/CallModal';
import { EditCustomerModal } from './EditCustomerModal';
import { RescheduleModal } from '../followups/RescheduleModal';
import { getCustomerById } from '../../services/customerService';
import { getCallLogsByCustomer } from '../../services/callService';
import { getAuditHistoryByTarget } from '../../services/auditService';
import { formatKolkataDate, formatKolkataDateTime, formatINR } from '../../utils/dates';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Phone,
  PhoneCall,
  Calendar,
  Clock,
  User,
  MapPin,
  Tag,
  DollarSign,
  FileText,
  History,
  ShieldAlert,
  ArrowLeft,
  Edit,
  Plus,
  CalendarClock,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'calls' | 'followups' | 'notes' | 'audit'
  const [loading, setLoading] = useState(true);

  // Modals
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [activeRescheduleTask, setActiveRescheduleTask] = useState(null);

  const fetchCustomerDetails = async () => {
    setLoading(true);
    try {
      const cust = await getCustomerById(id);
      if (!cust) {
        toast.error('Customer not found');
        navigate('/leads');
        return;
      }
      setCustomer(cust);

      // Fetch calls, follow-ups, and audit history concurrently
      const [logs, audits] = await Promise.all([
        getCallLogsByCustomer(id),
        getAuditHistoryByTarget(id),
      ]);
      setCallLogs(logs);
      setAuditLogs(audits);

      // Fetch customer's follow-up tasks
      try {
        const q = query(
          collection(db, 'followUps'),
          where('customerId', '==', id)
        );
        const fSnap = await getDocs(q);
        const fTasks = fSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setFollowUps(fTasks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      } catch (fErr) {
        console.warn('Error fetching follow-ups for customer:', fErr);
      }
    } catch (err) {
      console.error('Error fetching customer profile:', err);
      toast.error('Failed to load customer: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCustomerDetails();
  }, [id]);

  if (loading && !customer) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton count={3} height="h-28" />
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-5">
      {/* Back Button */}
      <button
        onClick={() => navigate('/leads')}
        className="inline-flex items-center gap-1.5 text-sm font-heading font-bold text-foreground hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Leads Database
      </button>

      {/* Customer Profile Banner */}
      <Card className="border-2 border-border p-6 relative overflow-hidden" tape={true}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-3xl font-heading font-bold text-foreground">
                {customer.fullName}
              </h1>
              <span className="font-mono text-xs font-bold bg-muted px-2.5 py-1 rounded border border-border">
                {customer.customerId || 'GC-CUST'}
              </span>
              <LeadCategoryBadge category={customer.leadCategory} />
              <LeadStatusBadge status={customer.leadStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-body text-foreground/80 mt-2">
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-1 font-bold text-secondary-accent hover:underline"
              >
                <Phone className="w-4 h-4" /> {customer.phone}
              </a>
              {customer.whatsAppNumber && (
                <span className="text-emerald-700 font-bold">
                  WA: {customer.whatsAppNumber}
                </span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-foreground/60" /> {customer.city}
                </span>
              )}
              {customer.email && (
                <span className="text-foreground/70">
                  ✉️ {customer.email}
                </span>
              )}
            </div>

            {customer.requirement && (
              <div className="mt-3 p-2 bg-sticky-yellow border border-border/60 rounded-md text-sm font-body max-w-2xl">
                <strong>Current Requirement:</strong> {customer.requirement}
                {customer.budget ? ` • Budget: ${formatINR(customer.budget)}` : ''}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              icon={PhoneCall}
              onClick={() => setIsCallModalOpen(true)}
            >
              Log Call
            </Button>
            <Button
              variant="muted"
              icon={Edit}
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Next Follow-up info bar */}
        <div className="mt-5 pt-3 border-t-2 border-dashed border-border/40 flex flex-wrap items-center justify-between gap-3 text-xs font-body">
          <div className="flex items-center gap-4">
            <span>
              <strong>Assigned To:</strong> {customer.assignedTo || 'Unassigned'}
            </span>
            <span>
              <strong>Created:</strong> {formatKolkataDate(customer.createdAt)}
            </span>
            <span>
              <strong>Last Call:</strong> {customer.lastCallAt ? formatKolkataDateTime(customer.lastCallAt) : 'Never Called'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-bold text-secondary-accent">
            <Calendar className="w-4 h-4" />
            <span>Next Follow-Up: {customer.nextFollowUpDate ? formatKolkataDate(customer.nextFollowUpDate) : 'None scheduled'}</span>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap border-b-2 border-border gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'calls', label: `Call History (${callLogs.length})`, icon: PhoneCall },
          { id: 'followups', label: `Follow-up Tasks (${followUps.length})`, icon: CalendarClock },
          { id: 'notes', label: 'Notes & Preferences', icon: FileText },
          { id: 'audit', label: `Audit Log (${auditLogs.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-heading font-bold text-sm border-t-2 border-l-2 border-r-2 rounded-t-lg transition-all ${
                isActive
                  ? 'bg-paper-white border-border text-foreground shadow-hand-sm -mb-[2px] z-10'
                  : 'bg-stone-100 border-transparent text-foreground/60 hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Card className="border-2 border-border space-y-3">
            <h3 className="text-xl font-heading font-bold text-foreground border-b border-border/30 pb-2">
              Customer Information
            </h3>
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Full Name</span>
                <span className="font-bold">{customer.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Primary Phone</span>
                <span className="font-mono font-bold">{customer.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Alternate Phone</span>
                <span className="font-mono">{customer.alternatePhone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">WhatsApp</span>
                <span className="font-mono">{customer.whatsAppNumber || customer.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Email</span>
                <span>{customer.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">City / Address</span>
                <span>{customer.address ? `${customer.address}, ${customer.city}` : customer.city || 'Kanpur'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-foreground/60">Lead Source</span>
                <span className="font-bold text-secondary-accent">{customer.source || 'Walk-in Store'}</span>
              </div>
            </div>
          </Card>

          <Card className="border-2 border-border space-y-3">
            <h3 className="text-xl font-heading font-bold text-foreground border-b border-border/30 pb-2">
              Requirement & Commercials
            </h3>
            <div className="space-y-2 text-sm font-body">
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Product Category</span>
                <span className="font-bold">{customer.interest || 'Computer & Laptops'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Requirement Details</span>
                <span className="font-medium text-right max-w-xs">{customer.requirement || 'General inquiry'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Estimated Budget</span>
                <span className="font-mono font-bold text-base text-emerald-800">{formatINR(customer.budget)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Lead Classification</span>
                <LeadCategoryBadge category={customer.leadCategory} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-dashed border-border/20">
                <span className="text-foreground/60">Current Status</span>
                <LeadStatusBadge status={customer.leadStatus} size="sm" />
              </div>
              <div className="flex justify-between py-1">
                <span className="text-foreground/60">Latest Feedback</span>
                <span className="text-right italic max-w-xs text-xs">{customer.latestFeedback || 'No feedback yet'}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Call History Timeline (Permanent & Unaltered) */}
      {activeTab === 'calls' && (
        <Card className="border-2 border-border p-6 bg-paper-white">
          <div className="flex items-center justify-between border-b-2 border-dashed border-border/40 pb-3 mb-6">
            <div>
              <h3 className="text-xl font-heading font-bold text-foreground">
                Customer Call History Timeline
              </h3>
              <p className="text-xs font-body text-foreground/70">
                Permanent chronological record of every call attempt and customer conversation
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={PhoneCall}
              onClick={() => setIsCallModalOpen(true)}
            >
              Log New Call
            </Button>
          </div>

          {callLogs.length === 0 ? (
            <EmptyState
              title="No calls recorded yet"
              description="No phone conversations have been logged for this customer. Click below to record your first call."
              actionText="Record First Call"
              onAction={() => setIsCallModalOpen(true)}
              icon={PhoneCall}
            />
          ) : (
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:border-l-2 before:border-dashed before:border-border/60">
              {callLogs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-sticky-yellow border-2 border-border shadow-hand-sm flex items-center justify-center text-[10px]">
                    📞
                  </div>

                  {/* Call Card */}
                  <div className="p-4 bg-stone-50 border-2 border-border rounded-lg shadow-hand-sm space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-heading font-bold text-base text-foreground">
                          Outcome: {log.callOutcome}
                        </span>
                        {log.callDuration && (
                          <span className="text-xs bg-white px-2 py-0.5 rounded border border-border/40">
                            ⏱ {log.callDuration}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-body text-foreground/70 flex items-center gap-2">
                        <span>👤 {log.employeeName || log.employeeEmail}</span>
                        <span>•</span>
                        <span>{formatKolkataDateTime(log.callAt || log.createdAt)}</span>
                      </div>
                    </div>

                    {/* Feedback */}
                    {log.feedback && (
                      <div className="text-sm font-body text-foreground bg-white p-2.5 rounded border border-border/40">
                        <span className="font-bold text-xs text-foreground/60 block mb-0.5">Customer Feedback:</span>
                        "{log.feedback}"
                      </div>
                    )}

                    {/* Category change & Next action */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-body pt-1">
                      {log.previousLeadCategory && log.newLeadCategory && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-foreground/60">Category:</span>
                          <span className="line-through text-foreground/50">{log.previousLeadCategory}</span>
                          <span>→</span>
                          <LeadCategoryBadge category={log.newLeadCategory} size="sm" />
                        </div>
                      )}

                      {log.nextFollowUpDate && (
                        <div className="flex items-center gap-1 font-bold text-secondary-accent">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Scheduled Callback: {formatKolkataDate(log.nextFollowUpDate)}</span>
                        </div>
                      )}

                      {log.nextAction && (
                        <div className="text-foreground/80 italic">
                          Next Action: {log.nextAction}
                        </div>
                      )}
                    </div>

                    {log.notes && (
                      <div className="text-xs text-foreground/60 bg-amber-50/50 p-2 rounded border border-amber-200">
                        <strong>Internal Note:</strong> {log.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 3: Follow-up Schedule */}
      {activeTab === 'followups' && (
        <Card className="border-2 border-border p-6">
          <div className="flex items-center justify-between border-b-2 border-dashed border-border/40 pb-3 mb-4">
            <h3 className="text-xl font-heading font-bold text-foreground">
              Follow-up Schedule & Tasks
            </h3>
          </div>

          {followUps.length === 0 ? (
            <EmptyState
              title="No follow-up tasks"
              description="No follow-up tasks currently recorded for this customer."
              actionText="Log Call to Schedule"
              onAction={() => setIsCallModalOpen(true)}
              icon={Calendar}
            />
          ) : (
            <div className="space-y-3">
              {followUps.map((task) => (
                <div
                  key={task.id}
                  className="p-3.5 bg-paper-white border-2 border-border rounded-lg shadow-hand-sm flex flex-wrap items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-bold text-base text-foreground">
                        {task.purpose || 'Follow-up Task'}
                      </span>
                      <FollowUpStatusBadge status={task.status} />
                    </div>
                    <div className="text-xs font-body text-foreground/80 mt-1 flex items-center gap-3">
                      <span className="font-bold text-secondary-accent">
                        📅 Due Date: {formatKolkataDate(task.dueDate)}
                      </span>
                      <span>Assigned: {task.assignedTo || 'Executive'}</span>
                    </div>

                    {/* Reschedule History if any */}
                    {task.rescheduleHistory && task.rescheduleHistory.length > 0 && (
                      <div className="mt-2 text-xs bg-amber-50 p-2 rounded border border-amber-300 space-y-1">
                        <span className="font-bold text-amber-900 block">Reschedule History:</span>
                        {task.rescheduleHistory.map((hist, idx) => (
                          <div key={idx} className="text-amber-800 text-[11px]">
                            • Moved from <strong>{formatKolkataDate(hist.oldDueDate)}</strong> to{' '}
                            <strong>{formatKolkataDate(hist.newDueDate)}</strong>: "{hist.reason}"
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {task.status === 'Pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => setIsCallModalOpen(true)}
                      >
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="muted"
                        onClick={() => setActiveRescheduleTask(task)}
                      >
                        Reschedule
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Tab 4: Notes & Preferences */}
      {activeTab === 'notes' && (
        <Card className="border-2 border-border p-6">
          <h3 className="text-xl font-heading font-bold text-foreground border-b border-border/30 pb-2 mb-3">
            Internal Team Notes
          </h3>
          <div className="p-4 bg-sticky-yellow border-2 border-border rounded-lg font-body text-base text-foreground min-h-[140px] whitespace-pre-wrap">
            {customer.internalNotes || 'No special internal notes recorded for this customer yet.'}
          </div>
        </Card>
      )}

      {/* Tab 5: Audit History */}
      {activeTab === 'audit' && (
        <Card className="border-2 border-border p-6">
          <h3 className="text-xl font-heading font-bold text-foreground border-b border-border/30 pb-2 mb-4">
            Audit Trail
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-xs text-foreground/60">No audit log records for this customer.</p>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((audit) => (
                <div
                  key={audit.id}
                  className="p-2.5 bg-stone-50 border border-border/40 rounded text-xs font-body flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-secondary-accent">{audit.action}</span> by{' '}
                    <span className="font-bold">{audit.actorName || audit.actorEmail}</span>
                  </div>
                  <span className="text-foreground/60">
                    {formatKolkataDateTime(audit.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Modals */}
      <CallModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        customer={customer}
        onCallLogged={fetchCustomerDetails}
      />

      <EditCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        customer={customer}
        onCustomerUpdated={fetchCustomerDetails}
      />

      <RescheduleModal
        isOpen={Boolean(activeRescheduleTask)}
        onClose={() => setActiveRescheduleTask(null)}
        followUp={activeRescheduleTask}
        onRescheduled={fetchCustomerDetails}
      />
    </div>
  );
}
