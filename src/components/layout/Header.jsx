import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { formatKolkataDateTime, getKolkataTodayString, formatKolkataDate } from '../../utils/dates';
import { getCustomers } from '../../services/customerService';
import { getOverdueFollowUps, getTodayFollowUps } from '../../services/followUpService';
import { LeadCategoryBadge } from '../ui/Badge';
import {
  Menu,
  Search,
  UserPlus,
  Bell,
  Clock,
  Phone,
  ArrowRight,
  X,
} from 'lucide-react';

export function Header({
  pageTitle = 'Dashboard',
  breadcrumbs = ['Home'],
  onOpenAddCustomer,
  onToggleMobileSidebar,
}) {
  const navigate = useNavigate();
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const searchRef = useRef(null);
  const notifRef = useRef(null);

  // Live Kolkata Clock
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      const formatted = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(now);
      setCurrentDateTime(formatted);
    }
    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fetch pending follow-up notifications
  useEffect(() => {
    async function fetchNotifs() {
      try {
        const [todayTasks, overdueTasks] = await Promise.all([
          getTodayFollowUps(),
          getOverdueFollowUps(),
        ]);
        const list = [
          ...overdueTasks.map(t => ({ ...t, type: 'overdue' })),
          ...todayTasks.map(t => ({ ...t, type: 'today' })),
        ];
        setNotifications(list);
      } catch (e) {
        // Silent
      }
    }
    fetchNotifs();
  }, []);

  // Handle global search input
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await getCustomers({ search: searchQuery.trim(), limitCount: 8 });
        setSearchResults(results);
        setShowSearchDropdown(true);
      } catch (e) {
        console.error('Global search error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-30 bg-paper-white/95 backdrop-blur-md border-b-2 border-border px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden p-2 rounded-lg border-2 border-border bg-white shadow-hand-sm hover:bg-muted"
            title="Open Menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-body text-foreground/60">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span>/</span>}
                  <span className={idx === breadcrumbs.length - 1 ? 'font-bold text-foreground' : ''}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground leading-tight">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden sm:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/50" />
            <input
              type="text"
              placeholder="Search by name, phone, GC-ID, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
              className="input-hand w-full pl-9 pr-8 py-1.5 text-sm bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-paper-white card-hand border-2 border-border p-2 z-50 max-h-80 overflow-y-auto shadow-hand-lg">
              <div className="text-xs font-heading font-bold text-foreground/60 px-2 py-1 border-b border-border/30 mb-1">
                Matching Customers ({searchResults.length})
              </div>

              {searchResults.length === 0 ? (
                <div className="p-3 text-center text-sm font-body text-foreground/60">
                  {isSearching ? 'Searching database...' : 'No customers match your search.'}
                </div>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        navigate(`/leads/${cust.id}`);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="p-2 rounded-md hover:bg-sticky-yellow cursor-pointer border border-transparent hover:border-border transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
                          <span>{cust.fullName}</span>
                          <span className="text-xs font-mono font-normal bg-muted px-1.5 rounded">
                            {cust.customerId}
                          </span>
                        </div>
                        <div className="text-xs font-body text-foreground/70 flex items-center gap-2 mt-0.5">
                          <span>📞 {cust.phone}</span>
                          {cust.requirement && <span>• {cust.requirement}</span>}
                        </div>
                      </div>
                      <LeadCategoryBadge category={cust.leadCategory} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Date Clock, Alerts, Quick Add Button */}
        <div className="flex items-center gap-3">
          {/* Kolkata Clock */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-stone-100 border border-border/40 text-xs font-body text-foreground font-semibold">
            <Clock className="w-3.5 h-3.5 text-secondary-accent shrink-0" />
            <span>{currentDateTime || 'Kanpur, India'}</span>
          </div>

          {/* Notifications Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-lg border-2 border-border bg-white shadow-hand-sm hover:bg-stone-100"
              title="Follow-up Reminders"
            >
              <Bell className="w-5 h-5 text-foreground stroke-[2]" />
              {notifications.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-accent text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border border-border shadow-sm">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-paper-white card-hand border-2 border-border p-3 z-50 shadow-hand-lg">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                  <span className="font-heading font-bold text-sm text-foreground">
                    Action Reminders ({notifications.length})
                  </span>
                  <button
                    onClick={() => {
                      navigate('/followups/today');
                      setShowNotifications(false);
                    }}
                    className="text-xs text-secondary-accent hover:underline font-bold"
                  >
                    View All
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-foreground/60">
                    No overdue or pending follow-ups today! 🎉
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.customerId) navigate(`/leads/${n.customerId}`);
                          setShowNotifications(false);
                        }}
                        className={`p-2 rounded border cursor-pointer hover:bg-stone-50 transition-colors ${
                          n.type === 'overdue' ? 'border-danger/50 bg-red-50/50' : 'border-border/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-heading font-bold text-xs text-foreground">
                            {n.customerNameSnapshot}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                              n.type === 'overdue' ? 'bg-danger text-white' : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {n.type === 'overdue' ? 'OVERDUE' : 'TODAY'}
                          </span>
                        </div>
                        <div className="text-xs text-foreground/70 mt-0.5 truncate">
                          {n.purpose || 'Follow-up Call'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Add Customer */}
          <Button
            variant="primary"
            icon={UserPlus}
            size="md"
            onClick={onOpenAddCustomer}
            className="hidden sm:inline-flex"
          >
            Add Customer
          </Button>
        </div>
      </div>
    </header>
  );
}
