import React, { memo, useEffect, useMemo, useState } from 'react';
import {
  Home,
  Clock,
  Heart,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Tag,
  FileText,
  Sparkles,
  Menu,
  X,
  User,
  Moon,
  Sun,
} from 'lucide-react';
import type { Page, ViewMode } from '../types';

interface SidebarProps {
  pages: Page[];
  activeView: ViewMode;
  activePageId: string | null;
  currentUserName: string;
  currentUserProfilePictureUrl: string;
  onNavigate: (view: ViewMode, pageId?: string) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
  isDark: boolean;
  onToggleDark: () => void;
}

function Sidebar({
  pages,
  activeView,
  activePageId,
  currentUserName,
  currentUserProfilePictureUrl,
  onNavigate,
  onAddPage,
  onDeletePage,
  isDark,
  onToggleDark,
}: SidebarProps) {
  const [pagesExpanded, setPagesExpanded] = useState(true);
  const [hoveredPage, setHoveredPage] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);

  const profileAvatarSrc = useMemo(() => {
    const trimmed = currentUserProfilePictureUrl.trim();
    if (!trimmed) return '';
    if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return `https://${trimmed}`;
  }, [currentUserProfilePictureUrl]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [profileAvatarSrc]);

  const navItem = (
    icon: React.ReactNode,
    label: string,
    active: boolean,
    onClick: () => void
  ) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group ${
        active
          ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
      }`}
    >
      <span className={`flex-shrink-0 ${active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );

  const sidebar = (
    <aside className="w-full sm:w-64 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-700 flex flex-col h-full sm:sticky sm:top-0">
      {/* Brand */}
      <div className="px-4 py-4 sm:py-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
        <button
          onClick={() => { onNavigate('home'); setMobileOpen(false); }}
          className="flex items-center gap-3 flex-1 text-left rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Go to home"
        >
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight">Nexora</h1>
            <p className="text-xs text-slate-400 dark:text-slate-500">Your shopping workspace</p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleDark}
            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Light mode' : 'Dark mode'}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="sm:hidden p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItem(
          <Home size={16} />,
          'Home',
          activeView === 'home',
          () => { onNavigate('home'); setMobileOpen(false); }
        )}
        {navItem(
          <Clock size={16} />,
          'Recents',
          activeView === 'recents',
          () => { onNavigate('recents'); setMobileOpen(false); }
        )}
        {navItem(
          <Heart size={16} />,
          'Favorites',
          activeView === 'favorites',
          () => { onNavigate('favorites'); setMobileOpen(false); }
        )}

        <div className="pt-2 sm:pt-3 pb-1">
          <div className="h-px bg-slate-100" />
        </div>

        {/* My Pages */}
        <div>
          <button
            onClick={() => setPagesExpanded(!pagesExpanded)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <span>My Pages</span>
            {pagesExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>

          {pagesExpanded && (
            <div className="mt-1 space-y-0.5">
              {pages.map(page => (
                <div
                  key={page.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredPage(page.id)}
                  onMouseLeave={() => setHoveredPage(null)}
                >
                  <button
                    onClick={() => { onNavigate('page', page.id); setMobileOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                      activeView === 'page' && activePageId === page.id
                        ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
                    }`}
                  >
                    <span className="text-base leading-none">{page.icon}</span>
                    <span className="flex-1 text-left truncate">{page.name}</span>
                  </button>
                  {hoveredPage === page.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeletePage(page.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={onAddPage}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-150"
              >
                <Plus size={14} />
                <span>Add a page</span>
              </button>
            </div>
          )}
        </div>

        <div className="pt-2 sm:pt-3 pb-1">
          <div className="h-px bg-slate-100" />
        </div>

        {/* Quick Info */}
        <div className="px-3 pt-1 hidden sm:block">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Quick Info</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <Tag size={11} />
              <span>Filter by tag on home</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500">
              <FileText size={11} />
              <span>Pages group products</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-700 space-y-2">
        <button
          onClick={() => { onNavigate('workspace'); setMobileOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
            activeView === 'workspace' || activeView === 'goals'
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <span className={`flex-shrink-0 ${
            activeView === 'workspace' || activeView === 'goals'
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}>
            <LayoutGrid size={14} />
          </span>
          <span className="flex-1 text-left">Workspace</span>
        </button>

        <button
          onClick={() => { onNavigate('monthly-expenses'); setMobileOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
            activeView === 'monthly-expenses'
              ? 'bg-[#7C4DFF] text-white'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
          }`}
        >
          <span className={`flex-shrink-0 ${activeView === 'monthly-expenses' ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            <FileText size={14} />
          </span>
          <span className="flex-1 text-left">Monthly Expenses</span>
        </button>

        <button
          onClick={() => { onNavigate('price-tracker'); setMobileOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
            activeView === 'price-tracker'
              ? 'bg-[#3CC7E6] text-white'
              : 'bg-[#4DDAFF] text-slate-800 hover:bg-[#3CC7E6]'
          }`}
        >
          <span className={`flex-shrink-0 ${activeView === 'price-tracker' ? 'text-white' : 'text-slate-800'}`}>
            <Tag size={14} />
          </span>
          <span className="flex-1 text-left">Price Tracker</span>
        </button>

        <button
          onClick={() => { onNavigate('profile'); setMobileOpen(false); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 ${
            activeView === 'profile'
              ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100'
          }`}
        >
          <span className={`flex-shrink-0 ${activeView === 'profile' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'}`}>
            {profileAvatarSrc && !avatarLoadError ? (
              <img
                src={profileAvatarSrc}
                alt="Profile avatar"
                onError={() => setAvatarLoadError(true)}
                className="w-7 h-7 rounded-full object-cover"
              />
            ) : currentUserName.trim() ? (
              <span className="inline-flex w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-200 items-center justify-center">
                {currentUserName.trim().slice(0, 1).toUpperCase()}
              </span>
            ) : (
              <User size={16} />
            )}
          </span>
          <span className="flex-1 text-left">Profile</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="sm:hidden fixed bottom-6 right-6 z-40 p-3 bg-amber-400 hover:bg-amber-500 text-white rounded-full shadow-lg transition-all"
      >
        <Menu size={20} />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="sm:hidden fixed inset-0 z-30 bg-slate-900/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed sm:relative inset-y-0 left-0 z-30 sm:z-auto transition-transform duration-300 max-h-screen overflow-hidden flex-col flex ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        {sidebar}
      </div>
    </>
  );
}

export default memo(Sidebar);

