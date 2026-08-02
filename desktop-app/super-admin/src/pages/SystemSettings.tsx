import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Cpu,
  Shield,
  Wallet,
  CheckCircle,
  AlertTriangle,
  Save,
  RotateCcw,
  Settings as SettingsIcon,
} from 'lucide-react';
import type { SystemSetting } from '../types';
import { SYSTEM_SETTING_CATEGORIES, SYSTEM_SETTING_CATEGORY_LABELS } from '../types';
import { useSystemSettings } from '../hooks/useSystemSettings';
import { saveSystemSettings } from '../services/systemSettingsService';

const CATEGORY_ICONS: Record<string, React.FC<{ className?: string }>> = {
  general: Building2,
  system: Cpu,
  security: Shield,
  billing: Wallet,
};

/** Infer the input type from the current JSON-decoded value. */
function valueKind(value: unknown): 'text' | 'number' | 'boolean' {
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return 'number';
  return 'text';
}

const SystemSettings: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('general');
  const [drafts, setDrafts] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const { settings, loading, error } = useSystemSettings();

  // Reset drafts whenever the source settings change (initial load, realtime).
  useEffect(() => {
    setDrafts((prev) => {
      const next: Record<string, unknown> = {};
      settings.forEach((s) => {
        next[s.key] = prev[s.key] !== undefined ? prev[s.key] : s.value;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.map((s) => s.key + ':' + JSON.stringify(s.value)).join('|')]);

  const settingsByCategory = useMemo(() => {
    const map: Record<string, SystemSetting[]> = {};
    SYSTEM_SETTING_CATEGORIES.forEach((c) => (map[c] = []));
    settings.forEach((s) => {
      if (!map[s.category]) map[s.category] = [];
      map[s.category].push(s);
    });
    return map;
  }, [settings]);

  const activeSettings = settingsByCategory[activeCategory] ?? [];

  const dirtyEntries = useMemo(() => {
    return settings
      .filter((s) => drafts[s.key] !== undefined && drafts[s.key] !== s.value)
      .map((s) => ({ key: s.key, value: drafts[s.key] }));
  }, [settings, drafts]);

  const setDraft = (key: string, value: unknown) => {
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (dirtyEntries.length === 0) return;
    setSaving(true);
    try {
      await saveSystemSettings(dirtyEntries);
      setToast({ type: 'success', message: 'Settings saved successfully.' });
      window.setTimeout(() => setToast(null), 3500);
    } catch (err) {
      setToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to save settings.' });
      window.setTimeout(() => setToast(null), 3500);
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    const next: Record<string, unknown> = {};
    settings.forEach((s) => (next[s.key] = s.value));
    setDrafts(next);
  };

  const renderField = (setting: SystemSetting) => {
    const value = drafts[setting.key] ?? setting.value;
    const kind = valueKind(setting.value);

    if (kind === 'boolean') {
      return (
        <button
          onClick={() => setDraft(setting.key, !value)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-gray-300'}`}
          role="switch"
          aria-checked={!!value}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      );
    }

    if (kind === 'number') {
      return (
        <input
          type="number"
          value={String(value)}
          onChange={(e) => setDraft(setting.key, Number(e.target.value))}
          className="w-40 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      );
    }

    return (
      <input
        type="text"
        value={String(value ?? '')}
        onChange={(e) => setDraft(setting.key, e.target.value)}
        placeholder="—"
        className="w-full max-w-md px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      <div className="p-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">System Settings</h1>
            <p className="text-sm text-gray-600">Manage global configuration using a flexible key-value store.</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleDiscard}
              disabled={dirtyEntries.length === 0}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Discard Changes</span>
            </button>
            <button
              onClick={handleSave}
              disabled={dirtyEntries.length === 0 || saving}
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? <Save className="w-4 h-4 animate-pulse" /> : <Save className="w-4 h-4" />}
              <span>{saving ? 'Saving…' : dirtyEntries.length > 0 ? 'Save (' + dirtyEntries.length + ')' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex items-center space-x-2 border-b border-gray-200">
          {SYSTEM_SETTING_CATEGORIES.map((cat) => {
            const Icon = CATEGORY_ICONS[cat] ?? SettingsIcon;
            const dirtyCount = settings.filter((s) => s.category === cat && drafts[s.key] !== undefined && drafts[s.key] !== s.value).length;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`flex items-center space-x-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeCategory === cat
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{SYSTEM_SETTING_CATEGORY_LABELS[cat]}</span>
                {dirtyCount > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-semibold">{dirtyCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && settings.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
              <SettingsIcon className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">Loading settings…</p>
          </div>
        ) : activeSettings.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-900">No settings in this category yet</p>
            <p className="text-xs text-gray-500 mt-1">Add new keys to the system_settings table to extend configuration.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {activeSettings.map((setting) => {
              const isDirty = drafts[setting.key] !== undefined && drafts[setting.key] !== setting.value;
              const publicLabel = setting.label ?? setting.key.split('.').pop();
              return (
                <div key={setting.key} className={`px-6 py-4 flex items-center justify-between gap-6 ${isDirty ? 'bg-blue-50/40' : ''}`}>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-semibold text-gray-900">{publicLabel}</p>
                      {isDirty && <span className="text-[10px] font-semibold text-blue-600 uppercase">Unsaved</span>}
                    </div>
                    {setting.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1 font-mono">{setting.key}</p>
                  </div>
                  <div className="flex-shrink-0">{renderField(setting)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 flex items-center space-x-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
