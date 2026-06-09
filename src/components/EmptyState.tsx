import { memo } from 'react';
import { Package, Plus } from 'lucide-react';

interface EmptyStateProps {
  message?: string;
  subtext?: string;
  onAdd: () => void;
  actionLabel?: string;
}

function EmptyState({
  message = 'No products yet',
  subtext = 'Start adding products you want to track or buy later.',
  onAdd,
  actionLabel = 'Add your first product',
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
      <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-5">
        <Package size={36} className="text-slate-300 dark:text-slate-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300 mb-2">{message}</h3>
      <p className="text-sm text-slate-400 dark:text-slate-500 max-w-xs mb-7">{subtext}</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-500 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        <Plus size={15} />
        {actionLabel}
      </button>
    </div>
  );
}

export default memo(EmptyState);
