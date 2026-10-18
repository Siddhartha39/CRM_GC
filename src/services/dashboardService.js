import { getCustomers } from './customerService';
import { getTodayFollowUps, getOverdueFollowUps, getCompletedFollowUps } from './followUpService';
import { getRecentCallLogs } from './callService';
import { getKolkataTodayString } from '../utils/dates';

export async function getDashboardMetrics() {
  const todayStr = getKolkataTodayString();

  try {
    const [customers, todayFollowUpsList, overdueFollowUpsList, completedFollowUpsList, recentCalls] =
      await Promise.all([
        getCustomers({ limitCount: 500 }),
        getTodayFollowUps(),
        getOverdueFollowUps(),
        getCompletedFollowUps(),
        getRecentCallLogs(10),
      ]);

    let totalLeads = customers.length;
    let hotLeads = 0;
    let warmLeads = 0;
    let coldLeads = 0;
    let convertedLeads = 0;

    customers.forEach(c => {
      if (c.leadCategory === 'Hot') hotLeads++;
      else if (c.leadCategory === 'Warm') warmLeads++;
      else if (c.leadCategory === 'Cold') coldLeads++;

      if (c.leadStatus === 'Converted') convertedLeads++;
    });

    const totalFollowUps = completedFollowUpsList.length + todayFollowUpsList.length + overdueFollowUpsList.length;
    const completionRate = totalFollowUps > 0
      ? Math.round((completedFollowUpsList.length / totalFollowUps) * 100)
      : 0;

    let callsToday = 0;
    recentCalls.forEach(call => {
      if (call.callAt && typeof call.callAt.toDate === 'function') {
        const d = call.callAt.toDate().toISOString().split('T')[0];
        if (d === todayStr) callsToday++;
      }
    });

    const leadDistributionData = [
      { name: 'Hot Leads', count: hotLeads, fill: '#ff4d4d' },
      { name: 'Warm Leads', count: warmLeads, fill: '#a66a00' },
      { name: 'Cold Leads', count: coldLeads, fill: '#2d5da1' },
    ];

    const recentCustomers = [...customers]
      .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      .slice(0, 5);

    return {
      stats: {
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        todayFollowUps: todayFollowUpsList.length,
        overdueFollowUps: overdueFollowUpsList.length,
        callsToday,
        convertedLeads,
        completionRate,
      },
      leadDistributionData,
      recentCustomers,
      recentCalls,
      todayStr,
    };
  } catch (error) {
    console.error('Error computing metrics:', error);
    return {
      stats: {
        totalLeads: 0,
        hotLeads: 0,
        warmLeads: 0,
        coldLeads: 0,
        todayFollowUps: 0,
        overdueFollowUps: 0,
        callsToday: 0,
        convertedLeads: 0,
        completionRate: 0,
      },
      leadDistributionData: [
        { name: 'Hot Leads', count: 0, fill: '#ff4d4d' },
        { name: 'Warm Leads', count: 0, fill: '#a66a00' },
        { name: 'Cold Leads', count: 0, fill: '#2d5da1' },
      ],
      recentCustomers: [],
      recentCalls: [],
      todayStr,
      error: error.message,
    };
  }
}
