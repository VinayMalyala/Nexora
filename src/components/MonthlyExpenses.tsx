import { useCallback, useEffect, useMemo, useState } from 'react';
import { PlusCircle, Trash2, ChevronLeft, ChevronRight, RefreshCw, Clock, AlertTriangle, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Expense, Product } from '../types';

interface MonthlyExpensesProps {
  products: Product[];
  loading: boolean;
  userId: string;
}

const IST_TIME_ZONE = 'Asia/Kolkata';
const IST_OFFSET_MINUTES = 5 * 60 + 30;

const IST_DATE_PARTS_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: IST_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const IST_MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  month: 'long',
  year: 'numeric',
});

const IST_DATE_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  dateStyle: 'medium',
});

const IST_TIME_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: IST_TIME_ZONE,
  hour: 'numeric',
  minute: '2-digit',
});

function getISTDateParts(dateLike: Date | string) {
  const date = typeof dateLike === 'string' ? new Date(dateLike) : dateLike;
  const parts = IST_DATE_PARTS_FORMATTER.formatToParts(date);

  const year = Number(parts.find(p => p.type === 'year')?.value);
  const month = Number(parts.find(p => p.type === 'month')?.value);
  const day = Number(parts.find(p => p.type === 'day')?.value);

  return { year, month, day };
}

function monthKeyFromIST(dateLike: Date | string) {
  const { year, month } = getISTDateParts(dateLike);
  return `${year}-${String(month).padStart(2, '0')}`;
}

function formatISTMonthYearFromKey(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  return IST_MONTH_YEAR_FORMATTER.format(new Date(Date.UTC(year, month - 1, 1, 12, 0, 0)));
}

function currentISTDateInput() {
  const { year, month, day } = getISTDateParts(new Date());
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function istInputDateToISO(dateInput: string) {
  const parts = dateInput.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return null;
  }

  const [year, month, day] = parts;
  const utcMillis = Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis).toISOString();
}

function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split('-').map(Number);
  const totalMonths = year * 12 + (month - 1) + delta;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = ((totalMonths % 12) + 12) % 12 + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
}

function toISTDayNumber(dateLike: Date | string) {
  const { year, month, day } = getISTDateParts(dateLike);
  return Math.floor(Date.UTC(year, month - 1, day) / 86400000);
}

export default function MonthlyExpenses({ products, loading, userId }: MonthlyExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingDeleteExpenseId, setPendingDeleteExpenseId] = useState<string | null>(null);
  const [deletingExpense, setDeletingExpense] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return monthKeyFromIST(new Date());
  });

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [date, setDate] = useState(() => currentISTDateInput());
  const [productId, setProductId] = useState<string | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchExpenses = async () => {
      setExpensesLoading(true);
      try {
        const { data, error: fetchError } = await supabase
          .from('expenses')
          .select('id, user_id, name, price, date, product_id, notes, created_at')
          .eq('user_id', userId)
          .order('date', { ascending: false });

        if (!mounted) return;

        if (fetchError) {
          setError(fetchError.message);
          setExpenses([]);
        } else {
          setError('');
          setExpenses((data ?? []) as Expense[]);
        }
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load expenses. Check your connection.');
        setExpenses([]);
      } finally {
        if (mounted) setExpensesLoading(false);
      }
    };

    void fetchExpenses();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const addExpense = useCallback(async () => {
    if (!name.trim() && !productId) {
      setError('Please select a saved product or enter an item name (e.g. Apples).');
      return;
    }
    if (!price || price <= 0) {
      setError('Please enter a valid price greater than 0.');
      return;
    }
    if (submitting) return;

    // Validate date before constructing — malformed input would yield NaN.
    const parts = date.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) {
      setError('Invalid date selected. Please choose a valid date.');
      return;
    }
    const localDate = istInputDateToISO(date);
    if (!localDate) {
      setError('Invalid date selected. Please choose a valid date.');
      return;
    }

    const expensePayload = {
      user_id: userId,
      name: name || (products.find(p => p.id === productId)?.name ?? 'Item'),
      price: Number(price),
      date: localDate,
      product_id: productId || null,
      notes: notes || '',
    };

    setSubmitting(true);

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert(expensePayload)
      .select('id, user_id, name, price, date, product_id, notes, created_at')
      .single();

    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }

    setError('');
    setExpenses(prev => [data as Expense, ...prev]);
    setName('');
    setPrice('');
    setProductId('');
    setNotes('');
    setSubmitting(false);
  }, [date, name, notes, price, productId, products, submitting, userId]);

  const deleteExpense = useCallback(async (id: string) => {
    if (deletingExpense) return;
    setDeletingExpense(true);

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      setError(deleteError.message);
      setDeletingExpense(false);
      return;
    }

    setError('');
    setExpenses(prev => prev.filter(e => e.id !== id));
    setPendingDeleteExpenseId(null);
    setDeletingExpense(false);
  }, [deletingExpense, userId]);

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, Expense[]>();
    expenses.forEach(e => {
      const key = monthKeyFromIST(e.date);
      const arr = map.get(key) ?? [];
      arr.push(e);
      map.set(key, arr);
    });
    return map;
  }, [expenses]);

  const months = useMemo(() => {
    // sort months descending
    const keys = Array.from(groupedByMonth.keys()).sort((a, b) => b.localeCompare(a));
    return keys;
  }, [groupedByMonth]);

  const currentMonthExpenses = useMemo(
    () => groupedByMonth.get(selectedMonth) ?? [],
    [groupedByMonth, selectedMonth]
  );

  const selectedMonthDisplay = useMemo(() => {
    return formatISTMonthYearFromKey(selectedMonth);
  }, [selectedMonth]);

  const monthLabel = useMemo(() => {
    const currentMonthKey = monthKeyFromIST(new Date());
    return selectedMonth === currentMonthKey ? 'Current month' : 'Selected month';
  }, [selectedMonth]);

  const totalForSelected = useMemo(
    () => currentMonthExpenses.reduce((s, e) => s + e.price, 0),
    [currentMonthExpenses]
  );

  const prevMonths = useMemo(
    () => months.filter(k => k !== selectedMonth),
    [months, selectedMonth]
  );

  const goPrev = useCallback(() => {
    setSelectedMonth(shiftMonthKey(selectedMonth, -1));
  }, [selectedMonth]);

  const goNext = useCallback(() => {
    setSelectedMonth(shiftMonthKey(selectedMonth, 1));
  }, [selectedMonth]);

  const onSelectMonth = useCallback((key: string) => setSelectedMonth(key), []);

  // Restock Insights: only uses expenses that are linked to a product_id
  const restockInsights = useMemo(() => {
    // Build O(1) product lookup upfront — avoids O(n) find() inside the loop.
    const productMap = new Map(products.map(p => [p.id, p.name]));

    const byProduct = new Map<string, Date[]>();
    expenses.forEach(e => {
      if (!e.product_id) return;
      const dates = byProduct.get(e.product_id) ?? [];
      dates.push(new Date(e.date));
      byProduct.set(e.product_id, dates);
    });

    const todayDayNumber = toISTDayNumber(new Date());

    const rows: {
      productId: string;
      productName: string;
      lastBought: Date;
      daysSinceLast: number;
      avgInterval: number | null;
      dueSoon: boolean;
    }[] = [];

    byProduct.forEach((dates, productId) => {
      // Spread to avoid mutating the original array stored in the Map.
      const sorted = [...dates].sort((a, b) => b.getTime() - a.getTime());
      const lastBought = sorted[0];

      // Clamp to 0 — future-dated entries would otherwise produce negative values.
      const rawDiff = todayDayNumber - toISTDayNumber(lastBought);
      const daysSinceLast = Math.max(0, rawDiff);

      let avgInterval: number | null = null;
      if (sorted.length >= 2) {
        const intervals: number[] = [];
        for (let i = 0; i < sorted.length - 1; i++) {
          const diff = toISTDayNumber(sorted[i]) - toISTDayNumber(sorted[i + 1]);
          if (diff > 0) intervals.push(diff);
        }
        if (intervals.length > 0) {
          avgInterval = Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length);
        }
      }

      const dueSoon = avgInterval !== null && daysSinceLast >= avgInterval * 0.8;
      const productName = productMap.get(productId) ?? 'Unknown product';

      rows.push({ productId, productName, lastBought, daysSinceLast, avgInterval, dueSoon });
    });

    return rows.sort((a, b) => {
      // Due-soon products rise to the top; then most days since last purchase.
      if (a.dueSoon !== b.dueSoon) return a.dueSoon ? -1 : 1;
      return b.daysSinceLast - a.daysSinceLast;
    });
  }, [expenses, products]);

  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Monthly Expenses</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Add purchases and track your monthly spending. Each month is isolated.</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-500 dark:text-slate-400">{monthLabel}</div>
            <div className="text-lg font-bold text-amber-600">{selectedMonthDisplay}</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-800 dark:text-slate-100">₹{totalForSelected.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Add Purchase</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              You can track items not listed in cards too, like apples, vegetables, fuel, etc.
            </p>

            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Saved Product (optional)</label>
            <select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                const p = products.find(pp => pp.id === e.target.value);
                if (p) {
                  setName(p.name);
                  setPrice(p.price);
                }
              }}
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 bg-white mb-3"
            >
              <option value="">-- Select from saved products --</option>
              {loading && <option disabled>Loading...</option>}
              {!loading && products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
              ))}
            </select>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
              Leave this empty to add a manual item.
            </p>

            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Item Name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Apples"
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 mb-3"
            />

            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Price (₹)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 mb-3" />

            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 mb-3" />

            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Notes</label>
            <input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. 1kg fruits"
              className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 mb-3"
            />

            <div className="flex gap-2">
              <button
                onClick={() => void addExpense()}
                disabled={submitting}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed text-white"
              >
                <PlusCircle size={16} /> {submitting ? 'Adding...' : 'Add'}
              </button>
              <button onClick={() => {
                setName(''); setPrice(''); setProductId(''); setNotes(''); setDate(currentISTDateInput());
              }} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-600 dark:text-slate-300">Reset</button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={goPrev} className="p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300"><ChevronLeft size={18} /></button>
                <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{selectedMonthDisplay}</div>
                <button onClick={goNext} className="p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-700 dark:text-slate-300"><ChevronRight size={18} /></button>
              </div>

              <div className="text-sm text-slate-500 dark:text-slate-400">Total: <span className="font-semibold text-slate-800 dark:text-slate-100">₹{totalForSelected.toFixed(2)}</span></div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <div className="mb-3 text-xs text-slate-400 dark:text-slate-500">Returned or defective item? Use the delete icon to remove that purchase from this month.</div>
              {error ? <div className="mb-3 text-xs text-red-500">{error}</div> : null}
              {currentMonthExpenses.length === 0 ? (
                <div className="text-sm text-slate-400 dark:text-slate-500">
                  {expensesLoading ? 'Loading expenses...' : 'No purchases added for this month.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {currentMonthExpenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700">
                      <div>
                        <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{e.name}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {IST_DATE_FORMATTER.format(new Date(e.date))}
                          {e.created_at ? ` • Added ${IST_TIME_FORMATTER.format(new Date(e.created_at))}` : ''}
                          {e.notes ? ` • ${e.notes}` : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold dark:text-slate-100">₹{e.price.toFixed(2)}</div>
                        <button
                          onClick={() => setPendingDeleteExpenseId(e.id)}
                          className="p-2 rounded text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
              <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Previous Months</div>
              {prevMonths.length === 0 && <div className="text-sm text-slate-400 dark:text-slate-500">No previous months recorded.</div>}
              {prevMonths.length > 0 && (
                <div className="space-y-2">
                  {prevMonths.map(k => {
                    const arr = groupedByMonth.get(k) ?? [];
                    const label = formatISTMonthYearFromKey(k);
                    const sum = arr.reduce((s, x) => s + x.price, 0);
                    return (
                      <button key={k} onClick={() => onSelectMonth(k)} className="w-full flex items-center justify-between p-3 rounded hover:bg-slate-50 dark:hover:bg-slate-700">
                        <div className="text-sm text-slate-800 dark:text-slate-200">{label}</div>
                        <div className="text-sm text-slate-700 dark:text-slate-300 font-semibold">₹{sum.toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {restockInsights.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw size={14} className="text-slate-500 dark:text-slate-400" />
                  <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Restock Insights</div>
                  <span className="ml-auto text-xs text-slate-400">{restockInsights.length} tracked product{restockInsights.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="space-y-2">
                  {restockInsights.map(row => (
                    <div
                      key={row.productId}
                      className={`flex items-start justify-between p-3 rounded-md border ${
                        row.dueSoon
                          ? 'border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800'
                          : 'border-slate-100 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        {row.dueSoon
                          ? <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                          : <TrendingDown size={13} className="text-slate-400 flex-shrink-0 mt-0.5" />
                        }
                        <div className="min-w-0">
                          <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{row.productName}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock size={10} />
                            Last bought {row.daysSinceLast === 0 ? 'today' : `${row.daysSinceLast}d ago`} · {IST_DATE_FORMATTER.format(row.lastBought)}
                          </div>
                          {row.avgInterval !== null && (
                            <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                              Avg every {row.avgInterval} day{row.avgInterval !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        {row.dueSoon && row.avgInterval !== null ? (
                          <span className="text-xs font-semibold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                            Due soon
                          </span>
                        ) : row.avgInterval !== null ? (
                          <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">
                            {Math.max(0, row.avgInterval - row.daysSinceLast)}d left
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300 dark:text-slate-600 whitespace-nowrap">1 purchase</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {pendingDeleteExpenseId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => {
              if (!deletingExpense) setPendingDeleteExpenseId(null);
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Remove purchase?</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              This will remove the item from Monthly Expenses for tracking.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingDeleteExpenseId(null)}
                disabled={deletingExpense}
                className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteExpense(pendingDeleteExpenseId)}
                disabled={deletingExpense}
                className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 disabled:opacity-60"
              >
                {deletingExpense ? 'Removing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
