import React from 'react';
import { Home, QrCode, History, User, Zap, Send, Cpu, Navigation, AlertOctagon, Bot, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type TabType = 'home' | 'network' | 'routes' | 'incidents' | 'assistant' | 'analytics' | 'send' | 'scan' | 'history' | 'profile';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  isOnline?: boolean;
  offlineQueueCount?: number;
}

export function Layout({ children, activeTab, onTabChange, isOnline = true, offlineQueueCount = 0 }: LayoutProps) {
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'network', label: 'Network Intel', icon: Cpu },
    { id: 'routes', label: 'Smart Routes', icon: Navigation },
    { id: 'incidents', label: 'Incidents', icon: AlertOctagon },
    { id: 'assistant', label: 'AI Assistant', icon: Bot },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'send', label: 'Send Money', icon: Send },
    { id: 'scan', label: 'Scan & Pay', icon: QrCode },
    { id: 'history', label: 'History', icon: History },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground dark">
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4 overflow-y-auto">
        <div className="flex items-center gap-3 px-2 py-4 mb-2">
          <div className="bg-primary/20 p-2 rounded-xl text-primary">
            <Zap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">MeshPay</h1>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">AI Powered</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as TabType)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-bold shadow-sm' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon size={18} className={isActive ? 'text-primary' : ''} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto p-4 bg-secondary/50 rounded-2xl border border-border mt-4">
          <p className="text-xs text-muted-foreground mb-1 font-medium">Network Status</p>
          <div className="flex items-center gap-2 text-xs font-bold">
            <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
            {isOnline ? 'Online & Synced' : 'Offline Mode Active'}
          </div>
          {!isOnline && offlineQueueCount > 0 && (
            <div className="mt-2 text-xs font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded-md inline-block">
              {offlineQueueCount} Packet{offlineQueueCount > 1 ? 's' : ''} Queued
            </div>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 relative overflow-y-auto pb-20 md:pb-0">
        {/* MOBILE TOP HEADER */}
        <header className="md:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-lg text-primary">
              <Zap size={20} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">MeshPay AI</h1>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
             <span className={`w-2 h-2 rounded-full animate-pulse ${isOnline ? 'bg-emerald-500' : 'bg-orange-500'}`}></span>
             <span className={isOnline ? 'text-emerald-500' : 'text-orange-500'}>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </header>

        <div className="absolute top-0 left-0 right-0 h-[300px] bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
        <div className="p-4 md:p-8 max-w-5xl mx-auto h-full min-h-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 py-1 pb-safe z-50 overflow-x-auto">
        <div className="flex items-center justify-around min-w-full">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as TabType)}
                className={`flex flex-col items-center justify-center p-2 min-w-[56px] transition-colors ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <Icon size={18} />
                <span className="text-[9px] font-semibold mt-0.5">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
