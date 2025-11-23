import React, { useEffect, useState, useRef } from 'react';
import { Language, SearchResult, LogEntry, SuggestionItem } from '../types';
import { analyzeSpecificItem } from '../services/geminiService';
import { List, Zap, Link as LinkIcon, Cpu, Bot, Download, Copy, Printer, Check, Loader2, AlertTriangle } from 'lucide-react';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface ReportPageProps {
  language: Language;
  currentResult: SearchResult | null;
  updateResult: (result: SearchResult) => void;
  addToHistory: (result: SearchResult) => void;
  addLog: (entry: LogEntry) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({ 
  language, 
  currentResult, 
  updateResult, 
  addToHistory, 
  addLog 
}) => {
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Fix: Track latest result in ref to avoid stale closures in async loop
  const currentResultRef = useRef(currentResult);
  useEffect(() => {
    currentResultRef.current = currentResult;
  }, [currentResult]);

  // Auto-Generation Trigger on Mount or Update
  useEffect(() => {
    if (currentResult && !isAutoGenerating) {
       const missing = currentResult.suggestions.filter(s => !s.details);
       if (missing.length > 0) {
          triggerAutoGeneration(missing);
       }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentResult]); // Keep dependency simple to trigger check on updates

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const triggerAutoGeneration = async (items: SuggestionItem[]) => {
     if (isAutoGenerating) return;

     setIsAutoGenerating(true);
     setGenProgress({ current: 0, total: items.length });
     
     addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'system',
        message: 'Report Page: Auto-Generation Started',
        details: `Queueing ${items.length} items with rate limiting...`
     });
     
     for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Rate Limiting: Wait 4s between requests to satisfy ~15 RPM free tier limit
        if (i > 0) {
            setStatusMessage(`Waiting for rate limit (Cooling down)...`);
            await delay(4000); 
        }

        let success = false;
        let retries = 0;
        const maxRetries = 3;

        setStatusMessage(`Analyzing item ${i + 1}/${items.length}: "${item.title}"...`);

        while (!success && retries < maxRetries) {
            try {
               const queryContext = currentResultRef.current?.query || "";
               const details = await analyzeSpecificItem(item.title, queryContext, language);
               
               // Use Ref to ensure we are patching the latest state
               if (currentResultRef.current) {
                  const newResult = {
                     ...currentResultRef.current,
                     suggestions: currentResultRef.current.suggestions.map(s => s.id === item.id ? { ...s, details } : s)
                  };
                  updateResult(newResult);
               }
               success = true;
            } catch (e: any) {
               const isRateLimit = e.message?.includes('429') || e.message?.includes('quota') || e.status === 429;
               
               if (isRateLimit) {
                   retries++;
                   const waitTime = 12000 + (retries * 2000); // Backoff: 12s, 14s, 16s
                   const msg = `Rate Limit (429) hit. Cooling down ${waitTime/1000}s... (Retry ${retries}/${maxRetries})`;
                   
                   setStatusMessage(msg);
                   addLog({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'warning',
                        message: `Quota Exceeded for "${item.title}". Pausing...`,
                        details: msg
                   });
                   
                   await delay(waitTime); 
               } else {
                   console.error("Auto-gen error for", item.title, e);
                   addLog({
                        id: crypto.randomUUID(),
                        timestamp: Date.now(),
                        type: 'error',
                        message: `Failed to generate: ${item.title}`,
                        details: e.message
                   });
                   break; // Skip item on non-recoverable error
               }
            }
        }
        setGenProgress(prev => ({ ...prev, current: i + 1 }));
     }

     setStatusMessage('');
     setIsAutoGenerating(false);
     addLog({
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'system',
        message: 'Report Page: Generation Queue Complete'
     });
  };

  const generateReportText = () => {
    if (!currentResult) return '';
    const dateStr = new Date(currentResult.timestamp).toLocaleDateString();
    const title = language === Language.VI ? "BÁO CÁO TỔNG HỢP VẤN ĐỀ" : "EXECUTIVE SUMMARY REPORT";
    
    // Simple text generation for clipboard
    let text = `${title}\n-------------------\nQuery: ${currentResult.query}\nDate: ${dateStr}\n\n`;
    currentResult.suggestions.forEach((item, idx) => {
        text += `${idx + 1}. ${item.title}\n${item.description}\n`;
        if (item.details) text += `Analysis: ${item.details.analysis}\nSteps: ${item.details.steps.join(', ')}\nRisk: ${item.details.risks}\n\n`;
    });
    return text;
  };

  const handleCopyReport = () => {
    const text = generateReportText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setIsExportingPdf(true);
    try {
      const originalElement = reportRef.current;
      const clone = originalElement.cloneNode(true) as HTMLElement;
      
      // Setup consistent width for A4 rendering (approx 794px at 96dpi)
      const A4_WIDTH_PX = 794; 
      
      const container = document.createElement('div');
      Object.assign(container.style, {
        position: 'fixed', top: '0', left: '0', zIndex: '-9999',
        width: `${A4_WIDTH_PX}px`, backgroundColor: '#ffffff'
      });
      
      Object.assign(clone.style, {
        padding: '30px', 
        boxSizing: 'border-box',
        width: '100%', maxWidth: 'none', margin: '0',
        backgroundColor: '#ffffff', color: '#000000',
        boxShadow: 'none', borderRadius: '0',
        fontFamily: 'Arial, sans-serif'
      });

      container.appendChild(clone);
      document.body.appendChild(container);
      
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(clone, {
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false, 
        width: A4_WIDTH_PX, 
        windowWidth: A4_WIDTH_PX
      });

      document.body.removeChild(container);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 20; 
      const contentWidth = pdfWidth - (margin * 2);
      const contentHeight = pdfHeight - (margin * 2);

      const scaleFactor = contentWidth / canvas.width;
      const pageHeightInCanvasPx = contentHeight / scaleFactor;

      let currentSourceY = 0;
      
      while (currentSourceY < canvas.height) {
        if (currentSourceY > 0) {
           pdf.addPage();
        }

        const sliceHeightPx = Math.min(pageHeightInCanvasPx, canvas.height - currentSourceY);
        
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(
                canvas, 
                0, currentSourceY, canvas.width, sliceHeightPx, 
                0, 0, canvas.width, sliceHeightPx 
            );

            const sliceImgData = sliceCanvas.toDataURL('image/png');
            const pdfSliceHeight = sliceHeightPx * scaleFactor;

            pdf.addImage(sliceImgData, 'PNG', margin, margin, contentWidth, pdfSliceHeight);
        }

        currentSourceY += pageHeightInCanvasPx;
      }
      
      pdf.save(`report-${language === Language.VI ? 'tong-hop' : 'summary'}-${Date.now()}.pdf`);
    } catch (err) {
      console.error(err);
      alert(language === Language.VI ? 'Lỗi tạo file PDF' : 'PDF generation failed.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!currentResult) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Zap size={64} className="mb-4 opacity-30" />
        <p className="text-xl text-center max-w-md">
          {language === Language.VI 
             ? 'Chưa có dữ liệu phân tích. Vui lòng quay lại trang "Phân Tích" và nhập vấn đề.' 
             : 'No analysis data. Please go back to "Debugger" page and submit an issue.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 page-container">
      {/* Controls Toolbar */}
      <div className="flex justify-between items-center bg-dark-800 p-3 rounded-lg border border-dark-700 no-print">
        <div className="text-sm font-bold text-gray-300 flex items-center gap-2">
           <Zap size={16} className="text-neon-yellow"/>
           <span>{language === Language.VI ? 'Báo Cáo & Hồ Sơ (A4 Ready)' : 'Executive Report View'}</span>
        </div>
        <div className="flex gap-2">
            <button onClick={handleCopyReport} className="btn-icon" title="Copy Text">
                {copied ? <Check size={18} className="text-green-400"/> : <Copy size={18}/>}
            </button>
            <button onClick={handleDownloadPdf} disabled={isExportingPdf} className="btn-icon" title="Download PDF with Padding">
                {isExportingPdf ? <Loader2 size={18} className="animate-spin"/> : <Download size={18}/>}
            </button>
            <button onClick={handlePrint} className="btn-icon" title="Print">
                <Printer size={18}/>
            </button>
        </div>
      </div>

      {/* Auto Gen Progress */}
      {isAutoGenerating && (
         <div className="mb-4 space-y-2 no-print">
           <div className="bg-dark-700 rounded-full h-4 overflow-hidden border border-dark-600 relative animate-pulse">
             <div 
               className={`h-full transition-all duration-500 ease-out ${statusMessage.includes('Cooling') ? 'bg-orange-500' : 'bg-neon-green'}`}
               style={{ width: `${(genProgress.current / genProgress.total) * 100}%` }}
             ></div>
           </div>
           <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider">
              <span className="text-neon-green font-bold">
                 {statusMessage || (language === Language.VI ? 'ĐANG TẠO CHI TIẾT TỰ ĐỘNG...' : 'AUTO-GENERATING...')}
              </span>
              <span className="text-gray-400">{genProgress.current}/{genProgress.total}</span>
           </div>
           {statusMessage.includes('429') && (
              <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-900/20 p-2 rounded border border-orange-500/30">
                 <AlertTriangle size={12} />
                 <span>Free Tier Limit Hit: Pausing to respect API quota...</span>
              </div>
           )}
         </div>
      )}

      {/* Report Content */}
      <div className="bg-white text-black p-10 md:p-16 rounded shadow-2xl min-h-[800px] font-serif printable-content" ref={reportRef}>
          {/* Header */}
          <div className="border-b-4 border-double border-black pb-6 mb-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold uppercase mb-2 tracking-wider text-blue-900">
              {language === Language.VI ? 'BÁO CÁO TỔNG HỢP' : 'EXECUTIVE REPORT'}
            </h2>
            <p className="text-gray-500 italic text-sm">
              LifeDebugger generated content
            </p>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-2 gap-4 mb-8 text-sm font-sans border-b border-gray-200 pb-4">
            <div>
              <span className="font-bold text-gray-500 block uppercase text-xs">
                {language === Language.VI ? 'Vấn đề / Chủ đề' : 'Subject'}:
              </span>
              <span className="font-bold text-lg text-black">{currentResult.query}</span>
            </div>
            <div className="text-right">
              <span className="font-bold text-gray-500 block uppercase text-xs">
                {language === Language.VI ? 'Ngày báo cáo' : 'Date'}:
              </span>
              <span className="text-black">{new Date(currentResult.timestamp).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Table of Contents */}
          <div className="mb-8 p-6 rounded border border-blue-100 break-inside-avoid">
              <h3 className="font-bold text-lg uppercase mb-4 border-b border-blue-100 pb-2 flex items-center gap-2 text-blue-900">
                 <List size={20} />
                 {language === Language.VI ? 'MỤC LỤC' : 'TABLE OF CONTENTS'}
              </h3>
              <ul className="space-y-1 text-sm font-sans">
                 <li className="font-bold text-base text-blue-800">I. {language === Language.VI ? 'PHÂN TÍCH TỔNG QUAN' : 'GENERAL ANALYSIS'}</li>
                 <li className="font-bold text-base mt-2 text-rose-800">II. {language === Language.VI ? 'BÁO CÁO CHI TIẾT' : 'DETAILED REPORT'}</li>
                 <ul className="pl-6 space-y-1 text-gray-600 font-mono text-xs">
                    {currentResult.suggestions.map((item, idx) => (
                       <li key={item.id} className="truncate">
                          {idx + 1}. {item.title}
                       </li>
                    ))}
                 </ul>
                 <li className="font-bold text-base mt-2 text-purple-800">III. {language === Language.VI ? 'PROMPT & AI TƯ VẤN' : 'PROMPT & AI ADVICE'}</li>
                 <li className="font-bold text-base mt-2 text-emerald-800">IV. {language === Language.VI ? 'NGUỒN TÀI LIỆU' : 'REFERENCES'}</li>
              </ul>
          </div>

          {/* I. Analysis */}
          <div className="mb-8">
            <h3 className="font-bold uppercase border-l-4 border-blue-600 pl-3 mb-3 text-lg text-blue-900">
              I. {language === Language.VI ? 'PHÂN TÍCH TỔNG QUAN & ĐÁNH GIÁ' : 'GENERAL ANALYSIS & EVALUATION'}
            </h3>
            <div className="text-justify leading-relaxed text-gray-900 whitespace-pre-wrap pl-4 border-l border-gray-200">
                {currentResult.roastCommentary}
            </div>
          </div>

          {/* II. Detailed Report */}
          <div className="mb-8">
            <h3 className="font-bold uppercase border-l-4 border-rose-600 pl-3 mb-3 text-lg text-rose-900">
              II. {language === Language.VI ? 'BÁO CÁO CHI TIẾT CÁC VẤN ĐỀ' : 'DETAILED REPORT OF ISSUES'}
            </h3>
            <div className="space-y-6">
              {currentResult.suggestions.map((item, index) => (
                  <div key={item.id} className="break-inside-avoid border-b border-gray-100 pb-4">
                    <h4 className="font-bold text-lg mb-2 text-gray-900">
                      <span className="text-rose-600 mr-2 font-black">{index + 1}.</span>
                      {item.title}
                    </h4>
                    <p className="text-gray-700 text-justify leading-relaxed mb-3">
                      {item.description}
                    </p>
                    {item.details ? (
                      <div className="ml-4 pl-4 border-l border-gray-300 mt-2 text-sm text-gray-600">
                        <div className="flex gap-2 mb-2 items-center text-amber-700 border-b border-amber-100 pb-1 w-fit">
                          <Zap size={14}/>
                          <span className="font-bold text-xs uppercase">Analysis & Guide</span>
                        </div>
                        <p className="mb-3 whitespace-pre-wrap leading-relaxed text-gray-800">{item.details.analysis}</p>
                        <div className="mb-3">
                          <span className="font-bold text-xs uppercase block mb-1 text-emerald-700">Actionable Steps:</span>
                          <ul className="list-disc pl-5 space-y-1 text-gray-700">
                            {item.details.steps.map((s,i) => <li key={i}>{s}</li>)}
                          </ul>
                        </div>
                        <div className="text-red-700 mt-2">
                          <span className="font-bold uppercase mr-1 text-xs border border-red-200 px-1 rounded">Risk:</span>
                          {item.details.risks}
                        </div>
                      </div>
                    ) : (
                      isAutoGenerating && (
                          <div className="ml-4 pl-4 mt-2 text-xs text-gray-400 animate-pulse italic flex items-center gap-2">
                            <Loader2 size={12} className="animate-spin"/>
                            Waiting for analysis...
                          </div>
                      )
                    )}
                  </div>
              ))}
            </div>
          </div>

          {/* III. Prompt & AI */}
          <div className="mb-8 break-inside-avoid">
            <h3 className="font-bold uppercase border-l-4 border-purple-600 pl-3 mb-3 text-lg text-purple-900 flex items-center gap-2">
              <Cpu size={20} />
              III. {language === Language.VI ? 'PROMPT & AI TƯ VẤN (DÀNH CHO CHUYÊN GIA)' : 'PROMPT ENGINEERING & AI ADVICE'}
            </h3>
            <div className="pl-4 border-l border-gray-200 space-y-4">
                <div className="flex gap-2 items-start">
                     <div className="mt-1"><Bot size={16} className="text-purple-700"/></div>
                     <div>
                        <span className="font-bold text-sm text-purple-800 block uppercase">{language === Language.VI ? 'Mô hình AI Khuyên dùng:' : 'Recommended AI Model:'}</span>
                        <span className="font-mono text-lg font-bold text-gray-900">{currentResult.bestModel || 'Gemini 1.5 Pro / Claude 3.5 Sonnet'}</span>
                     </div>
                </div>
                <div>
                     <span className="font-bold text-sm text-purple-800 block uppercase mb-1">{language === Language.VI ? 'Câu lệnh mẫu tối ưu (Copy Prompt):' : 'Optimized System Prompt:'}</span>
                     <div className="border border-purple-200 p-3 rounded font-mono text-xs text-gray-600 leading-relaxed bg-white select-all">
                        {currentResult.promptSuggestion || "Analyzing prompt requirements..."}
                     </div>
                </div>
            </div>
          </div>

          {/* IV. Sources */}
          <div className="mb-8 p-6 rounded border border-emerald-100 break-inside-avoid">
            <h3 className="font-bold uppercase mb-4 text-sm text-emerald-800 flex items-center gap-2 border-b border-emerald-100 pb-2">
              <LinkIcon size={14} />
              IV. {language === Language.VI ? 'NGUỒN TÀI LIỆU THAM KHẢO' : 'REFERENCES & SOURCES'}
            </h3>
            {currentResult.sources && currentResult.sources.length > 0 ? (
              <ul className="list-decimal pl-5 space-y-2 text-sm font-mono text-emerald-900">
                {currentResult.sources.map((src, idx) => (
                  <li key={idx} className="break-all">
                    <a href="#" className="hover:underline decoration-emerald-500">{src}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-gray-500">
                  {language === Language.VI ? 'Tổng hợp từ kiến thức chung.' : 'General knowledge synthesis.'}
              </p>
            )}
          </div>

          <div className="text-center pt-8 border-t border-gray-200 mt-auto">
            <p className="text-xs text-gray-400">
                Report generated by LifeDebugger AI Analysis Tool.
            </p>
          </div>
      </div>
    </div>
  );
};