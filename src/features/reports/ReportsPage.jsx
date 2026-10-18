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
          { name: 'Completed Calls', count: completedFollowUps, fill: '#2e7d32' },
          { name: 'Pending Follow-ups', count: pendingFollowUps, fill: '#a66a00' },
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

  const COLORS = ['#ff4d4d', '#2d5da1', '#a66a00', '#2e7d32', '#7b1fa2', '#f57c00'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-paper-white card-hand border-2 border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sticky-yellow border-2 border-border rounded-lg shadow-hand-sm">
            <BarChart3 className="w-6 h-6 text-foreground stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Store Analytics & Calling Performance
            </h2>
            <p className="text-sm font-body text-foreground/70">
              Aggregated metrics computed from real database records in Kanpur
            </p>
          </div>
        </div>

        <Button variant="muted" size="sm" icon={RefreshCw} onClick={loadReports}>
          Refresh Analytics
        </Button>
      </div>

      {loading ? (
        <LoadingSkeleton count={3} height="h-44" />
      ) : (
        <>
          {/* Key Metric Highlights */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-2 border-border">
              <span className="text-xs font-bold text-foreground/60 uppercase">Total Leads</span>
              <div className="text-3xl font-heading font-bold text-foreground mt-1">
                {reportData?.totalLeads || 0}
              </div>
            </Card>

            <Card className="border-2 border-emerald-600 bg-emerald-50/40">
              <span className="text-xs font-bold text-emerald-800 uppercase">Conversion Rate</span>
              <div className="text-3xl font-heading font-bold text-emerald-800 mt-1">
                {reportData?.conversionRate || 0}%
              </div>
            </Card>

            <Card className="border-2 border-border">
              <span className="text-xs font-bold text-foreground/60 uppercase">Total Calls Logged</span>
              <div className="text-3xl font-heading font-bold text-foreground mt-1">
                {reportData?.totalCalls || 0}
              </div>
            </Card>

            <Card className="border-2 border-amber-600 bg-amber-50/40">
              <span className="text-xs font-bold text-amber-900 uppercase">Converted Customers</span>
              <div className="text-3xl font-heading font-bold text-amber-900 mt-1">
                {reportData?.convertedCount || 0}
              </div>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Lead Acquisition Sources */}
            <Card className="border-2 border-border p-4" tape={true}>
              <h3 className="text-xl font-heading font-bold text-foreground mb-3">
                Lead Sources (Walk-in vs Digital)
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.sourceData || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                    <XAxis dataKey="source" tick={{ fontSize: 11, fontFamily: 'Patrick Hand' }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #2d2d2d',
                        borderRadius: '8px',
                        fontFamily: 'Patrick Hand',
                      }}
                    />
                    <Bar dataKey="count" fill="#2d5da1" stroke="#2d2d2d" strokeWidth={1.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Calls by Outcome */}
            <Card className="border-2 border-border p-4" tape={true}>
              <h3 className="text-xl font-heading font-bold text-foreground mb-3">
                Call Outcomes Distribution
              </h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reportData?.outcomeData || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis dataKey="outcome" type="category" width={110} tick={{ fontSize: 11, fontFamily: 'Patrick Hand' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #2d2d2d',
                        borderRadius: '8px',
                        fontFamily: 'Patrick Hand',
                      }}
                    />
                    <Bar dataKey="calls" fill="#ff4d4d" stroke="#2d2d2d" strokeWidth={1.5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Follow-up Completion vs Pending */}
            <Card className="border-2 border-border p-4">
              <h3 className="text-xl font-heading font-bold text-foreground mb-3">
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
              </div>
            </Card>

            {/* Employee Calling Activity */}
            <Card className="border-2 border-border p-4">
              <h3 className="text-xl font-heading font-bold text-foreground mb-3">
                Calls Made by Executive
              </h3>
              <div className="h-60 w-full">
                {reportData?.employeeData?.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-foreground/60">
                    No calls recorded yet
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={reportData?.employeeData || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d8" />
                      <XAxis dataKey="employee" tick={{ fontSize: 11, fontFamily: 'Patrick Hand' }} />
                      <YAxis allowDecimals={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '2px solid #2d2d2d',
                          borderRadius: '8px',
                          fontFamily: 'Patrick Hand',
                        }}
                      />
                      <Bar dataKey="calls" fill="#a66a00" stroke="#2d2d2d" strokeWidth={1.5} />
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
