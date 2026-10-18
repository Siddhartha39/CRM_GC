import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LeadCategoryBadge, FollowUpStatusBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CallModal } from '../calls/CallModal';
import { RescheduleModal } from './RescheduleModal';
import {
  getTodayFollowUps,
  getOverdueFollowUps,
  getUpcomingFollowUps,
  getCompletedFollowUps,
  completeFollowUp,
} from '../../services/followUpService';
import { formatKolkataDate, getKolkataTodayString, isOverdueDate } from '../../utils/dates';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarCheck,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Calendar,
  Phone,
  RefreshCw,
  Eye,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

export function FollowUpsPage({ viewType = 'today' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [upcomingDays, setUpcomingDays] = useState(7);

  // Modals
  const [callingCustomer, setCallingCustomer] = useState(null);
  const [reschedulingTask, setReschedulingTask] = useState(null);

  // Current view configuration
  let pageTitle = "Today's Follow-up Queue";
  let pageIcon = CalendarCheck;
  let pageDesc = 'Calls due today in Kanpur store';

  if (viewType === 'overdue') {
    pageTitle = '⚠️ Overdue Follow-up Calls';
    pageIcon = AlertTriangle;
    pageDesc = 'Incomplete tasks whose scheduled date has passed';
  } else if (viewType === 'upcoming') {
    pageTitle = 'Upcoming Follow-up Calls';
    pageIcon = CalendarClock;
    pageDesc = 'Tasks scheduled for future callbacks';
  } else if (viewType === 'completed') {
    pageTitle = 'Completed Follow-up Tasks';
    pageIcon = CheckCircle2;
    pageDesc = 'Archive of successfully completed follow-up calls';
  }

  const PageIcon = pageIcon;

  const fetchTasks = async () => {
    setLoading(true);
    try {
      let data = [];
      if (viewType === 'today') {
        data = await getTodayFollowUps();
      } else if (viewType === 'overdue') {
        data = await getOverdueFollowUps();
      } else if (viewType === 'upcoming') {
        data = await getUpcomingFollowUps(upcomingDays);
      } else if (viewType === 'completed') {
        data = await getCompletedFollowUps();
      }
      setTasks(data);
    } catch (err) {
      console.error('Error fetching follow-ups:', err);
      toast.error('Failed to load tasks: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [viewType, upcomingDays]);

  const handleMarkComplete = async (task) => {
    try {
      await completeFollowUp(task.id, 'Marked complete by executive', user);
      toast.success(`Task for ${task.customerNameSnapshot} completed!`);
      fetchTasks();
    } catch (err) {
      toast.error('Failed to complete task: ' + err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Follow-up Sub Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-paper-white card-hand border-2 border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sticky-yellow border-2 border-border rounded-lg shadow-hand-sm">
            <PageIcon className="w-6 h-6 text-foreground stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              {pageTitle} ({tasks.length})
            </h2>
            <p className="text-sm font-body text-foreground/70">{pageDesc}</p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1 rounded-lg border border-border">
          {[
            { id: 'today', label: "Today", path: '/followups/today' },
            { id: 'overdue', label: 'Overdue', path: '/followups/overdue' },
            { id: 'upcoming', label: 'Upcoming', path: '/followups/upcoming' },
            { id: 'completed', label: 'Completed', path: '/followups/completed' },
            { id: 'calendar', label: 'Calendar View', path: '/followups/calendar' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`px-3 py-1 text-xs font-heading font-bold rounded border transition-all ${
                location.pathname === tab.path
                  ? 'bg-paper-white border-border shadow-hand-sm text-foreground'
                  : 'border-transparent text-foreground/70 hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter range for upcoming */}
      {viewType === 'upcoming' && (
        <div className="flex items-center gap-2 p-3 bg-paper-white border-2 border-border rounded-lg text-sm font-body">
          <span className="font-bold">Show upcoming calls in next:</span>
          {[
            { label: 'Next 7 Days', days: 7 },
            { label: 'Next 15 Days', days: 15 },
            { label: 'Next 30 Days', days: 30 },
            { label: 'All Future', days: 365 },
          ].map((opt) => (
            <button
              key={opt.days}
              onClick={() => setUpcomingDays(opt.days)}
              className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                upcomingDays === opt.days
                  ? 'bg-secondary-accent text-white font-bold border-secondary-accent'
                  : 'bg-stone-50 border-border/50 text-foreground'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Task List */}
      <Card className="border-2 border-border p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={4} height="h-16" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={`No ${viewType} follow-ups`}
              description={
                viewType === 'today'
                  ? 'Great job! You have completed all follow-up calls scheduled for today.'
                  : viewType === 'overdue'
                  ? 'No overdue calls pending! Your pipeline is clean.'
                  : 'No tasks found in this follow-up queue.'
              }
              actionText={viewType !== 'today' ? "Go to Today's Follow-ups" : 'View Leads'}
              onAction={() => navigate(viewType !== 'today' ? '/followups/today' : '/leads')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-body">
              <thead className="bg-stone-100 border-b-2 border-border text-xs font-heading font-bold text-foreground">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Lead Category</th>
                  <th className="py-3 px-4">Requirement / Purpose</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 bg-paper-white">
                {tasks.map((task) => {
                  const overdue = isOverdueDate(task.dueDate) && task.status === 'Pending';
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-stone-50 transition-colors ${
                        overdue ? 'bg-red-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div
                          onClick={() => task.customerId && navigate(`/leads/${task.customerId}`)}
                          className="font-heading font-bold text-base text-secondary-accent hover:underline cursor-pointer"
                        >
                          {task.customerNameSnapshot}
                        </div>
                        {task.customerCustomId && (
                          <div className="font-mono text-[11px] text-foreground/60">
                            {task.customerCustomId}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <a
                          href={`tel:${task.customerPhoneSnapshot}`}
                          className="font-mono text-xs font-bold text-foreground hover:underline block"
                        >
                          📞 {task.customerPhoneSnapshot}
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <LeadCategoryBadge category={task.leadCategory} size="sm" />
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-xs text-foreground truncate">
                          {task.purpose || 'Follow-up Call'}
                        </div>
                        {task.requirement && (
                          <div className="text-xs text-foreground/60 truncate">
                            {task.requirement}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-xs">
                        <span
                          className={
                            overdue
                              ? 'text-danger font-bold bg-red-100 px-2 py-0.5 rounded border border-danger/40'
                              : 'text-foreground'
                          }
                        >
                          {formatKolkataDate(task.dueDate)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <FollowUpStatusBadge status={task.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {task.status === 'Pending' && (
                            <>
                              <Button
                                size="sm"
                                variant="primary"
                                icon={Phone}
                                onClick={() =>
                                  setCallingCustomer({
                                    id: task.customerId,
                                    customerId: task.customerCustomId,
                                    fullName: task.customerNameSnapshot,
                                    phone: task.customerPhoneSnapshot,
                                    leadCategory: task.leadCategory,
                                    requirement: task.requirement,
                                  })
                                }
                              >
                                Call
                              </Button>
                              <Button
                                size="sm"
                                variant="muted"
                                onClick={() => setReschedulingTask(task)}
                              >
                                Reschedule
                              </Button>
                              <button
                                onClick={() => handleMarkComplete(task)}
                                className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded border border-emerald-600 transition-colors"
                                title="Mark Complete"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => task.customerId && navigate(`/leads/${task.customerId}`)}
                            className="p-1.5 rounded border border-border/50 hover:bg-stone-100 text-foreground transition-colors"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modals */}
      <CallModal
        isOpen={Boolean(callingCustomer)}
        onClose={() => setCallingCustomer(null)}
        customer={callingCustomer}
        onCallLogged={fetchTasks}
      />

      <RescheduleModal
        isOpen={Boolean(reschedulingTask)}
        onClose={() => setReschedulingTask(null)}
        followUp={reschedulingTask}
        onRescheduled={fetchTasks}
      />
    </div>
  );
}
