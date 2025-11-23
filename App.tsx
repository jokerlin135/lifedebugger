import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Home } from './pages/Home';
import { Docs } from './pages/Docs';
import { History } from './pages/History';
import { Logs } from './pages/Logs';
import { ReportPage } from './pages/ReportPage';
import { PageView, Language, LogEntry, SearchResult } from './types';
import { CheckCircle } from 'lucide-react';

const App: React.FC = () => {
  // Global State
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [language, setLanguage] = useState<Language>(Language.VI);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [history, setHistory] = useState<SearchResult[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpdateToast, setShowUpdateToast] = useState(false);
  
  // Main Analysis Result (Lifted State)
  const [currentResult, setCurrentResult] = useState<SearchResult | null>(null);
  
  // Restoration State
  const [restoredItem, setRestoredItem] = useState<SearchResult | null>(null);

  // Helper to add logs
  const addLog = (entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
  };

  // Helper to add history (or update existing)
  const addToHistory = (result: SearchResult) => {
    setHistory(prev => {
      // Avoid duplicates if updating existing result (Deep Update)
      const exists = prev.findIndex(p => p.id === result.id);
      if (exists >= 0) {
        const newHist = [...prev];
        newHist[exists] = result;
        return newHist;
      }
      return [...prev, result];
    });
  };

  // Helper to update the current result (wrapper for set state + history sync optional)
  const updateCurrentResult = (result: SearchResult) => {
    setCurrentResult(result);
    addToHistory(result);
  };

  // Handle restoring an item from history
  const handleRestore = (item: SearchResult) => {
    setRestoredItem(item);
    // We also set it as current result immediately
    setCurrentResult(item);
    setCurrentPage('home');
    addLog({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      type: 'info',
      message: 'Restored history item',
      details: `ID: ${item.id}`
    });
  };

  // Init Log & Toast
  useEffect(() => {
    addLog({
      id: 'init',
      timestamp: Date.now(),
      type: 'system',
      message: 'App initialized v2.15.2'
    });
    
    // Show update toast
    setShowUpdateToast(true);
    const timer = setTimeout(() => setShowUpdateToast(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <Home 
            language={language} 
            addLog={addLog} 
            addToHistory={addToHistory} 
            initialResult={restoredItem}
            onClearInitial={() => setRestoredItem(null)}
            currentResult={currentResult}
            setCurrentResult={setCurrentResult}
            setPage={setCurrentPage}
          />
        );
      case 'report':
        return (
          <ReportPage
            language={language}
            currentResult={currentResult}
            updateResult={updateCurrentResult}
            addToHistory={addToHistory}
            addLog={addLog}
          />
        );
      case 'docs':
        return <Docs language={language} />;
      case 'history':
        return (
          <History 
            history={history} 
            language={language} 
            onRestore={handleRestore} 
          />
        );
      case 'logs':
        return <Logs logs={logs} language={language} />;
      default:
        return (
          <Home 
            language={language} 
            addLog={addLog} 
            addToHistory={addToHistory} 
            initialResult={restoredItem}
            onClearInitial={() => setRestoredItem(null)}
            currentResult={currentResult}
            setCurrentResult={setCurrentResult}
            setPage={setCurrentPage}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-dark-900 text-gray-100 overflow-hidden font-sans app-layout">
      <Sidebar 
        currentPage={currentPage}
        setPage={setCurrentPage}
        language={language}
        setLanguage={setLanguage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <main className="flex-1 h-full overflow-y-auto relative w-full">
         {/* Background decoration */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-neon-purple rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-neon-green rounded-full mix-blend-multiply filter blur-[128px] opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
        </div>

        {/* Update Toast */}
        {showUpdateToast && (
          <div className="fixed top-4 right-4 z-50 bg-neon-green text-dark-900 px-6 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-bounce-in font-bold border-2 border-white toast-notification">
            <CheckCircle size={24} />
            <div>
              <div className="uppercase text-xs tracking-wider opacity-80">System</div>
              <div>Update: Rate Limit (429) Handling</div>
            </div>
          </div>
        )}

        <div className="relative z-10 h-full">
            {renderPage()}
        </div>
      </main>
    </div>
  );
};

export default App;