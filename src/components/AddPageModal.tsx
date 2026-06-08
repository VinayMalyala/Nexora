import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

const PAGE_PRESETS = [
  { name: 'My Wishlist', icon: '⭐', color: '#f59e0b' },
  { name: 'Electronics', icon: '💻', color: '#3b82f6' },
  { name: 'Personal Care', icon: '🌿', color: '#10b981' },
  { name: 'Clothes', icon: '👕', color: '#ec4899' },
  { name: 'Food & Grocery', icon: '🥗', color: '#84cc16' },
  { name: 'Books', icon: '📚', color: '#8b5cf6' },
  { name: 'Home & Kitchen', icon: '🏠', color: '#06b6d4' },
  { name: 'Sports', icon: '🏃', color: '#f97316' },
];

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ec4899', '#84cc16', '#06b6d4', '#f97316', '#ef4444'];

interface AddPageModalProps {
  onClose: () => void;
  onSave: (name: string, icon: string, color: string) => Promise<void>;
}

export default function AddPageModal({ onClose, onSave }: AddPageModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📄');
  const [color, setColor] = useState('#f59e0b');
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handlePreset = (p: typeof PAGE_PRESETS[number]) => {
    setName(p.name);
    setIcon(p.icon);
    setColor(p.color);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitError('');
    setSaving(true);
    try {
      await onSave(name.trim(), icon, color);
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create page. Please try again.';
      setSubmitError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">New Page</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {/* Presets */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2.5">Quick Presets</p>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {PAGE_PRESETS.map(p => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handlePreset(p)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition-all ${
                    name === p.name ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="text-lg">{p.icon}</span>
                  <span className="truncate w-full text-center text-[10px] sm:text-xs">{p.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom */}
          <div className="flex gap-2 sm:gap-3">
            <div className="w-16 sm:w-20">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Icon</label>
              <input
                value={icon}
                onChange={e => setIcon(e.target.value)}
                maxLength={2}
                className="w-full px-2 py-2.5 text-center text-xl rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Page Name <span className="text-red-400">*</span></label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Birthday List"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Accent Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 transition-transform ${color === c ? 'border-slate-700 scale-110' : 'border-transparent hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {submitError ? (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {submitError}
            </p>
          ) : null}

          <div className="flex gap-2 sm:gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={13} className="animate-spin sm:w-3.5 sm:h-3.5" />}
              <span className="hidden sm:inline">Create Page</span>
              <span className="sm:hidden">Create</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
