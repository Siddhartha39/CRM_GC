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

/**
 * Neumorphic Soft UI Sidebar
 * Molded seamless navigation drawer with tactile active wells and monochromatic discipline.
 */
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
    const interval = setInterval(loadCounters, 60000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'All Leads', path: '/leads', icon: Users },
    { name: 'Hot Leads', path: '/leads/hot', icon: Flame, color: 'text-red-500' },
    { name: 'Warm Leads', path: '/leads/warm', icon: Zap, color: 'text-amber-500' },
    { name: 'Cold Leads', path: '/leads/cold', icon: Snowflake, color: 'text-blue-500' },
    {
      name: "Today's Follow-ups",
      path: '/followups/today',
      icon: CalendarCheck,
      badge: todayCount,
      badgeColor: 'bg-accent-secondary text-white',
    },
    { name: 'Upcoming Follow-ups', path: '/followups/upcoming', icon: CalendarClock },
    {
      name: 'Overdue Follow-ups',
      path: '/followups/overdue',
      icon: AlertTriangle,
      badge: overdueCount,
      badgeColor: 'bg-danger text-white animate-pulse',
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
      className={`fixed top-0 bottom-0 left-0 z-40 bg-background shadow-[5px_0_20px_rgba(163,177,198,0.5)] transition-all duration-300 flex flex-col ${
        isOpen ? 'w-64' : 'w-20'
      }`}
    >
      {/* Brand Header */}
      <div className="p-4 flex items-center justify-between border-b border-muted/15">
        <NavLink
          to="/"
          onClick={closeDrawerOnMobile}
          className="flex items-center gap-3 overflow-hidden text-left group"
        >
          {/* Logo in Inset Well */}
          <div className="w-11 h-11 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center p-2 shrink-0 transition-transform duration-300 group-hover:scale-105">
            <img
              src="/logo.svg"
              alt="Galaxy Computers Logo"
              className="w-full h-full object-contain"
            />
          </div>
          {isOpen && (
            <div className="flex flex-col min-w-0">
              <span className="font-display font-extrabold text-base text-foreground leading-tight tracking-tight truncate">
                Galaxy Computers
              </span>
              <span className="text-[11px] font-body text-accent font-bold tracking-wider uppercase mt-0.5">
                CRM • Kanpur
              </span>
            </div>
          )}
        </NavLink>

        {!isMobile && (
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat active:shadow-neu-pressed-sm flex items-center justify-center text-muted hover:text-foreground transition-all duration-200 shrink-0"
            title={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          >
            {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={closeDrawerOnMobile}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-body font-semibold transition-all duration-300 ${
                  isActive
                    ? 'shadow-neu-pressed text-accent bg-background'
                    : 'text-foreground/75 hover:shadow-neu-flat-sm hover:text-foreground hover:-translate-y-0.5'
                } ${!isOpen ? 'justify-center px-0' : ''}`
              }
              title={!isOpen ? item.name : undefined}
            >
              <Icon className={`w-5 h-5 shrink-0 stroke-[2] ${item.color || ''}`} />
              {isOpen && (
                <span className="flex-1 truncate">{item.name}</span>
              )}
              {isOpen && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${item.badgeColor}`}
                >
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile & Logout Footer */}
      <div className="p-3 border-t border-muted/15 bg-background">
        {isOpen ? (
          <div className="flex items-center justify-between p-2 rounded-2xl shadow-neu-pressed-sm">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-background shadow-neu-pressed flex items-center justify-center font-display font-bold text-xs text-accent shrink-0">
                {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-display font-bold text-foreground truncate">
                  {userProfile?.displayName || user?.email?.split('@')[0]}
                </span>
                <span className="text-[11px] font-body text-muted flex items-center gap-1">
                  {isAdmin ? (
                    <span className="text-accent font-bold flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> Admin
                    </span>
                  ) : (
                    <span className="text-accent-secondary font-medium flex items-center gap-0.5">
                      <UserCheck className="w-3 h-3" /> Employee
                    </span>
                  )}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat hover:text-danger active:shadow-neu-pressed-sm flex items-center justify-center text-muted transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-2xl bg-background shadow-neu-flat-sm hover:shadow-neu-flat hover:text-danger active:shadow-neu-pressed-sm flex items-center justify-center text-muted transition-all"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
