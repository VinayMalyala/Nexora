import { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag, Loader2 } from 'lucide-react';
import type { Product, Page } from '../types';
import { CATEGORIES } from '../types';

interface ProductModalProps {
  pages: Page[];
  defaultPageId?: string | null;
  editProduct?: Product | null;
  onClose: () => void;
  onSave: (
    data: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order'>,
    tags: string[],
    editId?: string
  ) => Promise<void>;
}

const EMPTY_FORM = {
  name: '',
  price: '',
  original_price: '',
  image_url: '',
  category: 'Personal Care',
  page_id: '',
  product_url: '',
  notes: '',
};

export default function ProductModal({
  pages,
  defaultPageId,
  editProduct,
  onClose,
  onSave,
}: ProductModalProps) {
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    page_id: defaultPageId ?? '',
    ...(editProduct
      ? {
          name: editProduct.name,
          price: String(editProduct.price),
          original_price: editProduct.original_price ? String(editProduct.original_price) : '',
          image_url: editProduct.image_url,
          category: editProduct.category,
          page_id: editProduct.page_id ?? '',
          product_url: editProduct.product_url,
          notes: editProduct.notes,
        }
      : {}),
  });
  const [tags, setTags] = useState<string[]>(editProduct?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => { nameRef.current?.focus(); }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Valid price required';
    if (!form.product_url.trim()) e.product_url = 'Product link is required';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    await onSave(
      {
        name: form.name.trim(),
        price: Number(form.price),
        original_price: form.original_price ? Number(form.original_price) : null,
        image_url: form.image_url.trim(),
        category: form.category,
        page_id: form.page_id || null,
        product_url: form.product_url.trim(),
        notes: form.notes.trim(),
      },
      tags,
      editProduct?.id
    );
    setSaving(false);
    onClose();
  };

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const field = (
    label: string,
    key: keyof typeof form,
    opts?: { type?: string; placeholder?: string; required?: boolean }
  ) => (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {opts?.required && <span className="text-red-400">*</span>}
      </label>
      <input
        ref={key === 'name' ? nameRef : undefined}
        type={opts?.type ?? 'text'}
        placeholder={opts?.placeholder}
        value={form[key]}
        onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); }}
        className={`w-full px-3 py-2.5 text-sm rounded-xl border ${errors[key] ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'} focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors`}
      />
      {errors[key] && <p className="text-xs text-red-400 mt-1">{errors[key]}</p>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">
            {editProduct ? 'Edit Product' : 'Add Product'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
            {field('Product Name', 'name', { required: true, placeholder: 'e.g. Just Herbs Anti Hairfall Shampoo' })}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {field('Current Price (₹)', 'price', { type: 'number', required: true, placeholder: '0' })}
              {field('Original / MRP (₹)', 'original_price', { type: 'number', placeholder: 'Optional' })}
            </div>

            {field('Image URL', 'image_url', { placeholder: 'https://...' })}
            {field('Product Link', 'product_url', { required: true, placeholder: 'https://amazon.in/...' })}

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Page */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Page</label>
              <select
                value={form.page_id}
                onChange={e => setForm(f => ({ ...f, page_id: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
              >
                <option value="">No page</option>
                {pages.map(p => <option key={p.id} value={p.id}>{p.icon} {p.name}</option>)}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tags</label>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                  placeholder="shampoo, organic..."
                  className="flex-1 px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors flex-shrink-0"
                >
                  <Plus size={16} />
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map(t => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                      <Tag size={9} />
                      {t}
                      <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))} className="ml-0.5 hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any personal notes..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex gap-2 sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 sm:py-2.5 rounded-xl border border-slate-200 text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin sm:w-4 sm:h-4" /> : null}
              <span className="hidden sm:inline">{editProduct ? 'Save Changes' : 'Add Product'}</span>
              <span className="sm:hidden">{editProduct ? 'Save' : 'Add'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

