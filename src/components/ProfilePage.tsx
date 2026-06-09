import { useEffect, useState, type ChangeEvent } from 'react';
import type { User } from '../types';
import { Mail, Phone, Info, Lock, Moon, Sun } from 'lucide-react';

interface ProfilePageProps {
  currentUser: User;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onUpdateProfile: (data: {
    profilePictureUrl: string;
    name: string;
    email: string;
    phone: string;
    bio: string;
    password?: string;
  }) => Promise<{ status: 'success' | 'invalid'; message?: string }>;
}

export default function ProfilePage({ currentUser, onLogout, onUpdateProfile, isDark, onToggleDark }: ProfilePageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAvatarLightbox, setShowAvatarLightbox] = useState(false);
  const [form, setForm] = useState({
    profilePictureUrl: currentUser.profilePictureUrl,
    name: currentUser.name,
    email: currentUser.email,
    phone: currentUser.phone,
    bio: currentUser.bio,
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    setForm({
      profilePictureUrl: currentUser.profilePictureUrl,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
      bio: currentUser.bio,
      password: '',
      confirmPassword: '',
    });
  }, [currentUser]);

  const normalizeImageUrl = (rawUrl: string) => {
    const trimmed = rawUrl.trim();
    if (!trimmed) return '';
    if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    return `https://${trimmed}`;
  };

  const avatarSource = normalizeImageUrl(isEditing ? form.profilePictureUrl : currentUser.profilePictureUrl);

  const getPictureDisplayLabel = (url: string) => {
    if (!url.trim()) return 'Not set';
    if (url.startsWith('data:')) {
      const ext = url.match(/^data:image\/(\w+)/)?.[1] ?? 'jpg';
      return `${currentUser.username}.${ext}`;
    }
    return url;
  };

  useEffect(() => {
    setAvatarLoadError(false);
  }, [avatarSource]);

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
    setSuccess('');
    setForm({
      profilePictureUrl: currentUser.profilePictureUrl,
      name: currentUser.name,
      email: currentUser.email,
      phone: currentUser.phone,
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
      profilePictureUrl: normalizeImageUrl(form.profilePictureUrl),
      name: form.name,
      email: form.email,
      phone: form.phone,
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

  const handleFileUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Image is too large. Please choose a file smaller than 2MB.');
      event.target.value = '';
      return;
    }

    setError('');
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.onerror = () => reject(new Error('Failed to read selected image.'));
        reader.readAsDataURL(file);
      });

      setForm(current => ({ ...current, profilePictureUrl: dataUrl }));
      setAvatarLoadError(false);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : 'Unable to process image.';
      setError(message);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <>
      {showAvatarLightbox && avatarSource && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
          onClick={() => setShowAvatarLightbox(false)}
        >
          <div className="relative max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <img
              src={avatarSource}
              alt={`${currentUser.name} avatar`}
              className="w-full rounded-3xl object-cover shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setShowAvatarLightbox(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md text-slate-600 hover:text-slate-900 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-6">
            <div className="flex items-center gap-4">
                {!avatarSource || avatarLoadError ? (
                  <div className="w-20 h-20 rounded-3xl bg-slate-200 text-slate-700 flex items-center justify-center text-2xl font-semibold">
                    {(isEditing ? form.name : currentUser.name).slice(0, 1).toUpperCase()}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAvatarLightbox(true)}
                    className="focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-3xl"
                    title="Click to view full image"
                  >
                    <img
                      src={avatarSource}
                      alt={`${currentUser.name} avatar`}
                      onError={() => setAvatarLoadError(true)}
                      className="w-20 h-20 rounded-3xl object-cover bg-slate-100 hover:opacity-90 transition-opacity cursor-pointer"
                    />
                  </button>
                )}
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{isEditing ? form.name : currentUser.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">@{currentUser.username}</p>
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
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                >
                  Edit profile
                </button>
              ) : (
                <>
                  <button
                    onClick={handleCancel}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-5 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
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
            {/* Appearance */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 md:col-span-2 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-0.5">Appearance</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{isDark ? 'Dark mode is on. Your preference is saved.' : 'Light mode is on.'}</p>
              </div>
              <button
                type="button"
                onClick={onToggleDark}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-semibold border transition-colors ${
                  isDark
                    ? 'bg-slate-800 border-slate-600 text-amber-300 hover:bg-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {isDark ? <Sun size={15} /> : <Moon size={15} />}
                {isDark ? 'Switch to Light' : 'Switch to Dark'}
              </button>
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 md:col-span-2">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Username</p>
              <input
                value={`@${currentUser.username}`}
                disabled
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-800 px-4 py-3 text-sm text-slate-500 dark:text-slate-400"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Username cannot be edited.</p>
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 md:col-span-2">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 mb-3">
                <Info size={18} />
                <p className="text-sm font-semibold">Profile Picture</p>
              </div>
              {isEditing ? (
                <div className="space-y-3">
                  <label className="inline-flex items-center justify-center rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer">
                    {uploading ? 'Processing image...' : 'Upload image file'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => void handleFileUpload(e)}
                    />
                  </label>
                  <input
                    value={form.profilePictureUrl}
                    onChange={e => setForm(current => ({ ...current, profilePictureUrl: e.target.value }))}
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                    placeholder="Or paste image URL (https://...)"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400">Upload an image or use an image URL. Max upload size: 2MB.</p>
                </div>
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300 break-all">{getPictureDisplayLabel(currentUser.profilePictureUrl)}</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 mb-3">
                <Info size={18} />
                <p className="text-sm font-semibold">Name</p>
              </div>
              {isEditing ? (
                <input
                  value={form.name}
                  onChange={e => setForm(current => ({ ...current, name: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                />
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300">{currentUser.name}</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 mb-3">
                <Mail size={18} />
                <p className="text-sm font-semibold">Email</p>
              </div>
              {isEditing ? (
                <input
                  value={form.email}
                  onChange={e => setForm(current => ({ ...current, email: e.target.value }))}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  type="email"
                />
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300">{currentUser.email}</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 mb-3">
                <Phone size={18} />
                <p className="text-sm font-semibold">Phone</p>
              </div>
              {isEditing ? (
                <input
                  value={form.phone}
                  onChange={e => setForm(current => ({ ...current, phone: e.target.value }))}
                  type="tel"
                  placeholder="+91 00000 00000"
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                />
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300">{currentUser.phone || 'Not set'}</p>
              )}
            </div>
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 md:col-span-2">
              <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 mb-3">
                <Info size={18} />
                <p className="text-sm font-semibold">Bio</p>
              </div>
              {isEditing ? (
                <textarea
                  value={form.bio}
                  onChange={e => setForm(current => ({ ...current, bio: e.target.value }))}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 resize-none"
                />
              ) : (
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{currentUser.bio}</p>
              )}
            </div>

            {isEditing ? (
              <>
                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5">
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 mb-3">
                    <Lock size={18} />
                    <p className="text-sm font-semibold">New Password</p>
                  </div>
                  <input
                    value={form.password}
                    onChange={e => setForm(current => ({ ...current, password: e.target.value }))}
                    type="password"
                    placeholder="Leave empty to keep current password"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>

                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5">
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-200 mb-3">
                    <Lock size={18} />
                    <p className="text-sm font-semibold">Confirm Password</p>
                  </div>
                  <input
                    value={form.confirmPassword}
                    onChange={e => setForm(current => ({ ...current, confirmPassword: e.target.value }))}
                    type="password"
                    placeholder="Re-enter new password"
                    className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30"
                  />
                </div>
              </>
            ) : null}

            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 p-5 md:col-span-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">Only profile picture, name, email, bio, and password are editable. Username is read-only.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
