import React, { useState, useEffect, useRef } from 'react';
import { Pause, RotateCcw, Download, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import ExportAuditLogsModal from '../components/ExportAuditLogsModal';

interface AuditLogsConsoleProps {
  onNavigateBack: () => void;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'AUDIT';
  message: string;
}

const AuditLogsConsole: React.FC<AuditLogsConsoleProps> = ({ onNavigateBack }) => {
  const [isPaused, setIsPaused] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const consoleRef = useRef<HTMLDivElement>(null);
  const [eventCount, setEventCount] = useState(452);
  const [systemUsage, setSystemUsage] = useState(12);

  // Mock log messages
  const mockLogMessages = [
    { level: 'INFO' as const, message: 'System health check passed. All nodes operational.' },
    { level: 'INFO' as const, message: 'User "admin_01" logged in from IP0 104.3.44' },
    { level: 'WARN' as const, message: 'High CPU usage detected on Node:Cluster-B (68%)' },
    { level: 'INFO' as const, message: 'Database query optimized: Cache hit ratio 84.2%' },
    { level: 'INFO' as const, message: 'Scheduled backup attempt from blacklisted IP: 45.22.11.90' },
    { level: 'INFO' as const, message: 'SQL certificate renewal successful for ".wateroffice.io"' },
    { level: 'WARN' as const, message: 'New session established: session-bcb9c5e0213' },
    { level: 'WARN' as const, message: 'Disk Space on /var/log reaching 85% capacity' },
    { level: 'INFO' as const, message: 'Automated backup executed finishes: daily_full.sql.gz' },
    { level: 'INFO' as const, message: 'Email queue processed: 1,249 messages sent' },
    { level: 'INFO' as const, message: 'User "dev_lead" accessed secure vault credentials' },
    { level: 'WARN' as const, message: 'Rate Firewall rule updated: More SMTP traffic filtered' },
    { level: 'AUDIT' as const, message: 'Data integrity check completed: No corruption found.' },
    { level: 'INFO' as const, message: 'Waiting for next event...' },
  ];

  // Initialize with mock logs
  useEffect(() => {
    const initialLogs: LogEntry[] = mockLogMessages.map((msg, idx) => ({
      id: `log-${Date.now()}-${idx}`,
      timestamp: new Date(Date.now() - (mockLogMessages.length - idx) * 5000).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).replace(/(\d+)\/(\d+)\/(\d+),/, '[$3-$1-$2').replace(/(\d+:\d+:\d+)/, '$1.23]'),
      level: msg.level,
      message: msg.message,
    }));
    setLogs(initialLogs);
  }, []);

  // Simulate live log streaming
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const randomMsg = mockLogMessages[Math.floor(Math.random() * mockLogMessages.length)];
      const newLog: LogEntry = {
        id: `log-${Date.now()}-${Math.random()}`,
        timestamp: new Date().toLocaleString('en-US', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }).replace(/(\d+)\/(\d+)\/(\d+),/, '[$3-$1-$2').replace(/(\d+:\d+:\d+)/, '$1.23]'),
        level: randomMsg.level,
        message: randomMsg.message,
      };

      setLogs((prev) => [...prev.slice(-50), newLog]);
      setEventCount((prev) => prev + 1);
      
      // Scroll to bottom
      if (consoleRef.current) {
        consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const handleClearConsole = () => {
    setLogs([]);
    setEventCount(0);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'INFO':
        return 'text-blue-400';
      case 'WARN':
        return 'text-yellow-400';
      case 'ERROR':
        return 'text-red-400';
      case 'AUDIT':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getLevelLabel = (level: string) => {
    return level.padEnd(5, ' ');
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
              <Pause className="w-4 h-4" />
              <span className="text-sm font-medium">{isPaused ? 'Resume Stream' : 'Pause Stream'}</span>
            </button>
            <button
              onClick={handleClearConsole}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-sm font-medium">Clear Console</span>
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          {/* Terminal Header */}
          <div className="bg-gray-800 px-4 py-2 flex items-center space-x-2 border-b border-gray-700">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-400 font-mono">logs@bkwb-server:~</span>
            </div>
            <div className="text-xs text-gray-400 font-mono">audilogs 3.4.1</div>
          </div>

          {/* Console Content */}
          <div
            ref={consoleRef}
            className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed"
            style={{ backgroundColor: '#0a0e27' }}
          >
            {logs.map((log) => (
              <div key={log.id} className="hover:bg-gray-800 hover:bg-opacity-30 px-2 -mx-2 transition-colors">
                <span className="text-gray-500">{log.timestamp}</span>
                <span className={`ml-2 font-semibold ${getLevelColor(log.level)}`}>
                  {getLevelLabel(log.level)}
                </span>
                <span className="ml-2 text-gray-300">{log.message}</span>
              </div>
            ))}
          </div>

          {/* Console Footer */}
          <div className="bg-gray-800 px-4 py-2 flex items-center justify-between border-t border-gray-700">
            <div className="flex items-center space-x-4 text-xs text-gray-400 font-mono">
              <div>
                <span className="text-gray-500">EVENTS:</span>
                <span className="ml-2 text-white font-semibold">{eventCount}</span>
              </div>
              <div>
                <span className="text-gray-500">SYSTEM USAGE:</span>
                <span className="ml-2 text-white font-semibold">{systemUsage}%</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400 font-semibold uppercase">Stream Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="px-8 pb-8">
        <div className="grid grid-cols-4 gap-4">
          {/* Total Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Total Events</div>
                <div className="text-2xl font-bold text-gray-900">{eventCount.toLocaleString()}</div>
              </div>
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Info className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Open Warnings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Open Warnings</div>
                <div className="text-2xl font-bold text-gray-900">128</div>
              </div>
              <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>

          {/* Critical Errors */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Critical Errors</div>
                <div className="text-2xl font-bold text-gray-900">12</div>
              </div>
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </div>

          {/* Audit Events */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500 uppercase font-medium mb-1">Audit Events</div>
                <div className="text-2xl font-bold text-gray-900">3,491</div>
              </div>
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <ExportAuditLogsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

export default AuditLogsConsole;
