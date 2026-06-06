import { memo, useCallback, useMemo, useState } from 'react';
import { ExternalLink, Tag, Trash2, Edit3, TrendingDown, ShoppingBag } from 'lucide-react';
import type { Product, Page } from '../types';

const formatPrice = (price: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(price);

interface ProductCardProps {
  product: Product;
  pages: Page[];
  onDelete: (id: string) => void;
  onEdit: (product: Product) => void;
}

function ProductCard({ product, pages, onDelete, onEdit }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  const discount = useMemo(
    () =>
      product.original_price && product.original_price > product.price
        ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
        : null,
    [product.original_price, product.price]
  );

  const page = useMemo(
    () => pages.find(p => p.id === product.page_id),
    [pages, product.page_id]
  );

  const handleDelete = useCallback(() => onDelete(product.id), [onDelete, product.id]);
  const handleEdit = useCallback(() => onEdit(product), [onEdit, product]);

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm transition-all duration-200 overflow-hidden flex flex-col hover:shadow-lg">
      <div className="relative bg-white h-[120px] sm:h-[150px] overflow-hidden">
        {!imageError && product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain p-3 transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={40} className="text-slate-200 sm:w-12 sm:h-12" />
          </div>
        )}

        {discount && (
          <div className="absolute top-2 sm:top-3 left-2 sm:left-3 bg-red-500 text-white text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full flex items-center gap-1">
            <TrendingDown size={9} />
            -{discount}%
          </div>
        )}

        {page && (
          <div
            className="absolute top-2 sm:top-3 right-2 sm:right-3 text-xs font-medium px-1.5 sm:px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-sm border hidden sm:block"
            style={{ borderColor: `${page.color}40`, color: page.color }}
          >
            {page.icon} {page.name}
          </div>
        )}

        <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleEdit}
            className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-amber-600 hover:border-amber-200 transition-colors"
          >
            <Edit3 size={13} />
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100 text-slate-500 hover:text-red-500 hover:border-red-200 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="flex flex-col flex-1 p-3 sm:p-4 gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide line-clamp-1">
            {product.category}
          </span>
          {product.company && (
            <span className="inline-flex items-center text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              {product.company}
            </span>
          )}
        </div>
        <h3 className="text-sm font-semibold text-slate-800 leading-snug line-clamp-2 flex-1">
          {product.name}
        </h3>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-base sm:text-lg font-bold text-slate-900">{formatPrice(product.price)}</span>
            {product.original_price && product.original_price > product.price && (
              <span className="text-xs text-slate-400 line-through">
                {formatPrice(product.original_price)}
              </span>
            )}
          </div>
        </div>
        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {product.tags.slice(0, 2).map(tag => (
              <span
                key={tag}
                className="inline-flex items-center gap-0.5 text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full"
              >
                <Tag size={8} />
                {tag}
              </span>
            ))}
            {product.tags.length > 2 && (
              <span className="text-xs text-slate-400 px-1.5 py-0.5">+{product.tags.length - 2}</span>
            )}
          </div>
        )}
        {product.notes && (
          <p className="text-xs text-slate-400 line-clamp-1">{product.notes}</p>
        )}
        {product.product_url && (
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-auto flex items-center justify-center gap-1 sm:gap-2 w-full py-2 sm:py-2.5 bg-amber-400 hover:bg-amber-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors duration-150 shadow-sm"
          >
            <ExternalLink size={12} className="sm:w-3.5 sm:h-3.5" />
            View Product
          </a>
        )}
      </div>
    </div>
  );
}

export default memo(ProductCard);

