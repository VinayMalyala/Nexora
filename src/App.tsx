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
import { useDarkMode } from './hooks/useDarkMode';
import { supabase } from './lib/supabase';
import type { ViewMode, Product, User } from './types';

type LoginAuthResult =
  | { status: 'success' }
  | { status: 'missing' | 'invalid'; message?: string };

type SignupAuthResult =
  | { status: 'success' }
  | { status: 'invalid' | 'exists'; message?: string };

type RequiredTable = 'profiles' | 'pages' | 'products' | 'product_tags' | 'expenses';

type TableCheckResult = {
  table: RequiredTable;
  status: 'ok' | 'missing' | 'error';
  detail?: string;
};

type SchemaHealthState = {
  status: 'idle' | 'checking' | 'ok' | 'missing' | 'error';
  results: TableCheckResult[];
};

const REQUIRED_TABLES: RequiredTable[] = ['profiles', 'pages', 'products', 'product_tags', 'expenses'];

const REQUEST_TIMEOUT_MS = 10000;
const HEALTH_CHECK_TIMEOUT_MS = 15000;

function withTimeout<T>(promiseLike: PromiseLike<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve(promiseLike).then(
      value => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      error => {
        window.clearTimeout(timeoutId);
        reject(error);
      }
    );
  });
}

function toFriendlyAuthErrorMessage(rawMessage: string): string {
  const msg = rawMessage.toLowerCase();

  if (msg.includes("could not find the table 'public.profiles'") || msg.includes('relation "profiles" does not exist')) {
    return 'Database setup is incomplete: profiles table is missing. Apply Supabase migrations for this project, then try again.';
  }

  if (msg.includes('schema cache')) {
    return 'Database schema is not ready yet. Apply migrations and refresh Supabase schema cache, then retry.';
  }

  return rawMessage;
}

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
  phone: string;
  bio: string;
  password?: string;
};

function AppContent({
  currentUser,
  onLogout,
  onUpdateProfile,
  isDark,
  onToggleDark,
}: {
  currentUser: User;
  onLogout: () => void;
  onUpdateProfile: (data: ProfileUpdateData) => Promise<{ status: 'success' | 'invalid'; message?: string }>;
  isDark: boolean;
  onToggleDark: () => void;
}) {
  const [activeView, setActiveView] = useState<ViewMode>('home');
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [showAddPage, setShowAddPage] = useState(false);
  const [pendingDeletePage, setPendingDeletePage] = useState<{ id: string; name: string } | null>(null);
  const [deletingPage, setDeletingPage] = useState(false);

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
    (id: string) => {
      const page = pages.find(current => current.id === id);
      setPendingDeletePage({ id, name: page?.name ?? 'this page' });
    },
    [pages]
  );

  const confirmDeletePage = useCallback(async () => {
    if (!pendingDeletePage || deletingPage) return;

    setDeletingPage(true);
    const deletingId = pendingDeletePage.id;
    const { error } = await deletePage(deletingId);

    if (!error) {
      if (activePageId === deletingId) {
        setActiveView('home');
        setActivePageId(null);
      }
      setPendingDeletePage(null);
    }

    setDeletingPage(false);
  }, [activePageId, deletePage, deletingPage, pendingDeletePage]);

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
    if (activeView === 'price-tracker') return 'Calculate price per unit for your products';
    if (activeView === 'profile') return 'View and manage your profile details';
    return `${products.length} products in this page`;
  }, [activeView, products.length]);

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden flex-col sm:flex-row">
      <Sidebar
        pages={pages}
        activeView={activeView}
        activePageId={activePageId}
        currentUserName={currentUser.name}
        currentUserProfilePictureUrl={currentUser.profilePictureUrl}
        onNavigate={handleNavigate}
        onAddPage={() => setShowAddPage(true)}
        onDeletePage={handleDeletePage}
        isDark={isDark}
        onToggleDark={onToggleDark}
      />

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activeView === 'price-tracker' ? (
          <PriceTracker products={allProducts} loading={loading} />
        ) : activeView === 'monthly-expenses' ? (
          <MonthlyExpenses products={allProducts} loading={loading} userId={currentUser.id} />
        ) : activeView === 'profile' ? (
          <ProfilePage currentUser={currentUser} onLogout={onLogout} onUpdateProfile={onUpdateProfile} isDark={isDark} onToggleDark={onToggleDark} />
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
            const { data, error } = await addPage(name, icon, color);
            if (error) {
              throw new Error(error.message);
            }
            if (data) {
              handleNavigate('page', data.id);
            }
          }}
        />
      )}

      {pendingDeletePage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              if (!deletingPage) setPendingDeletePage(null);
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Delete page?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              &quot;{pendingDeletePage.name}&quot; will be removed. Products will stay safe and become unassigned.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeletePage(null)}
                disabled={deletingPage}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirmDeletePage()}
                disabled={deletingPage}
                className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
              >
                {deletingPage ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [copiedChecklist, setCopiedChecklist] = useState(false);
  const [isDark, toggleDark] = useDarkMode();
  const [schemaHealth, setSchemaHealth] = useState<SchemaHealthState>({
    status: 'idle',
    results: [],
  });

  const saveCurrentUser = useCallback((user: User | null) => {
    setCurrentUser(user);
  }, []);

  const loadCurrentUser = useCallback(async (authUserId: string, fallbackEmail: string | undefined) => {
    const { data: profile, error: profileError } = await withTimeout(
      supabase
        .from('profiles')
        .select('id, name, username, profile_picture_url, phone, bio')
        .eq('id', authUserId)
        .maybeSingle<ProfileRow>(),
      REQUEST_TIMEOUT_MS,
      'Profile lookup timed out. Please check your connection and try again.'
    );

    if (profileError) {
      throw new Error(toFriendlyAuthErrorMessage(profileError.message));
    }

    const derivedUsername = fallbackEmail?.split('@')[0] ?? 'user';
    const username = profile?.username ?? derivedUsername;

    if (!profile) {
      const defaultName = derivedUsername;
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=f59e0b&color=fff`;
      const { error: upsertError } = await withTimeout(
        supabase.from('profiles').upsert({
          id: authUserId,
          username,
          name: defaultName,
          profile_picture_url: avatar,
          phone: '',
          bio: 'This user has not set a bio yet.',
        }),
        REQUEST_TIMEOUT_MS,
        'Profile setup timed out. Please try again.'
      );

      if (upsertError) {
        throw new Error(toFriendlyAuthErrorMessage(upsertError.message));
      }

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
    let canceled = false;

    const runSchemaHealthCheck = async () => {
      setSchemaHealth({
        status: 'checking',
        results: REQUIRED_TABLES.map(table => ({ table, status: 'ok' })),
      });

      const checkTable = async (table: RequiredTable): Promise<TableCheckResult> => {
        try {
          const { error } = await withTimeout(
            supabase.from(table).select('id', { head: true, count: 'exact' }).limit(1),
            HEALTH_CHECK_TIMEOUT_MS,
            `Health check timed out for table: ${table}`
          );

          if (!error) {
            return { table, status: 'ok' };
          }

          const lower = error.message.toLowerCase();
          const isMissing =
            lower.includes(`public.${table}`) && lower.includes('could not find the table') ||
            lower.includes(`relation \"${table}\" does not exist`) ||
            lower.includes(`relation '${table}' does not exist`);

          return {
            table,
            status: isMissing ? 'missing' : 'error',
            detail: error.message,
          };
        } catch (error) {
          return {
            table,
            status: 'error',
            detail: error instanceof Error ? error.message : 'Unknown table check error',
          };
        }
      };

      const checks = await Promise.all(
        REQUIRED_TABLES.map(async table => {
          let result = await checkTable(table);
          if (result.status === 'error' && result.detail?.toLowerCase().includes('timed out')) {
            await new Promise(resolve => window.setTimeout(resolve, 900));
            result = await checkTable(table);
          }

          return result;
        })
      );

      if (canceled) return;

      const hasMissing = checks.some(result => result.status === 'missing');
      const hasError = checks.some(result => result.status === 'error');

      setSchemaHealth({
        status: hasMissing ? 'missing' : hasError ? 'error' : 'ok',
        results: checks,
      });
    };

    void runSchemaHealthCheck();

    return () => {
      canceled = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let bootstrapFinished = false;

    const startupWatchdog = window.setTimeout(() => {
      if (!mounted || bootstrapFinished) return;
      console.warn('Auth bootstrap timed out. Falling back to login view.');
      saveCurrentUser(null);
      setAuthMode('login');
      setAuthLoading(false);
    }, 7000);

    const bootstrap = async () => {
      try {
        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          REQUEST_TIMEOUT_MS,
          'Session check timed out. Please reload and try again.'
        );
        if (error || !mounted) {
          setAuthLoading(false);
          return;
        }

        if (data.session?.user) {
          const user = await loadCurrentUser(data.session.user.id, data.session.user.email);
          if (mounted) saveCurrentUser(user);
        }
      } catch (error) {
        console.error('Failed to bootstrap auth session:', error);
        if (mounted) {
          saveCurrentUser(null);
          setAuthMode('login');
        }
      } finally {
        bootstrapFinished = true;
        if (mounted) setAuthLoading(false);
      }
    };

    void bootstrap();

    const { data: authSubscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      try {
        if (!session?.user) {
          // Some non-signed-out events can briefly report null; avoid forcing logout unless explicit.
          if (event === 'SIGNED_OUT') {
            saveCurrentUser(null);
            setAuthMode('login');
          }
          setAuthLoading(false);
          return;
        }

        const user = await loadCurrentUser(session.user.id, session.user.email);
        if (mounted) {
          saveCurrentUser(user);
        }
      } catch (error) {
        console.error('Auth state change handling failed:', error);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => {
      mounted = false;
      window.clearTimeout(startupWatchdog);
      authSubscription.subscription.unsubscribe();
    };
  }, [loadCurrentUser, saveCurrentUser]);

  const toSyntheticEmail = (username: string) => `${username}@nexora.app`;

  const handleLogin = useCallback(
    async ({ username, password }: { username: string; password: string }): Promise<LoginAuthResult> => {
      const trimmedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(trimmedUsername)) {
        return { status: 'invalid', message: 'Username format is invalid.' };
      }

      let data: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['data'];
      let error: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>['error'];

      try {
        const result = await withTimeout(
          supabase.auth.signInWithPassword({
            email: toSyntheticEmail(trimmedUsername),
            password,
          }),
          REQUEST_TIMEOUT_MS,
          'Login request timed out. Please check your connection and try again.'
        );
        data = result.data;
        error = result.error;
      } catch (requestError) {
        return {
          status: 'invalid',
          message: requestError instanceof Error ? requestError.message : 'Unable to log in right now.',
        };
      }

      if (error) {
        if (/invalid login credentials|email not confirmed/i.test(error.message)) {
          return { status: 'invalid', message: 'Invalid username or password.' };
        }
        return {
          status: 'invalid',
          message: `Unable to log in right now: ${toFriendlyAuthErrorMessage(error.message)}`,
        };
      }

      if (!data.user) {
        return { status: 'missing' };
      }

      try {
        const user = await loadCurrentUser(data.user.id, data.user.email);
        saveCurrentUser(user);
        return { status: 'success' };
      } catch (profileError) {
        return {
          status: 'invalid',
          message: profileError instanceof Error ? profileError.message : 'Unable to load your profile right now.',
        };
      }
    },
    [loadCurrentUser, saveCurrentUser]
  );

  const handleSignup = useCallback(
    async ({ name, username, password }: { name: string; username: string; password: string }): Promise<SignupAuthResult> => {
      const trimmedUsername = username.trim().toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(trimmedUsername)) {
        return {
          status: 'invalid',
          message: 'Username must be 3-30 chars and use a-z, 0-9, dot, underscore, or hyphen.',
        };
      }

      const email = toSyntheticEmail(trimmedUsername);
      let data: Awaited<ReturnType<typeof supabase.auth.signUp>>['data'];
      let error: Awaited<ReturnType<typeof supabase.auth.signUp>>['error'];

      try {
        const result = await withTimeout(
          supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                username: trimmedUsername,
                name: name.trim(),
              },
            },
          }),
          REQUEST_TIMEOUT_MS,
          'Signup request timed out. Please check your connection and try again.'
        );
        data = result.data;
        error = result.error;
      } catch (requestError) {
        return {
          status: 'invalid',
          message: requestError instanceof Error ? requestError.message : 'Unable to create account right now.',
        };
      }

      if (error) {
        if (/already registered/i.test(error.message)) {
          return { status: 'exists' };
        }
        return {
          status: 'invalid',
          message: `Unable to create account: ${toFriendlyAuthErrorMessage(error.message)}`,
        };
      }

      const authUser = data.user;
      if (!authUser) {
        return { status: 'invalid', message: 'Unable to create account session.' };
      }

      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name.trim())}&background=f59e0b&color=fff`;
      const profileError = await withTimeout(
        supabase.from('profiles').upsert({
          id: authUser.id,
          username: trimmedUsername,
          name: name.trim(),
          profile_picture_url: avatar,
          phone: '',
          bio: 'This user has not set a bio yet.',
        }),
        REQUEST_TIMEOUT_MS,
        'Profile setup timed out. Please try again.'
      );

      if (profileError.error) {
        return {
          status: 'invalid',
          message: `Account created but profile setup failed: ${toFriendlyAuthErrorMessage(profileError.error.message)}`,
        };
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
      return { status: 'success' };
    },
    [saveCurrentUser]
  );

  const handleLogout = useCallback(() => {
    void supabase.auth.signOut();
  }, []);

  const handleUpdateProfile = useCallback(
    async ({ name, profilePictureUrl, email, phone, bio, password }: ProfileUpdateData) => {
      if (!currentUser) {
        return { status: 'invalid', message: 'No active user session.' } as const;
      }

      const profileUpdates: {
        name: string;
        profile_picture_url: string;
        phone: string;
        bio: string;
        updated_at: string;
      } = {
        name: name.trim(),
        profile_picture_url: profilePictureUrl.trim(),
        phone: phone.trim(),
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
        phone: profileUpdates.phone,
        email: nextEmail,
        bio: profileUpdates.bio,
      });

      return { status: 'success' } as const;
    },
    [currentUser, saveCurrentUser]
  );

  const migrationChecklist = useMemo(() => {
    const missing = schemaHealth.results
      .filter(result => result.status === 'missing')
      .map(result => result.table);

    const missingLine = missing.length > 0
      ? `Missing tables detected: ${missing.join(', ')}`
      : 'Missing tables detected: none';

    return [
      'Nexora Supabase Migration Checklist',
      '',
      '1. Open Supabase Dashboard > SQL Editor for the same project used by VITE_SUPABASE_URL.',
      '2. Apply migrations from supabase/migrations in order:',
      '   - 20260602023338_create_nexora_schema.sql',
      '   - 20260603025102_add_sort_order_to_products.sql',
      '   - 20260605120000_add_company_to_products.sql',
      '   - 20260606100000_add_user_accounts_table.sql',
      '   - 20260607110000_harden_auth_and_isolation.sql',
      '3. In Supabase Auth settings, disable email confirmation for this project (for current username flow).',
      '4. Refresh the app after migrations are complete.',
      '',
      missingLine,
    ].join('\n');
  }, [schemaHealth.results]);

  const handleCopyChecklist = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(migrationChecklist);
      setCopiedChecklist(true);
      window.setTimeout(() => setCopiedChecklist(false), 1800);
    } catch (error) {
      console.error('Failed to copy migration checklist:', error);
    }
  }, [migrationChecklist]);

  const diagnosticsPanel = schemaHealth.status === 'ok' ? null : (
    <div className="fixed bottom-4 right-4 z-50 max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-lg">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Startup Health Check</h3>
      {schemaHealth.status === 'checking' ? (
        <p className="mt-1 text-xs text-slate-500">Checking required Supabase tables...</p>
      ) : null}

      {schemaHealth.status === 'missing' ? (
        <div className="mt-2">
          <p className="text-xs text-red-600">Missing tables detected:</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">
            {schemaHealth.results
              .filter(result => result.status === 'missing')
              .map(result => (
                <li key={result.table}>{result.table}</li>
              ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">Apply all files from supabase/migrations to this Supabase project.</p>
          <button
            type="button"
            onClick={() => void handleCopyChecklist()}
            className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            {copiedChecklist ? 'Checklist Copied' : 'Copy Checklist'}
          </button>
        </div>
      ) : null}

      {schemaHealth.status === 'error' ? (
        <div className="mt-2">
          <p className="text-xs text-amber-600">Could not fully verify schema.</p>
          <ul className="mt-1 list-disc pl-5 text-xs text-slate-700">
            {schemaHealth.results
              .filter(result => result.status === 'error')
              .map(result => (
                <li key={result.table}>
                  {result.table}: {result.detail ?? 'Unknown error'}
                </li>
              ))}
          </ul>
        </div>
      ) : null}
    </div>
  );

  if (authLoading) {
    return (
      <>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">Preparing your workspace...</p>
        </div>
        {diagnosticsPanel}
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        {authMode === 'login' ? (
          <LoginPage
            onLogin={handleLogin}
            onGoToSignup={() => setAuthMode('signup')}
          />
        ) : (
          <SignupPage
            onSignup={handleSignup}
            onGoToLogin={() => setAuthMode('login')}
          />
        )}
        {diagnosticsPanel}
      </>
    );
  }

  return (
    <AppContent
      currentUser={currentUser}
      onLogout={handleLogout}
      onUpdateProfile={handleUpdateProfile}
      isDark={isDark}
      onToggleDark={toggleDark}
    />
  );
}

