import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getKolkataTodayString, isOverdueDate } from '../utils/dates';

/**
 * Fetch dashboard statistics and analytics aggregated from actual Firestore collections.
 */
export async function getDashboardMetrics() {
  const todayStr = getKolkataTodayString();

  try {
    // 1. Fetch Customers
    const custSnap = await getDocs(collection(db, 'customers'));
    const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() }));

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

    // 2. Fetch Follow-ups
    const followSnap = await getDocs(collection(db, 'followUps'));
    const followUps = followSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    let todayFollowUps = 0;
    let overdueFollowUps = 0;
    let completedFollowUps = 0;
    let totalPendingFollowUps = 0;

    followUps.forEach(f => {
      if (f.status === 'Completed') {
        completedFollowUps++;
      } else if (f.status === 'Pending') {
        totalPendingFollowUps++;
        if (f.dueDate === todayStr) {
          todayFollowUps++;
        } else if (isOverdueDate(f.dueDate)) {
          overdueFollowUps++;
        }
      }
    });

    // Follow-up completion rate
    const totalFollowUpsCount = completedFollowUps + totalPendingFollowUps;
    const completionRate = totalFollowUpsCount > 0
      ? Math.round((completedFollowUps / totalFollowUpsCount) * 100)
      : 0;

    // 3. Fetch Calls
    const callSnap = await getDocs(query(collection(db, 'callLogs'), limit(200)));
    const calls = callSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Count calls today
    let callsToday = 0;
    const callsByDay = {};

    calls.forEach(call => {
      let callDateStr = '';
      if (call.callAt && typeof call.callAt.toDate === 'function') {
        const d = call.callAt.toDate();
        callDateStr = d.toISOString().split('T')[0];
      } else if (call.createdAt && typeof call.createdAt.toDate === 'function') {
        const d = call.createdAt.toDate();
        callDateStr = d.toISOString().split('T')[0];
      }

      if (callDateStr) {
        callsByDay[callDateStr] = (callsByDay[callDateStr] || 0) + 1;
        if (callDateStr === todayStr) {
          callsToday++;
        }
      }
    });

    // Sort recent customers (newest additions)
    const recentCustomers = [...customers]
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      })
      .slice(0, 5);

    // Recent calls
    const recentCalls = [...calls]
      .sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      })
      .slice(0, 5);

    // Lead category distribution data for Recharts
    const leadDistributionData = [
      { name: 'Hot Leads', count: hotLeads, fill: '#ff4d4d' },
      { name: 'Warm Leads', count: warmLeads, fill: '#a66a00' },
      { name: 'Cold Leads', count: coldLeads, fill: '#2d5da1' },
    ];

    // Status distribution
    const statusCounts = {};
    customers.forEach(c => {
      const st = c.leadStatus || 'New';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const leadStatusData = Object.keys(statusCounts).map(status => ({
      status,
      count: statusCounts[status],
    }));

    return {
      stats: {
        totalLeads,
        hotLeads,
        warmLeads,
        coldLeads,
        todayFollowUps,
        overdueFollowUps,
        callsToday,
        convertedLeads,
        completionRate,
      },
      leadDistributionData,
      leadStatusData,
      recentCustomers,
      recentCalls,
      todayStr,
    };
  } catch (error) {
    console.error('Error computing dashboard metrics:', error);
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
      leadStatusData: [],
      recentCustomers: [],
      recentCalls: [],
      todayStr,
      error: error.message,
    };
  }
}
