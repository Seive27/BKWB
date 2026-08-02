import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Download, ShieldCheck, Activity, AlertTriangle, FileText } from 'lucide-react';
import type { AuditLogEntry } from '../types';
import { useAuditLogStream } from '../hooks/useAuditLogs';
import { exportAuditLogsToCsv } from '../services/auditLogService';

interface AuditLogsConsoleProps {
  onNavigateBack: () => void;
}

function moduleLabel(module: string): string {
  const labels: Record<string, string> = {
    auth: 'AUTH',
    announcements: 'ANN',
    tickets: 'TKT',
    meter_readings: 'MTR',
    residents: 'RES',
    system_settings: 'CFG',
  };
  return labels[module] ?? module.toUpperCase();
}

function levelFor(module: string, action: string): 'INFO' | 'WARN' | 'AUDIT' {
  if (action === 'delete' || action === 'rejected') return 'WARN';
  if (action === 'update' && module === 'system_settings') return 'WARN';
  return 'AUDIT';
}

function colorFor(level: string): string {
  switch (level) {
    case 'INFO': return 'text-blue-400';
    case 'WARN': return 'text-yellow-400';
    case 'ERROR': return 'text-red-400';
    default: return 'text-green-400';
  }
}

function formatLine(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    '[' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + ']'
  );
}

function entryText(log: AuditLogEntry): string {
  const name = log.user
    ? [log.user.first_name, log.user.last_name].filter((n) => n && n.trim()).join(' ').trim() || 'unknown'
    : 'system';
  return name + ' · ' + moduleLabel(log.module) + ' · ' + log.action + (log.description ? ' — ' + log.description : '');
}

const AuditLogsConsole: React.FC<AuditLogsConsoleProps> = ({ onNavigateBack }) => {
  const { logs } = useAuditLogStream();
  const [isPaused, setIsPaused] = useState(false);
  const [visibleLogs, setVisibleLogs] = useState<AuditLogEntry[]>([]);
  const [eventCount, setEventCount] = useState(0);
  const consoleRef = useRef<HTMLDivElement>(null);

  // Keep the stream paused/unpaused locally.
  useEffect(() => {
    if (!isPaused) {
      setVisibleLogs(logs);
      setEventCount((prev) => Math.max(prev, logs.length));
    }
  }, [logs, isPaused]);

  // Auto-scroll to the newest line.
  useEffect(() => {
    if (consoleRef.current && !isPaused) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [visibleLogs, isPaused]);

  const stats = useMemo(() => {
    const total = logs.length;
    const warns = logs.filter((l) => l.action === 'delete' || l.action === 'rejected').length;
    const auth = logs.filter((l) => l.module === 'auth').length;
    return { total, warns, auth };
  }, [logs]);

  const handleClear = () => {
    setVisibleLogs([]);
    setEventCount(0);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-semibold text-green-600 uppercase">Live Streaming</span>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Audit Logs Console</h1>
              <p className="text-sm text-gray-600">Real-time system event monitoring and security audit stream.</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateBack}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm font-medium">← Back to Audit Logs</span>
            </button>
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              <span className="text-sm font-medium">{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>
            <button
              onClick={handleClear}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Clear Console</span>
            </button>
            <button
              onClick={() => exportAuditLogsToCsv(visibleLogs, 'audit-console-' + new Date().toISOString().slice(0, 10) + '.csv')}
              disabled={visibleLogs.length === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Export Session</span>
            </button>
          </div>
        </div>
      </div>

      {/* Console Window */}
      <div className="flex-1 p-8 overflow-hidden">
        <div className="h-full bg-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-700 flex flex-col">
          <div className="bg-gray-800 px-4 py-2 flex items-center space-x-2 border-b border-gray-700">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-400 font-mono">audit@bkwb-server:~</span>
            </div>
            <div className="text-xs text-gray-400 font-mono">live stream</div>
          </div>

          <div
            ref={consoleRef}
            className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed"
            style={{ backgroundColor: '#0a0e27' }}
          >
            {visibleLogs.length === 0 ? (
              <div className="text-gray-500">
                Waiting for audit events…
              </div>
            ) : (
              visibleLogs.map((log) => {
                const level = levelFor(log.module, log.action);
                return (
                  <div key={log.id} className="hover:bg-gray-800 hover:bg-opacity-30 px-2 -mx-2 transition-colors">
                    <span className="text-gray-500">{formatLine(log.created_at)}</span>
                    <span className={"ml-2 font-semibold " + colorFor(level)}>{level.padEnd(5, ' ')}</span>
                    <span className="ml-2 text-gray-300">{entryText(log)}</span>
                  </div>
                );
              })
            )}
          </div>

          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-t border-gray-700">
            <div className="flex items-center space-x-4 text-xs text-gray-400 font-mono">
              <div>
                <span className="text-gray-500">EVENTS:</span>
                <span className="ml-2 text-white font-semibold">{eventCount}</span>
              </div>
              <div>
                <span className="text-gray-500">AUTH:</span>
                <span className="ml-2 text-white font-semibold">{stats.auth}</span>
              </div>
              <div>
                <span className="text-gray-500">WARNINGS:</span>
                <span className="ml-2 text-white font-semibold">{stats.warns}</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className={"w-2 h-2 rounded-full animate-pulse " + (isPaused ? 'bg-yellow-500' : 'bg-green-500')}></div>
              <span className={"text-xs font-semibold uppercase " + (isPaused ? 'text-yellow-400' : 'text-green-400')}>
                {isPaused ? 'Stream Paused' : 'Stream Active'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Loaded Events</div>
                <div className="text-2xl font-bold text-gray-900">{logs.length}</div>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Warnings</div>
                <div className="text-2xl font-bold text-gray-900">{stats.warns}</div>
              </div>
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Auth Events</div>
                <div className="text-2xl font-bold text-gray-900">{stats.auth}</div>
              </div>
              <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Modules Active</div>
                <div className="text-2xl font-bold text-gray-900">{new Set(logs.map((l) => l.module)).size}</div>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditLogsConsole;
