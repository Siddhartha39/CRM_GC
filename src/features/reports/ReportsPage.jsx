import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import {
  BarChart3,
  TrendingUp,
  Award,
  Users,
  PhoneCall,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

export function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      // 1. Fetch customers
      const custSnap = await getDocs(collection(db, 'customers'));
      const customers = custSnap.docs.map(d => d.data());

      // 2. Fetch calls
      const callSnap = await getDocs(query(collection(db, 'callLogs'), limit(500)));
      const calls = callSnap.docs.map(d => d.data());

      // 3. Fetch followUps
      const followSnap = await getDocs(collection(db, 'followUps'));
      const followUps = followSnap.docs.map(d => d.data());

      // Calculate source distribution
      const sources = {};
      let convertedCount = 0;
      customers.forEach(c => {
        const s = c.source || 'Walk-in Store';
        sources[s] = (sources[s] || 0) + 1;
        if (c.leadStatus === 'Converted') convertedCount++;
      });

      const sourceData = Object.keys(sources).map(src => ({
        source: src,
        count: sources[src],
      }));

      // Calculate calls by outcome
      const outcomes = {};
      const employeeCalls = {};
      calls.forEach(call => {
        const out = call.callOutcome || 'Other';
        outcomes[out] = (outcomes[out] || 0) + 1;

        const emp = call.employeeName || call.employeeEmail || 'Executive';
        employeeCalls[emp] = (employeeCalls[emp] || 0) + 1;
      });

      const outcomeData = Object.keys(outcomes).map(k => ({
        outcome: k,
        calls: outcomes[k],
      }));

      const employeeData = Object.keys(employeeCalls).map(k => ({
        employee: k,
        calls: employeeCalls[k],
      }));

      // Conversion Rate
      const conversionRate = customers.length > 0
        ? Math.round((convertedCount / customers.length) * 100)
        : 0;

      // Follow-up status counts
      let completedFollowUps = 0;
      let pendingFollowUps = 0;
      followUps.forEach(f => {
        if (f.status === 'Completed') completedFollowUps++;
        else if (f.status === 'Pending') pendingFollowUps++;
      });

      setReportData({
        totalLeads: customers.length,
        convertedCount,
        conversionRate,
        totalCalls: calls.length,
        sourceData,
        outcomeData,
        employeeData,
        followUpData: [
          { name: 'Completed Calls', count: completedFollowUps, fill: '#38B2AC' },
          { name: 'Pending Follow-ups', count: pendingFollowUps, fill: '#F6AD55' },
        ],
      });
    } catch (e) {
      console.error('Reports error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const tooltipStyle = {
    backgroundColor: '#E0E5EC',
    border: 'none',
    borderRadius: '16px',
    boxShadow: '4px 4px 10px rgba(163, 177, 198, 0.6), -4px -4px 10px rgba(255, 255, 255, 0.8)',
    color: '#3D4852',
    fontFamily: 'DM Sans, sans-serif',
    padding: '8px 14px',
    fontSize: '12px',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#E0E5EC] rounded-[32px] p-6 shadow-neu-flat flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl shadow-neu-pressed flex items-center justify-center bg-[#E0E5EC] text-[#6C63FF]">
            <BarChart3 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-[#3D4852]">
              Store Analytics & Calling Performance
            </h2>
            <p className="text-sm font-body text-[#6B7280]">
              Aggregated metrics computed from real database records in Kanpur
            </p>
          </div>
        </div>

        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={loadReports}>
          Refresh Analytics
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} height="h-44" />
      ) : (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Leads</span>
                <div className="w-8 h-8 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#6C63FF]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-heading font-extrabold text-[#3D4852] mt-3">
                {reportData?.totalLeads || 0}
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#38B2AC] uppercase tracking-wider">Conversion Rate</span>
                <div className="w-8 h-8 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#38B2AC]">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-heading font-extrabold text-[#38B2AC] mt-3">
                {reportData?.conversionRate || 0}%
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#6B7280] uppercase tracking-wider">Total Calls Logged</span>
                <div className="w-8 h-8 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#6C63FF]">
                  <PhoneCall className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-heading font-extrabold text-[#3D4852] mt-3">
                {reportData?.totalCalls || 0}
              </div>
            </Card>

            <Card className="p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F6AD55] uppercase tracking-wider">Converted</span>
                <div className="w-8 h-8 rounded-xl shadow-neu-pressed flex items-center justify-center text-[#F6AD55]">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-3xl font-heading font-extrabold text-[#F6AD55] mt-3">
                {reportData?.convertedCount || 0}
              </div>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Acquisition Sources */}
            <Card className="p-6">
              <h3 className="text-lg font-heading font-extrabold text-[#3D4852] mb-4">
                Lead Sources (Walk-in vs Digital)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.sourceData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#A3B1C6" opacity={0.3} />
                    <XAxis dataKey="source" tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: '#6B7280' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: '#6B7280' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#6C63FF" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Calls by Outcome */}
            <Card className="p-6">
              <h3 className="text-lg font-heading font-extrabold text-[#3D4852] mb-4">
                Call Outcomes Distribution
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.outcomeData || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#A3B1C6" opacity={0.3} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: '#6B7280' }} />
                    <YAxis dataKey="outcome" type="category" width={110} tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: '#6B7280' }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="calls" fill="#FC8181" radius={[0, 8, 8, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Follow-up Completion vs Pending */}
            <Card className="p-6">
              <h3 className="text-lg font-heading font-extrabold text-[#3D4852] mb-4">
                Follow-up Task Completion
              </h3>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData?.followUpData || []}
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      dataKey="count"
                      label
                    >
                      {reportData?.followUpData?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend
                      formatter={(val) => <span className="text-xs font-body font-medium text-[#3D4852]">{val}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Employee Calling Activity */}
            <Card className="p-6">
              <h3 className="text-lg font-heading font-extrabold text-[#3D4852] mb-4">
                Calls Made by Executive
              </h3>
              <div className="h-60 w-full">
                {reportData?.employeeData?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-[#6B7280]">
                    No calls recorded yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData?.employeeData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#A3B1C6" opacity={0.3} />
                      <XAxis dataKey="employee" tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: '#6B7280' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', fill: '#6B7280' }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="calls" fill="#38B2AC" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
