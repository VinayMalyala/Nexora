import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { ViewMode, Product, User } from './types';

type AuthResult =
  | { status: 'success' }
  | { status: 'missing' | 'invalid' | 'exists'; message?: string };

type ProfileRow = {
  id: string;
  name: string;
  username: string;
  profile_picture_url: string;
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

  const { pages, addPage, deletePage } = usePages(currentUser.id);

  const isRecents = activeView === 'recents';
  const isPage = activeView === 'page';

  // Single fetch for all products — filtered client-side to avoid multiple Supabase calls
  const { products: allProducts, loading, addProduct, updateProduct, deleteProduct } = useProducts(currentUser.id);

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
          <MonthlyExpenses products={allProducts} loading={loading} userId={currentUser.id} />
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const saveCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
  }, []);

  const loadCurrentUser = useCallback(async (authUserId: string, fallbackEmail: string | undefined) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, username, profile_picture_url, phone, bio')
      .eq('id', authUserId)
      .maybeSingle<ProfileRow>();

    const derivedUsername = fallbackEmail?.split('@')[0] ?? 'user';
    const username = profile?.username ?? derivedUsername;

    if (!profile) {
      const defaultName = derivedUsername;
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=f59e0b&color=fff`;
      await supabase.from('profiles').upsert({
        id: authUserId,
        username,
        name: defaultName,
        profile_picture_url: avatar,
        phone: '',
        bio: 'This user has not set a bio yet.',
      });

      return {
        id: authUserId,
        name: defaultName,
        username,
        profilePictureUrl: avatar,
        email: fallbackEmail ?? `${username}@nexora.app`,
        phone: '',
        bio: 'This user has not set a bio yet.',
      } as User;
    }

    return {
      id: authUserId,
      name: profile.name,
      username: profile.username,
      profilePictureUrl: profile.profile_picture_url,
      email: fallbackEmail ?? `${profile.username}@nexora.app`,
      phone: profile.phone,
      bio: profile.bio,
    } as User;
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error || !mounted) {
        setAuthLoading(false);
        return;
      }

      if (data.session?.user) {
        const user = await loadCurrentUser(data.session.user.id, data.session.user.email);
        if (mounted) saveCurrentUser(user);
      }
      if (mounted) setAuthLoading(false);
    };

    void bootstrap();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (!session?.user) {
        saveCurrentUser(null);
        setAuthMode('login');
        setAuthLoading(false);
        return;
      }

      const user = await loadCurrentUser(session.user.id, session.user.email);
      if (mounted) {
        saveCurrentUser(user);
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      authSubscription.subscription.unsubscribe();
    };
  }, [loadCurrentUser, saveCurrentUser]);

  const toSyntheticEmail = (username: string) => `${username}@nexora.app`;

  const handleLogin = useCallback(
    async ({ username, password }: { username: string; password: string }) => {
      const trimmedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(trimmedUsername)) {
        return { status: 'invalid', message: 'Username format is invalid.' } as AuthResult;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: toSyntheticEmail(trimmedUsername),
        password,
      });

      if (error) {
        if (/invalid login credentials|email not confirmed/i.test(error.message)) {
          return { status: 'invalid', message: 'Invalid username or password.' } as AuthResult;
        }
        return {
          status: 'invalid',
          message: `Unable to log in right now: ${error.message}`,
        } as AuthResult;
      }

      if (!data.user) {
        return { status: 'missing' } as AuthResult;
      }

      const user = await loadCurrentUser(data.user.id, data.user.email);
      saveCurrentUser(user);
      return { status: 'success' } as AuthResult;
    },
    [loadCurrentUser, saveCurrentUser]
  );

  const handleSignup = useCallback(
    async ({ name, username, password }: { name: string; username: string; password: string }) => {
      const trimmedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(trimmedUsername)) {
        return {
          status: 'invalid',
          message: 'Username must be 3-30 chars and use a-z, 0-9, dot, underscore, or hyphen.',
        } as AuthResult;
      }

      const email = toSyntheticEmail(trimmedUsername);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: trimmedUsername,
            name: name.trim(),
          },
        },
      });

      if (error) {
        if (/already registered/i.test(error.message)) {
          return { status: 'exists' } as AuthResult;
        }
        return {
          status: 'invalid',
          message: `Unable to create account: ${error.message}`,
        } as AuthResult;
      }

      const authUser = data.user;
      if (!authUser) {
        return { status: 'invalid', message: 'Unable to create account session.' } as AuthResult;
      }

      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=f59e0b&color=fff`;
      const profileError = await supabase.from('profiles').upsert({
        id: authUser.id,
        username: trimmedUsername,
        name: name.trim(),
        profile_picture_url: avatar,
        phone: '',
        bio: 'This user has not set a bio yet.',
      });

      if (profileError.error) {
        return {
          status: 'invalid',
          message: `Account created but profile setup failed: ${profileError.error.message}`,
        } as AuthResult;
      }

      saveCurrentUser({
        id: authUser.id,
        name: name.trim(),
        username: trimmedUsername,
        profilePictureUrl: avatar,
        email,
        phone: '',
        bio: 'This user has not set a bio yet.',
      });
      return { status: 'success' } as AuthResult;
    },
    [saveCurrentUser]
  );

  const handleLogout = useCallback(() => {
    void supabase.auth.signOut();
  }, [saveCurrentUser]);

  const handleUpdateProfile = useCallback(
    async ({ name, profilePictureUrl, email, bio, password }: ProfileUpdateData) => {
      if (!currentUser) {
        return { status: 'invalid', message: 'No active user session.' } as const;
      }

      const profileUpdates: {
        name: string;
        profile_picture_url: string;
        bio: string;
        updated_at: string;
      } = {
        name: name.trim(),
        profile_picture_url: profilePictureUrl.trim(),
        bio: bio.trim(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('id', currentUser.id);

      if (error) {
        return {
          status: 'invalid',
          message: `Unable to update profile: ${error.message}`,
        } as const;
      }

      const nextEmail = email.trim();
      if (nextEmail && nextEmail !== currentUser.email) {
        const emailUpdate = await supabase.auth.updateUser({ email: nextEmail });
        if (emailUpdate.error) {
          return {
            status: 'invalid',
            message: `Profile updated but email change failed: ${emailUpdate.error.message}`,
          } as const;
        }
      }

      if (password?.trim()) {
        const passwordUpdate = await supabase.auth.updateUser({ password: password.trim() });
        if (passwordUpdate.error) {
          return {
            status: 'invalid',
            message: `Profile updated but password change failed: ${passwordUpdate.error.message}`,
          } as const;
        }
      }

      saveCurrentUser({
        ...currentUser,
        name: profileUpdates.name,
        profilePictureUrl: profileUpdates.profile_picture_url,
        email: nextEmail,
        bio: profileUpdates.bio,
      });

      return { status: 'success' } as const;
    },
    [currentUser, saveCurrentUser]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Preparing your workspace...</p>
      </div>
    );
  }

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

