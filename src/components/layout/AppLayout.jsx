import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AddCustomerModal } from '../../features/customers/AddCustomerModal';
import { isStandbyMode } from '../../services/storageAdapter';
import { AlertCircle, ExternalLink, X } from 'lucide-react';

export function AppLayout() {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [showStandbyNotice, setShowStandbyNotice] = useState(false);

  useEffect(() => {
    setShowStandbyNotice(isStandbyMode());

    const handleStandbyChange = (e) => {
      setShowStandbyNotice(e.detail?.active || isStandbyMode());
    };
    window.addEventListener('galaxy-standby-mode-changed', handleStandbyChange);
    return () => window.removeEventListener('galaxy-standby-mode-changed', handleStandbyChange);
  }, []);

  // Derive page title and breadcrumbs from pathname
  const getPageInfo = (path) => {
    if (path === '/') return { title: 'CRM Dashboard', breadcrumbs: ['Galaxy Computers', 'Dashboard'] };
    if (path === '/leads') return { title: 'All Leads Database', breadcrumbs: ['Master Database', 'All Leads'] };
    if (path === '/leads/hot') return { title: '🔥 Hot Leads', breadcrumbs: ['Leads', 'Hot Leads'] };
    if (path === '/leads/warm') return { title: '⚡ Warm Leads', breadcrumbs: ['Leads', 'Warm Leads'] };
    if (path === '/leads/cold') return { title: '❄️ Cold Leads', breadcrumbs: ['Leads', 'Cold Leads'] };
    if (path === '/followups/today') return { title: "📅 Today's Follow-ups", breadcrumbs: ['Follow-ups', 'Today'] };
    if (path === '/followups/upcoming') return { title: 'Upcoming Follow-ups', breadcrumbs: ['Follow-ups', 'Upcoming'] };
    if (path === '/followups/overdue') return { title: '⚠️ Overdue Follow-ups', breadcrumbs: ['Follow-ups', 'Overdue'] };
    if (path === '/followups/completed') return { title: 'Completed Follow-ups', breadcrumbs: ['Follow-ups', 'Completed'] };
    if (path === '/followups/calendar') return { title: 'Follow-up Calendar', breadcrumbs: ['Follow-ups', 'Calendar'] };
    if (path === '/calls') return { title: 'Customer Calling History', breadcrumbs: ['Calling', 'Call Logs'] };
    if (path === '/import-export') return { title: 'Import & Export Leads', breadcrumbs: ['Tools', 'Import / Export'] };
    if (path === '/reports') return { title: 'Analytics & Reports', breadcrumbs: ['Insights', 'Reports'] };
    if (path === '/settings') return { title: 'Shop & System Settings', breadcrumbs: ['System', 'Settings'] };
    if (path.startsWith('/leads/')) return { title: 'Customer Profile', breadcrumbs: ['Leads', 'Customer Profile'] };

    return { title: 'Galaxy Computers CRM', breadcrumbs: ['Home'] };
  };

  const { title, breadcrumbs } = getPageInfo(location.pathname);

  // Responsive sidebar handling
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-paper-dots flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          isMobile={false}
        />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-foreground/50 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <Sidebar
            isOpen={true}
            setIsOpen={() => {}}
            isMobile={true}
            setIsMobileOpen={setMobileSidebarOpen}
          />
        </div>
      )}

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-200 ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-20'
        } min-w-0`}
      >
        <Header
          pageTitle={title}
          breadcrumbs={breadcrumbs}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />

        {/* Cloud Firestore Standby Banner */}
        {showStandbyNotice && (
          <div className="bg-amber-100 border-b-2 border-amber-600 px-4 py-2.5 text-xs font-body text-amber-950 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Cloud Firestore Standby Mode:</strong> Firestore Database is not yet created in Firebase project <code>galaxycrm-4577f</code>. Data is being safely saved to local standby storage.
              </span>
              <a
                href="https://console.firebase.google.com/project/galaxycrm-4577f/firestore"
                target="_blank"
                rel="noreferrer"
                className="underline font-bold text-secondary-accent inline-flex items-center gap-0.5 ml-1"
              >
                Create Firestore Database in Console <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <button
              onClick={() => setShowStandbyNotice(false)}
              className="p-1 hover:bg-amber-200 rounded text-amber-900"
              title="Dismiss banner"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet context={{ onOpenAddCustomer: () => setIsAddCustomerOpen(true) }} />
        </main>
      </div>

      {/* Global Add Customer Modal */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerAdded={() => {
          window.dispatchEvent(new CustomEvent('crm-customer-added'));
        }}
      />
    </div>
  );
}
