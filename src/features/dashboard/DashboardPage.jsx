import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LeadCategoryBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { CallModal } from '../calls/CallModal';
import { RescheduleModal } from '../followups/RescheduleModal';
import { getDashboardMetrics } from '../../services/dashboardService';
import { getTodayFollowUps, getOverdueFollowUps, completeFollowUp } from '../../services/followUpService';
import { formatKolkataDate, formatKolkataDateTime } from '../../utils/dates';
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
  Check,
  TrendingUp,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { toast } from 'sonner';

/**
 * Neumorphic Soft UI Dashboard
 * Monochromatic cool clay surfaces, extruded stat cards with deep carved icon wells,
 * and tactile follow-up workflow queues.
 */
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
        <div className="p-8 bg-background shadow-neu-flat rounded-[32px]">
          <LoadingSkeleton count={4} height="h-24" />
        </div>
      </div>
    );
  }

  const { stats, leadDistributionData, recentCustomers, recentCalls } = metrics || {
    stats: {},
    leadDistributionData: [],
    recentCustomers: [],
    recentCalls: [],
  };

  // Neumorphic palette for charts
  const CHART_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#38B2AC'];

  return (
    <div className="space-y-8 pb-10">
      {/* Welcome & Shop Status Banner */}
      <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] flex flex-wrap items-center justify-between gap-6 transition-all">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
              Namaste, {user?.displayName || user?.email?.split('@')[0]}! 🙏
            </h2>
            <span className="text-xs font-display font-bold text-accent bg-background shadow-neu-pressed-sm px-3 py-1 rounded-full uppercase tracking-wider">
              Kanpur Store Desk
            </span>
          </div>
          <p className="text-sm font-body text-muted leading-relaxed max-w-2xl">
            Welcome to the Galaxy Computers CRM Workspace. You have{' '}
            <strong className="text-foreground font-semibold">{stats.todayFollowUps || 0} customer calls</strong> due today.
            {stats.overdueFollowUps > 0 && (
              <span className="text-danger font-bold ml-1.5">
                • {stats.overdueFollowUps} overdue calls require prompt follow-up!
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="muted" icon={RefreshCw} size="md" onClick={loadData}>
            Refresh
          </Button>
          <Button variant="primary" icon={PlusCircle} size="md" onClick={onOpenAddCustomer}>
            Add Customer
          </Button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {/* Total Leads */}
        <div
          onClick={() => navigate('/leads')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-muted">Total Leads</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-foreground">
              <Users className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-foreground mt-4 tracking-tight">
            {stats.totalLeads || 0}
          </div>
          <div className="text-xs font-body font-semibold text-accent flex items-center gap-1 mt-2">
            <span>View All Leads</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Hot Leads */}
        <div
          onClick={() => navigate('/leads/hot')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-red-500">Hot Leads</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-red-500">
              <Flame className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-red-500 mt-4 tracking-tight">
            {stats.hotLeads || 0}
          </div>
          <div className="text-xs font-body font-semibold text-red-500 flex items-center gap-1 mt-2">
            <span>Immediate Needs</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Warm Leads */}
        <div
          onClick={() => navigate('/leads/warm')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-amber-500">Warm Leads</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-amber-500">
              <Zap className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-amber-500 mt-4 tracking-tight">
            {stats.warmLeads || 0}
          </div>
          <div className="text-xs font-body font-semibold text-amber-600 flex items-center gap-1 mt-2">
            <span>Evaluating Price</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Cold Leads */}
        <div
          onClick={() => navigate('/leads/cold')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-blue-500">Cold Leads</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-blue-500">
              <Snowflake className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-blue-500 mt-4 tracking-tight">
            {stats.coldLeads || 0}
          </div>
          <div className="text-xs font-body font-semibold text-blue-600 flex items-center gap-1 mt-2">
            <span>Future Follow-up</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Today's Follow-ups */}
        <div
          onClick={() => navigate('/followups/today')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-emerald-600">Today's Calls</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-emerald-600">
              <CalendarCheck className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-emerald-600 mt-4 tracking-tight">
            {stats.todayFollowUps || 0}
          </div>
          <div className="text-xs font-body font-semibold text-emerald-600 flex items-center gap-1 mt-2">
            <span>Daily Call Queue</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Overdue Follow-ups */}
        <div
          onClick={() => navigate('/followups/overdue')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-danger">Overdue Calls</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-danger">
              <AlertTriangle className="w-5 h-5 stroke-[2] animate-pulse" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-danger mt-4 tracking-tight">
            {stats.overdueFollowUps || 0}
          </div>
          <div className="text-xs font-body font-semibold text-danger flex items-center gap-1 mt-2">
            <span>Needs Immediate Call</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Calls Logged Today */}
        <div
          onClick={() => navigate('/calls')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-muted">Calls Logged</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-accent">
              <PhoneCall className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-foreground mt-4 tracking-tight">
            {stats.callsToday || 0}
          </div>
          <div className="text-xs font-body font-semibold text-accent flex items-center gap-1 mt-2">
            <span>View Call History</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        {/* Converted Leads */}
        <div
          onClick={() => navigate('/leads?status=Converted')}
          className="p-6 bg-background shadow-neu-flat hover:shadow-neu-flat-hover hover:-translate-y-1 rounded-[32px] cursor-pointer transition-all duration-300 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-display font-bold uppercase tracking-wider text-accent-secondary">Converted Sales</span>
            <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-accent-secondary">
              <Award className="w-5 h-5 stroke-[2]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-display font-extrabold text-accent-secondary mt-4 tracking-tight">
            {stats.convertedLeads || 0}
          </div>
          <div className="text-xs font-body font-semibold text-accent-secondary flex items-center gap-1 mt-2">
            <span>Won Deals 🎉</span> <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Main Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Today's Follow-up Queue */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Follow-ups Card */}
          <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background shadow-neu-pressed flex items-center justify-center text-emerald-600">
                  <CalendarCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold text-foreground tracking-tight">
                    Today's Calling Queue
                  </h3>
                  <p className="text-xs font-body text-muted">
                    {todayFollowUps.length} follow-ups scheduled for today
                  </p>
                </div>
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
              <div className="space-y-3.5">
                {todayFollowUps.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-background shadow-neu-flat-sm hover:shadow-neu-pressed-sm rounded-2xl flex flex-wrap items-center justify-between gap-4 transition-all duration-300"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span
                          onClick={() => task.customerId && navigate(`/leads/${task.customerId}`)}
                          className="font-display font-bold text-base text-foreground hover:text-accent cursor-pointer transition-colors"
                        >
                          {task.customerNameSnapshot}
                        </span>
                        <LeadCategoryBadge category={task.leadCategory} size="sm" />
                      </div>

                      <div className="flex items-center gap-3 text-xs font-body text-muted">
                        <span className="flex items-center gap-1 font-semibold text-accent">
                          <Phone className="w-3.5 h-3.5" /> {task.customerPhoneSnapshot}
                        </span>
                        {task.requirement && (
                          <span className="truncate max-w-xs text-foreground/70">
                            • {task.requirement}
                          </span>
                        )}
                      </div>
                      {task.purpose && (
                        <div className="text-xs text-muted font-medium bg-background shadow-neu-pressed-sm px-2.5 py-0.5 rounded-lg inline-block">
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
                        variant="secondary"
                        onClick={() => setActiveRescheduleTask(task)}
                      >
                        Reschedule
                      </Button>
                      <button
                        onClick={() => handleCompleteTask(task.id, task.customerNameSnapshot)}
                        className="w-9 h-9 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-emerald-600 transition-all"
                        title="Mark Complete"
                      >
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Overdue Calls Alert Box if any */}
          {overdueFollowUps.length > 0 && (
            <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-background shadow-neu-pressed flex items-center justify-center text-danger">
                    <AlertTriangle className="w-5 h-5 stroke-[2] animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xl font-display font-bold text-danger tracking-tight">
                      Overdue Calls Alert
                    </h3>
                    <p className="text-xs font-body text-muted">
                      {overdueFollowUps.length} overdue follow-up calls need attention
                    </p>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => navigate('/followups/overdue')}
                >
                  Manage All Overdue
                </Button>
              </div>

              <div className="space-y-3">
                {overdueFollowUps.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-background shadow-neu-pressed-sm rounded-2xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-display font-bold text-sm text-foreground">
                        {task.customerNameSnapshot} —{' '}
                        <span className="text-danger text-xs font-semibold">
                          Due on {formatKolkataDate(task.dueDate)}
                        </span>
                      </div>
                      <div className="text-xs font-body text-muted mt-0.5">
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
                        variant="secondary"
                        onClick={() => setActiveRescheduleTask(task)}
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Customer Additions */}
          <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-muted/20">
              <div>
                <h3 className="text-xl font-display font-bold text-foreground tracking-tight">
                  Recent Customer Additions
                </h3>
                <p className="text-xs font-body text-muted">Latest registered leads in Kanpur database</p>
              </div>
              <button
                onClick={() => navigate('/leads')}
                className="text-xs font-body font-bold text-accent hover:underline flex items-center gap-1"
              >
                View Full Database →
              </button>
            </div>

            {recentCustomers.length === 0 ? (
              <p className="text-sm font-body text-muted py-4 text-center">No customers in database yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-body">
                  <thead>
                    <tr className="border-b border-muted/20 text-xs font-display font-bold uppercase tracking-wider text-muted">
                      <th className="py-3 px-2">Customer</th>
                      <th className="py-3 px-2">Phone</th>
                      <th className="py-3 px-2">Requirement</th>
                      <th className="py-3 px-2">Category</th>
                      <th className="py-3 px-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-muted/10">
                    {recentCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-muted/10 transition-colors">
                        <td className="py-3 px-2 font-display font-bold text-foreground">
                          <span
                            onClick={() => navigate(`/leads/${cust.id}`)}
                            className="hover:text-accent cursor-pointer transition-colors"
                          >
                            {cust.fullName}
                          </span>
                        </td>
                        <td className="py-3 px-2 font-mono text-xs text-muted">{cust.phone}</td>
                        <td className="py-3 px-2 text-xs truncate max-w-xs text-foreground/80">{cust.requirement || cust.interest}</td>
                        <td className="py-3 px-2">
                          <LeadCategoryBadge category={cust.leadCategory} size="sm" />
                        </td>
                        <td className="py-3 px-2 text-right">
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
          </div>
        </div>

        {/* Right Col: Charts & Activity Feed */}
        <div className="space-y-8">
          {/* Lead Distribution Chart */}
          <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
            <h3 className="text-xl font-display font-bold text-foreground mb-4 tracking-tight">
              Lead Category Breakdown
            </h3>
            <div className="h-60 w-full">
              {stats.totalLeads === 0 ? (
                <div className="h-full flex items-center justify-center text-sm font-body text-muted">
                  No leads recorded yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={leadDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={78}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {leadDistributionData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#E0E5EC',
                        boxShadow: '9px 9px 16px rgb(163,177,198,0.6), -9px -9px 16px rgba(255,255,255,0.5)',
                        borderRadius: '16px',
                        border: 'none',
                        fontFamily: 'DM Sans',
                        color: '#3D4852',
                        fontWeight: 600,
                      }}
                    />
                    <Legend
                      formatter={(val) => <span className="text-xs font-body font-medium text-muted">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Follow-up Completion Rate */}
          <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-display font-bold text-foreground tracking-tight">
                Completion Rate
              </h3>
              <TrendingUp className="w-5 h-5 text-accent-secondary" />
            </div>
            <div className="flex items-baseline gap-3 my-2">
              <span className="text-4xl font-display font-extrabold text-foreground tracking-tight">
                {stats.completionRate || 0}%
              </span>
              <span className="text-xs font-body text-muted">
                of calls completed on time
              </span>
            </div>
            {/* Deep Inset Progress Track */}
            <div className="w-full bg-background shadow-neu-pressed h-4 rounded-full p-0.5 overflow-hidden mt-3">
              <div
                className="bg-accent-secondary h-full rounded-full transition-all duration-700 shadow-sm"
                style={{ width: `${stats.completionRate || 0}%` }}
              />
            </div>
          </div>

          {/* Recent Call Activity Feed */}
          <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-muted/20">
              <h3 className="text-xl font-display font-bold text-foreground tracking-tight">
                Recent Call Activity
              </h3>
              <button
                onClick={() => navigate('/calls')}
                className="text-xs font-body font-bold text-accent hover:underline"
              >
                All Logs →
              </button>
            </div>

            {recentCalls.length === 0 ? (
              <p className="text-sm font-body text-muted py-6 text-center">
                No calls recorded yet. Log your first call from the queue!
              </p>
            ) : (
              <div className="space-y-3">
                {recentCalls.map((call) => (
                  <div
                    key={call.id}
                    className="p-3.5 bg-background shadow-neu-pressed-sm rounded-2xl text-xs font-body space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-foreground">
                        {call.customerNameSnapshot}
                      </span>
                      <span className="text-[10px] text-muted">
                        {formatKolkataDateTime(call.callAt || call.createdAt, 'dd MMM, hh:mm a')}
                      </span>
                    </div>
                    <div className="text-accent font-semibold">
                      Outcome: {call.callOutcome}
                    </div>
                    {call.feedback && (
                      <div className="text-foreground/80 italic truncate">
                        "{call.feedback}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
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
