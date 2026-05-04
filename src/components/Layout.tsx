import React, { createContext, useContext, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  BarChart3, 
  FilePlus2, 
  GitBranch, 
  Settings as SettingsIcon, 
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const LayoutContext = createContext({
  isSidebarDisabled: false,
  setSidebarDisabled: (disabled: boolean) => {}
});

export const useLayoutContext = () => useContext(LayoutContext);

export const Layout: React.FC = () => {
  const location = useLocation();
  const user = auth.currentUser;
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isSidebarDisabled, setSidebarDisabled] = React.useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'New Pipeline', path: '/new', icon: FilePlus2 },
    { name: 'Integrations', path: '/settings', icon: GitBranch },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <LayoutContext.Provider value={{ isSidebarDisabled, setSidebarDisabled }}>
      <div className="flex h-screen bg-suse-dark text-gray-100 overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "border-r border-suse-pine/10 bg-suse-jungle/20 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out z-20 relative",
          isSidebarOpen ? "w-64" : "w-20",
          isSidebarDisabled && "opacity-50 grayscale pointer-events-none"
        )}>
          {isSidebarDisabled && (
            <div className="absolute inset-0 z-50 cursor-not-allowed" title="Please finish your current task first" />
          )}
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="p-1.5 bg-white/5 rounded-xl border border-white/10 shadow-inner group-hover:border-suse-pine/30 transition-colors">
                <img 
                  src="/suse-logo.svg" 
                  alt="SUSE Logo" 
                  className="w-8 h-8 flex-shrink-0 drop-shadow-[0_0_8px_rgba(12,186,114,0.2)]"
                  referrerPolicy="no-referrer"
                />
              </div>
              {isSidebarOpen && (
                <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent whitespace-nowrap">
                  SUSE DocEngine
                </h1>
              )}
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4">
            {menuItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                title={!isSidebarOpen ? item.name : ""}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                  location.pathname === item.path 
                    ? "bg-suse-pine/10 text-suse-pine" 
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
                {location.pathname === item.path && (
                  <div className={cn(
                    "absolute rounded-full bg-suse-pine",
                    isSidebarOpen ? "right-3 w-1 h-1" : "right-2 w-1.5 h-1.5"
                  )} />
                )}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-suse-pine/10">
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg bg-white/5 overflow-hidden",
              !isSidebarOpen && "justify-center px-0"
            )}>
              <img 
                src={user?.photoURL || `https://ui-avatars.com/api/?name=${user?.email}`} 
                alt="Avatar" 
                className="w-8 h-8 rounded-full border border-suse-pine/20 flex-shrink-0"
              />
              {isSidebarOpen && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.displayName || 'User'}</p>
                    <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => auth.signOut()}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <LogOut size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          {/* Topbar */}
          <header className={cn(
            "h-16 border-b border-suse-pine/10 flex items-center justify-between px-4 bg-suse-dark/50 backdrop-blur-md z-10",
            isSidebarDisabled && "pointer-events-none opacity-80 grayscale"
          )}>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                aria-label="Toggle Sidebar"
              >
                {!isSidebarOpen ? <Menu size={20} /> : <X size={20} />}
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-400 overflow-hidden">
                <span className="hidden sm:inline">SUSE DocEngine</span>
                <ChevronRight size={14} className="hidden sm:inline" />
                <span className="text-gray-200 capitalize truncate">
                  {location.pathname === '/' ? 'Overview' : location.pathname.split('/')[1]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-suse-pine/10 border border-suse-pine/20">
                <div className="w-2 h-2 rounded-full bg-suse-pine animate-pulse" />
                <span className="text-xs font-mono text-suse-pine uppercase tracking-wider">System Online</span>
              </div>
            </div>
          </header>

          {isSidebarDisabled && (
            <div className="absolute top-0 inset-x-0 h-16 z-20 cursor-not-allowed" title="Please finish your current task first" />
          )}

          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <Outlet />
          </div>
        </main>
      </div>
    </LayoutContext.Provider>
  );
};
