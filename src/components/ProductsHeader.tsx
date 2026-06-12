import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Plus, SlidersHorizontal, X, Tag, ChevronDown, Check } from 'lucide-react';
import type { Page } from '../types';
import { CATEGORIES } from '../types';

type SortMode = 'default' | 'name-asc' | 'price-low-high' | 'price-high-low';

interface ProductsHeaderProps {
  title: string;
  subtitle: string;
  pages: Page[];
  onAddProduct: () => void;
  onSearch: (q: string) => void;
  sortMode: SortMode;
  onSortChange: (mode: SortMode) => void;
  onApplyFilters: (filters: {
    category: string;
    pageId: string;
    tag: string;
    company: string;
  }) => void;
  activeCategory: string;
  activePage: string;
  activeTag: string;
  activeCompany: string;
  availableTags: string[];
  availableCompanies: string[];
  showPageFilter?: boolean;
}

function ProductsHeader({
  title,
  subtitle,
  pages,
  onAddProduct,
  onSearch,
  sortMode,
  onSortChange,
  onApplyFilters,
  activeCategory,
  activePage,
  activeTag,
  activeCompany,
  availableTags,
  availableCompanies,
  showPageFilter = false,
}: ProductsHeaderProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(activeCategory);
  const [pendingPage, setPendingPage] = useState(activePage);
  const [pendingTag, setPendingTag] = useState(activeTag);
  const [pendingCompany, setPendingCompany] = useState(activeCompany);
  const [companyQuery, setCompanyQuery] = useState('');
  const [tagQuery, setTagQuery] = useState('');
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'default', label: 'Sort' },
    { value: 'name-asc', label: 'A-Z' },
    { value: 'price-low-high', label: 'Low to High' },
    { value: 'price-high-low', label: 'High-Low' },
  ];

  const activeSortLabel = useMemo(() => {
    if (sortMode === 'default') return 'Sort';
    return sortOptions.find(option => option.value === sortMode)?.label ?? 'Sort';
  }, [sortMode, sortOptions]);

  useEffect(() => {
    if (!showFilters) {
      return;
    }

    setPendingCategory(activeCategory);
    setPendingPage(activePage);
    setPendingTag(activeTag);
    setPendingCompany(activeCompany);
    setCompanyQuery('');
    setTagQuery('');
  }, [showFilters, activeCategory, activePage, activeTag, activeCompany]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!sortMenuRef.current?.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  const filteredTags = useMemo(() => {
    const q = tagQuery.trim().toLowerCase();
    if (!q) return availableTags;
    return availableTags.filter(tag => tag.toLowerCase().includes(q));
  }, [availableTags, tagQuery]);

  const filteredCompanies = useMemo(() => {
    const q = companyQuery.trim().toLowerCase();
    if (!q) {
      return availableCompanies;
    }

    return availableCompanies.filter(company => company.toLowerCase().includes(q));
  }, [availableCompanies, companyQuery]);

  const activeFiltersCount = (activeCategory ? 1 : 0) + (activePage ? 1 : 0) + (activeTag ? 1 : 0) + (activeCompany ? 1 : 0);

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 px-4 sm:px-6 lg:px-8 py-3 sm:py-5">
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h2>
            <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 mt-0.5 truncate">{subtitle}</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="relative w-full sm:flex-1 min-w-0">
            <Search size={13} className="sm:w-3.5 sm:h-3.5 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search..."
              onChange={e => onSearch(e.target.value)}
              className="pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-slate-100 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
          <div ref={sortMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setShowSortMenu(current => !current)}
              aria-label="Sort products"
              aria-expanded={showSortMenu}
              className="w-[118px] sm:w-[136px] h-9 sm:h-10 flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-slate-100 px-2.5 sm:px-3 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
            >
              <span className="truncate">{activeSortLabel}</span>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showSortMenu ? 'rotate-180' : ''}`} />
            </button>

            {showSortMenu && (
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 shadow-xl z-30">
                {sortOptions.map(option => {
                  const active = option.value === sortMode;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onSortChange(option.value);
                        setShowSortMenu(false);
                      }}
                      className={`w-full px-3 py-2.5 text-sm flex items-center justify-between transition-colors ${
                        active
                          ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <span>{option.label}</span>
                      {active ? <Check size={14} /> : null}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`h-9 sm:h-10 flex items-center gap-1.5 px-2.5 sm:px-3.5 text-xs sm:text-sm font-medium rounded-xl border transition-colors flex-shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <SlidersHorizontal size={13} className="sm:w-3.5 sm:h-3.5" />
              <span>Filter</span>
              {activeFiltersCount > 0 && (
                <span className="w-4 h-4 bg-amber-400 text-white text-xs rounded-full flex items-center justify-center ml-0.5">
                  {activeFiltersCount}
                </span>
              )}
            </button>
          </div>
          </div>
        </div>

        {showFilters && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setShowFilters(false)}
            />
            <div className="relative w-full max-w-3xl mx-4 sm:mx-6 mb-4 sm:mb-6 bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700">
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Filter products</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Choose one or more filters and apply them to the page.</p>
                </div>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Category</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setPendingCategory('')}
                      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                        !pendingCategory ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-amber-300'
                      }`}
                    >
                      All
                    </button>
                    {CATEGORIES.map(c => (
                      <button
                        key={c}
                        onClick={() => setPendingCategory(c === pendingCategory ? '' : c)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          pendingCategory === c ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-amber-300'
                        }`}
                      >
                        {c.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {showPageFilter && pages.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-400">Page</span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setPendingPage('')}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          !pendingPage ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                        }`}
                      >
                        All
                      </button>
                      {pages.map(p => (
                        <button
                          key={p.id}
                          onClick={() => setPendingPage(p.id === pendingPage ? '' : p.id)}
                          className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                            pendingPage === p.id ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                          }`}
                        >
                          {p.icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-400">Company</span>
                  {availableCompanies.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={companyQuery}
                          onChange={e => setCompanyQuery(e.target.value)}
                          placeholder="Search company..."
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPendingCompany('');
                            setCompanyQuery('');
                          }}
                          className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                            !pendingCompany ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                          }`}
                        >
                          All
                        </button>
                      </div>

                      <div className="h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                        {filteredCompanies.length > 0 ? (
                          filteredCompanies.map(company => (
                            <button
                              key={company}
                              type="button"
                              onClick={() => setPendingCompany(company === pendingCompany ? '' : company)}
                              className={`w-full px-3 py-2 text-xs text-left transition-colors ${
                                pendingCompany === company
                                  ? 'bg-amber-50 text-amber-700 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                              title={company}
                            >
                              <span className="block truncate">{company}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">No matching company found.</p>
                        )}
                      </div>

                      {pendingCompany && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Selected: <span className="font-medium text-slate-700 dark:text-slate-200">{pendingCompany}</span>
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No companies available to filter.</p>
                  )}
                </div>

                {availableTags.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Tags</span>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          value={tagQuery}
                          onChange={e => setTagQuery(e.target.value)}
                          placeholder="Search tag..."
                          className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPendingTag('');
                            setTagQuery('');
                          }}
                          className={`text-xs px-3 py-2 rounded-lg border transition-colors ${
                            !pendingTag ? 'bg-amber-400 text-white border-amber-400' : 'border-slate-200 text-slate-600 hover:border-amber-300'
                          }`}
                        >
                          All
                        </button>
                      </div>

                      <div className="h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
                        {filteredTags.length > 0 ? (
                          filteredTags.map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setPendingTag(tag === pendingTag ? '' : tag)}
                              className={`w-full px-3 py-2 text-xs text-left transition-colors flex items-center gap-2 ${
                                pendingTag === tag
                                  ? 'bg-amber-50 text-amber-700 font-semibold'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <Tag size={10} className="flex-shrink-0" />
                              <span className="block truncate">{tag}</span>
                            </button>
                          ))
                        ) : (
                          <p className="px-3 py-2 text-xs text-slate-500">No matching tag found.</p>
                        )}
                      </div>

                      {pendingTag && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Selected: <span className="font-medium text-slate-700 dark:text-slate-200">{pendingTag}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingCategory('');
                    setPendingPage('');
                    setPendingTag('');
                    setPendingCompany('');
                    setTagQuery('');
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                >
                  Clear all selections
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onApplyFilters({
                      category: pendingCategory,
                      pageId: pendingPage,
                      tag: pendingTag,
                      company: pendingCompany,
                    });
                    setShowFilters(false);
                  }}
                  className="inline-flex items-center justify-center rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-xs font-semibold px-4 py-2 transition-colors shadow-sm"
                >
                  Apply filter
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ProductsHeader);

