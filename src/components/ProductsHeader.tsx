import { useState } from 'react';
import { Search, Plus, SlidersHorizontal, X, Tag } from 'lucide-react';
import type { Page } from '../types';
import { CATEGORIES } from '../types';

interface ProductsHeaderProps {
  title: string;
  subtitle: string;
  pages: Page[];
  onAddProduct: () => void;
  onSearch: (q: string) => void;
  onFilterCategory: (cat: string) => void;
  onFilterPage: (pageId: string) => void;
  onFilterTag: (tag: string) => void;
  activeCategory: string;
  activePage: string;
  activeTag: string;
  availableTags: string[];
  showPageFilter?: boolean;
}

export default function ProductsHeader({
  title,
  subtitle,
  pages,
  onAddProduct,
  onSearch,
  onFilterCategory,
  onFilterPage,
  onFilterTag,
  activeCategory,
  activePage,
  activeTag,
  availableTags,
  showPageFilter = false,
}: ProductsHeaderProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);

  const activeFiltersCount = (activeCategory ? 1 : 0) + (activePage ? 1 : 0) + (activeTag ? 1 : 0);

  return (
    <div className="bg-white border-b border-slate-100 px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 truncate">{title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 truncate">{subtitle}</p>
          </div>
          <button
            onClick={onAddProduct}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-amber-400 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors shadow-sm flex-shrink-0"
          >
            <Plus size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {/* Search and Filter Row */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="sm:w-3.5 sm:h-3.5 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search..."
              onChange={e => onSearch(e.target.value)}
              className="pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors flex-shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={13} className="sm:w-3.5 sm:h-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 bg-amber-400 text-white text-xs rounded-full flex items-center justify-center ml-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-100">
            {/* Category filter */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-slate-400">Category:</span>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onFilterCategory('')}
                  className={`text-xs px-2 sm:px-3 py-1 rounded-full border transition-colors ${
                    !activeCategory ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                  }`}
                >
                  All
                </button>
                {CATEGORIES.slice(0, 5).map(c => (
                  <button
                    key={c}
                    onClick={() => onFilterCategory(c === activeCategory ? '' : c)}
                    className={`text-xs px-2 sm:px-3 py-1 rounded-full border transition-colors ${
                      activeCategory === c ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                    }`}
                  >
                    {c.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Page filter */}
            {showPageFilter && pages.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-400">Page:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => onFilterPage('')}
                    className={`text-xs px-2 sm:px-3 py-1 rounded-full border transition-colors ${
                      !activePage ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                    }`}
                  >
                    All
                  </button>
                  {pages.map(p => (
                    <button
                      key={p.id}
                      onClick={() => onFilterPage(p.id === activePage ? '' : p.id)}
                      className={`text-xs px-2 sm:px-3 py-1 rounded-full border transition-colors ${
                        activePage === p.id ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                      }`}
                    >
                      {p.icon}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tag filter */}
            {availableTags.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-slate-400">Tags:</span>
                <div className="relative">
                  <button
                    onClick={() => setShowTagDropdown(!showTagDropdown)}
                    className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors w-full text-left"
                  >
                    <Tag size={12} />
                    <span className="flex-1">{activeTag ? `Tag: ${activeTag}` : 'Select a tag...'}</span>
                  </button>
                  {showTagDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                      <button
                        onClick={() => {
                          onFilterTag('');
                          setShowTagDropdown(false);
                        }}
                        className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-100 transition-colors ${!activeTag ? 'bg-amber-50' : ''}`}
                      >
                        Clear Tag Filter
                      </button>
                      {availableTags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => {
                            onFilterTag(tag === activeTag ? '' : tag);
                            setShowTagDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-100 transition-colors flex items-center gap-2 ${
                            activeTag === tag ? 'bg-amber-50 font-semibold' : ''
                          }`}
                        >
                          <Tag size={10} />
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeFiltersCount > 0 && (
              <button
                onClick={() => {
                  onFilterCategory('');
                  onFilterPage('');
                  onFilterTag('');
                }}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors self-start"
              >
                <X size={12} /> Clear All
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

