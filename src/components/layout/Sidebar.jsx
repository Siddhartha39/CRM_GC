import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Flame,
  Zap,
  Snowflake,
  CalendarCheck,
  CalendarClock,
  AlertTriangle,
  PhoneCall,
  FileSpreadsheet,
  BarChart3,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { getTodayFollowUps, getOverdueFollowUps } from '../../services/followUpService';

export function Sidebar({ isOpen, setIsOpen, isMobile, setIsMobileOpen }) {
  const { user, userProfile, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [todayCount, setTodayCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  useEffect(() => {
    async function loadCounters() {
      try {
        const todayTasks = await getTodayFollowUps();
        const overdueTasks = await getOverdueFollowUps();
        setTodayCount(todayTasks.length);
        setOverdueCount(overdueTasks.length);
      } catch (e) {
        // Silent fail
      }
    }
    loadCounters();
    const interval = setInterval(loadCounters, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'All Leads', path: '/leads', icon: Users },
    { name: 'Hot Leads', path: '/leads/hot', icon: Flame, color: 'text-accent' },
    { name: 'Warm Leads', path: '/leads/warm', icon: Zap, color: 'text-warning' },
    { name: 'Cold Leads', path: '/leads/cold', icon: Snowflake, color: 'text-secondary-accent' },
    {
      name: "Today's Follow-ups",
      path: '/followups/today',
      icon: CalendarCheck,
      badge: todayCount,
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-600',
    },
    { name: 'Upcoming Follow-ups', path: '/followups/upcoming', icon: CalendarClock },
    {
      name: 'Overdue Follow-ups',
      path: '/followups/overdue',
      icon: AlertTriangle,
      badge: overdueCount,
      badgeColor: 'bg-red-100 text-danger border-danger font-bold animate-pulse',
    },
    { name: 'Call History', path: '/calls', icon: PhoneCall },
    { name: 'Import / Export', path: '/import-export', icon: FileSpreadsheet },
    { name: 'Reports', path: '/reports', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeDrawerOnMobile = () => {
    if (isMobile && setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 bg-paper-white border-r-2 border-border transition-all duration-200 flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      } ${isMobile ? 'shadow-2xl' : ''}`}
    >
      {/* Brand Header */}
      <div className="p-4 border-b-2 border-dashed border-border/40 flex items-center justify-between">
        <NavLink
          to="/"
          onClick={closeDrawerOnMobile}
          className="flex items-center gap-3 overflow-hidden text-left"
        >
          <img
            src="/logo.svg"
            alt="Galaxy Computers Logo"
            className="w-10 h-10 shrink-0 border-2 border-border p-1 rounded-lg bg-sticky-yellow shadow-hand-sm"
          />
          {isOpen && (
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg text-foreground leading-tight">
                Galaxy Computers
              </span>
              <span className="text-xs font-body text-secondary-accent font-semibold tracking-wider">
                CRM • KANPUR
              </span>
            </div>
          )}
        </NavLink>

        {!isMobile && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1.5 rounded-md border border-border/60 hover:bg-muted text-foreground transition-colors shrink-0"
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeDrawerOnMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-base font-body border-2 transition-all ${
                  isActive
                    ? 'bg-sticky-yellow border-border shadow-hand-sm font-bold text-foreground'
                    : 'border-transparent text-foreground/80 hover:bg-stone-100 hover:border-border/40'
                } ${!isOpen ? 'justify-center px-0' : ''}`
              }
              title={!isOpen ? item.name : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 stroke-[2] ${item.color || 'text-foreground'}`} />
              {isOpen && (
                <span className="flex-1 truncate">{item.name}</span>
              )}
              {isOpen && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t-2 border-dashed border-border/40 bg-stone-50">
        {isOpen ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-sticky-yellow border-2 border-border flex items-center justify-center font-heading font-bold text-sm text-foreground shrink-0 shadow-hand-sm">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-sm font-heading font-bold text-foreground truncate">
                  {userProfile?.displayName || user?.email?.split('@')[0]}
                </span>
                <span className="text-xs font-body text-foreground/70 flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-accent font-bold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-secondary-accent font-medium flex items-center gap-0.5">
                      <UserCheck className="w-3 h-3" /> Employee
                    </span>
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-foreground/70 hover:text-danger hover:bg-red-50 rounded-md border border-transparent hover:border-danger transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="p-2 text-foreground/70 hover:text-danger hover:bg-red-50 rounded-md border border-border/60 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
