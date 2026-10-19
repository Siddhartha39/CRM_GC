import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { getCustomers } from '../../services/customerService';
import { getOverdueFollowUps, getTodayFollowUps } from '../../services/followUpService';
import { LeadCategoryBadge } from '../ui/Badge';
import {
  Menu,
  Search,
  UserPlus,
  Bell,
  Clock,
  X,
  ChevronRight,
} from 'lucide-react';

/**
 * Neumorphic Soft UI Header
 * Sticky monochromatic header with backdrop blur, deep inset search, and tactile action wells.
 */
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
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md px-4 sm:px-6 py-3.5 transition-all">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto">
        {/* Left: Mobile Toggle & Breadcrumbs */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden w-11 h-11 rounded-2xl bg-background shadow-neu-flat hover:shadow-neu-flat-hover active:shadow-neu-pressed-sm flex items-center justify-center text-foreground transition-all focus:outline-none focus:ring-2 focus:ring-accent"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs font-display font-medium text-muted tracking-wide truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight className="w-3 h-3 text-muted/60 shrink-0" />}
                  <span className={idx === breadcrumbs.length - 1 ? 'font-bold text-foreground' : ''}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <h1 className="text-xl sm:text-2xl font-display font-extrabold text-foreground tracking-tight leading-tight truncate">
              {pageTitle}
            </h1>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, phone, GC-ID, product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setShowSearchDropdown(true)}
              className="w-full bg-background text-foreground shadow-neu-pressed rounded-full pl-10 pr-9 py-2.5 text-sm font-body border-0 outline-none transition-all placeholder:text-muted/60 focus:shadow-neu-pressed-deep focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchDropdown && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-background shadow-neu-flat rounded-[24px] p-3 z-50 max-h-80 overflow-y-auto animate-in fade-in duration-200">
              <div className="text-xs font-display font-bold uppercase tracking-wider text-muted px-2 py-1 mb-1 border-b border-muted/20">
                Matching Customers ({searchResults.length})
              </div>

              {searchResults.length === 0 ? (
                <div className="p-4 text-center text-sm font-body text-muted">
                  {isSearching ? 'Searching database...' : 'No customers match your search.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {searchResults.map((cust) => (
                    <div
                      key={cust.id}
                      onClick={() => {
                        navigate(`/leads/${cust.id}`);
                        setShowSearchDropdown(false);
                        setSearchQuery('');
                      }}
                      className="p-2.5 rounded-xl hover:shadow-neu-pressed-sm cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                          <span>{cust.fullName}</span>
                          <span className="text-[11px] font-mono font-medium text-muted bg-background shadow-neu-pressed-sm px-1.5 py-0.5 rounded-md">
                            {cust.customerId}
                          </span>
                        </div>
                        <div className="text-xs font-body text-muted flex items-center gap-2 mt-0.5">
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
        <div className="flex items-center gap-3 shrink-0">
          {/* Kolkata Clock */}
          <div className="hidden xl:flex items-center gap-2 px-3.5 py-2 rounded-full bg-background shadow-neu-pressed-sm text-xs font-body text-muted font-medium">
            <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
            <span>{currentDateTime || 'Kanpur, India'}</span>
          </div>

          {/* Notifications Bell */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative w-11 h-11 rounded-2xl bg-background shadow-neu-flat hover:shadow-neu-flat-hover active:shadow-neu-pressed-sm flex items-center justify-center text-foreground transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-accent"
              title="Follow-up Reminders"
            >
              <Bell className="w-5 h-5 text-foreground stroke-[2]" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center shadow-md">
                  {notifications.length}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-background shadow-neu-flat rounded-[28px] p-4 z-50 animate-in fade-in duration-200">
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-muted/20">
                  <span className="font-display font-bold text-sm text-foreground">
                    Action Reminders ({notifications.length})
                  </span>
                  <button
                    onClick={() => {
                      navigate('/followups/today');
                      setShowNotifications(false);
                    }}
                    className="text-xs text-accent hover:underline font-bold"
                  >
                    View All
                  </button>
                </div>

                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted">
                    No overdue or pending follow-ups today! 🎉
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {notifications.slice(0, 5).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (n.customerId) navigate(`/leads/${n.customerId}`);
                          setShowNotifications(false);
                        }}
                        className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                          n.type === 'overdue'
                            ? 'shadow-neu-pressed-sm text-danger'
                            : 'shadow-neu-flat-sm hover:shadow-neu-pressed-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-xs text-foreground truncate">
                            {n.customerNameSnapshot}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              n.type === 'overdue' ? 'bg-danger text-white' : 'bg-amber-500 text-white'
                            }`}
                          >
                            {n.type === 'overdue' ? 'OVERDUE' : 'TODAY'}
                          </span>
                        </div>
                        <div className="text-xs text-muted mt-0.5 truncate">
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
