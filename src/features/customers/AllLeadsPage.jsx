import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Input';
import { LeadCategoryBadge, LeadStatusBadge } from '../../components/ui/Badge';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { CallModal } from '../calls/CallModal';
import { EditCustomerModal } from './EditCustomerModal';
import { getCustomers, deleteCustomer } from '../../services/customerService';
import { formatKolkataDate, formatINR } from '../../utils/dates';
import { useAuth } from '../../context/AuthContext';
import {
  Users,
  Search,
  PlusCircle,
  Phone,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * Neumorphic Soft UI Master Customer Database
 */
export function AllLeadsPage({ forcedCategory = null }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin } = useAuth();
  const { onOpenAddCustomer } = useOutletContext() || {};

  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState(forcedCategory || searchParams.get('category') || 'All');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'All');
  const [assignedFilter, setAssignedFilter] = useState('All');
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Pagination & view controls
  const [pageSize, setPageSize] = useState('All'); // '25', '50', '100', 'All'
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [callingCustomer, setCallingCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      // Fetch all leads without artificial truncation limit
      const list = await getCustomers({
        category: forcedCategory || (categoryFilter === 'All' ? null : categoryFilter),
        status: statusFilter === 'All' ? null : statusFilter,
        assignedTo: assignedFilter === 'Me' ? user?.email : null,
        search,
      });
      setCustomers(list);
    } catch (err) {
      toast.error('Failed to load leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 200);
    return () => clearTimeout(timer);
  }, [categoryFilter, statusFilter, assignedFilter, search, forcedCategory]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categoryFilter, statusFilter, assignedFilter, search, pageSize]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sortedCustomers = [...customers].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === undefined || aVal === null) aVal = '';
    if (bVal === undefined || bVal === null) bVal = '';

    // Handle Firestore Timestamps
    if (aVal && typeof aVal.toMillis === 'function') aVal = aVal.toMillis();
    if (bVal && typeof bVal.toMillis === 'function') bVal = bVal.toMillis();
    if (aVal && typeof aVal.seconds === 'number') aVal = aVal.seconds;
    if (bVal && typeof bVal.seconds === 'number') bVal = bVal.seconds;

    if (typeof aVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? aVal - bVal : bVal - aVal;
  });

  // Calculate pagination window
  const totalLeads = sortedCustomers.length;
  const numPageSize = pageSize === 'All' ? totalLeads : parseInt(pageSize, 10);
  const totalPages = Math.max(1, Math.ceil(totalLeads / (numPageSize || 1)));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = pageSize === 'All' ? 0 : (safeCurrentPage - 1) * numPageSize;
  const endIndex = pageSize === 'All' ? totalLeads : Math.min(startIndex + numPageSize, totalLeads);
  const displayedCustomers = sortedCustomers.slice(startIndex, endIndex);

  const handleDelete = async () => {
    if (!deletingCustomer) return;
    try {
      await deleteCustomer(deletingCustomer.id, user);
      toast.success(`Customer ${deletingCustomer.fullName} removed.`);
      setDeletingCustomer(null);
      fetchLeads();
    } catch (err) {
      toast.error('Failed to delete customer: ' + err.message);
    }
  };

  return (
    <div className="space-y-6 pb-28">
      {/* Page Header Bar */}
      <div className="p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
            {forcedCategory ? `${forcedCategory} Leads` : 'Customer Master Database'}
          </h2>
          <p className="text-sm font-body text-muted mt-1">
            Managing <strong className="text-accent font-bold">{customers.length}</strong> customer records in Kanpur workspace
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="md"
            icon={FileSpreadsheet}
            onClick={() => navigate('/import-export')}
          >
            Import / Export
          </Button>
          <Button
            variant="primary"
            size="md"
            icon={PlusCircle}
            onClick={onOpenAddCustomer}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-6 bg-background shadow-neu-flat rounded-[32px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* Deep Inset Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, phone, GC-ID, or requirement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background text-foreground shadow-neu-pressed rounded-2xl pl-10 pr-4 py-2.5 text-sm font-body border-0 outline-none transition-all placeholder:text-muted/60 focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            />
          </div>

          {/* Category Filter */}
          {!forcedCategory && (
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'All', label: 'All Lead Categories' },
                { value: 'Hot', label: '🔥 Hot Leads' },
                { value: 'Warm', label: '⚡ Warm Leads' },
                { value: 'Cold', label: '❄️ Cold Leads' },
                { value: 'Unassigned', label: '⚪ Unassigned (No Category)' },
              ]}
            />
          )}

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Lead Statuses' },
              { value: 'New', label: 'New' },
              { value: 'Contacted', label: 'Contacted' },
              { value: 'Follow-up', label: 'Follow-up' },
              { value: 'Converted', label: 'Converted' },
              { value: 'Lost', label: 'Lost' },
              { value: 'Do Not Contact', label: 'Do Not Contact' },
            ]}
          />

          {/* Assigned Filter (My Leads vs All Leads) */}
          <Select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            options={[
              { value: 'All', label: '👥 All Store Leads' },
              { value: 'Me', label: '👤 Assigned to Me' },
            ]}
          />
        </div>

        {/* View Controls: Row Count & Page Size Switcher */}
        <div className="mt-4 pt-4 border-t border-muted/15 flex flex-wrap items-center justify-between gap-3 text-xs font-body text-muted">
          <div className="flex items-center gap-2">
            <span>Showing:</span>
            <span className="font-bold text-foreground">
              {totalLeads === 0 ? 0 : startIndex + 1} – {endIndex} of {totalLeads} leads
            </span>
            {search && <span className="text-accent">(filtered by search)</span>}
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground/80">Rows per page:</span>
            <div className="flex items-center gap-1 bg-background shadow-neu-pressed p-1 rounded-xl">
              {['25', '50', '100', 'All'].map((sz) => (
                <button
                  key={sz}
                  onClick={() => setPageSize(sz)}
                  className={`px-2.5 py-1 rounded-lg font-display text-xs font-bold transition-all ${
                    pageSize === sz
                      ? 'bg-background shadow-neu-flat text-accent'
                      : 'text-muted hover:text-foreground'
                  }`}
                >
                  {sz === 'All' ? `All (${totalLeads})` : sz}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leads Table Container */}
      <div className="p-6 bg-background shadow-neu-flat rounded-[32px]">
        {loading ? (
          <div className="py-6">
            <LoadingSkeleton count={5} height="h-16" />
          </div>
        ) : sortedCustomers.length === 0 ? (
          <EmptyState
            title="No customer leads found"
            description="No customers match your current filter criteria or the database is empty."
            actionText="Add New Customer"
            onAction={onOpenAddCustomer}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto touch-pan-y pb-2">
              <table className="w-full text-left text-sm font-body">
                <thead>
                  <tr className="border-b border-muted/20 text-xs font-display font-bold uppercase tracking-wider text-muted">
                    <th
                      onClick={() => toggleSort('customerId')}
                      className="py-3 px-4 cursor-pointer hover:text-accent transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>ID</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th
                      onClick={() => toggleSort('fullName')}
                      className="py-3 px-4 cursor-pointer hover:text-accent transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Customer Name</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Phone / WhatsApp</th>
                    <th className="py-3 px-4">Requirement / Interest</th>
                    <th
                      onClick={() => toggleSort('budget')}
                      className="py-3 px-4 cursor-pointer hover:text-accent transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span>Budget</span>
                        <ArrowUpDown className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Next Follow-Up</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-muted/10">
                  {displayedCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs text-muted">
                        {cust.customerId || '—'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => navigate(`/leads/${cust.id}`)}
                          className="font-display font-bold text-base text-foreground hover:text-accent cursor-pointer transition-colors"
                        >
                          {cust.fullName}
                        </div>
                        <div className="text-xs text-muted">{cust.city || 'Kanpur'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <a
                          href={`tel:${cust.phone}`}
                          className="font-mono text-xs font-bold text-accent hover:underline block"
                        >
                          📞 {cust.phone}
                        </a>
                        {cust.whatsAppNumber && cust.whatsAppNumber !== cust.phone && (
                          <span className="text-[11px] text-accent-secondary">
                            WA: {cust.whatsAppNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 max-w-xs truncate">
                        <div className="font-semibold text-xs text-foreground">
                          {cust.interest}
                        </div>
                        {cust.requirement && (
                          <div className="text-xs text-muted truncate">
                            {cust.requirement}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-xs text-foreground font-mono">
                        {formatINR(cust.budget)}
                      </td>
                      <td className="py-3.5 px-4">
                        <LeadCategoryBadge category={cust.leadCategory} size="sm" />
                      </td>
                      <td className="py-3.5 px-4">
                        <LeadStatusBadge status={cust.leadStatus} size="sm" />
                      </td>
                      <td className="py-3.5 px-4 text-xs font-body font-bold text-foreground">
                        {cust.nextFollowUpDate ? formatKolkataDate(cust.nextFollowUpDate) : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="primary"
                            icon={Phone}
                            onClick={() => setCallingCustomer(cust)}
                          >
                            Call
                          </Button>
                          <button
                            onClick={() => navigate(`/leads/${cust.id}`)}
                            className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground transition-all"
                            title="View Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingCustomer(cust)}
                            className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-accent transition-all"
                            title="Edit Customer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => setDeletingCustomer(cust)}
                              className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-danger transition-all"
                              title="Delete Lead"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Pagination Controls (when paginated) */}
            {pageSize !== 'All' && totalPages > 1 && (
              <div className="pt-4 border-t border-muted/15 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs font-body text-muted">
                  Page <strong className="text-foreground">{safeCurrentPage}</strong> of{' '}
                  <strong className="text-foreground">{totalPages}</strong> ({totalLeads} total records)
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={safeCurrentPage === 1}
                    className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all"
                    title="First Page"
                  >
                    <ChevronsLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="px-3 py-1 font-display font-bold text-xs bg-background shadow-neu-pressed rounded-xl text-accent">
                    {safeCurrentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safeCurrentPage === totalPages}
                    className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-all"
                    title="Last Page"
                  >
                    <ChevronsRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <CallModal
        isOpen={Boolean(callingCustomer)}
        onClose={() => setCallingCustomer(null)}
        customer={callingCustomer}
        onCallLogged={fetchLeads}
      />

      <EditCustomerModal
        isOpen={Boolean(editingCustomer)}
        onClose={() => setEditingCustomer(null)}
        customer={editingCustomer}
        onCustomerUpdated={fetchLeads}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingCustomer)}
        onClose={() => setDeletingCustomer(null)}
        onConfirm={handleDelete}
        title="Delete Customer Lead?"
        message={`Are you sure you want to delete ${deletingCustomer?.fullName} (${deletingCustomer?.customerId})? All historical data for this customer will be removed.`}
        confirmText="Yes, Delete Lead"
        isDestructive={true}
      />
    </div>
  );
}
