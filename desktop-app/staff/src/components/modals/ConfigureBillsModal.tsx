import React, { useEffect, useState } from 'react';
import { X, Settings2, Plus, Trash2, Droplets, AlertCircle, Loader2 } from 'lucide-react';
import type { BillingComponent, BillingConfig } from '../../types';
import { getBillingConfig, saveBillingConfig } from '../../services/billingConfigService';

interface ConfigureBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function createEmptyComponent(): BillingComponent {
  return {
    id: `comp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    category: '',
    price: 0,
  };
}

const ConfigureBillsModal: React.FC<ConfigureBillsModalProps> = ({ isOpen, onClose }) => {
  const [waterRate, setWaterRate] = useState('0');
  const [components, setComponents] = useState<BillingComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSuccess(null);
    setSaving(false);
    setLoading(true);

    getBillingConfig()
      .then((config: BillingConfig) => {
        setWaterRate(String(config.waterRate));
        setComponents(config.components);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load billing configuration.');
        setWaterRate('0');
        setComponents([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const parsedWaterRate = Number(waterRate);
  const waterRateValid = waterRate.trim() !== '' && Number.isFinite(parsedWaterRate) && parsedWaterRate >= 0;

  const componentsValid = components.every(
    (c) => c.category.trim().length > 0 && Number.isFinite(c.price) && c.price >= 0
  );

  const canSave = waterRateValid && componentsValid && !loading && !saving;

  const updateComponent = (id: string, patch: Partial<BillingComponent>) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const addComponent = () => {
    setComponents((prev) => [...prev, createEmptyComponent()]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveBillingConfig({
        waterRate: parsedWaterRate,
        components: components.map((c) => ({
          ...c,
          category: c.category.trim(),
          price: Number(c.price) || 0,
        })),
      });
      setSuccess('Billing prices saved successfully.');
      setTimeout(() => onClose(), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save billing configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !saving) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="configure-bills-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-8 py-6 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <Settings2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 id="configure-bills-title" className="text-xl font-bold text-gray-900">
                Configure Bills
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Set water rate and other billing component prices (₱)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors group disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-8 py-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span className="text-sm">Loading configuration…</span>
              </div>
            ) : (
              <>
                {/* Water rate */}
                <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-5">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Droplets className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Water</h3>
                      <p className="text-xs text-gray-500">Price per cubic meter</p>
                    </div>
                  </div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                    Rate (₱ / m³) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={waterRate}
                      onChange={(e) => setWaterRate(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Extra components */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Other Components</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Add category and price for additional bill line items
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addComponent}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Component</span>
                    </button>
                  </div>

                  {components.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center">
                      <p className="text-sm text-gray-500">
                        No extra components yet. Click &ldquo;Add Component&rdquo; to include fees
                        like maintenance or connection charges.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="hidden sm:grid grid-cols-[1fr_140px_40px] gap-3 px-1">
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Category
                        </span>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Price (₱)
                        </span>
                        <span className="sr-only">Remove</span>
                      </div>
                      {components.map((component) => (
                        <div
                          key={component.id}
                          className="grid grid-cols-1 sm:grid-cols-[1fr_140px_40px] gap-3 items-start"
                        >
                          <div>
                            <label className="sm:hidden block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Category
                            </label>
                            <input
                              type="text"
                              value={component.category}
                              onChange={(e) =>
                                updateComponent(component.id, { category: e.target.value })
                              }
                              placeholder="e.g. Maintenance Fee"
                              className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <label className="sm:hidden block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                              Price (₱)
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                ₱
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={component.price}
                                onChange={(e) =>
                                  updateComponent(component.id, {
                                    price: e.target.value === '' ? 0 : Number(e.target.value),
                                  })
                                }
                                placeholder="0.00"
                                className="w-full pl-8 pr-3 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeComponent(component.id)}
                            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors justify-self-end sm:justify-self-center"
                            aria-label={`Remove ${component.category || 'component'}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-xl border border-red-100">
                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-xl border border-green-100">
                    <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-green-800">{success}</p>
                  </div>
                )}

                <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    These prices are used when generating resident bills. Water is charged per cubic
                    meter; other components are fixed amounts in pesos.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-8 py-4 flex items-center justify-end space-x-3 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSave}
              className={`px-6 py-2.5 rounded-xl transition-all text-sm font-medium shadow-sm inline-flex items-center space-x-2 ${
                canSave
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{saving ? 'Saving…' : 'Save Configuration'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigureBillsModal;
