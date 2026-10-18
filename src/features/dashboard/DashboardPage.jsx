import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LeadCategoryBadge, LeadStatusBadge, FollowUpStatusBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CallModal } from '../calls/CallModal';
import { RescheduleModal } from '../followups/RescheduleModal';
import { getDashboardMetrics } from '../../services/dashboardService';
import { getTodayFollowUps, getOverdueFollowUps, completeFollowUp } from '../../services/followUpService';
import { formatKolkataDate, formatKolkataDateTime, formatINR } from '../../utils/dates';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Flame,
  Zap,
  Snowflake,
  CalendarCheck,
  AlertTriangle,
  PhoneCall,
  Award,
  ArrowRight,
  Phone,
  RefreshCw,
  PlusCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { onOpenAddCustomer } = useOutletContext() || {};

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);
  const [todayFollowUps, setTodayFollowUps] = useState([]);
  const [overdueFollowUps, setOverdueFollowUps] = useState([]);

  // Modals
  const [activeCallCustomer, setActiveCallCustomer] = useState(null);
  const [activeRescheduleTask, setActiveRescheduleTask] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashData, todayList, overdueList] = await Promise.all([
        getDashboardMetrics(),
        getTodayFollowUps(),
        getOverdueFollowUps(),
      ]);
      setMetrics(dashData);
      setTodayFollowUps(todayList);
      setOverdueFollowUps(overdueList);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleCustAdded = () => loadData();
    window.addEventListener('crm-customer-added', handleCustAdded);
    return () => window.removeEventListener('crm-customer-added', handleCustAdded);
  }, []);

  const handleCompleteTask = async (taskId, customerName) => {
    try {
      await completeFollowUp(taskId, 'Completed from Dashboard', user);
      toast.success(`Follow-up with ${customerName} marked complete!`);
      loadData();
    } catch (err) {
      toast.error('Failed to complete task: ' + err.message);
    }
  };

  if (loading && !metrics) {
    return (
      <div className="space-y-6">
        <div className="p-4 bg-white border-2 border-border card-hand">
          <LoadingSkeleton count={4} height="h-20" />
        </div>
      </div>
    );
  }

  const { stats, leadDistributionData, leadStatusData, recentCustomers, recentCalls } = metrics || {
    stats: {},
    leadDistributionData: [],
    leadStatusData: [],
    recentCustomers: [],
    recentCalls: [],
  };

  return (
    <div className="space-y-6">
      {/* Welcome & Shop Status Banner */}
      <div className="p-5 bg-paper-white card-hand relative overflow-hidden border-2 border-border flex flex-wrap items-center justify-between gap-4">
        <div className="washi-tape" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Namaste, {user?.displayName || user?.email?.split('@')[0]}! 🙏
            </h2>
            <span className="text-xs bg-sticky-yellow border border-border px-2 py-0.5 rounded font-bold font-body">
              Kanpur Store
            </span>
          </div>
          <p className="text-base font-body text-foreground/80 mt-1">
            Welcome to Galaxy Computers Calling & Follow-up Desk. You have{' '}
            <strong className="text-secondary-accent">{stats.todayFollowUps || 0} calls</strong> due today
            {stats.overdueFollowUps > 0 && (
              <span className="text-danger font-bold ml-1">
                and {stats.overdueFollowUps} overdue calls requiring immediate attention!
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="muted" icon={RefreshCw} size="sm" onClick={loadData}>
            Refresh
          </Button>
          <Button variant="primary" icon={PlusCircle} size="sm" onClick={onOpenAddCustomer}>
            Add Lead
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <Card
          onClick={() => navigate('/leads')}
          className="cursor-pointer hover:bg-stone-50 transition-all border-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-foreground/70">Total Leads</span>
            <div className="p-2 bg-stone-100 rounded-lg border border-border/50">
              <Users className="w-5 h-5 text-foreground" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-foreground mt-2">
            {stats.totalLeads || 0}
          </div>
          <div className="text-xs font-body text-secondary-accent flex items-center gap-1 mt-1 font-bold">
            <span>View All Leads</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Hot Leads */}
        <Card
          onClick={() => navigate('/leads/hot')}
          className="cursor-pointer hover:bg-red-50/50 transition-all border-accent"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-danger">Hot Leads</span>
            <div className="p-2 bg-red-100 rounded-lg border border-danger/40">
              <Flame className="w-5 h-5 text-accent" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-accent mt-2">
            {stats.hotLeads || 0}
          </div>
          <div className="text-xs font-body text-danger flex items-center gap-1 mt-1 font-bold">
            <span>Immediate Requirement</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Warm Leads */}
        <Card
          onClick={() => navigate('/leads/warm')}
          className="cursor-pointer hover:bg-amber-50/50 transition-all border-warning"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-warning">Warm Leads</span>
            <div className="p-2 bg-amber-100 rounded-lg border border-warning/40">
              <Zap className="w-5 h-5 text-warning" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-warning mt-2">
            {stats.warmLeads || 0}
          </div>
          <div className="text-xs font-body text-warning flex items-center gap-1 mt-1 font-bold">
            <span>Needs Evaluation</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Cold Leads */}
        <Card
          onClick={() => navigate('/leads/cold')}
          className="cursor-pointer hover:bg-blue-50/50 transition-all border-secondary-accent"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-secondary-accent">Cold Leads</span>
            <div className="p-2 bg-blue-100 rounded-lg border border-secondary-accent/40">
              <Snowflake className="w-5 h-5 text-secondary-accent" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-secondary-accent mt-2">
            {stats.coldLeads || 0}
          </div>
          <div className="text-xs font-body text-secondary-accent flex items-center gap-1 mt-1 font-bold">
            <span>Future Prospects</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Today's Follow-ups */}
        <Card
          onClick={() => navigate('/followups/today')}
          className="cursor-pointer hover:bg-emerald-50/50 transition-all border-emerald-600"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-emerald-800">Today's Calls</span>
            <div className="p-2 bg-emerald-100 rounded-lg border border-emerald-600/40">
              <CalendarCheck className="w-5 h-5 text-emerald-700" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-emerald-800 mt-2">
            {stats.todayFollowUps || 0}
          </div>
          <div className="text-xs font-body text-emerald-800 flex items-center gap-1 mt-1 font-bold">
            <span>Due Today in Kanpur</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Overdue Follow-ups */}
        <Card
          onClick={() => navigate('/followups/overdue')}
          className={`cursor-pointer hover:bg-red-50 transition-all ${
            stats.overdueFollowUps > 0 ? 'bg-red-50/60 border-2 border-danger' : 'border-border'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-danger">Overdue Calls</span>
            <div className="p-2 bg-red-100 rounded-lg border border-danger">
              <AlertTriangle className="w-5 h-5 text-danger animate-pulse" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-danger mt-2">
            {stats.overdueFollowUps || 0}
          </div>
          <div className="text-xs font-body text-danger flex items-center gap-1 mt-1 font-bold">
            <span>Past Due Tasks</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Calls Logged Today */}
        <Card
          onClick={() => navigate('/calls')}
          className="cursor-pointer hover:bg-stone-50 transition-all border-border"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-foreground/70">Calls Logged Today</span>
            <div className="p-2 bg-stone-100 rounded-lg border border-border/50">
              <PhoneCall className="w-5 h-5 text-foreground" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-foreground mt-2">
            {stats.callsToday || 0}
          </div>
          <div className="text-xs font-body text-secondary-accent flex items-center gap-1 mt-1 font-bold">
            <span>View Call History</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>

        {/* Converted Leads */}
        <Card
          onClick={() => navigate('/leads?status=Converted')}
          className="cursor-pointer hover:bg-amber-50/50 transition-all border-amber-500"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-heading font-bold text-amber-900">Converted Sales</span>
            <div className="p-2 bg-sticky-yellow rounded-lg border border-amber-600/40">
              <Award className="w-5 h-5 text-amber-800" />
            </div>
          </div>
          <div className="text-3xl font-heading font-bold text-amber-900 mt-2">
            {stats.convertedLeads || 0}
          </div>
          <div className="text-xs font-body text-amber-900 flex items-center gap-1 mt-1 font-bold">
            <span>Won Deals 🎉</span> <ArrowRight className="w-3 h-3" />
          </div>
        </Card>
      </div>

      {/* Main Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Today's Follow-up Queue */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Follow-ups Card */}
          <Card className="border-2 border-border">
            <div className="flex items-center justify-between border-b-2 border-dashed border-border/40 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CalendarCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-xl font-heading font-bold text-foreground">
                  Today's Calling Queue ({todayFollowUps.length})
                </h3>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/followups/today')}
              >
                View Full Queue
              </Button>
            </div>

            {todayFollowUps.length === 0 ? (
              <EmptyState
                title="All caught up for today!"
                description="No follow-up calls scheduled for today. Check upcoming follow-ups or call new leads."
                actionText="View Upcoming Calls"
                onAction={() => navigate('/followups/upcoming')}
              />
            ) : (
              <div className="space-y-3">
                {todayFollowUps.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-3.5 bg-paper-white border-2 border-border rounded-lg shadow-hand-sm flex flex-wrap items-center justify-between gap-3 hover:bg-stone-50 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          onClick={() => task.customerId && navigate(`/leads/${task.customerId}`)}
                          className="font-heading font-bold text-base text-foreground hover:underline cursor-pointer"
                        >
                          {task.customerNameSnapshot}
                        </span>
                        <LeadCategoryBadge category={task.leadCategory} size="sm" />
                      </div>
                      <div className="flex items-center gap-3 text-xs font-body text-foreground/80 mt-1">
                        <span className="flex items-center gap-1 font-bold text-secondary-accent">
                          <Phone className="w-3 h-3" /> {task.customerPhoneSnapshot}
                        </span>
                        {task.requirement && (
                          <span className="italic text-foreground/70 truncate max-w-xs">
                            • {task.requirement}
                          </span>
                        )}
                      </div>
                      {task.purpose && (
                        <div className="text-xs text-foreground/90 mt-1 font-medium bg-sticky-yellow/60 px-2 py-0.5 rounded border border-border/30 inline-block">
                          🎯 {task.purpose}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          setActiveCallCustomer({
                            id: task.customerId,
                            customerId: task.customerCustomId,
                            fullName: task.customerNameSnapshot,
                            phone: task.customerPhoneSnapshot,
                            leadCategory: task.leadCategory,
                            requirement: task.requirement,
                          })
                        }
                      >
                        Log Call
                      </Button>
                      <Button
                        size="sm"
                        variant="muted"
                        onClick={() => setActiveRescheduleTask(task)}
                      >
                        Reschedule
                      </Button>
                      <button
                        onClick={() => handleCompleteTask(task.id, task.customerNameSnapshot)}
                        className="p-1.5 text-emerald-800 hover:bg-emerald-100 rounded-md border border-emerald-600 transition-colors"
                        title="Mark Complete"
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Overdue Calls Alert Box if any */}
          {overdueFollowUps.length > 0 && (
            <Card className="border-2 border-danger bg-red-50/40">
              <div className="flex items-center justify-between border-b-2 border-dashed border-danger/40 pb-3 mb-3">
                <div className="flex items-center gap-2 text-danger">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  <h3 className="text-xl font-heading font-bold">
                    Overdue Calls Alert ({overdueFollowUps.length})
                  </h3>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => navigate('/followups/overdue')}
                >
                  Manage All Overdue
                </Button>
              </div>

              <div className="space-y-2">
                {overdueFollowUps.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-white border border-danger rounded-md flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-heading font-bold text-sm text-foreground">
                        {task.customerNameSnapshot} —{' '}
                        <span className="text-danger text-xs font-body font-bold">
                          Due on {formatKolkataDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="text-xs text-foreground/70">
                        📞 {task.customerPhoneSnapshot} • {task.purpose || 'Follow-up'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() =>
                          setActiveCallCustomer({
                            id: task.customerId,
                            customerId: task.customerCustomId,
                            fullName: task.customerNameSnapshot,
                            phone: task.customerPhoneSnapshot,
                            leadCategory: task.leadCategory,
                            requirement: task.requirement,
                          })
                        }
                      >
                        Call Now
                      </Button>
                      <Button
                        size="sm"
                        variant="muted"
                        onClick={() => setActiveRescheduleTask(task)}
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Customer Additions */}
          <Card className="border-2 border-border">
            <div className="flex items-center justify-between border-b-2 border-dashed border-border/40 pb-3 mb-3">
              <h3 className="text-xl font-heading font-bold text-foreground">
                Recent Customer Additions
              </h3>
              <button
                onClick={() => navigate('/leads')}
                className="text-xs text-secondary-accent hover:underline font-bold"
              >
                View Database →
              </button>
            </div>

            {recentCustomers.length === 0 ? (
              <p className="text-xs text-foreground/60 py-2">No customers in database yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-body">
                  <thead>
                    <tr className="border-b border-border/30 text-xs font-heading font-bold text-foreground/60">
                      <th className="py-2">Customer</th>
                      <th className="py-2">Phone</th>
                      <th className="py-2">Interest</th>
                      <th className="py-2">Category</th>
                      <th className="py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {recentCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-stone-50">
                        <td className="py-2 font-heading font-bold text-foreground">
                          <span
                            onClick={() => navigate(`/leads/${cust.id}`)}
                            className="hover:underline cursor-pointer text-secondary-accent"
                          >
                            {cust.fullName}
                          </span>
                        </td>
                        <td className="py-2 font-mono text-xs">{cust.phone}</td>
                        <td className="py-2 text-xs truncate max-w-xs">{cust.requirement || cust.interest}</td>
                        <td className="py-2">
                          <LeadCategoryBadge category={cust.leadCategory} size="sm" />
                        </td>
                        <td className="py-2 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setActiveCallCustomer(cust)}
                          >
                            Call
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Charts & Activity Feed */}
        <div className="space-y-6">
          {/* Lead Distribution Chart */}
          <Card className="border-2 border-border" tape={true}>
            <h3 className="text-xl font-heading font-bold text-foreground mb-3">
              Lead Category Breakdown
            </h3>
            <div className="h-56 w-full">
              {stats.totalLeads === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-foreground/60">
                  No leads recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="count"
                    >
                      {leadDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="#2d2d2d" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #2d2d2d',
                        borderRadius: '8px',
                        fontFamily: 'Patrick Hand',
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>

          {/* Follow-up Completion Rate */}
          <Card className="border-2 border-border bg-sticky-yellow/40">
            <h3 className="text-xl font-heading font-bold text-foreground mb-1">
              Follow-up Completion Rate
            </h3>
            <div className="flex items-end gap-3 mt-2">
              <span className="text-4xl font-heading font-bold text-foreground">
                {stats.completionRate || 0}%
              </span>
              <span className="text-xs text-foreground/70 mb-1">
                of scheduled calls completed
              </span>
            </div>
            <div className="w-full bg-white h-3 rounded-full border-2 border-border overflow-hidden mt-2">
              <div
                className="bg-emerald-600 h-full transition-all duration-500"
                style={{ width: `${stats.completionRate || 0}%` }}
              />
            </div>
          </Card>

          {/* Recent Call Activity Feed */}
          <Card className="border-2 border-border">
            <div className="flex items-center justify-between border-b-2 border-dashed border-border/40 pb-2 mb-3">
              <h3 className="text-xl font-heading font-bold text-foreground">
                Recent Call Activity
              </h3>
              <button
                onClick={() => navigate('/calls')}
                className="text-xs text-secondary-accent hover:underline font-bold"
              >
                All Logs →
              </button>
            </div>

            {recentCalls.length === 0 ? (
              <p className="text-xs text-foreground/60 py-3 text-center">
                No calls recorded yet. Log your first call above!
              </p>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-2.5 bg-paper-white border border-border/60 rounded-md text-xs font-body"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading font-bold text-foreground">
                        {call.customerNameSnapshot}
                      </span>
                      <span className="text-[10px] text-foreground/60">
                        {formatKolkataDateTime(call.callAt || call.createdAt, 'dd MMM, hh:mm a')}
                      </span>
                    </div>
                    <div className="text-secondary-accent font-bold mt-0.5">
                      Outcome: {call.callOutcome}
                    </div>
                    {call.feedback && (
                      <div className="text-foreground/80 italic mt-0.5 truncate">
                        "{call.feedback}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CallModal
        isOpen={Boolean(activeCallCustomer)}
        onClose={() => setActiveCallCustomer(null)}
        customer={activeCallCustomer}
        onCallLogged={loadData}
      />

      <RescheduleModal
        isOpen={Boolean(activeRescheduleTask)}
        onClose={() => setActiveRescheduleTask(null)}
        followUp={activeRescheduleTask}
        onRescheduled={loadData}
      />
    </div>
  );
}
