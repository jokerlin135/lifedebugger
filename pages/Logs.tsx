import React, { useRef } from 'react';
import { LogEntry, Language } from '../types';
import { Terminal, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { PrintControls } from '../components/PrintControls';

interface LogsProps {
  logs: LogEntry[];
  language: Language;
}

export const Logs: React.FC<LogsProps> = ({ logs, language }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const getIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return <AlertTriangle className="text-red-500" size={16} />;
      case 'warning': return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'system': return <Terminal className="text-neon-purple" size={16} />;
      case 'info': default: return <Info className="text-blue-400" size={16} />;
    }
  };

  const getColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'error': return 'bg-red-900/10 border-red-900/30 text-red-200';
      case 'system': return 'bg-purple-900/10 border-purple-900/30 text-purple-200';
      default: return 'bg-dark-800 border-dark-700 text-gray-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Terminal className="text-neon-pink" />
          {language === Language.VI ? 'Nhật Ký Hệ Thống' : 'System Logs'}
        </h2>
        <PrintControls contentRef={contentRef} language={language} />
      </div>

      <div className="flex-1 bg-black rounded-lg border border-dark-700 p-4 overflow-y-auto font-mono text-sm shadow-inner custom-scrollbar">
        {logs.length === 0 && (
          <div className="text-gray-600 text-center py-10">
            -- No logs recorded yet --
          </div>
        )}
        <div ref={contentRef} className="space-y-1 printable-content">
          {logs.slice().reverse().map((log) => (
            <div key={log.id} className={`p-2 rounded border-l-2 flex gap-3 break-inside-avoid ${getColor(log.type)}`}>
              <span className="text-gray-500 shrink-0">
                [{new Date(log.timestamp).toLocaleTimeString()}]
              </span>
              <div className="mt-0.5 shrink-0">{getIcon(log.type)}</div>
              <div className="break-all">
                <span className="font-bold mr-2 uppercase text-xs tracking-wider opacity-75">{log.type}:</span>
                {log.message}
                {log.details && (
                  <pre className="mt-1 text-xs opacity-60 overflow-x-auto whitespace-pre-wrap">
                    {log.details}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};