import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Menu, X, BarChart2, PlayCircle, Activity, Terminal } from 'lucide-react';

// 페이지 컴포넌트 임포트
import BacktestList from './components/BacktestList';
import BacktestDetail from './components/BacktestDetail';
import PaperTrading from './components/PaperTrading';
import LiveTrading from './components/LiveTrading';

import './App.css';

// 사이드바 메뉴 항목 정의
const MENU_ITEMS = [
  { path: '/', name: 'BACKTEST RESULT', icon: <BarChart2 size={20} /> },
  { path: '/paper', name: 'PAPER TRADING', icon: <PlayCircle size={20} /> },
  { path: '/live', name: 'LIVE TRADING', icon: <Activity size={20} /> },
];

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    // [수정] font-mono 제거 -> font-sans 적용 (가독성 향상)
    <div className="min-h-screen bg-black text-gray-200 flex flex-col font-sans selection:bg-green-500 selection:text-black">
      
      {/* 1. 상단 헤더 */}
      <header className="bg-black border-b border-gray-800 px-4 py-3 flex items-center gap-4 sticky top-0 z-20">
        <button 
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-800 text-gray-300 transition-colors"
        >
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
        
        {/* 로고 영역: 여기만 font-mono 유지하여 아이덴티티 유지 */}
        <div className="flex flex-col font-mono">
          <h1 className="font-bold text-xl text-green-500 flex items-center gap-2 tracking-wider">
            <Terminal size={20} strokeWidth={3} /> 
            <span>MMM_SYSTEM</span>
          </h1>
          <div className='text-[10px] text-green-700 font-bold tracking-[0.2em] pl-7'>
            MONEY MAKES MONEY
          </div>
        </div>
      </header>

      {/* 2. 사이드바 (네비게이션) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/80 z-30 backdrop-blur-sm"
          onClick={closeSidebar}
        />
      )}

      {/* 사이드바 패널 */}
      <div className={`fixed top-0 left-0 h-full w-64 bg-[#0a0a0a] border-r border-gray-800 z-40 transform transition-transform duration-300 ease-in-out ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="p-5 flex justify-between items-center border-b border-gray-800">
          <span className="font-bold text-lg text-white tracking-wider font-mono">
            {'>'} MENU
          </span>
          <button onClick={closeSidebar} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <nav className="p-4 flex flex-col gap-2">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-green-600 text-white shadow-lg shadow-green-900/50 font-bold' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <span>{item.icon}</span>
                <span className="text-sm tracking-wide">
                    {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-800">
            <div className="text-[10px] text-gray-500 font-mono flex justify-between uppercase">
                <span>Status: Online</span>
                <span className="text-green-500 animate-pulse">●</span>
            </div>
        </div>
      </div>

      {/* 3. 메인 콘텐츠 영역 */}
      <main className="flex-1 overflow-auto bg-black text-gray-100">
        <Routes>
          <Route path="/" element={<BacktestList />} />
          <Route path="/paper" element={<PaperTrading />} />
          <Route path="/live" element={<LiveTrading />} />
          <Route path="/result/:filename" element={<BacktestDetail />}/>
        </Routes>
      </main>

    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;