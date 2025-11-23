import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Language, SearchResult, SuggestionItem, LogEntry, Attachment, PageView } from '../types';
import { analyzeIssue, analyzeSpecificItem } from '../services/geminiService';
import { Send, Plus, Loader2, Sparkles, AlertCircle, Paperclip, Image as ImageIcon, Link as LinkIcon, X, FileText, ExternalLink, Check, BookOpen, ShieldAlert, ListChecks, ChevronRight, ArrowRight } from 'lucide-react';

interface HomeProps {
  language: Language;
  addLog: (entry: LogEntry) => void;
  addToHistory: (result: SearchResult) => void;
  initialResult?: SearchResult | null;
  onClearInitial?: () => void;
  currentResult: SearchResult | null;
  setCurrentResult: (result: SearchResult | null) => void;
  setPage: (page: PageView) => void;
}

export const Home: React.FC<HomeProps> = ({ 
  language, 
  addLog, 
  addToHistory, 
  initialResult, 
  onClearInitial,
  currentResult,
  setCurrentResult,
  setPage
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detail Modal State
  const [selectedItem, setSelectedItem] = useState<SuggestionItem | null>(null);
  const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Attachment State
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle History Restoration
  useEffect(() => {
    if (initialResult) {
      setQuery(initialResult.query);
      setCurrentResult(initialResult);
      setAttachment(null); 
      if (onClearInitial) onClearInitial();
    }
  }, [initialResult, onClearInitial]);

  // Handle File Upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError(language === Language.VI ? "File quá lớn (>5MB)" : "File too large (>5MB)");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Content = base64String.split(',')[1]; 
      
      setAttachment({
        type: 'file',
        content: base64Content,
        mimeType: file.type,
        name: file.name
      });
      setShowAttachMenu(false);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleLinkSubmit = () => {
    if (!linkUrl.trim()) return;
    setAttachment({
      type: 'link',
      content: linkUrl,
      name: linkUrl
    });
    setShowLinkInput(false);
    setShowAttachMenu(false);
    setLinkUrl('');
  };

  const handleSearch = useCallback(async (isLoadMore: boolean = false) => {
    if (!query.trim() && !attachment) return;

    setIsLoading(true);
    setError(null);

    try {
      const context = isLoadMore && currentResult 
        ? currentResult.suggestions.map(s => s.title).join(", ") 
        : "";

      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'info',
        message: isLoadMore ? `Loading more for: ${query}` : `New search: ${query}`,
        details: attachment ? `With attachment: ${attachment.name}` : undefined
      });

      const response = await analyzeIssue(query, language, attachment, context);

      const newSuggestions: SuggestionItem[] = response.suggestions.map(s => ({
        id: crypto.randomUUID(),
        title: s.title,
        description: s.description
      }));

      if (isLoadMore && currentResult) {
        const updatedResult: SearchResult = {
          ...currentResult,
          suggestions: [...currentResult.suggestions, ...newSuggestions],
          roastCommentary: response.roast,
          sources: [...(currentResult.sources || []), ...(response.sources || [])],
          promptSuggestion: response.promptSuggestion,
          bestModel: response.bestModel
        };
        setCurrentResult(updatedResult);
        addToHistory(updatedResult);
      } else {
        const newResult: SearchResult = {
          id: crypto.randomUUID(),
          query: query || (attachment ? `Analyzed: ${attachment.name}` : 'Unknown Query'),
          timestamp: Date.now(),
          suggestions: newSuggestions,
          roastCommentary: response.roast,
          sources: response.sources || [],
          promptSuggestion: response.promptSuggestion,
          bestModel: response.bestModel
        };
        setCurrentResult(newResult);
        addToHistory(newResult);
      }

      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'system',
        message: 'Gemini API Success',
        details: `Generated ${newSuggestions.length} items`
      });

    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'error',
        message: 'Analysis Failed',
        details: err.message
      });
    } finally {
      setIsLoading(false);
    }
  }, [query, attachment, language, currentResult, addLog, addToHistory]);

  const handleItemClick = async (item: SuggestionItem) => {
    if (loadingItemId) return;
    
    // If details already exist, just open modal
    if (item.details) {
      setSelectedItem(item);
      setIsModalOpen(true);
      return;
    }

    // Fetch details
    setLoadingItemId(item.id);
    try {
      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'info',
        message: `Fetching details for item: ${item.title}`
      });

      const details = await analyzeSpecificItem(
        item.title, 
        currentResult?.query || "General Issue", 
        language
      );

      // Update the item in currentResult state so we cache it
      if (currentResult) {
        const updatedSuggestions = currentResult.suggestions.map(s => 
          s.id === item.id ? { ...s, details } : s
        );
        const updatedResult = { ...currentResult, suggestions: updatedSuggestions };
        setCurrentResult(updatedResult);
        
        // SYNC BACK TO HISTORY
        addToHistory(updatedResult);

        // Find the updated item to set as selected
        const updatedItem = updatedSuggestions.find(s => s.id === item.id);
        if (updatedItem) {
          setSelectedItem(updatedItem);
          setIsModalOpen(true);
        }
      }
    } catch (error: any) {
      setError(language === Language.VI ? "Lỗi tải chi tiết" : "Failed to load details");
      addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'error',
        message: 'Detail Fetch Failed',
        details: error.message
      });
    } finally {
      setLoadingItemId(null);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 page-container">
      
      {/* Detail Modal Overlay */}
      {isModalOpen && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in no-print">
          <div className="bg-dark-900 border border-dark-700 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-dark-700 flex justify-between items-start bg-dark-800">
              <div>
                <span className="text-neon-purple text-xs font-mono mb-2 block uppercase tracking-wider">
                  {language === Language.VI ? 'Chi Tiết Vấn Đề' : 'Issue Deep Dive'}
                </span>
                <h3 className="text-2xl font-bold text-white leading-tight">
                  {selectedItem.title}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white hover:bg-dark-700 p-2 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-8 bg-dark-900">
              
              {/* Analysis Section */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-neon-green font-bold uppercase text-sm border-b border-dark-700 pb-2">
                  <BookOpen size={18} />
                  {language === Language.VI ? 'Phân Tích Chi Tiết' : 'Deep Analysis'}
                </h4>
                <p className="text-gray-300 leading-relaxed text-justify whitespace-pre-wrap">
                  {selectedItem.details?.analysis || "No analysis available."}
                </p>
              </div>

              {/* Steps Section */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-neon-yellow font-bold uppercase text-sm border-b border-dark-700 pb-2">
                  <ListChecks size={18} />
                  {language === Language.VI ? 'Hướng Dẫn / Quy Trình' : 'Workflow & Steps'}
                </h4>
                <div className="bg-dark-800 rounded-lg p-4">
                   <ul className="space-y-3">
                     {selectedItem.details?.steps.map((step, idx) => (
                       <li key={idx} className="flex gap-3 text-sm text-gray-300">
                         <span className="shrink-0 bg-dark-700 text-neon-yellow w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">
                           {idx + 1}
                         </span>
                         <span className="pt-0.5">{step}</span>
                       </li>
                     ))}
                   </ul>
                </div>
              </div>

              {/* Risks Section */}
              <div className="space-y-3">
                <h4 className="flex items-center gap-2 text-red-400 font-bold uppercase text-sm border-b border-dark-700 pb-2">
                  <ShieldAlert size={18} />
                  {language === Language.VI ? 'Rủi Ro & Cảnh Báo' : 'Risks & Warnings'}
                </h4>
                <div className="bg-red-900/10 border border-red-900/30 p-4 rounded-lg text-red-200 text-sm leading-relaxed">
                  {selectedItem.details?.risks}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-dark-700 bg-dark-800 flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg transition-colors font-medium"
              >
                {language === Language.VI ? 'Đóng' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="text-center space-y-2 no-print">
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-neon-green to-neon-purple bg-clip-text text-transparent">
          {language === Language.VI ? 'Nhập Vấn Đề Của Bạn' : 'Input Your Life Issue'}
        </h2>
        <p className="text-gray-400">
          {language === Language.VI 
            ? 'Xây dựng, luật pháp, công việc... Kèm hình ảnh/tài liệu nếu cần.' 
            : 'Construction, law, work... Attach images/docs if needed.'}
        </p>
      </div>

      {/* Input Section */}
      <div className="space-y-3 no-print">
        {/* Attachment Preview Pill */}
        {attachment && (
          <div className="flex items-center gap-2 text-sm animate-fade-in">
            <div className="bg-dark-700 text-neon-green px-3 py-1 rounded-full flex items-center gap-2 border border-neon-green/30">
              {attachment.type === 'file' ? <FileText size={14} /> : <LinkIcon size={14} />}
              <span className="truncate max-w-[200px] font-mono">{attachment.name}</span>
              <button 
                onClick={() => setAttachment(null)}
                className="hover:text-red-400 ml-1 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        <div className="relative group z-10">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-neon-green to-neon-purple rounded-xl blur opacity-30 group-hover:opacity-60 transition duration-1000"></div>
          <div className="relative flex bg-dark-800 rounded-xl p-2 border border-dark-700 shadow-2xl items-center gap-2">
            
            {/* Attachment Button */}
            <div className="relative">
              <button 
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className={`p-2 rounded-lg transition-colors ${showAttachMenu ? 'bg-neon-purple text-white' : 'text-gray-400 hover:text-white hover:bg-dark-700'}`}
                title={language === Language.VI ? "Đính kèm File/Link" : "Attach File/Link"}
              >
                <Paperclip size={20} />
              </button>

              {/* Attachment Menu Popover */}
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 w-48 bg-dark-800 border border-dark-600 rounded-lg shadow-xl overflow-hidden flex flex-col z-20 animate-fade-in">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*,video/*,application/pdf"
                    onChange={handleFileSelect}
                  />
                  <button 
                    onClick={() => { fileInputRef.current?.click(); }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-dark-700 text-left text-sm text-gray-200 transition-colors"
                  >
                    <ImageIcon size={16} className="text-neon-pink" />
                    {language === Language.VI ? 'Upload Media/PDF' : 'Upload Media/PDF'}
                  </button>
                  <button 
                    onClick={() => { setShowLinkInput(true); setShowAttachMenu(false); }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-dark-700 text-left text-sm text-gray-200 transition-colors border-t border-dark-700"
                  >
                    <LinkIcon size={16} className="text-neon-yellow" />
                    {language === Language.VI ? 'Gán Link URL' : 'Paste Link URL'}
                  </button>
                </div>
              )}
            </div>

            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(false)}
              placeholder={language === Language.VI 
                ? "Nhập vấn đề (vd: Luật đất đai 2025)..." 
                : "Describe issue (ex: Land Law 2025)..."}
              className="flex-1 bg-transparent text-white placeholder-gray-500 px-2 py-2 outline-none font-mono min-w-0"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSearch(false)}
              disabled={isLoading || (!query && !attachment)}
              className="bg-dark-700 hover:bg-dark-600 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 border border-dark-600"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              <span className="hidden md:inline">{language === Language.VI ? 'Gửi' : 'Send'}</span>
            </button>
          </div>
        </div>

        {/* Link Input Modal/Overlay */}
        {showLinkInput && (
          <div className="flex items-center gap-2 animate-fade-in bg-dark-800 p-3 rounded-lg border border-neon-purple/50 shadow-lg relative z-20">
            <LinkIcon size={16} className="text-neon-yellow ml-2" />
            <input 
              type="url"
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLinkSubmit()}
              placeholder="https://thuvienphapluat.vn/..."
              className="flex-1 bg-transparent text-white text-sm outline-none font-mono"
            />
            <button onClick={handleLinkSubmit} className="text-neon-green text-xs font-bold hover:bg-neon-green/20 px-3 py-1 rounded transition-colors">OK</button>
            <button onClick={() => setShowLinkInput(false)} className="text-red-400 hover:text-red-300 px-2"><X size={16}/></button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg flex items-start gap-3 text-red-200 animate-fade-in no-print">
          <AlertCircle className="shrink-0 mt-1" size={20} />
          <div>
            <h4 className="font-bold">System Error</h4>
            <p className="text-sm opacity-80">{error}</p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {currentResult && (
        <div className="space-y-6 animate-fade-in pb-10">
          
          {/* Navigation to Report Page */}
          <div className="bg-dark-800 p-4 rounded-lg border border-dark-700 flex justify-between items-center shadow-lg">
             <div className="flex flex-col">
                <span className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status: Analysis Complete</span>
                <span className="text-white font-bold">
                    {language === Language.VI ? 'Đã có báo cáo tổng hợp' : 'Executive Report Ready'}
                </span>
             </div>
             <button 
                onClick={() => setPage('report')}
                className="flex items-center gap-2 bg-neon-purple text-white px-4 py-2 rounded-lg hover:bg-neon-purple/80 transition-all font-bold shadow-neon"
             >
                <span>{language === Language.VI ? 'Xem Báo Cáo' : 'View Report'}</span>
                <ArrowRight size={18} />
             </button>
          </div>

          {/* ANALYSIS VIEW */}
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Roast Card */}
            <div className="bg-dark-800 rounded-xl border border-neon-yellow/30 p-6 relative overflow-hidden shadow-lg group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Sparkles size={100} />
              </div>
              <h3 className="text-neon-yellow font-mono font-bold flex items-center gap-2 mb-4">
                <span className="bg-neon-yellow text-black px-2 py-0.5 rounded text-xs">CODE NOTE</span>
                {language === Language.VI ? 'ĐÁNH GIÁ (CHÉM GIÓ)' : 'EXPERT ROAST'}
              </h3>
              <p className="text-gray-200 leading-relaxed whitespace-pre-wrap font-mono text-sm md:text-base border-l-4 border-neon-yellow pl-4 italic">
                "{currentResult.roastCommentary}"
              </p>

              {/* Source Citation */}
              <div className="mt-6 pt-4 border-t border-dark-700/50">
                <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                  <LinkIcon size={12} />
                  {language === Language.VI ? 'Nguồn Dữ Liệu / Tham Khảo:' : 'Data Sources / References:'}
                </h4>
                {currentResult.sources && currentResult.sources.length > 0 ? (
                  <ul className="space-y-2">
                    {currentResult.sources.map((src, idx) => (
                      <li key={idx} className="text-xs text-neon-green font-mono flex items-center gap-2 break-all bg-dark-900/50 p-2 rounded hover:bg-dark-700 transition-colors">
                        <ExternalLink size={10} className="shrink-0" />
                        <span className="opacity-70 select-none">[{idx + 1}]</span> 
                        <span className="cursor-text select-text">{src}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-gray-600 italic">{language === Language.VI ? 'Nguồn: Kiến thức tổng hợp' : 'Source: General Knowledge'}</span>
                )}
              </div>
            </div>

            {/* Suggestions List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-8 bg-neon-green rounded-full"></span>
                  {language === Language.VI ? 'Danh Sách Vấn Đề Liên Quan' : 'Related Issues Log'}
                </h3>
                <span className="text-xs font-mono text-gray-500 bg-dark-900 px-2 py-1 rounded border border-dark-700">
                  count: {currentResult.suggestions.length}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {currentResult.suggestions.map((item, index) => (
                  <div 
                    key={item.id} 
                    onClick={() => handleItemClick(item)}
                    className={`bg-dark-800 p-4 rounded-lg border transition-all duration-300 group cursor-pointer relative overflow-hidden ${
                      loadingItemId === item.id 
                        ? 'border-neon-purple opacity-70' 
                        : 'border-dark-700 hover:border-neon-purple/50 hover:bg-dark-700/50'
                    }`}
                  >
                    {loadingItemId === item.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10">
                        <Loader2 className="animate-spin text-neon-purple" size={32} />
                      </div>
                    )}
                    
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-mono text-xs text-neon-purple opacity-50 group-hover:text-neon-green group-hover:opacity-100 transition-all">
                        #{String(index + 1).padStart(2, '0')}
                      </span>
                      {item.details && (
                        <span className="text-xs bg-neon-green/10 text-neon-green px-2 py-0.5 rounded border border-neon-green/30 flex items-center gap-1">
                          <Check size={10} /> {language === Language.VI ? 'Chi tiết' : 'Details'}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-white mb-2 group-hover:text-neon-purple transition-colors pr-6">
                      {item.title}
                    </h4>
                    <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                    
                    <div className="mt-4 pt-3 border-t border-dark-700 flex justify-end">
                      <span className="text-xs text-neon-purple group-hover:translate-x-1 transition-transform flex items-center gap-1 font-bold uppercase">
                        {language === Language.VI ? 'Xem Chi Tiết' : 'View Deep Dive'} <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleSearch(true)}
                disabled={isLoading}
                className="w-full py-4 bg-dark-800 border border-dashed border-gray-600 rounded-xl text-gray-400 hover:text-white hover:border-white hover:bg-dark-700 transition-all flex items-center justify-center gap-2 mt-4 no-print"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <Plus />}
                {language === Language.VI ? 'Tải thêm 10 vấn đề tiếp theo' : 'Load next 10 issues'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};