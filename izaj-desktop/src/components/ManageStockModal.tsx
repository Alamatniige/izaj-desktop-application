import { Icon } from '@iconify/react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
import API_URL from '../../config/api';
import { ProductService } from '../services/productService';
import { StockItem } from '../types/product';

interface SyncStockResponse {
  success: boolean;
  message?: string;
  summary: {
    successCount: number;
    failCount: number;
  };
}

interface ManageStockModalProps {
  session: Session | null;
  onClose: (shouldRefresh?: boolean) => void;
}

export function ManageStockModal({
  onClose,
  session,
}: ManageStockModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [products, setProducts] = useState<StockItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getDifferenceBadge = (difference: number) => {
    if (difference === 0) {
      return {
        label: 'In Sync',
        className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      };
    }
    if (difference > 0) {
      return {
        label: `+${difference} Additional`,
        className: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
      };
    }
    return {
      label: `${difference} Deducted`,
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300',
    };
  };

  const formatProductQuantities = (product: StockItem) => {
    const displayQty = Number(product.display_quantity ?? 0);
    const reservedQty = Number(product.reserved_quantity ?? 0);
    const effectiveDisplay = Number(product.effective_display ?? displayQty + reservedQty);
    const currentQty = Number(product.current_quantity ?? 0);
    const difference = Number(product.difference ?? currentQty - effectiveDisplay);

    return {
      displayQty,
      reservedQty,
      effectiveDisplay,
      currentQty,
      difference,
    };
  };

  const differenceStats = products.reduce(
    (acc, product) => {
      const { difference } = formatProductQuantities(product);
      if (difference > 0) {
        acc.surplus += difference;
      } else if (difference < 0) {
        acc.deficit += Math.abs(difference);
      }
      return acc;
    },
    { surplus: 0, deficit: 0 }
  );

  const fetchStockStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ProductService.fetchStockStatus(session);
      const normalized = data.products || [];
      const needSync = normalized.filter((p) => p.needs_sync);

      const sortedNeedSync = [...needSync].sort((a, b) => {
        const codeA = (a.product_id ?? '').toString();
        const codeB = (b.product_id ?? '').toString();
        if (!codeA && !codeB) return 0;
        if (!codeA) return 1;
        if (!codeB) return -1;
        return codeA.localeCompare(codeB, undefined, { numeric: true, sensitivity: 'base' });
      });

      setProducts(sortedNeedSync);
      setSelected(sortedNeedSync.map((p) => p.product_id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error loading stock status';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    fetchStockStatus();
  }, [fetchStockStatus]);

  const handleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selected.length === products.length) {
      setSelected([]);
    } else {
      setSelected(products.map((p) => p.product_id));
    }
  };

  const handleSync = async (ids: string[]) => {
    setIsSyncing(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/products/sync-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify({ productIds: ids }),
      });
      const data: SyncStockResponse = await response.json();
      if (!data.success) throw new Error(data.message || 'Sync failed');
      toast.success(`Synced ${data.summary.successCount} products`);
      await fetchStockStatus();
      if (data.summary.successCount > 0) onClose(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sync error';
      setError(message);
      toast.error(message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-white via-slate-50 to-amber-50 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.9)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="relative overflow-hidden border-b border-white/60 px-6 py-5 dark:border-slate-800/70">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-300 via-orange-400 to-amber-500" />
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-100 text-yellow-500 shadow-inner dark:bg-yellow-500/15 dark:text-yellow-300">
                <Icon icon="mdi:sync" className="text-2xl" />
              </span>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">Inventory Stock Sync</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Monitor differences between actual and displayed quantities in real time.
                </p>
              </div>
            </div>
            <button
              onClick={() => onClose(false)}
              className="rounded-2xl border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:text-slate-600 dark:hover:border-slate-700 dark:hover:text-slate-200"
            >
              <Icon icon="mdi:close" className="text-2xl" />
            </button>
          </div>
        </div>
        <div className="space-y-6 p-6 text-gray-900 dark:text-slate-100">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 py-10 text-slate-500 dark:border-slate-800">
              <Icon icon="mdi:loading" className="mr-2 animate-spin text-3xl text-yellow-400" />
              <span>Loading live stock data…</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50/70 px-4 py-3 text-center text-red-600 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200">
              {error}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-8 py-10 text-center text-emerald-600 dark:border-emerald-900/60 dark:from-slate-900 dark:to-slate-900">
              <Icon icon="mdi:check-circle" className="mx-auto mb-3 text-4xl" />
              <p className="text-lg font-semibold">All products are perfectly in sync.</p>
              <p className="text-sm text-emerald-500 dark:text-emerald-300/80">Enjoy the calm while it lasts!</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm shadow-yellow-100 dark:border-slate-800/60 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Pending products</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{products.length}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Need review before syncing</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm shadow-blue-100 dark:border-slate-800/60 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Selected</p>
                    <button onClick={handleSelectAll} className="text-xs font-medium text-blue-500 hover:underline">
                      {selected.length === products.length ? 'Clear all' : 'Select all'}
                    </button>
                  </div>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{selected.length}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Ready to sync</p>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/80 p-4 shadow-sm shadow-rose-100 dark:border-slate-800/60 dark:bg-slate-900">
                  <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Inventory drift</p>
                  <div className="mt-2 flex items-baseline gap-4 text-sm">
                    <div>
                      <p className="text-xs text-emerald-400">Additional</p>
                      <p className="text-xl font-semibold text-emerald-500">+{differenceStats.surplus}</p>
                    </div>
                    <div>
                      <p className="text-xs text-rose-400">Deducted</p>
                      <p className="text-xl font-semibold text-rose-500">-{differenceStats.deficit}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-white/50 bg-white/70 p-4 shadow-inner dark:border-slate-800/80 dark:bg-slate-900">
                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-100 shadow-sm dark:border-slate-800">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="sticky top-0 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500 backdrop-blur dark:bg-slate-800/80 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-3 text-left">Product Code</th>
                          <th className="px-4 py-3 text-left">Product</th>
                          <th className="px-4 py-3 text-right">Inventory Stock</th>
                          <th className="px-4 py-3 text-right">E-commerce Stock</th>
                          <th className="px-4 py-3 text-center">Changes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {products.map((product) => {
                          const { displayQty, currentQty, difference } = formatProductQuantities(product);
                          const badge = getDifferenceBadge(difference);
                          const isChecked = selected.includes(product.product_id);

                          return (
                            <tr
                              key={product.product_id}
                              className={`border-b border-slate-100/70 text-slate-700 transition hover:bg-yellow-50/70 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/70 ${
                                isChecked ? 'bg-yellow-50/80 dark:bg-yellow-500/10' : 'bg-white/50 dark:bg-transparent'
                              }`}
                            >
                              <td className="px-4 py-4 text-left font-mono text-xs text-slate-600 dark:text-slate-300">
                                {product.product_id ? `PC-${product.product_id}` : '—'}
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    className="mt-1 accent-yellow-500"
                                    checked={isChecked}
                                    onChange={() => handleSelect(product.product_id)}
                                  />
                                  <div>
                                    <p className="font-medium text-slate-900 dark:text-white">{product.product_name}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right font-medium text-slate-900 dark:text-slate-100">
                                {currentQty}
                              </td>
                              <td className="px-4 py-4 text-right text-slate-500 dark:text-slate-400">
                                {displayQty}
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badge.className}`}>
                                  {badge.label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3 border-t border-white/60 pt-4 text-sm dark:border-slate-800 md:flex-row md:items-center md:justify-between">
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium text-slate-700 dark:text-slate-100">{selected.length}</span> product
                  {selected.length === 1 ? '' : 's'} selected for syncing
                </div>
                <div className="flex flex-col gap-3 md:flex-row">
                  <button
                    onClick={() => onClose(false)}
                    className="rounded-2xl border border-slate-200 px-5 py-2 font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSync(selected)}
                    disabled={isSyncing || selected.length === 0}
                    className="rounded-2xl bg-yellow-500 px-5 py-2 font-semibold text-white shadow-lg shadow-yellow-500/30 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSyncing ? 'Syncing...' : `Sync Selected (${selected.length})`}
                  </button>
                  <button
                    onClick={() => handleSync(products.map((p) => p.product_id))}
                    disabled={isSyncing}
                    className="rounded-2xl border border-emerald-200 bg-white px-5 py-2 font-semibold text-emerald-600 shadow-[0_10px_25px_-15px_rgba(16,185,129,0.8)] transition hover:border-emerald-400 hover:text-emerald-700 dark:border-emerald-700 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
                  >
                    {isSyncing ? 'Syncing...' : 'Sync All'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}