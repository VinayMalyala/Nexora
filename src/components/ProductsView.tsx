import { memo, useCallback, useMemo, useState } from 'react';
import ProductCard from './ProductCard';
import ProductsHeader from './ProductsHeader';
import EmptyState from './EmptyState';
import ProductModal from './ProductModal';
import type { Product, Page } from '../types';

interface ProductsViewProps {
  title: string;
  subtitle: string;
  products: Product[];
  pages: Page[];
  loading: boolean;
  defaultPageId?: string | null;
  showPageFilter?: boolean;
  onAdd: (data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order'>, tags: string[], editId?: string) => Promise<void>;
  onDelete: (id: string) => void;
}

function ProductsView({
  title,
  subtitle,
  products,
  pages,
  loading,
  defaultPageId,
  showPageFilter,
  onAdd,
  onDelete,
}: ProductsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPage, setFilterPage] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterCompany, setFilterCompany] = useState('');

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.company?.toLowerCase().includes(search.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = !filterCategory || p.category === filterCategory;
      const matchPage = !filterPage || p.page_id === filterPage;
      const matchTag = !filterTag || p.tags?.includes(filterTag);
      const matchCompany = !filterCompany || p.company?.toLowerCase() === filterCompany.toLowerCase();
      return matchSearch && matchCategory && matchPage && matchTag && matchCompany;
    });
  }, [products, search, filterCategory, filterPage, filterTag, filterCompany]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [products]);

  const allCompanies = useMemo(() => {
    const companies = new Set<string>();
    products.forEach(p => {
      if (p.company?.trim()) companies.add(p.company.trim());
    });
    return Array.from(companies).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const resolvedSubtitle = `${filtered.length} product${filtered.length !== 1 ? 's' : ''} · ${
    filtered.reduce((acc, p) => acc + p.price, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
  } total`;

  const handleApplyFilters = useCallback(
    ({ category, pageId, tag, company }: { category: string; pageId: string; tag: string; company: string }) => {
      setFilterCategory(category);
      setFilterPage(pageId);
      setFilterTag(tag);
      setFilterCompany(company);
    },
    []
  );

  const handleAddProduct = useCallback(() => {
    setEditProduct(null);
    setShowModal(true);
  }, []);

  const handleEditProduct = useCallback((product: Product) => {
    setEditProduct(product);
    setShowModal(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditProduct(null);
  }, []);

  const content = loading ? (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
            <div className="h-[120px] sm:h-[150px] bg-slate-100" />
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-4 bg-slate-100 rounded w-4/5" />
              <div className="h-4 bg-slate-100 rounded w-3/5" />
              <div className="h-6 bg-slate-100 rounded w-1/3" />
              <div className="h-8 sm:h-9 bg-slate-100 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  ) : filtered.length === 0 ? (
    <EmptyState
      onAdd={handleAddProduct}
      message={search || filterCategory || filterPage || filterTag || filterCompany ? 'No matching products' : 'No products yet'}
      subtext={
        search || filterCategory || filterPage || filterTag || filterCompany
          ? 'Try adjusting your search or filters.'
          : 'Start adding products you want to track or buy later.'
      }
      actionLabel={search || filterCategory || filterPage || filterTag || filterCompany ? 'Add Product' : 'Add your first product'}
    />
  ) : (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5 auto-rows-max">
        {filtered.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            pages={pages}
            hidePageBadge={!!defaultPageId}
            onDelete={onDelete}
            onEdit={handleEditProduct}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ProductsHeader
        title={title}
        subtitle={loading ? subtitle : products.length > 0 ? resolvedSubtitle : subtitle}
        pages={pages}
        onAddProduct={handleAddProduct}
        onSearch={setSearch}
        onApplyFilters={handleApplyFilters}
        activeCategory={filterCategory}
        activePage={filterPage}
        activeTag={filterTag}
        activeCompany={filterCompany}
        availableTags={allTags}
        availableCompanies={allCompanies}
        showPageFilter={showPageFilter}
      />

      {content}

      {showModal && (
        <ProductModal
          pages={pages}
          defaultPageId={defaultPageId}
          editProduct={editProduct}
          onClose={handleCloseModal}
          onSave={onAdd}
        />
      )}
    </div>
  );
}

export default memo(ProductsView);
