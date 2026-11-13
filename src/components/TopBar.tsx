import React from 'react';
import { BarChart3, MessageSquare, Newspaper, History, PlusCircle, UploadCloud } from 'lucide-react';

export type AppTab = 'analyze' | 'news' | 'chat' | 'history' | 'github';

interface TopBarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  onNewAnalysis: () => void;
  historyCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  onNewAnalysis,
  historyCount,
}) => {
  const navItems: { id: AppTab; label: string; icon: React.ReactNode }[] = [
    { id: 'analyze', label: 'تحلیل چارت', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'news', label: 'اخبار و بازار', icon: <Newspaper className="w-4 h-4" /> },
    { id: 'chat', label: 'چت هوشمند', icon: <MessageSquare className="w-4 h-4" /> },
    {
      id: 'history',
      label: historyCount > 0 ? `تاریخچه (${historyCount})` : 'تاریخچه',
      icon: <History className="w-4 h-4" />,
    },
    { id: 'github', label: 'گیت‌هاب و کلودفلر', icon: <UploadCloud className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#060913]/95 backdrop-blur-md border-b border-slate-800/80 no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('analyze')}
          className="text-lg font-extrabold tracking-tight text-slate-100 hover:text-blue-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          dir="ltr"
        >
          CRYPTO <span className="text-blue-500">SCOPE</span> AI
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative flex items-center gap-2 py-2 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'text-blue-400'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 inset-x-0 h-0.5 bg-gradient-to-l from-blue-500 to-purple-500 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onNewAnalysis}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <PlusCircle className="w-4 h-4" />
            <span>تحلیل جدید</span>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Row */}
      <div className="md:hidden border-t border-slate-800/70 px-3 py-1.5 flex items-center justify-around gap-1 bg-[#080d1a]">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-slate-800/80 text-blue-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
