import { useMemo, useState } from 'react';
import type { Product } from '../types';

interface PriceTrackerProps {
  products: Product[];
  loading: boolean;
}

function ProductAvatar({ product }: { product: Product }) {
  if (product.image_url) {
    return (
      // eslint-disable-next-line jsx-a11y/img-redundant-alt
      <img src={product.image_url} alt={product.name} className="w-12 h-12 rounded-md object-cover" />
    );
  }

  return (
    <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center text-slate-600 font-semibold">
      {product.name?.slice(0, 1).toUpperCase()}
    </div>
  );
}

export default function PriceTracker({ products, loading }: PriceTrackerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | ''>('');
  const [unit, setUnit] = useState<'g' | 'kg' | 'ml' | 'l'>('g');
  const [manualPrice, setManualPrice] = useState<number | ''>('');

  const selectedProduct: Product | undefined = useMemo(
    () => products.find(p => p.id === selectedId),
    [products, selectedId]
  );

  const priceToUse = manualPrice !== '' ? manualPrice : selectedProduct?.price ?? 0;

  const normalizedAmount = useMemo(() => {
    if (!amount || amount <= 0) return 0;
    if (unit === 'kg' || unit === 'l') return amount * 1000;
    return amount;
  }, [amount, unit]);

  const pricePerUnit = useMemo(() => {
    if (!priceToUse || !normalizedAmount) return null;
    return unit === 'l' ? priceToUse / (amount as number) : priceToUse / normalizedAmount;
  }, [priceToUse, normalizedAmount, amount, unit]);

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

  const bestValue = comparisonRows[0];

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-800">Price Tracker</h2>
            <p className="text-sm text-slate-500 mt-1">Quickly calculate unit price and compare best value products.</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="col-span-1 bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Your Products</div>
                <div className="text-xs text-slate-400">{products.length} items</div>
              </div>
            </div>

            <div className="p-3 max-h-[480px] overflow-y-auto space-y-2">
              {loading && <div className="text-sm text-slate-400 p-3">Loading products...</div>}
              {!loading && products.length === 0 && (
                <div className="text-sm text-slate-400 p-3">No products yet. Add one from the main view.</div>
              )}

              {!loading && products.map(product => (
                <button
                  key={product.id}
                  onClick={() => setSelectedId(product.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors text-left ${selectedId === product.id ? 'bg-amber-50 ring-1 ring-amber-200' : 'hover:bg-slate-50'}`}
                >
                  <ProductAvatar product={product} />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{product.name}</div>
                    <div className="text-xs text-slate-500">₹{product.price.toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Selected product</label>
                  <div className="flex items-center gap-3">
                    {selectedProduct ? (
                      <>
                        <ProductAvatar product={selectedProduct} />
                        <div>
                          <div className="text-sm font-medium text-slate-800">{selectedProduct.name}</div>
                          <div className="text-xs text-slate-500">Stored price: ₹{selectedProduct.price.toFixed(2)}</div>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-500">No product selected</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Amount</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={amount as any}
                      onChange={event => setAmount(event.target.value === '' ? '' : Number(event.target.value))}
                      placeholder="e.g. 500"
                      className="w-full rounded-md border px-3 py-2 bg-white"
                      min={0}
                    />
                    <select
                      value={unit}
                      onChange={event => setUnit(event.target.value as 'g' | 'kg' | 'ml' | 'l')}
                      className="rounded-md border px-3 py-2 bg-white text-sm"
                    >
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="ml">ml</option>
                      <option value="l">l</option>
                    </select>
                  </div>
                  <div className="text-xs text-slate-400 mt-2">Enter total amount for comparison ({inputDescription}).</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Override price (optional)</label>
                  <input
                    type="number"
                    value={manualPrice as any}
                    onChange={event => setManualPrice(event.target.value === '' ? '' : Number(event.target.value))}
                    placeholder="₹"
                    className="w-full rounded-md border px-3 py-2 bg-white"
                    min={0}
                  />
                  <div className="text-xs text-slate-400 mt-2">Use this for temporary deal comparison.</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="text-sm text-slate-500">Result</div>
                <div className="mt-2">
                  {!selectedProduct && <div className="text-sm text-slate-400">Select a product to compute the rate.</div>}
                  {selectedProduct && (!amount || amount <= 0) && <div className="text-sm text-slate-400">Enter amount to compute the rate.</div>}

                  {selectedProduct && amount && amount > 0 && (
                    <>
                      <div className="text-sm text-slate-500">₹{priceToUse.toFixed(2)} total • {displayAmount} {displayUnit}</div>
                      <div className="mt-3 text-4xl font-bold text-amber-600">₹{(pricePerUnit ?? 0).toFixed(4)} / {displayUnit}</div>
                      <div className="mt-1 text-sm text-slate-400">Based on {manualPrice !== '' ? 'overridden price' : 'stored product price'}.</div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-col items-end gap-3">
                <button
                  onClick={() => {
                    if (pricePerUnit) {
                      const text = `₹${pricePerUnit.toFixed(4)} / ${displayUnit}`;
                      navigator.clipboard?.writeText(text);
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-amber-500 hover:bg-amber-600 text-white text-sm shadow"
                >
                  Copy rate
                </button>
                <div className="text-xs text-slate-400">Tip: smaller units improve precision.</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 border">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Best Value Snapshot</h3>
                {bestValue ? <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Top pick: {bestValue.name}</span> : null}
              </div>

              {comparisonRows.length === 0 ? (
                <p className="text-sm text-slate-400">Enter amount and unit to compare top products by effective unit rate.</p>
              ) : (
                <div className="space-y-2">
                  {comparisonRows.map((row, index) => (
                    <div key={row.id} className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2">
                      <div className="text-sm text-slate-700">
                        {index + 1}. {row.name}
                      </div>
                      <div className="text-sm font-semibold text-slate-800">₹{row.rate.toFixed(4)} / {displayUnit}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
