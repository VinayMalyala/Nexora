import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Page, Product } from '../types';

type SupabaseProductRow = Product & {
  product_tags?: { tag: string }[];
};

function mapProductRow(row: SupabaseProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    price: row.price,
    original_price: row.original_price ?? null,
    image_url: row.image_url,
    category: row.category,
    page_id: row.page_id,
    company: row.company ?? '',
    product_url: row.product_url,
    notes: row.notes,
    sort_order: row.sort_order,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tags: row.product_tags?.map(t => t.tag) ?? [],
  };
}

export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .order('created_at', { ascending: true });

    if (pageError) {
      setError(pageError.message);
    } else if (data) {
      setPages(data);
    }

    setLoading(false);
  }, []);

  const addPage = useCallback(async (name: string, icon: string, color: string) => {
    setError(null);
    const { data, error } = await supabase
      .from('pages')
      .insert({ name, icon, color })
      .select()
      .single();

    if (error) {
      setError(error.message);
      return { data: null, error };
    }

    setPages(prev => [...prev, data]);
    return { data, error: null };
  }, []);

  const deletePage = useCallback(async (id: string) => {
    setError(null);
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return { error };
    }
    setPages(prev => prev.filter(page => page.id !== id));
    return { error: null };
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  return { pages, loading, error, fetchPages, addPage, deletePage };
}

// Fetches ALL products — filtering is done client-side in consumers.
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchProducts = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    const { data, error: productError } = await supabase
      .from('products')
      .select('*, product_tags(tag)')
      .order('created_at', { ascending: false })
      .abortSignal(controller.signal);

    if (controller.signal.aborted) return;

    if (productError) {
      setError(productError.message);
    } else if (data) {
      setProducts(data.map(mapProductRow));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
    return () => { abortRef.current?.abort(); };
  }, [fetchProducts]);

  const addProduct = useCallback(
    async (product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order'>, tags: string[]) => {
      setError(null);
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, sort_order: 0 })
        .select()
        .single();

      if (error) {
        setError(error.message);
        return { data: null, error };
      }

      if (tags.length > 0) {
        await supabase.from('product_tags').insert(tags.map(tag => ({ product_id: data.id, tag })));
      }

      await fetchProducts();
      return { data: data as Product, error: null };
    },
    [fetchProducts]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<Omit<Product, 'id' | 'created_at' | 'tags'>>, tags?: string[]) => {
      setError(null);
      const { error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

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

      await fetchProducts();
      return { error: null };
    },
    [fetchProducts]
  );

  const deleteProduct = useCallback(async (id: string) => {
    setError(null);
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      setError(error.message);
      return { error };
    }
    setProducts(prev => prev.filter(product => product.id !== id));
    return { error: null };
  }, []);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}

