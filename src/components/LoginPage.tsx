import { useState, FormEvent } from 'react';
import { User } from 'lucide-react';

interface LoginPageProps {
  onLogin: (credentials: { username: string; password: string }) => Promise<{
    status: 'success' | 'missing' | 'invalid';
    message?: string;
  }>;
  onGoToSignup: () => void;
}

export default function LoginPage({ onLogin, onGoToSignup }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setSubmitting(true);

    const result = await onLogin({ username, password });

    setSubmitting(false);

    if (result.status === 'missing') {
      setError('No account found with that username.');
    } else if (result.status === 'invalid') {
      setError(result.message ?? 'Invalid username or password.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="px-8 py-10">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-400 text-white mb-6">
            <User size={24} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Welcome back</h1>
          <p className="text-sm text-slate-500 mb-6">Log in with your username and password to continue.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Username
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                placeholder="your username"
              />
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Password
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                placeholder="your password"
              />
            </label>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? 'Logging in…' : 'Log in'}
            </button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 text-sm text-slate-500">
            <p>
              Don&apos;t have an account?{' '}
              <button type="button" onClick={onGoToSignup} className="font-semibold text-amber-500 hover:text-amber-600">
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
