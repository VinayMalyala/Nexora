import { useCallback, useMemo, useState } from 'react';
import Sidebar from './components/Sidebar';
import ProductsView from './components/ProductsView';
import PriceTracker from './components/PriceTracker';
import MonthlyExpenses from './components/MonthlyExpenses';
import ProfilePage from './components/ProfilePage';
import AddPageModal from './components/AddPageModal';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import { usePages, useProducts } from './hooks/useData';
import type { ViewMode, Product, User, UserAccount } from './types';

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const ACCOUNTS_KEY = 'nexora-accounts-v2';
const CURRENT_USER_KEY = 'nexora-current-user';

function AppContent({ currentUser, onLogout }: { currentUser: User; onLogout: () => void }) {
  const [activeView, setActiveView] = useState<ViewMode>('home');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);

  const { pages, addPage, deletePage } = usePages();

  const isRecents = activeView === 'recents';
  const isPage = activeView === 'page';

  // Single fetch for all products — filtered client-side to avoid multiple Supabase calls
  const { products: allProducts, loading, addProduct, updateProduct, deleteProduct } = useProducts();

  const products = useMemo(() => {
    if (isRecents) return allProducts.slice(0, 20);
    if (isPage && activePageId) return allProducts.filter(p => p.page_id === activePageId);
    return allProducts;
  }, [allProducts, isRecents, isPage, activePageId]);

  const handleNavigate = useCallback((view: ViewMode, pageId?: string) => {
    setActiveView(view);
    setActivePageId(pageId ?? null);
  }, []);

  const handleSave = useCallback(
    async (
      data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order'>,
      tags: string[],
      editId?: string
    ) => {
      if (editId) {
        await updateProduct(editId, data, tags);
      } else {
        await addProduct(data, tags);
      }
    },
    [addProduct, updateProduct]
  );

  const handleDeletePage = useCallback(
    async (id: string) => {
      if (!confirm('Delete this page? Products will not be deleted, just unassigned.')) return;
      await deletePage(id);
      if (activePageId === id) setActiveView('home');
    },
    [activePageId, deletePage]
  );

  const activePage = useMemo(
    () => pages.find(p => p.id === activePageId),
    [pages, activePageId]
  );

  const viewTitle = useMemo(() => {
    if (activeView === 'home') return 'All Products';
    if (activeView === 'recents') return 'Recent Products';
    if (activeView === 'price-tracker') return 'Price Tracker';
    return activePage?.name ?? 'Page';
  }, [activeView, activePage]);

  const viewSubtitle = useMemo(() => {
    if (activeView === 'home') return `${products.length} products`;
    if (activeView === 'recents') return 'Your 20 most recently added';
    if (activeView === 'price-tracker') return 'Calculate price per gram for your products';
    if (activeView === 'profile') return 'View and manage your profile details';
    return `${products.length} products in this page`;
  }, [activeView, products.length]);

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
        {activeView === 'price-tracker' ? (
          <PriceTracker products={allProducts} loading={loading} />
        ) : activeView === 'monthly-expenses' ? (
          <MonthlyExpenses products={allProducts} loading={loading} username={currentUser.username} />
        ) : activeView === 'profile' ? (
          <ProfilePage currentUser={currentUser} onLogout={onLogout} />
        ) : (
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
          />
        )}
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
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = window.localStorage.getItem(CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    if (typeof window === 'undefined') return [];
    const stored = window.localStorage.getItem(ACCOUNTS_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  const saveAccounts = useCallback((next: UserAccount[]) => {
    setAccounts(next);
    window.localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(next));
  }, []);

  const saveCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
    if (user) {
      window.localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(CURRENT_USER_KEY);
    }
  }, []);

  const handleLogin = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      const account = accounts.find(acc => acc.username === username.trim());
      if (!account) {
        return 'missing' as const;
      }

      const hashed = await hashPassword(password);
      if (account.password !== hashed) {
        return 'invalid' as const;
      }

      saveCurrentUser({
        name: account.name,
        username: account.username,
        profilePictureUrl: account.profilePictureUrl,
        email: account.email,
        phone: account.phone,
        bio: account.bio,
      });
      return 'success' as const;
    },
    [accounts, saveCurrentUser]
  );

  const handleSignup = useCallback(
    async ({ name, username, password }: { name: string; username: string; password: string }) => {
      const trimmedUsername = username.trim();
      const existing = accounts.some(acc => acc.username === trimmedUsername);
      if (existing) {
        return 'exists' as const;
      }

      const hashed = await hashPassword(password);
      const newAccount: UserAccount = {
        name: name.trim(),
        username: trimmedUsername,
        password: hashed,
        profilePictureUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=7C3AED&color=fff`,
        email: `${trimmedUsername}@nexora.app`,
        phone: '',
        bio: 'This user has not set a bio yet.',
      };

      const nextAccounts = [...accounts, newAccount];
      saveAccounts(nextAccounts);
      saveCurrentUser({
        name: newAccount.name,
        username: newAccount.username,
        profilePictureUrl: newAccount.profilePictureUrl,
        email: newAccount.email,
        phone: newAccount.phone,
        bio: newAccount.bio,
      });
      return 'success' as const;
    },
    [accounts, saveAccounts, saveCurrentUser]
  );

  const handleLogout = useCallback(() => {
    saveCurrentUser(null);
    setAuthMode('login');
  }, [saveCurrentUser]);

  if (!currentUser) {
    return authMode === 'login' ? (
      <LoginPage
        onLogin={handleLogin}
        onGoToSignup={() => setAuthMode('signup')}
      />
    ) : (
      <SignupPage
        onSignup={handleSignup}
        onGoToLogin={() => setAuthMode('login')}
      />
    );
  }

  return <AppContent currentUser={currentUser} onLogout={handleLogout} />;
}

