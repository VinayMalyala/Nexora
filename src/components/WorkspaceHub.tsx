import { memo } from 'react';
import { Target, Shirt, ArrowLeftRight, BarChart3, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ViewMode } from '../types';

interface WorkspaceHubProps {
  onNavigate: (view: ViewMode) => void;
}

interface WorkspaceCard {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  active: boolean;
  viewMode?: ViewMode;
  textColor: string;
  cardClass: string;
}

const CARDS: WorkspaceCard[] = [
  {
    title: 'Goals',
    description: 'Set and track goals by day, week, or month.',
    icon: Target,
    gradient: 'from-amber-400 to-orange-500',
    active: true,
    viewMode: 'goals',
    textColor: 'text-amber-600 dark:text-amber-400',
    cardClass: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700',
  },
  {
    title: 'Wardrobe',
    description: 'Plan outfits with smart non-repeating combinations.',
    icon: Shirt,
    gradient: 'from-blue-400 to-indigo-500',
    active: true,
    viewMode: 'wardrobe',
    textColor: 'text-blue-600 dark:text-blue-400',
    cardClass: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700',
  },
  {
    title: 'Compare',
    description: 'Compare products side by side for smarter decisions.',
    icon: ArrowLeftRight,
    gradient: 'from-emerald-400 to-teal-500',
    active: false,
    textColor: '',
    cardClass: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60',
  },
  {
    title: 'Insights',
    description: 'Visualize spending trends and purchase analytics.',
    icon: BarChart3,
    gradient: 'from-purple-400 to-violet-500',
    active: false,
    textColor: '',
    cardClass: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60',
  },
];

export default memo(function WorkspaceHub({ onNavigate }: WorkspaceHubProps) {
  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Workspace</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organize products, expenses, wardrobe, and goals in one place.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CARDS.map(card => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                onClick={() => {
                  if (card.active && card.viewMode) {
                    onNavigate(card.viewMode);
                  }
                }}
                className={`relative rounded-2xl border p-6 transition-all duration-200 ${card.cardClass} ${card.active ? 'cursor-pointer' : ''}`}
              >
                {!card.active && (
                  <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                    Coming soon
                  </span>
                )}

                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center mb-4 shadow-sm`}>
                  <Icon size={20} className="text-white" />
                </div>

                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">{card.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-snug">{card.description}</p>

                {card.active && (
                  <div className={`mt-4 inline-flex items-center gap-1 text-sm font-semibold ${card.textColor}`}>
                    Open <ChevronRight size={14} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
