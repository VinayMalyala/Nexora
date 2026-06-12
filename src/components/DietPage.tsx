import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Apple, ArrowLeft, BellRing, CheckCircle2, ChevronLeft, ChevronRight, Edit3, Flame, Plus, Trash2, TrendingUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { DietLog, DietMeal, DietRecipe } from '../types';

interface DietPageProps {
  userId: string;
  onBack: () => void;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// Your personalised breakfast plan, seeded on first visit
const DEFAULT_BREAKFAST: Omit<DietMeal, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
  { day_of_week: 1, meal_type: 'breakfast', hostel_meal: 'Idli',        custom_meal: 'Idli',      use_custom: false, notes: 'Fermented & light — a great start to the week.' },
  { day_of_week: 2, meal_type: 'breakfast', hostel_meal: 'Pongal',      custom_meal: 'Sprouts',   use_custom: true,  notes: 'Sprouts are high in protein and raw nutrients — better than heavy Pongal.' },
  { day_of_week: 3, meal_type: 'breakfast', hostel_meal: 'Dosa',        custom_meal: 'Dosa',      use_custom: false, notes: 'Fermented batter — easy on digestion.' },
  { day_of_week: 4, meal_type: 'breakfast', hostel_meal: 'Bonda / Puri', custom_meal: 'Ragi Java', use_custom: true, notes: 'Ragi is rich in calcium and fiber. Avoids fried, oily food.' },
  { day_of_week: 5, meal_type: 'breakfast', hostel_meal: 'Uthappam',    custom_meal: 'Uthappam',  use_custom: false, notes: 'Veggie-loaded and protein-rich.' },
  { day_of_week: 6, meal_type: 'breakfast', hostel_meal: 'Lemon Rice',  custom_meal: 'Oats',      use_custom: true,  notes: 'Oats are heart-healthy and keep you full longer than rice.' },
  { day_of_week: 0, meal_type: 'breakfast', hostel_meal: 'Upma',        custom_meal: 'Upma',      use_custom: false, notes: 'Light and balanced — a solid weekend breakfast.' },
];

type HealthColor = 'emerald' | 'blue' | 'amber' | 'red';

interface HealthInfo { label: string; color: HealthColor }

const MEAL_HEALTH: Record<string, HealthInfo> = {
  'idli':         { label: 'Fermented · Low-fat',        color: 'emerald' },
  'sprouts':      { label: 'High Protein · Raw',         color: 'blue'    },
  'dosa':         { label: 'Fermented · Light',          color: 'emerald' },
  'ragi java':    { label: 'Calcium · Fiber · Filling',  color: 'blue'    },
  'uthappam':     { label: 'Protein · Veggie-rich',      color: 'emerald' },
  'oats':         { label: 'Heart-healthy · High Fiber', color: 'blue'    },
  'upma':         { label: 'Balanced · Light',           color: 'emerald' },
  'pongal':       { label: 'Heavy · High Carb',          color: 'amber'   },
  'bonda / puri': { label: 'Fried · Oily',               color: 'red'     },
  'lemon rice':   { label: 'High Carb',                  color: 'amber'   },
};

const MOOD_OPTIONS = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good',  emoji: '🙂', label: 'Good'  },
  { value: 'okay',  emoji: '😐', label: 'Okay'  },
  { value: 'bad',   emoji: '😞', label: 'Bad'   },
] as const;

type Mood = 'great' | 'good' | 'okay' | 'bad';
type LogChoice = 'planned' | 'hostel' | 'custom';

// ── helpers ──────────────────────────────────────────────────────────────────

function toIsoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMondayOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}

function formatDisplayDate(d: Date) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function getHealthInfo(mealName: string): HealthInfo | null {
  return MEAL_HEALTH[mealName.toLowerCase().trim()] ?? null;
}

function healthColorClasses(color: HealthColor) {
  if (color === 'emerald') return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20';
  if (color === 'blue')    return 'text-blue-600    dark:text-blue-400    bg-blue-50    dark:bg-blue-900/20';
  if (color === 'red')     return 'text-red-600     dark:text-red-400     bg-red-50     dark:bg-red-900/20';
  return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20';
}

function friendlyError(err: unknown) {
  const msg =
    err instanceof Error ? err.message
    : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message: unknown }).message)
      : 'An error occurred.';
  const lower = msg.toLowerCase();
  if (
    (lower.includes('diet_meals') || lower.includes('diet_logs') || lower.includes('diet_recipes')) &&
    (lower.includes('does not exist') || lower.includes('could not find the table') || lower.includes('relation'))
  ) {
    return 'Diet tables are missing. Apply the latest Supabase migration to enable this feature.';
  }
  if (lower.includes('schema cache')) {
    return 'Supabase schema cache is not updated. Apply migrations, refresh schema cache, then retry.';
  }
  return msg;
}

// ── component ─────────────────────────────────────────────────────────────────

export default memo(function DietPage({ userId, onBack }: DietPageProps) {
  const [meals, setMeals]         = useState<DietMeal[]>([]);
  const [logs, setLogs]           = useState<DietLog[]>([]);
  const [recipes, setRecipes]     = useState<DietRecipe[]>([]);
  const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(new Date()));
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const seededRef                 = useRef(false);

  // Log modal
  const [logDay, setLogDay]       = useState<Date | null>(null);
  const [logChoice, setLogChoice] = useState<LogChoice>('planned');
  const [logCustom, setLogCustom] = useState('');
  const [logMood, setLogMood]     = useState<Mood | ''>('');
  const [logNotes, setLogNotes]   = useState('');
  const [logSaving, setLogSaving] = useState(false);

  // Edit plan modal
  const [editMeal, setEditMeal]   = useState<DietMeal | null>(null);
  const [editCustom, setEditCustom] = useState('');
  const [editUse, setEditUse]     = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Recipe form
  const [recipeTitle, setRecipeTitle] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeSteps, setRecipeSteps] = useState('');
  const [recipeTags, setRecipeTags] = useState('');
  const [recipePrepTime, setRecipePrepTime] = useState('');
  const [recipeSaving, setRecipeSaving] = useState(false);

  // ── load data ──────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const thirtyAgo = new Date();
      thirtyAgo.setDate(thirtyAgo.getDate() - 30);

      const [mealRes, logRes, recipeRes] = await Promise.all([
        supabase.from('diet_meals').select('*').eq('user_id', userId).eq('meal_type', 'breakfast'),
        supabase.from('diet_logs').select('*').eq('user_id', userId)
          .gte('log_date', toIsoDate(thirtyAgo)).order('log_date', { ascending: false }),
        supabase.from('diet_recipes').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      ]);

      if (mealRes.error) throw mealRes.error;
      if (logRes.error)  throw logRes.error;
      if (recipeRes.error) throw recipeRes.error;

      let mealsData = (mealRes.data ?? []) as DietMeal[];

      // Seed personalised plan on first visit
      if (mealsData.length === 0 && !seededRef.current) {
        seededRef.current = true;
        const { data: seeded, error: seedErr } = await supabase
          .from('diet_meals')
          .insert(DEFAULT_BREAKFAST.map(m => ({ ...m, user_id: userId })))
          .select();
        if (seedErr) throw seedErr;
        mealsData = (seeded ?? []) as DietMeal[];
      }

      setMeals(mealsData);
      setLogs((logRes.data ?? []) as DietLog[]);
      setRecipes((recipeRes.data ?? []) as DietRecipe[]);
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { void loadData(); }, [loadData]);

  // ── computed ───────────────────────────────────────────────────────────────

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [weekStart]);

  const mealByDow = useMemo(() => {
    const m = new Map<number, DietMeal>();
    meals.forEach(meal => m.set(meal.day_of_week, meal));
    return m;
  }, [meals]);

  const logByDate = useMemo(() => {
    const m = new Map<string, DietLog>();
    logs.forEach(l => m.set(l.log_date, l));
    return m;
  }, [logs]);

  const todayIso = toIsoDate(new Date());
  const todayDow = new Date().getDay();

  const todayReminder = useMemo(() => {
    const todayMeal = mealByDow.get(todayDow);
    if (!todayMeal) {
      return `Today is ${DAY_FULL[todayDow]}. Add your breakfast plan to get reminders.`;
    }

    const hostel = todayMeal.hostel_meal.trim();
    const custom = todayMeal.custom_meal.trim();
    const hasSwap = todayMeal.use_custom && custom && custom.toLowerCase() !== hostel.toLowerCase();

    if (hasSwap) {
      return `Today is ${DAY_FULL[todayDow]}. Reminder: skip ${hostel} and have ${custom}.`;
    }

    const planned = todayMeal.use_custom && custom ? custom : hostel;
    return `Today is ${DAY_FULL[todayDow]}. Reminder: have ${planned}.`;
  }, [mealByDow, todayDow]);

  const { streak, weekAdherence } = useMemo(() => {
    // Streak: consecutive logged days going back from today (or yesterday)
    let streak = 0;
    const cursor = new Date();
    if (!logByDate.has(toIsoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
    for (let i = 0; i < 60; i++) {
      if (logByDate.has(toIsoDate(cursor))) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    // This week adherence: days from Monday → today
    const mon = getMondayOfWeek(new Date());
    let eligible = 0, logged = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(mon);
      d.setDate(d.getDate() + i);
      if (toIsoDate(d) > todayIso) break;
      eligible++;
      if (logByDate.has(toIsoDate(d))) logged++;
    }
    const weekAdherence = eligible > 0 ? Math.round((logged / eligible) * 100) : 0;

    return { streak, weekAdherence };
  }, [logByDate, todayIso]);

  // ── log meal ───────────────────────────────────────────────────────────────

  const openLogModal = useCallback((day: Date) => {
    const meal = mealByDow.get(day.getDay());
    const existing = logByDate.get(toIsoDate(day));
    setLogDay(day);
    if (existing) {
      const planned = meal ? (meal.use_custom ? meal.custom_meal : meal.hostel_meal) : '';
      if (existing.what_ate.toLowerCase() === planned.toLowerCase()) {
        setLogChoice('planned');
      } else if (meal && existing.what_ate.toLowerCase() === meal.hostel_meal.toLowerCase()) {
        setLogChoice('hostel');
      } else {
        setLogChoice('custom');
        setLogCustom(existing.what_ate);
      }
      setLogMood((existing.mood as Mood | '') ?? '');
      setLogNotes(existing.notes);
    } else {
      setLogChoice('planned');
      setLogCustom('');
      setLogMood('');
      setLogNotes('');
    }
  }, [logByDate, mealByDow]);

  const saveLog = useCallback(async () => {
    if (!logDay || logSaving) return;
    const meal    = mealByDow.get(logDay.getDay());
    const planned = meal ? (meal.use_custom ? meal.custom_meal : meal.hostel_meal) : '';
    const hostel  = meal?.hostel_meal ?? '';

    const whatAte =
      logChoice === 'planned' ? planned :
      logChoice === 'hostel'  ? hostel  :
      logCustom.trim();

    if (!whatAte) return;

    setLogSaving(true);
    setError('');

    const row = {
      user_id:      userId,
      log_date:     toIsoDate(logDay),
      meal_type:    'breakfast',
      what_ate:     whatAte,
      followed_plan: whatAte.toLowerCase() === planned.toLowerCase(),
      mood:         logMood || null,
      notes:        logNotes.trim(),
    };

    const { data, error: err } = await supabase
      .from('diet_logs')
      .upsert(row, { onConflict: 'user_id,log_date,meal_type' })
      .select()
      .single();

    if (err) {
      setError(friendlyError(err));
    } else if (data) {
      const dateKey = toIsoDate(logDay);
      setLogs(prev => [
        ...prev.filter(l => !(l.log_date === dateKey && l.meal_type === 'breakfast')),
        data as DietLog,
      ]);
      setLogDay(null);
    }
    setLogSaving(false);
  }, [logChoice, logCustom, logDay, logMood, logNotes, logSaving, mealByDow, userId]);

  // ── edit plan ──────────────────────────────────────────────────────────────

  const openEdit = useCallback((meal: DietMeal) => {
    setEditMeal(meal);
    setEditCustom(meal.custom_meal);
    setEditUse(meal.use_custom);
    setEditNotes(meal.notes);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editMeal || editSaving) return;
    setEditSaving(true);
    setError('');

    const { error: err } = await supabase
      .from('diet_meals')
      .update({
        custom_meal: editCustom.trim() || editMeal.custom_meal,
        use_custom:  editUse,
        notes:       editNotes.trim(),
        updated_at:  new Date().toISOString(),
      })
      .eq('id', editMeal.id)
      .eq('user_id', userId);

    if (err) {
      setError(friendlyError(err));
    } else {
      setMeals(prev => prev.map(m =>
        m.id === editMeal.id
          ? { ...m, custom_meal: editCustom.trim() || m.custom_meal, use_custom: editUse, notes: editNotes.trim() }
          : m
      ));
      setEditMeal(null);
    }
    setEditSaving(false);
  }, [editCustom, editMeal, editNotes, editSaving, editUse, userId]);

  // ── recipes ───────────────────────────────────────────────────────────────

  const addRecipe = useCallback(async () => {
    if (!recipeTitle.trim() || recipeSaving) return;

    setRecipeSaving(true);
    setError('');

    const payload = {
      user_id: userId,
      title: recipeTitle.trim(),
      ingredients: recipeIngredients.trim(),
      steps: recipeSteps.trim(),
      tags: recipeTags.trim(),
      prep_time_minutes: recipePrepTime.trim() ? Number(recipePrepTime) : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error: err } = await supabase
      .from('diet_recipes')
      .insert(payload)
      .select()
      .single();

    if (err) {
      setError(friendlyError(err));
    } else if (data) {
      setRecipes(prev => [data as DietRecipe, ...prev]);
      setRecipeTitle('');
      setRecipeIngredients('');
      setRecipeSteps('');
      setRecipeTags('');
      setRecipePrepTime('');
    }

    setRecipeSaving(false);
  }, [recipeIngredients, recipePrepTime, recipeSaving, recipeSteps, recipeTags, recipeTitle, userId]);

  const deleteRecipe = useCallback(async (id: string) => {
    const prev = recipes;
    setRecipes(current => current.filter(recipe => recipe.id !== id));

    const { error: err } = await supabase
      .from('diet_recipes')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (err) {
      setRecipes(prev);
      setError(friendlyError(err));
    }
  }, [recipes, userId]);

  // ── render helpers ─────────────────────────────────────────────────────────

  const logDayMeal = logDay ? mealByDow.get(logDay.getDay()) ?? null : null;
  const logDayIso  = logDay ? toIsoDate(logDay) : '';

  // ── skeleton ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
        <div className="max-w-5xl mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-white dark:bg-slate-800 animate-pulse border border-slate-100 dark:border-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={onBack}
              className="mb-3 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={13} />
              Back to Workspace
            </button>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Diet Tracker</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Build consistent, mindful eating habits one day at a time.</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-sm flex-shrink-0">
            <Apple size={20} className="text-white" />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 text-emerald-600 dark:text-emerald-400">
              <BellRing size={15} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Today Reminder</p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-0.5">{todayReminder}</p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: <Flame size={13} />, label: 'Streak',     value: streak,         unit: streak === 1 ? 'day' : 'days' },
            { icon: <TrendingUp size={13} />, label: 'This Week', value: weekAdherence, unit: '%' },
            { icon: <CheckCircle2 size={13} />, label: 'Total Logged', value: logs.length,    unit: logs.length === 1 ? 'day' : 'days' },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                {stat.icon} {stat.label}
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {stat.value}
                <span className="text-sm font-normal text-slate-400 dark:text-slate-500 ml-1">{stat.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Week navigation + day cards */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() - 7); return d; })}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              {formatDisplayDate(weekDays[0])} – {weekDays[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={() => setWeekStart(prev => { const d = new Date(prev); d.setDate(d.getDate() + 7); return d; })}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => {
              const iso      = toIsoDate(day);
              const dow      = day.getDay();
              const meal     = mealByDow.get(dow);
              const log      = logByDate.get(iso);
              const isToday  = iso === todayIso;
              const isFuture = iso > todayIso;
              const displayed = meal ? (meal.use_custom ? meal.custom_meal : meal.hostel_meal) : '—';
              const health    = getHealthInfo(displayed);
              const isSwap    = Boolean(meal?.use_custom && meal.hostel_meal !== meal.custom_meal);

              return (
                <div
                  key={iso}
                  className={`rounded-xl border p-2 flex flex-col gap-1.5 transition-all ${
                    isToday
                      ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800'
                      : 'border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-[10px] font-bold ${isToday ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                      {DAY_SHORT[dow]}
                    </span>
                    {isToday && (
                      <span className="text-[8px] font-bold uppercase tracking-wider bg-emerald-400 text-white px-1 py-0.5 rounded leading-none">
                        Today
                      </span>
                    )}
                    {log && !isToday && (
                      <CheckCircle2 size={11} className="text-emerald-500 flex-shrink-0" />
                    )}
                  </div>

                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 leading-tight line-clamp-2">
                    {displayed}
                  </span>

                  {isSwap && (
                    <span className="text-[8px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1 py-0.5 rounded leading-none w-fit">
                      Healthy swap
                    </span>
                  )}

                  {health && (
                    <span className={`text-[8px] px-1 py-0.5 rounded leading-none truncate ${healthColorClasses(health.color)}`}>
                      {health.label.split(' · ')[0]}
                    </span>
                  )}

                  {!isFuture && (
                    <button
                      onClick={() => openLogModal(day)}
                      className={`mt-auto text-[10px] font-semibold w-full py-1 rounded-lg transition-colors ${
                        log
                          ? 'text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30'
                          : 'text-white bg-emerald-400 hover:bg-emerald-500'
                      }`}
                    >
                      {log ? '✓ Edit' : 'Log'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Breakfast plan (editable) */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Breakfast Plan</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">PG meal vs your healthier alternative</span>
          </div>

          <div className="space-y-1">
            {[1, 2, 3, 4, 5, 6, 0].map(dow => {
              const meal = mealByDow.get(dow);
              if (!meal) return null;
              const displayed  = meal.use_custom ? meal.custom_meal : meal.hostel_meal;
              const health     = getHealthInfo(displayed);
              const isSwap     = meal.use_custom && meal.hostel_meal !== meal.custom_meal;

              return (
                <div
                  key={dow}
                  className={`flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-700/60 last:border-0 rounded-lg px-2 ${
                    isSwap ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
                  }`}
                >
                  <span className="w-9 text-xs font-semibold text-slate-400 dark:text-slate-500 flex-shrink-0">
                    {DAY_SHORT[dow]}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">PG</span>
                        <span className={`text-sm ${isSwap ? 'line-through text-slate-400 dark:text-slate-500' : 'font-medium text-slate-800 dark:text-slate-100'}`}>
                          {meal.hostel_meal}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSwap ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          Healthy
                        </span>
                        <span className={`text-sm font-semibold px-2.5 py-0.5 rounded-full ${
                          isSwap
                            ? 'text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                            : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600'
                        }`}>
                          {meal.use_custom ? meal.custom_meal : meal.hostel_meal}
                        </span>
                        {isSwap && (
                          <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full">
                            Better choice
                          </span>
                        )}
                      </div>
                    </div>
                    {meal.notes && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">{meal.notes}</p>
                    )}
                  </div>

                  {health && (
                    <span className={`hidden sm:inline-block text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${healthColorClasses(health.color)}`}>
                      {health.label}
                    </span>
                  )}

                  {isSwap && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                      Swap
                    </span>
                  )}

                  <button
                    onClick={() => openEdit(meal)}
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title="Edit plan"
                  >
                    <Edit3 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent logs */}
        {logs.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-3">Recent Logs</h3>
            <div className="space-y-2">
              {logs.slice(0, 10).map(log => {
                const day = new Date(`${log.log_date}T00:00:00`);
                const moodEmoji = MOOD_OPTIONS.find(m => m.value === log.mood)?.emoji ?? '';
                return (
                  <div key={log.id} className="flex items-center gap-3 text-sm">
                    <span className="w-20 flex-shrink-0 text-xs text-slate-400 dark:text-slate-500">
                      {DAY_SHORT[day.getDay()]}, {formatDisplayDate(day)}
                    </span>
                    <span className="flex-1 text-slate-700 dark:text-slate-200 truncate">{log.what_ate}</span>
                    {moodEmoji && <span title={log.mood ?? ''}>{moodEmoji}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                      log.followed_plan
                        ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                    }`}>
                      {log.followed_plan ? 'On plan' : 'Off plan'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recipe Library */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Recipe Library</h3>
            <span className="text-xs text-slate-400 dark:text-slate-500">Your personal healthy recipe cards</span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                value={recipeTitle}
                onChange={e => setRecipeTitle(e.target.value)}
                placeholder="Recipe title"
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-400"
              />
              <input
                value={recipePrepTime}
                onChange={e => setRecipePrepTime(e.target.value)}
                placeholder="Prep time (minutes)"
                className="rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-400"
              />
            </div>
            <textarea
              value={recipeIngredients}
              onChange={e => setRecipeIngredients(e.target.value)}
              placeholder="Ingredients (comma-separated or line-by-line)"
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-400 resize-none"
            />
            <textarea
              value={recipeSteps}
              onChange={e => setRecipeSteps(e.target.value)}
              placeholder="Steps / method"
              rows={2}
              className="mt-2 w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-emerald-400 resize-none"
            />
            <div className="mt-2 flex items-center gap-2">
              <input
                value={recipeTags}
                onChange={e => setRecipeTags(e.target.value)}
                placeholder="Tags (high-protein, quick, vegan...)"
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                onClick={() => void addRecipe()}
                disabled={recipeSaving || !recipeTitle.trim()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {recipes.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">No recipes yet. Add your first recipe card above.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recipes.map(recipe => (
                <div key={recipe.id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 bg-slate-50 dark:bg-slate-900/40">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{recipe.title}</h4>
                    <button
                      onClick={() => void deleteRecipe(recipe.id)}
                      className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete recipe"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {recipe.prep_time_minutes !== null && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Prep: {recipe.prep_time_minutes} min</p>
                  )}

                  {recipe.tags && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">#{recipe.tags.split(',').map(t => t.trim()).filter(Boolean).join(' #')}</p>
                  )}

                  {recipe.ingredients && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Ingredients</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap line-clamp-3">{recipe.ingredients}</p>
                    </div>
                  )}

                  {recipe.steps && (
                    <div className="mt-2">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Method</p>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 whitespace-pre-wrap line-clamp-4">{recipe.steps}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* ── Log Meal Modal ─────────────────────────────────────────────────── */}
      {logDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setLogDay(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Log Breakfast</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {DAY_FULL[logDay.getDay()]}, {formatDisplayDate(logDay)}
                </p>
              </div>
              <button
                onClick={() => setLogDay(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">What did you eat?</p>

            <div className="space-y-2 mb-4">
              {/* Planned option */}
              {logDayMeal && (
                <button
                  type="button"
                  onClick={() => setLogChoice('planned')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                    logChoice === 'planned'
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="font-semibold">
                    {logDayMeal.use_custom ? logDayMeal.custom_meal : logDayMeal.hostel_meal}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">Planned</span>
                </button>
              )}

              {/* Show hostel meal as alternative when custom is preferred */}
              {logDayMeal?.use_custom && logDayMeal.hostel_meal !== logDayMeal.custom_meal && (
                <button
                  type="button"
                  onClick={() => setLogChoice('hostel')}
                  className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                    logChoice === 'hostel'
                      ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="font-semibold">{logDayMeal.hostel_meal}</span>
                  <span className="ml-2 text-xs text-slate-400">Hostel meal</span>
                </button>
              )}

              {/* Something else */}
              <button
                type="button"
                onClick={() => setLogChoice('custom')}
                className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  logChoice === 'custom'
                    ? 'border-slate-400 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                Something else…
              </button>
              {logChoice === 'custom' && (
                <input
                  value={logCustom}
                  onChange={e => setLogCustom(e.target.value)}
                  placeholder="What did you have?"
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-400"
                />
              )}
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">How do you feel?</p>
            <div className="flex gap-2 mb-4">
              {MOOD_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.label}
                  onClick={() => setLogMood(prev => prev === opt.value ? '' : opt.value as Mood)}
                  className={`flex-1 py-2 rounded-xl border text-base transition-colors ${
                    logMood === opt.value
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  {opt.emoji}
                </button>
              ))}
            </div>

            <textarea
              value={logNotes}
              onChange={e => setLogNotes(e.target.value)}
              placeholder="Optional notes…"
              rows={2}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-emerald-400 resize-none mb-4"
            />

            <button
              type="button"
              onClick={() => void saveLog()}
              disabled={logSaving || (logChoice === 'custom' && !logCustom.trim())}
              className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {logSaving ? 'Saving…' : logByDate.has(logDayIso) ? 'Update Log' : 'Save Log'}
            </button>
          </div>
        </div>
      )}

      {/* ── Edit Plan Modal ────────────────────────────────────────────────── */}
      {editMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setEditMeal(null)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Edit {DAY_FULL[editMeal.day_of_week]}&apos;s Plan
              </h3>
              <button
                onClick={() => setEditMeal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-3 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-sm">
              <span className="text-slate-500 dark:text-slate-400 text-xs">Hostel serves: </span>
              <span className="font-medium text-slate-700 dark:text-slate-200">{editMeal.hostel_meal}</span>
            </div>

            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Your alternative
            </label>
            <input
              value={editCustom}
              onChange={e => setEditCustom(e.target.value)}
              placeholder="e.g. Sprouts, Oats, Ragi Java…"
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-400 mb-3"
            />

            <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
              <input
                type="checkbox"
                checked={editUse}
                onChange={e => setEditUse(e.target.checked)}
                className="w-4 h-4 rounded accent-emerald-500"
              />
              <span className="text-sm text-slate-700 dark:text-slate-200">
                Skip hostel meal — use my alternative
              </span>
            </label>

            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Note (optional)
            </label>
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Why is this better? (e.g. high protein, no oil)"
              rows={2}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 outline-none focus:border-emerald-400 resize-none mb-4"
            />

            <button
              type="button"
              onClick={() => void saveEdit()}
              disabled={editSaving}
              className="w-full py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
            >
              {editSaving ? 'Saving…' : 'Save Plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
