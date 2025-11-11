import { Icon } from '@iconify/react';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Session } from '@supabase/supabase-js';
import { useEffect } from 'react';
import  API_URL  from '../../config/api';

interface ManageStockModalProps {
  session: Session | null;
  onClose: (shouldRefresh?: boolean) => void;
  publishedProducts: any[];
  setPublishedProducts: (products: any[]) => void;
}

export function ManageStockModal({
  onClose,
  session,
}: ManageStockModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStockStatus();
  }, []);

  const fetchStockStatus = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/products/stock-status`, {
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
      });
      if (!response.ok) throw new Error('Failed to fetch stock status');
      const data = await response.json();
      const needSync = (data.products || []).filter((p: any) => p.needs_sync);
      setProducts(needSync);
      setSelected(needSync.map((p: any) => p.product_id));
    } catch (err: any) {
      setError(err.message || 'Error loading stock status');
    } finally {
      setIsLoading(false);
    }
  };

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
      const data = await response.json();
      if (!data.success) throw new Error(data.message || 'Sync failed');
      toast.success(`Synced ${data.summary.successCount} products`);
      await fetchStockStatus();
      if (data.summary.successCount > 0) onClose(true);
    } catch (err: any) {
      setError(err.message || 'Sync error');
      toast.error(err.message || 'Sync error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 w-[600px] rounded-2xl shadow-2xl border border-white dark:border-slate-800 overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Icon icon="mdi:sync" className="text-2xl text-yellow-400" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100">
              Manage Stock {products.length > 0 && <span className="text-sm text-yellow-600 dark:text-yellow-400">({products.length})</span>}
            </h2>
          </div>
          <button onClick={() => onClose(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors">
            <Icon icon="mdi:close" className="text-2xl" />
          </button>
        </div>
        <div className="p-6 text-gray-900 dark:text-slate-100">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icon icon="mdi:loading" className="animate-spin text-2xl text-yellow-400 mr-2" />
              <span>Loading stock status...</span>
            </div>
          ) : error ? (
            <div className="text-red-600 text-center">{error}</div>
          ) : products.length === 0 ? (
            <div className="text-center text-green-600 py-8">
              <Icon icon="mdi:check-circle" className="text-3xl mb-2" />
              <div>All products are in sync!</div>
            </div>
          ) : (
            <>
              <div className="flex items-center mb-3">
                <input
                  type="checkbox"
                  checked={selected.length === products.length}
                  onChange={handleSelectAll}
                  className="mr-2"
                />
                <span className="font-medium">Select All</span>
                <span className="ml-auto text-xs text-gray-500">
                  {selected.length} selected
                </span>
              </div>
              <div className="overflow-x-auto max-h-80 border border-gray-200 dark:border-slate-700 rounded-lg mb-4">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-800">
                      <th></th>
                      <th className="text-left py-2 px-3">Product Name</th>
                      <th className="text-right py-2 px-3">Current</th>
                      <th className="text-right py-2 px-3">Display</th>
                      <th className="text-right py-2 px-3">Difference</th>
                      <th className="text-right py-2 px-3">Last Sync</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.product_id} className="border-b border-gray-200 dark:border-slate-700">
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(p.product_id)}
                            onChange={() => handleSelect(p.product_id)}
                          />
                        </td>
                        <td className="py-2 px-3">{p.product_name}</td>
                        <td className="py-2 px-3 text-right">{p.current_quantity}</td>
                        <td className="py-2 px-3 text-right">{p.display_quantity}</td>
                        <td className={`py-2 px-3 text-right font-bold ${p.difference > 0 ? 'text-green-600' : p.difference < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                          {p.difference > 0 ? '+' : ''}{p.difference}
                        </td>
                        <td className="py-2 px-3 text-right text-xs text-gray-500">
                          {p.last_sync_at ? new Date(p.last_sync_at).toLocaleString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => handleSync(selected)}
                  disabled={isSyncing || selected.length === 0}
                  className="px-6 py-2 rounded-xl bg-yellow-500 text-white font-medium border-2 border-yellow-200 hover:border-yellow-400 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
                >
                  {isSyncing ? 'Syncing...' : `Sync Selected (${selected.length})`}
                </button>
                <button
                  onClick={() => handleSync(products.map((p) => p.product_id))}
                  disabled={isSyncing}
                  className="px-6 py-2 rounded-xl bg-green-500 text-white font-medium border-2 border-green-200 hover:border-green-400 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isSyncing ? 'Syncing...' : 'Sync All'}
                </button>
                <button
                  onClick={() => onClose(false)}
                  className="px-6 py-2 rounded-xl border-2 border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}