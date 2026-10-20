import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { formatKolkataDate, isOverdueDate } from '../../utils/dates';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarCheck,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Phone,
  Eye,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Neumorphic Soft UI Follow-Up Queue
 */
export function FollowUpsPage({ viewType = 'today' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [upcomingDays, setUpcomingDays] = useState(7);
  const [assignedFilter, setAssignedFilter] = useState('All');

  // Modals
  const [callingCustomer, setCallingCustomer] = useState(null);
  const [reschedulingTask, setReschedulingTask] = useState(null);

  // Current view configuration
  let pageTitle = "Today's Follow-up Queue";
  let pageIcon = CalendarCheck;
  let pageDesc = 'Calls due today in Kanpur store';

  if (viewType === 'overdue') {
    pageTitle = 'Overdue Follow-up Calls';
    pageIcon = AlertTriangle;
    pageDesc = 'Incomplete tasks whose scheduled callback date has passed';
  } else if (viewType === 'upcoming') {
    pageTitle = 'Upcoming Follow-up Calls';
    pageIcon = CalendarClock;
    pageDesc = 'Tasks scheduled for future customer callbacks';
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

  const displayedTasks = tasks.filter((t) => {
    if (assignedFilter === 'Me') {
      return (
        t.assignedTo &&
        user?.email &&
        t.assignedTo.trim().toLowerCase() === user.email.trim().toLowerCase()
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Follow-up Sub Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-6 p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-accent shrink-0">
            <PageIcon className="w-7 h-7 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
              {pageTitle} ({displayedTasks.length})
            </h2>
            <p className="text-sm font-body text-muted mt-0.5">{pageDesc}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Assignment Filter Switcher */}
          <div className="flex items-center gap-1 p-1 bg-background shadow-neu-pressed rounded-xl">
            <button
              onClick={() => setAssignedFilter('All')}
              className={`px-3 py-1 text-xs font-display font-semibold rounded-lg transition-all ${
                assignedFilter === 'All'
                  ? 'bg-background shadow-neu-flat text-accent font-bold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              👥 All
            </button>
            <button
              onClick={() => setAssignedFilter('Me')}
              className={`px-3 py-1 text-xs font-display font-semibold rounded-lg transition-all ${
                assignedFilter === 'Me'
                  ? 'bg-background shadow-neu-flat text-accent font-bold'
                  : 'text-muted hover:text-foreground'
              }`}
            >
              👤 Assigned to Me
            </button>
          </div>

          {/* View Switcher Inset Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-background shadow-neu-pressed rounded-2xl">
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
                className={`px-3.5 py-1.5 text-xs font-display font-semibold rounded-xl transition-all duration-300 ${
                  location.pathname === tab.path
                    ? 'bg-background shadow-neu-flat text-accent font-bold'
                    : 'text-muted hover:text-foreground hover:shadow-neu-flat-sm'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter range for upcoming */}
      {viewType === 'upcoming' && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-background shadow-neu-flat-sm rounded-2xl text-xs sm:text-sm font-body">
          <span className="font-semibold text-foreground">Show upcoming calls in:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Next 7 Days', days: 7 },
              { label: 'Next 15 Days', days: 15 },
              { label: 'Next 30 Days', days: 30 },
              { label: 'All Future', days: 365 },
            ].map((opt) => (
              <button
                key={opt.days}
                onClick={() => setUpcomingDays(opt.days)}
                className={`px-3 py-1.5 text-xs font-display font-semibold rounded-xl transition-all ${
                  upcomingDays === opt.days
                    ? 'bg-background shadow-neu-pressed text-accent font-bold'
                    : 'bg-background shadow-neu-flat-sm text-muted hover:text-foreground'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="p-6 bg-background shadow-neu-flat rounded-[32px] overflow-hidden">
        {loading ? (
          <div className="py-6">
            <LoadingSkeleton count={4} height="h-16" />
          </div>
        ) : displayedTasks.length === 0 ? (
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
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-body">
              <thead>
                <tr className="border-b border-muted/20 text-xs font-display font-bold uppercase tracking-wider text-muted">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Requirement / Purpose</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-muted/10">
                {displayedTasks.map((task) => {
                  const overdue = isOverdueDate(task.dueDate) && task.status === 'Pending';
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-muted/10 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => task.customerId && navigate(`/leads/${task.customerId}`)}
                          className="font-display font-bold text-base text-foreground hover:text-accent cursor-pointer transition-colors"
                        >
                          {task.customerNameSnapshot}
                        </div>
                        {task.customerCustomId && (
                          <div className="font-mono text-[11px] text-muted">
                            {task.customerCustomId}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={`tel:${task.customerPhoneSnapshot}`}
                          className="font-mono text-xs font-bold text-accent hover:underline block"
                        >
                          📞 {task.customerPhoneSnapshot}
                        </a>
                      </td>
                      <td className="py-3.5 px-4">
                        <LeadCategoryBadge category={task.leadCategory} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-semibold text-xs text-foreground truncate">
                          {task.purpose || 'Follow-up Call'}
                        </div>
                        {task.requirement && (
                          <div className="text-xs text-muted truncate">
                            {task.requirement}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-xs">
                        <span
                          className={
                            overdue
                              ? 'text-danger font-bold bg-background shadow-neu-pressed-sm px-2.5 py-1 rounded-lg'
                              : 'text-foreground'
                          }
                        >
                          {formatKolkataDate(task.dueDate)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <FollowUpStatusBadge status={task.status} />
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
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
                                variant="secondary"
                                onClick={() => setReschedulingTask(task)}
                              >
                                Reschedule
                              </Button>
                              <button
                                onClick={() => handleMarkComplete(task)}
                                className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-emerald-600 transition-all"
                                title="Mark Complete"
                              >
                                <Check className="w-4 h-4 stroke-[2.5]" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => task.customerId && navigate(`/leads/${task.customerId}`)}
                            className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground transition-all"
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
      </div>

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
