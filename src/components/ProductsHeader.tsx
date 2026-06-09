import { memo, useEffect, useMemo, useState } from 'react';
import { Search, Plus, SlidersHorizontal, X, Tag } from 'lucide-react';
import type { Page } from '../types';
import { CATEGORIES } from '../types';

interface ProductsHeaderProps {
  title: string;
  subtitle: string;
  pages: Page[];
  onAddProduct: () => void;
  onSearch: (q: string) => void;
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
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(activeCategory);
  const [pendingPage, setPendingPage] = useState(activePage);
  const [pendingTag, setPendingTag] = useState(activeTag);
  const [pendingCompany, setPendingCompany] = useState(activeCompany);
  const [companyQuery, setCompanyQuery] = useState('');

  useEffect(() => {
    if (!showFilters) {
      return;
    }

    setPendingCategory(activeCategory);
    setPendingPage(activePage);
    setPendingTag(activeTag);
    setPendingCompany(activeCompany);
    setCompanyQuery('');
    setShowTagDropdown(false);
  }, [showFilters, activeCategory, activePage, activeTag, activeCompany]);

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
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-0">
            <Search size={13} className="sm:w-3.5 sm:h-3.5 absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              placeholder="Search..."
              onChange={e => onSearch(e.target.value)}
              className="pl-8 sm:pl-9 pr-3 sm:pr-4 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 dark:text-slate-100 rounded-xl w-full focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl border transition-colors flex-shrink-0 ${
                showFilters || activeFiltersCount > 0
                  ? 'bg-amber-50 border-amber-200 text-amber-700'
                  : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
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

                      <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 bg-white">
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
                    <div className="relative">
                      <button
                        onClick={() => setShowTagDropdown(!showTagDropdown)}
                        className="flex items-center gap-2 px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300 transition-colors w-full text-left"
                      >
                        <Tag size={12} />
                        <span className="flex-1">{pendingTag ? `Tag: ${pendingTag}` : 'Select a tag...'}</span>
                      </button>
                      {showTagDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                          <button
                            onClick={() => {
                              setPendingTag('');
                              setShowTagDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors ${!pendingTag ? 'bg-amber-50 dark:bg-amber-900/20' : ''}`}
                          >
                            Clear Tag Filter
                          </button>
                          {availableTags.map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                setPendingTag(tag === pendingTag ? '' : tag);
                                setShowTagDropdown(false);
                              }}
                              className={`w-full px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-600 dark:text-slate-300 transition-colors flex items-center gap-2 ${
                                pendingTag === tag ? 'bg-amber-50 dark:bg-amber-900/20 font-semibold' : ''
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
              </div>

              <div className="px-4 sm:px-6 py-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPendingCategory('');
                    setPendingPage('');
                    setPendingTag('');
                    setPendingCompany('');
                    setShowTagDropdown(false);
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

