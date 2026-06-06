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
import { supabase } from './lib/supabase';
import type { ViewMode, Product, User, UserAccount } from './types';

async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const CURRENT_USER_KEY = 'nexora-current-user';

type AuthResult =
  | { status: 'success' }
  | { status: 'missing' | 'invalid' | 'exists'; message?: string };

type UserAccountRow = {
  name: string;
  username: string;
  password_hash: string;
  profile_picture_url: string;
  email: string;
  phone: string;
  bio: string;
};

type ProfileUpdateData = {
  name: string;
  profilePictureUrl: string;
  email: string;
  bio: string;
  password?: string;
};

function AppContent({
  currentUser,
  onLogout,
  onUpdateProfile,
}: {
  currentUser: User;
  onLogout: () => void;
  onUpdateProfile: (data: ProfileUpdateData) => Promise<{ status: 'success' | 'invalid'; message?: string }>;
}) {
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
        const { error } = await updateProduct(editId, data, tags);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await addProduct(data, tags);
        if (error) throw new Error(error.message);
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
          <ProfilePage currentUser={currentUser} onLogout={onLogout} onUpdateProfile={onUpdateProfile} />
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
      const trimmedUsername = username.trim();
      const { data, error } = await supabase
        .from('user_accounts')
        .select('name, username, password_hash, profile_picture_url, email, phone, bio')
        .eq('username', trimmedUsername)
        .maybeSingle<UserAccountRow>();

      if (error) {
        return {
          status: 'invalid',
          message: `Unable to log in right now: ${error.message}`,
        } as AuthResult;
      }

      if (!data) {
        return { status: 'missing' } as AuthResult;
      }

      const hashed = await hashPassword(password);
      if (data.password_hash !== hashed) {
        return { status: 'invalid' } as AuthResult;
      }

      saveCurrentUser({
        name: data.name,
        username: data.username,
        profilePictureUrl: data.profile_picture_url,
        email: data.email,
        phone: data.phone,
        bio: data.bio,
      });
      return { status: 'success' } as AuthResult;
    },
    [saveCurrentUser]
  );

  const handleSignup = useCallback(
    async ({ name, username, password }: { name: string; username: string; password: string }) => {
      const trimmedUsername = username.trim();
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

      const { error } = await supabase.from('user_accounts').insert({
        name: newAccount.name,
        username: newAccount.username,
        password_hash: newAccount.password,
        profile_picture_url: newAccount.profilePictureUrl,
        email: newAccount.email,
        phone: newAccount.phone,
        bio: newAccount.bio,
      });

      if (error) {
        if (error.code === '23505') {
          return { status: 'exists' } as AuthResult;
        }
        return {
          status: 'invalid',
          message: `Unable to create account: ${error.message}`,
        } as AuthResult;
      }

      saveCurrentUser({
        name: newAccount.name,
        username: newAccount.username,
        profilePictureUrl: newAccount.profilePictureUrl,
        email: newAccount.email,
        phone: newAccount.phone,
        bio: newAccount.bio,
      });
      return { status: 'success' } as AuthResult;
    },
    [saveCurrentUser]
  );

  const handleLogout = useCallback(() => {
    saveCurrentUser(null);
    setAuthMode('login');
  }, [saveCurrentUser]);

  const handleUpdateProfile = useCallback(
    async ({ name, profilePictureUrl, email, bio, password }: ProfileUpdateData) => {
      if (!currentUser) {
        return { status: 'invalid', message: 'No active user session.' } as const;
      }

      const updates: {
        name: string;
        profile_picture_url: string;
        email: string;
        bio: string;
        updated_at: string;
        password_hash?: string;
      } = {
        name: name.trim(),
        profile_picture_url: profilePictureUrl.trim(),
        email: email.trim(),
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      };

      if (password?.trim()) {
        updates.password_hash = await hashPassword(password);
      }

      const { error } = await supabase
        .from('user_accounts')
        .update(updates)
        .eq('username', currentUser.username);

      if (error) {
        return {
          status: 'invalid',
          message: `Unable to update profile: ${error.message}`,
        } as const;
      }

      saveCurrentUser({
        ...currentUser,
        name: updates.name,
        profilePictureUrl: updates.profile_picture_url,
        email: updates.email,
        bio: updates.bio,
      });

      return { status: 'success' } as const;
    },
    [currentUser, saveCurrentUser]
  );

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

  return (
    <AppContent
      currentUser={currentUser}
      onLogout={handleLogout}
      onUpdateProfile={handleUpdateProfile}
    />
  );
}

