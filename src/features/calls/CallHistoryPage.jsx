import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { LeadCategoryBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatKolkataDateTime, formatKolkataDate } from '../../utils/dates';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  PhoneCall,
  Search,
  Filter,
  Eye,
  Calendar,
  Clock,
  User,
} from 'lucide-react';

export function CallHistoryPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [callLogs, setCallLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('All');

  const fetchCallLogs = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, 'callLogs'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );
      const snap = await getDocs(q);
      setCallLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching call logs:', e);
      // Fallback if index is not ready
      try {
        const snap = await getDocs(query(collection(db, 'callLogs'), limit(200)));
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setCallLogs(list);
      } catch (fb) {
        console.error('Fallback failed:', fb);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCallLogs();
  }, []);

  const filteredLogs = callLogs.filter((log) => {
    const matchOutcome = outcomeFilter === 'All' || log.callOutcome === outcomeFilter;
    const term = search.trim().toLowerCase();
    const matchSearch =
      !term ||
      log.customerNameSnapshot?.toLowerCase().includes(term) ||
      log.customerPhoneSnapshot?.includes(term) ||
      log.feedback?.toLowerCase().includes(term) ||
      log.employeeName?.toLowerCase().includes(term);

    return matchOutcome && matchSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="p-4 bg-paper-white card-hand border-2 border-border flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sticky-yellow border-2 border-border rounded-lg shadow-hand-sm">
            <PhoneCall className="w-6 h-6 text-foreground stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Master Calling History ({filteredLogs.length})
            </h2>
            <p className="text-sm font-body text-foreground/70">
              Complete permanent audit trail of phone calls, outcomes, and customer feedbacks
            </p>
          </div>
        </div>

        <Button variant="muted" size="sm" onClick={fetchCallLogs}>
          Refresh Logs
        </Button>
      </div>

      {/* Filter and Search */}
      <Card className="border-2 border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input
              type="text"
              placeholder="Search by customer name, phone, employee, or feedback keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-hand w-full pl-9 text-sm"
            />
          </div>

          <Select
            value={outcomeFilter}
            onChange={(e) => setOutcomeFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Call Outcomes' },
              { value: 'Interested', label: 'Interested' },
              { value: 'Call Back Later', label: 'Call Back Later' },
              { value: 'No Requirement', label: 'No Requirement' },
              { value: 'No Answer', label: 'No Answer' },
              { value: 'Busy', label: 'Busy' },
              { value: 'Not Interested', label: 'Not Interested' },
              { value: 'Converted / Sale Completed', label: 'Converted / Sale' },
              { value: 'Wrong Number', label: 'Wrong Number' },
            ]}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="border-2 border-border p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={5} height="h-16" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No call logs found"
              description="No calling history records match your search or filter."
              actionText="View Leads to Call"
              onAction={() => navigate('/leads')}
              icon={PhoneCall}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-body">
              <thead className="bg-stone-100 border-b-2 border-border text-xs font-heading font-bold text-foreground">
                <tr>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Call Outcome</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Feedback & Notes</th>
                  <th className="py-3 px-4">Lead Category</th>
                  <th className="py-3 px-4">Executive</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 bg-paper-white">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                    <td className="py-3 px-4 text-xs font-mono">
                      {formatKolkataDateTime(log.callAt || log.createdAt)}
                    </td>
                    <td className="py-3 px-4">
                      <div
                        onClick={() => log.customerId && navigate(`/leads/${log.customerId}`)}
                        className="font-heading font-bold text-base text-secondary-accent hover:underline cursor-pointer"
                      >
                        {log.customerNameSnapshot}
                      </div>
                      <div className="font-mono text-xs text-foreground/70">
                        {log.customerPhoneSnapshot}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-heading font-bold text-xs bg-stone-100 border border-border px-2 py-0.5 rounded">
                        {log.callOutcome}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {log.callDuration || '—'}
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      {log.feedback ? (
                        <div className="text-xs italic text-foreground truncate">
                          "{log.feedback}"
                        </div>
                      ) : (
                        <span className="text-foreground/40">—</span>
                      )}
                      {log.nextAction && (
                        <div className="text-[11px] text-secondary-accent font-bold mt-0.5">
                          Next: {log.nextAction}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <LeadCategoryBadge category={log.newLeadCategory || log.previousLeadCategory} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-xs text-foreground/80">
                      {log.employeeName || log.employeeEmail}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => log.customerId && navigate(`/leads/${log.customerId}`)}
                        className="p-1.5 rounded border border-border/50 hover:bg-stone-100 text-foreground transition-colors"
                        title="View Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
