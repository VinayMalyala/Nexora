import type { User } from '../types';
import { User as UserIcon, Mail, Phone, Info } from 'lucide-react';

interface ProfilePageProps {
  currentUser: User;
  onLogout: () => void;
}

export default function ProfilePage({ currentUser, onLogout }: ProfilePageProps) {
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-6">
            <div className="flex items-center gap-4">
              <img
                src={currentUser.profilePictureUrl}
                alt={`${currentUser.name} avatar`}
                className="w-20 h-20 rounded-3xl object-cover bg-slate-100"
              />
              <div>
                <p className="text-2xl font-bold text-slate-900">{currentUser.name}</p>
                <p className="text-sm text-slate-500">@{currentUser.username}</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
            >
              Log out
            </button>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-3 text-slate-700 mb-3">
                <Mail size={18} />
                <p className="text-sm font-semibold">Email</p>
              </div>
              <p className="text-sm text-slate-700">{currentUser.email}</p>
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
              <p className="text-sm text-slate-700 leading-relaxed">{currentUser.bio}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
