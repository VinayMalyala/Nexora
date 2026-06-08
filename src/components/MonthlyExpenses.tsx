import { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Expense, Product } from '../types';

interface MonthlyExpensesProps {
  products: Product[];
  loading: boolean;
  userId: string;
}

function formatMonthYear(date: Date) {
  return date.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function MonthlyExpenses({ products, loading, userId }: MonthlyExpensesProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return monthKey(now);
  });

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState<string | ''>('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchExpenses = async () => {
      setExpensesLoading(true);
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

      setExpensesLoading(false);
    };

    void fetchExpenses();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const addExpense = async () => {
    if (!name && !productId) return;
    if (!price || price <= 0) return;

    const expensePayload = {
      user_id: userId,
      name: name || (products.find(p => p.id === productId)?.name ?? 'Item'),
      price: Number(price),
      date: new Date(date).toISOString(),
      product_id: productId || null,
      notes: notes || '',
    };

    const { data, error: insertError } = await supabase
      .from('expenses')
      .insert(expensePayload)
      .select('id, user_id, name, price, date, product_id, notes, created_at')
      .single();

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setError('');
    setExpenses(prev => [data as Expense, ...prev]);
    setName('');
    setPrice('');
    setProductId('');
    setNotes('');
  };

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return;

    const { error: deleteError } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setError('');
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const groupedByMonth = useMemo(() => {
    const map = new Map<string, Expense[]>();
    expenses.forEach(e => {
      const d = new Date(e.date);
      const key = monthKey(d);
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

  const currentMonthExpenses = groupedByMonth.get(selectedMonth) ?? [];
  const selectedMonthDisplay = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    return formatMonthYear(new Date(y, m - 1, 1));
  }, [selectedMonth]);

  const totalForSelected = currentMonthExpenses.reduce((s, e) => s + e.price, 0);

  const prevMonths = months.filter(k => k !== selectedMonth);

  const goPrev = () => {
    // move to previous month (earlier)
    const [y, m] = selectedMonth.split('-').map(Number);
    const dt = new Date(y, m - 2, 1); // previous
    setSelectedMonth(monthKey(dt));
  };
  const goNext = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const dt = new Date(y, m, 1); // next
    setSelectedMonth(monthKey(dt));
  };

  const onSelectMonth = (key: string) => setSelectedMonth(key);

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Monthly Expenses</h2>
            <p className="text-sm text-slate-500 mt-1">Add purchases and track your monthly spending. Each month is isolated.</p>
          </div>

          <div className="text-right">
            <div className="text-sm text-slate-500">Current month</div>
            <div className="text-lg font-bold text-amber-600">{selectedMonthDisplay}</div>
            <div className="mt-2 text-2xl font-extrabold text-slate-800">₹{totalForSelected.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white rounded-lg shadow-sm border p-4">
            <div className="text-sm font-semibold text-slate-700 mb-3">Add Purchase</div>

            <label className="block text-xs text-slate-500 mb-1">Product (optional)</label>
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
              className="w-full rounded-md border px-3 py-2 bg-white mb-3"
            >
              <option value="">-- Select product --</option>
              {loading && <option disabled>Loading...</option>}
              {!loading && products.map(p => (
                <option key={p.id} value={p.id}>{p.name} — ₹{p.price}</option>
              ))}
            </select>

            <label className="block text-xs text-slate-500 mb-1">Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border px-3 py-2 mb-3" />

            <label className="block text-xs text-slate-500 mb-1">Price (₹)</label>
            <input type="number" value={price} onChange={e => setPrice(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded-md border px-3 py-2 mb-3" />

            <label className="block text-xs text-slate-500 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full rounded-md border px-3 py-2 mb-3" />

            <label className="block text-xs text-slate-500 mb-1">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} className="w-full rounded-md border px-3 py-2 mb-3" />

            <div className="flex gap-2">
              <button onClick={addExpense} className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white">
                <PlusCircle size={16} /> Add
              </button>
              <button onClick={() => {
                setName(''); setPrice(''); setProductId(''); setNotes(''); setDate(new Date().toISOString().slice(0,10));
              }} className="px-3 py-2 rounded-md border">Reset</button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={goPrev} className="p-2 rounded hover:bg-slate-50"><ChevronLeft size={18} /></button>
                <div className="text-sm font-medium text-slate-700">{selectedMonthDisplay}</div>
                <button onClick={goNext} className="p-2 rounded hover:bg-slate-50"><ChevronRight size={18} /></button>
              </div>

              <div className="text-sm text-slate-500">Total: <span className="font-semibold text-slate-800">₹{totalForSelected.toFixed(2)}</span></div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              {error ? <div className="mb-3 text-xs text-red-500">{error}</div> : null}
              {currentMonthExpenses.length === 0 ? (
                <div className="text-sm text-slate-400">
                  {expensesLoading ? 'Loading expenses...' : 'No purchases added for this month.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {currentMonthExpenses.map(e => (
                    <div key={e.id} className="flex items-center justify-between p-3 rounded-md hover:bg-slate-50">
                      <div>
                        <div className="text-sm font-medium text-slate-800">{e.name}</div>
                        <div className="text-xs text-slate-500">{new Date(e.date).toLocaleString()} • {e.notes}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold">₹{e.price.toFixed(2)}</div>
                        <button onClick={() => deleteExpense(e.id)} className="p-2 rounded text-slate-400 hover:text-red-500">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-4">
              <div className="text-sm font-semibold text-slate-700 mb-3">Previous Months</div>
              {prevMonths.length === 0 && <div className="text-sm text-slate-400">No previous months recorded.</div>}
              {prevMonths.length > 0 && (
                <div className="space-y-2">
                  {prevMonths.map(k => {
                    const arr = groupedByMonth.get(k) ?? [];
                    const [y, m] = k.split('-').map(Number);
                    const label = formatMonthYear(new Date(y, m - 1, 1));
                    const sum = arr.reduce((s, x) => s + x.price, 0);
                    return (
                      <button key={k} onClick={() => onSelectMonth(k)} className="w-full flex items-center justify-between p-3 rounded hover:bg-slate-50">
                        <div className="text-sm text-slate-800">{label}</div>
                        <div className="text-sm text-slate-700 font-semibold">₹{sum.toFixed(2)}</div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
