import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, RefreshCcw, Shirt, Trash2, Plus, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { WardrobeCombination, WardrobeWear } from '../types';

interface WardrobePageProps {
  userId: string;
}

type PlannedWear = {
  wear_date: string;
  combination_id: string;
};

const COMBINATION_COOLDOWN_DAYS = 5;
const SHIRT_COOLDOWN_DAYS = 20;

function toFriendlyWardrobeError(error: unknown, fallback: string) {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && 'message' in error && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : fallback;

  const lower = raw.toLowerCase();
  const missingWardrobeTables =
    (lower.includes('wardrobe_combinations') || lower.includes('wardrobe_wears')) &&
    (lower.includes('could not find the table') || lower.includes('does not exist') || lower.includes('relation'));

  if (missingWardrobeTables) {
    return 'Wardrobe database tables are missing. Apply the latest Supabase migration, then refresh schema cache and reload this page.';
  }

  if (lower.includes('schema cache')) {
    return 'Supabase schema cache is not updated yet. Apply migrations and refresh schema cache, then try again.';
  }

  return raw;
}

function getMonthValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getMonthRange(monthValue: string) {
  const [yearRaw, monthRaw] = monthValue.split('-');
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return {
    startIso: `${monthValue}-01`,
    endIso: `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`,
    start,
    end,
  };
}

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(fromIso: string, toIso: string) {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function getWorkingDays(monthValue: string) {
  const { start, end } = getMonthRange(monthValue);
  const days: string[] = [];

  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      days.push(toIsoDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function makeCombinationLabel(combination: WardrobeCombination) {
  if (combination.name.trim()) return combination.name.trim();
  return `${combination.shirt} + ${combination.pants}`;
}

export default memo(function WardrobePage({ userId }: WardrobePageProps) {
  const [combinations, setCombinations] = useState<WardrobeCombination[]>([]);
  const [wears, setWears] = useState<WardrobeWear[]>([]);
  const [month, setMonth] = useState(getMonthValue(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);

  const [nameInput, setNameInput] = useState('');
  const [shirtInput, setShirtInput] = useState('');
  const [pantsInput, setPantsInput] = useState('');
  const [notesInput, setNotesInput] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const [combinationResult, wearResult] = await Promise.all([
        supabase
          .from('wardrobe_combinations')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: true }),
        supabase
          .from('wardrobe_wears')
          .select('*')
          .eq('user_id', userId)
          .order('wear_date', { ascending: false })
          .limit(1000),
      ]);

      if (combinationResult.error) throw combinationResult.error;
      if (wearResult.error) throw wearResult.error;

      setCombinations((combinationResult.data ?? []) as WardrobeCombination[]);
      setWears((wearResult.data ?? []) as WardrobeWear[]);
    } catch (err) {
      setError(toFriendlyWardrobeError(err, 'Failed to load wardrobe data.'));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const monthRange = useMemo(() => getMonthRange(month), [month]);

  const combinationMap = useMemo(() => {
    const map = new Map<string, WardrobeCombination>();
    combinations.forEach(combination => {
      map.set(combination.id, combination);
    });
    return map;
  }, [combinations]);

  const workingDays = useMemo(() => getWorkingDays(month), [month]);

  const monthWears = useMemo(
    () => wears.filter(wear => wear.wear_date >= monthRange.startIso && wear.wear_date <= monthRange.endIso),
    [wears, monthRange.endIso, monthRange.startIso]
  );

  const plannedByDate = useMemo(() => {
    const map = new Map<string, WardrobeWear>();
    monthWears.forEach(wear => {
      map.set(wear.wear_date, wear);
    });
    return map;
  }, [monthWears]);

  const activeCombinations = useMemo(
    () => combinations.filter(combination => combination.active),
    [combinations]
  );

  const addCombination = useCallback(async () => {
    if (!shirtInput.trim() || !pantsInput.trim() || saving) return;

    setSaving(true);
    setError('');
    setNotice('');

    try {
      const { data, error: insertError } = await supabase
        .from('wardrobe_combinations')
        .insert({
          user_id: userId,
          name: nameInput.trim(),
          shirt: shirtInput.trim(),
          pants: pantsInput.trim(),
          notes: notesInput.trim(),
          active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setCombinations(prev => [...prev, data as WardrobeCombination]);
      setNameInput('');
      setShirtInput('');
      setPantsInput('');
      setNotesInput('');
    } catch (err) {
      setError(toFriendlyWardrobeError(err, 'Failed to add combination.'));
    } finally {
      setSaving(false);
    }
  }, [nameInput, notesInput, pantsInput, saving, shirtInput, userId]);

  const deleteCombination = useCallback(async (id: string) => {
    setError('');
    setNotice('');

    const previousCombinations = combinations;
    const previousWears = wears;

    setCombinations(prev => prev.filter(item => item.id !== id));
    setWears(prev => prev.filter(item => item.combination_id !== id));

    const { error: deleteError } = await supabase
      .from('wardrobe_combinations')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (deleteError) {
      setCombinations(previousCombinations);
      setWears(previousWears);
      setError(toFriendlyWardrobeError(deleteError, 'Failed to delete combination.'));
    }
  }, [combinations, userId, wears]);

  const clearMonthPlan = useCallback(async () => {
    setSaving(true);
    setError('');
    setNotice('');

    const previousWears = wears;
    setWears(prev => prev.filter(wear => wear.wear_date < monthRange.startIso || wear.wear_date > monthRange.endIso));

    const { error: deleteError } = await supabase
      .from('wardrobe_wears')
      .delete()
      .eq('user_id', userId)
      .gte('wear_date', monthRange.startIso)
      .lte('wear_date', monthRange.endIso);

    if (deleteError) {
      setWears(previousWears);
      setError(toFriendlyWardrobeError(deleteError, 'Failed to clear month plan.'));
    }

    setSaving(false);
  }, [monthRange.endIso, monthRange.startIso, userId, wears]);

  const generatePlan = useCallback(async (isReset: boolean) => {
    if (saving) return;
    if (activeCombinations.length === 0) {
      setError('Add at least one combination to generate a plan.');
      return;
    }

    setSaving(true);
    setError('');
    setNotice('');

    const previousWears = wears;

    // Always regenerate selected month to keep sequence coherent.
    const retainedHistory = wears.filter(wear => wear.wear_date < monthRange.startIso || wear.wear_date > monthRange.endIso);
    setWears(retainedHistory);

    const removeResult = await supabase
      .from('wardrobe_wears')
      .delete()
      .eq('user_id', userId)
      .gte('wear_date', monthRange.startIso)
      .lte('wear_date', monthRange.endIso);

    if (removeResult.error) {
      setWears(previousWears);
      setError(toFriendlyWardrobeError(removeResult.error, 'Failed to regenerate plan.'));
      setSaving(false);
      return;
    }

    const history = [...retainedHistory].sort((a, b) => a.wear_date.localeCompare(b.wear_date));
    const generated: PlannedWear[] = [];
    const warnings: string[] = [];

    for (const day of workingDays) {
      const entriesBeforeDay = [...history, ...generated].filter(entry => entry.wear_date < day);

      const strictCandidates = activeCombinations.filter(candidate => {
        const candidateShirt = candidate.shirt.trim().toLowerCase();

        const repeatedCombination = entriesBeforeDay.some(entry =>
          entry.combination_id === candidate.id &&
          daysBetween(entry.wear_date, day) < COMBINATION_COOLDOWN_DAYS
        );

        if (repeatedCombination) return false;

        const repeatedShirt = entriesBeforeDay.some(entry => {
          const combo = combinationMap.get(entry.combination_id);
          if (!combo) return false;
          return combo.shirt.trim().toLowerCase() === candidateShirt && daysBetween(entry.wear_date, day) < SHIRT_COOLDOWN_DAYS;
        });

        return !repeatedShirt;
      });

      const relaxedShirtCandidates = activeCombinations.filter(candidate => {
        const repeatedCombination = entriesBeforeDay.some(entry =>
          entry.combination_id === candidate.id &&
          daysBetween(entry.wear_date, day) < COMBINATION_COOLDOWN_DAYS
        );

        return !repeatedCombination;
      });

      const pickFrom = strictCandidates.length > 0 ? strictCandidates : relaxedShirtCandidates;

      if (pickFrom.length === 0) {
        setWears(previousWears);
        setError(`Unable to build a safe plan for ${day}. Add more combinations to satisfy the 5-day no-repeat rule.`);
        setSaving(false);
        return;
      }

      if (strictCandidates.length === 0) {
        warnings.push(`Limited unique shirts around ${day}; 20-day shirt spacing was relaxed for this date.`);
      }

      const ranked = [...pickFrom].sort((a, b) => {
        const aLast = entriesBeforeDay
          .filter(entry => entry.combination_id === a.id)
          .map(entry => entry.wear_date)
          .pop();
        const bLast = entriesBeforeDay
          .filter(entry => entry.combination_id === b.id)
          .map(entry => entry.wear_date)
          .pop();

        if (!aLast && !bLast) return Math.random() - 0.5;
        if (!aLast) return -1;
        if (!bLast) return 1;
        return aLast.localeCompare(bLast);
      });

      const topChoices = ranked.slice(0, Math.min(3, ranked.length));
      const chosen = topChoices[Math.floor(Math.random() * topChoices.length)];

      generated.push({ wear_date: day, combination_id: chosen.id });
    }

    const { data, error: insertError } = await supabase
      .from('wardrobe_wears')
      .insert(generated.map(item => ({ user_id: userId, wear_date: item.wear_date, combination_id: item.combination_id })))
      .select('*');

    if (insertError) {
      setWears(previousWears);
      setError(toFriendlyWardrobeError(insertError, 'Failed to save generated plan.'));
      setSaving(false);
      return;
    }

    const saved = (data ?? []) as WardrobeWear[];
    const merged = [...retainedHistory, ...saved].sort((a, b) => b.wear_date.localeCompare(a.wear_date));
    setWears(merged);

    if (warnings.length > 0) {
      setNotice(warnings[0]);
    } else if (isReset) {
      setNotice('Plan reset and regenerated successfully with cooldown protection.');
    } else {
      setNotice('New monthly plan generated successfully.');
    }

    setSaving(false);
  }, [activeCombinations, combinationMap, monthRange.endIso, monthRange.startIso, saving, userId, wears, workingDays]);

  const plannedRows = useMemo(() => {
    return workingDays.map(day => {
      const wear = plannedByDate.get(day);
      const combo = wear ? combinationMap.get(wear.combination_id) : null;
      return {
        day,
        combination: combo ?? null,
      };
    });
  }, [combinationMap, plannedByDate, workingDays]);

  const plannedCount = plannedRows.filter(row => row.combination).length;

  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Wardrobe</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Dress with intention. Rotate with confidence.
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <Shirt size={20} className="text-white" />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </div>
        )}

        {notice && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
            <AlertTriangle size={14} />
            <span>{notice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Add Combination</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Create shirt + pants combinations you want in rotation.</p>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={shirtInput}
                onChange={e => setShirtInput(e.target.value)}
                placeholder="Shirt name"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400"
              />
              <input
                value={pantsInput}
                onChange={e => setPantsInput(e.target.value)}
                placeholder="Pants name"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400"
              />
            </div>

            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Optional label (e.g., Monday Formal)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400"
              />
              <input
                value={notesInput}
                onChange={e => setNotesInput(e.target.value)}
                placeholder="Optional notes"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-blue-400"
              />
            </div>

            <button
              type="button"
              onClick={() => void addCombination()}
              disabled={saving || !shirtInput.trim() || !pantsInput.trim()}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              <Plus size={14} />
              Add Combination
            </button>
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Monthly Rotation Planner</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Weekends are auto-excluded. Plan generated for working days only.</p>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <CalendarDays size={14} />
                <input
                  type="month"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                  className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100 outline-none"
                />
              </label>

              <span className="text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {workingDays.length} working days
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                {plannedCount} planned
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void generatePlan(false)}
                disabled={saving || activeCombinations.length === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold px-4 py-2 transition-colors"
              >
                Generate Plan
              </button>
              <button
                type="button"
                onClick={() => void generatePlan(true)}
                disabled={saving || activeCombinations.length === 0}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold px-4 py-2 transition-colors"
              >
                <RefreshCcw size={14} />
                Reset + Regenerate
              </button>
              <button
                type="button"
                onClick={() => void clearMonthPlan()}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold px-4 py-2 transition-colors"
              >
                Clear Month
              </button>
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Combinations ({activeCombinations.length})</h3>

            {loading ? (
              <div className="mt-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-700 animate-pulse" />
                ))}
              </div>
            ) : activeCombinations.length === 0 ? (
              <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">No combinations yet. Add your first one above.</div>
            ) : (
              <div className="mt-4 space-y-2 max-h-[420px] overflow-auto pr-1">
                {activeCombinations.map(combination => (
                  <div
                    key={combination.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {makeCombinationLabel(combination)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Shirt: {combination.shirt} · Pants: {combination.pants}
                      </div>
                      {combination.notes && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-2">
                          {combination.notes}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => void deleteCombination(combination.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete combination"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Generated Plan</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Working days for {month}</p>

            <div className="mt-4 space-y-2 max-h-[420px] overflow-auto pr-1">
              {plannedRows.length === 0 ? (
                <div className="text-sm text-slate-500 dark:text-slate-400">No working days in selected range.</div>
              ) : (
                plannedRows.map(row => (
                  <div
                    key={row.day}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{row.day}</div>
                      {row.combination ? (
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {makeCombinationLabel(row.combination)}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Not assigned</div>
                      )}
                    </div>
                    {row.combination && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300">
                        {row.combination.shirt}
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
});
