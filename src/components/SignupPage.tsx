import { useState, FormEvent } from 'react';
import { UserPlus } from 'lucide-react';

interface SignupPageProps {
  onSignup: (data: { name: string; username: string; password: string }) => Promise<{
    status: 'success' | 'exists' | 'invalid';
    message?: string;
  }>;
  onGoToLogin: () => void;
}

export default function SignupPage({ onSignup, onGoToLogin }: SignupPageProps) {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !username.trim() || !password) {
      setError('All fields are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setSubmitting(true);

    try {
      const result = await onSignup({ name, username, password });

      if (result.status === 'exists') {
        setError('That username is already taken.');
      } else if (result.status === 'invalid') {
        setError(result.message ?? 'Unable to sign up right now.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to sign up right now.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl overflow-hidden">
        <div className="px-8 py-10">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400 text-white mb-6">
            <UserPlus size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Create your account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Sign up with a username and password to get started.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Name
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                placeholder="Your full name"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Username
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                placeholder="Choose a username"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                placeholder="Create a password (min. 6 characters)"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Creating account…' : 'Sign up'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 dark:border-slate-600 pt-5 text-sm text-slate-500 dark:text-slate-400">
            <p>
              Already have an account?{' '}
              <button type="button" onClick={onGoToLogin} className="font-semibold text-amber-500 hover:text-amber-600">
                Log in
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
