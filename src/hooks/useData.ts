import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Page, Product } from '../types';

export function usePages() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPages = useCallback(async () => {
    const { data } = await supabase
      .from('pages')
      .select('*')
      .order('created_at', { ascending: true });
    if (data) setPages(data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPages(); }, [fetchPages]);

  const addPage = async (name: string, icon: string, color: string) => {
    const { data, error } = await supabase
      .from('pages')
      .insert({ name, icon, color })
      .select()
      .single();
    if (!error && data) setPages(prev => [...prev, data]);
    return { data, error };
  };

  const deletePage = async (id: string) => {
    const { error } = await supabase.from('pages').delete().eq('id', id);
    if (!error) setPages(prev => prev.filter(p => p.id !== id));
    return { error };
  };

  return { pages, loading, fetchPages, addPage, deletePage };
}

export function useProducts(pageId?: string | null, recentsOnly = false, favoritesOnly = false) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);

    if (favoritesOnly) {
      // For favorites, fetch through favorites table to ensure only favorited products
      let favQuery = supabase
        .from('favorites')
        .select('product_id, products(*, product_tags(tag))')
        .order('created_at', { ascending: false });

      if (pageId) {
        // This requires a different approach for filtering by page
        // First get all favorites, then filter
        favQuery = favQuery;
      }

      const { data: favData } = await favQuery;
      if (favData) {
        const mapped = favData.map((fav: any) => ({
          ...fav.products,
          tags: fav.products?.product_tags?.map((t: any) => t.tag) ?? [],
          is_favorite: true,
        })).filter((p: any) => !pageId || p.page_id === pageId);

        setProducts(mapped);
      }
    } else {
      // Regular products fetch
      let query = supabase
        .from('products')
        .select('*, product_tags(tag), favorites(id)')
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (pageId) query = query.eq('page_id', pageId);
      if (recentsOnly) query = query.limit(20);

      const { data } = await query;
      if (data) {
        const mapped = data.map((p: any) => ({
          ...p,
          tags: p.product_tags?.map((t: any) => t.tag) ?? [],
          is_favorite: p.favorites && Array.isArray(p.favorites) && p.favorites.length > 0,
        }));
        setProducts(mapped);
      }
    }

    setLoading(false);
  }, [pageId, recentsOnly, favoritesOnly]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const toggleFavorite = async (productId: string, isFavorite: boolean) => {
    if (isFavorite) {
      await supabase.from('favorites').delete().eq('product_id', productId);
    } else {
      await supabase.from('favorites').insert({ product_id: productId });
    }
    await fetchProducts();
  };

  const addProduct = async (
    product: Omit<Product, 'id' | 'created_at' | 'updated_at' | 'tags' | 'sort_order' | 'is_favorite'>,
    tags: string[]
  ) => {
    const { data, error } = await supabase
      .from('products')
      .insert({ ...product, sort_order: 0 })
      .select()
      .single();

    if (!error && data) {
      if (tags.length > 0) {
        await supabase.from('product_tags').insert(
          tags.map(tag => ({ product_id: data.id, tag }))
        );
      }
      await fetchProducts();
    }
    return { data, error };
  };

  const updateProduct = async (
    id: string,
    updates: Partial<Omit<Product, 'id' | 'created_at' | 'tags' | 'is_favorite'>>,
    tags?: string[]
  ) => {
    const { error } = await supabase
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error && tags !== undefined) {
      await supabase.from('product_tags').delete().eq('product_id', id);
      if (tags.length > 0) {
        await supabase.from('product_tags').insert(
          tags.map(tag => ({ product_id: id, tag }))
        );
      }
    }
    if (!error) await fetchProducts();
    return { error };
  };

  const reorderProducts = async (sourceIndex: number, destinationIndex: number, filteredProducts?: Product[]) => {
    const listToReorder = filteredProducts || products;
    const sorted = [...listToReorder];
    const [moved] = sorted.splice(sourceIndex, 1);
    sorted.splice(destinationIndex, 0, moved);

    const updates = sorted.map((p, idx) => ({ id: p.id, sort_order: idx }));

    for (const update of updates) {
      await supabase
        .from('products')
        .update({ sort_order: update.sort_order })
        .eq('id', update.id);
    }

    await fetchProducts();
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) setProducts(prev => prev.filter(p => p.id !== id));
    return { error };
  };

  return { products, loading, fetchProducts, addProduct, updateProduct, reorderProducts, deleteProduct, toggleFavorite };
}

