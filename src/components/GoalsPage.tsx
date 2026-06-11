import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Target, CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Todo } from '../types';

interface GoalsPageProps {
  userId: string;
}

type FilterKey = 'all' | 'day' | 'week' | 'month';
type Timeframe = 'day' | 'week' | 'month';

const TIMEFRAME_LABELS: Record<Timeframe, string> = {
  day: 'Today',
  week: 'This Week',
  month: 'This Month',
};

const TIMEFRAME_COLORS: Record<Timeframe, string> = {
  day: 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
  week: 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
  month: 'bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
};

const FILTERS: { value: FilterKey; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'day', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
  onDelete,
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={`group flex items-start gap-3 p-3 rounded-xl border transition-colors ${
        todo.completed
          ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/50'
          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
      }`}
    >
      <button
        type="button"
        onClick={() => onToggle(todo)}
        className="mt-0.5 flex-shrink-0 transition-colors"
      >
        {todo.completed
          ? <CheckCircle2 size={18} className="text-emerald-500" />
          : <Circle size={18} className="text-slate-300 dark:text-slate-600 hover:text-amber-400" />
        }
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium leading-snug ${
          todo.completed
            ? 'line-through text-slate-400 dark:text-slate-500'
            : 'text-slate-800 dark:text-slate-100'
        }`}>
          {todo.title}
        </div>
        {todo.notes && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
            {todo.notes}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${TIMEFRAME_COLORS[todo.timeframe]}`}>
          {TIMEFRAME_LABELS[todo.timeframe]}
        </span>
        <button
          type="button"
          onClick={() => onDelete(todo.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 dark:text-slate-600 hover:text-red-400 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
});

export default function GoalsPage({ userId }: GoalsPageProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');

  // Add form state
  const [addTitle, setAddTitle] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [addTimeframe, setAddTimeframe] = useState<Timeframe>('day');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Completed section toggle
  const [showCompleted, setShowCompleted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mounted = true;

    const fetchTodos = async () => {
      setLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('todos')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (!mounted) return;

        if (fetchError) {
          setError(fetchError.message);
        } else {
          setError('');
          setTodos((data ?? []) as Todo[]);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load goals.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void fetchTodos();
    return () => { mounted = false; };
  }, [userId]);

  const addTodo = useCallback(async () => {
    if (!addTitle.trim() || submitting) return;
    setSubmitting(true);
    setError('');

    try {
      const { data, error: insertError } = await supabase
        .from('todos')
        .insert({
          user_id: userId,
          title: addTitle.trim(),
          notes: addNotes.trim(),
          timeframe: addTimeframe,
          completed: false,
        })
        .select()
        .single();

      if (insertError) {
        setError(insertError.message);
        return;
      }

      setTodos(prev => [data as Todo, ...prev]);
      setAddTitle('');
      setAddNotes('');
      setShowNotesInput(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add goal.');
    } finally {
      setSubmitting(false);
    }
  }, [addTitle, addNotes, addTimeframe, submitting, userId]);

  const toggleTodo = useCallback(async (todo: Todo) => {
    const next = !todo.completed;
    // Optimistic update
    setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: next } : t));

    const { error } = await supabase
      .from('todos')
      .update({ completed: next, updated_at: new Date().toISOString() })
      .eq('id', todo.id)
      .eq('user_id', userId);

    if (error) {
      // Revert
      setTodos(prev => prev.map(t => t.id === todo.id ? { ...t, completed: !next } : t));
      setError(error.message);
    }
  }, [userId]);

  const deleteTodo = useCallback(async (id: string) => {
    // Optimistic remove
    setTodos(prev => prev.filter(t => t.id !== id));

    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      setError(error.message);
      // Re-fetch to restore state on error
      const { data } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (data) setTodos(data as Todo[]);
    }
  }, [userId]);

  const filtered = useMemo(
    () => filter === 'all' ? todos : todos.filter(t => t.timeframe === filter),
    [todos, filter]
  );

  const pending = useMemo(() => filtered.filter(t => !t.completed), [filtered]);
  const completed = useMemo(() => filtered.filter(t => t.completed), [filtered]);

  const allPending = todos.filter(t => !t.completed).length;
  const allCompleted = todos.filter(t => t.completed).length;

  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Goals</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {loading
                ? 'Loading your goals...'
                : `${allPending} pending · ${allCompleted} completed`
              }
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <Target size={20} className="text-white" />
          </div>
        </div>

        {/* Add Form */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 mb-5 shadow-sm">
          <div className="flex items-center gap-3">
            <input
              ref={inputRef}
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void addTodo(); }}
              placeholder="Add a new goal..."
              className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none"
            />
            <button
              type="button"
              onClick={() => void addTodo()}
              disabled={!addTitle.trim() || submitting}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-400 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shadow-sm"
            >
              <Plus size={16} className="text-white" />
            </button>
          </div>

          {/* Timeframe chips */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            {(['day', 'week', 'month'] as Timeframe[]).map(tf => (
              <button
                key={tf}
                type="button"
                onClick={() => setAddTimeframe(tf)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  addTimeframe === tf
                    ? 'bg-amber-400 text-white border-amber-400'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-amber-300'
                }`}
              >
                {TIMEFRAME_LABELS[tf]}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowNotesInput(prev => !prev)}
              className="ml-auto text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              {showNotesInput ? '− notes' : '+ notes'}
            </button>
          </div>

          {showNotesInput && (
            <textarea
              value={addNotes}
              onChange={e => setAddNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
              className="mt-3 w-full text-xs bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 px-3 py-2 text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-amber-400 resize-none"
            />
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-5 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
          {FILTERS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFilter(opt.value)}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                filter === opt.value
                  ? 'bg-amber-400 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Pending Goals */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 animate-pulse" />
            ))}
          </div>
        ) : pending.length === 0 && completed.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <Target size={40} className="mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No goals yet</p>
            <p className="text-xs mt-1">Add your first goal above to get started.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.length === 0 ? (
              <div className="text-center py-8 text-slate-400 dark:text-slate-500">
                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400 opacity-60" />
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">All caught up!</p>
                <p className="text-xs mt-1">No pending goals in this category.</p>
              </div>
            ) : (
              pending.map(todo => (
                <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
              ))
            )}
          </div>
        )}

        {/* Completed Section */}
        {completed.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setShowCompleted(prev => !prev)}
              className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors mb-3"
            >
              {showCompleted ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>Completed ({completed.length})</span>
            </button>

            {showCompleted && (
              <div className="space-y-2">
                {completed.map(todo => (
                  <TodoItem key={todo.id} todo={todo} onToggle={toggleTodo} onDelete={deleteTodo} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
