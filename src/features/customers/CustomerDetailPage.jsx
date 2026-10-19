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
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';
import {
  Phone,
  PhoneCall,
  Calendar,
  User,
  MapPin,
  FileText,
  History,
  ArrowLeft,
  Edit,
  CalendarClock,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Neumorphic Soft UI Customer Detail Profile
 */
export function CustomerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [customer, setCustomer] = useState(null);
  const [callLogs, setCallLogs] = useState([]);
  const [followUps, setFollowUps] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
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

      // Concurrently fetch calls, follow-ups, and audit history
      const [logs, audits] = await Promise.all([
        getCallLogsByCustomer(id),
        getAuditHistoryByTarget(id),
      ]);
      setCallLogs(logs);
      setAuditLogs(audits);

      // Customer's follow-up tasks
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
      <div className="space-y-6">
        <div className="p-8 bg-background shadow-neu-flat rounded-[32px]">
          <LoadingSkeleton count={3} height="h-28" />
        </div>
      </div>
    );
  }

  if (!customer) return null;

  return (
    <div className="space-y-6 pb-10">
      {/* Back Button */}
      <button
        onClick={() => navigate('/leads')}
        className="inline-flex items-center gap-2 text-sm font-display font-bold text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Leads Database
      </button>

      {/* Customer Profile Banner */}
      <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
                {customer.fullName}
              </h1>
              <span className="font-mono text-xs font-bold bg-background shadow-neu-pressed-sm px-3 py-1 rounded-xl text-muted">
                {customer.customerId || 'GC-CUST'}
              </span>
              <LeadCategoryBadge category={customer.leadCategory} />
              <LeadStatusBadge status={customer.leadStatus} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm font-body text-muted">
              <a
                href={`tel:${customer.phone}`}
                className="flex items-center gap-1.5 font-bold text-accent hover:underline"
              >
                <Phone className="w-4 h-4" /> {customer.phone}
              </a>
              {customer.whatsAppNumber && (
                <span className="text-accent-secondary font-semibold">
                  WA: {customer.whatsAppNumber}
                </span>
              )}
              {customer.city && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-4 h-4 text-muted/70" /> {customer.city}
                </span>
              )}
              {customer.email && (
                <span className="text-muted">
                  ✉️ {customer.email}
                </span>
              )}
            </div>

            {customer.requirement && (
              <div className="mt-3 p-4 bg-background shadow-neu-pressed-sm rounded-2xl text-sm font-body max-w-2xl leading-relaxed">
                <strong className="text-foreground font-semibold">Current Requirement:</strong> {customer.requirement}
                {customer.budget ? ` • Budget: ${formatINR(customer.budget)}` : ''}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              icon={PhoneCall}
              size="md"
              onClick={() => setIsCallModalOpen(true)}
            >
              Log Call
            </Button>
            <Button
              variant="secondary"
              icon={Edit}
              size="md"
              onClick={() => setIsEditModalOpen(true)}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        {/* Next Follow-up info bar */}
        <div className="pt-4 border-t border-muted/20 flex flex-wrap items-center justify-between gap-4 text-xs font-body text-muted">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              <strong className="text-foreground">Assigned:</strong> {customer.assignedTo || 'Unassigned'}
            </span>
            <span>
              <strong className="text-foreground">Created:</strong> {formatKolkataDate(customer.createdAt)}
            </span>
            <span>
              <strong className="text-foreground">Last Call:</strong> {customer.lastCallAt ? formatKolkataDateTime(customer.lastCallAt) : 'Never Called'}
            </span>
          </div>

          <div className="flex items-center gap-2 font-bold text-accent">
            <Calendar className="w-4 h-4" />
            <span>Next Follow-Up: {customer.nextFollowUpDate ? formatKolkataDate(customer.nextFollowUpDate) : 'None scheduled'}</span>
          </div>
        </div>
      </div>

      {/* Neumorphic Segmented Tab Navigation */}
      <div className="p-1.5 bg-background shadow-neu-pressed rounded-2xl flex flex-wrap gap-1.5">
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
              className={`flex items-center gap-2 px-4 py-2.5 font-display font-semibold text-xs sm:text-sm rounded-xl transition-all duration-300 ${
                isActive
                  ? 'bg-background shadow-neu-flat text-accent font-bold'
                  : 'text-muted hover:text-foreground hover:shadow-neu-flat-sm'
              }`}
            >
              <Icon className="w-4 h-4 stroke-[2]" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] space-y-4">
            <h3 className="text-xl font-display font-bold text-foreground border-b border-muted/20 pb-3">
              Customer Information
            </h3>
            <div className="space-y-3 text-sm font-body">
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Full Name</span>
                <span className="font-semibold text-foreground">{customer.fullName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Primary Phone</span>
                <span className="font-mono font-bold text-foreground">{customer.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Alternate Phone</span>
                <span className="font-mono text-foreground">{customer.alternatePhone || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">WhatsApp</span>
                <span className="font-mono text-foreground">{customer.whatsAppNumber || customer.phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Email</span>
                <span className="text-foreground">{customer.email || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">City / Address</span>
                <span className="text-foreground">{customer.address ? `${customer.address}, ${customer.city}` : customer.city || 'Kanpur'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Lead Source</span>
                <span className="font-bold text-accent">{customer.source || 'Walk-in Store'}</span>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] space-y-4">
            <h3 className="text-xl font-display font-bold text-foreground border-b border-muted/20 pb-3">
              Requirement & Commercials
            </h3>
            <div className="space-y-3 text-sm font-body">
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Product Category</span>
                <span className="font-semibold text-foreground">{customer.interest || 'Computer & Laptops'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Requirement Details</span>
                <span className="font-medium text-right max-w-xs text-foreground">{customer.requirement || 'General inquiry'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Estimated Budget</span>
                <span className="font-mono font-bold text-base text-accent-secondary">{formatINR(customer.budget)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Lead Classification</span>
                <LeadCategoryBadge category={customer.leadCategory} size="sm" />
              </div>
              <div className="flex justify-between py-1 border-b border-muted/10">
                <span className="text-muted">Current Status</span>
                <LeadStatusBadge status={customer.leadStatus} size="sm" />
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Latest Feedback</span>
                <span className="text-right italic max-w-xs text-xs text-foreground/80">{customer.latestFeedback || 'No feedback yet'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Call History Timeline */}
      {activeTab === 'calls' && (
        <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-muted/20">
            <div>
              <h3 className="text-xl font-display font-bold text-foreground">
                Customer Call History Timeline
              </h3>
              <p className="text-xs font-body text-muted">
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
            <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-muted/30">
              {callLogs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Timeline Inset Dot */}
                  <div className="absolute -left-6 top-1.5 w-6 h-6 rounded-full bg-background shadow-neu-pressed flex items-center justify-center text-[10px] text-accent">
                    📞
                  </div>

                  {/* Call Card */}
                  <div className="p-5 bg-background shadow-neu-flat-sm rounded-2xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-muted/15">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-sm text-foreground">
                          Outcome: {log.callOutcome}
                        </span>
                        {log.callDuration && (
                          <span className="text-xs bg-background shadow-neu-pressed-sm px-2.5 py-0.5 rounded-lg text-muted">
                            ⏱ {log.callDuration}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-body text-muted flex items-center gap-2">
                        <span>👤 {log.employeeName || log.employeeEmail}</span>
                        <span>•</span>
                        <span>{formatKolkataDateTime(log.callAt || log.createdAt)}</span>
                      </div>
                    </div>

                    {/* Feedback */}
                    {log.feedback && (
                      <div className="text-sm font-body text-foreground bg-background shadow-neu-pressed-sm p-3 rounded-xl">
                        <span className="font-bold text-xs text-muted block mb-0.5 uppercase tracking-wider">Customer Feedback:</span>
                        "{log.feedback}"
                      </div>
                    )}

                    {/* Category change & Next action */}
                    <div className="flex flex-wrap items-center gap-4 text-xs font-body pt-1">
                      {log.previousLeadCategory && log.newLeadCategory && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted">Category:</span>
                          <span className="line-through text-muted/60">{log.previousLeadCategory}</span>
                          <span>→</span>
                          <LeadCategoryBadge category={log.newLeadCategory} size="sm" />
                        </div>
                      )}

                      {log.nextFollowUpDate && (
                        <div className="flex items-center gap-1.5 font-bold text-accent">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Scheduled Callback: {formatKolkataDate(log.nextFollowUpDate)}</span>
                        </div>
                      )}

                      {log.nextAction && (
                        <div className="text-muted italic">
                          Next Action: {log.nextAction}
                        </div>
                      )}
                    </div>

                    {log.notes && (
                      <div className="text-xs text-muted bg-background shadow-neu-pressed-sm p-2.5 rounded-xl">
                        <strong className="text-foreground">Internal Note:</strong> {log.notes}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Follow-up Schedule */}
      {activeTab === 'followups' && (
        <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-muted/20">
            <h3 className="text-xl font-display font-bold text-foreground">
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
            <div className="space-y-4">
              {followUps.map((task) => (
                <div
                  key={task.id}
                  className="p-5 bg-background shadow-neu-flat-sm rounded-2xl flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-display font-bold text-base text-foreground">
                        {task.purpose || 'Follow-up Task'}
                      </span>
                      <FollowUpStatusBadge status={task.status} />
                    </div>
                    <div className="text-xs font-body text-muted flex items-center gap-3">
                      <span className="font-bold text-accent">
                        📅 Due Date: {formatKolkataDate(task.dueDate)}
                      </span>
                      <span>Assigned: {task.assignedTo || 'Executive'}</span>
                    </div>

                    {/* Reschedule History if any */}
                    {task.rescheduleHistory && task.rescheduleHistory.length > 0 && (
                      <div className="mt-2 text-xs bg-background shadow-neu-pressed-sm p-3 rounded-xl space-y-1">
                        <span className="font-bold text-foreground block">Reschedule History:</span>
                        {task.rescheduleHistory.map((hist, idx) => (
                          <div key={idx} className="text-muted text-[11px]">
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
                        variant="secondary"
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
        </div>
      )}

      {/* Tab 4: Notes & Preferences */}
      {activeTab === 'notes' && (
        <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] space-y-4">
          <h3 className="text-xl font-display font-bold text-foreground border-b border-muted/20 pb-3">
            Internal Team Notes
          </h3>
          <div className="p-5 bg-background shadow-neu-pressed rounded-2xl font-body text-sm text-foreground min-h-[140px] whitespace-pre-wrap leading-relaxed">
            {customer.internalNotes || 'No special internal notes recorded for this customer yet.'}
          </div>
        </div>
      )}

      {/* Tab 5: Audit History */}
      {activeTab === 'audit' && (
        <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] space-y-4">
          <h3 className="text-xl font-display font-bold text-foreground border-b border-muted/20 pb-3">
            Audit Trail
          </h3>
          {auditLogs.length === 0 ? (
            <p className="text-sm font-body text-muted py-4">No audit log records for this customer.</p>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.map((audit) => (
                <div
                  key={audit.id}
                  className="p-3 bg-background shadow-neu-pressed-sm rounded-xl text-xs font-body flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-accent">{audit.action}</span> by{' '}
                    <span className="font-semibold text-foreground">{audit.actorName || audit.actorEmail}</span>
                  </div>
                  <span className="text-muted">
                    {formatKolkataDateTime(audit.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
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
