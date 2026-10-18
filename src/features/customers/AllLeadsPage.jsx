import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
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
  Filter,
  PlusCircle,
  Phone,
  Eye,
  Edit,
  Trash2,
  ArrowUpDown,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [sortField, setSortField] = useState('createdAt');
  const [sortAsc, setSortAsc] = useState(false);

  // Modals
  const [callingCustomer, setCallingCustomer] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(null);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const list = await getCustomers({
        category: forcedCategory || (categoryFilter === 'All' ? null : categoryFilter),
        status: statusFilter === 'All' ? null : statusFilter,
        search,
        limitCount: 100,
      });
      setCustomers(list);
    } catch (err) {
      console.error('Error fetching leads:', err);
      toast.error('Failed to load leads: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (forcedCategory) {
      setCategoryFilter(forcedCategory);
    }
  }, [forcedCategory]);

  useEffect(() => {
    fetchLeads();
    const handleCustAdded = () => fetchLeads();
    window.addEventListener('crm-customer-added', handleCustAdded);
    return () => window.removeEventListener('crm-customer-added', handleCustAdded);
  }, [categoryFilter, statusFilter, forcedCategory]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Sort
  const sortedCustomers = [...customers].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'createdAt') {
      valA = a.createdAt?.seconds || 0;
      valB = b.createdAt?.seconds || 0;
    } else if (sortField === 'budget') {
      valA = Number(a.budget || 0);
      valB = Number(b.budget || 0);
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

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
    <div className="space-y-5">
      {/* Page Header Bar */}
      <div className="p-4 bg-paper-white card-hand border-2 border-border flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-bold text-foreground">
            {forcedCategory ? `${forcedCategory} Leads` : 'Customer Master Database'}
          </h2>
          <p className="text-sm font-body text-foreground/70">
            Managing {customers.length} customer records in Kanpur workspace
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="muted"
            size="sm"
            icon={FileSpreadsheet}
            onClick={() => navigate('/import-export')}
          >
            Import / Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={PlusCircle}
            onClick={onOpenAddCustomer}
          >
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-2 border-border p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input
              type="text"
              placeholder="Search by name, phone, GC-ID, or requirement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-hand w-full pl-9 text-sm"
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
        </div>
      </Card>

      {/* Leads Table */}
      <Card className="border-2 border-border p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={5} height="h-14" />
          </div>
        ) : sortedCustomers.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No customer leads found"
              description="No customers match your current filter criteria or the database is empty."
              actionText="Add New Customer"
              onAction={onOpenAddCustomer}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm font-body">
              <thead className="bg-stone-100 border-b-2 border-border text-xs font-heading font-bold text-foreground">
                <tr>
                  <th
                    onClick={() => toggleSort('customerId')}
                    className="py-3 px-4 cursor-pointer hover:bg-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>ID</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => toggleSort('fullName')}
                    className="py-3 px-4 cursor-pointer hover:bg-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Customer Name</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Phone / WhatsApp</th>
                  <th className="py-3 px-4">Requirement / Interest</th>
                  <th
                    onClick={() => toggleSort('budget')}
                    className="py-3 px-4 cursor-pointer hover:bg-stone-200"
                  >
                    <div className="flex items-center gap-1">
                      <span>Budget</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Next Follow-Up</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 bg-paper-white">
                {sortedCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-sticky-yellow/20 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-xs text-foreground/80">
                      {cust.customerId || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div
                        onClick={() => navigate(`/leads/${cust.id}`)}
                        className="font-heading font-bold text-base text-secondary-accent hover:underline cursor-pointer"
                      >
                        {cust.fullName}
                      </div>
                      <div className="text-xs text-foreground/60">{cust.city || 'Kanpur'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={`tel:${cust.phone}`}
                        className="font-mono text-xs font-bold text-foreground hover:text-secondary-accent hover:underline block"
                      >
                        📞 {cust.phone}
                      </a>
                      {cust.whatsAppNumber && cust.whatsAppNumber !== cust.phone && (
                        <span className="text-[11px] text-emerald-800">
                          WA: {cust.whatsAppNumber}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate">
                      <div className="font-bold text-xs text-foreground">
                        {cust.interest}
                      </div>
                      {cust.requirement && (
                        <div className="text-xs text-foreground/70 truncate">
                          {cust.requirement}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-bold text-xs text-foreground font-mono">
                      {formatINR(cust.budget)}
                    </td>
                    <td className="py-3 px-4">
                      <LeadCategoryBadge category={cust.leadCategory} size="sm" />
                    </td>
                    <td className="py-3 px-4">
                      <LeadStatusBadge status={cust.leadStatus} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-xs font-body font-bold text-foreground">
                      {cust.nextFollowUpDate ? formatKolkataDate(cust.nextFollowUpDate) : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
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
                          className="p-1.5 rounded border border-border/50 hover:bg-stone-100 text-foreground transition-colors"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingCustomer(cust)}
                          className="p-1.5 rounded border border-border/50 hover:bg-stone-100 text-secondary-accent transition-colors"
                          title="Edit Customer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => setDeletingCustomer(cust)}
                            className="p-1.5 rounded border border-border/50 hover:bg-red-50 text-danger transition-colors"
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
        )}
      </Card>

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
