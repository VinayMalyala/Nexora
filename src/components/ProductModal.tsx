import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  company: '',
  product_url: '',
  notes: '',
};

export default memo(function ProductModal({
  pages,
  defaultPageId,
  editProduct,
  onClose,
  onSave,
}: ProductModalProps) {
  const initialForm = useMemo(
    () => ({
      ...EMPTY_FORM,
      category: editProduct?.category ?? EMPTY_FORM.category,
      page_id: editProduct?.page_id ?? defaultPageId ?? '',
      ...(editProduct
        ? {
            name: editProduct.name,
            price: String(editProduct.price),
            original_price: editProduct.original_price ? String(editProduct.original_price) : '',
            image_url: editProduct.image_url,
            category: editProduct.category,
            page_id: editProduct.page_id ?? defaultPageId ?? '',
            company: editProduct.company ?? '',
            product_url: editProduct.product_url,
            notes: editProduct.notes,
          }
        : {}),
    }),
    [defaultPageId, editProduct]
  );

  const [form, setForm] = useState(initialForm);
  const [tags, setTags] = useState<string[]>(editProduct?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(initialForm);
    setTags(editProduct?.tags ?? []);
    setTagInput('');
  }, [initialForm, editProduct?.tags]);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validate = useCallback(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Product name is required';
    if (!form.price || isNaN(Number(form.price)) || Number(form.price) < 0) e.price = 'Valid price required';
    if (!form.product_url.trim()) e.product_url = 'Product link is required';
    return e;
  }, [form.name, form.price, form.product_url]);

  const parseTags = useCallback((value: string) => {
    return value
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const errs = validate();
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }

      setSubmitError('');

      const finalTags = tagInput
        ? [...tags, ...parseTags(tagInput).filter(tag => !tags.includes(tag))]
        : tags;

      setSaving(true);
      try {
        await onSave(
          {
            name: form.name.trim(),
            price: Number(form.price),
            original_price: form.original_price ? Number(form.original_price) : null,
            image_url: form.image_url.trim(),
            category: form.category,
            page_id: form.page_id || null,
            company: form.company?.trim() || '',
            product_url: form.product_url.trim(),
            notes: form.notes.trim(),
          },
          finalTags,
          editProduct?.id
        );
        onClose();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to save product';
        setSubmitError(message);
      } finally {
        setSaving(false);
      }
    },
    [editProduct?.id, form, onClose, onSave, parseTags, tagInput, tags, validate]
  );

  const addTag = useCallback(() => {
    const parsed = parseTags(tagInput);
    if (!parsed.length) return;
    setTags(prev => {
      const next = [...prev];
      parsed.forEach(tag => {
        if (!next.includes(tag)) next.push(tag);
      });
      return next;
    });
    setTagInput('');
  }, [parseTags, tagInput]);

  const field = useCallback(
    (label: string, key: keyof typeof form, opts?: { type?: string; placeholder?: string; required?: boolean }) => (
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1.5">
          {label} {opts?.required && <span className="text-red-400">*</span>}
        </label>
        <input
          ref={key === 'name' ? nameRef : undefined}
          type={opts?.type ?? 'text'}
          placeholder={opts?.placeholder}
          value={form[key]}
          onChange={e => {
            setForm(current => ({ ...current, [key]: e.target.value }));
            setErrors(current => ({ ...current, [key]: '' }));
          }}
          className={`w-full px-3 py-2.5 text-sm rounded-xl border ${errors[key] ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'} focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors`}
        />
        {errors[key] && <p className="text-xs text-red-400 mt-1">{errors[key]}</p>}
      </div>
    ),
    [errors, form]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4">
            {field('Product Name', 'name', { required: true, placeholder: 'e.g. Just Herbs Anti Hairfall Shampoo' })}

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {field('Current Price (₹)', 'price', { type: 'number', required: true, placeholder: '0' })}
              {field('Original / MRP (₹)', 'original_price', { type: 'number', placeholder: 'Optional' })}
            </div>

            {field('Image URL', 'image_url', { placeholder: 'https://...' })}
            {field('Product Link', 'product_url', { required: true, placeholder: 'https://amazon.in/...'} )}

            {field('Company', 'company', { placeholder: 'Brand or manufacturer (optional)' })}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(current => ({ ...current, category: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Page</label>
              <select
                value={form.page_id}
                onChange={e => setForm(current => ({ ...current, page_id: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors"
              >
                <option value="">No page</option>
                {pages.map(p => (
                  <option key={p.id} value={p.id}>{`${p.icon} ${p.name}`}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Tags</label>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={e => {
                    const value = e.target.value;
                    if (value.includes(',')) {
                      const parsed = parseTags(value);
                      if (parsed.length) {
                        setTags(prev => {
                          const next = [...prev];
                          parsed.forEach(tag => {
                            if (!next.includes(tag)) next.push(tag);
                          });
                          return next;
                        });
                        setTagInput('');
                        return;
                      }
                    }
                    setTagInput(value);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
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
                      <button type="button" onClick={() => setTags(current => current.filter(x => x !== t))} className="ml-0.5 hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(current => ({ ...current, notes: e.target.value }))}
                placeholder="Any personal notes..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400 transition-colors resize-none"
              />
            </div>
          </div>

          <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-slate-100 flex gap-2 sm:gap-3">
            {submitError ? (
              <p className="w-full text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {submitError}
              </p>
            ) : null}
          </div>

          <div className="px-4 sm:px-6 pb-3 sm:pb-4 flex gap-2 sm:gap-3">
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
              className="flex-1 py-2 sm:py-2.5 rounded-xl bg-amber-400 hover:bg-amber-500 disabled:opacity-60 text-white text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-2"
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
});

