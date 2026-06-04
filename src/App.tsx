import { useState } from 'react';
import Sidebar from './components/Sidebar';
import ProductsView from './components/ProductsView';
import AddPageModal from './components/AddPageModal';
import { usePages, useProducts } from './hooks/useData';
import type { ViewMode, Product } from './types';

function AppContent() {
  const [activeView, setActiveView] = useState<ViewMode>('home');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);

  const { pages, addPage, deletePage } = usePages();

  const isRecents = activeView === 'recents';
  const isFavorites = activeView === 'favorites';
  const isPage = activeView === 'page';

  const { products, loading, addProduct, updateProduct, reorderProducts, deleteProduct, toggleFavorite } = useProducts(
    isPage ? activePageId : null,
    isRecents,
    isFavorites
  );

  const handleNavigate = (view: ViewMode, pageId?: string) => {
    setActiveView(view);
    setActivePageId(pageId ?? null);
  };

  const handleSave = async (
    data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order' | 'is_favorite'>,
    tags: string[],
    editId?: string
  ) => {
    if (editId) {
      await updateProduct(editId, data, tags);
    } else {
      await addProduct(data, tags);
    }
  };

  const handleDeletePage = async (id: string) => {
    if (!confirm('Delete this page? Products will not be deleted, just unassigned.')) return;
    await deletePage(id);
    if (activePageId === id) setActiveView('home');
  };

  const activePage = pages.find(p => p.id === activePageId);

  const viewTitle =
    activeView === 'home'
      ? 'All Products'
      : activeView === 'recents'
      ? 'Recent Products'
      : activeView === 'favorites'
      ? 'Favorite Products'
      : activePage?.name ?? 'Page';

  const viewSubtitle =
    activeView === 'home'
      ? `${products.length} products`
      : activeView === 'recents'
      ? 'Your 20 most recently added'
      : activeView === 'favorites'
      ? `${products.length} products in favorites`
      : `${products.length} products in this page`;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden flex-col sm:flex-row">
      <Sidebar
        pages={pages}
        activeView={activeView}
        activePageId={activePageId}
        onNavigate={handleNavigate}
        onAddPage={() => setShowAddPage(true)}
        onDeletePage={handleDeletePage}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <ProductsView
          title={viewTitle}
          subtitle={viewSubtitle}
          products={products}
          pages={pages}
          loading={loading}
          defaultPageId={isPage ? activePageId : null}
          showPageFilter={activeView === 'home'}
          onAdd={handleSave}
          onDelete={deleteProduct}
          onReorder={reorderProducts}
          onToggleFavorite={toggleFavorite}
        />
      </main>

      {showAddPage && (
        <AddPageModal
          onClose={() => setShowAddPage(false)}
          onSave={async (name, icon, color) => {
            const { data } = await addPage(name, icon, color);
            if (data) handleNavigate('page', data.id);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return <AppContent />;
}

