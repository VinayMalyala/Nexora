import React, { useState } from 'react';
import {
  Home,
  Clock,
  Heart,
  ChevronDown,
  ChevronRight,
  Plus,
  Trash2,
  Tag,
  FileText,
  Sparkles,
  Menu,
  X,
} from 'lucide-react';
import type { Page, ViewMode } from '../types';

interface SidebarProps {
  pages: Page[];
  activeView: ViewMode;
  activePageId: string | null;
  onNavigate: (view: ViewMode, pageId?: string) => void;
  onAddPage: () => void;
  onDeletePage: (id: string) => void;
}

export default function Sidebar({
  pages,
  activeView,
  activePageId,
  onNavigate,
  onAddPage,
  onDeletePage,
}: SidebarProps) {
  const [pagesExpanded, setPagesExpanded] = useState(true);
  const [hoveredPage, setHoveredPage] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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
          ? 'bg-amber-50 text-amber-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
      }`}
    >
      <span className={`flex-shrink-0 ${active ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );

  const sidebar = (
    <aside className="w-full sm:w-64 flex-shrink-0 bg-white border-r border-slate-100 flex flex-col h-full sm:sticky sm:top-0">
      {/* Brand */}
      <div className="px-4 py-4 sm:py-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <Sparkles size={16} className="sm:w-[18px] sm:h-[18px] text-white" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-base font-bold text-slate-800 leading-tight">Nexora</h1>
            <p className="text-xs text-slate-400">Your wishlist</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="sm:hidden p-1 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation */}
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
            className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
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
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-150"
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
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Info</p>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Tag size={11} />
              <span>Filter by tag on home</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <FileText size={11} />
              <span>Pages group products</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-slate-100">
        <p className="text-xs text-slate-300 text-center">Personal Price Tracker</p>
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
        className={`fixed sm:relative inset-y-0 left-0 z-30 sm:z-auto transition-transform duration-300 max-h-screen overflow-hidden flex-col hidden sm:flex ${
          mobileOpen ? 'translate-x-0 flex' : '-translate-x-full sm:translate-x-0'
        }`}
      >
        {sidebar}
      </div>
    </>
  );
}

