import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { LeadCategoryBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatKolkataDateTime } from '../../utils/dates';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  PhoneCall,
  Search,
  Eye,
} from 'lucide-react';

/**
 * Neumorphic Soft UI Call History Audit Page
 */
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
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-accent shrink-0">
            <PhoneCall className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
              Master Calling History ({filteredLogs.length})
            </h2>
            <p className="text-sm font-body text-muted">
              Complete permanent audit trail of phone calls, outcomes, and customer feedbacks
            </p>
          </div>
        </div>

        <Button variant="muted" size="md" onClick={fetchCallLogs}>
          Refresh Logs
        </Button>
      </div>

      {/* Filter and Search */}
      <div className="p-6 bg-background shadow-neu-flat rounded-[32px]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by customer name, phone, employee, or feedback keyword..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background text-foreground shadow-neu-pressed rounded-2xl pl-10 pr-4 py-2.5 text-sm font-body border-0 outline-none transition-all placeholder:text-muted/60 focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
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
      </div>

      {/* Table */}
      <div className="p-6 bg-background shadow-neu-flat rounded-[32px] overflow-hidden">
        {loading ? (
          <div className="py-6">
            <LoadingSkeleton count={5} height="h-16" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            title="No call logs found"
            description="No calling history records match your search or filter."
            actionText="View Leads to Call"
            onAction={() => navigate('/leads')}
            icon={PhoneCall}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-body">
              <thead>
                <tr className="border-b border-muted/20 text-xs font-display font-bold uppercase tracking-wider text-muted">
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
              <tbody className="divide-y divide-muted/10">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                    <td className="py-3.5 px-4 text-xs font-mono text-muted">
                      {formatKolkataDateTime(log.callAt || log.createdAt)}
                    </td>
                    <td className="py-3.5 px-4">
                      <div
                        onClick={() => log.customerId && navigate(`/leads/${log.customerId}`)}
                        className="font-display font-bold text-base text-foreground hover:text-accent cursor-pointer transition-colors"
                      >
                        {log.customerNameSnapshot}
                      </div>
                      <div className="font-mono text-xs text-muted">
                        {log.customerPhoneSnapshot}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-display font-bold text-xs bg-background shadow-neu-pressed-sm px-2.5 py-1 rounded-lg text-foreground">
                        {log.callOutcome}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-muted">
                      {log.callDuration || '—'}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      {log.feedback ? (
                        <div className="text-xs italic text-foreground/80 truncate">
                          "{log.feedback}"
                        </div>
                      ) : (
                        <span className="text-muted/40">—</span>
                      )}
                      {log.nextAction && (
                        <div className="text-[11px] text-accent font-semibold mt-0.5">
                          Next: {log.nextAction}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <LeadCategoryBadge category={log.newLeadCategory || log.previousLeadCategory} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted">
                      {log.employeeName || log.employeeEmail}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => log.customerId && navigate(`/leads/${log.customerId}`)}
                        className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground transition-all"
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
      </div>
    </div>
  );
}
