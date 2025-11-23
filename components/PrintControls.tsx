import React, { useState } from 'react';
import { Printer, Copy, Check, Download, Loader2 } from 'lucide-react';
import { Language } from '../types';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface PrintControlsProps {
  contentRef: React.RefObject<HTMLElement>;
  language: Language;
  className?: string;
  filename?: string;
}

export const PrintControls: React.FC<PrintControlsProps> = ({ contentRef, language, className = '', filename = 'document' }) => {
  const [copied, setCopied] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = () => {
    if (contentRef.current) {
      const text = contentRef.current.innerText;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPdf = async () => {
    if (!contentRef.current) return;
    
    setIsGeneratingPdf(true);
    try {
      // Use html2canvas to render the DOM element to a canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2, // High resolution
        useCORS: true, // Handle cross-origin images if any
        backgroundColor: '#ffffff', // Ensure white background
        logging: false
      });

      const imgData = canvas.toDataURL('image/png');
      
      // Initialize jsPDF (A4 portrait)
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;

      // Handle multi-page content
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (error) {
      console.error("PDF Generation failed:", error);
      alert(language === Language.VI ? "Lỗi tạo PDF" : "PDF Generation Error");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className={`flex gap-2 no-print ${className}`}>
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 bg-dark-700 border border-dark-600 hover:bg-dark-600 text-gray-200 px-3 py-1.5 rounded text-sm transition-colors"
        title={language === Language.VI ? "Sao chép nội dung" : "Copy content"}
      >
        {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
        <span className="hidden sm:inline">{language === Language.VI ? 'Sao chép' : 'Copy'}</span>
      </button>
      
      <button
        onClick={handleDownloadPdf}
        disabled={isGeneratingPdf}
        className="flex items-center gap-2 bg-dark-700 border border-dark-600 hover:bg-dark-600 text-gray-200 px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-50"
        title={language === Language.VI ? "Tải PDF" : "Download PDF"}
      >
        {isGeneratingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        <span className="hidden sm:inline">{language === Language.VI ? 'PDF' : 'PDF'}</span>
      </button>

      <button
        onClick={handlePrint}
        className="flex items-center gap-2 bg-neon-purple/20 border border-neon-purple/50 hover:bg-neon-purple/30 text-neon-purple px-3 py-1.5 rounded text-sm transition-colors"
        title={language === Language.VI ? "In A4" : "Print A4"}
      >
        <Printer size={16} />
        <span className="hidden sm:inline">{language === Language.VI ? 'In' : 'Print'}</span>
      </button>
    </div>
  );
};