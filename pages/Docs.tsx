import React, { useRef } from 'react';
import { Language } from '../types';
import { FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { PrintControls } from '../components/PrintControls';

interface DocsProps {
  language: Language;
}

export const Docs: React.FC<DocsProps> = ({ language }) => {
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12 text-gray-300">
      
      {/* Header with Print Controls */}
      <div className="border-b border-dark-700 pb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
            {language === Language.VI ? 'Hướng Dẫn Sử Dụng' : 'User Manual'}
          </h1>
          <p className="text-lg text-neon-green font-mono">
            v1.0.0 | LifeDebugger Protocol
          </p>
        </div>
        <PrintControls contentRef={contentRef} language={language} />
      </div>

      {/* Printable Content Wrapper */}
      <div ref={contentRef} className="printable-content space-y-8">

        {/* Idea Confirmation Section */}
        <div className="bg-dark-800/50 p-6 rounded-xl border border-neon-purple/30">
          <h2 className="text-xl font-bold text-neon-purple mb-4 flex items-center gap-2">
             <CheckCircle size={20}/> 
             {language === Language.VI ? 'Xác Nhận Yêu Cầu (Rephrase)' : 'Requirement Confirmation'}
          </h2>
          <div className="space-y-4 text-sm font-mono">
            <p>
              {language === Language.VI 
                ? 'Hệ thống đã nhận diện ý tưởng của bạn như sau:'
                : 'The system has interpreted your idea as follows:'}
            </p>
            <ul className="list-disc pl-5 space-y-2 text-gray-400">
              <li>
                {language === Language.VI 
                  ? 'Mục tiêu: Tạo web app nhập input (vấn đề cuộc sống/luật/xây dựng) -> Output: 10 vấn đề gợi ý liên quan.'
                  : 'Goal: Create a web app accepting input (life/law/construction) -> Output: 10 related suggestions.'}
              </li>
              <li>
                {language === Language.VI 
                  ? 'Tính năng: Tải thêm 10 vấn đề (Pagination), Bình luận đánh giá hài hước/chửi tục (Code Note).'
                  : 'Features: Load more (Pagination), Humorous/Rude commentary (Code Note).'}
              </li>
              <li>
                {language === Language.VI 
                  ? 'Pages: Search, History, Logs, Docs.'
                  : 'Pages: Search, History, Logs, Docs.'}
              </li>
              <li>
                {language === Language.VI 
                  ? 'UX: Tự động cập nhật, Đa ngôn ngữ (Mặc định VI), In ấn/Sao chép.'
                  : 'UX: Auto-update, Multi-language (Default VI), Print/Copy.'}
              </li>
            </ul>
            <div className="mt-4 p-2 bg-green-900/20 text-green-400 border border-green-800 rounded">
              STATUS: APPROVED & DEPLOYED
            </div>
          </div>
        </div>

        {/* Workflow */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-white border-b border-dark-700 pb-2">
            {language === Language.VI ? 'Quy Trình Hoạt Động (Workflow)' : 'Workflow'}
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                step: '01',
                title: language === Language.VI ? 'Nhập Input' : 'Input Data',
                desc: language === Language.VI 
                  ? 'Nhập bất kỳ vấn đề nào: "Giấy phép xây dựng", "Sếp khó tính", "Luật đất đai"...'
                  : 'Enter any issue: "Construction permit", "Toxic boss", "Land law"...'
              },
              {
                step: '02',
                title: language === Language.VI ? 'AI Phân Tích' : 'AI Analysis',
                desc: language === Language.VI 
                  ? 'Hệ thống gọi Gemini API để liệt kê 10 vấn đề liên quan và viết một đoạn "Code Note" để đánh giá.'
                  : 'System calls Gemini API to list 10 related issues and writes a "Code Note" review.'
              },
              {
                step: '03',
                title: language === Language.VI ? 'Kết Quả & Mở Rộng' : 'Result & Expand',
                desc: language === Language.VI 
                  ? 'Xem kết quả, cười với bình luận, và bấm "Tải thêm" nếu muốn đào sâu hơn.'
                  : 'View results, laugh at the commentary, and click "Load More" to dig deeper.'
              }
            ].map((item) => (
              <div key={item.step} className="bg-dark-800 p-6 rounded-lg relative overflow-hidden group">
                <span className="absolute top-0 right-0 text-6xl font-bold opacity-5 text-neon-green">{item.step}</span>
                <h3 className="text-xl font-bold text-neon-green mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Detail */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-white border-b border-dark-700 pb-2">
            {language === Language.VI ? 'Tính Năng Chi Tiết' : 'Detailed Features'}
          </h2>
          <div className="bg-dark-800 rounded-lg divide-y divide-dark-700">
            {[
              { 
                name: 'Code Note (Commentary)', 
                detail: language === Language.VI 
                  ? 'Tính năng này cho phép AI "nói tục" và đánh giá chủ quan. Nó không chịu trách nhiệm về độ chính xác 100% mà tập trung vào sự hài hước và thực tế phũ phàng.' 
                  : 'Allows AI to be rude and subjective. Not 100% accurate, focuses on humor and brutal honesty.'
              },
              { 
                name: 'Live Auto-Update', 
                detail: language === Language.VI 
                  ? 'Giao diện phản hồi tức thì (React State) mà không cần reload trang.' 
                  : 'Instant interface response (React State) without page reload.'
              },
              { 
                name: 'Print & Report', 
                detail: language === Language.VI 
                  ? 'Cho phép in nội dung ra giấy A4 hoặc lưu dưới dạng PDF để đọc offline.' 
                  : 'Allows printing content to A4 paper or saving as PDF for offline reading.'
              }
            ].map((feat) => (
              <div key={feat.name} className="p-4 flex flex-col md:flex-row gap-4">
                <div className="md:w-1/3 font-bold text-white">{feat.name}</div>
                <div className="md:w-2/3 opacity-80 text-gray-400">{feat.detail}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

    </div>
  );
};