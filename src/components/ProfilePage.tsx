import { useEffect, useState } from 'react';
import type { User } from '../types';
import { Mail, Phone, Info, Lock } from 'lucide-react';

interface ProfilePageProps {
  currentUser: User;
  onLogout: () => void;
  onUpdateProfile: (data: {
    profilePictureUrl: string;
    name: string;
    email: string;
    bio: string;
    password?: string;
  }) => Promise<{ status: 'success' | 'invalid'; message?: string }>;
}

export default function ProfilePage({ currentUser, onLogout, onUpdateProfile }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    profilePictureUrl: currentUser.profilePictureUrl,
    name: currentUser.name,
    email: currentUser.email,
    bio: currentUser.bio,
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setForm({
      profilePictureUrl: currentUser.profilePictureUrl,
      name: currentUser.name,
      email: currentUser.email,
      bio: currentUser.bio,
      password: '',
      confirmPassword: '',
    });
  }, [currentUser]);

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setForm({
      profilePictureUrl: currentUser.profilePictureUrl,
      name: currentUser.name,
      email: currentUser.email,
      bio: currentUser.bio,
      password: '',
      confirmPassword: '',
    });
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }
    if (form.password && form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password must match.');
      return;
    }

    setError('');
    setSuccess('');
    setSaving(true);

    const result = await onUpdateProfile({
      profilePictureUrl: form.profilePictureUrl,
      name: form.name,
      email: form.email,
      bio: form.bio,
      password: form.password || undefined,
    });

    setSaving(false);

    if (result.status === 'invalid') {
      setError(result.message ?? 'Unable to update profile.');
      return;
    }

    setSuccess('Profile updated successfully.');
    setIsEditing(false);
    setForm(current => ({ ...current, password: '', confirmPassword: '' }));
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-6">
            <div className="flex items-center gap-4">
              <img
                src={isEditing ? form.profilePictureUrl : currentUser.profilePictureUrl}
                alt={`${currentUser.name} avatar`}
                className="w-20 h-20 rounded-3xl object-cover bg-slate-100"
              />
              <div>
                <p className="text-2xl font-bold text-slate-900">{isEditing ? form.name : currentUser.name}</p>
                <p className="text-sm text-slate-500">@{currentUser.username}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {!isEditing ? (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setError('');
                    setSuccess('');
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                </>
              )}
              <button
                onClick={onLogout}
                className="inline-flex items-center justify-center rounded-2xl bg-slate-800 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-900 transition-colors"
              >
                Log out
              </button>
            </div>
          </div>

          {error ? <p className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}
          {success ? <p className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
              <p className="text-sm font-semibold text-slate-700 mb-3">Username</p>
              <input
                value={`@${currentUser.username}`}
                disabled
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-500"
              />
              <p className="mt-2 text-xs text-slate-500">Username cannot be edited.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
              <div className="flex items-center gap-3 text-slate-700 mb-3">
                <Info size={18} />
                <p className="text-sm font-semibold">Profile Picture URL</p>
              </div>
              {isEditing ? (
                <input
                  value={form.profilePictureUrl}
                  onChange={e => setForm(current => ({ ...current, profilePictureUrl: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  placeholder="https://..."
                />
              ) : (
                <p className="text-sm text-slate-700 break-all">{currentUser.profilePictureUrl}</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3 text-slate-700 mb-3">
                <Info size={18} />
                <p className="text-sm font-semibold">Name</p>
              </div>
              {isEditing ? (
                <input
                  value={form.name}
                  onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                />
              ) : (
                <p className="text-sm text-slate-700">{currentUser.name}</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3 text-slate-700 mb-3">
                <Mail size={18} />
                <p className="text-sm font-semibold">Email</p>
              </div>
              {isEditing ? (
                <input
                  value={form.email}
                  onChange={e => setForm(current => ({ ...current, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  type="email"
                />
              ) : (
                <p className="text-sm text-slate-700">{currentUser.email}</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3 text-slate-700 mb-3">
                <Phone size={18} />
                <p className="text-sm font-semibold">Phone</p>
              </div>
              <p className="text-sm text-slate-700">{currentUser.phone || 'Not set'}</p>
            </div>
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
              <div className="flex items-center gap-3 text-slate-700 mb-3">
                <Info size={18} />
                <p className="text-sm font-semibold">Bio</p>
              </div>
              {isEditing ? (
                <textarea
                  value={form.bio}
                  onChange={e => setForm(current => ({ ...current, bio: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 resize-none"
                />
              ) : (
                <p className="text-sm text-slate-700 leading-relaxed">{currentUser.bio}</p>
              )}
            </div>

            {isEditing ? (
              <>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3 text-slate-700 mb-3">
                    <Lock size={18} />
                    <p className="text-sm font-semibold">New Password</p>
                  </div>
                  <input
                    value={form.password}
                    onChange={e => setForm(current => ({ ...current, password: e.target.value }))}
                    type="password"
                    placeholder="Leave empty to keep current password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3 text-slate-700 mb-3">
                    <Lock size={18} />
                    <p className="text-sm font-semibold">Confirm Password</p>
                  </div>
                  <input
                    value={form.confirmPassword}
                    onChange={e => setForm(current => ({ ...current, confirmPassword: e.target.value }))}
                    type="password"
                    placeholder="Re-enter new password"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
              </>
            ) : null}

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 md:col-span-2">
              <p className="text-xs text-slate-500">Only profile picture, name, email, bio, and password are editable. Username is read-only.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
