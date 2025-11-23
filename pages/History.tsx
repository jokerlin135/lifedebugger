import React, { useRef } from 'react';
import { SearchResult, Language } from '../types';
import { Clock, Trash2, FileSearch, Link as LinkIcon, RotateCcw, ArrowRight } from 'lucide-react';
import { PrintControls } from '../components/PrintControls';

interface HistoryProps {
  history: SearchResult[];
  language: Language;
  onRestore: (item: SearchResult) => void;
}

export const History: React.FC<HistoryProps> = ({ history, language, onRestore }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <FileSearch size={64} className="mb-4 opacity-50" />
        <p className="text-xl">
          {language === Language.VI ? 'Chưa có lịch sử tìm kiếm' : 'No search history yet'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
          <Clock className="text-neon-purple" />
          {language === Language.VI ? 'Lịch Sử Debug' : 'Debug History'}
        </h2>
        <PrintControls contentRef={contentRef} language={language} />
      </div>

      <div ref={contentRef} className="printable-content space-y-6">
        {history.slice().reverse().map((item) => (
          <div key={item.id} className="bg-dark-800 rounded-lg border border-dark-700 p-6 hover:border-neon-green/30 transition-all break-inside-avoid group">
            <div className="flex justify-between items-start mb-4 border-b border-dark-700 pb-2">
              <div>
                <div className="text-xs text-neon-green font-mono mb-1">
                  {new Date(item.timestamp).toLocaleString()}
                </div>
                <h3 className="text-xl font-bold text-white">"{item.query}"</h3>
              </div>
              <button 
                onClick={() => onRestore(item)}
                className="bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple px-3 py-1.5 rounded text-xs font-bold uppercase flex items-center gap-1 transition-colors no-print"
              >
                <RotateCcw size={14} />
                {language === Language.VI ? 'Tải Lại & Xem Report' : 'Reload & Report'}
              </button>
            </div>

            {/* Mini Roast Preview */}
            <div className="bg-dark-900/50 p-3 rounded mb-4 text-sm text-gray-300 italic border-l-2 border-neon-yellow">
              {item.roastCommentary}
            </div>

             {/* Sources in History */}
             {item.sources && item.sources.length > 0 && (
               <div className="mb-4 flex flex-wrap gap-2">
                 {item.sources.map((src, idx) => (
                   <span key={idx} className="text-xs bg-dark-700 text-neon-green px-2 py-1 rounded flex items-center gap-1 max-w-[200px] truncate">
                     <LinkIcon size={10} /> {src}
                   </span>
                 ))}
               </div>
             )}

            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                {language === Language.VI ? 'Kết quả ghi nhận:' : 'Logged Results:'}
              </h4>
              <ul className="grid md:grid-cols-2 gap-2">
                {item.suggestions.map((s) => (
                  <li key={s.id} className="text-sm bg-dark-700 px-3 py-2 rounded text-gray-300 flex justify-between items-center">
                    <span>• {s.title}</span>
                    {s.details && <span className="text-[10px] text-neon-green px-1 border border-neon-green rounded">DETAILED</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};