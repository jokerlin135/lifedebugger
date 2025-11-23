import React from 'react';
import { PageView, Language } from '../types';
import { Book, History, Bug, Terminal, Globe, Menu, X, Zap, FileText } from 'lucide-react';

interface SidebarProps {
  currentPage: PageView;
  setPage: (page: PageView) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentPage, 
  setPage, 
  language, 
  setLanguage,
  isOpen,
  setIsOpen
}) => {
  const menuItems: { id: PageView; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: language === Language.VI ? 'Phân Tích' : 'Debugger', icon: <Terminal size={20} /> },
    { id: 'report', label: language === Language.VI ? 'Báo Cáo' : 'Report', icon: <FileText size={20} /> },
    { id: 'history', label: language === Language.VI ? 'Lịch Sử' : 'History', icon: <History size={20} /> },
    { id: 'docs', label: language === Language.VI ? 'Hướng Dẫn' : 'Docs', icon: <Book size={20} /> },
    { id: 'logs', label: language === Language.VI ? 'Logs/Lỗi' : 'System Logs', icon: <Bug size={20} /> },
  ];

  const toggleLang = () => {
    setLanguage(language === Language.VI ? Language.EN : Language.VI);
  };

  const navClass = `fixed inset-y-0 left-0 transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition duration-200 ease-in-out z-30 w-64 bg-dark-800 border-r border-dark-700 flex flex-col no-print sidebar-container`;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden no-print"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-40 p-2 bg-neon-purple rounded-md text-white shadow-lg no-print"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <div className={navClass}>
        <div className="p-6 border-b border-dark-700 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold font-mono text-neon-green tracking-tighter">
              Life<span className="text-white">Debugger</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono bg-dark-900 w-fit px-2 py-1 rounded border border-dark-600 text-neon-pink">
            <Zap size={12} className="fill-current" />
            <span>v2.15 RP-TAB</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setPage(item.id);
                setIsOpen(false);
              }}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentPage === item.id 
                  ? 'bg-neon-purple/20 text-neon-purple border-l-4 border-neon-purple' 
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-medium font-sans">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-dark-700">
          <button
            onClick={toggleLang}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-dark-900 rounded-lg border border-dark-700 hover:border-gray-500 transition-colors text-sm"
          >
            <Globe size={16} />
            <span>{language === Language.VI ? 'Ngôn ngữ: Tiếng Việt' : 'Language: English'}</span>
          </button>
        </div>
      </div>
    </>
  );
};