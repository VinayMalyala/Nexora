import { useState, useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from 'react-beautiful-dnd';
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
  onAdd: (data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order' | 'is_favorite'>, tags: string[], editId?: string) => Promise<void>;
  onDelete: (id: string) => void;
  onReorder: (source: number, destination: number, filteredProducts?: Product[]) => Promise<void>;
  onToggleFavorite: (productId: string, isFavorite: boolean) => Promise<void>;
}

export default function ProductsView({
  title,
  subtitle,
  products,
  pages,
  loading,
  defaultPageId,
  showPageFilter,
  onAdd,
  onDelete,
  onReorder,
  onToggleFavorite,
}: ProductsViewProps) {
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterPage, setFilterPage] = useState('');
  const [filterTag, setFilterTag] = useState('');

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()));
      const matchCategory = !filterCategory || p.category === filterCategory;
      const matchPage = !filterPage || p.page_id === filterPage;
      const matchTag = !filterTag || p.tags?.includes(filterTag);
      return matchSearch && matchCategory && matchPage && matchTag;
    });
  }, [products, search, filterCategory, filterPage, filterTag]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    products.forEach(p => p.tags?.forEach(t => tags.add(t)));
    return Array.from(tags).sort();
  }, [products]);

  const resolvedSubtitle = `${filtered.length} product${filtered.length !== 1 ? 's' : ''} · ${
    filtered.reduce((acc, p) => acc + p.price, 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
  } total`;

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    await onReorder(source.index, destination.index, filtered);
  };

  if (loading) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <ProductsHeader
          title={title}
          subtitle={subtitle}
          pages={pages}
          onAddProduct={() => { setEditProduct(null); setShowModal(true); }}
          onSearch={setSearch}
          onFilterCategory={setFilterCategory}
          onFilterPage={setFilterPage}
          onFilterTag={setFilterTag}
          activeCategory={filterCategory}
          activePage={filterPage}
          activeTag={filterTag}
          availableTags={allTags}
          showPageFilter={showPageFilter}
        />
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
                <div className="h-40 sm:h-48 bg-slate-100" />
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
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <ProductsHeader
          title={title}
          subtitle={products.length > 0 ? resolvedSubtitle : subtitle}
          pages={pages}
          onAddProduct={() => { setEditProduct(null); setShowModal(true); }}
          onSearch={setSearch}
          onFilterCategory={setFilterCategory}
          onFilterPage={setFilterPage}
          onFilterTag={setFilterTag}
          activeCategory={filterCategory}
          activePage={filterPage}
          activeTag={filterTag}
          availableTags={allTags}
          showPageFilter={showPageFilter}
        />
        <EmptyState
          onAdd={() => { setEditProduct(null); setShowModal(true); }}
          message={search || filterCategory || filterPage || filterTag ? 'No matching products' : 'No products yet'}
          subtext={
            search || filterCategory || filterPage || filterTag
              ? 'Try adjusting your search or filters.'
              : 'Start adding products you want to track or buy later.'
          }
          actionLabel={search || filterCategory || filterPage || filterTag ? 'Add Product' : 'Add your first product'}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <ProductsHeader
        title={title}
        subtitle={resolvedSubtitle}
        pages={pages}
        onAddProduct={() => { setEditProduct(null); setShowModal(true); }}
        onSearch={setSearch}
        onFilterCategory={setFilterCategory}
        onFilterPage={setFilterPage}
        onFilterTag={setFilterTag}
        activeCategory={filterCategory}
        activePage={filterPage}
        activeTag={filterTag}
        availableTags={allTags}
        showPageFilter={showPageFilter}
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="products-grid" direction="vertical">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 transition-colors ${
                snapshot.isDraggingOver ? 'bg-amber-50/30' : ''
              }`}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-5 auto-rows-max">
                {filtered.map((product, idx) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    pages={pages}
                    index={idx}
                    onDelete={onDelete}
                    onEdit={(p) => { setEditProduct(p); setShowModal(true); }}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {showModal && (
        <ProductModal
          pages={pages}
          defaultPageId={defaultPageId}
          editProduct={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          onSave={onAdd}
        />
      )}
    </div>
  );
}
