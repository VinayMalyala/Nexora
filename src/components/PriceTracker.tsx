import { memo, useEffect, useMemo, useState } from 'react';
import { ShoppingCart, X, Plus } from 'lucide-react';
import type { Product } from '../types';

interface PriceTrackerProps {
  products: Product[];
  loading: boolean;
}

const ProductAvatar = memo(function ProductAvatar({ product }: { product: Product }) {
  if (product.image_url) {
    return (
      <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-md object-cover" />
    );
  }

  return (
    <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
      {product.name?.slice(0, 1).toUpperCase()}
    </div>
  );
});

export default function PriceTracker({ products, loading }: PriceTrackerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [unit, setUnit] = useState<'g' | 'kg' | 'ml' | 'l'>('g');
  const [manualPrice, setManualPrice] = useState<number | ''>('');
  const [copied, setCopied] = useState(false);
  const [basketIds, setBasketIds] = useState<string[]>([]);
  const [basketSearchQuery, setBasketSearchQuery] = useState('');

  const selectedProduct: Product | undefined = useMemo(
    () => products.find(p => p.id === selectedId),
    [products, selectedId]
  );

  useEffect(() => {
    if (!selectedProduct?.quantity_value || !selectedProduct.quantity_unit) return;
    setAmount(selectedProduct.quantity_value);
    setUnit(selectedProduct.quantity_unit);
  }, [selectedProduct]);

  // Allow result computation when manual price is set, even without a selected product.
  const effectivePrice = manualPrice !== '' ? manualPrice : selectedProduct?.price ?? null;
  const priceToUse = effectivePrice ?? 0;
  const canCompute = effectivePrice !== null && !!amount && amount > 0;

  const normalizedAmount = useMemo(() => {
    if (!amount || amount <= 0) return 0;
    if (unit === 'kg' || unit === 'l') return amount * 1000;
    return amount;
  }, [amount, unit]);

  const pricePerUnit = useMemo(() => {
    if (!priceToUse || !normalizedAmount) return null;
    return unit === 'l' ? priceToUse / (amount as number) : priceToUse / normalizedAmount;
  }, [priceToUse, normalizedAmount, amount, unit]);

  const handleCopyRate = () => {
    if (!pricePerUnit) return;
    const text = `₹${pricePerUnit.toFixed(4)} / ${displayUnit}`;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }).catch(() => {});
  };

  const inputDescription = unit === 'g' || unit === 'kg'
    ? 'grams or kilograms'
    : 'milliliters or liters';

  const displayAmount = unit === 'l' ? amount : normalizedAmount;
  const displayUnit = unit === 'l' ? 'l' : unit === 'ml' ? 'ml' : 'g';

  const comparisonRows = useMemo(() => {
    if (!amount || amount <= 0) return [];

    const denominator = unit === 'l' ? amount : normalizedAmount;
    if (!denominator || denominator <= 0) return [];

    return products
      .map(product => ({
        id: product.id,
        name: product.name,
        rate: unit === 'l' ? product.price / (amount as number) : product.price / denominator,
      }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 5);
  }, [amount, normalizedAmount, products, unit]);

  const basketItems = useMemo(
    () => basketIds.map(id => products.find(p => p.id === id)).filter((p): p is Product => !!p),
    [basketIds, products]
  );

  const basketTotal = useMemo(
    () => basketItems.reduce((sum, p) => sum + p.price, 0),
    [basketItems]
  );

  const basketSearchResults = useMemo(() => {
    if (!basketSearchQuery.trim()) return [];
    const q = basketSearchQuery.toLowerCase();
    return products.filter(
      p => !basketIds.includes(p.id) &&
        (p.name.toLowerCase().includes(q) || p.company?.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [basketSearchQuery, products, basketIds]);

  const addToBasket = (id: string) => {
    setBasketIds(prev => prev.includes(id) ? prev : [...prev, id]);
    setBasketSearchQuery('');
  };

  const removeFromBasket = (id: string) => {
    setBasketIds(prev => prev.filter(b => b !== id));
  };

  const bestValue = comparisonRows[0];

  return (
    <div className="p-6 h-full overflow-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Price Tracker</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Quickly calculate unit price and compare best value products.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your Products</div>
                <div className="text-xs text-slate-400 dark:text-slate-500">{products.length} items</div>
              </div>
            </div>

            <div className="p-3 max-h-[480px] overflow-y-auto space-y-2">
              {loading && <div className="text-sm text-slate-400 dark:text-slate-500 p-3">Loading products...</div>}
              {!loading && products.length === 0 && (
                <div className="text-sm text-slate-400 dark:text-slate-500 p-3">No products yet. Add one from the main view.</div>
              )}

              {!loading && products.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left ${selectedId === product.id ? 'bg-amber-50 dark:bg-amber-900/30 ring-1 ring-amber-200' : 'hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                >
                  <ProductAvatar product={product} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{product.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">₹{product.price.toFixed(2)}</div>
                    {product.quantity_value && product.quantity_unit && (
                      <div className="text-xs text-slate-400 dark:text-slate-500">{product.quantity_value} {product.quantity_unit}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">Selected product</label>
                  <div className="flex items-center gap-3">
                    {selectedProduct ? (
                      <>
                        <ProductAvatar product={selectedProduct} />
                        <div>
                          <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedProduct.name}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Stored price: ₹{selectedProduct.price.toFixed(2)}</div>
                          {selectedProduct.quantity_value && selectedProduct.quantity_unit ? (
                            <div className="text-xs text-amber-700">Stored quantity: {selectedProduct.quantity_value} {selectedProduct.quantity_unit}</div>
                          ) : null}
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400">No product selected</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={amount}
                      onChange={event => setAmount(event.target.value === '' ? '' : Number(event.target.value))}
                      placeholder="e.g. 500"
                      className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 bg-white"
                      min={0}
                    />
                    <select
                      value={unit}
                      onChange={event => setUnit(event.target.value as 'g' | 'kg' | 'ml' | 'l')}
                      className="rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 bg-white text-sm"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                    </select>
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">Enter total amount for comparison ({inputDescription}).</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 mb-2">Override price (optional)</label>
                  <input
                    type="number"
                    value={manualPrice}
                    onChange={event => setManualPrice(event.target.value === '' ? '' : Number(event.target.value))}
                    placeholder="₹"
                    className="w-full rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 bg-white"
                    min={0}
                  />
                  <div className="text-xs text-slate-400 dark:text-slate-500 mt-2">Use this for temporary deal comparison.</div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Result</div>
                <div className="mt-2">
                  {!canCompute && !selectedProduct && <div className="text-sm text-slate-400 dark:text-slate-500">Select a product or enter an override price, then add an amount to compute the rate.</div>}
                  {canCompute && (
                    <>
                      <div className="text-sm text-slate-500">₹{priceToUse.toFixed(2)} total • {displayAmount} {displayUnit}</div>
                      <div className="mt-3 text-4xl font-bold text-amber-600">
                        {pricePerUnit !== null ? `₹${pricePerUnit.toFixed(4)} / ${displayUnit}` : '—'}
                      </div>
                      <div className="mt-1 text-sm text-slate-400">Based on {manualPrice !== '' ? 'overridden price' : 'stored product price'}.</div>
                    </>
                  )}
                  {!canCompute && selectedProduct && <div className="text-sm text-slate-400 dark:text-slate-500">Enter amount to compute the rate.</div>}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={handleCopyRate}
                  disabled={!pricePerUnit}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm shadow"
                >
                  {copied ? 'Copied!' : 'Copy rate'}
                </button>
                <div className="text-xs text-slate-400 dark:text-slate-500">Tip: smaller units improve precision.</div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Best Value Snapshot</h3>
                {bestValue ? <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Top pick: {bestValue.name}</span> : null}
              </div>

              {comparisonRows.length === 0 ? (
                <p className="text-sm text-slate-400 dark:text-slate-500">Enter amount and unit to compare top products by effective unit rate.</p>
              ) : (
                <div className="space-y-2">
                  {comparisonRows.map((row, index) => (
                    <div key={row.id} className="flex items-center justify-between rounded-md border border-slate-100 dark:border-slate-700 px-3 py-2">
                      <div className="text-sm text-slate-700 dark:text-slate-200">
                        {index + 1}. {row.name}
                      </div>
                      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">₹{row.rate.toFixed(4)} / {displayUnit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Price Basket — add products and see combined total */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={16} className="text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Price Basket</h3>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">Select products to see their combined total</span>
            {basketIds.length > 0 && (
              <button
                onClick={() => setBasketIds([])}
                className="text-xs text-slate-400 hover:text-red-400 transition-colors ml-2"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Search to add */}
          <div className="relative mb-4">
            <div className="flex items-center gap-2">
              <input
                value={basketSearchQuery}
                onChange={e => setBasketSearchQuery(e.target.value)}
                placeholder="Search products to add to basket..."
                className="flex-1 rounded-md border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400/40 focus:border-amber-400"
              />
              {basketSearchQuery && (
                <button onClick={() => setBasketSearchQuery('')} className="p-1 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            {basketSearchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-10 overflow-hidden">
                {basketSearchResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => addToBasket(p.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors text-left"
                  >
                    <Plus size={12} className="text-amber-500 flex-shrink-0" />
                    <span className="text-sm text-slate-800 dark:text-slate-100 flex-1 truncate">{p.name}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0">₹{p.price.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Basket items */}
          {basketItems.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">Search and add products above to calculate combined price.</p>
          ) : (
            <div className="space-y-2">
              {basketItems.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-3 py-2.5 rounded-md border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-colors">
                    <div className="w-7 h-7 flex-shrink-0 rounded-md bg-slate-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {p.image_url
                      ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : p.name.slice(0, 1).toUpperCase()
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 dark:text-slate-100 truncate">{p.name}</div>
                      {p.company && <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{p.company}</div>}
                    </div>
                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex-shrink-0">₹{p.price.toFixed(2)}</div>
                  <button
                    onClick={() => removeFromBasket(p.id)}
                    className="p-1 text-slate-300 hover:text-red-400 transition-colors flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}

                <div className="flex items-center justify-between pt-3 mt-1 border-t border-slate-100 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400">{basketItems.length} product{basketItems.length !== 1 ? 's' : ''} in basket</div>
                <div className="text-lg font-bold text-amber-600">₹{basketTotal.toFixed(2)}</div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
