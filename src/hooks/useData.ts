import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Page, Product } from '../types';

type SupabaseProductRow = Product & {
  product_tags?: { tag: string }[];
};

function isMissingQuantityColumnError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  const mentionsQuantityColumn = normalized.includes('quantity_unit') || normalized.includes('quantity_value');
  return mentionsQuantityColumn && normalized.includes('schema cache');
}

function stripQuantityFields<T extends Record<string, unknown>>(payload: T): Omit<T, 'quantity_value' | 'quantity_unit'> {
  const { quantity_value: _quantityValue, quantity_unit: _quantityUnit, ...rest } = payload as T & {
    quantity_value?: unknown;
    quantity_unit?: unknown;
  };
  return rest;
}

function isMissingFavoriteColumnError(message?: string) {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('is_favorite') && normalized.includes('schema cache');
}

function favoriteFallbackStorageKey(userId?: string | null) {
  return userId ? `nexora_favorite_fallback_${userId}` : '';
}

function readFavoriteFallback(userId?: string | null): Record<string, boolean> {
  const key = favoriteFallbackStorageKey(userId);
  if (!key) return {};

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeFavoriteFallback(userId: string | null | undefined, value: Record<string, boolean>) {
  const key = favoriteFallbackStorageKey(userId);
  if (!key) return;

  try {
    if (Object.keys(value).length === 0) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures (private mode / quota), UI state still works in-memory.
  }
}

function applyFavoriteOverrides(products: Product[], overrides: Record<string, boolean>) {
  if (Object.keys(overrides).length === 0) return products;
  return products.map(product =>
    Object.prototype.hasOwnProperty.call(overrides, product.id)
      ? { ...product, is_favorite: overrides[product.id] }
      : product
  );
}

function mapProductRow(row: SupabaseProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    original_price: row.original_price ?? null,
    quantity_value: row.quantity_value ?? null,
    quantity_unit: row.quantity_unit ?? null,
    image_url: row.image_url,
    category: row.category,
    page_id: row.page_id,
    company: row.company ?? '',
    product_url: row.product_url,
    notes: row.notes,
    sort_order: row.sort_order,
    is_favorite: row.is_favorite ?? false,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: row.product_tags?.map(t => t.tag) ?? [],
  };
}

export function usePages(userId?: string | null) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!userId) {
      setPages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (pageError) {
      setError(pageError.message);
    } else if (data) {
      setPages(data);
    }

    setLoading(false);
  }, [userId]);

  const addPage = useCallback(async (name: string, icon: string, color: string) => {
    if (!userId) {
      const err = { message: 'User session is required.' } as Error;
      setError(err.message);
      return { data: null, error: err };
    }

    setError(null);
    const { data, error } = await supabase
      .from('pages')
      .insert({ name, icon, color, user_id: userId })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return { data: null, error };
    }

    setPages(prev => [...prev, data]);
    return { data, error: null };
  }, [userId]);

  const deletePage = useCallback(async (id: string) => {
    setError(null);
    const query = supabase.from('pages').delete().eq('id', id);
    const { error } = userId ? await query.eq('user_id', userId) : await query;
    if (error) {
      setError(error.message);
      return { error };
    }
    setPages(prev => prev.filter(page => page.id !== id));
    return { error: null };
  }, [userId]);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  return { pages, loading, error, fetchPages, addPage, deletePage };
}

// Fetches ALL products — filtering is done client-side in consumers.
export function useProducts(userId?: string | null) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // A ref (not state) so that updating it never recreates fetchProducts or triggers re-fetches.
  const favoriteFallbackRef = useRef<Record<string, boolean>>(readFavoriteFallback(userId));

  useEffect(() => {
    favoriteFallbackRef.current = readFavoriteFallback(userId);
  }, [userId]);

  const fetchProducts = useCallback(async () => {
    if (!userId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const { data, error: productError } = await supabase
      .from('products')
      .select('*, product_tags(tag)')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);

    if (controller.signal.aborted) return;

    if (productError) {
      setError(productError.message);
    } else if (data) {
      const mapped = data.map(mapProductRow);
      setProducts(applyFavoriteOverrides(mapped, favoriteFallbackRef.current));
    }

    setLoading(false);
  }, [userId]);

  useEffect(() => {
    fetchProducts();
    return () => { abortRef.current?.abort(); };
  }, [fetchProducts]);

  const addProduct = useCallback(
    async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order'>, tags: string[]) => {
      if (!userId) {
        const err = { message: 'User session is required.' } as Error;
        setError(err.message);
        return { data: null, error: err };
      }

      setError(null);
      const nextSortOrder = products.length > 0
        ? Math.max(...products.map(item => item.sort_order ?? 0)) + 1
        : 0;

      const insertPayload = { ...product, sort_order: nextSortOrder, user_id: userId };

      let response = await supabase
        .from('products')
        .insert(insertPayload)
        .select()
        .single();

      if (response.error && isMissingQuantityColumnError(response.error.message)) {
        response = await supabase
          .from('products')
          .insert(stripQuantityFields(insertPayload))
          .select()
          .single();
      }

      const { data, error } = response;

      if (error) {
        setError(error.message);
        return { data: null, error };
      }

      if (tags.length > 0) {
        await supabase.from('product_tags').insert(tags.map(tag => ({ product_id: data.id, tag })));
      }

      const next: Product = {
        ...(data as Product),
        company: data.company ?? '',
        quantity_value: data.quantity_value ?? null,
        quantity_unit: (data.quantity_unit as Product['quantity_unit']) ?? null,
        is_favorite: (data as Record<string, unknown>).is_favorite === true,
        tags,
      };
      setProducts(prev => [...prev, next]);
      return { data: next, error: null };
    },
    [products, userId]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Omit<Product, 'id' | 'created_at' | 'tags'>>, tags?: string[]) => {
      setError(null);

      const runUpdate = async (payload: Record<string, unknown>) => {
        const query = supabase
          .from('products')
          .update(payload)
          .eq('id', id);

        return userId ? query.eq('user_id', userId) : query;
      };

      let appliedUpdates = updates;
      let { error } = await runUpdate({ ...updates, updated_at: new Date().toISOString() });

      if (error && isMissingQuantityColumnError(error.message)) {
        const sanitizedUpdates = stripQuantityFields(updates as Record<string, unknown>) as Partial<Omit<Product, 'id' | 'created_at' | 'tags'>>;
        const fallback = await runUpdate({ ...sanitizedUpdates, updated_at: new Date().toISOString() });
        error = fallback.error;
        if (!error) {
          appliedUpdates = sanitizedUpdates;
        }
      }

      if (error) {
        setError(error.message);
        return { error };
      }

      if (tags) {
        await supabase.from('product_tags').delete().eq('product_id', id);
        if (tags.length > 0) {
          await supabase.from('product_tags').insert(tags.map(tag => ({ product_id: id, tag })));
        }
      }

      setProducts(prev =>
        prev.map(product =>
          product.id === id
            ? {
                ...product,
                ...appliedUpdates,
                updated_at: new Date().toISOString(),
                tags: tags ?? product.tags,
              }
            : product
        )
      );

      return { error: null };
    },
    [userId]
  );

  const deleteProduct = useCallback(async (id: string) => {
    setError(null);
    const query = supabase.from('products').delete().eq('id', id);
    const { error } = userId ? await query.eq('user_id', userId) : await query;
    if (error) {
      setError(error.message);
      return { error };
    }
    setProducts(prev => prev.filter(product => product.id !== id));
    return { error: null };
  }, [userId]);

  const toggleFavorite = useCallback(async (id: string, isFavorite: boolean) => {
    setError(null);

    // Optimistic update — flip immediately so the UI feels instant.
    setProducts(prev =>
      prev.map(product =>
        product.id === id ? { ...product, is_favorite: isFavorite } : product
      )
    );

    const query = supabase
      .from('products')
      .update({ is_favorite: isFavorite, updated_at: new Date().toISOString() })
      .eq('id', id);

    let { error } = userId ? await query.eq('user_id', userId) : await query;

    if (error && isMissingFavoriteColumnError(error.message)) {
      // Schema cache lags behind migration — persist locally so favorites survive navigation.
      const next = { ...favoriteFallbackRef.current, [id]: isFavorite };
      favoriteFallbackRef.current = next;
      writeFavoriteFallback(userId, next);
      return { error: null };
    }

    if (error) {
      // Revert optimistic update on failure.
      setProducts(prev =>
        prev.map(product =>
          product.id === id ? { ...product, is_favorite: !isFavorite } : product
        )
      );
      setError(error.message);
      return { error };
    }

    // Persisted successfully — clear any local fallback override for this product.
    if (Object.prototype.hasOwnProperty.call(favoriteFallbackRef.current, id)) {
      const next = { ...favoriteFallbackRef.current };
      delete next[id];
      favoriteFallbackRef.current = next;
      writeFavoriteFallback(userId, next);
    }

    return { error: null };
  }, [userId]);

  const reorderProducts = useCallback(async (orderedIds: string[]) => {
    if (orderedIds.length === 0) {
      return { error: null };
    }

    setError(null);
    const previousProducts = products;
    const orderIndex = new Map(orderedIds.map((id, index) => [id, index]));

    const optimistic = [...products].sort((a, b) => {
      const aIndex = orderIndex.get(a.id);
      const bIndex = orderIndex.get(b.id);

      if (aIndex !== undefined && bIndex !== undefined) return aIndex - bIndex;
      if (aIndex !== undefined) return -1;
      if (bIndex !== undefined) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    }).map((product, index) => ({ ...product, sort_order: index }));

    setProducts(optimistic);

    const updates = optimistic.map(product => ({ id: product.id, sort_order: product.sort_order }));

    try {
      const responses = await Promise.all(
        updates.map(update => {
          const query = supabase
            .from('products')
            .update({ sort_order: update.sort_order, updated_at: new Date().toISOString() })
            .eq('id', update.id);

          return userId ? query.eq('user_id', userId) : query;
        })
      );

      const failed = responses.find(response => response.error);
      if (failed?.error) {
        setProducts(previousProducts);
        setError(failed.error.message);
        return { error: failed.error };
      }

      return { error: null };
    } catch (error) {
      setProducts(previousProducts);
      const normalized = error instanceof Error ? error.message : 'Failed to reorder products';
      setError(normalized);
      return { error: { message: normalized } };
    }
  }, [products, userId]);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    toggleFavorite,
    reorderProducts,
  };
}

